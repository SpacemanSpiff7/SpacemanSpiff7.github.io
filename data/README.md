# Project Management Guide

This guide explains how to easily add, remove, or modify projects on your portfolio site.

## Quick Start

All project data is managed through the `projects.json` file in this directory. Simply edit this file to update your portfolio.

## File Structure

```
data/
├── projects.json           # Main project configuration (clean JSON)
├── projects-commented.json # Commented version for reference
└── README.md              # This guide
```

**Important**: Always edit `projects.json` (the clean version) as it's what the website uses. The commented version is kept for reference only.

## How to Add a New Project

### 1. For Featured Projects (Home Page)

Add a new project to the `featured` array in `projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "description": "Brief description for the home page",
  "category": "Category Tag",
  "image": "https://example.com/image.jpg",
  "link": "my-project.html",
  "featured": true
}
```

### 2. For All Projects (Projects Page)

Add a new project to the `all` array in `projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project", 
  "description": "Detailed description with more information about the project features and capabilities.",
  "tags": ["Technology", "Category", "Another Tag"],
  "actions": [
    {
      "text": "Use Tool",
      "url": "my-project.html",
      "type": "primary"
    },
    {
      "text": "View Code", 
      "url": "https://github.com/username/repo",
      "type": "secondary",
      "external": true
    }
  ]
}
```

## Field Definitions

### Featured Projects Fields

- `id`: Unique identifier (lowercase, hyphens for spaces)
- `title`: Project name displayed on cards
- `description`: Brief description (keep under 100 characters)
- `category`: Category tag shown in overlay (e.g., "AI Prompts", "Financial")
- `image`: URL to project image (400x300 recommended)
- `link`: URL to project (relative or absolute)
- `external`: Set to `true` for external links (opens in new tab)
- `featured`: Always `true` for featured projects

### All Projects Fields

- `id`: Unique identifier (should match featured project if it exists there too)
- `title`: Project name
- `description`: Detailed description (can be longer for full projects page)
- `tags`: Array of technology/category tags
- `actions`: Array of action buttons

### Action Button Types

- `type: "primary"`: Blue gradient button for main action
- `type: "secondary"`: Transparent button for secondary actions
- `external: true`: Opens link in new tab (for external URLs)

## How to Remove a Project

Simply delete the project object from either the `featured` or `all` array (or both).

## How to Reorder Projects

Projects appear in the order they're listed in the JSON arrays. Simply reorder the objects to change display order.

## Examples

### Internal Project (same domain)
```json
{
  "id": "shopping-research",
  "title": "Shopping Research Generator",
  "description": "AI-powered prompt generator",
  "category": "AI Tools",
  "image": "images/shopping-tool.jpg", 
  "link": "shopping-research.html"
}
```

### External Project (different domain)
```json
{
  "id": "stock-widget",
  "title": "Stock Analytics Widget",
  "description": "Financial analysis tool",
  "category": "Financial", 
  "image": "https://example.com/stock-image.jpg",
  "link": "https://external-site.com/tool",
  "external": true
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
3. **Description Length**: Keep featured project descriptions under 100 characters
4. **External Links**: Always set `external: true` for external URLs
5. **Testing**: Test your changes locally before pushing to production

## Validation

The system will gracefully handle missing fields, but for best results:
- Always include required fields (`id`, `title`, `description`)
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