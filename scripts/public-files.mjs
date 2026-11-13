import fs from 'node:fs';
import path from 'node:path';

export function assertPublicPath(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') ||
        relativePath.startsWith('/') || path.posix.normalize(relativePath) !== relativePath ||
        relativePath.split('/').some(part => part.startsWith('.') ||
            /^(?:worker|scripts|docs|reference|input|node_modules|chads-bach)$/i.test(part) ||
            /(?:^|[-_.])(?:env|secret|secrets|credential|credentials|private|backup)(?:[-_.]|$)/i.test(part)) ||
        /(?:\.(?:pem|key|p12|pfx|sql|sqlite3?|db|bak|old|orig|swp|map|log|zip|tar|gz)|~)$/i.test(relativePath) ||
        /(?:^|\/)(?:AGENTS|CLAUDE|README)(?:\.|$)/i.test(relativePath)) {
        throw new Error(`Forbidden public file: ${String(relativePath)}`);
    }
}

export function sourceFile(source, relativePath) {
    assertPublicPath(relativePath);
    let current = source;
    const parts = relativePath.split('/');
    for (const [index, part] of parts.entries()) {
        current = path.join(current, part);
        let stat;
        try { stat = fs.lstatSync(current); }
        catch { throw new Error(`Missing public file: ${relativePath}`); }
        if (stat.isSymbolicLink()) throw new Error(`Symlink is not publishable: ${relativePath}`);
        if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`Invalid public directory: ${relativePath}`);
        if (index === parts.length - 1 && (!stat.isFile() || stat.nlink > 1)) {
            throw new Error(`Only ordinary files are publishable: ${relativePath}`);
        }
    }
    return current;
}
