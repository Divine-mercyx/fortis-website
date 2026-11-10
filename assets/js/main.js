/* Fortis marketing site — interactions. No dependencies. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Page loader: hide once everything has loaded (at least 2.4 seconds, so the lock-in animation finishes) ---------- */
  const loader = $('#loader');
  if (loader) {
    const shown = performance.now();
    const hide = () => setTimeout(() => loader.classList.add('done'), Math.max(0, 2400 - (performance.now() - shown)));
    if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide, { once: true });
  }

  /* ---------- Word-by-word headline reveal ---------- */
  $$('.words').forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          wrap(child);
        }
      });
    };
    wrap(el);
  });

  /* ---------- Count-up numbers ---------- */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduce) { el.textContent = target.toLocaleString('en-US'); return; }
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      if (el.matches('[data-count]')) countUp(el);
      if (el.id === 'findings-win') runShowcase();
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal, .words, .stat, .timeline, [data-win], #wordmark').forEach((el) => io.observe(el));

  /* ---------- Nav: scrolled state + mega menus ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const menus = $$('[data-menu]');
  const closeMenus = (except) => menus.forEach((m) => {
    if (m === except) return;
    m.classList.remove('open');
    $('.nav-trigger', m).setAttribute('aria-expanded', 'false');
  });
  menus.forEach((m) => {
    const trigger = $('.nav-trigger', m);
    let timer;
    const open = () => { clearTimeout(timer); closeMenus(m); m.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); };
    const close = () => { timer = setTimeout(() => { m.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }, 160); };
    m.addEventListener('mouseenter', open);
    m.addEventListener('mouseleave', close);
    trigger.addEventListener('click', () => (m.classList.contains('open') ? close() : open()));
    $$('a', m).forEach((a) => a.addEventListener('click', () => closeMenus()));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-menu]')) closeMenus(); });

  /* ---------- Mobile drawer ---------- */
  const drawer = $('#drawer');
  const setDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  $('#burger').addEventListener('click', () => setDrawer(true));
  $('#drawer-close').addEventListener('click', () => setDrawer(false));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));

  /* ---------- Hero: gentle parallax on floating cards ---------- */
  const stage = $('#stage');
  if (stage && !reduce && window.matchMedia('(pointer: fine)').matches) {
    const items = $$('.float-card, .avatar', stage);
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      items.forEach((el, i) => {
        const depth = el.classList.contains('avatar') ? 10 : 16 + (i % 3) * 4;
        el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
      });
    });
    stage.addEventListener('pointerleave', () => items.forEach((el) => { el.style.transform = ''; }));
  }

  /* ---------- Connected model tabs ---------- */
  const TAB_MS = 6500;
  const model = $('#model');
  if (model) {
  const tabs = $$('.model-tab', model);
  const panes = $$('.model-pane', model);
  const term = $('#model-term');
  const SCRIPTS = [
    ['<span class="c-g">$</span> git push origin main',
     '<span class="c-m">fortis ▸ fintech rules · 214 files</span>',
     '<span class="c-r">✖ PUSH BLOCKED</span> · 2 critical',
     '  <span class="c-r">CRITICAL</span> live Paystack key · config.ts:4',
     '  <span class="c-r">CRITICAL</span> no ownership check · transfers.ts:41',
     '  <span class="c-g">fix</span> → fortis explain F-102'],
    ['<span class="c-m">deploy #2,140 → staging</span>',
     '<span class="c-m">fortis ▸ access checks · 2 test users</span>',
     '<span class="c-w">GET /v1/transfers/10483</span> <span class="c-m">as user A</span>',
     '  <span class="c-r">← 200 owner: user B</span> · CRITICAL',
     '<span class="c-m">re-run after fix…</span>',
     '  <span class="c-g">← 403 Forbidden</span> · gate passed'],
    ['<span class="c-g">$</span> fortis evidence --period Q4',
     '<span class="c-m">collecting findings, fixes, re-tests…</span>',
     '  CBN control areas      <span class="c-g">mapped</span>',
     '  NDPA 2023              <span class="c-g">mapped</span>',
     '  PCI DSS 4.0            <span class="c-g">mapped</span>',
     '<span class="c-g">✓ pack ready</span> · share link expires in 14d'],
    ['<span class="c-m">annual pentest · scope review</span>',
     '  verified findings      <span class="c-w">128</span>',
     '  route map              <span class="c-w">37 endpoints</span>',
     '  open critical          <span class="c-g">0</span>',
     '<span class="c-a">tester starts from Fortis evidence</span>',
     '<span class="c-g">✓ faster, sharper engagement</span>'],
  ];
  let active = 0;
  let timer;
  let termTimers = [];
  const typeTerm = (idx) => {
    termTimers.forEach(clearTimeout);
    termTimers = [];
    term.innerHTML = SCRIPTS[idx].map((l) => `<div class="ln">${l}</div>`).join('');
    $$('.ln', term).forEach((ln, i) => termTimers.push(setTimeout(() => ln.classList.add('on'), reduce ? 0 : 250 + i * 420)));
  };
  const setTab = (idx, user = false) => {
    active = idx;
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === idx);
      t.setAttribute('aria-selected', String(i === idx));
      const bar = $('.bar', t);
      bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    });
    panes.forEach((p, i) => p.classList.toggle('active', i === idx));
    typeTerm(idx);
    clearTimeout(timer);
    if (!reduce && !user) timer = setTimeout(() => setTab((active + 1) % tabs.length), TAB_MS);
    if (user) timer = setTimeout(() => setTab((active + 1) % tabs.length), TAB_MS * 2);
  };
  model.style.setProperty('--tab-ms', `${TAB_MS}ms`);
  tabs.forEach((t, i) => t.addEventListener('click', () => setTab(i, true)));
  let started = false;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !started) { started = true; setTab(0); }
  }, { threshold: 0.3 }).observe(model);
  $$('[data-tab]').forEach((a) => a.addEventListener('click', () => { started = true; setTab(Number(a.dataset.tab), true); }));
  }

  /* ---------- Showcase: terminal + findings fixing ---------- */
  const SHOW = [
    [300, '<span class="c-g">$</span> npm i -D @fortis/guard && npx fortis init'],
    [900, '<span class="c-g">✓</span> <span class="c-m">pre-push hook installed · CI step added</span>'],
    [1500, '<span class="c-g">$</span> git push origin main'],
    [2100, '<span class="c-m">fortis ▸ fintech rules · 214 files · 38 packages</span>'],
    [2900, '<span class="c-r">✖ PUSH BLOCKED</span> · 2 critical issues'],
    [3300, '  <span class="c-r">CRITICAL</span> Live Paystack secret in code'],
    [3500, '    <span class="c-m">src/config.ts:4</span> → <span class="c-g">move to env variable</span>'],
    [3900, '  <span class="c-r">CRITICAL</span> Transfer read without ownership check'],
    [4100, '    <span class="c-m">src/routes/transfers.ts:41</span> → <span class="c-g">add ownerId filter</span>'],
    [5200, '<span class="c-g">$</span> git push origin main'],
    [5900, '<span class="c-g">✓ All checks passed</span> · 0 critical · pushed'],
  ];
  const showTerm = $('#show-term');
  if (showTerm) showTerm.innerHTML = SHOW.map(([, l]) => `<div class="ln">${l}</div>`).join('');
  let showcaseRan = false;
  function runShowcase() {
    if (showcaseRan || !showTerm) return; showcaseRan = true;
    const lines = $$('.ln', showTerm);
    lines.forEach((ln, i) => setTimeout(() => ln.classList.add('on'), reduce ? 0 : SHOW[i][0]));
    setTimeout(() => {
      $$('[data-fix]').forEach((s) => { s.textContent = 'Fixed'; s.style.color = 'var(--green)'; });
      const crit = $('#dash-crit'); crit.textContent = '0'; crit.classList.remove('red'); crit.classList.add('green');
    }, reduce ? 0 : 6100);
  }
  const showWin = showTerm && showTerm.closest('[data-win]');
  if (showWin) showWin.id = 'findings-win';

  /* ---------- Pricing toggle ---------- */
  $$('[data-bill]').forEach((b) => b.addEventListener('click', () => {
    const yearly = b.dataset.bill === 'y';
    $$('[data-bill]').forEach((x) => x.classList.toggle('on', x === b));
    $$('.price[data-m]').forEach((p) => { p.innerHTML = `${yearly ? p.dataset.y : p.dataset.m}<small>${yearly ? '/yr' : '/mo'}</small>`; });
    $$('.per[data-m]').forEach((p) => { p.textContent = yearly ? p.dataset.y : p.dataset.m; });
  }));

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach((item) => {
    const q = $('.faq-q', item);
    const a = $('.faq-a', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      q.setAttribute('aria-expanded', String(open));
      a.style.height = open ? `${a.scrollHeight}px` : '0px';
    });
  });

  /* ---------- Photo band parallax ---------- */
  const bandBg = $('#band-bg');
  if (bandBg && !reduce) {
    const band = bandBg.parentElement;
    const parallax = () => {
      const r = band.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const k = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      bandBg.style.transform = `translateY(${k * -40}px) scale(1.04)`;
    };
    window.addEventListener('scroll', parallax, { passive: true });
    parallax();
  }

  /* ---------- Early access / contact form ---------- */
  const formWrap = $('#ea-form');
  const form = formWrap && $('form', formWrap);
  if (form) {
    const params = new URLSearchParams(location.search);
    const plan = params.get('plan');
    const topic = params.get('topic');
    if (plan && $('#plan-select')) $('#plan-select').value = plan;
    if (topic) { const r = $(`input[name=topic][value="${CSS.escape(topic)}"]`, form); if (r) r.checked = true; }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('input[required]', form).forEach((input) => {
        const valid = input.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) : input.value.trim().length > 1;
        input.closest('.field').classList.toggle('err', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { const bad = $('.field.err input', form); if (bad) bad.focus(); return; }
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      btn.firstChild.textContent = 'Sending… ';
      // Placeholder: wire to your form backend (e.g. Formspree, a serverless function or a CRM).
      setTimeout(() => formWrap.classList.add('sent'), 700);
    });
    $$('input', form).forEach((i) => i.addEventListener('input', () => { const f = i.closest('.field'); if (f) f.classList.remove('err'); }));
  }

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
    const label = b.lastChild;
    const prev = label.textContent;
    b.classList.add('done'); label.textContent = 'Copied';
    setTimeout(() => { b.classList.remove('done'); label.textContent = prev; }, 1600);
  }));

  /* ---------- Scroll-spy for sub navigation and legal contents ---------- */
  const spyLinks = $$('.subnav a[href^="#"], .toc a[href^="#"]');
  if (spyLinks.length) {
    const targets = spyLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    const setOn = (id) => spyLinks.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('on', on);
      if (on && a.closest('.subnav')) {
        const bar = a.parentElement;
        const left = a.offsetLeft - bar.clientWidth / 2 + a.clientWidth / 2;
        bar.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    const spy = () => {
      const y = window.scrollY + 180;
      let current = null;
      targets.forEach((t) => { if (t.getBoundingClientRect().top + window.scrollY <= y) current = t.id; });
      if (current) setOn(current); else spyLinks.forEach((a) => a.classList.remove('on'));
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  /* ---------- Pricing calculator ---------- */
  const calc = $('#calc');
  if (calc) {
    const rel = $('#c-rel'), pt = $('#c-pt'), cost = $('#c-cost');
    let planCost = 5400000;
    const naira = (n) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : `₦${Math.round(n).toLocaleString('en-US')}`);
    const fill = (input) => input.style.setProperty('--p', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
    const update = () => {
      const perYear = Number(rel.value) * 12;
      const tests = Number(pt.value);
      const ptSpend = tests * Number(cost.value);
      $('#o-rel').textContent = rel.value;
      $('#o-pt').textContent = pt.value;
      $('#o-cost').textContent = naira(Number(cost.value));
      $('#r-total').textContent = perYear.toLocaleString('en-US');
      $('#r-seen').textContent = Math.min(tests, perYear);
      $('#r-gap').firstChild.textContent = Math.max(0, perYear - tests).toLocaleString('en-US');
      $('#r-fortis').textContent = perYear.toLocaleString('en-US');
      $('#r-pt').textContent = naira(ptSpend);
      $('#r-plan').textContent = naira(planCost);
      $('#r-per').textContent = naira(planCost / perYear);
      const share = Math.round((planCost / ptSpend) * 100);
      $('#r-share').textContent = `${share}%`;
      $('#r-meter').style.setProperty('--w', `${Math.min(100, share)}%`);
      [rel, pt, cost].forEach(fill);
    };
    [rel, pt, cost].forEach((i) => i.addEventListener('input', update));
    $$('[data-plan]', calc).forEach((b) => b.addEventListener('click', () => {
      planCost = Number(b.dataset.plan);
      $$('[data-plan]', calc).forEach((x) => x.classList.toggle('on', x === b));
      update();
    }));
    update();
  }

  /* ---------- Release-year tracks (compare page) ---------- */
  $$('[data-track]').forEach((track) => {
    const kind = track.dataset.track;
    const dots = [];
    if (kind === 'releases' || kind === 'fortis') {
      for (let i = 0; i < 200; i++) dots.push({ x: (i + 0.5) / 2, cls: kind === 'releases' ? 'red' : '' });
    } else if (kind === 'pentest') {
      dots.push({ x: 22, cls: 'big' });
    } else if (kind === 'va') {
      [10, 35, 60, 85].forEach((x) => dots.push({ x, cls: 'big' }));
    }
    track.innerHTML = dots.map((d, k) => `<i class="${d.cls}" style="left:${d.x}%;--k:${Math.min(k, 120)}"></i>`).join('');
    if (kind === 'releases') $$('i', track).forEach((d) => { d.style.width = d.style.height = '4px'; d.style.margin = '-2px 0 0 -2px'; d.style.background = 'var(--ink-2)'; });
    if (kind === 'fortis') $$('i', track).forEach((d) => { d.style.width = d.style.height = '5px'; d.style.margin = '-2.5px 0 0 -2.5px'; });
  });

  /* ---------- FAQ search and filter ---------- */
  const faqSearch = $('#faq-search');
  if (faqSearch) {
    let cat = 'all';
    const apply = () => {
      const q = faqSearch.value.trim().toLowerCase();
      let shown = 0;
      $$('.faq-group').forEach((g) => {
        const inCat = cat === 'all' || g.dataset.group === cat;
        let groupShown = 0;
        $$('.faq-item', g).forEach((item) => {
          const match = inCat && (!q || item.textContent.toLowerCase().includes(q));
          item.hidden = !match;
          if (match) groupShown++;
        });
        g.hidden = groupShown === 0;
        shown += groupShown;
      });
      $('#faq-empty').classList.toggle('on', shown === 0);
    };
    faqSearch.addEventListener('input', apply);
    $$('[data-cat]').forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.cat;
      $$('[data-cat]').forEach((x) => x.classList.toggle('on', x === b));
      apply();
    }));
  }
})();
