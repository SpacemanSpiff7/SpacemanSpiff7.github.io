// Every preset deforms the same sphere: theta runs from front to back,
// phi runs around the XY plane. Shared vertex correspondence makes every
// pair morphable, including the longitude seam and the two poles.
(() => {
    const direction = (theta, phi) => [
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
    ];
    const position = (p, radius) => ({x: p[0] * radius, y: p[1] * radius, z: p[2] * radius});
    const surface = (id, label, deform) => ({
        id, label, mode: 'customSurface',
        getPosition(theta, phi, time, config) {
            return position(deform(direction(theta, phi), time), config.baseRadius);
        }
    });

    // Smooth directional handles sculpt wings and the tail out of one skin.
    // Static surfaces are sampled once by the renderer, not on every frame.
    function sculpture(id, label, scale, handles) {
        const normalized = handles.map(([direction, displacement, sharpness = 16]) => {
            const length = Math.hypot(...direction);
            return [direction.map(v => v / length), displacement, sharpness];
        });
        return surface(id, label, d => {
            const p = d.map((v, i) => v * scale[i]);
            for (const [axis, displacement, sharpness] of normalized) {
                const dot = d.reduce((sum, v, i) => sum + v * axis[i], 0);
                const weight = Math.exp(sharpness * (dot - 1));
                for (let i = 0; i < 3; i++) p[i] += displacement[i] * weight;
            }
            return p;
        });
    }

    const shapes = {
        defaultBlob: {
            id: 'defaultBlob', label: 'Default Blob', mode: 'defaultBlob'
        },
        curlbroDumbbell: surface('curlbroDumbbell', 'Dumbbell', ([x, y, z]) => {
            const end = Math.exp(-Math.pow((Math.abs(x) - 0.80) / 0.21, 4));
            const thickness = 0.12 + 0.78 * end;
            return [x * 1.05, y * thickness, z * thickness];
        }),
        produceApple: surface('produceApple', 'Apple', ([x, y, z]) => {
            // Reserve the top of the same sphere for a short, leaning stem.
            // The fruit has broad shoulders, a top dimple and a tapered base.
            const t = Math.acos(Math.max(-1, Math.min(1, -y))) / Math.PI;
            const lateral = Math.hypot(x, z);
            let rho, axis, lean = 0;
            if (t < 0.13) {
                const u = t / 0.13;
                rho = 0.06 * Math.sin(Math.min(1, u / 0.25) * Math.PI / 2);
                axis = -1 + 0.40 * u;
                lean = 0.10 * (1 - u) ** 2;
            } else {
                const u = (t - 0.13) / 0.87;
                const angle = u * Math.PI;
                const roundness = Math.sin(angle);
                const lobes = 1 + 0.025 * Math.cos(5 * Math.atan2(z, x)) * roundness;
                rho = (0.06 * (1 - u) + 0.85 * roundness ** 0.80 * (1 + 0.12 * Math.cos(angle))) * lobes;
                axis = -0.60 * Math.cos(angle) - 0.28 * roundness ** 0.70 * Math.exp(-u * 1.8)
                    - 0.035 * Math.exp(-(((1 - u) / 0.07) ** 2));
            }
            return [lean + (lateral > 1e-8 ? x / lateral * rho : 0), axis,
                lateral > 1e-8 ? z / lateral * rho : 0];
        }),
        kanbanBoard: surface('kanbanBoard', 'Kanban Board', ([x, y, z]) => {
            // A rounded slab with two deep slots forms three columns joined
            // by a small bottom rail. It keeps the sphere's shared topology.
            const norm = (x ** 8 + y ** 8 + z ** 8) ** (1 / 8);
            const horizontal = x / norm;
            const vertical = y / norm;
            const slots = Math.exp(-(((horizontal - 0.34) / 0.085) ** 4))
                + Math.exp(-(((horizontal + 0.34) / 0.085) ** 4));
            const top = -0.72 + 1.20 * slots;
            return [horizontal * 0.91, top + (vertical + 1) * 0.5 * (0.67 - top),
                z / norm * 0.16];
        }),
        airplane: sculpture('airplane', 'Airplane', [0.17, 0.85, 0.15], [
            [[-1, -0.05, 0], [-0.90, 0.16, 0], 13],
            [[1, -0.05, 0], [0.90, 0.16, 0], 13],
            [[-0.4, 0.9, 0], [-0.37, 0.02, 0], 26],
            [[0.4, 0.9, 0], [0.37, 0.02, 0], 26],
            [[0, 0.85, -0.5], [0, 0.03, -0.25], 22]
        ])
    };
    window.BLOB_SHAPES = shapes;
})();
