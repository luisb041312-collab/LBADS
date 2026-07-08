(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ------------------------------------------------------------
     Splash — double safety (CSS animation at 2.8s is the backup)
     ------------------------------------------------------------ */
  function initSplash() {
    const splash = $("[data-splash]");
    if (!splash) return;
    const hide = () => splash.classList.add("is-out");
    // No esperar a que carguen fuentes/imágenes: el splash se va en cuanto hay DOM
    setTimeout(hide, 700);
    setTimeout(hide, 1600);
  }

  /* ------------------------------------------------------------
     Nav — solidify on scroll + mobile menu
     ------------------------------------------------------------ */
  function initNav() {
    const nav = $("[data-nav]");
    if (nav) {
      const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > 30);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const burger = $("[data-burger]");
    const menu = $("[data-menu]");
    if (burger && menu) {
      const close = () => {
        menu.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      };
      burger.addEventListener("click", () => {
        const open = menu.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", String(open));
        document.body.style.overflow = open ? "hidden" : "";
      });
      $$("a", menu).forEach(a => a.addEventListener("click", close));
    }
  }

  /* ------------------------------------------------------------
     Smooth anchors (native scroll, nav offset)
     ------------------------------------------------------------ */
  function initAnchors() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 84,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ------------------------------------------------------------
     Reveals — IO threshold 0.01 + 6s safety net
     ------------------------------------------------------------ */
  function initReveals() {
    const targets = $$(".reveal");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach(el => el.classList.add("is-visible"));
      return;
    }
    // Stagger siblings that reveal together
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.classList.contains("reveal")) : [el];
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 90, 450) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });
    targets.forEach(el => io.observe(el));

    setTimeout(() => {
      $$(".reveal:not(.is-visible)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ------------------------------------------------------------
     Tilt 3D (max ~6°) + hover halo position — desktop only
     ------------------------------------------------------------ */
  function initTilt() {
    if (!fineHover) return;
    $$("[data-tilt]").forEach(card => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      let raf = 0;
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--hx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--hy", (py * 100).toFixed(1) + "%");
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rx = ((py - 0.5) * -6).toFixed(2);
          const ry = ((px - 0.5) * 6).toFixed(2);
          card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px)";
        });
      });
      card.addEventListener("mouseout", e => {
        if (card.contains(e.relatedTarget)) return;
        cancelAnimationFrame(raf);
        card.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------
     Marquee — duplicate content for a seamless loop
     ------------------------------------------------------------ */
  function initMarquee() {
    const track = $("[data-marquee]");
    if (!track || track.dataset.cloned) return;
    track.dataset.cloned = "1";
    track.innerHTML += track.innerHTML;
  }

  /* ------------------------------------------------------------
     FAQ — close the others when one opens
     ------------------------------------------------------------ */
  function initFaq() {
    const wrap = $("[data-faq]");
    if (!wrap) return;
    $$("details", wrap).forEach(d => {
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        $$("details[open]", wrap).forEach(o => { if (o !== d) o.open = false; });
      });
    });
  }

  /* ------------------------------------------------------------
     Hero parallax — subtle, GSAP-gated
     ------------------------------------------------------------ */
  function initParallax() {
    if (reduced || !fineHover) return; // solo escritorio: en táctil cuesta fluidez
    const bg = $("[data-parallax]");
    if (!bg || !window.gsap || !window.ScrollTrigger) return;
    gsap.to(bg, {
      yPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
    });
  }

  function boot() {
    safe(initSplash, "initSplash");
    safe(initNav, "initNav");
    safe(initAnchors, "initAnchors");
    safe(initReveals, "initReveals");
    safe(initTilt, "initTilt");
    safe(initMarquee, "initMarquee");
    safe(initFaq, "initFaq");
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initParallax, "initParallax");
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
