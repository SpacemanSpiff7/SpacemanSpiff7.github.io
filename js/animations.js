// ==========================================
// 3D MORPHING BLOB ANIMATION SYSTEM
// Simplified: Always morphs, rotates on scroll
// ==========================================

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // Blob parameters
    gridResolution: { lat: 40, lon: 40 },
    gridResolutionMobile: { lat: 28, lon: 28 },
    noiseAmplitude: 0.10,  // Subtle morphing
    noiseFrequency: 0.003,
    morphSpeed: 0.003,     // Base morph speed when scrolling
    idleMorphSpeed: 0.005, // Faster morph speed when idle
    idleThreshold: 0.001,  // Velocity below this = idle
    baseRadius: 200,
    brightnessMultiplier: 1.0,
    lineWidth: 1.0,

    // Color themes per section (dark enough to not interfere with text)
    sectionColors: {
        'hero': '#5A0080',           // Dark purple
        'featured-1': '#7A0A45',     // Dark pink
        'featured-2': '#005A5E',     // Dark turquoise
        'featured-3': '#6B2820',     // Dark tomato
        'featured-4': '#3E2C5A',     // Dark purple
        'about': '#006640',          // Dark green
        'contact': '#6B5A00',        // Dark gold
        'projects-grid': '#6B1F00'   // Dark orange
    },
    currentSection: 'hero',  // Track current section

    // Color transition
    targetColor: '#5A0080',      // Color we're transitioning TO
    displayColor: '#5A0080',     // Color currently being rendered
    colorTransitionSpeed: 0.05,  // Lerp factor per frame (0-1)

    // Starfield
    starCount: 250,

    // Performance
    targetFPS: 60,
    targetFPSMobile: 30,
};

const isMobile = window.innerWidth < 768;
const targetFPS = isMobile ? CONFIG.targetFPSMobile : CONFIG.targetFPS;
const frameInterval = 1000 / targetFPS;

// ==========================================
// SIMPLEX NOISE (Inline Implementation)
// ==========================================
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

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h, s, l };
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function adjustBrightness(hexColor, multiplier) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return hexColor;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.min(1, Math.max(0, hsl.l * multiplier));

    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return '#' + [newRgb.r, newRgb.g, newRgb.b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// STARFIELD RENDERING
// ==========================================
let starfieldCanvas, starfieldCtx, stars = [];

function initStarfield() {
    starfieldCanvas = document.getElementById('starfield');
    if (!starfieldCanvas) return;

    starfieldCtx = starfieldCanvas.getContext('2d');

    function resizeStarfield() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Set internal canvas resolution
        starfieldCanvas.width = w;
        starfieldCanvas.height = h;

        // Set CSS dimensions to match exactly (eliminates gaps)
        starfieldCanvas.style.width = w + 'px';
        starfieldCanvas.style.height = h + 'px';
    }
    resizeStarfield();
    window.addEventListener('resize', resizeStarfield);

    // Generate stars
    for (let i = 0; i < CONFIG.starCount; i++) {
        stars.push({
            x: Math.random() * starfieldCanvas.width,
            y: Math.random() * starfieldCanvas.height,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.5,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            twinklePhase: Math.random() * Math.PI * 2,
        });
    }
}

function renderStarfield(time) {
    if (!starfieldCtx) return;

    starfieldCtx.fillStyle = '#000000';
    starfieldCtx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

    stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const opacity = star.opacity + twinkle * 0.3;

        starfieldCtx.beginPath();
        starfieldCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        starfieldCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        starfieldCtx.fill();
    });
}

// ==========================================
// 3D BLOB MESH GENERATION
// ==========================================
let blobCanvas, blobCtx, vertices = [];
let rotation = { x: 0, y: 0, z: 0 };

function initBlobMesh() {
    blobCanvas = document.getElementById('blob-canvas');
    if (!blobCanvas) return;

    blobCtx = blobCanvas.getContext('2d');

    function resizeBlob() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Set internal canvas resolution
        blobCanvas.width = w;
        blobCanvas.height = h;

        // Set CSS dimensions to match exactly (eliminates gaps)
        blobCanvas.style.width = w + 'px';
        blobCanvas.style.height = h + 'px';
    }
    resizeBlob();
    window.addEventListener('resize', resizeBlob);

    // Generate 3D sphere mesh
    const gridRes = isMobile ? CONFIG.gridResolutionMobile : CONFIG.gridResolution;

    for (let lat = 0; lat <= gridRes.lat; lat++) {
        for (let lon = 0; lon <= gridRes.lon; lon++) {
            const theta = (lat / gridRes.lat) * Math.PI;
            const phi = (lon / gridRes.lon) * Math.PI * 2;

            vertices.push({
                lat,
                lon,
                theta,
                phi,
                x: 0,
                y: 0,
                z: 0,
                projected: { x: 0, y: 0 },
            });
        }
    }
}

// ==========================================
// 3D TRANSFORMATIONS
// ==========================================
function rotateX(x, y, z, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x,
        y: y * cos - z * sin,
        z: y * sin + z * cos,
    };
}

function rotateY(x, y, z, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: x * cos + z * sin,
        y,
        z: -x * sin + z * cos,
    };
}

function rotateZ(x, y, z, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
        z,
    };
}

function project3D(x, y, z) {
    const perspective = 600;
    const scale = perspective / (perspective + z);
    return {
        x: blobCanvas.width / 2 + x * scale,
        y: blobCanvas.height / 2 + y * scale,
        scale,
    };
}

// ==========================================
// SCROLL-BASED ROTATION
// ==========================================
let scrollVelocity = 0;
let lastScrollY = 0;

function setupScrollListener() {
    const scrollContainer = document.querySelector('.scroll-container');
    if (!scrollContainer) {
        // Fallback to window scroll
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            scrollVelocity = (currentScrollY - lastScrollY) * 0.008;
            lastScrollY = currentScrollY;
        }, { passive: true });
        return;
    }

    scrollContainer.addEventListener('scroll', () => {
        const currentScrollY = scrollContainer.scrollTop;
        scrollVelocity = (currentScrollY - lastScrollY) * 0.008;
        lastScrollY = currentScrollY;
    }, { passive: true });
}

// ==========================================
// BLOB RENDERING
// ==========================================
let time = 0;
let lastFrameTime = 0;

function renderBlob(currentTime) {
    if (!blobCtx) {
        requestAnimationFrame(renderBlob);
        return;
    }

    if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(renderBlob);
        return;
    }
    lastFrameTime = currentTime;

    // Dynamic morph speed based on idle state
    const isIdle = Math.abs(scrollVelocity) < CONFIG.idleThreshold;
    const currentMorphSpeed = isIdle ? CONFIG.idleMorphSpeed : CONFIG.morphSpeed;
    time += currentMorphSpeed;

    // Clear canvas
    blobCtx.clearRect(0, 0, blobCanvas.width, blobCanvas.height);

    // Update rotation based on scroll velocity
    rotation.y += scrollVelocity;
    scrollVelocity *= 0.95;  // Decay when not scrolling

    // Subtle idle rotation on X and Z
    rotation.x += 0.0002;
    rotation.z += 0.0001;

    const gridRes = isMobile ? CONFIG.gridResolutionMobile : CONFIG.gridResolution;
    const currentRadius = CONFIG.baseRadius;

    // Update vertices with noise-based morphing
    vertices.forEach(vertex => {
        const noiseValue = simplex.noise3D(
            Math.cos(vertex.phi) * Math.sin(vertex.theta) + time * CONFIG.noiseFrequency * 100,
            Math.sin(vertex.phi) * Math.sin(vertex.theta) + time * CONFIG.noiseFrequency * 100,
            Math.cos(vertex.theta) + time * CONFIG.noiseFrequency * 100
        );

        const radius = currentRadius * (1 + noiseValue * CONFIG.noiseAmplitude);

        let x = radius * Math.sin(vertex.theta) * Math.cos(vertex.phi);
        let y = radius * Math.sin(vertex.theta) * Math.sin(vertex.phi);
        let z = radius * Math.cos(vertex.theta);

        let rotated = rotateX(x, y, z, rotation.x);
        rotated = rotateY(rotated.x, rotated.y, rotated.z, rotation.y);
        rotated = rotateZ(rotated.x, rotated.y, rotated.z, rotation.z);

        vertex.x = rotated.x;
        vertex.y = rotated.y;
        vertex.z = rotated.z;

        vertex.projected = project3D(rotated.x, rotated.y, rotated.z);
    });

    // Light direction
    const lightDir = { x: 0.5, y: -0.5, z: 1 };
    const lightMag = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
    const lightNorm = { x: lightDir.x / lightMag, y: lightDir.y / lightMag, z: lightDir.z / lightMag };

    // Calculate normals and lighting
    vertices.forEach(vertex => {
        const mag = Math.sqrt(vertex.x ** 2 + vertex.y ** 2 + vertex.z ** 2);
        vertex.normal = {
            x: vertex.x / mag,
            y: vertex.y / mag,
            z: vertex.z / mag,
        };
        vertex.lighting = Math.max(0, vertex.normal.x * lightNorm.x + vertex.normal.y * lightNorm.y + vertex.normal.z * lightNorm.z);
    });

    // Lerp displayColor toward targetColor for smooth transitions
    if (CONFIG.displayColor !== CONFIG.targetColor) {
        CONFIG.displayColor = lerpColor(CONFIG.displayColor, CONFIG.targetColor, CONFIG.colorTransitionSpeed);
    }
    const blobColor = adjustBrightness(CONFIG.displayColor, CONFIG.brightnessMultiplier);

    // Draw 3D shading glow behind wireframe
    const centerX = blobCanvas.width / 2;
    const centerY = blobCanvas.height / 2;
    const glowRadius = currentRadius * 1.5;

    const gradient = blobCtx.createRadialGradient(
        centerX - currentRadius * 0.3,  // Offset light source
        centerY - currentRadius * 0.3,
        0,
        centerX,
        centerY,
        glowRadius
    );

    const rgb = hexToRgb(blobColor);
    if (rgb) {
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);   // Bright center
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`); // Mid fade
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);      // Transparent edge

        blobCtx.fillStyle = gradient;
        blobCtx.beginPath();
        blobCtx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        blobCtx.fill();
    }

    // Draw wireframe
    blobCtx.lineWidth = CONFIG.lineWidth;

    // Draw latitude lines
    for (let lat = 0; lat <= gridRes.lat; lat++) {
        blobCtx.beginPath();
        for (let lon = 0; lon <= gridRes.lon; lon++) {
            const index = lat * (gridRes.lon + 1) + lon;
            const vertex = vertices[index];

            const depthFade = (vertex.z / currentRadius + 1) / 2;
            const lighting = vertex.lighting;

            // Enhanced lighting contrast for more 3D pop
            const baseOpacity = 0.15;           // Lower base (darker shadows)
            const lightBoost = lighting * 0.7;  // Higher light boost (brighter highlights)
            const depthBoost = depthFade * 0.4; // More depth variation
            const opacity = baseOpacity + lightBoost + depthBoost;

            blobCtx.strokeStyle = blobColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');

            if (lon === 0) {
                blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
            } else {
                blobCtx.lineTo(vertex.projected.x, vertex.projected.y);
            }
        }
        blobCtx.stroke();
    }

    // Draw longitude lines
    for (let lon = 0; lon <= gridRes.lon; lon++) {
        blobCtx.beginPath();
        for (let lat = 0; lat <= gridRes.lat; lat++) {
            const index = lat * (gridRes.lon + 1) + lon;
            const vertex = vertices[index];

            const depthFade = (vertex.z / currentRadius + 1) / 2;
            const lighting = vertex.lighting;

            // Enhanced lighting contrast for more 3D pop
            const baseOpacity = 0.15;           // Lower base (darker shadows)
            const lightBoost = lighting * 0.7;  // Higher light boost (brighter highlights)
            const depthBoost = depthFade * 0.4; // More depth variation
            const opacity = baseOpacity + lightBoost + depthBoost;

            blobCtx.strokeStyle = blobColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');

            if (lat === 0) {
                blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
            } else {
                blobCtx.lineTo(vertex.projected.x, vertex.projected.y);
            }
        }
        blobCtx.stroke();
    }

    requestAnimationFrame(renderBlob);
}

// ==========================================
// ANIMATION LOOP (Starfield)
// ==========================================
function animate(currentTime) {
    renderStarfield(currentTime * 0.001);
    requestAnimationFrame(animate);
}

// ==========================================
// INITIALIZATION
// ==========================================
function initBlobSystem() {
    initStarfield();
    initBlobMesh();
    setupScrollListener();

    requestAnimationFrame(animate);
    requestAnimationFrame(renderBlob);
}

// Listen for section changes from script.js
window.addEventListener('sectionChanged', (event) => {
    CONFIG.currentSection = event.detail.section;
    CONFIG.targetColor = CONFIG.sectionColors[CONFIG.currentSection] || CONFIG.sectionColors['hero'];
});

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlobSystem);
} else {
    initBlobSystem();
}

// ==========================================
// CONTROL PANEL
// ==========================================
function initControlPanel() {
    const controlPanel = document.getElementById('blob-control-panel');
    const toggleBtn = document.getElementById('controls-toggle');
    const resetBtn = document.getElementById('controls-reset');

    if (!controlPanel || !toggleBtn || !resetBtn) return;

    // Store defaults
    const DEFAULT_CONFIG = {
        noiseAmplitude: 0.10,
        noiseFrequency: 0.003,
        idleMorphSpeed: 0.005,
        baseRadius: 200,
        brightnessMultiplier: 1.0,
        lineWidth: 1.0,
    };

    // Toggle panel open/closed
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        controlPanel.classList.toggle('open');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (controlPanel.classList.contains('open') && !controlPanel.contains(e.target)) {
            controlPanel.classList.remove('open');
        }
    });

    // Prevent clicks inside panel from closing it
    controlPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Update display value helper
    function updateValueDisplay(sliderId, value, suffix = '') {
        const display = document.getElementById(sliderId + '-value');
        if (display) {
            display.textContent = value + suffix;
        }
    }

    // Morph Speed slider
    const morphSlider = document.getElementById('morph-speed');
    if (morphSlider) {
        morphSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.idleMorphSpeed = value;
            CONFIG.morphSpeed = value * 0.6; // Keep proportion
            updateValueDisplay('morph-speed', value.toFixed(3));
            saveSettings();
        });
    }

    // Noise Amplitude slider
    const noiseAmpSlider = document.getElementById('noise-amplitude');
    if (noiseAmpSlider) {
        noiseAmpSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.noiseAmplitude = value;
            updateValueDisplay('noise-amplitude', value.toFixed(2));
            saveSettings();
        });
    }

    // Noise Frequency slider
    const noiseFreqSlider = document.getElementById('noise-frequency');
    if (noiseFreqSlider) {
        noiseFreqSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.noiseFrequency = value;
            updateValueDisplay('noise-frequency', value.toFixed(4));
            saveSettings();
        });
    }

    // Base Radius slider
    const radiusSlider = document.getElementById('base-radius');
    if (radiusSlider) {
        radiusSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            CONFIG.baseRadius = value;
            updateValueDisplay('base-radius', value, 'px');
            saveSettings();
        });
    }

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness');
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.brightnessMultiplier = value;
            updateValueDisplay('brightness', value.toFixed(2));
            saveSettings();
        });
    }

    // Line Width slider
    const lineWidthSlider = document.getElementById('line-width');
    if (lineWidthSlider) {
        lineWidthSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.lineWidth = value;
            updateValueDisplay('line-width', value.toFixed(1));
            saveSettings();
        });
    }

    // LocalStorage persistence
    function saveSettings() {
        const settings = {
            morphSpeed: CONFIG.idleMorphSpeed,
            noiseAmplitude: CONFIG.noiseAmplitude,
            noiseFrequency: CONFIG.noiseFrequency,
            baseRadius: CONFIG.baseRadius,
            brightnessMultiplier: CONFIG.brightnessMultiplier,
            lineWidth: CONFIG.lineWidth
        };
        localStorage.setItem('blobSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem('blobSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);

                if (settings.morphSpeed !== undefined) {
                    CONFIG.idleMorphSpeed = settings.morphSpeed;
                    CONFIG.morphSpeed = settings.morphSpeed * 0.6;
                    if (morphSlider) {
                        morphSlider.value = settings.morphSpeed;
                        updateValueDisplay('morph-speed', settings.morphSpeed.toFixed(3));
                    }
                }

                if (settings.noiseAmplitude !== undefined) {
                    CONFIG.noiseAmplitude = settings.noiseAmplitude;
                    if (noiseAmpSlider) {
                        noiseAmpSlider.value = settings.noiseAmplitude;
                        updateValueDisplay('noise-amplitude', settings.noiseAmplitude.toFixed(2));
                    }
                }

                if (settings.noiseFrequency !== undefined) {
                    CONFIG.noiseFrequency = settings.noiseFrequency;
                    if (noiseFreqSlider) {
                        noiseFreqSlider.value = settings.noiseFrequency;
                        updateValueDisplay('noise-frequency', settings.noiseFrequency.toFixed(4));
                    }
                }

                if (settings.baseRadius !== undefined) {
                    CONFIG.baseRadius = settings.baseRadius;
                    if (radiusSlider) {
                        radiusSlider.value = settings.baseRadius;
                        updateValueDisplay('base-radius', settings.baseRadius, 'px');
                    }
                }

                if (settings.brightnessMultiplier !== undefined) {
                    CONFIG.brightnessMultiplier = settings.brightnessMultiplier;
                    if (brightnessSlider) {
                        brightnessSlider.value = settings.brightnessMultiplier;
                        updateValueDisplay('brightness', settings.brightnessMultiplier.toFixed(2));
                    }
                }

                if (settings.lineWidth !== undefined) {
                    CONFIG.lineWidth = settings.lineWidth;
                    if (lineWidthSlider) {
                        lineWidthSlider.value = settings.lineWidth;
                        updateValueDisplay('line-width', settings.lineWidth.toFixed(1));
                    }
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    // Reset to defaults
    resetBtn.addEventListener('click', () => {
        CONFIG.noiseAmplitude = DEFAULT_CONFIG.noiseAmplitude;
        CONFIG.noiseFrequency = DEFAULT_CONFIG.noiseFrequency;
        CONFIG.idleMorphSpeed = DEFAULT_CONFIG.idleMorphSpeed;
        CONFIG.morphSpeed = DEFAULT_CONFIG.idleMorphSpeed * 0.6;
        CONFIG.baseRadius = DEFAULT_CONFIG.baseRadius;
        CONFIG.brightnessMultiplier = DEFAULT_CONFIG.brightnessMultiplier;
        CONFIG.lineWidth = DEFAULT_CONFIG.lineWidth;

        // Update all sliders
        if (morphSlider) {
            morphSlider.value = DEFAULT_CONFIG.idleMorphSpeed;
            updateValueDisplay('morph-speed', DEFAULT_CONFIG.idleMorphSpeed.toFixed(3));
        }

        if (noiseAmpSlider) {
            noiseAmpSlider.value = DEFAULT_CONFIG.noiseAmplitude;
            updateValueDisplay('noise-amplitude', DEFAULT_CONFIG.noiseAmplitude.toFixed(2));
        }

        if (noiseFreqSlider) {
            noiseFreqSlider.value = DEFAULT_CONFIG.noiseFrequency;
            updateValueDisplay('noise-frequency', DEFAULT_CONFIG.noiseFrequency.toFixed(4));
        }

        if (radiusSlider) {
            radiusSlider.value = DEFAULT_CONFIG.baseRadius;
            updateValueDisplay('base-radius', DEFAULT_CONFIG.baseRadius, 'px');
        }

        if (brightnessSlider) {
            brightnessSlider.value = DEFAULT_CONFIG.brightnessMultiplier;
            updateValueDisplay('brightness', DEFAULT_CONFIG.brightnessMultiplier.toFixed(2));
        }

        if (lineWidthSlider) {
            lineWidthSlider.value = DEFAULT_CONFIG.lineWidth;
            updateValueDisplay('line-width', DEFAULT_CONFIG.lineWidth.toFixed(1));
        }

        saveSettings();
    });

    // Load saved settings on page load
    loadSettings();
}

// Initialize control panel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControlPanel);
} else {
    initControlPanel();
}
