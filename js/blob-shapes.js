// ==========================================
// BLOB SHAPE PRESET REGISTRY
// Loaded before animations.js — exposes window.BLOB_SHAPES
// ==========================================

/**
 * Interpolate a 3D profile (array of [t, rho, z] tuples).
 * Returns {rho, z} at the given t.
 */
function lerpProfile3(profile, t) {
    if (t <= profile[0][0]) return { rho: profile[0][1], z: profile[0][2] };
    if (t >= profile[profile.length - 1][0]) {
        const last = profile[profile.length - 1];
        return { rho: last[1], z: last[2] };
    }
    for (let i = 1; i < profile.length; i++) {
        if (t <= profile[i][0]) {
            const [t0, r0, z0] = profile[i - 1];
            const [t1, r1, z1] = profile[i];
            const frac = (t - t0) / (t1 - t0);
            return {
                rho: r0 + (r1 - r0) * frac,
                z: z0 + (z1 - z0) * frac
            };
        }
    }
    const last = profile[profile.length - 1];
    return { rho: last[1], z: last[2] };
}

window.BLOB_SHAPES = {
    defaultBlob: {
        id: 'defaultBlob',
        mode: 'defaultBlob',
        // Returns null to signal the existing noise pipeline should compute radius
        getRadius(theta, phi, time, config) {
            return null;
        },
        applicableControls: [
            'base-radius', 'noise-amplitude', 'noise-frequency',
            'morph-speed', 'perspective', 'brightness', 'line-width',
            'glow-intensity', 'hue-slider', 'star-count', 'star-twinkle',
            'star-size', 'star-brightness'
        ]
    },

    curlbroDumbbell: {
        id: 'curlbroDumbbell',
        mode: 'customSurface',

        // Meridian profile: [t, rho, axisPosition]
        // t = theta/PI (0..1 parameter along profile curve)
        // rho = cross-section radius, z = position along dumbbell axis
        // All values are multipliers of baseRadius.
        //
        // Flat ends: the first/last segments keep z constant while rho
        // expands from center to plate edge, creating flat disc caps
        // instead of pointed poles.
        profile: [
            // --- Left plate: flat outer face (z constant, rho expanding) ---
            [0.000, 0.00,  0.85],
            [0.055, 0.50,  0.85],

            // --- Left plate: outer cylinder rim ---
            [0.070, 0.50,  0.82],
            [0.130, 0.50,  0.55],

            // --- Left plate: inner face (contracting to collar) ---
            [0.145, 0.50,  0.52],
            [0.190, 0.12,  0.47],

            // --- Bar ---
            [0.235, 0.065, 0.34],
            [0.500, 0.065, 0.00],
            [0.765, 0.065, -0.34],

            // --- Right plate: inner face ---
            [0.810, 0.12,  -0.47],
            [0.855, 0.50,  -0.52],

            // --- Right plate: outer cylinder rim ---
            [0.870, 0.50,  -0.55],
            [0.930, 0.50,  -0.82],

            // --- Right plate: flat outer face (z constant, rho contracting) ---
            [0.945, 0.50,  -0.85],
            [1.000, 0.00,  -0.85]
        ],

        /**
         * Returns {x, y, z} world-space position for a dumbbell surface vertex.
         * Oriented along the x-axis (horizontal on screen).
         * phi rotates around the dumbbell axis.
         */
        getPosition(theta, phi, time, config) {
            const t = theta / Math.PI;
            const { rho, z: axisPos } = lerpProfile3(this.profile, t);
            const R = config.baseRadius;

            return {
                x: axisPos * R,
                y: rho * R * Math.sin(phi),
                z: rho * R * Math.cos(phi)
            };
        },

        applicableControls: [
            'base-radius', 'perspective', 'brightness',
            'line-width', 'glow-intensity', 'hue-slider', 'star-count',
            'star-twinkle', 'star-size', 'star-brightness'
        ]
    }
};
