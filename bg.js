/* ════════════════════════════════════════════════
   ADITYA SONI — BACKGROUND CANVAS ENGINE
   Blueprint / Engineering Schematic aesthetic.

   Layers (back to front):
   1. Deep base fill
   2. Fine grid (horizontal + vertical hairlines)
   3. Flowing bezier streams — slow, organic drift
   4. Technical arc annotations (compass arcs)
   5. Coordinate / tick labels in monospace
   6. Per-page radial focus glow
   7. Vignette edge fade

   All drawn on a single <canvas id="bg-canvas">
   and re-rendered every animation frame.
════════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Palette (matches CSS tokens) ─────────────── */
  const C = {
    bg:      '#000000a8',
    gold:    'rgba(201,168,76,',   // + alpha + ')'
    white:   'rgba(255,255,255,',
    dim:     'rgba(106,101,112,',
  };
  const gold  = (a) => C.gold  + a + ')';
  const white = (a) => C.white + a + ')';
  const dim   = (a) => C.dim   + a + ')';

  /* ── State ─────────────────────────────────────── */
  let W = 0, H = 0, dpr = 1;
  let currentPage = 0;   // 0–6, updated from outside
  let targetPage  = 0;
  let pageLerp    = 0;   // 0→1 transition progress
  let raf;

  /* ── Grid config ───────────────────────────────── */
  const GRID_STEP = 72;  // px logical

  /* ── Bezier stream particles ───────────────────── */
  const STREAM_COUNT = 6;
  const streams = [];

  function makeStream(i) {
    const seed = i / STREAM_COUNT;
    return {
      // control points drift slowly
      p0: { x: seed * W * 1.2 - W * 0.1,  y: H * (0.1 + seed * 0.7) },
      p1: { x: W * (0.2 + seed * 0.4),     y: H * (0.3 + (1 - seed) * 0.4) },
      p2: { x: W * (0.5 + seed * 0.3),     y: H * (0.6 + seed * 0.2) },
      p3: { x: W * (0.8 + seed * 0.3),     y: H * (0.2 + seed * 0.6) },
      // velocity for each control point
      v0: { x: (Math.random() - 0.5) * 0.12, y: (Math.random() - 0.5) * 0.08 },
      v1: { x: (Math.random() - 0.5) * 0.10, y: (Math.random() - 0.5) * 0.10 },
      v2: { x: (Math.random() - 0.5) * 0.08, y: (Math.random() - 0.5) * 0.12 },
      v3: { x: (Math.random() - 0.5) * 0.12, y: (Math.random() - 0.5) * 0.08 },
      phase: seed * Math.PI * 2,
      width: 0.6 + seed * 0.8,
    };
  }

  function initStreams() {
    streams.length = 0;
    for (let i = 0; i < STREAM_COUNT; i++) streams.push(makeStream(i));
  }

  function driftPoint(p, v, bounds) {
    p.x += v.x;
    p.y += v.y;
    // soft bounce off edges
    if (p.x < -bounds.w * 0.2) { v.x =  Math.abs(v.x); }
    if (p.x >  bounds.w * 1.2) { v.x = -Math.abs(v.x); }
    if (p.y < -bounds.h * 0.2) { v.y =  Math.abs(v.y); }
    if (p.y >  bounds.h * 1.2) { v.y = -Math.abs(v.y); }
  }

  /* ── Technical arcs ───────────────────────────── */
  // Each arc has a center, radius, angle span, rotation speed
  const ARCS = [
    { cx: 0.82, cy: 0.18, r: 0.22, a0: -0.6, a1: 0.9,  spd: 0.0003,  w: 0.7 },
    { cx: 0.12, cy: 0.72, r: 0.18, a0:  1.2, a1: 3.0,  spd: -0.0002, w: 0.5 },
    { cx: 0.65, cy: 0.88, r: 0.14, a0:  3.5, a1: 5.2,  spd: 0.0004,  w: 0.6 },
    { cx: 0.35, cy: 0.15, r: 0.10, a0: -1.0, a1: 0.5,  spd: -0.0003, w: 0.45 },
    { cx: 0.90, cy: 0.60, r: 0.08, a0:  0.0, a1: 2.1,  spd: 0.0005,  w: 0.4 },
  ];
  let arcTime = 0;

  /* ── Tick/label positions ─────────────────────── */
  // Pre-computed sparse set — screen-fraction coords
  const TICK_LABELS = [
    { x: 0.0,   y: 0.33, label: '0333' },
    { x: 0.0,   y: 0.66, label: '0666' },
    { x: 0.25,  y: 0.0,  label: '0250' },
    { x: 0.50,  y: 0.0,  label: '0500' },
    { x: 0.75,  y: 0.0,  label: '0750' },
    { x: 1.0,   y: 0.25, label: '0250' },
    { x: 1.0,   y: 0.75, label: '0750' },
    { x: 0.25,  y: 1.0,  label: '0250' },
    { x: 0.75,  y: 1.0,  label: '0750' },
  ];

  /* ── Per-page glow config ─────────────────────── */
  // Each page has a radial focal glow that transitions in
  const PAGE_GLOWS = [
    { x: 0.22, y: 0.45, r: 0.55, a: 0.07 },  // Hero      — left centre
    { x: 0.50, y: 0.30, r: 0.50, a: 0.05 },  // Journey   — top centre
    { x: 0.75, y: 0.55, r: 0.45, a: 0.06 },  // Projects  — right mid
    { x: 0.30, y: 0.60, r: 0.48, a: 0.05 },  // Skills    — left low
    { x: 0.60, y: 0.40, r: 0.50, a: 0.06 },  // Achievements
    { x: 0.50, y: 0.50, r: 0.40, a: 0.05 },  // Resume    — centre
    { x: 0.45, y: 0.55, r: 0.52, a: 0.07 },  // Contact
  ];

  /* ── Resize ────────────────────────────────────── */
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W   = window.innerWidth;
    H   = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    initStreams();
  }

  /* ── Helpers ───────────────────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t)  { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  /* ══════════════════════════════════════════════
     DRAW LAYERS
  ══════════════════════════════════════════════ */

  /* 1. Base fill */
  function drawBase() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }

  /* 2. Fine engineering grid */
  function drawGrid() {
    const step = GRID_STEP;
    const cols = Math.ceil(W / step) + 1;
    const rows = Math.ceil(H / step) + 1;

    // Every 5th line slightly brighter
    for (let c = 0; c <= cols; c++) {
      const x = (c * step) % W;
      const major = c % 5 === 0;
      ctx.beginPath();
      ctx.strokeStyle = major ? white('0.028') : white('0.013');
      ctx.lineWidth   = major ? 0.6 : 0.4;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = (r * step) % H;
      const major = r % 5 === 0;
      ctx.beginPath();
      ctx.strokeStyle = major ? white('0.028') : white('0.013');
      ctx.lineWidth   = major ? 0.6 : 0.4;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Cross-hair tick marks at every major grid intersection
    for (let c = 0; c <= cols; c += 5) {
      for (let r = 0; r <= rows; r += 5) {
        const x = (c * step) % W;
        const y = (r * step) % H;
        const sz = 5;
        ctx.beginPath();
        ctx.strokeStyle = gold('0.12');
        ctx.lineWidth   = 0.5;
        ctx.moveTo(x - sz, y); ctx.lineTo(x + sz, y);
        ctx.moveTo(x, y - sz); ctx.lineTo(x, y + sz);
        ctx.stroke();
      }
    }
  }

  /* 3. Flowing bezier streams */
  function drawStreams(t) {
    streams.forEach((s, i) => {
      // drift control points
      driftPoint(s.p0, s.v0, { w: W, h: H });
      driftPoint(s.p1, s.v1, { w: W, h: H });
      driftPoint(s.p2, s.v2, { w: W, h: H });
      driftPoint(s.p3, s.v3, { w: W, h: H });

      // pulsing alpha
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0004 + s.phase);
      const alpha = (0.03 + pulse * 0.04).toFixed(3);

      ctx.beginPath();
      ctx.moveTo(s.p0.x, s.p0.y);
      ctx.bezierCurveTo(s.p1.x, s.p1.y, s.p2.x, s.p2.y, s.p3.x, s.p3.y);

      // gradient along the stream
      const grad = ctx.createLinearGradient(s.p0.x, s.p0.y, s.p3.x, s.p3.y);
      grad.addColorStop(0,   gold('0'));
      grad.addColorStop(0.3, gold(alpha));
      grad.addColorStop(0.7, gold(alpha));
      grad.addColorStop(1,   gold('0'));

      ctx.strokeStyle = grad;
      ctx.lineWidth   = s.width;
      ctx.stroke();
    });
  }

  /* 4. Technical arcs */
  function drawArcs(t) {
    ARCS.forEach(arc => {
      const cx = arc.cx * W;
      const cy = arc.cy * H;
      const r  = arc.r  * Math.min(W, H);
      const rot = t * arc.spd;
      const a0  = arc.a0 + rot;
      const a1  = arc.a1 + rot;

      // Main arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1);
      ctx.strokeStyle = gold('0.08');
      ctx.lineWidth   = arc.w;
      ctx.stroke();

      // Tick at arc endpoints
      [[a0, r], [a1, r]].forEach(([angle, radius]) => {
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;
        const tx = cx + Math.cos(angle) * (radius + 8);
        const ty = cy + Math.sin(angle) * (radius + 8);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = gold('0.18');
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      });

      // Dashed radius line from centre to arc start
      ctx.beginPath();
      ctx.setLineDash([3, 8]);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.strokeStyle = gold('0.05');
      ctx.lineWidth   = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Small centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gold('0.20');
      ctx.fill();
    });
  }

  /* 5. Coordinate labels */
  function drawLabels() {
    ctx.font      = '9px "Fira Code", monospace';
    ctx.fillStyle = gold('0.18');
    ctx.textBaseline = 'middle';

    TICK_LABELS.forEach(tl => {
      const x = tl.x * W;
      const y = tl.y * H;
      const pad = 10;

      // Small tick mark
      ctx.beginPath();
      ctx.strokeStyle = gold('0.22');
      ctx.lineWidth   = 0.7;
      if (tl.x === 0)   { ctx.moveTo(x, y); ctx.lineTo(x + 6, y); }
      else if (tl.x === 1) { ctx.moveTo(x - 6, y); ctx.lineTo(x, y); }
      else if (tl.y === 0) { ctx.moveTo(x, y); ctx.lineTo(x, y + 6); }
      else if (tl.y === 1) { ctx.moveTo(x, y - 6); ctx.lineTo(x, y); }
      ctx.stroke();

      // Label text
      ctx.save();
      if (tl.x === 0) {
        ctx.textAlign = 'left';
        ctx.fillText(tl.label, x + pad, y);
      } else if (tl.x === 1) {
        ctx.textAlign = 'right';
        ctx.fillText(tl.label, x - pad, y);
      } else if (tl.y === 0) {
        ctx.textAlign = 'center';
        ctx.fillText(tl.label, x, y + pad + 4);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(tl.label, x, y - pad - 4);
      }
      ctx.restore();
    });
  }

  /* 6. Per-page radial glow */
  function drawPageGlow() {
    const ease = easeInOut(Math.min(pageLerp, 1));

    function drawGlow(g, alpha) {
      const cx = g.x * W;
      const cy = g.y * H;
      const r  = g.r  * Math.max(W, H);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0,   gold(String((g.a * alpha).toFixed(3))));
      grad.addColorStop(0.5, gold(String((g.a * alpha * 0.4).toFixed(3))));
      grad.addColorStop(1,   gold('0'));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Outgoing glow fades
    if (pageLerp < 1 && currentPage !== targetPage) {
      drawGlow(PAGE_GLOWS[currentPage], 1 - ease);
    }
    // Incoming glow fades in
    drawGlow(PAGE_GLOWS[targetPage], ease);
  }

  /* 7. Vignette */
  function drawVignette() {
    const r = Math.max(W, H) * 0.85;
    const grad = ctx.createRadialGradient(W/2, H/2, r * 0.35, W/2, H/2, r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  /* ══════════════════════════════════════════════
     MAIN LOOP
  ══════════════════════════════════════════════ */
  let lastTs = 0;

  function frame(ts) {
    const dt = ts - lastTs;
    lastTs   = ts;
    arcTime  = ts;

    // Smooth page glow transition
    if (pageLerp < 1) {
      pageLerp = Math.min(1, pageLerp + dt * 0.0028);
    }

    ctx.save();
    // Reset any scaling artifacts each frame
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBase();
    drawGrid();
    drawStreams(ts);
    drawArcs(ts);
    drawLabels();
    drawPageGlow();
    drawVignette();

    ctx.restore();
    raf = requestAnimationFrame(frame);
  }

  /* ── Public API ───────────────────────────────── */
  window.bgCanvas = {
    setPage(n) {
      if (n === targetPage) return;
      currentPage = targetPage;
      targetPage  = n;
      pageLerp    = 0;
    }
  };

  /* ── Init ─────────────────────────────────────── */
  resize();
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    resize();
    raf = requestAnimationFrame(frame);
  });

  raf = requestAnimationFrame(frame);

})();
