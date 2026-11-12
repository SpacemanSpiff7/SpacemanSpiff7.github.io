// Pure sampling of the homepage section-to-section morph.
// Anchors use scroll-container coordinates; no timers or direction history.
window.BLOB_MOTION = {
    sample(anchors, scrollTop) {
        if (!anchors.length) return null;
        let index = 0;
        while (index < anchors.length - 1 && scrollTop >= anchors[index + 1].at) index++;
        const from = anchors[index];
        const to = anchors[Math.min(index + 1, anchors.length - 1)];
        const distance = to.at - from.at;
        const fraction = distance > 0 ? (scrollTop - from.at) / distance : 0;
        // Hold the silhouette near each anchor, then ease through a full morph.
        const t = Math.max(0, Math.min(1, (fraction - 0.18) / 0.64));
        return {from, to, fraction: Math.max(0, Math.min(1, fraction)), mix: t * t * (3 - 2 * t)};
    }
};
