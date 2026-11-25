/* Ремонт Студио — behaviour. Ported from reference/Main.dc.html (class Component). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  /* ---------------- Viewport height (hero / stages) ---------------- */
  let vh = 0;
  function onResize() {
    const sh = (window.screen && window.screen.availHeight) || window.innerHeight;
    const v = Math.min(window.innerHeight, sh);
    if (v === vh) return;
    vh = v;
    const base = Math.max(560, vh);
    root.style.setProperty('--hero-h', Math.max(560, vh - 88) + 'px');
    root.style.setProperty('--stg-h', base + 'px');
    root.style.setProperty('--stg-wrap-h', base * 4 + 'px');
  }

  /* ---------------- Navbar: sliding pill + mega menu ---------------- */
  const navbar = $('#navbar');
  const links = $('#links');
  const pill = $('#pill');
  const svcBtn = $('#svc-btn');
  const mega = $('#mega');
  let megaOpen = false;
  let pillShown = false;

  function movePill(el) {
    // first appearance: jump into place without sliding from 0
    if (!pillShown) pill.classList.add('no-anim');
    pill.style.left = el.offsetLeft + 'px';
    pill.style.width = el.offsetWidth + 'px';
    pill.style.opacity = '1';
    if (!pillShown) { void pill.offsetWidth; pill.classList.remove('no-anim'); }
    pillShown = true;
  }
  function hidePill() { pill.style.opacity = '0'; pillShown = false; }

  function setMega(open) {
    megaOpen = open;
    mega.hidden = !open;
    svcBtn.setAttribute('aria-expanded', String(open));
    if (open) movePill(svcBtn);
  }

  $$('.lk', links).forEach((lk) => {
    const enter = () => { movePill(lk); setMega(lk === svcBtn); };
    lk.addEventListener('mouseenter', enter);
    lk.addEventListener('focus', () => { movePill(lk); if (lk !== svcBtn) setMega(false); });
  });
  svcBtn.addEventListener('click', () => setMega(!megaOpen));
  $$('[data-close-mega]', navbar).forEach((el) => el.addEventListener('mouseenter', () => { setMega(false); hidePill(); }));
  navbar.addEventListener('mouseleave', () => { setMega(false); hidePill(); });
  links.addEventListener('focusout', (e) => { if (!navbar.contains(e.relatedTarget)) { setMega(false); hidePill(); } });
  mega.addEventListener('focusout', (e) => { if (!navbar.contains(e.relatedTarget)) { setMega(false); hidePill(); } });
  $$('a', mega).forEach((a) => a.addEventListener('click', () => { setMega(false); hidePill(); }));

  /* ---------------- Mobile / tablet panel ---------------- */
  const panel = $('#panel');
  const burger = $('#burger');
  const plRoot = $('#pl-root');
  const plSub = $('#pl-sub');

  function setLevel(sub) {
    plRoot.hidden = sub;
    plSub.hidden = !sub;
    (sub ? $('#to-root') : $('#to-sub')).focus();
  }
  // pin the panel's bar to the navbar's exact on-screen box (no jump on open)
  function matchBar() {
    const r = navbar.getBoundingClientRect();
    panel.style.setProperty('--nb-l', r.left + 'px');
    panel.style.setProperty('--nb-t', r.top + 'px');
    panel.style.setProperty('--nb-w', r.width + 'px');
  }
  function openPanel() {
    setMega(false);
    root.style.setProperty('--sbw', (window.innerWidth - root.clientWidth) + 'px');
    matchBar();
    panel.hidden = false;
    plRoot.hidden = false; plSub.hidden = true;
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    $('#panel-close').focus();
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', openPanel);
  $('#to-sub').addEventListener('click', () => setLevel(true));
  $('#to-root').addEventListener('click', () => setLevel(false));
  $$('[data-close-all]', panel).forEach((el) => el.addEventListener('click', closePanel));

  // keep Tab inside the dialog
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button', panel).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (megaOpen) { setMega(false); hidePill(); svcBtn.focus(); }
    closePanel();
  });

  // panel is useless on desktop width: close if resized up
  window.matchMedia('(min-width: 1215px)').addEventListener('change', (m) => { if (m.matches) closePanel(); });

  /* ---------------- Scroll-driven state ---------------- */
  const hero = $('#rs-hero');
  const heroPct = $('#hero-pct');
  const heroStage = $('#hero-stage');
  const cards = $$('.stc-in');
  const procBar = $('#proc-bar');
  const stages = $('#stages');
  const slides = $$('.stg-s', stages);
  const dots = $$('.stg-d', stages);
  const dotsWrap = $('#stg-dots');

  const STG = [
    { track: '#D5DCE6', dfill: '#4BA8D9' },
    { track: 'rgba(30,42,74,.25)', dfill: '#1E2A4A' },
    { track: 'rgba(255,255,255,.22)', dfill: '#4BA8D9' },
    { track: '#D5DCE6', dfill: '#4BA8D9' },
  ];

  let heroP = -1, manualReveal = null, stgIdx = -1;

  function setHero(p) {
    if (Math.abs(p - heroP) < 0.005 && p !== 0 && p !== 1) return;
    heroP = p;
    hero.style.setProperty('--clip', (14 + p * 80) + '%');
    heroPct.textContent = String(Math.round(p * 100)).padStart(2, '0');
    heroStage.textContent = p >= 1 ? 'След ремонта' : p > 0.66 ? 'Довършителни работи' : p > 0.33 ? 'Груб ремонт' : 'Първоначално състояние';
  }

  function update() {
    ticking = false;
    if (reduced.matches) { setHero(1); return; }

    // Hero reveal
    const r = hero.getBoundingClientRect();
    let p = clamp(-r.top / (r.height * 0.6) + 0.02, 0, 1);
    if (manualReveal !== null) { if (r.top < -4) manualReveal = null; else p = manualReveal; }
    setHero(p);

    // Stacked service cards
    for (let i = 0; i < cards.length; i++) {
      let sp = 0;
      if (i < cards.length - 1) {
        const a = cards[i].getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
        sp = clamp(1 - (b.top - a.top - 20) / Math.max(1, a.height - 20), 0, 1);
      }
      const c = cards[i];
      c.style.setProperty('--sp', sp.toFixed(4));
      c.style.setProperty('--op', clamp(1 - Math.max(0, (sp - 0.6) / 0.4), 0, 1).toFixed(3));
      c.classList.toggle('is-covered', sp >= 0.99);
    }

    // Process line
    const pr = procBar.getBoundingClientRect(), wh = window.innerHeight;
    procBar.style.setProperty('--pp', clamp((wh * 0.9 - pr.top) / (wh * 0.6), 0, 1).toFixed(4));

    // Stages carousel
    const r2 = stages.getBoundingClientRect(), base = Math.max(560, vh || wh);
    const prog = clamp(-r2.top / Math.max(1, r2.height - base), 0, 0.9999);
    const idx = Math.floor(prog * 4), sub = prog * 4 - idx;
    if (idx !== stgIdx) {
      stgIdx = idx;
      slides.forEach((s, i) => {
        s.classList.toggle('is-on', i === idx);
        s.classList.toggle('is-prev', i < idx);
        s.setAttribute('aria-hidden', String(i !== idx));
      });
      dotsWrap.style.setProperty('--track', STG[idx].track);
      dotsWrap.style.setProperty('--dfill', STG[idx].dfill);
      dots.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'true' : 'false'));
    }
    dots.forEach((d, i) => d.style.setProperty('--fill', (i < idx ? 100 : i === idx ? sub * 100 : 0).toFixed(1) + '%'));
  }

  let ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const r = stages.getBoundingClientRect(), base = Math.max(560, vh || window.innerHeight);
    window.scrollTo({ top: window.scrollY + r.top + (r.height - base) * (i / 4) + 2, behavior: reduced.matches ? 'auto' : 'smooth' });
  }));

  $('#hero-hint').addEventListener('click', () => {
    manualReveal = heroP >= 1 ? 0 : 1;
    setHero(manualReveal);
  });

  /* ---------------- Marquee: duplicate content for a seamless loop ---------------- */
  const track = $('#mq-track');
  if (track) track.innerHTML += track.innerHTML;

  /* ---------------- Growing bars when the steps grid enters view ---------------- */
  const steps = $('.steps');
  if ('IntersectionObserver' in window && steps) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { steps.classList.add('in-view'); io.disconnect(); } }), { threshold: 0.3 });
    io.observe(steps);
  }

  /* ---------------- Builder chips ---------------- */
  const chips = $$('#chips .chip');
  const count = $('#chip-count');
  const recount = () => { count.textContent = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').length; };
  chips.forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    recount();
  }));
  recount();

  /* ---------------- Reviews: mouse drag with momentum + snap ---------------- */
  (function initDrag() {
    const el = $('#rv'); if (!el) return;
    let down = false, sx = 0, sl = 0, lx = 0, lt = 0, v = 0, raf = 0, moved = false;
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      down = true; moved = false; cancelAnimationFrame(raf);
      sx = lx = e.pageX; sl = el.scrollLeft; lt = performance.now(); v = 0;
      el.classList.add('drag'); e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!down) return;
      const now = performance.now(), dx = e.pageX - sx;
      if (Math.abs(dx) > 3) moved = true;
      el.scrollLeft = sl - dx;
      v = (e.pageX - lx) / Math.max(1, now - lt); lx = e.pageX; lt = now;
    });
    window.addEventListener('mouseup', () => {
      if (!down) return; down = false;
      let vel = reduced.matches ? 0 : -v * 16;
      const step = () => {
        if (Math.abs(vel) < 0.5) { el.classList.remove('drag'); return; } // snap restored
        el.scrollLeft += vel; vel *= 0.92; raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    el.addEventListener('keydown', (e) => {
      const card = el.firstElementChild; if (!card) return;
      const stepW = card.offsetWidth + 16;
      if (e.key === 'ArrowRight') { e.preventDefault(); el.scrollBy({ left: stepW, behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); el.scrollBy({ left: -stepW, behavior: 'smooth' }); }
    });
  })();

  /* ---------------- Init ---------------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { onResize(); onScroll(); if (!panel.hidden) matchBar(); });
  reduced.addEventListener('change', onScroll);
  onResize();
  update();
})();
