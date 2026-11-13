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

// Parse the real panel markup so event tests use its actual IDs and nesting.
function controlElements(elements) {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const fragment = html.slice(html.indexOf('    <!-- Control Panel -->'), html.indexOf('    <!-- Scripts -->'));
    assert(fragment.includes('id="blob-control-panel"'), 'The bottom control panel must be present');
    const makeElement = (tag, attributes = {}) => {
        const classes = new Set((attributes.class || '').split(/\s+/));
        const listeners = new Map();
        let value = attributes.value || '';
        const node = {tag, attributes, children: [], parent: null, style: {},
            get value() { return value; }, set value(next) { value = String(next); },
            disabled: 'disabled' in attributes, inert: 'inert' in attributes,
            classList: {
                contains: name => classes.has(name), add: (...names) => names.forEach(name => classes.add(name)),
                remove: (...names) => names.forEach(name => classes.delete(name)),
                toggle(name, force) { const enabled = force ?? !classes.has(name); if (enabled) classes.add(name); else classes.delete(name); return enabled; }
            },
            matches: selector => selector.startsWith('.') ? classes.has(selector.slice(1)) : selector === tag,
            addEventListener(name, callback) { const callbacks = listeners.get(name) || []; callbacks.push(callback); listeners.set(name, callbacks); },
            dispatch(name, extra = {}) { for (const callback of listeners.get(name) || []) callback({target: node, ...extra}); },
            appendChild(child) { child.parent = node; node.children.push(child); },
            closest(selector) { for (let current = node; current; current = current.parent) if (current.matches(selector)) return current; return null; },
            contains(target) { for (let current = target; current; current = current.parent) if (current === node) return true; return false; },
            querySelectorAll(selector) { return node.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); },
            querySelector: selector => node.querySelectorAll(selector)[0],
            setAttribute: (key, value) => { attributes[key] = value; },
            getAttribute: key => attributes[key],
            getBoundingClientRect: () => ({width: 240}), focus() { node.focused = true; }
        };
        if (attributes.id) elements.set(attributes.id, node);
        return node;
    };
    const stack = [];
    for (const match of fragment.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)) {
        const tag = match[1].toLowerCase();
        if (match[0].startsWith('</')) { if (stack.at(-1)?.tag === tag) stack.pop(); continue; }
        const attributes = Object.fromEntries([...match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m => [m[1], m[2] ?? '']));
        const node = makeElement(tag, attributes);
        stack.at(-1)?.appendChild(node);
        if (!match[0].endsWith('/>') && !['input', 'img', 'br'].includes(tag)) stack.push(node);
    }
    return makeElement;
}

function fixture(width, height, {controls = false, savedSettings = null, storageBlocked = false, starsOnly = false} = {}) {
    const events = new Map();
    const listen = (name, callback) => {
        const previous = events.get(name);
        events.set(name, previous ? event => {previous(event); callback(event);} : callback);
    };
    const scroller = {scrollTop: 0, style: {}, addEventListener(name, cb) {listen('scroll:' + name, cb);}};
    const elements = new Map();
    const makeElement = controls ? controlElements(elements) : null;
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
    const strokeColors = new Set();
    const lastStyles = {};
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
            lastStyles[key] = value;
            if (key === 'strokeStyle') strokeColors.add(value.split(',').slice(0, 3).join(','));
            if (key === 'strokeStyle') assert.match(value, /^(#[0-9a-f]{8}|rgba\(.+\))$/i);
            return true;
        }
    });
    if (!starsOnly) elements.set('blob-canvas', {style: {}, getContext: () => canvasContext});
    elements.set('starfield', {style: {}, getContext: () => canvasContext});
    const document = {
        readyState: 'loading', hidden: false, addEventListener: (name, cb) => listen('document:' + name, cb),
        getElementById: id => elements.get(id),
        createElement: tag => makeElement(tag),
        querySelector: selector => selector === '.scroll-container' && !starsOnly ? scroller : null
    };
    const media = {matches: false, addEventListener: (name, cb) => listen('media:' + name, cb)};
    const pendingFrames = new Map();
    let frameId = 0;
    const window = {
        innerWidth: width, innerHeight: height, devicePixelRatio: 3, scrollY: 0,
        matchMedia: () => media,
        addEventListener: (name, callback) => listen(name, callback)
    };
    const storage = new Map(savedSettings ? [['blobSettings', JSON.stringify(savedSettings)]] : []);
    const timers = new Map();
    let timerId = 0, now = 0;
    const advanceTimers = elapsed => {
        now += elapsed;
        for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); }
    };
    const ctx = vm.createContext({window, document, console, Math,
        localStorage: {
            getItem(key) { if (storageBlocked) throw new Error('Storage unavailable'); return storage.get(key) ?? null; },
            setItem(key, value) { if (storageBlocked) throw new Error('Storage unavailable'); storage.set(key, value); }
        },
        setTimeout(callback, delay) { timers.set(++timerId, {callback, at: now + delay}); return timerId; },
        clearTimeout: id => timers.delete(id),
        requestAnimationFrame: cb => { pendingFrames.set(++frameId, cb); return frameId; },
        cancelAnimationFrame: id => pendingFrames.delete(id)});
    for (const file of starsOnly ? ['animations.js'] : ['blob-shapes.js', 'blob-motion.js', 'animations.js']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), ctx);
    }
    vm.runInContext('initBlobSystem();', ctx);
    if (!starsOnly) events.get('blobSectionsReady')({detail: registry});
    return {ctx, window, scroller, elements, events, document, media, pendingFrames, operations, strokeColors, lastStyles, storage, timers, advanceTimers};
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
    const {ctx, window, scroller, elements, events, document, media, pendingFrames, operations} = fixture(width, height);
    const shapes = window.BLOB_SHAPES;
    const anchors = window.__blobDebug.getState().anchors;
    assert.equal(anchors.length, projectData.homepage.sectionOrder.length + 1);
    assert.equal(anchors.at(-1).sectionId, 'projects-grid');
    assert.equal(window.__blobDebug.getState().dpr, 2);
    for (const section of Object.values(projectData.homepage.sectionsById)) assert(shapes[section.shapeId]);
    // Scroll input must drive visible spin independently of the shape blend.
    const initialYaw = vm.runInContext('rotation.y', ctx);
    scroller.scrollTop = height / 2;
    events.get('scroll:scroll')();
    vm.runInContext('renderScene(1000 / 60);', ctx);
    assert(vm.runInContext('rotation.y', ctx) > initialYaw + 0.02,
        'Scrolling must spin the mesh, including between featured sections');
    const spin = window.__blobDebug.getState();
    vm.runInContext('renderScene(1000 / 60);', ctx);
    const coasting = window.__blobDebug.getState();
    assert(coasting.rotation.y > spin.rotation.y, 'Spin must coast after scrolling stops');
    assert(coasting.scrollVelocity > 0 && coasting.scrollVelocity < spin.scrollVelocity, 'The coast must slow down');
    scroller.scrollTop = height / 4;
    events.get('scroll:scroll')();
    vm.runInContext('renderScene(1000 / 60);', ctx);
    assert(window.__blobDebug.getState().rotation.y < coasting.rotation.y, 'Reverse scroll must reverse spin');
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
    assert.equal(window.__blobDebug.getState().scrollVelocity, 0, 'Reduced motion disables inertial spin');
    assert.equal(window.__blobDebug.getState().shapeMix, 0.5);
    media.matches = false;
    events.get('media:change')();
    runFrame(3000);
    assert.equal(pendingFrames.size, 1, 'Normal animation resumes after preference changes');
    console.log(`${width}x${height}: morph continuity, render budgets, hidden-tab pause and reduced motion passed.`);
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
    const {ctx, window, scroller, elements, events, media, pendingFrames, lastStyles, strokeColors, storage, timers, advanceTimers} = fixture(width, height, {controls: true});
    const state = () => window.__blobDebug.getState();
    const render = () => vm.runInContext('renderScene(1000 / 60);', ctx);
    const input = (id, value, event = 'input') => {
        const element = elements.get(id);
        assert(element, id);
        element.value = String(value);
        element.dispatch(event);
    };
    const panel = elements.get('blob-control-panel');
    const drawer = elements.get('blob-controls-drawer');
    const toggle = elements.get('controls-toggle');
    const controlDefs = vm.runInContext('BLOB_CONTROL_DEFS', ctx);
    for (const def of controlDefs) {
        const control = elements.get(def.id);
        for (const key of ['min', 'max', 'step']) assert.equal(Number(control.attributes[key]), def[key], `${def.id}: ${key}`);
    }
    assert.equal(toggle.tag, 'button');
    assert.equal(drawer.inert, true, 'Closed controls must not receive keyboard focus');
    toggle.dispatch('click');
    assert(panel.classList.contains('open'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(drawer.inert, false);
    const sectionHeader = panel.querySelectorAll('.controls-section-header')[1];
    const sectionBody = sectionHeader.closest('.controls-section').querySelector('.controls-section-body');
    assert.equal(sectionBody.inert, width < 768);
    sectionHeader.dispatch('click');
    assert.equal(sectionBody.inert, width >= 768, 'Section controls must follow their accordion state');
    assert.equal(elements.get('shape-select').children.length, Object.keys(window.BLOB_SHAPES).length + 1);

    input('base-radius', 340);
    input('line-width', 2.5);
    input('perspective', 400);
    input('noise-amplitude', 0.25);
    input('noise-frequency', 0.008);
    input('morph-speed', 0.012);
    input('brightness', 0.8);
    input('glow-intensity', 0.3);
    input('star-count', 0);
    input('star-twinkle', 2);
    input('star-size', 4);
    input('star-brightness', 1.5);
    render();
    assert.equal(state().baseRadius, 340);
    assert.equal(lastStyles.lineWidth, 2.5, 'Line width control must reach the canvas');
    assert.equal(state().frame.starFills, 0, 'Zero stars must remove the starfield');
    const saved = JSON.parse(storage.get('blobSettings'));
    for (const [key, value] of Object.entries({baseRadius: 340, lineWidth: 2.5, perspective: 400, noiseAmplitude: 0.25,
        noiseFrequency: 0.008, morphSpeed: 0.012, brightnessMultiplier: 0.8, glowMaxOpacity: 0.3,
        starCount: 0, starTwinkleSpeed: 2, starMaxRadius: 4, starBrightness: 1.5})) assert.equal(saved[key], value, key);
    window.innerWidth += 100;
    events.get('resize')();
    assert.equal(state().baseRadius, 340, 'A custom size survives resizing');

    input('shape-select', 'airplane', 'change');
    render();
    assert.equal(state().fromShape, 'airplane');
    assert.equal(state().frame.noiseSamples, 0);
    assert.equal(elements.get('noise-amplitude').disabled, true);
    assert.equal(elements.get('line-width').disabled, false);
    input('shape-select', 'defaultBlob', 'change');
    render();
    assert.equal(elements.get('noise-amplitude').disabled, false);
    input('hue-slider', 120);
    strokeColors.clear();
    render();
    assert.equal(strokeColors.size, 1);
    assert([...strokeColors][0].startsWith('rgba(0,'), 'Hue control must change the rendered mesh color');

    input('hue-slider', 360);
    advanceTimers(1599);
    assert.equal(state().rainbowMode, false, 'Rainbow requires holding at max');
    advanceTimers(1);
    assert.equal(state().rainbowMode, true);
    assert(panel.classList.contains('rainbow-active'));
    assert.equal(elements.get('easter-egg-icon').disabled, false);
    input('shape-select', 'airplane', 'change');
    strokeColors.clear();
    render();
    assert(strokeColors.size > 10, 'Rainbow must color separate mesh lines, including custom shapes');
    assert.equal(state().frame.lineStrokes, (width < 768 ? 82 : 122) * 2, 'Rainbow retains its neon halo pass');
    const activeSettings = JSON.parse(storage.get('blobSettings'));
    assert(!('rainbowMode' in activeSettings), 'Rainbow remains session-only');
    const reloaded = fixture(width, height, {controls: true, savedSettings: activeSettings});
    assert.equal(reloaded.window.__blobDebug.getState().rainbowMode, false);
    assert.equal(reloaded.window.__blobDebug.getState().baseRadius, 340);
    assert.equal(reloaded.elements.get('line-width').value, '2.5');

    elements.get('easter-egg-icon').dispatch('click');
    assert.equal(state().rainbowMode, false);
    assert.equal(state().hueOverride, null);
    input('hue-slider', 360);
    elements.get('hue-slider').dispatch('pointerup');
    advanceTimers(2000);
    assert.equal(state().rainbowMode, false, 'Releasing early cancels the easter egg');
    assert.equal(timers.size, 0);

    const airlock = state().anchors.find(anchor => anchor.sectionId === 'featured-airlock');
    scroller.scrollTop = airlock.at;
    events.get('scroll:scroll')();
    elements.get('controls-reset').dispatch('click');
    render();
    assert.equal(state().shapeOverride, null);
    assert.equal(state().fromShape, 'airplane', 'Reset follows the current page section');
    assert.equal(state().baseRadius, width < 768 ? 120 : 200);
    assert.equal(state().persisted.lineWidth, 1);
    assert.equal(state().persisted.radiusIsDefault, true);
    assert.equal(elements.get('shape-select').value, '');
    assert.equal(elements.get('hue-slider-value').textContent, 'Auto');

    // Controls also update a reduced-motion scene without creating a busy loop.
    media.matches = true;
    events.get('media:change')();
    let [id, callback] = pendingFrames.entries().next().value;
    pendingFrames.delete(id); callback(1000);
    input('line-width', 2);
    [id, callback] = pendingFrames.entries().next().value;
    pendingFrames.delete(id); callback(2000);
    assert.equal(lastStyles.lineWidth, 2);
    assert.equal(pendingFrames.size, 0);
    panel.dispatch('keydown', {key: 'Escape'});
    assert.equal(drawer.inert, true);
    assert.equal(toggle.focused, true);
    console.log(`${width}x${height}: scroll spin, controls, persistence, rainbow hold/cancel, reset and reduced-motion input passed.`);
}

const legacy = fixture(390, 844, {controls: true, savedSettings: {baseRadius: 333, morphSpeed: 0.009, hueOverride: 180}});
assert.equal(legacy.window.__blobDebug.getState().baseRadius, 330, 'Saved values must match the native slider step');
assert.equal(legacy.window.__blobDebug.getState().persisted.idleMorphSpeed, 0.009);
assert.equal(legacy.elements.get('hue-slider').value, '180');
const blocked = fixture(390, 844, {controls: true, storageBlocked: true});
blocked.elements.get('line-width').value = '2';
blocked.elements.get('line-width').dispatch('input');
assert.equal(blocked.window.__blobDebug.getState().persisted.lineWidth, 2, 'Blocked storage must not break controls');

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
for (const [width, height] of [[1440, 900], [390, 844]]) {
    const {ctx, window, events, document, media, pendingFrames, operations} = fixture(width, height, {
        starsOnly: true, savedSettings: {starCount: 310, starBrightness: 0.8}
    });
    assert.equal(window.BLOB_SHAPES, undefined, 'Blog stars do not require shape modules');
    vm.runInContext('renderScene(1000 / 60);', ctx);
    assert.equal(vm.runInContext('stars.length', ctx), 310, 'Stars retain the saved appearance');
    assert(operations.arc > 0, 'Stars are actually drawn without a mesh canvas');
    assert.equal(vm.runInContext('directions', ctx), undefined, 'No mesh geometry is allocated');
    assert.equal(window.__blobDebug.getState().frame.noiseSamples, 0);

    document.hidden = true;
    events.get('document:visibilitychange')();
    assert.equal(pendingFrames.size, 0);
    document.hidden = false;
    events.get('document:visibilitychange')();
    media.matches = true;
    events.get('media:change')();
    const [id, callback] = pendingFrames.entries().next().value;
    pendingFrames.delete(id);
    callback(1000);
    assert.equal(pendingFrames.size, 0, 'Reduced motion draws a still sky');
    assert.equal(window.__blobDebug.getState().frame.starFills > 0, true);
    events.get('resize')();
    assert.equal(pendingFrames.size, 1, 'Resizing repaints the still starfield');
    const [resizeId, resizeCallback] = pendingFrames.entries().next().value;
    pendingFrames.delete(resizeId);
    resizeCallback(2000);
    assert.equal(pendingFrames.size, 0);
    console.log(`${width}x${height}: standalone blog stars, saved appearance, hidden-tab pause and reduced motion passed.`);
}

console.log('All surfaces are finite, bounded, periodic and closed at both desktop/mobile resolutions.');
