# Project Management Guide

This guide explains how to easily add, remove, or modify projects on your portfolio site.

## Quick Start

All project data is managed through the `projects.json` file in this directory. Simply edit this file to update your portfolio.

## File Structure

```
data/
├── projects.json  # Main project configuration used by the homepage
└── README.md      # This guide
```

**Important**: `projects.json` is the only live source of truth here.

## How to Add a New Project

### 1. Add the Project Object

Add a new object to the `projects` array in `projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "shortDescription": "Short card copy used on the homepage",
  "description": "Longer inventory description for future reuse",
  "category": "Category Tag",
  "image": "https://example.com/image.jpg",
  "tags": ["Category Tag"],
  "actions": [
    {
      "text": "Open",
      "url": "tools/my-project.html",
      "type": "primary"
    }
  ]
}
```

### 2. Feature It on the Snap Homepage (Optional)

If the project should appear as a full-screen featured section between the hero and about sections, add its `id` to the top-level `featured` array:

```json
{
  "featured": ["curlbro", "agile-this", "traffic-therapy", "my-new-project"]
}
```

## Field Definitions

- `id`: Unique identifier (lowercase, hyphens for spaces)
- `title`: Project name
- `shortDescription`: Card copy currently rendered on featured sections and in the workbench grid
- `description`: Longer description kept as inventory content
- `category`: Inventory metadata
- `image`: Inventory metadata
- `tags`: Array of technology/category tags
- `actions`: Array of action buttons
- `blobColor`: Optional featured-section blob color override
- `hidden: true`: Keep the project in the registry but hide it from the workbench grid

### Top-Level Fields

- `featured`: Ordered array of project IDs used to build full-screen featured sections
- `featuredConfig`: Reserved config object; keep unless you are updating the renderer too
- `projects`: Canonical array of project objects

### Featured Section Behavior

- Featured sections are generated from the `featured` array in order
- The homepage nav highlighting, progress dots, and blob section events all use the same shared section registry built in `js/main.js`
- If a featured project does not define `blobColor`, the homepage assigns one automatically from the featured palette

### Action Button Types

- `type: "primary"`: Blue gradient button for main action
- `type: "secondary"`: Transparent button for secondary actions
- `external: true`: Allowed but currently not required by the homepage renderer

## How to Remove a Project

Remove the project object from `projects`. If it is also in `featured`, remove its ID there too.

## How to Reorder Projects

Projects appear in two independent orders:

- `featured` controls the order of full-screen featured sections
- `projects` controls the workbench grid order

## Examples

### Internal Project (same domain)
```json
{
  "id": "shopping-research",
  "title": "Shopping Research Generator",
  "shortDescription": "AI-powered prompt generator",
  "description": "Longer inventory description",
  "category": "AI Tools",
  "image": "assets/images/shopping-tool.jpg",
  "tags": ["AI Tools"],
  "actions": [
    {
      "text": "Open",
      "url": "tools/shopping-research.html",
      "type": "primary"
    }
  ]
}
```

### External Project (different domain)
```json
{
  "id": "stock-widget",
  "title": "Stock Analytics Widget",
  "shortDescription": "Financial analysis tool",
  "description": "Longer inventory description",
  "category": "Financial", 
  "image": "https://example.com/stock-image.jpg",
  "tags": ["Financial"],
  "actions": [
    {
      "text": "Open",
      "url": "https://external-site.com/tool",
      "type": "primary",
      "external": true
    }
  ]
}
```

### Project with Multiple Actions
```json
{
  "id": "complex-project",
  "title": "Complex Project",
  "description": "A project with multiple links",
  "tags": ["React", "Node.js", "API"],
  "actions": [
    {
      "text": "Live Demo",
      "url": "https://demo.example.com",
      "type": "primary", 
      "external": true
    },
    {
      "text": "View Code",
      "url": "https://github.com/user/repo",
      "type": "secondary",
      "external": true
    },
    {
      "text": "Documentation", 
      "url": "docs.html",
      "type": "secondary"
    }
  ]
}
```

## Best Practices

1. **Image Optimization**: Use images around 400x300px for best performance
2. **Consistent Naming**: Use consistent tag names across projects
3. **Short Description Length**: Keep `shortDescription` compact, because it is used in full-screen snap sections
4. **Relative URLs**: Relative action URLs resolve from the repo root, not from `data/`
5. **Hidden Projects**: Prefer `hidden: true` over deletion if you want to keep old work in the registry
6. **Testing**: Test your changes locally before pushing to production

## Homepage Safety Checks

Changes in `projects.json` can affect the homepage snap flow. Before pushing:

1. Confirm every featured ID exists in `projects`
2. Confirm every relative action URL exists on disk
3. Load the homepage and click every featured CTA
4. Scroll through the snap sections on desktop and mobile widths
5. Confirm the `glowy-blob-ball` CTA still reaches `#blob-showcase`
6. On mobile, confirm featured project copy is visually centered in the viewport

## Validation

The system will gracefully handle missing fields, but for best results:
- Always include required fields (`id`, `title`, `shortDescription`, `actions`)
- Ensure image URLs are accessible
- Test all links before adding them
- Use valid JSON syntax (check with a JSON validator if unsure)

## Troubleshooting

If projects aren't loading:
1. Check browser console for errors
2. Validate JSON syntax at [jsonlint.com](https://jsonlint.com)
3. Ensure the `data/projects.json` file is accessible
4. Check that image URLs are working

## Making Changes Live

After editing `projects.json`:
1. Commit and push your changes to the repository
2. GitHub Pages will automatically deploy the updates
3. Changes should be visible within a few minutes
