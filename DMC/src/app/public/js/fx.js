// ── THE QLIPHOTH — particle FX ────────────────────────────────────────────────
// Pure DMC red sparks — no orange, no blue, just #e8000a
(function () {
  const canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const TOTAL = 55;
  const pts   = [];

  const mk = () => ({
    x:    Math.random() * W,
    y:    H + 5,
    vx:   (Math.random() - .5) * .35,
    vy:   -(Math.random() * 1.3 + .5),
    r:    Math.random() * .9 + .2,
    life: 0,
    max:  Math.random() * 150 + 80,
  });

  for (let i = 0; i < TOTAL; i++) {
    const p = mk();
    p.y    = Math.random() * H;
    p.life = Math.random() * p.max;
    pts.push(p);
  }

  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.life++;
      p.x += p.vx + Math.sin(p.life * .05) * .18;
      p.y += p.vy;
      if (p.life > p.max) { pts[i] = mk(); continue; }

      const t = p.life / p.max;
      const a = t < .1 ? t / .1 : t > .65 ? 1 - (t - .65) / .35 : 1;
      const s = p.r * (1 - t * .28);

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 5);
      g.addColorStop(0,   `rgba(255,100,100,${a * .95})`);
      g.addColorStop(.35, `rgba(232,0,10,${a * .65})`);
      g.addColorStop(1,   `rgba(138,0,6,0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
