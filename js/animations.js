// One continuous surface, with a single visibility-aware animation loop.
const BLOB_DEFAULTS = Object.freeze({
    baseRadius: 200, noiseAmplitude: 0.10, noiseFrequency: 0.003, idleMorphSpeed: 0.005,
    perspective: 600, brightnessMultiplier: 1, lineWidth: 1, glowMaxOpacity: 0.15,
    starCount: 250, starTwinkleSpeed: 1, starMaxRadius: 2, starBrightness: 1,
    hueOverride: null
});
const BLOB_CONTROL_DEFS = [
    {id: 'base-radius', key: 'baseRadius', min: 30, max: 500, step: 10, format: v => Math.round(v) + 'px'},
    {id: 'noise-amplitude', key: 'noiseAmplitude', min: 0, max: 0.5, step: 0.01, format: v => v.toFixed(2)},
    {id: 'noise-frequency', key: 'noiseFrequency', min: 0.001, max: 0.01, step: 0.0001, format: v => v < 0.004 ? 'Smooth' : v < 0.007 ? 'Medium' : 'Detailed'},
    {id: 'morph-speed', key: 'idleMorphSpeed', min: 0, max: 0.02, step: 0.001, format: v => v === 0 ? 'Still' : v < 0.004 ? 'Slow' : v < 0.01 ? 'Medium' : 'Fast'},
    {id: 'perspective', key: 'perspective', min: 400, max: 1200, step: 50, format: v => Math.round(v)},
    {id: 'brightness', key: 'brightnessMultiplier', min: 0.3, max: 1.5, step: 0.05, format: v => v.toFixed(2)},
    {id: 'line-width', key: 'lineWidth', min: 0.1, max: 3, step: 0.1, format: v => v.toFixed(1)},
    {id: 'glow-intensity', key: 'glowMaxOpacity', min: 0, max: 0.5, step: 0.05, format: v => v.toFixed(2)},
    {id: 'star-count', key: 'starCount', min: 0, max: 500, step: 10, format: v => Math.round(v)},
    {id: 'star-twinkle', key: 'starTwinkleSpeed', min: 0, max: 3, step: 0.1, format: v => v.toFixed(1)},
    {id: 'star-size', key: 'starMaxRadius', min: 0.3, max: 5, step: 0.1, format: v => v.toFixed(1)},
    {id: 'star-brightness', key: 'starBrightness', min: 0.2, max: 2, step: 0.1, format: v => v.toFixed(1)}
];
const CONFIG = {
    ...BLOB_DEFAULTS,
    sectionRegistry: [], scrollAnchors: [], currentPreset: null, targetPreset: null,
    shapeTransitionProgress: 0, scrollRotation: 0, currentSection: 'hero',
    displayColor: '#5A0080', targetColor: '#5A0080',
    rainbowMode: false, shapeOverride: null,
    sectionColors: {hero: '#5A0080', about: '#006640', contact: '#6B5A00', 'projects-grid': '#6B1F00'}
};
let blobCanvas, blobCtx, starfieldCanvas, starfieldCtx, scrollContainer;
let width = 0, height = 0, dpr = 1, gridResolution = 60;
let directions, projectedX, projectedY, vertexLight;
let surfaceBuffers = {}, lines = [], stars = [];
const starBuckets = Array.from({length: 8}, () => []);
let time = 0, motionEnergy = 0, bank = 0, scrollDirection = 1, scrollVelocity = 0;
let radiusIsDefault = true;
let lastScrollY = 0, scrollDirty = true, rafId = null, lastFrameAt = null;
let drag = null;
const rotation = {x: 0, y: 0};
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let glowGradient = null, glowKey = '';
const frameStats = {vertices: 0, surfaceSamples: 0, noiseSamples: 0, lineStrokes: 0, starFills: 0};

class SimplexNoise {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = [];
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }

    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }

    noise3D(x, y, z) {
        const F3 = 1.0 / 3.0;
        const G3 = 1.0 / 6.0;

        let n0, n1, n2, n3;

        const s = (x + y + z) * F3;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const k = Math.floor(z + s);

        const t = (i + j + k) * G3;
        const X0 = i - t;
        const Y0 = j - t;
        const Z0 = k - t;
        const x0 = x - X0;
        const y0 = y - Y0;
        const z0 = z - Z0;

        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
            else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
            else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
        } else {
            if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
            else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
            else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
        }

        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2.0 * G3;
        const y2 = y0 - j2 + 2.0 * G3;
        const z2 = z0 - k2 + 2.0 * G3;
        const x3 = x0 - 1.0 + 3.0 * G3;
        const y3 = y0 - 1.0 + 3.0 * G3;
        const z3 = z0 - 1.0 + 3.0 * G3;

        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;
        const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
        const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
        const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
        const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

        let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0, z0);
        }

        let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1, z1);
        }

        let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2, z2);
        }

        let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
        if (t3 < 0) n3 = 0.0;
        else {
            t3 *= t3;
            n3 = t3 * t3 * this.dot(this.grad3[gi3], x3, y3, z3);
        }

        return 32.0 * (n0 + n1 + n2 + n3);
    }
}

const simplex = new SimplexNoise();

// ==========================================
// COLOR INTERPOLATION HELPERS
// ==========================================
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function lerpColor(colorA, colorB, t) {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    if (!a || !b) return colorB;
    return rgbToHex(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t
    );
}

function hueToRgb(degrees, lightness = 0.55) {
    const hue = ((degrees % 360) + 360) % 360 / 30;
    const amplitude = Math.min(lightness, 1 - lightness);
    const channel = offset => {
        const k = (offset + hue) % 12;
        return Math.round(255 * (lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return {r: channel(0), g: channel(8), b: channel(4)};
}

function brightenColor(rgb) {
    const channel = value => Math.min(255, Math.round(value * CONFIG.brightnessMultiplier));
    return {r: channel(rgb.r), g: channel(rgb.g), b: channel(rgb.b)};
}

function getBlobScrollTop() {
    return scrollContainer ? scrollContainer.scrollTop : window.scrollY;
}

function rebuildScrollAnchors() {
    const vh = window.innerHeight;
    CONFIG.scrollAnchors = CONFIG.sectionRegistry.map(section => {
        const element = document.getElementById(section.id);
        if (!element) return null;
        return {
            at: element.offsetTop + Math.min(element.offsetHeight, vh) / 2 - vh / 2,
            shapeId: section.shapeId || 'defaultBlob',
            color: section.blobColor || CONFIG.sectionColors[section.id] || CONFIG.sectionColors.hero,
            sectionId: section.id
        };
    }).filter(Boolean).sort((a, b) => a.at - b.at);
    CONFIG.scrollAnchors.forEach((anchor, index) => { anchor.rotation = index * 0.24; });
    lastScrollY = getBlobScrollTop();
    updateScrollMorph(lastScrollY);
    requestSceneFrame();
}

function updateScrollMorph(scrollTop) {
    const sample = window.BLOB_MOTION.sample(CONFIG.scrollAnchors, scrollTop);
    if (!sample) return;
    const {from, to, mix, fraction} = sample;
    CONFIG.currentPreset = window.BLOB_SHAPES[from.shapeId] || window.BLOB_SHAPES.defaultBlob;
    CONFIG.targetPreset = window.BLOB_SHAPES[to.shapeId] || window.BLOB_SHAPES.defaultBlob;
    CONFIG.shapeTransitionProgress = mix;
    if (CONFIG.shapeOverride && window.BLOB_SHAPES[CONFIG.shapeOverride]) {
        CONFIG.currentPreset = CONFIG.targetPreset = window.BLOB_SHAPES[CONFIG.shapeOverride];
        CONFIG.shapeTransitionProgress = 0;
    }
    CONFIG.scrollRotation = from.rotation + (to.rotation - from.rotation) * fraction;
    // Keep rotating after the final shape anchor as the project grid scrolls.
    // Position-driven rotation reverses exactly and stops when scrolling stops.
    if (from.sectionId === 'projects-grid' && !motionPreference.matches) {
        CONFIG.scrollRotation += Math.max(0, scrollTop - from.at) / Math.max(1, window.innerHeight) * Math.PI;
    }
    CONFIG.displayColor = CONFIG.targetColor = lerpColor(from.color, to.color, mix);
    syncShapeControls();
}

function buildBlobVertices() {
    const side = gridResolution + 1;
    const count = side * side;
    directions = new Float64Array(count * 3);
    projectedX = new Float32Array(count);
    projectedY = new Float32Array(count);
    vertexLight = new Float32Array(count);
    surfaceBuffers = {};
    const presets = Object.values(window.BLOB_SHAPES).filter(preset => preset.getPosition);
    presets.forEach(preset => { surfaceBuffers[preset.id] = new Float32Array(count * 3); });
    for (let lat = 0; lat < side; lat++) {
        const theta = lat / gridResolution * Math.PI;
        for (let lon = 0; lon < side; lon++) {
            const phi = lon / gridResolution * Math.PI * 2;
            const offset = (lat * side + lon) * 3;
            directions[offset] = Math.sin(theta) * Math.cos(phi);
            directions[offset + 1] = Math.sin(theta) * Math.sin(phi);
            directions[offset + 2] = Math.cos(theta);
            presets.forEach(preset => {
                const p = preset.getPosition(theta, phi, 0, {baseRadius: 1});
                const buffer = surfaceBuffers[preset.id];
                buffer[offset] = p.x;
                buffer[offset + 1] = p.y;
                buffer[offset + 2] = p.z;
            });
        }
    }
    lines = [];
    for (let lat = 0; lat < side; lat++) {
        lines.push({indices: Uint16Array.from({length: side}, (_, lon) => lat * side + lon), latitude: lat / gridResolution});
    }
    for (let lon = 0; lon < side; lon++) {
        lines.push({indices: Uint16Array.from({length: side}, (_, lat) => lat * side + lon), latitude: null});
    }
    frameStats.vertices = count;
    frameStats.surfaceSamples = count * presets.length;
}

function resizeScene() {
    const previousResolution = gridResolution;
    width = window.innerWidth;
    height = window.innerHeight;
    // 2x is crisp on Retina without paying for a 3x/4x full-screen canvas.
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    gridResolution = width < 768 ? 40 : 60;
    if (radiusIsDefault) CONFIG.baseRadius = width < 768 ? 120 : 200;
    for (const canvas of [blobCanvas, starfieldCanvas]) {
        if (!canvas) continue;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (!directions || previousResolution !== gridResolution) buildBlobVertices();
    if (stars.length !== CONFIG.starCount) regenerateStars();
    glowGradient = null;
    rebuildScrollAnchors();
}

function regenerateStars() {
    stars = Array.from({length: CONFIG.starCount}, () => ({
        x: Math.random(), y: Math.random(), size: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.5
    }));
}

function renderStars() {
    if (!starfieldCtx) return;
    const ctx = starfieldCtx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    starBuckets.forEach(bucket => { bucket.length = 0; });
    stars.forEach(star => {
        const brightness = (0.45 + 0.25 * Math.sin(time * star.speed * CONFIG.starTwinkleSpeed + star.phase)) * CONFIG.starBrightness;
        starBuckets[Math.min(7, Math.floor(brightness * 8))].push(star);
    });
    frameStats.starFills = 0;
    starBuckets.forEach((bucket, index) => {
        if (!bucket.length) return;
        ctx.beginPath();
        bucket.forEach(star => {
            const x = star.x * width, y = star.y * height;
            const radius = star.size * CONFIG.starMaxRadius;
            ctx.moveTo(x + radius, y);
            ctx.arc(x, y, radius, 0, Math.PI * 2);
        });
        ctx.fillStyle = `rgba(255,255,255,${(index + 1) / 8})`;
        ctx.fill();
        frameStats.starFills++;
    });
}

function strokeProjectedLine(indices) {
    const ctx = blobCtx;
    ctx.beginPath();
    const first = indices[0];
    ctx.moveTo(projectedX[first], projectedY[first]);
    for (let j = 1; j < indices.length - 1; j++) {
        const current = indices[j], next = indices[j + 1];
        ctx.quadraticCurveTo(projectedX[current], projectedY[current],
            (projectedX[current] + projectedX[next]) / 2, (projectedY[current] + projectedY[next]) / 2);
    }
    const last = indices[indices.length - 1];
    ctx.lineTo(projectedX[last], projectedY[last]);
    ctx.stroke();
    frameStats.lineStrokes++;
}

function renderBlob() {
    if (!blobCtx || !directions) return;
    const ctx = blobCtx;
    const reduced = motionPreference.matches;
    const radius = CONFIG.baseRadius;
    let mix = CONFIG.shapeTransitionProgress;
    let source = surfaceBuffers[CONFIG.currentPreset?.id];
    let target = surfaceBuffers[CONFIG.targetPreset?.id];
    // A settled custom shape never evaluates the noise field or a second shape.
    if (mix === 1) { source = target; mix = 0; }
    if (source === target) mix = 0;
    const needsNoise = !source || (mix > 0 && !target);
    const yaw = rotation.y + CONFIG.scrollRotation;
    const pitch = rotation.x + (reduced ? 0 : Math.sin(time * 0.10) * 0.035);
    const roll = reduced ? 0 : bank + Math.sin(time * 0.08) * 0.018;
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cz = Math.cos(roll), sz = Math.sin(roll);
    const breath = reduced ? 1 : 1 + Math.sin(time * 0.8) * 0.007;
    const noiseTime = time * CONFIG.idleMorphSpeed * 18;
    const noiseScale = radius * CONFIG.noiseFrequency;
    const count = projectedX.length;
    frameStats.noiseSamples = 0;
    for (let i = 0, offset = 0; i < count; i++, offset += 3) {
        const dx = directions[offset], dy = directions[offset + 1], dz = directions[offset + 2];
        const r = needsNoise ? 1 + simplex.noise3D(dx * noiseScale + noiseTime, dy * noiseScale + noiseTime, dz * noiseScale + noiseTime) * CONFIG.noiseAmplitude : 1;
        if (needsNoise) frameStats.noiseSamples++;
        let x = source ? source[offset] : dx * r;
        let y = source ? source[offset + 1] : dy * r;
        let z = source ? source[offset + 2] : dz * r;
        if (mix > 0) {
            x += ((target ? target[offset] : dx * r) - x) * mix;
            y += ((target ? target[offset + 1] : dy * r) - y) * mix;
            z += ((target ? target[offset + 2] : dz * r) - z) * mix;
        }
        x *= radius * breath; y *= radius * breath; z *= radius * breath;
        const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
        const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
        const rx = x2 * cz - y1 * sz, ry = x2 * sz + y1 * cz;
        const scale = CONFIG.perspective / Math.max(CONFIG.perspective * 0.15, CONFIG.perspective + z2);
        projectedX[i] = width / 2 + rx * scale;
        projectedY[i] = height / 2 + ry * scale;
        const length = Math.hypot(rx, ry, z2) || 1;
        const lighting = Math.max(0, (rx * 0.408 - ry * 0.408 + z2 * 0.816) / length);
        vertexLight[i] = 0.20 + lighting * 0.6 + (z2 / radius + 1) * 0.15;
    }
    ctx.clearRect(0, 0, width, height);
    const baseColor = CONFIG.rainbowMode ? hueToRgb(time * 72) :
        CONFIG.hueOverride !== null ? hueToRgb(CONFIG.hueOverride, 0.3) : hexToRgb(CONFIG.displayColor);
    const rgb = brightenColor(baseColor);
    const key = `${rgb.r}:${rgb.g}:${rgb.b}:${CONFIG.glowMaxOpacity}:${radius}:${width}:${height}`;
    if (!glowGradient || key !== glowKey) {
        glowKey = key;
        glowGradient = ctx.createRadialGradient(width / 2 - radius * 0.3, height / 2 - radius * 0.3, 0,
            width / 2, height / 2, radius * 1.5);
        glowGradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${CONFIG.glowMaxOpacity})`);
        glowGradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${CONFIG.glowMaxOpacity / 3})`);
        glowGradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    }
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const sheenPosition = (time * 0.35) % 1;
    frameStats.lineStrokes = 0;
    lines.forEach((line, lineIndex) => {
        const indices = line.indices;
        let light = 0;
        for (const index of indices) light += vertexLight[index];
        const sheen = reduced || line.latitude === null ? 0 :
            Math.max(0, 1 - Math.abs(line.latitude - sheenPosition) / 0.16) ** 2 * motionEnergy * 0.18;
        const opacity = Math.min(1, light / indices.length + sheen);
        const lineColor = CONFIG.rainbowMode ? brightenColor(hueToRgb(time * 72 + lineIndex / lines.length * 360)) : rgb;
        if (CONFIG.rainbowMode) {
            ctx.lineWidth = CONFIG.lineWidth * 3.5;
            ctx.strokeStyle = `rgba(${lineColor.r},${lineColor.g},${lineColor.b},${opacity * 0.18})`;
            strokeProjectedLine(indices);
            ctx.lineWidth = CONFIG.lineWidth;
        }
        ctx.strokeStyle = `rgba(${lineColor.r},${lineColor.g},${lineColor.b},${opacity})`;
        strokeProjectedLine(indices);
    });
}

function renderScene(elapsed) {
    if (scrollDirty) {
        updateScrollMorph(getBlobScrollTop());
        scrollDirty = false;
    }
    if (!motionPreference.matches) {
        time += elapsed / 1000;
        // Match the former scroll impulse and 0.95-per-frame coast at any frame rate.
        const decay = Math.pow(0.95, elapsed / (1000 / 60));
        rotation.y += scrollVelocity * (1 - decay) / 0.05;
        scrollVelocity *= decay;
        if (Math.abs(scrollVelocity) < 0.0001) scrollVelocity = 0;
        motionEnergy *= Math.exp(-elapsed / 350);
        bank += (scrollDirection * motionEnergy * 0.025 - bank) * (1 - Math.exp(-elapsed / 120));
    } else {
        scrollVelocity = 0;
        motionEnergy = 0;
        bank = 0;
    }
    renderStars();
    renderBlob();
}

function requestSceneFrame() {
    if (rafId === null && !document.hidden) rafId = requestAnimationFrame(animate);
}

function animate(timestamp) {
    rafId = null;
    if (document.hidden) return;
    const elapsed = lastFrameAt === null ? 1000 / 60 : timestamp - lastFrameAt;
    // Limit high-refresh displays to 60fps, allowing normal frame timing jitter.
    if (elapsed >= 1000 / 60 - 0.5 || motionPreference.matches) {
        lastFrameAt = timestamp;
        renderScene(Math.min(elapsed, 50));
    }
    if (!motionPreference.matches) requestSceneFrame();
}

function initBlobSystem() {
    blobCanvas = document.getElementById('blob-canvas');
    starfieldCanvas = document.getElementById('starfield');
    if (!blobCanvas || !starfieldCanvas) return;
    blobCtx = blobCanvas.getContext('2d');
    starfieldCtx = starfieldCanvas.getContext('2d');
    scrollContainer = document.querySelector('.scroll-container');
    resizeScene();
    const backToTop = document.getElementById('back-to-top');
    const onScroll = () => {
        const y = getBlobScrollTop(), delta = y - lastScrollY;
        lastScrollY = y;
        if (delta) scrollDirection = Math.sign(delta);
        if (delta && !motionPreference.matches) scrollVelocity = Math.max(-0.35, Math.min(0.35, delta * 0.008));
        motionEnergy = Math.min(1, motionEnergy + Math.abs(delta) / height * 2);
        scrollDirty = true;
        backToTop?.classList.toggle('visible', y > height * 0.5);
        requestSceneFrame();
    };
    (scrollContainer || window).addEventListener('scroll', onScroll, {passive: true});
    backToTop?.addEventListener('click', () => {
        (scrollContainer || window).scrollTo({top: 0, behavior: motionPreference.matches ? 'instant' : 'smooth'});
        if (typeof sa === 'function') sa('back_to_top');
    });
    scrollContainer?.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button, input, select, nav')) return;
        drag = {x: event.clientX, y: event.clientY};
        scrollContainer.setPointerCapture(event.pointerId);
        scrollContainer.style.cursor = 'grabbing';
    });
    scrollContainer?.addEventListener('pointermove', event => {
        if (!drag) return;
        rotation.y += (event.clientX - drag.x) * 0.005;
        rotation.x += (event.clientY - drag.y) * 0.005;
        drag.x = event.clientX; drag.y = event.clientY;
        requestSceneFrame();
    });
    const endDrag = () => {
        drag = null;
        if (scrollContainer) scrollContainer.style.cursor = '';
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) scrollContainer?.addEventListener(name, endDrag);
    window.addEventListener('resize', resizeScene);
    document.addEventListener('visibilitychange', () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        lastFrameAt = null;
        requestSceneFrame();
    });
    motionPreference.addEventListener('change', () => {
        lastFrameAt = null;
        scrollVelocity = 0;
        requestSceneFrame();
    });
    initControlPanel();
    onScroll();
}

window.addEventListener('blobSectionsReady', event => {
    CONFIG.sectionRegistry = event.detail;
    rebuildScrollAnchors();
});
window.addEventListener('sectionChanged', event => { CONFIG.currentSection = event.detail.section; });

function getDefaultBlobSettings() {
    return {...BLOB_DEFAULTS, baseRadius: window.innerWidth < 768 ? 120 : 200};
}

function serializeBlobSettings() {
    const settings = Object.fromEntries(Object.keys(BLOB_DEFAULTS).map(key => [key, CONFIG[key]]));
    // Retain compatibility with preferences saved by the original panel.
    return {...settings, morphSpeed: CONFIG.idleMorphSpeed, radiusIsDefault};
}

function applyControlValue(def, rawValue) {
    if (!['number', 'string'].includes(typeof rawValue) || rawValue === '') return false;
    const number = Number(rawValue);
    if (!Number.isFinite(number)) return false;
    const bounded = Math.max(def.min, Math.min(def.max, number));
    // Match native range sanitization when restoring older saved values.
    const value = Number((def.min + Math.round((bounded - def.min) / def.step) * def.step).toFixed(6));
    CONFIG[def.key] = value;
    if (def.key === 'baseRadius') radiusIsDefault = false;
    if (def.key === 'starCount') regenerateStars();
    requestSceneFrame();
    return true;
}

function restoreBlobSettings(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
    for (const def of BLOB_CONTROL_DEFS) {
        const value = def.key === 'idleMorphSpeed' ? saved.idleMorphSpeed ?? saved.morphSpeed : saved[def.key];
        if (value !== undefined) applyControlValue(def, value);
    }
    if (typeof saved.hueOverride === 'number' && Number.isFinite(saved.hueOverride)) {
        CONFIG.hueOverride = Math.round(Math.max(0, Math.min(360, saved.hueOverride)));
    }
    radiusIsDefault = saved.radiusIsDefault === true ||
        (saved.radiusIsDefault === undefined && [undefined, 120, 200].includes(saved.baseRadius));
    if (radiusIsDefault) CONFIG.baseRadius = getDefaultBlobSettings().baseRadius;
}

function syncShapeControls() {
    const mix = CONFIG.shapeTransitionProgress;
    const usesNoise = (!CONFIG.currentPreset?.getPosition && mix < 1) ||
        (!CONFIG.targetPreset?.getPosition && mix > 0);
    for (const id of ['noise-amplitude', 'noise-frequency', 'morph-speed']) {
        const input = document.getElementById(id);
        if (!input) continue;
        input.disabled = !usesNoise;
        const item = input.closest('.control-item');
        item?.classList.toggle('control-disabled', !usesNoise);
        if (item) item.title = usesNoise ? '' : 'Available on the default blob';
    }
}

function initControlPanel() {
    const panel = document.getElementById('blob-control-panel');
    const toggle = document.getElementById('controls-toggle');
    const drawer = document.getElementById('blob-controls-drawer');
    if (!panel || !toggle || !drawer) return;
    const hue = document.getElementById('hue-slider');
    const hueValue = document.getElementById('hue-slider-value');
    const hueClear = document.getElementById('hue-clear');
    const egg = document.getElementById('easter-egg-icon');
    const shape = document.getElementById('shape-select');
    let eggTimer = null;

    function saveSettings() {
        try { localStorage.setItem('blobSettings', JSON.stringify(serializeBlobSettings())); } catch {}
    }

    function syncSliders() {
        for (const def of BLOB_CONTROL_DEFS) {
            const input = document.getElementById(def.id);
            const value = document.getElementById(def.id + '-value');
            if (input) input.value = CONFIG[def.key];
            if (value) value.textContent = def.format(CONFIG[def.key]);
        }
    }

    function positionEgg() {
        if (!hue || !egg) return;
        const fraction = Number(hue.value) / 360;
        egg.style.left = (8 + fraction * Math.max(0, hue.getBoundingClientRect().width - 16)) + 'px';
    }

    function syncHue() {
        if (hueValue) hueValue.textContent = CONFIG.rainbowMode ? 'Rainbow' :
            CONFIG.hueOverride === null ? 'Auto' : CONFIG.hueOverride + ' deg';
        hueClear?.classList.toggle('hidden', CONFIG.hueOverride === null && !CONFIG.rainbowMode);
        panel.classList.toggle('rainbow-active', CONFIG.rainbowMode);
        if (egg) {
            egg.classList.toggle('is-activated', CONFIG.rainbowMode);
            egg.disabled = !CONFIG.rainbowMode;
        }
        positionEgg();
    }

    function cancelEggFill() {
        if (eggTimer !== null) clearTimeout(eggTimer);
        eggTimer = null;
        egg?.classList.remove('is-filling');
    }

    function startEggFill() {
        if (CONFIG.rainbowMode || eggTimer !== null) return;
        egg?.classList.add('is-filling');
        eggTimer = setTimeout(() => {
            eggTimer = null;
            egg?.classList.remove('is-filling');
            CONFIG.rainbowMode = true;
            CONFIG.hueOverride = null;
            syncHue();
            saveSettings();
            requestSceneFrame();
            if (typeof sa === 'function') sa('rainbow_activate');
        }, 1600);
    }

    function setPanelOpen(open) {
        panel.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        drawer.inert = !open;
        if (!open) cancelEggFill();
        else positionEgg();
    }

    toggle.addEventListener('click', () => {
        const open = !panel.classList.contains('open');
        setPanelOpen(open);
        if (typeof sa === 'function') sa('panel_toggle', {panel_state: open ? 'open' : 'closed'});
    });
    document.addEventListener('click', event => {
        if (panel.classList.contains('open') && !panel.contains(event.target)) setPanelOpen(false);
    });
    panel.addEventListener('keydown', event => {
        if (event.key === 'Escape') { setPanelOpen(false); toggle.focus(); }
    });
    for (const header of panel.querySelectorAll('.controls-section-header')) {
        const section = header.closest('.controls-section');
        const body = section.querySelector('.controls-section-body');
        const setExpanded = expanded => {
            section.classList.toggle('collapsed', !expanded);
            header.setAttribute('aria-expanded', String(expanded));
            body.inert = !expanded;
        };
        setExpanded(window.innerWidth >= 768);
        header.addEventListener('click', () => {
            setExpanded(section.classList.contains('collapsed'));
            positionEgg();
        });
    }
    for (const def of BLOB_CONTROL_DEFS) {
        const input = document.getElementById(def.id);
        input?.addEventListener('input', () => {
            if (!applyControlValue(def, input.value)) return;
            const value = document.getElementById(def.id + '-value');
            if (value) value.textContent = def.format(CONFIG[def.key]);
            saveSettings();
        });
    }
    if (shape) {
        const choices = [{id: '', label: 'Follow page'}, ...Object.values(window.BLOB_SHAPES)];
        for (const preset of choices) {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.label;
            shape.appendChild(option);
        }
        shape.value = '';
        const value = document.getElementById('shape-select-value');
        if (value) value.textContent = 'Auto';
        shape.addEventListener('change', () => {
            if (shape.value && !window.BLOB_SHAPES[shape.value]) return;
            CONFIG.shapeOverride = shape.value || null;
            const value = document.getElementById('shape-select-value');
            if (value) value.textContent = shape.value ? 'Manual' : 'Auto';
            scrollDirty = true;
            requestSceneFrame();
        });
    }
    hue?.addEventListener('input', () => {
        CONFIG.rainbowMode = false;
        CONFIG.hueOverride = Math.max(0, Math.min(360, Number(hue.value)));
        if (CONFIG.hueOverride === 360) startEggFill();
        else cancelEggFill();
        syncHue();
        saveSettings();
        requestSceneFrame();
    });
    hue?.addEventListener('pointerdown', () => { if (Number(hue.value) === 360) startEggFill(); });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) hue?.addEventListener(name, cancelEggFill);
    const clearHue = () => {
        cancelEggFill();
        CONFIG.rainbowMode = false;
        CONFIG.hueOverride = null;
        if (hue) hue.value = 0;
        syncHue();
        saveSettings();
        requestSceneFrame();
    };
    hueClear?.addEventListener('click', clearHue);
    egg?.addEventListener('click', clearHue);
    document.getElementById('controls-reset')?.addEventListener('click', () => {
        Object.assign(CONFIG, getDefaultBlobSettings(), {shapeOverride: null});
        radiusIsDefault = true;
        if (shape) shape.value = '';
        const value = document.getElementById('shape-select-value');
        if (value) value.textContent = 'Auto';
        regenerateStars();
        scrollDirty = true;
        syncSliders();
        clearHue();
        if (typeof sa === 'function') sa('panel_reset');
    });
    try { restoreBlobSettings(JSON.parse(localStorage.getItem('blobSettings'))); } catch {}
    if (hue) hue.value = CONFIG.hueOverride ?? 0;
    window.addEventListener('resize', () => { syncSliders(); positionEgg(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelEggFill(); });
    syncSliders();
    syncHue();
    syncShapeControls();
}

window.__blobDebug = {
    getState: () => ({currentSection: CONFIG.currentSection,
        fromShape: CONFIG.currentPreset?.id, toShape: CONFIG.targetPreset?.id,
        shapeMix: CONFIG.shapeTransitionProgress, targetColor: CONFIG.targetColor,
        baseRadius: CONFIG.baseRadius, scrollRotation: CONFIG.scrollRotation,
        scrollTop: getBlobScrollTop(), anchors: CONFIG.scrollAnchors.map(anchor => ({...anchor})),
        frame: {...frameStats}, reducedMotion: motionPreference.matches, dpr, motionEnergy, bank, time,
        scrollVelocity, rotation: {...rotation}, hueOverride: CONFIG.hueOverride, rainbowMode: CONFIG.rainbowMode,
        shapeOverride: CONFIG.shapeOverride, persisted: serializeBlobSettings()})
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBlobSystem);
else initBlobSystem();
