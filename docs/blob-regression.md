# Blob Regression Checklist

Use this checklist before and after any blob refactor.

## Core Motion

1. Load the homepage and confirm the blob is visible on hero.
2. Scroll actively and confirm the blob rotates faster while scrolling.
3. Stop scrolling and confirm rotation decays smoothly.
4. Let the page sit idle and confirm morphing continues.

## Section Color Behavior

1. Hero starts with the default hero color.
2. Scroll through each featured section and confirm the blob changes to that section's color.
3. Scroll to `About`, `Contact`, `Workbench`, and `blob-showcase` and confirm each section theme still applies.
4. Confirm the color transition is smooth rather than abrupt.

## Featured Layout

1. On mobile width, each featured project's title, copy, and CTA block should appear visually centered in the viewport.
2. Confirm centering still holds after reordering the `featured` array in `data/projects.json`.
3. Confirm `About` and `Contact` still use their own layout behavior and were not affected by featured-section changes.

## Controls

1. Open the blob control panel and confirm sliders change the blob immediately.
2. Change size, noise, morph speed, perspective, brightness, line width, and glow.
3. Change star count, twinkle, size, and brightness and confirm the starfield updates.
4. Refresh and confirm saved settings persist.
5. Click reset and confirm values return to defaults for the current device size.

## Hue Override / Rainbow

1. Move the hue slider away from `Auto` and confirm section colors are overridden.
2. Clear the hue override and confirm section-driven color resumes.
3. Hold the hue slider at max until rainbow mode activates.
4. Confirm rainbow mode updates the blob and control panel styling.
5. Exit rainbow mode and confirm normal section/hue behavior returns.

## Navigation Coupling

1. Scroll manually and confirm nav highlighting stays in sync with the visible section.
2. Confirm the progress dots stay in sync with the visible section.
3. Click nav links and progress dots and confirm the blob color updates to the destination section.

## Debug Surface

In the browser console:

```js
window.__blobDebug.getState()
```

Confirm it reports:
- `currentSection`
- `targetColor`
- `displayColor`
- `hueOverride`
- `rainbowMode`
- `scrollVelocity`
- `rotation`
- persisted settings

## Shape Presets

1. Scroll to the CurlBro featured section and confirm the blob morphs into a dumbbell shape.
2. Scroll away from CurlBro and confirm the blob morphs back to a sphere.
3. Confirm the morph transition is smooth (not instant).
4. Confirm the dumbbell rotates on scroll (scroll-velocity rotation).
5. In the control panel, confirm noise/morph sliders are greyed out on the dumbbell section.
6. Confirm shared sliders (size, perspective, brightness, line width, glow, stars) still work on the dumbbell.
7. Confirm rainbow easter egg works on the dumbbell section.
8. On mobile (40x40 grid), confirm the dumbbell renders correctly.

## Shape Transition Console Test

```js
// Force a shape transition
window.dispatchEvent(new CustomEvent('sectionChanged', {
  detail: { section: 'test', shapeId: 'curlbroDumbbell' }
}));
// Verify dumbbell renders, then:
window.dispatchEvent(new CustomEvent('sectionChanged', {
  detail: { section: 'test', shapeId: 'defaultBlob' }
}));
// Verify smooth morph back to sphere
```

## 3D Shape Carousel

1. Scroll past the workbench grid into `#blob-showcase` and confirm the carousel activates.
2. Continue scrolling and confirm each shape appears centered, rotates 360 degrees, then slides left as the next slides in from the right.
3. Confirm the horizontal slide transition is smooth (eased) and takes a visible fraction of the scroll.
4. Confirm the last shape (`defaultBlob`) spins indefinitely as you keep scrolling — it should NOT reset/jump or show multiple blobs.
5. Scroll back up through the carousel and confirm shapes reverse correctly (slide right, previous shape enters from left).
6. Scroll fully back above the carousel and confirm the blob restores to the correct shape and color for the visible section.
7. Click the "Top" button and confirm it scrolls to the hero and the blob returns to its default state (not stuck on a carousel shape like palmTree).
8. On mobile, confirm carousel shapes are proportionally sized (not oversized).
9. Confirm drag-rotation works on all sections (click and drag the blob anywhere on the page).
10. Confirm drag-rotation is disabled inside the carousel zone (scrolling should work, not drag).
11. Confirm the progress indicator shows a dot for the blob showcase section.
12. Confirm the "Top" button appears whenever scrolled past the hero and disappears at the top.

## Carousel Sequence Verification

The default carousel sequence is: curlbroDumbbell, goofDog, elephant, gallopingHorse, racecar, palmTree, gummyBear, hotAirBalloon, airplane, defaultBlob.

Scroll through the full carousel and confirm each shape renders correctly (no missing meshes, no visual glitches at transitions).

## Known Carousel Pitfalls

- `recalcCarouselLayout()` triggers resize events because it sets `showcase.style.height`. A re-entrancy guard prevents infinite recursion — do not remove it.
- Carousel layout depends on `showcase.offsetTop`, which is wrong until main.js renders dynamic sections. The layout is recalculated after section rendering via `window.recalcCarouselLayout()`.
- On carousel exit, both the shape AND the main.js section cache must be reset. The `carouselExited` event handles this. Without it, the blob can get stuck on a carousel shape.
