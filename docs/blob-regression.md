# Blob Regression Checklist

Run this checklist when changing the renderer, shape presets, or scroll sampler.
Build the public artifact with `node scripts/build-site.mjs` and serve `_site/`
so the preview uses the same files as publication.

## Automated checks

```sh
node scripts/verify-blob-shapes.js
node scripts/verify-blob-motion.js
```

The shape check validates the registry and surface APIs. The motion check covers
finite, bounded surfaces, shared seams and poles at desktop/mobile resolutions,
forward/reverse morph continuity, render operation counts, hidden-tab pausing,
and reduced-motion scheduling. Its VM harness does not evaluate browser CSS.

## Browser checks

Check desktop and mobile viewport sizes.

1. Confirm both canvases are visible at hero and there is no horizontal overflow.
2. Scroll through every configured featured section. Each complete silhouette and
   color should match its `shapeId` and `blobColor` in `data/projects.json`.
3. Move slowly between sections and reverse direction. Shape and color should
   follow the same blend without jumps. Stopping holds the blend while ambient
   breathing continues.
4. Verify the current presets: blob, dumbbell, airplane, apple, and three-column
   Kanban board. Custom shapes remain connected as the wireframe morphs.
5. On mobile, confirm project title, copy, and buttons are centered in the visible
   space below the fixed nav. Check portrait and landscape.
6. Use nav links, featured subnav items, progress dots, and the nav logo. All
   should reach the intended section and keep active states synchronized.
7. Scroll through Workbench freely. The background returns to the default blob
   and rotates with scroll position. Reverse scrolling should reverse rotation.
8. Click "Top" from Workbench. Confirm hero and its blob/color are restored.
9. Drag non-interactive content with a mouse to rotate the blob. Clicking links
   and buttons should still work; touch swipes should scroll.
10. Resize, then check section shapes and navigation again after fonts settle.

## Motion preferences and visibility

1. Enable reduced motion. Confirm the blob remains visible and ambient
   breathing, star twinkling, banking, and sheen stop.
2. Scroll or drag. Confirm the still scene updates to the new position without
   an ongoing animation loop. Workbench's extra rotation remains disabled.
3. Return to normal motion and confirm ambient movement resumes.
4. Switch to another tab. Rendering should pause while the document is hidden
   and resume without a large animation jump when returning.

## Debug surface

Read the current state in the browser console:

```js
window.__blobDebug.getState()
```

The state includes `currentSection`, `fromShape`, `toShape`, `shapeMix`,
`targetColor`, `baseRadius`, `scrollRotation`, `scrollTop`, `anchors`,
`frame`, `reducedMotion`, `dpr`, `motionEnergy`, `bank`, and `time`.
At a settled custom shape, `frame.noiseSamples` should be zero.
With reduced motion, `time` holds steady and `motionEnergy`/`bank` are zero.

The former public control panel, saved appearance overrides, rainbow mode, and
standalone shape carousel are retired. New presets use continuous sphere-grid
surfaces; see `data/README.md` before authoring one.
