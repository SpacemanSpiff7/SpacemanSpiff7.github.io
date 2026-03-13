#!/usr/bin/env node
/**
 * Verify blob-shapes.js presets load correctly.
 *
 * Usage:
 *   node scripts/verify-blob-shapes.js
 *   node scripts/verify-blob-shapes.js --verbose
 */

const verbose = process.argv.includes('--verbose');
const window = {};

try {
    require('../js/blob-shapes.js');
} catch (e) {
    if (e instanceof SyntaxError) {
        console.error('FAIL: blob-shapes.js has a syntax error');
        console.error(e.message);
        process.exit(1);
    }
    // ReferenceError for 'window' means we need the shim above
    if (!(e instanceof ReferenceError)) throw e;
}

// Re-run with shim in scope
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'blob-shapes.js'), 'utf8');
const ctx = vm.createContext({ window, Math, console });
try {
    vm.runInContext(code, ctx);
} catch (e) {
    console.error('FAIL: blob-shapes.js threw during execution');
    console.error(e.message);
    process.exit(1);
}

const shapes = ctx.window.BLOB_SHAPES;
if (!shapes) {
    console.error('FAIL: window.BLOB_SHAPES not defined');
    process.exit(1);
}

const keys = Object.keys(shapes);
console.log(`${keys.length} presets loaded: ${keys.join(', ')}`);

let failures = 0;
for (const key of keys) {
    const preset = shapes[key];
    const issues = [];

    if (!preset.id) issues.push('missing id');
    if (!preset.label) issues.push('missing label');
    if (!preset.mode) issues.push('missing mode');
    if (!preset.applicableControls) issues.push('missing applicableControls');

    if (preset.mode === 'arbitraryMesh') {
        if (typeof preset.buildMesh !== 'function') {
            issues.push('missing buildMesh()');
        } else {
            const mesh = preset.buildMesh();
            if (!mesh || !mesh.vertices || !mesh.edges) {
                issues.push('buildMesh() returned invalid data');
            } else if (verbose) {
                console.log(`  ${key}: ${mesh.vertices.length} verts, ${mesh.edges.length} edges`);
            }
        }
    } else if (verbose) {
        console.log(`  ${key}: mode=${preset.mode}`);
    }

    if (issues.length > 0) {
        console.error(`  FAIL ${key}: ${issues.join(', ')}`);
        failures++;
    }
}

if (failures > 0) {
    console.error(`\n${failures} preset(s) failed validation`);
    process.exit(1);
}
console.log('All presets OK');
