// ==========================================
// 3D MORPHING BLOB ANIMATION SYSTEM
// Simplified: Always morphs, rotates on scroll
// ==========================================

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    // Blob parameters
    gridResolution: { lat: 60, lon: 60 },
    gridResolutionMobile: { lat: 40, lon: 40 },
    noiseAmplitude: 0.10,  // Subtle morphing
    noiseFrequency: 0.003,
    morphSpeed: 0.003,     // Base morph speed when scrolling
    idleMorphSpeed: 0.005, // Faster morph speed when idle
    idleThreshold: 0.001,  // Velocity below this = idle
    baseRadius: 200,
    brightnessMultiplier: 1.0,
    lineWidth: 1.0,
    perspective: 600,
    glowMaxOpacity: 0.15,
    hueOverride: null,    // null = section-controlled, 0-360 = user hue
    rainbowMode: false,
    rainbowHue: 0,
    starTwinkleSpeed: 1.0,  // multiplier on per-star twinkleSpeed
    starMaxRadius: 2.0,     // max star radius in px
    starBrightness: 1.0,    // multiplier on per-star opacity

    // Color themes per section (dark enough to not interfere with text)
    sectionColors: {
        'hero': '#5A0080',           // Dark purple
        'featured-1': '#7A0A45',     // Dark pink
        'featured-2': '#005A5E',     // Dark turquoise
        'featured-3': '#6B2820',     // Dark tomato
        'featured-4': '#3E2C5A',     // Dark purple
        'about': '#006640',          // Dark green
        'contact': '#6B5A00',        // Dark gold
        'projects-grid': '#6B1F00',  // Dark orange
        'blob-showcase': '#FFFF33'   // Highlighter yellow
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
const dpr = window.devicePixelRatio || 1;

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

function hslToHex(h, s, l) {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function getMorphSpeedLabel(value) {
    const pct = value / 0.02;
    if (pct <= 0.25) return 'Slow';
    if (pct <= 0.75) return 'Medium';
    return 'Fast';
}

function getNoiseDetailLabel(value) {
    const pct = (value - 0.001) / (0.01 - 0.001);
    if (pct <= 0.33) return 'Smooth';
    if (pct <= 0.66) return 'Textured';
    return 'Chaotic';
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

function regenerateStars(count) {
    stars.length = 0;
    const maxR = CONFIG.starMaxRadius;
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * (maxR - 0.3) + 0.3,
            opacity: Math.random() * 0.5 + 0.5,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            twinklePhase: Math.random() * Math.PI * 2,
        });
    }
}

function initStarfield() {
    starfieldCanvas = document.getElementById('starfield');
    if (!starfieldCanvas) return;

    starfieldCtx = starfieldCanvas.getContext('2d');

    function resizeStarfield() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        starfieldCanvas.width = w * dpr;
        starfieldCanvas.height = h * dpr;
        starfieldCanvas.style.width = w + 'px';
        starfieldCanvas.style.height = h + 'px';
        starfieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeStarfield();
    window.addEventListener('resize', resizeStarfield);

    regenerateStars(CONFIG.starCount);
}

function renderStarfield(time) {
    if (!starfieldCtx) return;

    starfieldCtx.fillStyle = '#000000';
    starfieldCtx.fillRect(0, 0, starfieldCanvas.width / dpr, starfieldCanvas.height / dpr);

    stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed * CONFIG.starTwinkleSpeed + star.twinklePhase);
        const opacity = (star.opacity + twinkle * 0.3) * CONFIG.starBrightness;

        starfieldCtx.beginPath();
        starfieldCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        starfieldCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, opacity))})`;
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

        blobCanvas.width = w * dpr;
        blobCanvas.height = h * dpr;
        blobCanvas.style.width = w + 'px';
        blobCanvas.style.height = h + 'px';
        blobCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    const perspective = CONFIG.perspective;
    const scale = perspective / (perspective + z);
    return {
        x: (blobCanvas.width / dpr) / 2 + x * scale,
        y: (blobCanvas.height / dpr) / 2 + y * scale,
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
    blobCtx.clearRect(0, 0, blobCanvas.width / dpr, blobCanvas.height / dpr);

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

    // Color logic: rainbow > hue override > section color
    let blobColor;
    const isRainbow = CONFIG.rainbowMode;
    if (!isRainbow) {
        if (CONFIG.hueOverride !== null) {
            blobColor = adjustBrightness(hslToHex(CONFIG.hueOverride / 360, 1, 0.3), CONFIG.brightnessMultiplier);
        } else {
            if (CONFIG.displayColor !== CONFIG.targetColor) {
                CONFIG.displayColor = lerpColor(CONFIG.displayColor, CONFIG.targetColor, CONFIG.colorTransitionSpeed);
            }
            blobColor = adjustBrightness(CONFIG.displayColor, CONFIG.brightnessMultiplier);
        }
    }

    // Draw 3D shading glow behind wireframe
    const centerX = (blobCanvas.width / dpr) / 2;
    const centerY = (blobCanvas.height / dpr) / 2;
    const glowRadius = currentRadius * 1.5;

    if (isRainbow) {
        // Multi-colored rotating glow blobs — neon party sign look
        const neonColors = [
            [255, 30, 80],   // hot pink
            [0, 255, 140],   // neon green
            [80, 40, 255],   // electric purple
            [255, 220, 0],   // neon yellow
            [0, 180, 255],   // cyan
            [255, 100, 0],   // neon orange
        ];
        const glowR = glowRadius * 1.3;
        neonColors.forEach((c, i) => {
            const phase = time * 2.5 + i * Math.PI * 2 / neonColors.length;
            const ox = Math.sin(phase) * currentRadius * 0.4;
            const oy = Math.cos(phase) * currentRadius * 0.4;
            const pulse = (Math.sin(time * 6 + i * 1.7) + 1) / 2;
            const intensity = 0.25 + pulse * 0.35;
            const g = blobCtx.createRadialGradient(centerX + ox, centerY + oy, 0, centerX, centerY, glowR);
            g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${intensity})`);
            g.addColorStop(0.4, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${intensity * 0.4})`);
            g.addColorStop(1, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0)`);
            blobCtx.fillStyle = g;
            blobCtx.beginPath();
            blobCtx.arc(centerX, centerY, glowR, 0, Math.PI * 2);
            blobCtx.fill();
        });
    } else {
        const gradient = blobCtx.createRadialGradient(
            centerX - currentRadius * 0.3,
            centerY - currentRadius * 0.3,
            0,
            centerX,
            centerY,
            glowRadius
        );
        const rgb = hexToRgb(blobColor);
        if (rgb) {
            const glowOpacity = CONFIG.glowMaxOpacity;
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowOpacity})`);
            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowOpacity * 0.33})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            blobCtx.fillStyle = gradient;
            blobCtx.beginPath();
            blobCtx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
            blobCtx.fill();
        }
    }

    // Draw wireframe
    blobCtx.lineJoin = 'round';
    blobCtx.lineCap = 'round';

    if (isRainbow) {
        // Per-line rainbow: each lat/lon line gets its own hue, two-pass for neon glow
        // Pass 1: thick transparent lines (glow halo)
        // Pass 2: crisp bright lines on top

        function drawRainbowWireframe(lineWidthMult, opacityMult) {
            blobCtx.lineWidth = CONFIG.lineWidth * lineWidthMult;

            // Latitude lines
            for (let lat = 0; lat <= gridRes.lat; lat++) {
                const hue = (lat / gridRes.lat * 360 + time * 200) % 360;
                const pulse = (Math.sin(time * 10 + lat * 0.7) + 1) / 2;
                const l = 0.45 + pulse * 0.25;
                const color = hslToRgb(hue / 360, 1, l);

                blobCtx.beginPath();
                blobCtx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacityMult})`;

                for (let lon = 0; lon <= gridRes.lon; lon++) {
                    const index = lat * (gridRes.lon + 1) + lon;
                    const vertex = vertices[index];

                    if (lon === 0) {
                        blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
                    } else if (lon === 1) {
                        const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                        blobCtx.lineTo((prev.projected.x + vertex.projected.x) / 2, (prev.projected.y + vertex.projected.y) / 2);
                    } else if (lon === gridRes.lon) {
                        const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                        blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, vertex.projected.x, vertex.projected.y);
                    } else {
                        const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                        blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, (prev.projected.x + vertex.projected.x) / 2, (prev.projected.y + vertex.projected.y) / 2);
                    }
                }
                blobCtx.stroke();
            }

            // Longitude lines
            for (let lon = 0; lon <= gridRes.lon; lon++) {
                const hue = (lon / gridRes.lon * 360 + time * 200 + 180) % 360;
                const pulse = (Math.sin(time * 10 + lon * 0.9 + 2) + 1) / 2;
                const l = 0.45 + pulse * 0.25;
                const color = hslToRgb(hue / 360, 1, l);

                blobCtx.beginPath();
                blobCtx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacityMult})`;

                for (let lat = 0; lat <= gridRes.lat; lat++) {
                    const index = lat * (gridRes.lon + 1) + lon;
                    const vertex = vertices[index];

                    if (lat === 0) {
                        blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
                    } else if (lat === 1) {
                        const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                        blobCtx.lineTo((prev.projected.x + vertex.projected.x) / 2, (prev.projected.y + vertex.projected.y) / 2);
                    } else if (lat === gridRes.lat) {
                        const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                        blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, vertex.projected.x, vertex.projected.y);
                    } else {
                        const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                        blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, (prev.projected.x + vertex.projected.x) / 2, (prev.projected.y + vertex.projected.y) / 2);
                    }
                }
                blobCtx.stroke();
            }
        }

        // Glow pass — thick, semi-transparent
        drawRainbowWireframe(5, 0.25);
        // Crisp pass — normal width, bright
        drawRainbowWireframe(1.5, 0.95);
    } else {
        // Normal single-color wireframe
        blobCtx.lineWidth = CONFIG.lineWidth;

        // Draw latitude lines
        for (let lat = 0; lat <= gridRes.lat; lat++) {
            blobCtx.beginPath();
            for (let lon = 0; lon <= gridRes.lon; lon++) {
                const index = lat * (gridRes.lon + 1) + lon;
                const vertex = vertices[index];

                const depthFade = (vertex.z / currentRadius + 1) / 2;
                const lighting = vertex.lighting;

                const baseOpacity = 0.15;
                const lightBoost = lighting * 0.7;
                const depthBoost = depthFade * 0.4;
                const opacity = baseOpacity + lightBoost + depthBoost;

                blobCtx.strokeStyle = blobColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');

                if (lon === 0) {
                    blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
                } else if (lon === 1) {
                    const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                    const midX = (prev.projected.x + vertex.projected.x) / 2;
                    const midY = (prev.projected.y + vertex.projected.y) / 2;
                    blobCtx.lineTo(midX, midY);
                } else if (lon === gridRes.lon) {
                    const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                    blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, vertex.projected.x, vertex.projected.y);
                } else {
                    const prev = vertices[lat * (gridRes.lon + 1) + (lon - 1)];
                    const midX = (prev.projected.x + vertex.projected.x) / 2;
                    const midY = (prev.projected.y + vertex.projected.y) / 2;
                    blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, midX, midY);
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

                const baseOpacity = 0.15;
                const lightBoost = lighting * 0.7;
                const depthBoost = depthFade * 0.4;
                const opacity = baseOpacity + lightBoost + depthBoost;

                blobCtx.strokeStyle = blobColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');

                if (lat === 0) {
                    blobCtx.moveTo(vertex.projected.x, vertex.projected.y);
                } else if (lat === 1) {
                    const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                    const midX = (prev.projected.x + vertex.projected.x) / 2;
                    const midY = (prev.projected.y + vertex.projected.y) / 2;
                    blobCtx.lineTo(midX, midY);
                } else if (lat === gridRes.lat) {
                    const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                    blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, vertex.projected.x, vertex.projected.y);
                } else {
                    const prev = vertices[(lat - 1) * (gridRes.lon + 1) + lon];
                    const midX = (prev.projected.x + vertex.projected.x) / 2;
                    const midY = (prev.projected.y + vertex.projected.y) / 2;
                    blobCtx.quadraticCurveTo(prev.projected.x, prev.projected.y, midX, midY);
                }
            }
            blobCtx.stroke();
        }
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
    if (CONFIG.hueOverride === null && !CONFIG.rainbowMode) {
        CONFIG.targetColor = CONFIG.sectionColors[CONFIG.currentSection] || CONFIG.sectionColors['hero'];
    }
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

    const DEFAULT_CONFIG = {
        noiseAmplitude: 0.10,
        noiseFrequency: 0.003,
        idleMorphSpeed: 0.005,
        baseRadius: 200,
        brightnessMultiplier: 1.0,
        lineWidth: 1.0,
        perspective: 600,
        glowMaxOpacity: 0.15,
        hueOverride: null,
        starCount: 250,
        starTwinkleSpeed: 1.0,
        starMaxRadius: 2.0,
        starBrightness: 1.0,
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

    controlPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Section collapse
    document.querySelectorAll('.controls-section-header').forEach(header => {
        header.addEventListener('click', () => header.parentElement.classList.toggle('collapsed'));
    });
    if (isMobile) {
        document.querySelectorAll('.controls-section').forEach(s => s.classList.add('collapsed'));
    }

    // Update display value helper
    function updateValueDisplay(sliderId, value, suffix = '') {
        const display = document.getElementById(sliderId + '-value');
        if (display) {
            display.textContent = value + suffix;
        }
    }

    // Slider references
    const sliders = {
        morphSpeed: document.getElementById('morph-speed'),
        noiseAmplitude: document.getElementById('noise-amplitude'),
        noiseFrequency: document.getElementById('noise-frequency'),
        baseRadius: document.getElementById('base-radius'),
        perspective: document.getElementById('perspective'),
        hueSlider: document.getElementById('hue-slider'),
        brightness: document.getElementById('brightness'),
        lineWidth: document.getElementById('line-width'),
        glowIntensity: document.getElementById('glow-intensity'),
        starCount: document.getElementById('star-count'),
        starTwinkle: document.getElementById('star-twinkle'),
        starSize: document.getElementById('star-size'),
        starBrightness: document.getElementById('star-brightness'),
    };

    // --- Shape section ---
    if (sliders.baseRadius) {
        sliders.baseRadius.addEventListener('input', (e) => {
            CONFIG.baseRadius = parseInt(e.target.value);
            updateValueDisplay('base-radius', CONFIG.baseRadius, 'px');
            saveSettings();
        });
    }

    if (sliders.noiseAmplitude) {
        sliders.noiseAmplitude.addEventListener('input', (e) => {
            CONFIG.noiseAmplitude = parseFloat(e.target.value);
            updateValueDisplay('noise-amplitude', CONFIG.noiseAmplitude.toFixed(2));
            saveSettings();
        });
    }

    if (sliders.noiseFrequency) {
        sliders.noiseFrequency.addEventListener('input', (e) => {
            CONFIG.noiseFrequency = parseFloat(e.target.value);
            updateValueDisplay('noise-frequency', getNoiseDetailLabel(CONFIG.noiseFrequency));
            saveSettings();
        });
    }

    if (sliders.morphSpeed) {
        sliders.morphSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.idleMorphSpeed = value;
            CONFIG.morphSpeed = value * 0.6;
            updateValueDisplay('morph-speed', getMorphSpeedLabel(value));
            saveSettings();
        });
    }

    if (sliders.perspective) {
        sliders.perspective.addEventListener('input', (e) => {
            CONFIG.perspective = parseInt(e.target.value);
            updateValueDisplay('perspective', CONFIG.perspective);
            saveSettings();
        });
    }

    // --- Style section ---
    if (sliders.brightness) {
        sliders.brightness.addEventListener('input', (e) => {
            CONFIG.brightnessMultiplier = parseFloat(e.target.value);
            updateValueDisplay('brightness', CONFIG.brightnessMultiplier.toFixed(2));
            saveSettings();
        });
    }

    if (sliders.lineWidth) {
        sliders.lineWidth.addEventListener('input', (e) => {
            CONFIG.lineWidth = parseFloat(e.target.value);
            updateValueDisplay('line-width', CONFIG.lineWidth.toFixed(1));
            saveSettings();
        });
    }

    if (sliders.glowIntensity) {
        sliders.glowIntensity.addEventListener('input', (e) => {
            CONFIG.glowMaxOpacity = parseFloat(e.target.value);
            updateValueDisplay('glow-intensity', CONFIG.glowMaxOpacity.toFixed(2));
            saveSettings();
        });
    }

    // --- Hue slider + rainbow cloud easter egg ---
    const hueSlider = sliders.hueSlider;
    const easterEggIcon = document.getElementById('easter-egg-icon');
    const hueClear = document.getElementById('hue-clear');

    let eggFillTimer = null;
    let eggActivated = false;

    function updateEasterEggPosition() {
        if (!hueSlider || !easterEggIcon) return;
        const rect = hueSlider.getBoundingClientRect();
        const thumbWidth = 16;
        const pct = (hueSlider.value - hueSlider.min) / (hueSlider.max - hueSlider.min);
        const trackWidth = rect.width - thumbWidth;
        const left = thumbWidth / 2 + pct * trackWidth;
        easterEggIcon.style.left = left + 'px';
    }

    function startEggFill() {
        if (eggActivated || eggFillTimer) return;
        if (easterEggIcon) easterEggIcon.classList.add('is-filling');
        eggFillTimer = setTimeout(() => {
            // Timer completed — activate permanently
            eggActivated = true;
            eggFillTimer = null;
            if (easterEggIcon) {
                easterEggIcon.classList.remove('is-filling');
                easterEggIcon.classList.add('is-activated');
            }
            activateGlobalRainbowMode();
        }, 1600);
    }

    function cancelEggFill() {
        if (eggActivated) return; // Already won, no cancellation
        if (eggFillTimer) { clearTimeout(eggFillTimer); eggFillTimer = null; }
        if (easterEggIcon) easterEggIcon.classList.remove('is-filling');
    }

    function activateGlobalRainbowMode() {
        CONFIG.rainbowMode = true;
        CONFIG.hueOverride = null;
        controlPanel.classList.add('rainbow-active');
        updateValueDisplay('hue-slider', 'Rainbow');
        if (hueClear) hueClear.classList.remove('hidden');
    }

    function deactivateRainbow() {
        CONFIG.rainbowMode = false;
        eggActivated = false;
        cancelEggFill();
        if (easterEggIcon) easterEggIcon.classList.remove('is-filling', 'is-activated');
        controlPanel.classList.remove('rainbow-active');
    }

    if (hueSlider) {
        hueSlider.addEventListener('input', (e) => {
            updateEasterEggPosition();
            const val = parseInt(e.target.value);

            if (eggActivated) {
                // Dragging away from max deactivates rainbow
                if (val < parseInt(hueSlider.max)) {
                    deactivateRainbow();
                    CONFIG.hueOverride = val;
                    updateValueDisplay('hue-slider', val + ' deg');
                    if (hueClear) hueClear.classList.remove('hidden');
                    saveSettings();
                }
                return;
            }

            if (val === parseInt(hueSlider.max)) {
                startEggFill();
            } else {
                cancelEggFill();
                CONFIG.hueOverride = val;
                updateValueDisplay('hue-slider', val + ' deg');
                if (hueClear) hueClear.classList.remove('hidden');
            }
            saveSettings();
        });

        // Handle click directly on max — pointerdown starts fill if already at max
        hueSlider.addEventListener('pointerdown', () => {
            if (eggActivated) return;
            if (parseInt(hueSlider.value) === parseInt(hueSlider.max)) {
                startEggFill();
            }
        });

        // Cancel on release if not yet activated
        const cancelEvents = ['pointerup', 'pointercancel', 'pointerleave'];
        cancelEvents.forEach(evt => {
            hueSlider.addEventListener(evt, () => {
                cancelEggFill();
            });
        });
    }

    function clearHueOverride() {
        deactivateRainbow();
        CONFIG.hueOverride = null;
        CONFIG.targetColor = CONFIG.sectionColors[CONFIG.currentSection] || CONFIG.sectionColors['hero'];
        updateValueDisplay('hue-slider', 'Auto');
        if (hueClear) hueClear.classList.add('hidden');
        saveSettings();
    }

    if (easterEggIcon) {
        easterEggIcon.addEventListener('click', () => {
            if (!eggActivated) return;
            clearHueOverride();
        });
    }

    if (hueClear) {
        hueClear.addEventListener('click', clearHueOverride);
    }

    // --- Stars section ---
    if (sliders.starCount) {
        sliders.starCount.addEventListener('input', (e) => {
            updateValueDisplay('star-count', parseInt(e.target.value));
        });
        sliders.starCount.addEventListener('change', (e) => {
            CONFIG.starCount = parseInt(e.target.value);
            regenerateStars(CONFIG.starCount);
            saveSettings();
        });
    }

    if (sliders.starTwinkle) {
        sliders.starTwinkle.addEventListener('input', (e) => {
            CONFIG.starTwinkleSpeed = parseFloat(e.target.value);
            updateValueDisplay('star-twinkle', CONFIG.starTwinkleSpeed.toFixed(1));
            saveSettings();
        });
    }

    if (sliders.starSize) {
        sliders.starSize.addEventListener('input', (e) => {
            updateValueDisplay('star-size', parseFloat(e.target.value).toFixed(1));
        });
        sliders.starSize.addEventListener('change', (e) => {
            CONFIG.starMaxRadius = parseFloat(e.target.value);
            regenerateStars(CONFIG.starCount);
            saveSettings();
        });
    }

    if (sliders.starBrightness) {
        sliders.starBrightness.addEventListener('input', (e) => {
            CONFIG.starBrightness = parseFloat(e.target.value);
            updateValueDisplay('star-brightness', CONFIG.starBrightness.toFixed(1));
            saveSettings();
        });
    }

    // --- LocalStorage persistence ---
    function saveSettings() {
        const settings = {
            morphSpeed: CONFIG.idleMorphSpeed,
            noiseAmplitude: CONFIG.noiseAmplitude,
            noiseFrequency: CONFIG.noiseFrequency,
            baseRadius: CONFIG.baseRadius,
            brightnessMultiplier: CONFIG.brightnessMultiplier,
            lineWidth: CONFIG.lineWidth,
            perspective: CONFIG.perspective,
            glowMaxOpacity: CONFIG.glowMaxOpacity,
            hueOverride: CONFIG.hueOverride,
            starCount: CONFIG.starCount,
            starTwinkleSpeed: CONFIG.starTwinkleSpeed,
            starMaxRadius: CONFIG.starMaxRadius,
            starBrightness: CONFIG.starBrightness,
        };
        localStorage.setItem('blobSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const saved = localStorage.getItem('blobSettings');
        if (!saved) return;
        try {
            const s = JSON.parse(saved);

            if (s.morphSpeed !== undefined) {
                CONFIG.idleMorphSpeed = s.morphSpeed;
                CONFIG.morphSpeed = s.morphSpeed * 0.6;
                if (sliders.morphSpeed) {
                    sliders.morphSpeed.value = s.morphSpeed;
                    updateValueDisplay('morph-speed', getMorphSpeedLabel(s.morphSpeed));
                }
            }
            if (s.noiseAmplitude !== undefined) {
                CONFIG.noiseAmplitude = s.noiseAmplitude;
                if (sliders.noiseAmplitude) {
                    sliders.noiseAmplitude.value = s.noiseAmplitude;
                    updateValueDisplay('noise-amplitude', s.noiseAmplitude.toFixed(2));
                }
            }
            if (s.noiseFrequency !== undefined) {
                CONFIG.noiseFrequency = s.noiseFrequency;
                if (sliders.noiseFrequency) {
                    sliders.noiseFrequency.value = s.noiseFrequency;
                    updateValueDisplay('noise-frequency', getNoiseDetailLabel(s.noiseFrequency));
                }
            }
            if (s.baseRadius !== undefined) {
                CONFIG.baseRadius = s.baseRadius;
                if (sliders.baseRadius) {
                    sliders.baseRadius.value = s.baseRadius;
                    updateValueDisplay('base-radius', s.baseRadius, 'px');
                }
            }
            if (s.brightnessMultiplier !== undefined) {
                CONFIG.brightnessMultiplier = s.brightnessMultiplier;
                if (sliders.brightness) {
                    sliders.brightness.value = s.brightnessMultiplier;
                    updateValueDisplay('brightness', s.brightnessMultiplier.toFixed(2));
                }
            }
            if (s.lineWidth !== undefined) {
                CONFIG.lineWidth = s.lineWidth;
                if (sliders.lineWidth) {
                    sliders.lineWidth.value = s.lineWidth;
                    updateValueDisplay('line-width', s.lineWidth.toFixed(1));
                }
            }
            if (s.perspective !== undefined) {
                CONFIG.perspective = s.perspective;
                if (sliders.perspective) {
                    sliders.perspective.value = s.perspective;
                    updateValueDisplay('perspective', s.perspective);
                }
            }
            if (s.glowMaxOpacity !== undefined) {
                CONFIG.glowMaxOpacity = s.glowMaxOpacity;
                if (sliders.glowIntensity) {
                    sliders.glowIntensity.value = s.glowMaxOpacity;
                    updateValueDisplay('glow-intensity', s.glowMaxOpacity.toFixed(2));
                }
            }
            if (s.hueOverride !== undefined && s.hueOverride !== null) {
                CONFIG.hueOverride = s.hueOverride;
                if (hueSlider) hueSlider.value = s.hueOverride;
                updateValueDisplay('hue-slider', s.hueOverride + ' deg');
                if (hueClear) hueClear.classList.remove('hidden');
                updateEasterEggPosition();
            }
            if (s.starCount !== undefined) {
                CONFIG.starCount = s.starCount;
                if (sliders.starCount) {
                    sliders.starCount.value = s.starCount;
                    updateValueDisplay('star-count', s.starCount);
                }
            }
            if (s.starTwinkleSpeed !== undefined) {
                CONFIG.starTwinkleSpeed = s.starTwinkleSpeed;
                if (sliders.starTwinkle) {
                    sliders.starTwinkle.value = s.starTwinkleSpeed;
                    updateValueDisplay('star-twinkle', s.starTwinkleSpeed.toFixed(1));
                }
            }
            if (s.starMaxRadius !== undefined) {
                CONFIG.starMaxRadius = s.starMaxRadius;
                if (sliders.starSize) {
                    sliders.starSize.value = s.starMaxRadius;
                    updateValueDisplay('star-size', s.starMaxRadius.toFixed(1));
                }
            }
            if (s.starBrightness !== undefined) {
                CONFIG.starBrightness = s.starBrightness;
                if (sliders.starBrightness) {
                    sliders.starBrightness.value = s.starBrightness;
                    updateValueDisplay('star-brightness', s.starBrightness.toFixed(1));
                }
            }
            // Regenerate stars with loaded settings
            if (s.starCount !== undefined || s.starMaxRadius !== undefined) {
                regenerateStars(CONFIG.starCount);
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    // Reset to defaults
    resetBtn.addEventListener('click', () => {
        // Deactivate rainbow
        deactivateRainbow();

        // Reset all CONFIG
        CONFIG.noiseAmplitude = DEFAULT_CONFIG.noiseAmplitude;
        CONFIG.noiseFrequency = DEFAULT_CONFIG.noiseFrequency;
        CONFIG.idleMorphSpeed = DEFAULT_CONFIG.idleMorphSpeed;
        CONFIG.morphSpeed = DEFAULT_CONFIG.idleMorphSpeed * 0.6;
        CONFIG.baseRadius = DEFAULT_CONFIG.baseRadius;
        CONFIG.brightnessMultiplier = DEFAULT_CONFIG.brightnessMultiplier;
        CONFIG.lineWidth = DEFAULT_CONFIG.lineWidth;
        CONFIG.perspective = DEFAULT_CONFIG.perspective;
        CONFIG.glowMaxOpacity = DEFAULT_CONFIG.glowMaxOpacity;
        CONFIG.hueOverride = null;
        CONFIG.starCount = DEFAULT_CONFIG.starCount;
        CONFIG.starTwinkleSpeed = DEFAULT_CONFIG.starTwinkleSpeed;
        CONFIG.starMaxRadius = DEFAULT_CONFIG.starMaxRadius;
        CONFIG.starBrightness = DEFAULT_CONFIG.starBrightness;

        // Re-sync section color
        CONFIG.targetColor = CONFIG.sectionColors[CONFIG.currentSection] || CONFIG.sectionColors['hero'];

        // Update all sliders + displays
        if (sliders.morphSpeed) { sliders.morphSpeed.value = DEFAULT_CONFIG.idleMorphSpeed; updateValueDisplay('morph-speed', getMorphSpeedLabel(DEFAULT_CONFIG.idleMorphSpeed)); }
        if (sliders.noiseAmplitude) { sliders.noiseAmplitude.value = DEFAULT_CONFIG.noiseAmplitude; updateValueDisplay('noise-amplitude', DEFAULT_CONFIG.noiseAmplitude.toFixed(2)); }
        if (sliders.noiseFrequency) { sliders.noiseFrequency.value = DEFAULT_CONFIG.noiseFrequency; updateValueDisplay('noise-frequency', getNoiseDetailLabel(DEFAULT_CONFIG.noiseFrequency)); }
        if (sliders.baseRadius) { sliders.baseRadius.value = DEFAULT_CONFIG.baseRadius; updateValueDisplay('base-radius', DEFAULT_CONFIG.baseRadius, 'px'); }
        if (sliders.perspective) { sliders.perspective.value = DEFAULT_CONFIG.perspective; updateValueDisplay('perspective', DEFAULT_CONFIG.perspective); }
        if (sliders.brightness) { sliders.brightness.value = DEFAULT_CONFIG.brightnessMultiplier; updateValueDisplay('brightness', DEFAULT_CONFIG.brightnessMultiplier.toFixed(2)); }
        if (sliders.lineWidth) { sliders.lineWidth.value = DEFAULT_CONFIG.lineWidth; updateValueDisplay('line-width', DEFAULT_CONFIG.lineWidth.toFixed(1)); }
        if (sliders.glowIntensity) { sliders.glowIntensity.value = DEFAULT_CONFIG.glowMaxOpacity; updateValueDisplay('glow-intensity', DEFAULT_CONFIG.glowMaxOpacity.toFixed(2)); }
        if (hueSlider) { hueSlider.value = 0; updateValueDisplay('hue-slider', 'Auto'); updateEasterEggPosition(); }
        if (hueClear) hueClear.classList.add('hidden');
        if (sliders.starCount) { sliders.starCount.value = DEFAULT_CONFIG.starCount; updateValueDisplay('star-count', DEFAULT_CONFIG.starCount); }
        if (sliders.starTwinkle) { sliders.starTwinkle.value = DEFAULT_CONFIG.starTwinkleSpeed; updateValueDisplay('star-twinkle', DEFAULT_CONFIG.starTwinkleSpeed.toFixed(1)); }
        if (sliders.starSize) { sliders.starSize.value = DEFAULT_CONFIG.starMaxRadius; updateValueDisplay('star-size', DEFAULT_CONFIG.starMaxRadius.toFixed(1)); }
        if (sliders.starBrightness) { sliders.starBrightness.value = DEFAULT_CONFIG.starBrightness; updateValueDisplay('star-brightness', DEFAULT_CONFIG.starBrightness.toFixed(1)); }

        regenerateStars(DEFAULT_CONFIG.starCount);
        saveSettings();
    });

    loadSettings();
    updateEasterEggPosition();
}

// Initialize control panel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControlPanel);
} else {
    initControlPanel();
}
