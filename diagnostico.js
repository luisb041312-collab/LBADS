(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const safe = (fn, name) => { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } };
  // Fuerza un reflow para que la transición arranque desde el estado actual.
  // Se usa en vez de requestAnimationFrame porque el navegador congela rAF
  // con la pestaña en segundo plano, y la secuencia se quedaría colgada.
  const flush = el => void (el || document.body).offsetHeight;

  /* -----------------------------------------------------------
     Modelo: 10 preguntas × 10 puntos = 100. Dos por pilar (20 c/u).
     ----------------------------------------------------------- */
  const PILARES = {
    oferta:    "Oferta",
    inversion: "Capacidad de inversión",
    proceso:   "Proceso comercial",
    presencia: "Presencia digital",
    potencial: "Potencial de crecimiento"
  };
  const MAX_PILAR = 20;
  const UMBRAL_FLOJO = 70; // % por debajo del cual se recomienda actuar

  const CONSEJOS = {
    oferta: "Define una oferta principal: un solo servicio, con precio y resultado claros. Los anuncios amplifican lo que ya vende; si la oferta es difusa, amplifican la confusión.",
    inversion: "Ajusta el presupuesto o el plazo. Por debajo de cierto umbral Meta no reúne datos suficientes para optimizar, y la campaña nunca sale de la fase de aprendizaje.",
    proceso: "Ordena la atención de los interesados: quién responde y en cuánto tiempo. Un mensaje contestado al día siguiente vale la mitad que uno contestado en minutos.",
    presencia: "Trabaja tu perfil antes de invertir. Quien ve tu anuncio te va a buscar, y si encuentra un perfil vacío o desactualizado, la duda mata la venta.",
    potencial: "Aclara tu objetivo y tu capacidad real: cuántos clientes al mes quieres y si podrías atenderlos. Sin ese número no hay forma de saber si la campaña funciona."
  };

  const state = { idx: 0, respuestas: {} };
  let screens = [], qScreens = [], progressBar, counter, topBar, backBtn;
  let bloqueado = false;

  const actual = () => screens[state.idx];
  const esPregunta = s => /^q\d+$/.test(s.dataset.screen);

  /* ----------------------------- Cromo ----------------------------- */

  function actualizarCromo() {
    const i = qScreens.indexOf(actual());
    const total = qScreens.length;

    if (progressBar) {
      let pct = 0;
      if (actual().dataset.screen === "result") pct = 100;
      else if (i >= 0) pct = Math.round((i / total) * 100);
      progressBar.style.width = pct + "%";
    }
    if (counter) {
      counter.textContent = i >= 0
        ? "Pregunta " + (i + 1) + " de " + total
        : (actual().dataset.screen === "result" ? "Diagnóstico completado" : "");
    }
    if (topBar) {
      const visible = actual().dataset.screen !== "intro";
      topBar.hidden = !visible;
      flush(topBar);
      topBar.classList.toggle("is-in", visible);
    }
    if (backBtn) backBtn.hidden = i <= 0;
  }

  function irA(nuevo) {
    if (nuevo < 0 || nuevo >= screens.length || nuevo === state.idx) return;
    const desde = actual();
    const hasta = screens[nuevo];
    desde.classList.add("is-leaving");
    desde.classList.remove("is-active");
    setTimeout(() => desde.classList.remove("is-leaving"), 600);

    state.idx = nuevo;
    hasta.classList.add("is-active");
    actualizarCromo();
  }

  /* --------------------------- Velos --------------------------- */

  async function mostrarVelo(nombre) {
    const velo = $('[data-veil="' + nombre + '"]');
    if (!velo) return null;
    velo.hidden = false;
    flush(velo);
    velo.classList.add("is-in");
    await wait(450);
    return velo;
  }

  async function ocultarVelo(velo) {
    if (!velo) return;
    velo.classList.remove("is-in");
    await wait(450);
    velo.hidden = true;
  }

  /* "Preparando tu diagnóstico…" ≈ 1s */
  async function preparar() {
    if (bloqueado) return;
    bloqueado = true;
    const velo = await mostrarVelo("prep");
    const barra = $("[data-prep-bar]");
    if (barra) { flush(barra); barra.style.width = "100%"; }
    await wait(1000);
    irA(1); // primera pregunta, ya detrás del velo
    await wait(150);
    await ocultarVelo(velo);
    if (barra) barra.style.width = "0%";
    bloqueado = false;
  }

  /* "Analizando tu negocio…" ≈ 2,6s, con los pilares marcándose uno a uno */
  async function analizar() {
    bloqueado = true;
    const velo = await mostrarVelo("analysis");
    const checks = $$("[data-check]");

    for (let i = 0; i < checks.length; i++) {
      checks[i].classList.add("is-in");
      await wait(200);
      checks[i].classList.add("is-done");
      const txt = $(".dg-check-txt", checks[i]);
      if (txt) txt.textContent = txt.textContent.replace("Analizando", "Analizado").replace("…", "");
      await wait(bloqueado ? 240 : 240);
    }
    await wait(450);

    irA(screens.length - 1);       // pantalla de resultado (detrás del velo)
    renderResultado();
    document.body.classList.add("is-result");
    document.documentElement.classList.remove("dg-lock"); // ya se puede recorrer
    window.scrollTo(0, 0);
    await wait(150);
    await ocultarVelo(velo);
    arrancarResultado();
    bloqueado = false;
  }

  /* --------------------------- Cálculo --------------------------- */

  function calcular() {
    const porPilar = {};
    Object.keys(PILARES).forEach(k => { porPilar[k] = 0; });
    let total = 0;
    Object.values(state.respuestas).forEach(r => {
      total += r.puntos;
      if (porPilar[r.pilar] !== undefined) porPilar[r.pilar] += r.puntos;
    });
    return { total: Math.round(total), porPilar };
  }

  function nivel(score) {
    if (score >= 85) return {
      titulo: "Excelente potencial de crecimiento",
      texto: "Tu negocio reúne las condiciones para escalar con anuncios. La oferta, el presupuesto y el proceso ya juegan a tu favor: lo que falta es ejecutar bien."
    };
    if (score >= 70) return {
      titulo: "Buen potencial de crecimiento",
      texto: "Tienes una base sólida para invertir. Ajustando los factores más flojos, cada peso invertido puede rendir bastante más de lo que rendiría hoy."
    };
    if (score >= 50) return {
      titulo: "Potencial con puntos por corregir",
      texto: "Hay una oportunidad real, pero conviene resolver los factores más bajos antes de invertir fuerte. Si no, el presupuesto se va sin dejar resultados."
    };
    return {
      titulo: "Aún no es el momento de escalar",
      texto: "Invertir hoy sería quemar presupuesto. Primero hay que construir las bases: sin ellas, los anuncios solo aceleran el problema."
    };
  }

  const escHTML = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  let datosResultado = null;

  function renderResultado() {
    const { total, porPilar } = calcular();
    const n = nivel(total);
    datosResultado = { total, porPilar };

    const lvl = $("[data-level]");
    const diag = $("[data-diagnosis]");
    if (lvl) lvl.textContent = n.titulo;
    if (diag) diag.textContent = n.texto;

    const orden = Object.keys(PILARES);

    // Pilares
    const cont = $("[data-pillars]");
    if (cont) {
      cont.innerHTML = orden.map((k, i) => {
        const pct = Math.round((porPilar[k] / MAX_PILAR) * 100);
        const flojo = pct < UMBRAL_FLOJO ? " is-weak" : "";
        return '<div class="dg-pillar-row' + flojo + '" style="--i:' + i + '" data-pct="' + pct + '">' +
                 '<div class="dg-pillar-top">' +
                   '<span class="dg-pillar-name">' + escHTML(PILARES[k]) + '</span>' +
                   '<span class="dg-pillar-pct">' + pct + '%</span>' +
                 '</div>' +
                 '<div class="dg-pillar-bar"><span></span></div>' +
               '</div>';
      }).join("");
    }

    // Recomendaciones: los pilares flojos, del más bajo al más alto
    const recs = $("[data-recs]");
    if (recs) {
      const flojos = orden
        .map(k => ({ k, pct: Math.round((porPilar[k] / MAX_PILAR) * 100) }))
        .filter(p => p.pct < UMBRAL_FLOJO)
        .sort((a, b) => a.pct - b.pct);

      if (!flojos.length) {
        recs.innerHTML = '<li class="dg-rec"><div>' +
          '<span class="dg-rec-name">Tienes las bases cubiertas</span>' +
          '<p class="dg-rec-txt">Los cinco factores están en verde. El siguiente paso ya no es corregir nada, sino construir la campaña con una estructura que permita escalar sin perder rentabilidad.</p>' +
          '</div></li>';
      } else {
        recs.innerHTML = flojos.map(p =>
          '<li class="dg-rec"><div>' +
            '<span class="dg-rec-name">' + escHTML(PILARES[p.k]) + '</span>' +
            '<p class="dg-rec-txt">' + escHTML(CONSEJOS[p.k]) + '</p>' +
          '</div></li>'
        ).join("");
      }
    }
  }

  function animarNumero(el, destino, dur) {
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(destino * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = destino;
    })(t0);
    // Red de seguridad: con la pestaña oculta el navegador congela
    // requestAnimationFrame; setTimeout sí llega y deja el valor final.
    setTimeout(() => { el.textContent = destino; }, dur + 400);
  }

  /* Arranca la coreografía del resultado: número → barra → bloques */
  function arrancarResultado() {
    if (!datosResultado) return;
    const { total } = datosResultado;
    const num = $("[data-score]");
    const bar = $("[data-score-bar]");

    if (num) animarNumero(num, total, 1100);
    if (bar) { flush(bar); bar.style.width = total + "%"; }

    // Barras de cada pilar
    setTimeout(() => {
      $$(".dg-pillar-row").forEach(row => {
        const span = $("span", $(".dg-pillar-bar", row));
        if (span) span.style.width = (row.dataset.pct || 0) + "%";
      });
    }, 700);

    // Bloques: aparecen al entrar en pantalla mientras se recorre
    const bloques = $$("[data-block]");
    if (!("IntersectionObserver" in window)) {
      bloques.forEach(b => b.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -8% 0px" });
    bloques.forEach(b => io.observe(b));

    // Red de seguridad: nada debe quedarse invisible
    setTimeout(() => {
      $$("[data-block]:not(.is-in)").forEach(b => {
        if (b.getBoundingClientRect().top < window.innerHeight) b.classList.add("is-in");
      });
    }, 6000);
  }

  /* --------------------------- Arranque --------------------------- */

  function initApp() {
    const app = $("[data-app]");
    if (!app) return;
    screens = $$(".dg-screen", app);
    qScreens = screens.filter(esPregunta);
    progressBar = $("[data-progress]");
    counter = $("[data-counter]");
    topBar = $("[data-top]");
    backBtn = $("[data-back]");

    const start = $("[data-start]");
    if (start) start.addEventListener("click", () => preparar());

    screens.forEach(screen => {
      const pilar = screen.dataset.pillar;
      const opts = $$(".dg-opt", screen);
      const grupo = $(".dg-opts", screen);
      opts.forEach(opt => {
        opt.addEventListener("click", async () => {
          if (bloqueado || opt.classList.contains("is-picked")) return;
          bloqueado = true;
          opts.forEach(o => o.classList.remove("is-picked"));
          opt.classList.add("is-picked");
          if (grupo) grupo.classList.add("is-locked");
          state.respuestas[screen.dataset.screen] = {
            puntos: parseInt(opt.dataset.points || "0", 10),
            pilar: pilar
          };
          await wait(420); // se ve la marca antes de pasar
          if (grupo) grupo.classList.remove("is-locked");
          bloqueado = false;

          const esUltima = qScreens.indexOf(screen) === qScreens.length - 1;
          if (esUltima) analizar();
          else irA(state.idx + 1);
        });
      });
    });

    if (backBtn) backBtn.addEventListener("click", () => { if (!bloqueado) irA(state.idx - 1); });

    const restart = $("[data-restart]");
    if (restart) restart.addEventListener("click", () => {
      state.respuestas = {};
      datosResultado = null;
      $$(".dg-opt.is-picked").forEach(o => o.classList.remove("is-picked"));
      $$("[data-block]").forEach(b => b.classList.remove("is-in"));
      $$("[data-check]").forEach(c => c.classList.remove("is-in", "is-done"));
      const num = $("[data-score]"), bar = $("[data-score-bar]");
      if (num) num.textContent = "0";
      if (bar) bar.style.width = "0%";
      document.body.classList.remove("is-result");
      window.scrollTo(0, 0);
      document.documentElement.classList.add("dg-lock");
      irA(0);
    });

    // Enter arranca desde la intro
    document.addEventListener("keydown", e => {
      if (e.key === "Enter" && actual().dataset.screen === "intro") {
        e.preventDefault();
        preparar();
      }
    });

    actualizarCromo();
  }

  function boot() {
    safe(initApp, "initApp");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
