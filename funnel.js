(function () {
  "use strict";

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const brand = window.__BRAND__ || {};

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  const state = {
    idx: 0,
    answers: {} // nombre, tipo, negocio, experiencia, presupuesto, cuando, email, whatsapp
  };

  let steps = [];
  let progressBar, counter, backBtn;

  function currentStep() { return steps[state.idx]; }

  function isQuestion(step) {
    const id = step.dataset.step;
    return id !== "intro" && id !== "final";
  }

  function updateChrome() {
    const questions = steps.filter(isQuestion);
    const qIndex = questions.indexOf(currentStep());
    const total = questions.length;

    if (progressBar) {
      let pct = 0;
      if (currentStep().dataset.step === "final") pct = 100;
      else if (qIndex >= 0) pct = Math.round((qIndex / total) * 100);
      progressBar.style.width = pct + "%";
    }
    if (counter) {
      counter.textContent = qIndex >= 0 ? (qIndex + 1) + " / " + total : "";
    }
    if (backBtn) backBtn.hidden = state.idx === 0;
  }

  function goTo(newIdx) {
    if (newIdx < 0 || newIdx >= steps.length || newIdx === state.idx) return;
    const from = currentStep();
    const to = steps[newIdx];
    from.classList.add("is-leaving");
    from.classList.remove("is-active");
    setTimeout(() => from.classList.remove("is-leaving"), 600);

    state.idx = newIdx;
    to.classList.add("is-active");
    updateChrome();

    if (to.dataset.step === "final") renderFinal();

    // Focus the first input of the new step (slight delay for the transition)
    setTimeout(() => {
      const input = $(".finput", to);
      if (input) input.focus({ preventScroll: true });
    }, 350);
  }

  function validateAndStore(step) {
    const id = step.dataset.step;
    const inputs = $$(".finput", step);
    for (const input of inputs) {
      const value = input.value.trim();
      if (input.required && !value) {
        input.classList.add("is-error");
        input.addEventListener("input", () => input.classList.remove("is-error"), { once: true });
        input.focus();
        return false;
      }
      if (input.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        input.classList.add("is-error");
        input.addEventListener("input", () => input.classList.remove("is-error"), { once: true });
        input.focus();
        return false;
      }
      if (input.name) state.answers[input.name] = value;
    }
    void id;
    return true;
  }

  function next() {
    const step = currentStep();
    if (!validateAndStore(step)) return;
    goTo(state.idx + 1);
  }

  function renderFinal() {
    const a = state.answers;
    const nameEl = $("[data-final-name]");
    if (nameEl && a.nombre) nameEl.textContent = a.nombre.split(" ")[0];

    const summary = $("[data-summary]");
    if (summary) {
      const rows = [
        ["Negocio", [a.tipo, a.negocio].filter(Boolean).join(" — ")],
        ["Experiencia con Meta Ads", a.experiencia],
        ["Presupuesto mensual", a.presupuesto],
        ["Cuándo empezar", a.cuando]
      ].filter(r => r[1]);
      summary.innerHTML = rows.map(r =>
        "<div><strong>" + escHTML(r[0]) + ":</strong> " + escHTML(r[1]) + "</div>"
      ).join("");
    }

    const link = $("[data-calendly]");
    if (link) {
      const base = brand.calendly || "https://calendly.com/";
      const params = new URLSearchParams();
      if (a.nombre) params.set("name", a.nombre);
      if (a.email) params.set("email", a.email);
      // a1 prefills the first custom question of the Calendly event (if it exists)
      const resumen = [
        a.tipo && "Tipo: " + a.tipo,
        a.negocio && "Negocio: " + a.negocio,
        a.experiencia && "Experiencia: " + a.experiencia,
        a.presupuesto && "Presupuesto/mes: " + a.presupuesto,
        a.cuando && "Empezar: " + a.cuando,
        a.whatsapp && "WhatsApp: " + a.whatsapp
      ].filter(Boolean).join(" | ");
      if (resumen) params.set("a1", resumen);
      link.href = base + (base.includes("?") ? "&" : "?") + params.toString();
    }
  }

  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function initSteps() {
    const funnel = $("[data-funnel]");
    if (!funnel) return;
    steps = $$(".fstep", funnel);
    progressBar = $("[data-progress]");
    counter = $("[data-counter]");
    backBtn = $("[data-back]");

    // Next buttons
    $$("[data-next]").forEach(btn => btn.addEventListener("click", next));

    // Option cards: store the answer, mark it, advance after a beat
    steps.forEach(step => {
      $$(".foption", step).forEach(opt => {
        opt.addEventListener("click", () => {
          $$(".foption", step).forEach(o => o.classList.remove("is-selected"));
          opt.classList.add("is-selected");
          state.answers[step.dataset.step] = opt.dataset.value || opt.textContent.trim();
          setTimeout(() => { if (currentStep() === step) goTo(state.idx + 1); }, 320);
        });
      });
    });

    // Back
    if (backBtn) backBtn.addEventListener("click", () => goTo(state.idx - 1));

    // Enter advances (except on the final step, where the CTA is a link)
    document.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const step = currentStep();
      if (step.dataset.step === "final") return;
      if ($$(".foption", step).length && !e.target.closest(".foption")) return;
      e.preventDefault();
      next();
    });

    updateChrome();
  }

  function boot() {
    safe(initSteps, "initSteps");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
