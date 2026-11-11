/* Fortis scroll story: one Earth that stays on screen while the problem is told in five chapters.
   The section is tall; its inner block is pinned. Scroll progress picks the chapter, and the chapter
   sets where the Earth looks and how close it is. The globe eases toward that, so nothing jumps. */
(() => {
  const sec = document.getElementById('story');
  if (!sec) return;
  const earth = document.getElementById('story-earth');
  const chaps = [...sec.querySelectorAll('.chap')];
  const ticks = [...sec.querySelectorAll('.story-prog i')];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { sec.classList.add('static'); return; }

  const narrow = window.matchMedia('(max-width: 860px)');
  // Where the Earth looks in each chapter: longitude, latitude, and radius (bigger = closer).
  const VIEWS = [
    { lon: 17, lat: 6, r: 0.78 },   // the continent
    { lon: 5, lat: 8, r: 0.9 },     // in on Lagos: code ships
    { lon: 22, lat: 14, r: 0.62 },  // pulled back: one test, a long way off
    { lon: 18, lat: 2, r: 0.92 },   // the gaps
    { lon: 18, lat: 2, r: 0.8 },    // Fortis covers the continent
  ];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let cur = -1;

  const update = () => {
    const r = sec.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    if (total <= 0) return;
    const p = clamp(-r.top / total, 0, 1);
    const f = p * chaps.length;
    const i = Math.min(chaps.length - 1, Math.floor(f));
    sec.classList.toggle('started', r.top < -20);

    if (i !== cur) {
      cur = i;
      chaps.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); });
      ticks.forEach((t, k) => t.classList.toggle('on', k === i));
      earth.setAttribute('data-chapter', String(i));
    }
    // Inside a chapter the Earth keeps drifting with the scroll, so it never sits still.
    const g = earth.globeTarget;
    if (g) {
      const v = VIEWS[i], frac = f - i;
      g.lon = v.lon + (frac - 0.5) * 7;
      g.lat = v.lat;
      g.r = v.r * (narrow.matches ? 0.92 : 1);
    }
  };

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
