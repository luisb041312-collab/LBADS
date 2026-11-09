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
    history: [], // pasos visitados, para que «Anterior» vuelva al paso real
    answers: {} // nombre, tipo, etapa, responde, presupuesto, email, whatsapp
  };

  // Pasos que no son preguntas (no cuentan en «1 / 7» ni en la barra)
  const NON_QUESTIONS = ["intro", "final", "nofit"];

  let steps = [];
  let progressBar, counter, backBtn;

  function currentStep() { return steps[state.idx]; }

  function isQuestion(step) {
    return !NON_QUESTIONS.includes(step.dataset.step);
  }

  function updateChrome() {
    const questions = steps.filter(isQuestion);
    const qIndex = questions.indexOf(currentStep());
    const total = questions.length;

    if (progressBar) {
      let pct = 0;
      const id = currentStep().dataset.step;
      if (id === "final" || id === "nofit") pct = 100;
      else if (qIndex >= 0) pct = Math.round((qIndex / total) * 100);
      progressBar.style.width = pct + "%";
    }
    if (counter) {
      counter.textContent = qIndex >= 0 ? (qIndex + 1) + " / " + total : "";
    }
    // En «nofit» no hay vuelta atrás: quien no cumple el filtro no puede cambiar la respuesta y agendar
    // En «final» el «Anterior» va dentro del paso (data-back-inline) para no tapar el texto
    const cur = currentStep().dataset.step;
    if (backBtn) backBtn.hidden = state.idx === 0 || cur === "nofit" || cur === "final";
  }

  function stepIndex(id) {
    return steps.findIndex(s => s.dataset.step === id);
  }

  function goTo(newIdx, isBack) {
    if (newIdx < 0 || newIdx >= steps.length || newIdx === state.idx) return;
    if (!isBack) state.history.push(state.idx);
    const from = currentStep();
    const to = steps[newIdx];
    from.classList.add("is-leaving");
    from.classList.remove("is-active");
    setTimeout(() => from.classList.remove("is-leaving"), 600);

    state.idx = newIdx;
    to.classList.add("is-active");
    updateChrome();

    if (to.dataset.step === "final") renderFinal();
    if (to.dataset.step === "nofit") renderNofit();

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
    // En «tipo» solo se avanza con «Continuar» cuando eligió «Otro»
    if (step.dataset.step === "tipo" && !state.answers.tipo) return;
    if (!validateAndStore(step)) return;
    if (step.dataset.step === "tipo" && state.otherSelected) {
      state.answers.tipo = "Otro: " + state.answers.tipo_otro;
    }
    goTo(state.idx + 1);
  }

  function renderNofit() {
    const a = state.answers;
    const nameEl = $("[data-nofit-name]");
    if (nameEl && a.nombre) nameEl.textContent = a.nombre.split(" ")[0];
    // Quitar cualquier enlace de agenda ya generado
    const link = $("[data-calendly]");
    if (link) link.removeAttribute("href");
  }

  function renderFinal() {
    // Defensa: sin «Sí» en la pregunta 5 no hay enlace de agenda
    if (state.rejected) { goTo(stepIndex("nofit")); return; }

    const a = state.answers;
    const nameEl = $("[data-final-name]");
    if (nameEl && a.nombre) nameEl.textContent = a.nombre.split(" ")[0];

    const summary = $("[data-summary]");
    if (summary) {
      const rows = [
        ["Tipo de negocio", a.tipo],
        ["Etapa", a.etapa],
        ["Quién atiende", a.responde],
        ["Presupuesto mensual", a.presupuesto]
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
        a.etapa && "Etapa: " + a.etapa,
        a.responde && "Quién atiende: " + a.responde,
        a.presupuesto && "Presupuesto $3-4M/mes: " + a.presupuesto,
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

          // «Otro tipo de negocio»: no avanza, pide escribir de qué es el negocio (obligatorio)
          const otherBox = $("[data-other-box]", step);
          if (otherBox) {
            const otherInput = $(".finput", otherBox);
            const isOther = opt.hasAttribute("data-other");
            state.otherSelected = isOther;
            otherBox.hidden = !isOther;
            otherInput.required = isOther;
            if (isOther) {
              setTimeout(() => {
                otherInput.focus({ preventScroll: true });
                // En celular el botón fijo «Anterior» taparía «Continuar»: centramos el campo
                const actions = $('.fstep-actions', otherBox);
                if (actions) actions.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 50);
              return;
            }
            otherInput.value = "";
            delete state.answers.tipo_otro;
          }

          // Filtro: una opción con data-reject termina el formulario sin agenda
          const reject = opt.hasAttribute("data-reject");
          if (step.dataset.step === "presupuesto") state.rejected = reject;
          setTimeout(() => {
            if (currentStep() !== step) return;
            goTo(reject ? stepIndex("nofit") : state.idx + 1);
          }, 320);
        });
      });
    });

    // Back
    const goBack = () => {
      if (currentStep().dataset.step === "nofit") return;
      const prev = state.history.length ? state.history.pop() : state.idx - 1;
      goTo(prev, true);
    };
    if (backBtn) backBtn.addEventListener("click", goBack);
    $$("[data-back-inline]").forEach(b => b.addEventListener("click", goBack));

    // Enter advances (except on the final step, where the CTA is a link)
    document.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const step = currentStep();
      if (step.dataset.step === "final" || step.dataset.step === "nofit") return;
      // Enter sobre una opción = elegirla (antes saltaba la pregunta sin guardar respuesta)
      const opt = e.target.closest && e.target.closest(".foption");
      if (opt) { e.preventDefault(); opt.click(); return; }
      // En pasos con opciones, Enter solo avanza desde un campo de texto (p. ej. «Otro»)
      if ($$(".foption", step).length && !(e.target.closest && e.target.closest(".finput"))) return;
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
