/*
 * ink.js — the hand-drawn layer of the site: boiling ink outlines, the brush-wipe
 * intro and the film grain.
 *
 * Adapted, not copied wholesale, from two MIT-licensed animation kits:
 *   - claude-animation-skill (c) 2026 Hanif — hash/rng/noise, grainCanvas and the
 *     "boil" idea (linework redrawn with fresh jitter ~10x a second) from
 *     lib/core.mjs, lib/pen.mjs and lib/textures.mjs.
 *   - ClaudeAnimationBase (c) 2026 John Heibel — the brush-wipe transition from
 *     src/timeline.js, rebuilt for a plain 2D canvas instead of p5.brush.
 * Both are released under the MIT License: permission is granted, free of charge, to
 * use, copy, modify and distribute the software, provided the copyright and
 * permission notices are included. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY.
 */
(function () {
  "use strict";

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const rng = (seed) => { let s = Math.max(1, Math.floor(seed)) % 2147483647; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
  const ease = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
  const TAU = Math.PI * 2;

  // A closed, slightly irregular ring as an SVG path. `seed` picks the drawing;
  // a new seed every 1/10 s is the boil. Starts at 12 o'clock, runs clockwise,
  // so a dash offset reveals it like a pen going round.
  function wobblyRing(cx, cy, r, seed, amp = 0.018, n = 36) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * TAU;
      const wob = 1 + (hash(seed * 91.7 + i * 7.13) - 0.5) * 2 * amp + Math.sin(a * 3 + seed) * amp * 0.6;
      pts.push([cx + Math.cos(a) * r * wob, cy + Math.sin(a) * r * wob]);
    }
    return smoothPath(pts, true);
  }

  // A soft blob: low-frequency lumps plus a little per-drawing jitter.
  function blob(cx, cy, r, seed, lumps = 0.06, jitter = 0.012, n = 28) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + Math.sin(a * 2 + 0.7) * lumps + Math.sin(a * 3 + 2.1) * lumps * 0.6
        + (hash(seed * 37.3 + i * 3.71) - 0.5) * 2 * jitter;
      pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
    }
    return smoothPath(pts, true);
  }

  // Quadratic curves through the midpoints: organic outlines with no corners
  // (the `smooth()` trick from claude-animation-skill's core.mjs).
  function smoothPath(pts, closed) {
    const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const f = (v) => v.toFixed(1);
    const n = pts.length;
    if (!closed) {
      let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
      for (let i = 1; i < n - 1; i++) { const q = m(pts[i], pts[i + 1]); d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(q[0])} ${f(q[1])}`; }
      return d + ` L${f(pts[n - 1][0])} ${f(pts[n - 1][1])}`;
    }
    let s = m(pts[n - 1], pts[0]);
    let d = `M${f(s[0])} ${f(s[1])}`;
    for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); d += ` Q${f(p[0])} ${f(p[1])} ${f(q[0])} ${f(q[1])}`; }
    return d + "Z";
  }

  // A drawn brush swoosh under a word, left to right, slightly rising.
  function swoosh(w, h, seed) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      pts.push([4 + k * (w - 8), h * 0.62 - Math.sin(k * Math.PI) * h * 0.28 - k * h * 0.12 + (hash(seed + i * 5.3) - 0.5) * 2.2]);
    }
    return smoothPath(pts, false);
  }

  // Runs `draw(frame)` `fps` times a second while `el` is on screen.
  // The hold between redraws is what makes boil read as hand-made, not as a wobble.
  function boil(el, fps, draw) {
    if (!fps) { draw(0); return () => {}; }
    let raf = 0, last = -1, visible = false;
    const tick = (now) => {
      const frame = Math.floor(now / (1000 / fps));
      if (frame !== last) { last = frame; draw(frame); }
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(el);
    draw(0);
    return () => { io.disconnect(); cancelAnimationFrame(raf); raf = 0; };
  }

  // Printed-paper grain tile (grainCanvas from claude-animation-skill).
  function grainCanvas(sz = 256, amt = 70, seed = 3, alpha = false) {
    const c = document.createElement("canvas");
    c.width = c.height = sz;
    const x = c.getContext("2d"), d = x.createImageData(sz, sz), r = rng(seed);
    for (let i = 0; i < sz * sz; i++) {
      const v = Math.floor(Math.pow(r(), 2.2) * amt);
      if (alpha) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = r() > 0.5 ? 255 : 0; d.data[i * 4 + 3] = v; }
      else { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255 - v; d.data[i * 4 + 3] = 255; }
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  // Film grain over the whole page: one tile, jumped around on steps in CSS.
  function filmGrain(el) {
    el.style.backgroundImage = `url(${grainCanvas(220, 150, 17, true).toDataURL("image/png")})`;
  }

  // The brush wipe. p 0 → .5 strokes cover the frame, .5 → 1 they drag off.
  // The intro only plays the second half: the page loads under paint and the
  // strokes pull away to reveal it.
  function brushWipe(canvas, { duration = 1.15, cols = ["#F2A93B", "#E2725B"], streak = "#7A3B12", onReveal, onDone } = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const grain = ctx.createPattern(grainCanvas(256, 90, 5), "repeat");
    const n = 5, span = H + 420, bh = span / n + 40, delays = [0, 0.14, 0.06, 0.18, 0.1];
    let start = 0, revealed = false;

    function stroke(i, p, frame) {
      const jit = (k, a) => (hash(frame * 13.37 + i * 31 + k * 7.13) - 0.5) * 2 * a; // seeded, boils on twos
      const y0 = -230 + i * span / n, d = delays[i];
      const q = p < 0.5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - 0.5) * 2 - d) / (1 - d)));
      const x0 = p < 0.5 ? -300 : lerp(-300, W + 400, q), x1 = p < 0.5 ? lerp(-300, W + 400, q) : W + 400;
      if (x1 - x0 < 30) return;
      const rag = (k) => 40 + 50 * hash(i * 31 + k) + jit(k + 50, 12);
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * 0.9 + i) * 14 + jit(k, 5)]);
      for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
      for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * 0.8 + i * 2) * 14 + jit(k + 20, 5)]);
      if (p >= 0.5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);

      ctx.beginPath();
      pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = cols[i % 2];
      ctx.fill();
      // bristle streaks + grain, clipped to the stroke: this is what sells "paint"
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = streak;
      for (let s = 0; s < 22; s++) {
        const yy = y0 + hash(i * 97 + s * 3.1) * bh, w = 0.6 + hash(i * 13 + s) * 1.8;
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x0 - 60, yy); ctx.lineTo(x1 + 60, yy + Math.sin(s + i) * 6); ctx.stroke();
      }
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = grain;
      ctx.fillRect(-400, -400, W + 1200, H + 1200);
      ctx.restore();
    }

    function frame(now) {
      if (!start) start = now;
      const t = (now - start) / 1000;
      const p = 0.5 + clamp(t / duration) * 0.5;
      if (!revealed && p > 0.56) { revealed = true; onReveal && onReveal(); }
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.rotate(-0.1); ctx.translate(-W / 2, -H / 2);
      const fr = Math.floor(t * 12); // paint texture on twos
      for (let i = 0; i < n; i++) stroke(i, p, fr);
      ctx.restore();
      if (p < 1) requestAnimationFrame(frame);
      else { canvas.remove(); onDone && onDone(); }
    }
    requestAnimationFrame(frame);
  }

  window.Ink = { hash, wobblyRing, blob, swoosh, boil, filmGrain, brushWipe, clamp, lerp };
})();
