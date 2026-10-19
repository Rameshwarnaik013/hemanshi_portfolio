/*
 * main.js — the site's motion.
 *
 * Choreography follows the HyperFrames motion rules (Apache-2.0, heygen-com/hyperframes,
 * skills/hyperframes-animation): power3.out as the house settle, smooth over bouncy,
 * count-up with dynamic scale and a suffix that lands after the number, SVG path draw,
 * staggered waterfall entries, sine-wave loops never in phase. The hand-drawn layer
 * (boil, brush wipe, grain) lives in ink.js.
 */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { gsap, ScrollTrigger, Ink } = window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ duration: 0.8, ease: "power3.out" });

  Ink.filmGrain($(".grain"));

  // ───────── text splitting ─────────
  $$(".split").forEach((el) => {
    el.innerHTML = el.textContent.split("").map((c) => `<span class="ch">${c}</span>`).join("");
  });
  $$(".split-words").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w"><span>${w}</span></span>`).join(" ");
  });

  // ───────── hand-drawn pieces ─────────
  const blobFill = $(".blob-fill"), blobClip = $(".blob-clip-path"), inks = $$(".blob-ink");
  Ink.boil($(".hero__blob"), reduce ? 0 : 8, (f) => {
    const d = Ink.blob(300, 300, 232, 1 + (f % 3) * 0.37, 0.05, 0.004);
    blobFill.setAttribute("d", d);
    blobClip.setAttribute("d", d);
    inks[0].setAttribute("d", Ink.blob(306, 294, 246, 11 + f, 0.05, 0.014));
    inks[1].setAttribute("d", Ink.blob(300, 300, 236, 23 + f * 1.7, 0.05, 0.016));
  });

  const swoosh = $(".swoosh path");
  swoosh.setAttribute("d", Ink.swoosh(400, 60, 4));

  const rings = $$(".stat[data-ring]").map((card) => {
    const path = $(".stat__ring", card);
    const state = { p: 0 };
    const paint = (f) => {
      path.setAttribute("d", Ink.wobblyRing(100, 100, 84, 5 + f, 0.012));
      path.style.strokeDasharray = "1 1";
      path.style.strokeDashoffset = String(1 - state.p);
      path.style.opacity = state.p > 0.002 ? 1 : 0;
    };
    Ink.boil(card, reduce ? 0 : 9, paint);
    return { card, state, paint, to: parseFloat(card.dataset.ring) };
  });

  const tlPath = $(".timeline__line path");
  (function () {
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push([2 + (Ink.hash(i * 3.3) - 0.5) * 1.6, i * 50]);
    tlPath.setAttribute("d", "M" + pts.map((p) => p.join(" ")).join(" L"));
    tlPath.style.strokeDasharray = "1 1";
    tlPath.style.strokeDashoffset = "1";
  })();

  // ───────── reduced motion: final states, no choreography ─────────
  if (reduce) {
    $(".intro") && $(".intro").remove();
    swoosh.style.strokeDasharray = "none";
    tlPath.style.strokeDashoffset = "0";
    rings.forEach((r) => { r.state.p = r.to; r.paint(0); });
    $$(".count").forEach((c) => (c.textContent = c.dataset.to));
    $(".typed").textContent = "long-term accounts";
    initNav();
    initReel();
    return;
  }

  // ───────── hero ─────────
  swoosh.style.strokeDasharray = "1 1";
  swoosh.style.strokeDashoffset = "1";
  const hero = gsap.timeline({ paused: true });
  hero
    .fromTo(".hero__name .ch", { yPercent: 112 }, { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.035 }, 0)
    .fromTo(".hero__blob", { scale: 0.55, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 1.4, ease: "expo.out", transformOrigin: "50% 50%" }, 0.05)
    .fromTo(".hero__photo", { clipPath: "inset(100% 0% 0% 0%)", scale: 1.08 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1.3, ease: "power4.out" }, 0.15)
    .fromTo(".hero .reveal-up", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, 0.45)
    .to(swoosh, { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" }, 0.95)
    .fromTo(".chip", { y: 18, scale: 0.85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, stagger: 0.14 }, 1.0)
    .add(startTyping, 1.6);

  // sine-wave idle: every chip on its own period and phase, so they never bob in unison
  $$(".chip").forEach((chip, i) => {
    gsap.to(chip, { yPercent: [-18, 14, -10][i], duration: 2.6 + i * 0.55, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.8 + i * 0.4 });
  });

  // scroll parallax on the portrait
  gsap.to(".hero__photo", { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__blob", { yPercent: -30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  const intro = $(".intro");
  if (intro) {
    intro.style.background = "transparent";
    Ink.brushWipe(intro, { onReveal: () => hero.play() });
  } else hero.play();

  // ───────── typed line: backspace-and-retype on a fixed slot ─────────
  function startTyping() {
    const el = $(".typed"), words = ["long-term accounts", "renewals", "upsells", "repeat business"];
    let w = 0;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    (async function loop() {
      for (;;) {
        await wait(2200);
        const cur = words[w];
        for (let i = cur.length; i >= 0; i--) { el.textContent = cur.slice(0, i); await wait(26); }
        w = (w + 1) % words.length;
        const next = words[w];
        await wait(220);
        for (let i = 1; i <= next.length; i++) { el.textContent = next.slice(0, i); await wait(48); }
      }
    })();
  }

  // ───────── section heads ─────────
  $$(".split-words").forEach((h) => {
    gsap.fromTo($$(".w > span", h), { yPercent: 108 }, {
      yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.06,
      scrollTrigger: { trigger: h, start: "top 85%", once: true },
    });
  });
  $$(".section .eyebrow").forEach((e) => {
    gsap.fromTo(e, { x: -16, opacity: 0 }, { x: 0, opacity: 1, scrollTrigger: { trigger: e, start: "top 90%", once: true } });
  });

  // generic waterfall entry
  ScrollTrigger.batch(".section .reveal-up, .stat, .skill-group, .cred-col, .lead, .contact__link", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, overwrite: true }),
  });

  // ───────── impact: count-up with dynamic scale, ring draws to its value ─────────
  $$(".stat").forEach((card) => {
    const count = $(".count", card), suffix = $(".suffix", card);
    const to = parseFloat(count.dataset.to), ring = rings.find((r) => r.card === card);
    const n = { v: 0 };
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: "top 80%", once: true }, delay: 0.25 });
    tl.set(suffix, { opacity: 0, y: 12 })
      .to(n, { v: to, duration: 1.5, ease: "power3.out", onUpdate: () => (count.textContent = Math.round(n.v)) }, 0)
      .fromTo(count, { scale: 0.55 }, { scale: 1, duration: 1.5, ease: "power3.out" }, 0)
      .to(suffix, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }, 1.25);
    if (ring) tl.to(ring.state, { p: ring.to, duration: 1.6, ease: "power3.inOut", onUpdate: () => ring.paint(Math.floor(performance.now() / 111)) }, 0);
  });


  // ───────── experience: the line draws as you read ─────────
  gsap.to(tlPath, {
    strokeDashoffset: 0, ease: "none",
    scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 65%", scrub: 0.6 },
  });
  $$(".job").forEach((job) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: job, start: "top 82%", once: true } });
    tl.fromTo(job, { opacity: 0 }, { opacity: 1, duration: 0.01 })
      .fromTo($(".job__dot", job), { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2)" }, 0)
      .fromTo($(".job__meta", job), { x: -20, opacity: 0 }, { x: 0, opacity: 1 }, 0.05)
      .fromTo($(".job__card", job), { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, 0.1)
      .fromTo($$("li, .tags span", job), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.045 }, 0.35);
  });

  // ───────── toolkit ─────────
  $$(".chips").forEach((c) => {
    gsap.fromTo(c.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.025, scrollTrigger: { trigger: c, start: "top 88%", once: true } });
  });
  $$(".langs i").forEach((bar, i) => {
    bar.style.setProperty("--fill", 0);
    ScrollTrigger.create({ trigger: bar, start: "top 92%", once: true, onEnter: () => setTimeout(() => bar.style.setProperty("--fill", 1), 150 + i * 140) });
  });

  // ───────── credentials ─────────
  $$(".lead__num:not(.lead__num--word)").forEach((el) => {
    const to = parseInt(el.textContent, 10), n = { v: 0 };
    gsap.to(n, { v: to, duration: 1.2, scrollTrigger: { trigger: el, start: "top 88%", once: true }, onUpdate: () => (el.textContent = Math.round(n.v)) });
  });

  // ───────── contact: tracking tightens from wide as it scales in ─────────
  gsap.fromTo(".contact__h", { letterSpacing: "0.04em", y: 40, opacity: 0 }, {
    letterSpacing: "-0.035em", y: 0, opacity: 1, duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: ".contact__h", start: "top 85%", once: true },
  });
  gsap.fromTo(".contact__sub, .contact .btn--big", { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, scrollTrigger: { trigger: ".contact__sub", start: "top 90%", once: true } });

  initNav();
  initReel();

  // ───────── nav ─────────
  function initNav() {
    const nav = $(".nav");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    $$(".nav__links a").forEach((a) => {
      const sec = $(a.getAttribute("href"));
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("is-active", s.isActive) });
    });
  }

  // ───────── reel: the HyperFrames composition, played live ─────────
  function initReel() {
    const stage = $(".reel__stage"), frame = $(".reel__stage iframe");
    const toggle = $('[data-reel="toggle"]'), replay = $('[data-reel="replay"]');
    const fit = () => { frame.style.transform = `scale(${stage.clientWidth / 1920})`; };
    new ResizeObserver(fit).observe(stage);
    fit();

    let tl = null, inView = false, userPaused = false;
    const sync = () => {
      if (!tl) return;
      if (inView && !userPaused) tl.play(); else tl.pause();
      toggle.textContent = userPaused ? "Play" : "Pause";
      toggle.setAttribute("aria-pressed", String(userPaused));
    };
    const hook = () => {
      const w = frame.contentWindow;
      const t = w && w.__timelines && w.__timelines.main;
      if (!t) return false;
      tl = t;
      tl.eventCallback("onComplete", () => { setTimeout(() => { if (!userPaused && inView) tl.restart(); }, 900); });
      if (reduce) { tl.progress(1).pause(); userPaused = true; }
      sync();
      return true;
    };
    frame.addEventListener("load", () => { if (!hook()) setTimeout(hook, 300); });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.35 }).observe(stage);
    toggle.addEventListener("click", () => { userPaused = !userPaused; sync(); });
    replay.addEventListener("click", () => { if (!tl) return; userPaused = false; tl.restart(); sync(); });
  }
})();
