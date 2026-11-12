#!/usr/bin/env node
// Run with node scripts/verify-blob-motion.js. No browser dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const projectData = JSON.parse(fs.readFileSync(path.join(root, 'data/projects.json')));

// Section snapping settles on a silhouette; oversized Workbench remains scrollable.
const styles = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');
assert(/scroll-snap-type:\s*y mandatory/.test(styles));
assert(/\.snap-section\s*\{[^}]*scroll-snap-align:\s*start;[^}]*scroll-snap-stop:\s*always;/s.test(styles));
assert(/#projects-grid\s*\{[^}]*scroll-snap-align:\s*start;[^}]*scroll-snap-stop:\s*normal;/s.test(styles));

function fixture(width, height) {
    const events = new Map();
    const scroller = {scrollTop: 0, style: {}, addEventListener(name, cb) {events.set('scroll:' + name, cb);}};
    const elements = new Map();
    const registry = projectData.homepage.sectionOrder.map((id, i) => {
        elements.set(id, {offsetTop: i * height, offsetHeight: height});
        const section = projectData.homepage.sectionsById[id];
        const project = projectData.projects.find(p => p.id === section.projectId);
        return {id, shapeId: section.shapeId, blobColor: section.blobColor || project?.blobColor};
    });
    let end = registry.length * height;
    elements.set('projects-grid', {offsetTop: end, offsetHeight: height * 4});
    registry.push({id: 'projects-grid', shapeId: 'defaultBlob'});

    const noop = () => {};
    const operations = {};
    const canvasContext = new Proxy({}, {
        get(_, key) {
            if (key === 'createRadialGradient') return (...args) => {
                operations[key] = (operations[key] || 0) + 1;
                assert(args.every(Number.isFinite));
                return {addColorStop: noop};
            };
            return (...args) => {
                operations[key] = (operations[key] || 0) + 1;
                assert(args.filter(x => typeof x === 'number').every(Number.isFinite));
            };
        },
        set(_, key, value) {
            operations[key] = (operations[key] || 0) + 1;
            if (key === 'strokeStyle') assert.match(value, /^(#[0-9a-f]{8}|rgba\(.+\))$/i);
            return true;
        }
    });
    elements.set('blob-canvas', {style: {}, getContext: () => canvasContext});
    elements.set('starfield', {style: {}, getContext: () => canvasContext});
    const document = {
        readyState: 'loading', hidden: false, addEventListener: (name, cb) => events.set('document:' + name, cb),
        getElementById: id => elements.get(id),
        querySelector: selector => selector === '.scroll-container' ? scroller : null
    };
    const media = {matches: false, addEventListener: (name, cb) => events.set('media:' + name, cb)};
    const pendingFrames = new Map();
    let frameId = 0;
    const window = {
        innerWidth: width, innerHeight: height, devicePixelRatio: 3, scrollY: 0,
        matchMedia: () => media,
        addEventListener: (name, callback) => events.set(name, callback)
    };
    const ctx = vm.createContext({window, document, console, Math,
        requestAnimationFrame: cb => { pendingFrames.set(++frameId, cb); return frameId; },
        cancelAnimationFrame: id => pendingFrames.delete(id)});
    for (const file of ['blob-shapes.js', 'blob-motion.js', 'animations.js']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), ctx);
    }
    vm.runInContext('initBlobSystem();', ctx);
    events.get('blobSectionsReady')({detail: registry});
    return {ctx, window, scroller, elements, events, document, media, pendingFrames, operations};
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
    const {ctx, window, scroller, elements, events, document, media, pendingFrames, operations} = fixture(width, height);
    const shapes = window.BLOB_SHAPES;
    const anchors = window.__blobDebug.getState().anchors;
    assert.equal(anchors.length, projectData.homepage.sectionOrder.length + 1);
    assert.equal(anchors.at(-1).sectionId, 'projects-grid');
    assert.equal(window.__blobDebug.getState().dpr, 2);
    for (const section of Object.values(projectData.homepage.sectionsById)) assert(shapes[section.shapeId]);
    const readState = () => {
        const state = window.__blobDebug.getState();
        return [state.fromShape, state.toShape, state.shapeMix, state.targetColor, state.baseRadius, state.scrollRotation];
    };
    const at = scrollTop => {
        scroller.scrollTop = scrollTop;
        vm.runInContext(`updateScrollMorph(${scrollTop});`, ctx);
        return readState();
    };
    for (let i = 0; i < anchors.length - 1; i++) {
        const from = anchors[i], to = anchors[i + 1];
        const midpoint = (from.at + to.at) / 2;
        const first = at(midpoint);
        assert(Math.abs(first[2] - 0.5) < 1e-10);
        at(to.at);
        assert.deepEqual(at(midpoint), first, 'Reverse scroll must restore the same morph and color');
        // Rendering more frames at a held scroll offset must not advance the morph.
        vm.runInContext('renderScene(16.67); renderScene(16.67);', ctx);
        assert.deepEqual(readState(), first, 'Rendering must not advance the held scroll blend');
        assert.equal(first[4], width < 768 ? 120 : 200, 'Presets must not reset the size');
        const left = window.BLOB_MOTION.sample(anchors, to.at - 0.001);
        const right = window.BLOB_MOTION.sample(anchors, to.at + 0.001);
        assert.equal(left.to.shapeId, right.from.shapeId);
        assert.equal(left.mix, 1);
        assert.equal(right.mix, 0);
    }
    // Workbench ends the timeline, even far down its project grid.
    const workbenchTop = elements.get('projects-grid').offsetTop;
    for (const y of [workbenchTop - 1, workbenchTop, workbenchTop + 1, 1e7, 0]) {
        const first = at(y);
        at(1234);
        assert.deepEqual(at(y), first);
    }
    const workbenchStart = at(workbenchTop);
    const workbenchScrolled = at(workbenchTop + height);
    assert.equal(workbenchScrolled[0], 'defaultBlob');
    assert(Math.abs(workbenchScrolled[5] - workbenchStart[5] - Math.PI) < 1e-10,
        'Workbench blob rotates half a turn per viewport of scroll');
    vm.runInContext('renderScene(16.67); renderScene(16.67);', ctx);
    assert.deepEqual(readState(), workbenchScrolled, 'Held scroll must hold rotation');
    assert.deepEqual(at(workbenchTop), workbenchStart, 'Scrolling back restores rotation');
    at(0);
    assert.equal(window.__blobDebug.getState().fromShape, 'defaultBlob');
    // Responsive rebuilding retains valid anchors and re-samples the current offset.
    window.innerHeight += 40;
    vm.runInContext('rebuildScrollAnchors();', ctx);
    assert(window.__blobDebug.getState().anchors.every(anchor => Number.isFinite(anchor.at)));
    // Settled custom shapes do no noise sampling and reuse cached surface buffers.
    at(anchors.find(anchor => anchor.shapeId === 'airplane').at);
    vm.runInContext('renderScene(16.67);', ctx);
    const stats = window.__blobDebug.getState().frame;
    assert.equal(stats.noiseSamples, 0);
    assert.equal(stats.lineStrokes, width < 768 ? 82 : 122);
    assert(stats.starFills <= 8);
    const samples = stats.surfaceSamples;
    const previousOperations = {...operations};
    vm.runInContext('renderScene(16.67);', ctx);
    assert.equal(operations.stroke - previousOperations.stroke, width < 768 ? 82 : 122);
    assert.equal(operations.strokeStyle - previousOperations.strokeStyle, width < 768 ? 82 : 122);
    assert(operations.fill - previousOperations.fill <= 8);
    assert.equal(operations.createRadialGradient, previousOperations.createRadialGradient, 'Stable colors reuse the glow');
    assert.equal(window.__blobDebug.getState().frame.surfaceSamples, samples);
    at(0);
    vm.runInContext('renderScene(16.67);', ctx);
    assert.equal(window.__blobDebug.getState().frame.noiseSamples, stats.vertices);

    // One loop stops while hidden and restarts once visible; scroll events coalesce.
    assert.equal(pendingFrames.size, 1);
    document.hidden = true;
    events.get('document:visibilitychange')();
    assert.equal(pendingFrames.size, 0);
    events.get('scroll:scroll')();
    assert.equal(pendingFrames.size, 0);
    document.hidden = false;
    events.get('document:visibilitychange')();
    assert.equal(pendingFrames.size, 1);
    media.matches = true;
    events.get('media:change')();
    const runFrame = timestamp => {
        const [id, callback] = pendingFrames.entries().next().value;
        pendingFrames.delete(id);
        callback(timestamp);
    };
    runFrame(1000);
    assert.equal(pendingFrames.size, 0, 'Reduced motion must not leave an idle loop');
    const frozenTime = window.__blobDebug.getState().time;
    const resizedAnchors = window.__blobDebug.getState().anchors;
    scroller.scrollTop = (resizedAnchors[0].at + resizedAnchors[1].at) / 2;
    events.get('scroll:scroll')();
    events.get('scroll:scroll')();
    assert.equal(pendingFrames.size, 1);
    runFrame(2000);
    assert.equal(pendingFrames.size, 0);
    assert.equal(window.__blobDebug.getState().time, frozenTime);
    assert.equal(window.__blobDebug.getState().motionEnergy, 0);
    assert.equal(window.__blobDebug.getState().bank, 0);
    assert.equal(window.__blobDebug.getState().shapeMix, 0.5);
    media.matches = false;
    events.get('media:change')();
    runFrame(3000);
    assert.equal(pendingFrames.size, 1, 'Normal animation resumes after preference changes');
    console.log(`${width}x${height}: morph continuity, render budgets, hidden-tab pause and reduced motion passed.`);
}

const ctx = vm.createContext({window: {}, Math});
vm.runInContext(fs.readFileSync(path.join(root, 'js/blob-shapes.js'), 'utf8'), ctx);
const presets = Object.values(ctx.window.BLOB_SHAPES);
for (const resolution of [40, 60]) {
    for (const preset of presets) {
        assert.notEqual(preset.mode, 'arbitraryMesh');
        if (!preset.getPosition) continue;
        for (const time of [0, Math.PI / 3, 2.4]) {
            for (let lat = 0; lat <= resolution; lat++) {
                const theta = lat / resolution * Math.PI;
                const first = preset.getPosition(theta, 0, time, {baseRadius: 1});
                const last = preset.getPosition(theta, 2 * Math.PI, time, {baseRadius: 1});
                assert(Math.hypot(first.x-last.x, first.y-last.y, first.z-last.z) < 1e-8, `${preset.id}: seam`);
                for (let lon = 0; lon <= resolution; lon++) {
                    const p = preset.getPosition(theta, lon / resolution * Math.PI * 2, time, {baseRadius: 1});
                    assert(Object.values(p).every(Number.isFinite), preset.id);
                    assert(Math.hypot(p.x, p.y, p.z) < 1.5, `${preset.id}: bounded size`);
                    if (lat === 0 || lat === resolution) {
                        assert(Math.hypot(first.x-p.x, first.y-p.y, first.z-p.z) < 1e-8, `${preset.id}: pole`);
                    }
                }
            }
        }
    }
}
console.log('All surfaces are finite, bounded, periodic and closed at both desktop/mobile resolutions.');
