# Project & Homepage Configuration Guide

This guide explains how to manage projects and homepage layout through `projects.json`.

## File Structure

```
data/
├── projects.json  # Main project + homepage configuration
└── README.md      # This guide
```

**Important**: `projects.json` is the single source of truth for both projects and homepage layout.

## Top-Level Structure

```json
{
  "homepage": { ... },     // Homepage section registry (new)
  "featured": [...],       // Deprecated (kept for reference, not used at runtime)
  "featuredConfig": {...},  // Deprecated (kept for reference, not used at runtime)
  "projects": [...]         // Canonical project inventory
}
```

## Homepage Configuration

The `homepage` object controls all non-hero sections on the homepage, navigation groups, and blob shape assignments.

### Schema

| Key | Type | Description |
|-----|------|-------------|
| `groupOrder` | `string[]` | Ordered array of nav group IDs |
| `groupsById` | `object` | Group definitions keyed by ID |
| `sectionOrder` | `string[]` | Ordered array of section IDs (determines scroll order) |
| `sectionsById` | `object` | Section definitions keyed by ID |

### Group Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Nav link text |
| `hasSubnav` | `boolean` | Show subnav dropdown with child sections |

### Section Fields

| Field | Default | Description |
|-------|---------|-------------|
| `type` | required | `hero`, `projectFeature`, `text`, `linkList` |
| `groupId` | required | Nav group this section belongs to |
| `showDot` | `true` | Show in progress indicator |
| `showInSubnav` | `false` | Show as subnav item under parent group |
| `navSubLabel` | -- | Subnav label (falls back to project title or section title) |
| `shapeId` | `"defaultBlob"` | Blob shape preset from `window.BLOB_SHAPES` |
| `blobColor` | -- | Override blob color (falls back to project blobColor, then palette) |
| `projectId` | -- | For `projectFeature`: references project in `projects` array |
| `title` | -- | For `text`/`linkList`: section heading |
| `body` | -- | For `text`/`linkList`: paragraph text |
| `linkSetId` | -- | For `text`/`linkList`: key into code-owned `LINK_SETS` map in `js/main.js` |

### Adding a New Section

To add a new "Skills" section with its own nav link:

1. Add `"skills"` to `groupOrder` at the desired position
2. Add `"skills": { "label": "Skills" }` to `groupsById`
3. Add `"skills"` to `sectionOrder` at the desired position
4. Add section definition to `sectionsById`:

```json
"skills": {
  "type": "text",
  "groupId": "skills",
  "title": "Skills",
  "body": "Your skills description here."
}
```

A new nav link appears automatically. No JS changes needed.

### Adding a New Featured Project

1. Add the project to the `projects` array
2. Add a section entry to `sectionOrder` (within the featured group)
3. Add a section definition to `sectionsById`:

```json
"featured-my-project": {
  "type": "projectFeature",
  "groupId": "featured",
  "projectId": "my-project",
  "showInSubnav": true,
  "shapeId": "defaultBlob"
}
```

## Projects Array

The `projects` array is the canonical inventory of all projects.

### Required Fields

- `id`: Unique identifier (lowercase, hyphens)
- `title`: Project name
- `shortDescription`: Card copy for featured sections and workbench grid
- `actions`: Array of action buttons

### Optional Fields

- `description`: Longer description (inventory metadata)
- `blobColor`: Blob color override for featured sections
- `category`: Category tag
- `image`: Image URL
- `tags`: Array of tags
- `hidden: true`: Hide from workbench grid (can still be featured)

### Action Button Types

- `type: "primary"`: Main action button
- `type: "secondary"`: Secondary action button

## How to Remove a Project

Remove the project from `projects`. If it has a featured section, also remove the section from `sectionOrder` and `sectionsById`.

## How to Reorder

- `sectionOrder` controls the scroll order of homepage sections
- `groupOrder` controls the nav link order
- `projects` array order controls the workbench grid order

## Homepage Safety Checks

Before pushing changes:

1. Validate JSON syntax
2. Confirm every `projectId` in `sectionsById` exists in `projects`
3. Confirm every relative action URL exists on disk
4. Load the homepage and click every featured CTA
5. Scroll through all snap sections on desktop and mobile
6. Confirm the `glowy-blob-ball` CTA still reaches `#blob-showcase`
7. On mobile, confirm featured project content is visually centered
