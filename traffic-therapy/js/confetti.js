// confetti.js -- Win celebration: star-shaped particle system
(function () {
  'use strict';

  window.TT = window.TT || {};

  const COLORS = ['#FFD700', '#FFFFFF', '#5B7B9F', '#7B6B8F', '#E07B4F'];
  const PARTICLE_COUNT_MIN = 40;
  const PARTICLE_COUNT_MAX = 60;
  const DURATION_MS = 3000;
  const GRAVITY = 0.04;
  const MIN_SIZE = 6;
  const MAX_SIZE = 14;

  let canvas = null;
  let ctx = null;
  let particles = [];
  let animId = null;
  let startTime = 0;

  // Draw a 5-point star centered at (0, 0)
  function drawStar(context, outerRadius, innerRadius) {
    const points = 5;
    const step = Math.PI / points;
    context.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
  }

  function createParticle(w) {
    return {
      x: Math.random() * w,
      y: -(Math.random() * 60 + 10),
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      size: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1
    };
  }

  function update(elapsed) {
    const progress = Math.min(elapsed / DURATION_MS, 1);
    // Start fading particles after 60% of duration
    const fadeStart = 0.6;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      // Slight horizontal wobble
      p.vx += (Math.random() - 0.5) * 0.1;
      p.rotation += p.rotationSpeed;

      if (progress > fadeStart) {
        p.opacity = Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      const outerR = p.size / 2;
      const innerR = outerR * 0.4;
      drawStar(ctx, outerR, innerR);
      ctx.fill();

      ctx.restore();
    }
  }

  function loop(timestamp) {
    const elapsed = timestamp - startTime;

    if (elapsed >= DURATION_MS) {
      cleanup();
      return;
    }

    update(elapsed);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function cleanup() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
    particles = [];
  }

  function start() {
    // Clean up any existing confetti
    cleanup();

    canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');

    // Spawn particles
    const count = Math.floor(
      Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1)
    ) + PARTICLE_COUNT_MIN;
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(canvas.width));
    }

    startTime = performance.now();
    animId = requestAnimationFrame(loop);
  }

  TT.confetti = {
    start: start
  };
})();
