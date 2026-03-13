#!/usr/bin/env python3
"""
OBJ-to-Preset Converter for blob-shapes.js
===========================================

Converts a Wavefront .obj 3D model into a JavaScript wireframe preset
for the blob renderer. Uses trimesh for robust OBJ parsing and mesh
simplification.

USAGE:
    python scripts/obj-to-preset.py <obj_file> <preset_id> <label> [options]

    # Just print the JS preset to stdout:
    python scripts/obj-to-preset.py ~/Downloads/Dog.obj houndDog "Hound Dog"

    # Auto-inject into blob-shapes.js and bump cache version:
    python scripts/obj-to-preset.py ~/Downloads/F1.obj racecar "Racecar" --inject

OPTIONS:
    --target N    Target edge count for decimation (default: 1200)
    --rotate N    Rotate model N degrees around Z axis (screen-space tilt)
    --inject      Auto-insert into js/blob-shapes.js and bump cache version
    --preview P   Save a 3-view wireframe preview PNG to path P
    --exclude A,B Case-insensitive substring match to exclude mesh components
    --crop-x N    Drop all faces with all 3 vertices having X > N (original coords)
    --merge       Merge all meshes before simplification (for material-split models)

SETUP:
    pip install trimesh matplotlib    (into scripts/.venv)
    Or: python -m venv scripts/.venv && scripts/.venv/bin/pip install trimesh matplotlib

PIPELINE:
    1. Load OBJ via trimesh (handles quads, Z-up, multi-mesh, materials, etc.)
    2. Merge all meshes into a single mesh (keeps wheels, body, wings, etc.)
    3. Simplify via quadric edge collapse to ~target_edges
    4. Extract wireframe edges from simplified faces
    5. Normalize to -0.5..0.5, negate Y for canvas, optional rotation
    6. Generate JS preset with inline vertex/edge arrays
"""

import sys
import os
import re
import math
import argparse
import numpy as np

try:
    import trimesh
except ImportError:
    venv_pip = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.venv', 'bin', 'pip')
    print(f"trimesh not found. Install it:", file=sys.stderr)
    print(f"  {venv_pip} install trimesh", file=sys.stderr)
    sys.exit(1)


def load_meshes(path, exclude_patterns=None, crop_x=None):
    """Load OBJ and return list of individual meshes (preserving components).

    Args:
        path: Path to .obj file
        exclude_patterns: List of substrings to exclude components by name (case-insensitive)
        crop_x: If set, drop faces where all 3 vertices have X > this value
    """
    scene = trimesh.load(path, force='scene', process=False)

    meshes = []
    names = []
    if isinstance(scene, trimesh.Scene):
        for name, geom in scene.geometry.items():
            if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 0:
                meshes.append(geom)
                names.append(name)
    elif isinstance(scene, trimesh.Trimesh):
        meshes.append(scene)
        names.append('(single mesh)')

    if not meshes:
        print("  ERROR: No meshes found in file", file=sys.stderr)
        sys.exit(1)

    # Log all components
    print(f"  {len(meshes)} mesh(es) found:", file=sys.stderr)
    for name, m in zip(names, meshes):
        print(f"    {name}: {len(m.faces)} faces, {len(m.vertices)} verts", file=sys.stderr)

    # Exclude by name pattern
    if exclude_patterns:
        kept = []
        kept_names = []
        for name, m in zip(names, meshes):
            name_lower = name.lower()
            excluded = any(pat.lower() in name_lower for pat in exclude_patterns)
            if excluded:
                print(f"    EXCLUDED: {name} ({len(m.faces)} faces)", file=sys.stderr)
            else:
                kept.append(m)
                kept_names.append(name)
        meshes = kept
        names = kept_names
        if not meshes:
            print("  ERROR: All meshes excluded!", file=sys.stderr)
            sys.exit(1)

    # Crop by X coordinate
    if crop_x is not None:
        cropped = []
        for name, m in zip(names, meshes):
            verts = m.vertices
            faces = m.faces
            # Keep faces where at least one vertex has X <= crop_x
            mask = np.any(verts[faces, 0] <= crop_x, axis=1)
            kept_faces = faces[mask]
            if len(kept_faces) == 0:
                print(f"    CROPPED entirely: {name} ({len(faces)} faces)", file=sys.stderr)
                continue
            dropped = len(faces) - len(kept_faces)
            if dropped > 0:
                print(f"    CROPPED: {name}: {len(faces)} -> {len(kept_faces)} faces ({dropped} dropped)", file=sys.stderr)
            # Rebuild mesh with only kept faces
            used_verts = np.unique(kept_faces)
            remap = np.full(len(verts), -1, dtype=np.int32)
            remap[used_verts] = np.arange(len(used_verts), dtype=np.int32)
            new_faces = remap[kept_faces]
            new_verts = verts[used_verts]
            cropped.append(trimesh.Trimesh(vertices=new_verts, faces=new_faces, process=False))
        meshes = cropped
        if not meshes:
            print("  ERROR: All geometry cropped!", file=sys.stderr)
            sys.exit(1)

    # Drop tiny fragments (<1% of total verts)
    total_verts = sum(len(m.vertices) for m in meshes)
    significant = [m for m in meshes if len(m.vertices) >= total_verts * 0.01]
    if not significant:
        significant = meshes  # keep all if filter would remove everything

    total_faces = sum(len(m.faces) for m in significant)
    print(f"  After filtering: {len(significant)} significant mesh(es) ({total_faces} total faces)", file=sys.stderr)
    return significant


def simplify_meshes(meshes, target_faces, merge_first=False, force_grid=False):
    """Simplify meshes and merge.

    Per-component simplification works better for structurally distinct parts
    (e.g. dog body + ears). But for material-split models (same surface, different
    colors), merging first preserves shape coherence.

    Args:
        merge_first: If True, merge all meshes before simplification.
        force_grid: If True, skip quadric decimation and use grid decimation.
    """
    if merge_first and len(meshes) > 1:
        print(f"  Merging {len(meshes)} meshes before simplification...", file=sys.stderr)
        meshes = [trimesh.util.concatenate(meshes)]
        meshes[0].merge_vertices(merge_tex=False, merge_norm=False)

    total_faces = sum(len(m.faces) for m in meshes)
    if total_faces <= target_faces:
        print(f"  Already below target ({total_faces} faces), skipping simplification", file=sys.stderr)
        combined = trimesh.util.concatenate(meshes)
        combined.merge_vertices(merge_tex=False, merge_norm=False)
        return combined

    if force_grid:
        print(f"  Using grid decimation (--grid)...", file=sys.stderr)
        combined = trimesh.util.concatenate(meshes)
        combined.merge_vertices(merge_tex=False, merge_norm=False)
        return grid_decimate(combined, target_faces)

    try:
        import fast_simplification
    except ImportError:
        print(f"  fast_simplification not installed, using grid decimation...", file=sys.stderr)
        combined = trimesh.util.concatenate(meshes)
        combined.merge_vertices(merge_tex=False, merge_norm=False)
        return grid_decimate(combined, target_faces)

    simplified_meshes = []
    for i, mesh in enumerate(meshes):
        # Allocate target faces proportionally by component size
        proportion = len(mesh.faces) / total_faces
        component_target = max(10, int(target_faces * proportion))

        if len(mesh.faces) <= component_target:
            simplified_meshes.append(mesh)
            continue

        verts = mesh.vertices.astype(np.float64)
        fcs = mesh.faces.astype(np.int32)
        original = len(fcs)

        for attempt in range(10):
            cur = len(fcs)
            if cur <= component_target * 1.2:
                break
            reduction = 1.0 - (component_target / cur)
            reduction = max(0.3, min(0.999, reduction))
            prev = cur
            verts, fcs = fast_simplification.simplify(
                verts.astype(np.float32),
                fcs.astype(np.int32),
                target_reduction=reduction,
                agg=10 if (attempt > 0 and (prev - len(fcs)) / prev < 0.05) else 7
            )
            verts = verts.astype(np.float64)
            fcs = fcs.astype(np.int32)

        print(f"  Component {i+1}/{len(meshes)}: {original} -> {len(fcs)} faces (target {component_target})", file=sys.stderr)
        simplified_meshes.append(trimesh.Trimesh(vertices=verts, faces=fcs, process=False))

    combined = trimesh.util.concatenate(simplified_meshes)
    combined.merge_vertices(merge_tex=False, merge_norm=False)
    total_result = len(combined.faces)
    print(f"  Combined: {total_result} faces ({len(combined.vertices)} verts)", file=sys.stderr)

    # If still way over target, apply edge-length filtering as last resort
    if total_result > target_faces * 3:
        print(f"  Still over target, applying face sampling...", file=sys.stderr)
        return face_sample_filter(combined, target_faces)

    return combined


def grid_decimate(mesh, target_faces):
    """Fallback grid-based decimation."""
    verts = mesh.vertices
    faces = mesh.faces

    # Extract edges
    edge_set = set()
    for face in faces:
        for k in range(len(face)):
            a, b = int(face[k]), int(face[(k + 1) % len(face)])
            edge_set.add((min(a, b), max(a, b)))

    target_edges = int(target_faces * 1.5)  # rough face-to-edge ratio

    # Binary search for grid_div
    # Upper bound scales with input complexity to handle dense models
    hi_bound = max(200, int(len(edge_set) ** 0.4))
    lo, hi = 10, hi_bound
    best_div = 30
    best_diff = float('inf')
    best_result = None

    for _ in range(15):
        mid = (lo + hi) // 2
        dec_v, dec_e = _grid_decimate_once(verts, edge_set, mid)
        diff = abs(len(dec_e) - target_edges)
        if diff < best_diff:
            best_diff = diff
            best_div = mid
            best_result = (dec_v, dec_e)
        if len(dec_e) < target_edges:
            lo = mid + 1   # need finer grid -> more edges
        else:
            hi = mid - 1   # need coarser grid -> fewer edges
        if lo > hi:
            break

    dec_verts, dec_edges = best_result or _grid_decimate_once(verts, edge_set, best_div)
    print(f"  Grid decimation (div={best_div}): {len(dec_verts)} verts, {len(dec_edges)} edges", file=sys.stderr)

    # Reconstruct a trimesh from decimated data (create triangles from edges isn't ideal,
    # but we only need vertices and edges for the wireframe anyway)
    # Return a fake mesh that carries our data
    result = trimesh.Trimesh(vertices=np.array(dec_verts))
    result.metadata['custom_edges'] = dec_edges
    return result


def _grid_decimate_once(verts, edge_set, grid_div):
    """Single grid decimation pass."""
    xs = verts[:, 0] if hasattr(verts, 'shape') else [v[0] for v in verts]
    ys = verts[:, 1] if hasattr(verts, 'shape') else [v[1] for v in verts]
    zs = verts[:, 2] if hasattr(verts, 'shape') else [v[2] for v in verts]
    min_x, min_y, min_z = min(xs), min(ys), min(zs)
    extent = max(max(xs) - min_x, max(ys) - min_y, max(zs) - min_z)
    if extent < 1e-10:
        return [(0, 0, 0)], []
    cell_size = extent / grid_div

    cell_map = {}
    vert_to_cell = {}
    for i in range(len(verts)):
        x, y, z = float(xs[i]), float(ys[i]), float(zs[i])
        key = (int((x - min_x) / cell_size),
               int((y - min_y) / cell_size),
               int((z - min_z) / cell_size))
        if key not in cell_map:
            cell_map[key] = []
        cell_map[key].append(i)
        vert_to_cell[i] = key

    cell_keys = sorted(cell_map.keys())
    cell_to_idx = {k: i for i, k in enumerate(cell_keys)}

    dec_verts = []
    for key in cell_keys:
        indices = cell_map[key]
        n = len(indices)
        dec_verts.append((
            sum(float(xs[i]) for i in indices) / n,
            sum(float(ys[i]) for i in indices) / n,
            sum(float(zs[i]) for i in indices) / n
        ))

    dec_edges = set()
    for a, b in edge_set:
        if a in vert_to_cell and b in vert_to_cell:
            na = cell_to_idx[vert_to_cell[a]]
            nb = cell_to_idx[vert_to_cell[b]]
            if na != nb:
                dec_edges.add((min(na, nb), max(na, nb)))

    return dec_verts, list(dec_edges)


def face_sample_filter(mesh, target_faces):
    """Uniformly sample faces from the mesh to reduce density.

    Instead of grid decimation (which merges vertices spatially, creating
    messy cross-connections) or edge-length filtering (which keeps long
    diagonal spans), this samples faces uniformly across the mesh surface.
    Each sampled face contributes its 3 edges, preserving local triangle
    connectivity and producing a clean wireframe.

    Spatial stratification ensures even coverage across the model.
    """
    faces = mesh.faces
    verts = mesh.vertices
    num_faces = len(faces)

    if num_faces <= target_faces:
        return mesh

    # Compute face centroids for spatial stratification
    centroids = np.zeros((num_faces, 3))
    for i, face in enumerate(faces):
        centroids[i] = verts[face].mean(axis=0)

    # Spatially stratified sampling: divide into grid cells, sample
    # proportionally from each cell for even coverage
    mins = centroids.min(axis=0)
    maxs = centroids.max(axis=0)
    extent = maxs - mins
    extent[extent < 1e-10] = 1.0

    # Use ~10 divisions per axis for stratification
    divs = 10
    cell_faces = {}
    for i in range(num_faces):
        cx = int((centroids[i][0] - mins[0]) / extent[0] * (divs - 0.01))
        cy = int((centroids[i][1] - mins[1]) / extent[1] * (divs - 0.01))
        cz = int((centroids[i][2] - mins[2]) / extent[2] * (divs - 0.01))
        key = (cx, cy, cz)
        if key not in cell_faces:
            cell_faces[key] = []
        cell_faces[key].append(i)

    # Sample proportionally from each cell
    import random
    random.seed(42)  # deterministic for reproducibility
    sampled_face_indices = []
    for key, face_indices in cell_faces.items():
        proportion = len(face_indices) / num_faces
        n_sample = max(1, int(target_faces * proportion))
        if len(face_indices) <= n_sample:
            sampled_face_indices.extend(face_indices)
        else:
            sampled_face_indices.extend(random.sample(face_indices, n_sample))

    # Extract edges from sampled faces
    edges = set()
    used_verts_set = set()
    for fi in sampled_face_indices:
        face = faces[fi]
        for k in range(len(face)):
            a, b = int(face[k]), int(face[(k + 1) % len(face)])
            edges.add((min(a, b), max(a, b)))
            used_verts_set.add(a)
            used_verts_set.add(b)

    # Compact vertex indices
    old_to_new = {}
    new_verts = []
    for old_idx in sorted(used_verts_set):
        old_to_new[old_idx] = len(new_verts)
        new_verts.append(verts[old_idx].tolist())
    new_edges = [(old_to_new[a], old_to_new[b]) for a, b in edges]

    print(f"  Face sampling: {num_faces} -> {len(sampled_face_indices)} faces, {len(new_edges)} edges, {len(new_verts)} verts", file=sys.stderr)

    result = trimesh.Trimesh(vertices=np.array(new_verts), process=False)
    result.metadata['custom_edges'] = new_edges
    return result


def extract_wireframe(mesh):
    """Extract unique edges from mesh faces, or from custom_edges metadata."""
    if hasattr(mesh, 'metadata') and 'custom_edges' in mesh.metadata:
        return mesh.vertices.tolist(), mesh.metadata['custom_edges']

    edges = set()
    for face in mesh.faces:
        for k in range(len(face)):
            a, b = int(face[k]), int(face[(k + 1) % len(face)])
            edges.add((min(a, b), max(a, b)))

    return mesh.vertices.tolist(), list(edges)


def normalize(verts, rotate_deg=0):
    """Center and scale to -0.5..0.5, negate Y for canvas coords."""
    arr = np.array(verts)
    mins = arr.min(axis=0)
    maxs = arr.max(axis=0)
    center = (mins + maxs) / 2
    extent = (maxs - mins).max()
    if extent < 1e-10:
        extent = 1.0
    scale = 1.0 / extent

    result = []
    rad = math.radians(rotate_deg)
    cos_r, sin_r = math.cos(rad), math.sin(rad)

    for v in verts:
        x = (v[0] - center[0]) * scale
        y = -(v[1] - center[1]) * scale  # negate Y for canvas
        z = (v[2] - center[2]) * scale
        if rotate_deg != 0:
            rx = x * cos_r - y * sin_r
            ry = x * sin_r + y * cos_r
            x, y = rx, ry
        result.append((round(x, 4), round(y, 4), round(z, 4)))
    return result


def preview_wireframe(verts, edges, output_path):
    """Render a 3-view wireframe preview to PNG using matplotlib."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from mpl_toolkits.mplot3d.art3d import Line3DCollection
    except ImportError:
        print("  matplotlib not installed, skipping preview", file=sys.stderr)
        return

    arr = np.array(verts)
    segments = [[(arr[a][0], arr[a][1], arr[a][2]),
                 (arr[b][0], arr[b][1], arr[b][2])] for a, b in edges]

    views = [
        ('Front', 0, 0),
        ('Side', 0, 90),
        ('3/4 View', 20, -60),
    ]

    fig = plt.figure(figsize=(18, 6), facecolor='#1a1a2e')
    fig.suptitle(f'{len(verts)} verts, {len(edges)} edges', color='white', fontsize=14)

    for i, (title, elev, azim) in enumerate(views):
        ax = fig.add_subplot(1, 3, i + 1, projection='3d', facecolor='#1a1a2e')
        lc = Line3DCollection(segments, colors='#00d4ff', linewidths=0.4, alpha=0.7)
        ax.add_collection3d(lc)

        mins = arr.min(axis=0)
        maxs = arr.max(axis=0)
        center = (mins + maxs) / 2
        span = (maxs - mins).max() / 2 * 1.1
        ax.set_xlim(center[0] - span, center[0] + span)
        ax.set_ylim(center[1] - span, center[1] + span)
        ax.set_zlim(center[2] - span, center[2] + span)
        ax.view_init(elev=elev, azim=azim)
        ax.set_title(title, color='white', fontsize=12)
        ax.set_axis_off()

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='#1a1a2e')
    plt.close()
    print(f"  Preview saved to {output_path}", file=sys.stderr)


def generate_preset(verts, edges, preset_id, label):
    verts_str = ','.join(f'{{x:{v[0]},y:{v[1]},z:{v[2]}}}' for v in verts)
    edges_str = ','.join(f'[{e[0]},{e[1]}]' for e in edges)

    return f"""    {preset_id}: {{
        id: '{preset_id}',
        label: '{label}',
        mode: 'arbitraryMesh',
        _cachedMesh: null,
        defaultBaseRadius: 420,
        // Decimated from OBJ model ({len(verts)} verts, {len(edges)} edges)
        buildMesh: function() {{
            if (this._cachedMesh) return this._cachedMesh;
            this._cachedMesh = {{
                vertices: [{verts_str}],
                edges: [{edges_str}]
            }};
            return this._cachedMesh;
        }},
        applicableControls: ['base-radius','perspective','line-width','brightness','glow-intensity','hue-slider']
    }},"""


def inject_preset(preset_js, preset_id):
    """Insert or replace a preset in js/blob-shapes.js and bump cache version."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    blob_path = os.path.join(repo_root, 'js', 'blob-shapes.js')
    index_path = os.path.join(repo_root, 'index.html')

    with open(blob_path) as f:
        content = f.read()

    # Remove existing preset with this id if present
    marker = f'    {preset_id}: {{'
    if marker in content:
        start = content.index(marker)
        ac = "applicableControls: ['base-radius','perspective','line-width','brightness','glow-intensity','hue-slider']"
        ac_pos = content.index(ac, start)
        end_match = re.search(r'\n    \},?\n', content[ac_pos:])
        if end_match:
            end = ac_pos + end_match.end()
            while end < len(content) and content[end] == '\n':
                end += 1
            content = content[:start] + content[end:]
            print(f"  Replaced existing '{preset_id}' preset", file=sys.stderr)

    # Insert before closing "};"
    close_pos = content.rstrip().rfind('};')
    content = content[:close_pos] + '\n' + preset_js + '\n' + content[close_pos:]

    with open(blob_path, 'w') as f:
        f.write(content)

    # Bump blob-shapes.js cache version in index.html
    with open(index_path) as f:
        html = f.read()

    def bump_version(match):
        v = int(match.group(1)) + 1
        return f'blob-shapes.js?v={v}'

    new_html = re.sub(r'blob-shapes\.js\?v=(\d+)', bump_version, html)
    if new_html != html:
        with open(index_path, 'w') as f:
            f.write(new_html)
        print(f"  Bumped blob-shapes.js cache version in index.html", file=sys.stderr)

    # Verify presets
    verify_script = os.path.join(script_dir, 'verify-blob-shapes.js')
    verify = os.popen(f'node "{verify_script}" 2>&1').read()
    if 'FAIL' in verify:
        print(f"  WARNING: Verification failed!", file=sys.stderr)
        print(f"  {verify.strip()}", file=sys.stderr)
    else:
        print(f"  {verify.strip()}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description='Convert OBJ to blob-shapes.js preset')
    parser.add_argument('obj_file', help='Path to .obj file')
    parser.add_argument('preset_id', help='JS property name (e.g. houndDog)')
    parser.add_argument('label', help='Display label (e.g. "Hound Dog")')
    parser.add_argument('--target', type=int, default=1200, help='Target edge count (default: 1200)')
    parser.add_argument('--rotate', type=float, default=0, help='Rotate model by N degrees around Z axis')
    parser.add_argument('--inject', action='store_true', help='Auto-insert into blob-shapes.js and bump cache version')
    parser.add_argument('--preview', type=str, metavar='PATH', help='Save 3-view wireframe preview PNG')
    parser.add_argument('--exclude', type=str, help='Comma-separated component name substrings to exclude')
    parser.add_argument('--crop-x', type=float, metavar='N', help='Drop faces where all vertices have X > N')
    parser.add_argument('--merge', action='store_true', help='Merge all meshes before simplification (for material-split models)')
    parser.add_argument('--grid', action='store_true', help='Force grid decimation (better for multi-material/non-manifold models)')
    args = parser.parse_args()

    exclude_patterns = args.exclude.split(',') if args.exclude else None

    print(f"Loading {args.obj_file}...", file=sys.stderr)
    meshes = load_meshes(args.obj_file, exclude_patterns=exclude_patterns, crop_x=args.crop_x)

    # Target faces ~ 2/3 of target edges (Euler's formula for manifold meshes)
    target_faces = max(100, int(args.target * 0.67))
    print(f"  Simplifying to ~{target_faces} faces (target ~{args.target} edges)...", file=sys.stderr)
    simplified = simplify_meshes(meshes, target_faces, merge_first=args.merge, force_grid=args.grid)

    verts, edges = extract_wireframe(simplified)
    print(f"  Wireframe: {len(verts)} verts, {len(edges)} edges", file=sys.stderr)

    norm_verts = normalize(verts, rotate_deg=args.rotate)

    if args.preview:
        preview_wireframe(norm_verts, edges, args.preview)

    js = generate_preset(norm_verts, edges, args.preset_id, args.label)

    if args.inject:
        inject_preset(js, args.preset_id)
        print(f"  Injected '{args.preset_id}' into js/blob-shapes.js", file=sys.stderr)
    else:
        print(js)

    print(f"\nDone!", file=sys.stderr)


if __name__ == '__main__':
    main()
