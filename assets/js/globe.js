/* Fortis hero globe: a real Earth rendered with a small WebGL shader.
   No dependencies. Textures: assets/img/earth/earth-day.jpg (colour) and
   earth-aux.jpg (R = clouds, G = city lights, B = water mask). */
(() => {
  const host = document.getElementById('earth');
  if (!host) return;
  const canvas = host.querySelector('canvas');
  const overlay = host.querySelector('.earth-overlay');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return; // static fallback image stays visible

  const R = 0.78; // sphere radius as a share of half the canvas
  const DEG = Math.PI / 180;

  const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uDay, uAux;
  uniform float uLon, uLat, uCloud, uPx;
  uniform vec3 uSun;
  const float R = ${R.toFixed(3)};
  const float PI = 3.14159265;
  vec2 lonLatUv(vec3 v, float lonOff) {
    float cb = cos(uLat), sb = sin(uLat);
    float y = v.y * cb + v.z * sb;
    float z1 = -v.y * sb + v.z * cb;
    float cl = cos(uLon), sl = sin(uLon);
    float x = v.x * cl + z1 * sl;
    float z = -v.x * sl + z1 * cl;
    float lon = atan(x, z);
    float lat = asin(clamp(y, -1., 1.));
    return vec2(fract(lon / (2. * PI) + .5 + lonOff), .5 - lat / PI);
  }
  void main() {
    vec2 p = vUv * 2. - 1.;
    float d = length(p) / R;
    float aa = uPx / R;
    // atmosphere halo outside the disc
    float halo = exp(-max(d - 1., 0.) * 9.) * .55 * (1. - smoothstep(1.0, 1.32, d));
    vec3 haloCol = vec3(.38, .64, 1.) * halo;
    if (d > 1. + aa) { gl_FragColor = vec4(haloCol, halo); return; }
    float dz = sqrt(max(1. - d * d, 0.));
    vec3 n = vec3(p / R, dz);
    vec2 uv = lonLatUv(n, 0.);
    vec3 day = texture2D(uDay, uv).rgb;
    vec4 aux = texture2D(uAux, uv);
    float cloud = texture2D(uAux, lonLatUv(n, uCloud)).r;
    day = pow(day, vec3(.88)) * 1.12;

    float ndl = dot(n, uSun);
    float dayAmt = smoothstep(-.12, .28, ndl);
    float diff = max(ndl, 0.);

    vec3 col = day * (.10 + 1.05 * diff);
    // city lights on the night side
    float lights = pow(aux.g, 1.6);
    col += vec3(1., .76, .42) * lights * 1.6 * (1. - dayAmt);
    // ocean glint
    vec3 h = normalize(uSun + vec3(0., 0., 1.));
    col += vec3(.9, .95, 1.) * pow(max(dot(n, h), 0.), 70.) * aux.b * .55 * dayAmt;
    // clouds
    float c = smoothstep(.04, .95, cloud);
    col = mix(col, vec3(1.) * (.08 + .95 * diff), c * .7);
    // atmospheric scattering at the limb
    float fres = pow(1. - dz, 2.6);
    col = mix(col, vec3(.48, .72, 1.) * (.25 + .9 * dayAmt), fres * .75);
    col += vec3(.05, .09, .16) * (1. - dz) * dayAmt;

    float a = 1. - smoothstep(1. - aa, 1. + aa, d);
    gl_FragColor = vec4(col * a + haloCol * (1. - a), a + halo * (1. - a));
  }`;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn('Globe disabled:', e);
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uDay', 'uAux', 'uLon', 'uLat', 'uCloud', 'uPx', 'uSun'].forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });
  const sun = [-0.42, 0.36, 0.83];
  const sl = Math.hypot(...sun);
  gl.uniform3f(U.uSun, sun[0] / sl, sun[1] / sl, sun[2] / sl);
  gl.uniform1i(U.uDay, 0);
  gl.uniform1i(U.uAux, 1);

  const loadTex = (unit, url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resolve();
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });

  /* ---------- Cities and links (drawn as SVG over the canvas) ---------- */
  const CITIES = [
    { name: 'Lagos', lat: 6.52, lon: 3.38, hub: true, dx: 0, dy: -16, anchor: 'middle' },
    { name: 'Accra', lat: 5.6, lon: -0.19, dx: -10, dy: 14, anchor: 'end' },
    { name: 'Nairobi', lat: -1.29, lon: 36.82 },
    { name: 'Kigali', lat: -1.95, lon: 30.06, dx: -10, dy: 12, anchor: 'end' },
    { name: 'Johannesburg', lat: -26.2, lon: 28.05 },
  ];
  const ARC_COLORS = ['#7DF2B2', '#3D7BFF', '#7DF2B2', '#3D7BFF'];
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent.appendChild(e);
    return e;
  };
  const vec = (lat, lon) => [Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lon * DEG)];
  CITIES.forEach((c) => { c.v = vec(c.lat, c.lon); });
  const hub = CITIES[0];
  const arcs = CITIES.slice(1).map((c, i) => {
    const path = el('path', { class: 'earth-arc', stroke: ARC_COLORS[i], fill: 'none' }, overlay);
    return { to: c, path };
  });
  CITIES.forEach((c) => {
    const g = el('g', { class: c.hub ? 'earth-city hub' : 'earth-city' }, overlay);
    if (c.hub) el('circle', { r: 12, class: 'ring' }, g);
    el('circle', { r: c.hub ? 5.5 : 4, class: 'dot' }, g);
    const t = el('text', { x: c.dx ?? 12, y: c.dy ?? 4, 'text-anchor': c.anchor || 'start' }, g);
    t.textContent = c.name;
    c.g = g;
  });

  // Rotate a world vector into view space for centre (lon L, lat B).
  const toView = ([x, y, z], L, B) => {
    const cl = Math.cos(L), sl = Math.sin(L);
    const x1 = x * cl - z * sl;
    const z1 = x * sl + z * cl;
    const cb = Math.cos(B), sb = Math.sin(B);
    return [x1, y * cb - z1 * sb, y * sb + z1 * cb];
  };
  const slerp = (a, b, t) => {
    const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const om = Math.acos(dot);
    if (om < 1e-4) return a;
    const s = Math.sin(om);
    const ka = Math.sin((1 - t) * om) / s, kb = Math.sin(t * om) / s;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  };

  /* ---------- Sizing ---------- */
  let size = 0, dpr = 1;
  const resize = () => {
    size = host.clientWidth;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = Math.round(size * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U.uPx, 2 / canvas.width);
    overlay.setAttribute('viewBox', `0 0 ${size} ${size}`);
  };

  /* ---------- Render loop ---------- */
  const BASE_LON = 17 * DEG, BASE_LAT = 4 * DEG;
  let pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  let running = false, visible = true, ready = false, t0 = performance.now();

  const draw = (now) => {
    const t = reduce ? 0 : (now - t0) / 1000;
    eased.x += (pointer.x - eased.x) * 0.05;
    eased.y += (pointer.y - eased.y) * 0.05;
    const L = BASE_LON + Math.sin(t * 0.07) * 16 * DEG + eased.x * 14 * DEG;
    const B = BASE_LAT + eased.y * -8 * DEG;
    gl.uniform1f(U.uLon, L);
    gl.uniform1f(U.uLat, B);
    gl.uniform1f(U.uCloud, -t * 0.0035);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const half = size / 2, rad = R * half;
    const proj = (v) => [half + v[0] * rad, half - v[1] * rad, v[2]];
    CITIES.forEach((c) => {
      const [x, y, z] = proj(toView(c.v, L, B));
      c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      c.g.style.opacity = Math.max(0, Math.min(1, (z - 0.08) * 5)).toFixed(2);
    });
    arcs.forEach(({ to, path }) => {
      let d = '', minZ = 1;
      for (let i = 0; i <= 28; i++) {
        const k = i / 28;
        const s = slerp(hub.v, to.v, k);
        const lift = 1 + 0.16 * Math.sin(Math.PI * k);
        const [x, y, z] = proj(toView([s[0] * lift, s[1] * lift, s[2] * lift], L, B));
        minZ = Math.min(minZ, z);
        d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      path.setAttribute('d', d);
      path.style.opacity = Math.max(0, Math.min(1, minZ * 4)).toFixed(2);
    });
    if (running && !reduce) requestAnimationFrame(draw);
  };
  const start = () => {
    if (running || !ready || !visible) return;
    running = true;
    requestAnimationFrame(draw);
  };
  const stop = () => { running = false; };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { resize(); if (!running) requestAnimationFrame(draw); });
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    const stage = host.closest('.hero-stage') || host;
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      pointer = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
    });
    stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
  }

  resize();
  Promise.all([loadTex(0, 'assets/img/earth/earth-day.jpg'), loadTex(1, 'assets/img/earth/earth-aux.jpg')])
    .then(() => {
      ready = true;
      host.classList.add('live');
      if (reduce) { running = false; draw(performance.now()); } else start();
    })
    .catch((e) => console.warn('Globe textures unavailable, using static image.', e));
})();
