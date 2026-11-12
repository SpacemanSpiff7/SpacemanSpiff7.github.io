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
reduced-motion scheduling, scroll spin/coasting, panel input, saved settings, and
rainbow activation/cancellation. Its VM harness does not evaluate browser CSS.

## Browser checks

Check desktop and mobile viewport sizes.

1. Confirm both canvases are visible at hero and there is no horizontal overflow.
2. Scroll through every configured featured section. Each complete silhouette and
   color should match its `shapeId` and `blobColor` in `data/projects.json`.
3. Move slowly between sections and reverse direction. Shape and color should
   follow the same blend without jumps. Scrolling also spins the mesh; stopping
   holds the blend while spin coasts to a stop and ambient breathing continues.
4. Verify the current presets: blob, dumbbell, airplane, apple, and three-column
   Kanban board. Use the preset control for shapes without a featured section.
   Custom shapes remain connected as the wireframe morphs.
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
   breathing, star twinkling, inertial spin, banking, sheen, and rainbow cycling stop.
2. Scroll or drag. Confirm the still scene updates to the new position without
   an ongoing animation loop. Workbench's extra rotation remains disabled.
3. Return to normal motion and confirm ambient movement resumes.
4. Switch to another tab. Rendering should pause while the document is hidden
   and resume without a large animation jump when returning.

## Bottom controls and rainbow

1. Open the bottom caret with a mouse and keyboard. Verify Shape, Style, and Stars
   accordions, drawer scrolling, outside-click dismissal, and Escape. Closed
   controls and collapsed sections should be skipped by keyboard focus.
2. Change each slider and verify its display and rendered effect. Check that
   size, perspective, brightness, line width, glow, and stars work on custom shapes.
   Noise/detail/morph-speed controls should be disabled on settled custom surfaces.
3. Select a preset, then choose Follow page. Confirm the page's current shape
   returns without changing scroll position. Resize with a custom size selected.
4. Refresh and confirm saved appearance settings load. Rainbow and manual shape
   overrides should not persist. Controls should still work if storage is blocked.
5. Hold Color at its far right for 1.6 seconds. Confirm the cloud blooms, the
   bottom caret glows, and the mesh renders separate rainbow lines with neon halos.
   Test on the default blob and a custom shape.
6. Release before the hold finishes and verify activation cancels. Move away from
   max or click the active cloud/clear button to exit. Check keyboard slider input.
7. Reset while viewing Airlock. Confirm device defaults and section colors return
   and Airlock retains its airplane shape. In reduced motion, verify inputs render
   one still frame without restarting an idle loop.

## Debug surface

Read the current state in the browser console:

```js
window.__blobDebug.getState()
```

The state includes `currentSection`, `fromShape`, `toShape`, `shapeMix`,
`targetColor`, `baseRadius`, `scrollRotation`, `scrollTop`, `anchors`,
`frame`, `reducedMotion`, `dpr`, `motionEnergy`, `bank`, `time`, `scrollVelocity`,
`rotation`, `hueOverride`, `rainbowMode`, `shapeOverride`, and `persisted`.
At a settled custom shape, `frame.noiseSamples` should be zero.
With reduced motion, `time` holds steady and `motionEnergy`/`bank` are zero.

The standalone shape carousel is retired. New presets use continuous sphere-grid
surfaces; see `data/README.md` before authoring one.
