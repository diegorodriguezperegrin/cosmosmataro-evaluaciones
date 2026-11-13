/**
 * Cosmos Mataró - Plataforma de Evaluación
 * Lógica de la aplicación web (SPA)
 */

(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "cosmos_mataro_eval_auth_v1";
  const DATA_CACHE_BUST = "20261113c";

  function fetchJson(url) {
    const bUrl = url.includes("?") ? `${url}&v=${DATA_CACHE_BUST}` : `${url}?v=${DATA_CACHE_BUST}`;
    return fetch(bUrl);
  }

  // Estado global de la aplicación
  const state = {
    auth: {
      isAuthenticated: false,
      email: "",
      clave: "",
      nombre: ""
    },
    pendingSessionId: null,
    isVerifyingAccess: false,
    sessionsData: null,
    currentSession: null,
    allSessionsPool: null, // Banco de preguntas combinadas de las 4 sesiones
    rawQuestions: [],
    questions: [],
    student: {
      name: "",
      email: ""
    },
    currentQuestionIndex: 0,
    answers: {}, // { [questionId]: optionIndex }
    feedbackComments: "",
    results: null
  };

  // Referencias al DOM
  const views = {
    access: document.getElementById("view-access"),
    sessions: document.getElementById("view-sessions"),
    registration: document.getElementById("view-registration"),
    quiz: document.getElementById("view-quiz"),
    results: document.getElementById("view-results")
  };

  const viewFocusTargets = {
    access: document.getElementById("access-heading"),
    sessions: document.getElementById("sessions-heading"),
    registration: document.getElementById("reg-heading"),
    quiz: document.getElementById("quiz-session-title"),
    results: document.getElementById("results-heading")
  };

  const elements = {
    // Header & Brand
    headerBadge: document.getElementById("header-session-badge"),
    headerUserPill: document.getElementById("header-user-pill"),
    headerUserEmail: document.getElementById("header-user-email"),
    btnLogout: document.getElementById("btn-logout"),

    // Acceso
    accessForm: document.getElementById("access-form"),
    accessEmail: document.getElementById("access-email"),
    accessKey: document.getElementById("access-key"),
    btnToggleKey: document.getElementById("btn-toggle-key"),
    btnAccessSubmit: document.getElementById("btn-access-submit"),
    accessErrorBanner: document.getElementById("access-error-banner"),
    accessCheckingBanner: document.getElementById("access-checking-banner"),
    
    // Sesiones
    sessionsGrid: document.getElementById("sessions-grid"),
    
    // Registro
    regSessionTitle: document.getElementById("reg-session-title"),
    regSubtitle: document.getElementById("reg-subtitle"),
    regInfoBanner: document.getElementById("reg-info-banner"),
    regIcon: document.getElementById("reg-icon"),
    regForm: document.getElementById("student-form"),
    studentName: document.getElementById("student-name"),
    studentEmail: document.getElementById("student-email"),
    studentEmailLabel: document.getElementById("student-email-label"),
    studentEmailHint: document.getElementById("student-email-hint"),
    btnStartQuiz: document.getElementById("btn-start-quiz"),
    btnStartQuizText: document.getElementById("btn-start-quiz-text"),
    btnBackToSessions: document.getElementById("btn-back-to-sessions"),
    
    // Quiz
    quizSessionTitle: document.getElementById("quiz-session-title"),
    quizProgressText: document.getElementById("quiz-progress-text"),
    quizProgressFill: document.getElementById("quiz-progress-fill"),
    questionNavStrip: document.getElementById("question-nav-strip"),
    questionNumber: document.getElementById("question-number"),
    questionPrompt: document.getElementById("question-prompt"),
    questionMedia: document.getElementById("question-media"),
    optionsList: document.getElementById("options-list"),
    qualityCommentsStep: document.getElementById("quality-comments-step"),
    qualityCommentsText: document.getElementById("quality-comments-text"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    btnSubmit: document.getElementById("btn-submit"),
    
    // Modal sin responder
    modalUnanswered: document.getElementById("modal-unanswered"),
    unansweredCount: document.getElementById("unanswered-count"),
    btnModalReview: document.getElementById("btn-modal-review"),
    btnModalConfirm: document.getElementById("btn-modal-confirm"),
    
    // Resultados
    scoreCircleContainer: document.getElementById("score-circle-container"),
    scoreNum: document.getElementById("score-num"),
    scoreTotalLabel: document.getElementById("score-total-label"),
    scoreBadge: document.getElementById("score-badge"),
    resultsStudent: document.getElementById("results-student"),
    resultsSession: document.getElementById("results-session"),
    resultsDate: document.getElementById("results-date"),
    syncStatus: document.getElementById("sync-status"),
    certInvitationBanner: document.getElementById("cert-invitation-banner"),
    reviewTitle: document.getElementById("review-title"),
    reviewIcon: document.getElementById("review-icon"),
    reviewList: document.getElementById("review-list"),
    btnPrintCert: document.getElementById("btn-print-cert"),
    btnGoGlobal: document.getElementById("btn-go-global"),
    btnRetry: document.getElementById("btn-retry"),
    btnRestart: document.getElementById("btn-restart"),
    
    // Certificado imprimible
    certName: document.getElementById("cert-student-name"),
    certSession: document.getElementById("cert-session-title"),
    certScore: document.getElementById("cert-score-detail"),
    certDate: document.getElementById("cert-date")
  };

  // Comprobar si la plataforma exige validación por correo y clave
  function isAccessRequired() {
    return typeof CONFIG === "undefined" || CONFIG.REQUIRE_ACCESS_KEY !== false;
  }

  function hasValidWebhookUrl() {
    const url = (typeof CONFIG !== "undefined" && CONFIG.GOOGLE_SHEETS_WEBHOOK_URL) || "";
    return Boolean(url && url.trim() !== "" && !url.includes("PEGAR_AQUI"));
  }

  // Persistencia segura en sessionStorage (resiliente dentro de iframes restringidos)
  function saveAuthSession(authObj) {
    try {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authObj));
    } catch (e) {
      // Ignorar si sessionStorage está bloqueado en iframe
    }
  }

  function loadAuthSession() {
    try {
      const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearAuthSession() {
    try {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      // Ignorar si sessionStorage está bloqueado en iframe
    }
  }

  // Validación progresiva tras interacción + sincronización ARIA (aria-invalid, aria-describedby, live region)
  const FormValidation = (() => {
    const interactionMap = new WeakMap();
    const announcedSet = new WeakSet();
    let announcer = null;
    let announceTimer = null;
    let announcedField = null;

    function ensureAnnouncer() {
      if (announcer) return announcer;
      announcer = document.createElement("div");
      announcer.setAttribute("aria-live", "polite");
      announcer.classList.add("visually-hidden");
      document.body.append(announcer);
      return announcer;
    }

    function spokenText(node) {
      const copy = node.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
      copy.querySelectorAll('[role="img"][aria-label]').forEach(n => {
        n.replaceWith(`${n.getAttribute("aria-label")}: `);
      });
      return copy.textContent.replace(/\s+/g, " ").trim();
    }

    function linkError(el, shown) {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(id => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
    }

    function announceError(el) {
      const errorEl = el.dataset.error ? document.getElementById(el.dataset.error) : null;
      if (!errorEl) return;
      const region = ensureAnnouncer();
      const label = el.labels && el.labels[0] ? `${spokenText(el.labels[0])}: ` : "";
      clearTimeout(announceTimer);
      region.textContent = "";
      announcedField = el;
      announceTimer = setTimeout(() => {
        region.textContent = label + spokenText(errorEl);
      }, 500);
    }

    function updateFieldState(el, { announce = false, forceValidate = false } = {}) {
      if (!el || !el.matches?.("input, select, textarea")) return true;
      if (el.readOnly || el.disabled) return true;

      const errorEl = el.dataset.error ? document.getElementById(el.dataset.error) : null;
      const fieldState = interactionMap.get(el) || { hasInteracted: false, hasBlurred: false, forced: false };

      if (forceValidate) {
        fieldState.hasInteracted = true;
        fieldState.hasBlurred = true;
        fieldState.forced = true;
        interactionMap.set(el, fieldState);
      }

      const valid = el.validity.valid;
      const shouldShow = !valid && (fieldState.forced || (fieldState.hasInteracted && fieldState.hasBlurred));

      el.classList.toggle("user-invalid-fallback", shouldShow);
      el.setAttribute("aria-invalid", shouldShow ? "true" : "false");
      linkError(el, shouldShow);
      if (errorEl) errorEl.hidden = !shouldShow;

      if (shouldShow) {
        if (announce && !announcedSet.has(el)) {
          announceError(el);
          announcedSet.add(el);
        }
      } else {
        announcedSet.delete(el);
        if (announcedField === el && announcer) {
          clearTimeout(announceTimer);
          announcer.textContent = "";
        }
      }

      return valid;
    }

    function attach(form) {
      if (!form) return;
      ensureAnnouncer();

      form.querySelectorAll("input, select, textarea").forEach(el => {
        if (!el.hasAttribute("aria-invalid")) {
          el.setAttribute("aria-invalid", "false");
        }
      });

      form.addEventListener("input", e => {
        const el = e.target;
        if (!el.matches?.("input, select, textarea")) return;
        const st = interactionMap.get(el) || { hasInteracted: false, hasBlurred: false, forced: false };
        st.hasInteracted = true;
        interactionMap.set(el, st);
        if (st.hasBlurred || st.forced || el.getAttribute("aria-invalid") === "true") {
          updateFieldState(el, { announce: false });
        }
      });

      form.addEventListener("blur", e => {
        const el = e.target;
        if (!el.matches?.("input, select, textarea")) return;
        const st = interactionMap.get(el) || { hasInteracted: false, hasBlurred: false, forced: false };
        st.hasBlurred = true;
        interactionMap.set(el, st);
        if (st.hasInteracted) {
          updateFieldState(el, { announce: true });
        }
      }, true);
    }

    function validateForm(form) {
      if (!form) return true;
      let firstInvalid = null;
      const controls = Array.from(form.querySelectorAll("input, select, textarea"));
      controls.forEach(el => {
        const valid = updateFieldState(el, { announce: false, forceValidate: true });
        if (!valid && !firstInvalid) {
          firstInvalid = el;
        }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    function resetForm(form) {
      if (!form) return;
      form.querySelectorAll("input, select, textarea").forEach(el => {
        interactionMap.delete(el);
        announcedSet.delete(el);
        el.classList.remove("user-invalid-fallback");
        el.setAttribute("aria-invalid", "false");
        linkError(el, false);
        const errorEl = el.dataset.error ? document.getElementById(el.dataset.error) : null;
        if (errorEl) errorEl.hidden = true;
      });
    }

    return { attach, validateForm, resetForm };
  })();

  // Inicialización de la aplicación
  async function init() {
    state.pendingSessionId = parseSessionFromUrl();
    FormValidation.attach(elements.accessForm);
    FormValidation.attach(elements.regForm);
    setupEventListeners();

    if (!isAccessRequired()) {
      state.auth.isAuthenticated = true;
      configureRegistrationEmailField(false);
      await loadSessionsData();
      navigateAfterAuth({ skipFocus: true });
      return;
    }

    configureRegistrationEmailField(true);
    const saved = loadAuthSession();

    if (saved && saved.email && saved.clave && hasValidWebhookUrl()) {
      if (elements.accessEmail) elements.accessEmail.value = saved.email;
      setCheckingBannerVisible(true);
      try {
        const result = await verifyAccessWithBackend(saved.email, saved.clave);
        setCheckingBannerVisible(false);
        if (result && result.status === "success" && result.authorized) {
          await completeAuthentication({
            email: result.email || saved.email,
            clave: saved.clave,
            nombre: result.nombre || saved.nombre || ""
          }, { skipFocus: true });
          return;
        }
        clearAuthSession();
      } catch (err) {
        setCheckingBannerVisible(false);
        clearAuthSession();
      }
    }

    switchView("access", { skipFocus: true });
  }

  // Configurar el campo de correo del formulario de registro según si hay control de acceso
  function configureRegistrationEmailField(lockedByAuth) {
    if (!elements.studentEmail) return;
    if (lockedByAuth) {
      elements.studentEmail.readOnly = true;
      elements.studentEmail.classList.add("is-readonly");
      if (elements.studentEmailLabel) {
        elements.studentEmailLabel.textContent = "Correu electrònic verificat";
      }
      if (elements.studentEmailHint) {
        elements.studentEmailHint.textContent = "Correu electrònic vinculat a la teva clau d'accés.";
      }
    } else {
      elements.studentEmail.readOnly = false;
      elements.studentEmail.classList.remove("is-readonly");
      if (elements.studentEmailLabel) {
        elements.studentEmailLabel.textContent = "Correu electrònic (opcional)";
      }
      if (elements.studentEmailHint) {
        elements.studentEmailHint.textContent = "Per rebre informació sobre properes observacions de Cosmos Mataró.";
      }
    }
  }

  // Cambio de vistas
  function switchView(viewName, options = {}) {
    Object.keys(views).forEach(key => {
      if (!views[key]) return;
      if (key === viewName) {
        views[key].classList.remove("hidden");
      } else {
        views[key].classList.add("hidden");
      }
    });
    if (!options.skipFocus) {
      const target = viewFocusTargets[viewName];
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderUserHeader() {
    if (!elements.headerUserPill || !elements.headerUserEmail) return;
    if (isAccessRequired() && state.auth.isAuthenticated && state.auth.email) {
      elements.headerUserEmail.textContent = state.auth.email;
      elements.headerUserPill.classList.remove("hidden");
    } else {
      elements.headerUserEmail.textContent = "";
      elements.headerUserPill.classList.add("hidden");
    }
  }

  function setCheckingBannerVisible(visible) {
    if (!elements.accessCheckingBanner) return;
    elements.accessCheckingBanner.classList.toggle("hidden", !visible);
  }

  function showAccessError(message, { moveFocus = true } = {}) {
    if (!elements.accessErrorBanner) return;
    elements.accessErrorBanner.textContent = message;
    elements.accessErrorBanner.classList.remove("hidden");
    if (moveFocus) {
      elements.accessErrorBanner.focus({ preventScroll: true });
    }
  }

  function clearAccessError() {
    if (!elements.accessErrorBanner) return;
    elements.accessErrorBanner.textContent = "";
    elements.accessErrorBanner.classList.add("hidden");
  }

  async function verifyAccessWithBackend(email, clave) {
    const webhookUrl = CONFIG.GOOGLE_SHEETS_WEBHOOK_URL;
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      redirect: "follow",
      body: JSON.stringify({
        action: "verify_access",
        email: email.trim().toLowerCase(),
        clave: clave.trim()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  }

  async function completeAuthentication(authInfo, options = {}) {
    state.auth = {
      isAuthenticated: true,
      email: authInfo.email,
      clave: authInfo.clave,
      nombre: authInfo.nombre || ""
    };

    state.student.email = authInfo.email;
    if (!state.student.name && authInfo.nombre) {
      state.student.name = authInfo.nombre;
    }

    saveAuthSession(state.auth);
    renderUserHeader();

    if (!state.sessionsData) {
      await loadSessionsData();
    }

    await navigateAfterAuth(options);
  }

  async function navigateAfterAuth(options = {}) {
    if (state.pendingSessionId && state.sessionsData) {
      const targetSession = state.pendingSessionId;
      state.pendingSessionId = null;
      await selectSession(targetSession);
    } else {
      switchView("sessions", options);
    }
  }

  function logoutStudent() {
    clearAuthSession();
    state.auth = {
      isAuthenticated: false,
      email: "",
      clave: "",
      nombre: ""
    };
    state.student = { name: "", email: "" };
    state.currentSession = null;
    state.rawQuestions = [];
    state.questions = [];
    state.answers = {};
    state.results = null;
    state.currentQuestionIndex = 0;

    if (elements.headerBadge) elements.headerBadge.classList.add("hidden");
    renderUserHeader();
    clearAccessError();

    if (elements.accessForm) {
      elements.accessForm.reset();
      FormValidation.resetForm(elements.accessForm);
    }
    if (elements.regForm) {
      elements.regForm.reset();
      FormValidation.resetForm(elements.regForm);
    }
    if (elements.accessKey && elements.btnToggleKey) {
      elements.accessKey.type = "password";
      elements.btnToggleKey.setAttribute("aria-pressed", "false");
      elements.btnToggleKey.setAttribute("aria-label", "Mostrar la clau d'accés");
      elements.btnToggleKey.textContent = "Mostrar";
    }

    switchView("access");
  }

  // Cargar metadatos de las sesiones
  async function loadSessionsData() {
    try {
      const response = await fetchJson("data/sesiones.json");
      if (!response.ok) throw new Error("Error al cargar data/sesiones.json");
      state.sessionsData = await response.json();
      renderSessionsGrid();
    } catch (error) {
      console.error(error);
      elements.sessionsGrid.innerHTML = `
        <div class="info-banner" style="border-left-color: var(--error);">
          <strong>Error de carga:</strong> No se han podido cargar los datos de las sesiones. 
          Asegúrate de ejecutar la app a través de un servidor web local o GitHub Pages.
        </div>`;
    }
  }

  // Renderizar tarjetas de las sesiones y del Examen Global
  function renderSessionsGrid() {
    if (!state.sessionsData || !state.sessionsData.sesiones) return;
    
    const normalSessions = state.sessionsData.sesiones.filter(s => !s.esGlobal && !s.esQualitat && s.id !== "qualitat");
    const globalSession = state.sessionsData.sesiones.find(s => s.esGlobal);
    const qualitySession = state.sessionsData.sesiones.find(s => s.esQualitat || s.id === "qualitat");

    let html = normalSessions.map(s => `
      <div class="session-item" data-session-id="${s.id}">
        <div class="session-badge">Sessió ${s.id} · Avaluació contínua</div>
        <div class="session-title">${escapeHtml(s.titulo)}</div>
        <div class="session-desc">${escapeHtml(s.descripcion)}</div>
        <div class="session-action">
          <span>Fer test de la sessió (20 preguntes)</span>
          <span>→</span>
        </div>
      </div>
    `).join("");

    if (globalSession) {
      html += `
        <div class="session-item session-item-global" data-session-id="${globalSession.id}">
          <div class="session-badge">
            <span>✨</span>
            <span>DIPLOMA OFICIAL · EXAMEN FINAL DEL CURS</span>
          </div>
          <div class="session-title">${escapeHtml(globalSession.titulo)}</div>
          <div class="session-desc">${escapeHtml(globalSession.descripcion)}</div>
          <div class="session-action">
            <span>Iniciar l'Examen Global de Certificació (20 preguntes)</span>
            <span>→</span>
          </div>
        </div>
      `;
    }

    if (qualitySession) {
      html += `
        <div class="session-item session-item-quality" data-session-id="${qualitySession.id}">
          <div class="session-badge">
            <span>⭐</span>
            <span>OPTATIVA · ENQUESTA DE QUALITAT DEL CURS</span>
          </div>
          <div class="session-title">${escapeHtml(qualitySession.titulo)}</div>
          <div class="session-desc">${escapeHtml(qualitySession.descripcion)}</div>
          <div class="session-action">
            <span>Emplenar l'enquesta de qualitat (10 preguntes + comentaris)</span>
            <span>→</span>
          </div>
        </div>
      `;
    }

    elements.sessionsGrid.innerHTML = html;

    elements.sessionsGrid.querySelectorAll(".session-item").forEach(item => {
      item.addEventListener("click", () => {
        const rawId = item.getAttribute("data-session-id");
        const id = isNaN(rawId) ? rawId : parseInt(rawId, 10);
        selectSession(id);
      });
    });
  }

  // Detectar parámetro ?sesion=X en la URL (ideal para Google Sites)
  function parseSessionFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const sesionParam = (urlParams.get("sesion") || urlParams.get("session") || "").toLowerCase().trim();
    if (!sesionParam) return null;

    if (sesionParam === "global" || sesionParam === "final" || sesionParam === "5" || sesionParam === "examen") {
      return "global";
    }

    if (sesionParam === "qualitat" || sesionParam === "calidad" || sesionParam === "encuesta" || sesionParam === "enquesta" || sesionParam === "feedback" || sesionParam === "quality") {
      return "qualitat";
    }

    const id = parseInt(sesionParam, 10);
    if (id >= 1 && id <= 4) {
      return id;
    }

    return null;
  }

  // Construir 20 preguntas equilibradas para el Examen Global (5 de cada sesión)
  function buildGlobalQuestions() {
    if (!state.allSessionsPool) return;
    const perSession = (typeof CONFIG !== "undefined" && CONFIG.QUESTIONS_PER_SESSION_IN_GLOBAL) || 5;

    const sample = (arr, n, prefix, sNum) => {
      return shuffleArray([...arr]).slice(0, n).map((q, idx) => ({
        ...q,
        id: `${prefix}_${q.id || idx}`,
        sesionOrigenNum: sNum,
        sesionOrigenNom: `Sessió ${sNum}`
      }));
    };

    const picked = [
      ...sample(state.allSessionsPool.s1, perSession, "s1", 1),
      ...sample(state.allSessionsPool.s2, perSession, "s2", 2),
      ...sample(state.allSessionsPool.s3, perSession, "s3", 3),
      ...sample(state.allSessionsPool.s4, perSession, "s4", 4)
    ];

    state.rawQuestions = picked;
    state.questions = shuffleArray([...picked]);
  }

  // Seleccionar una sesión o el Examen Global y cargar sus preguntas
  async function selectSession(sessionId) {
    if (isAccessRequired() && !state.auth.isAuthenticated) {
      state.pendingSessionId = sessionId;
      switchView("access");
      return;
    }

    if (!state.sessionsData || !state.sessionsData.sesiones) return;

    const session = state.sessionsData.sesiones.find(s => 
      s.id === sessionId || 
      String(s.id) === String(sessionId) || 
      (sessionId === 5 && s.esGlobal) || 
      (sessionId === "global" && s.esGlobal) ||
      (sessionId === "final" && s.esGlobal) ||
      ((sessionId === "qualitat" || sessionId === "calidad" || sessionId === "encuesta" || sessionId === "enquesta" || sessionId === "quality") && (s.esQualitat || s.id === "qualitat"))
    );
    if (!session) return;

    state.currentSession = session;
    const isQuality = Boolean(session.esQualitat || session.id === "qualitat");

    if (session.esGlobal) {
      elements.headerBadge.textContent = "🎓 Examen Global";
      elements.headerBadge.className = "header-badge badge-global";
    } else if (isQuality) {
      elements.headerBadge.textContent = "⭐ Enquesta de Qualitat";
      elements.headerBadge.className = "header-badge badge-quality";
    } else {
      elements.headerBadge.textContent = `Sessió ${session.id}`;
      elements.headerBadge.className = "header-badge";
    }
    elements.headerBadge.classList.remove("hidden");
    elements.regSessionTitle.textContent = session.titulo;

    if (elements.regIcon) {
      elements.regIcon.textContent = isQuality ? "⭐" : (session.esGlobal ? "🎓" : "👨‍🚀");
    }
    if (elements.regSubtitle) {
      elements.regSubtitle.textContent = isQuality
        ? "La teva opinió ens ajuda a millorar el curs. Si us plau, confirma les teves dades per associar la teva valoració."
        : "Si us plau, introdueix les teves dades per emetre el teu certificat d'aprofitament i registrar els teus resultats.";
    }
    if (elements.regInfoBanner) {
      elements.regInfoBanner.innerHTML = isQuality
        ? "<strong>Pautes de l'enquesta:</strong> Disposes de <strong>10 preguntes</strong> de valoració (amb 4 opcions a escollir) i un <strong>camp lliure de comentaris</strong>. Pots avançar i retrocedir tantes vegades com vulguis abans de l'enviament final."
        : "<strong>Pautes de l'avaluació:</strong> Disposes de <strong>20 preguntes</strong>. Pots avançar i retrocedir entre les preguntes tantes vegades com vulguis abans de l'enviament final.";
    }
    if (elements.btnStartQuizText) {
      elements.btnStartQuizText.textContent = isQuality ? "Començar l'Enquesta de Qualitat" : "Començar l'Avaluació";
    }

    // Preservar datos del alumne / autoomplir des de l'accés verificat
    if (elements.studentName) {
      elements.studentName.value = state.student.name || state.auth.nombre || "";
    }
    if (elements.studentEmail) {
      elements.studentEmail.value = isAccessRequired()
        ? (state.auth.email || state.student.email || "")
        : (state.student.email || "");
    }

    try {
      if (session.esGlobal) {
        // Cargar en paralelo las 4 sesiones si aún no están en memoria
        if (!state.allSessionsPool) {
          const [d1, d2, d3, d4] = await Promise.all([
            fetchJson("data/sesion-1.json").then(r => { if (!r.ok) throw new Error("sesion-1.json"); return r.json(); }),
            fetchJson("data/sesion-2.json").then(r => { if (!r.ok) throw new Error("sesion-2.json"); return r.json(); }),
            fetchJson("data/sesion-3.json").then(r => { if (!r.ok) throw new Error("sesion-3.json"); return r.json(); }),
            fetchJson("data/sesion-4.json").then(r => { if (!r.ok) throw new Error("sesion-4.json"); return r.json(); })
          ]);
          state.allSessionsPool = {
            s1: d1.preguntas || [],
            s2: d2.preguntas || [],
            s3: d3.preguntas || [],
            s4: d4.preguntas || []
          };
        }
        buildGlobalQuestions();
      } else if (isQuality) {
        const resp = await fetchJson(session.archivo || "data/qualitat.json");
        if (!resp.ok) throw new Error(`No s'ha pogut carregar ${session.archivo || "data/qualitat.json"}`);
        const data = await resp.json();
        state.rawQuestions = data.preguntas || [];
        state.questions = [...state.rawQuestions]; // Ordre lògic sense barallar
        state.feedbackComments = "";
      } else {
        const resp = await fetchJson(session.archivo);
        if (!resp.ok) throw new Error(`No s'ha pogut carregar ${session.archivo}`);
        const data = await resp.json();
        state.rawQuestions = data.preguntas || [];
        state.questions = (typeof CONFIG !== "undefined" && CONFIG.SHUFFLE_QUESTIONS !== false)
          ? shuffleArray([...state.rawQuestions])
          : [...state.rawQuestions];
      }

      state.answers = {};
      state.currentQuestionIndex = 0;

      switchView("registration");
    } catch (err) {
      alert(`Error en carregar les preguntes: ${err.message}`);
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Mostrar / ocultar clave de acceso
    if (elements.btnToggleKey && elements.accessKey) {
      elements.btnToggleKey.addEventListener("click", () => {
        const isCurrentlyHidden = elements.accessKey.type === "password";
        elements.accessKey.type = isCurrentlyHidden ? "text" : "password";
        elements.btnToggleKey.setAttribute("aria-pressed", isCurrentlyHidden ? "true" : "false");
        elements.btnToggleKey.setAttribute(
          "aria-label",
          isCurrentlyHidden ? "Ocultar la clau d'accés" : "Mostrar la clau d'accés"
        );
        elements.btnToggleKey.textContent = isCurrentlyHidden ? "Ocultar" : "Mostrar";
      });
    }

    // Cerrar sesión / cambiar de alumno
    if (elements.btnLogout) {
      elements.btnLogout.addEventListener("click", () => {
        logoutStudent();
      });
    }

    // Envío del formulario de control de acceso
    if (elements.accessForm) {
      elements.accessForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (state.isVerifyingAccess) return;

        clearAccessError();

        if (!FormValidation.validateForm(elements.accessForm)) {
          return;
        }

        const email = elements.accessEmail.value.trim().toLowerCase();
        const clave = elements.accessKey.value.trim();

        if (!hasValidWebhookUrl()) {
          showAccessError(
            "La validació d'accés encara no està configurada al servidor (Google Apps Script)."
          );
          return;
        }

        const origBtnHtml = elements.btnAccessSubmit.innerHTML;
        state.isVerifyingAccess = true;
        elements.btnAccessSubmit.disabled = true;
        elements.btnAccessSubmit.innerHTML = "<span>⏳ Verificant l'accés...</span>";

        try {
          const result = await verifyAccessWithBackend(email, clave);
          if (result && result.status === "success" && result.authorized) {
            await completeAuthentication({
              email: result.email || email,
              clave,
              nombre: result.nombre || ""
            });
          } else {
            showAccessError(
              (result && result.message) ||
                "El correu electrònic o la clau d'accés no són vàlids, o l'accés no està activat."
            );
          }
        } catch (err) {
          console.error("Error verificant l'accés:", err);
          showAccessError(
            "No s'ha pogut connectar amb el servidor de validació. Comprova la teva connexió i torna-ho a provar."
          );
        } finally {
          state.isVerifyingAccess = false;
          elements.btnAccessSubmit.disabled = false;
          elements.btnAccessSubmit.innerHTML = origBtnHtml;
        }
      });
    }

    // Volver a selector de sesiones
    elements.btnBackToSessions.addEventListener("click", () => {
      elements.headerBadge.classList.add("hidden");
      switchView("sessions");
    });

    // Envío del formulario de registro del alumno
    elements.regForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!FormValidation.validateForm(elements.regForm)) {
        return;
      }

      const name = elements.studentName.value.trim();
      const email = isAccessRequired()
        ? (state.auth.email || elements.studentEmail.value.trim())
        : elements.studentEmail.value.trim();

      state.student.name = name;
      state.student.email = email;

      await startQuiz();
    });

    // Navegación del cuestionario
    elements.btnPrev.addEventListener("click", () => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderCurrentQuestion();
      }
    });

    elements.btnNext.addEventListener("click", () => {
      const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));
      const maxIndex = isQuality ? state.questions.length : state.questions.length - 1;
      if (state.currentQuestionIndex < maxIndex) {
        state.currentQuestionIndex++;
        renderCurrentQuestion();
      }
    });

    elements.btnSubmit.addEventListener("click", () => {
      handleQuizSubmissionAttempt();
    });

    // Comentaris de l'enquesta de qualitat
    if (elements.qualityCommentsText) {
      elements.qualityCommentsText.addEventListener("input", (e) => {
        state.feedbackComments = e.target.value;
      });
    }

    // Modal de preguntas sin responder
    elements.btnModalReview.addEventListener("click", () => {
      elements.modalUnanswered.classList.remove("active");
      // Ir a la primera pregunta sin responder
      const firstUnansweredIndex = state.questions.findIndex(q => state.answers[q.id] === undefined);
      if (firstUnansweredIndex !== -1) {
        state.currentQuestionIndex = firstUnansweredIndex;
        renderCurrentQuestion();
      }
    });

    elements.btnModalConfirm.addEventListener("click", () => {
      elements.modalUnanswered.classList.remove("active");
      finalizeAndScoreQuiz();
    });

    // Generar / Descarregar diploma en PDF
    elements.btnPrintCert.addEventListener("click", () => {
      openCertificatePrintWindow();
    });

    // Anar directament a l'Examen Global de Certificació
    if (elements.btnGoGlobal) {
      elements.btnGoGlobal.addEventListener("click", () => {
        selectSession("global");
      });
    }

    // Repetir el mateix test (amb preguntes barallades)
    if (elements.btnRetry) {
      elements.btnRetry.addEventListener("click", async () => {
        await startQuiz();
      });
    }

    // Reiniciar / Otra sesión
    elements.btnRestart.addEventListener("click", () => {
      elements.headerBadge.classList.add("hidden");
      switchView("sessions");
    });

    // Atajos de teclado (1-4 para opciones, flechas para navegar)
    window.addEventListener("keydown", (e) => {
      if (views.quiz.classList.contains("hidden")) return;
      if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;

      const key = e.key;
      const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));
      const maxIndex = isQuality ? state.questions.length : state.questions.length - 1;

      if (["1", "2", "3", "4"].includes(key) && state.currentQuestionIndex < state.questions.length) {
        const optionIndex = parseInt(key, 10) - 1;
        selectOption(optionIndex);
      } else if (key === "ArrowLeft" && state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderCurrentQuestion();
      } else if (key === "ArrowRight" && state.currentQuestionIndex < maxIndex) {
        state.currentQuestionIndex++;
        renderCurrentQuestion();
      }
    });
  }

  // Iniciar la evaluación (re-baralla sempre l'ordre de les preguntes a cada intent)
  async function startQuiz() {
    if (isAccessRequired() && !state.auth.isAuthenticated) {
      switchView("access");
      return;
    }

    const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));

    // Si és l'examen global, assegurar la reserva i extreure 5 preguntes noves de cada sessió barallades
    if (state.currentSession && state.currentSession.esGlobal) {
      if (!state.allSessionsPool) {
        const [d1, d2, d3, d4] = await Promise.all([
          fetchJson("data/sesion-1.json").then(r => { if (!r.ok) throw new Error("sesion-1.json"); return r.json(); }),
          fetchJson("data/sesion-2.json").then(r => { if (!r.ok) throw new Error("sesion-2.json"); return r.json(); }),
          fetchJson("data/sesion-3.json").then(r => { if (!r.ok) throw new Error("sesion-3.json"); return r.json(); }),
          fetchJson("data/sesion-4.json").then(r => { if (!r.ok) throw new Error("sesion-4.json"); return r.json(); })
        ]);
        state.allSessionsPool = {
          s1: d1.preguntas || [],
          s2: d2.preguntas || [],
          s3: d3.preguntas || [],
          s4: d4.preguntas || []
        };
      }
      buildGlobalQuestions();
    } else if (isQuality) {
      state.questions = [...state.rawQuestions];
      state.feedbackComments = "";
      if (elements.qualityCommentsText) {
        elements.qualityCommentsText.value = "";
      }
    } else if (typeof CONFIG !== "undefined" && CONFIG.SHUFFLE_QUESTIONS !== false && state.rawQuestions.length > 0) {
      state.questions = shuffleArray([...state.rawQuestions]);
    } else if (state.rawQuestions.length > 0) {
      state.questions = [...state.rawQuestions];
    }

    state.answers = {};
    state.currentQuestionIndex = 0;

    elements.quizSessionTitle.textContent = state.currentSession.titulo;
    renderNavStrip();
    renderCurrentQuestion();
    switchView("quiz");
  }

  // Renderizar la barra de navegación de píldoras (1..20 o 1..10 + comentaris)
  function renderNavStrip() {
    const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));

    let html = state.questions.map((q, idx) => {
      const num = idx + 1;
      const isAnswered = state.answers[q.id] !== undefined;
      const isCurrent = idx === state.currentQuestionIndex;

      let classes = "nav-pill";
      if (isCurrent) classes += " current";
      else if (isAnswered) classes += " answered";

      return `<button type="button" class="${classes}" data-index="${idx}">${num}</button>`;
    }).join("");

    if (isQuality) {
      const isCurrent = state.currentQuestionIndex === state.questions.length;
      const hasComment = Boolean(state.feedbackComments && state.feedbackComments.trim().length > 0);
      let classes = "nav-pill pill-comments";
      if (isCurrent) classes += " current";
      else if (hasComment) classes += " answered";
      html += `<button type="button" class="${classes}" data-index="${state.questions.length}" title="Comentaris i propostes">💬 Comentaris</button>`;
    }

    elements.questionNavStrip.innerHTML = html;

    elements.questionNavStrip.querySelectorAll(".nav-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        state.currentQuestionIndex = parseInt(btn.getAttribute("data-index"), 10);
        renderCurrentQuestion();
      });
    });
  }

  // Renderizar la pregunta actual o el paso de comentarios
  function renderCurrentQuestion() {
    const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));
    const totalQuestions = state.questions.length;
    const totalSteps = isQuality ? totalQuestions + 1 : totalQuestions;

    // ¿Estamos en el paso final de comentarios de calidad?
    if (isQuality && state.currentQuestionIndex === totalQuestions) {
      elements.optionsList.classList.add("hidden");
      if (elements.questionMedia) elements.questionMedia.classList.add("hidden");

      if (elements.qualityCommentsStep) {
        elements.qualityCommentsStep.classList.remove("hidden");
        if (elements.qualityCommentsText) {
          elements.qualityCommentsText.value = state.feedbackComments || "";
        }
      }

      elements.quizProgressText.textContent = "Comentaris i suggeriments (Pas final)";
      elements.quizProgressFill.style.width = "100%";

      elements.questionNumber.textContent = "💬 Comentaris i propostes de millora";
      elements.questionPrompt.textContent = "Aquest espai és opcional. Pots indicar aspectes que t'han agradat especialment, crítiques constructives o propostes per a properes edicions del curs:";

      elements.btnPrev.disabled = false;
      elements.btnPrev.style.visibility = "visible";
      elements.btnPrev.querySelector("span").textContent = `← Pregunta ${totalQuestions}`;
      elements.btnNext.classList.add("hidden");
      elements.btnSubmit.classList.remove("hidden");
      elements.btnSubmit.querySelector("span").textContent = "Finalitzar i Enviar l'Enquesta ✓";

      renderNavStrip();
      return;
    }

    if (elements.qualityCommentsStep) {
      elements.qualityCommentsStep.classList.add("hidden");
    }
    elements.optionsList.classList.remove("hidden");

    const q = state.questions[state.currentQuestionIndex];
    if (!q) return;

    const currentNum = state.currentQuestionIndex + 1;

    // Actualizar progreso
    elements.quizProgressText.textContent = `Pregunta ${currentNum} de ${totalQuestions}`;
    const percentProgress = (currentNum / totalSteps) * 100;
    elements.quizProgressFill.style.width = `${percentProgress}%`;

    elements.questionNumber.textContent = `Pregunta ${currentNum}`;
    elements.questionPrompt.textContent = q.pregunta;

    // Renderizar gráfico opcional de la pregunta
    if (elements.questionMedia) {
      if (q.imagen) {
        elements.questionMedia.innerHTML = buildMediaFigureHtml({
          src: q.imagen,
          alt: q.imagenAlt || q.pregunta,
          caption: q.imagenPie || "",
          width: q.imagenAncho || 680,
          height: q.imagenAlto || 420,
          figureClass: "question-figure",
          lazy: false
        });
        elements.questionMedia.classList.remove("hidden");
      } else {
        elements.questionMedia.innerHTML = "";
        elements.questionMedia.classList.add("hidden");
      }
    }

    // Renderizar opciones A, B, C, D
    const letters = ["A", "B", "C", "D"];
    const currentSelected = state.answers[q.id];

    elements.optionsList.innerHTML = q.opciones.map((optText, optIdx) => {
      const isSelected = currentSelected === optIdx;
      return `
        <div class="option-item ${isSelected ? "selected" : ""}" data-opt-index="${optIdx}">
          <div class="option-letter">${letters[optIdx]}</div>
          <div class="option-text">${escapeHtml(optText)}</div>
        </div>
      `;
    }).join("");

    elements.optionsList.querySelectorAll(".option-item").forEach(item => {
      item.addEventListener("click", () => {
        const optIdx = parseInt(item.getAttribute("data-opt-index"), 10);
        selectOption(optIdx);
      });
    });

    // Actualizar botones prev/next/submit
    elements.btnPrev.disabled = state.currentQuestionIndex === 0;
    elements.btnPrev.style.visibility = state.currentQuestionIndex === 0 ? "hidden" : "visible";
    elements.btnPrev.querySelector("span").textContent = "← Anterior";

    if (isQuality) {
      if (state.currentQuestionIndex === totalQuestions - 1) {
        elements.btnNext.classList.remove("hidden");
        elements.btnNext.querySelector("span").textContent = "Següent (Comentaris) →";
        elements.btnSubmit.classList.add("hidden");
      } else {
        elements.btnNext.classList.remove("hidden");
        elements.btnNext.querySelector("span").textContent = "Següent →";
        elements.btnSubmit.classList.add("hidden");
      }
    } else {
      if (state.currentQuestionIndex === totalQuestions - 1) {
        elements.btnNext.classList.add("hidden");
        elements.btnSubmit.classList.remove("hidden");
        elements.btnSubmit.querySelector("span").textContent = "Finalitzar i Enviar l'Avaluació ✓";
      } else {
        elements.btnNext.classList.remove("hidden");
        elements.btnNext.querySelector("span").textContent = "Següent →";
        elements.btnSubmit.classList.add("hidden");
      }
    }

    renderNavStrip();
  }

  // Seleccionar una opción
  function selectOption(optionIndex) {
    const q = state.questions[state.currentQuestionIndex];
    if (!q) return;

    state.answers[q.id] = optionIndex;
    renderCurrentQuestion();

    const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));
    const totalSteps = isQuality ? state.questions.length + 1 : state.questions.length;

    // Avance automático a la siguiente pregunta tras 250ms para una experiencia muy fluida
    if (state.currentQuestionIndex < totalSteps - 1) {
      setTimeout(() => {
        state.currentQuestionIndex++;
        renderCurrentQuestion();
      }, 250);
    }
  }
  // Intento de envío
  function handleQuizSubmissionAttempt() {
    const total = state.questions.length;
    const answeredCount = Object.keys(state.answers).length;
    const unanswered = total - answeredCount;

    if (unanswered > 0) {
      elements.unansweredCount.textContent = unanswered;
      elements.modalUnanswered.classList.add("active");
    } else {
      finalizeAndScoreQuiz();
    }
  }

  // Calcular calificación y mostrar resultados
  async function finalizeAndScoreQuiz() {
    if (isAccessRequired() && !state.auth.isAuthenticated) {
      switchView("access");
      return;
    }

    const isQuality = Boolean(state.currentSession && (state.currentSession.esQualitat || state.currentSession.id === "qualitat"));

    if (isQuality) {
      if (elements.qualityCommentsText) {
        state.feedbackComments = elements.qualityCommentsText.value.trim();
      }

      const total = state.questions.length;
      const reviewDetails = [];
      const letters = ["A", "B", "C", "D"];

      state.questions.forEach(q => {
        const selected = state.answers[q.id];
        const respuestaTexto = (selected !== undefined && q.opciones && q.opciones[selected]) ? q.opciones[selected] : "";
        const letra = (selected !== undefined && letters[selected]) ? letters[selected] : "";

        reviewDetails.push({
          id: q.id,
          categoria: q.categoria || "",
          pregunta: q.pregunta,
          opciones: q.opciones,
          seleccionada: selected !== undefined ? selected : -1,
          respuestaTexto,
          letra
        });
      });

      state.results = {
        isQuality: true,
        score: Object.keys(state.answers).length,
        total,
        comments: state.feedbackComments || "",
        reviewDetails,
        date: new Date().toLocaleDateString("ca-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      };

      renderResultsView();
      switchView("results");
      await submitResultsToGoogleSheets();
      return;
    }

    let score = 0;
    const total = state.questions.length;
    const reviewDetails = [];

    state.questions.forEach(q => {
      const selected = state.answers[q.id];
      const isCorrect = selected === q.correcta;
      if (isCorrect) score++;

      reviewDetails.push({
        id: q.id,
        pregunta: q.pregunta,
        imagen: q.imagen || "",
        imagenAlt: q.imagenAlt || "",
        imagenPie: q.imagenPie || "",
        imagenExplicacion: q.imagenExplicacion || "",
        imagenExplicacionAlt: q.imagenExplicacionAlt || "",
        imagenExplicacionPie: q.imagenExplicacionPie || "",
        imagenAncho: q.imagenAncho || 680,
        imagenAlto: q.imagenAlto || 420,
        opciones: q.opciones,
        correcta: q.correcta,
        seleccionada: selected !== undefined ? selected : -1,
        acierto: isCorrect,
        explicacion: q.explicacion || "",
        sesionOrigenNom: q.sesionOrigenNom || ""
      });
    });

    const percent = Math.round((score / total) * 100);
    const passThreshold = CONFIG.PASS_PERCENT || 60;
    const excellentThreshold = CONFIG.EXCELLENT_PERCENT || 85;

    let calificacion = "fail";
    let badgeText = "Necessita repàs";
    if (percent >= excellentThreshold) {
      calificacion = "excellent";
      badgeText = "¡Excel·lent!";
    } else if (percent >= passThreshold) {
      calificacion = "pass";
      badgeText = "¡Apte!";
    }

    state.results = {
      score,
      total,
      percent,
      calificacion,
      badgeText,
      reviewDetails,
      date: new Date().toLocaleDateString("ca-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    renderResultsView();
    switchView("results");

    // Enviar resultados al webhook de Google Sheets (si está configurado)
    await submitResultsToGoogleSheets();
  }

  // Renderizar la vista de resultados
  function renderResultsView() {
    const res = state.results;
    const isQuality = Boolean(res && res.isQuality);
    const isGlobal = !!(!isQuality && state.currentSession && state.currentSession.esGlobal);
    const passed = !isQuality && res.calificacion !== "fail";

    if (isQuality) {
      if (elements.scoreCircleContainer) elements.scoreCircleContainer.className = "score-circle is-quality";
      elements.scoreNum.textContent = "⭐";
      if (elements.scoreTotalLabel) elements.scoreTotalLabel.textContent = "Valoració completada";

      elements.scoreBadge.textContent = "Enquesta registrada";
      elements.scoreBadge.className = "badge-result badge-quality-success";

      elements.resultsStudent.textContent = state.student.name || "Alumne/a";
      elements.resultsSession.textContent = state.currentSession.titulo;
      elements.resultsDate.textContent = res.date;

      elements.btnPrintCert.classList.add("hidden");
      if (elements.btnGoGlobal) elements.btnGoGlobal.classList.add("hidden");

      if (elements.btnRetry && elements.btnRetry.querySelector("span")) {
        elements.btnRetry.querySelector("span").textContent = "🔄 Modificar la meva valoració";
      }
      if (elements.btnRestart && elements.btnRestart.querySelector("span")) {
        elements.btnRestart.querySelector("span").textContent = "🪐 Tornar al menú de sessions";
      }

      if (elements.certInvitationBanner) {
        elements.certInvitationBanner.className = "cert-invitation-banner is-quality-pass";
        elements.certInvitationBanner.innerHTML = `
          <strong>🌟 Moltes gràcies per la teva col·laboració, ${escapeHtml(state.student.name || "alumne/a")}!</strong><br>
          Hem registrat correctament la teva valoració i els teus suggeriments. La teva opinió és molt valuosa per a Cosmos, grup d'astronomia de Mataró i ens permetrà continuar millorant el contingut, el professorat i l'experiència formativa en properes edicions del curs.
        `;
        elements.certInvitationBanner.classList.remove("hidden");
      }

      if (elements.reviewIcon) elements.reviewIcon.textContent = "⭐";
      if (elements.reviewTitle) elements.reviewTitle.textContent = "Resum de la teva valoració (10 preguntes + comentaris)";

      const letters = ["A", "B", "C", "D"];
      let reviewHtml = res.reviewDetails.map((item, idx) => {
        const userChose = item.respuestaTexto || (item.seleccionada !== -1 ? item.opciones[item.seleccionada] : "Sense respondre");
        const letter = item.letra || (item.seleccionada !== -1 ? letters[item.seleccionada] : "—");

        return `
          <div class="quality-review-item">
            <div class="quality-review-header">
              <span class="quality-review-qnum">Pregunta ${idx + 1}</span>
              <span class="quality-review-badge">Valoració registrada</span>
            </div>
            <div class="quality-review-prompt">${escapeHtml(item.pregunta)}</div>
            <div class="quality-review-choice">
              <span class="badge-opt-letter">${letter}</span>
              <span>${escapeHtml(userChose)}</span>
            </div>
          </div>
        `;
      }).join("");

      if (res.comments && res.comments.trim().length > 0) {
        reviewHtml += `
          <div class="quality-comments-summary-card">
            <div class="quality-comments-title">
              <span aria-hidden="true">💬</span>
              <strong>Els teus comentaris i propostes de millora:</strong>
            </div>
            <div class="quality-comments-body">${escapeHtml(res.comments)}</div>
          </div>
        `;
      } else {
        reviewHtml += `
          <div class="quality-comments-summary-card">
            <div class="quality-comments-title">
              <span aria-hidden="true">💬</span>
              <strong>Comentaris addicionals:</strong>
            </div>
            <div class="quality-comments-body"><em>No s'han aportat comentaris addicionals.</em></div>
          </div>
        `;
      }

      elements.reviewList.innerHTML = reviewHtml;
      return;
    }

    // Comportamiento normal para sesiones astronómicas (1 a 4 y Examen Global)
    if (elements.scoreCircleContainer) elements.scoreCircleContainer.className = "score-circle";
    if (elements.scoreTotalLabel) elements.scoreTotalLabel.textContent = `de ${res.total} encerts`;
    if (elements.reviewIcon) elements.reviewIcon.textContent = "📖";
    if (elements.reviewTitle) elements.reviewTitle.textContent = `Correcció pedagògica detallada (${res.total} preguntes)`;

    if (elements.btnRetry && elements.btnRetry.querySelector("span")) {
      elements.btnRetry.querySelector("span").textContent = "🔄 Repetir aquest test";
    }
    if (elements.btnRestart && elements.btnRestart.querySelector("span")) {
      elements.btnRestart.querySelector("span").textContent = "🪐 Avaluar una altra sessió";
    }

    elements.scoreNum.textContent = res.score;
    elements.scoreBadge.textContent = res.badgeText;
    elements.scoreBadge.className = `badge-result badge-${res.calificacion}`;

    elements.resultsStudent.textContent = state.student.name;
    elements.resultsSession.textContent = state.currentSession.titulo;
    elements.resultsDate.textContent = res.date;

    // Gestión del acceso al diploma y banner explicativo
    if (isGlobal) {
      if (passed) {
        // Superado el examen global: acceso exclusivo al diploma oficial
        elements.btnPrintCert.classList.remove("hidden");
        elements.btnPrintCert.classList.add("btn-cert-highlight");
        if (elements.btnGoGlobal) elements.btnGoGlobal.classList.add("hidden");

        if (elements.certInvitationBanner) {
          elements.certInvitationBanner.className = "cert-invitation-banner is-global-pass";
          elements.certInvitationBanner.innerHTML = `
            <strong>🎉 Felicitats, ${escapeHtml(state.student.name || "alumne/a")}!</strong><br>
            Has superat l'<strong>Examen Global del Curs d'Iniciació a l'Astronomia</strong>.
            Ja pots generar i descarregar el teu <strong>Certificat Oficial d'Aprofitament</strong> fent clic al botó inferior.
          `;
          elements.certInvitationBanner.classList.remove("hidden");
        }
      } else {
        // Examen global no superado
        elements.btnPrintCert.classList.add("hidden");
        if (elements.btnGoGlobal) elements.btnGoGlobal.classList.add("hidden");

        if (elements.certInvitationBanner) {
          elements.certInvitationBanner.className = "cert-invitation-banner";
          elements.certInvitationBanner.innerHTML = `
            <strong>ℹ️ Examen Global pendent de superar:</strong><br>
            Per obtenir el Certificat Oficial cal assolir un mínim del ${CONFIG.PASS_PERCENT || 60}% (12 encerts).
            Revisa la correcció detallada amb les explicacions astronòmiques a sota i torna a intentar-ho!
          `;
          elements.certInvitationBanner.classList.remove("hidden");
        }
      }
    } else {
      // Sesión ordinaria (1 a 4) - El diploma está reservado al examen global
      elements.btnPrintCert.classList.add("hidden");

      if (passed) {
        if (elements.btnGoGlobal) elements.btnGoGlobal.classList.remove("hidden");
        if (elements.certInvitationBanner) {
          elements.certInvitationBanner.className = "cert-invitation-banner is-success";
          elements.certInvitationBanner.innerHTML = `
            <strong>👏 Molt bé! Has superat aquesta sessió d'avaluació contínua.</strong><br>
            Aquest test serveix per comprovar els teus coneixements. Per obtenir el <strong>Certificat d'Aprofitament Oficial del Curs</strong>, realitza l'<strong>Examen Global de Certificació</strong> (20 preguntes de totes les sessions).
          `;
          elements.certInvitationBanner.classList.remove("hidden");
        }
      } else {
        if (elements.btnGoGlobal) elements.btnGoGlobal.classList.add("hidden");
        if (elements.certInvitationBanner) {
          elements.certInvitationBanner.className = "cert-invitation-banner";
          elements.certInvitationBanner.innerHTML = `
            <strong>ℹ️ Avaluació de sessió finalitzada:</strong><br>
            Pots consultar les explicacions de cada pregunta a sota per repassar la matèria i repetir el test quan vulguis.
          `;
          elements.certInvitationBanner.classList.remove("hidden");
        }
      }
    }

    // Rellenar certificado imprimible de respaldo
    elements.certName.textContent = state.student.name;
    elements.certSession.textContent = isGlobal
      ? "Examen Global - Curs d'iniciació a l'astronomia"
      : state.currentSession.titulo;
    elements.certScore.textContent = `${res.score} de ${res.total} encerts (${res.percent}%) - Qualificació: ${res.badgeText}`;
    elements.certDate.textContent = `Mataró, a ${res.date}`;

    // Renderizar desglose pedagógico de preguntas
    const letters = ["A", "B", "C", "D"];
    elements.reviewList.innerHTML = res.reviewDetails.map((item, idx) => {
      const isCorrect = item.acierto;
      const userChose = item.seleccionada !== -1 ? item.opciones[item.seleccionada] : "Sense respondre";
      const correctText = item.opciones[item.correcta];

      return `
        <div class="review-item ${isCorrect ? "is-correct" : "is-wrong"}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span class="review-badge ${isCorrect ? "correct" : "wrong"}">
              ${isCorrect ? "✓ Correcta" : "✗ Incorrecta"}
            </span>
            ${item.sesionOrigenNom ? `<span class="review-session-tag">${escapeHtml(item.sesionOrigenNom)}</span>` : ""}
          </div>
          <div class="review-question">
            Pregunta ${idx + 1}: ${escapeHtml(item.pregunta)}
          </div>
          ${(item.imagenExplicacion || item.imagen) ? buildMediaFigureHtml({
            src: item.imagenExplicacion || item.imagen,
            alt: (item.imagenExplicacion ? item.imagenExplicacionAlt : item.imagenAlt) || item.pregunta,
            caption: item.imagenExplicacion ? (item.imagenExplicacionPie || "") : (item.imagenPie || ""),
            width: item.imagenAncho || 680,
            height: item.imagenAlto || 420,
            figureClass: "review-figure",
            lazy: true
          }) : ""}
          <div class="review-answers">
            ${!isCorrect ? `
              <div class="review-ans user-choice-wrong">
                <span>La teva resposta:</span>
                <strong>${item.seleccionada !== -1 ? letters[item.seleccionada] + ") " : ""}${escapeHtml(userChose)}</strong>
              </div>
            ` : ""}
            <div class="review-ans correct-choice">
              <span>Resposta correcta:</span>
              <strong>${letters[item.correcta]}) ${escapeHtml(correctText)}</strong>
            </div>
          </div>
          ${item.explicacion ? `
            <div class="review-explanation">
              <strong>Explicació astronòmica:</strong>
              ${escapeHtml(item.explicacion)}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
  }

  // Cache per al Data URL del logotip per evitar errors de CORS a html2canvas
  let cachedLogoDataUrl = "";
  async function getLogoDataUrl() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    try {
      const resp = await fetch("assets/logo-oficial.png");
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogoDataUrl = reader.result;
          resolve(cachedLogoDataUrl);
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return new URL("assets/logo-oficial.png", window.location.href).href;
    }
  }

  // Obrir finestra dedicada per al Certificat / Diploma (evita restriccions d'iframe a Google Sites)
  async function openCertificatePrintWindow() {
    if (isAccessRequired() && !state.auth.isAuthenticated) {
      switchView("access");
      return;
    }

    const res = state.results;
    if (!res) {
      alert("No hi ha resultats disponibles per generar el diploma.");
      return;
    }

    const isGlobal = !!(state.currentSession && state.currentSession.esGlobal);
    const studentName = state.student.name || "Alumne/a";
    const sessionTitle = isGlobal
      ? "Curs d'iniciació a l'astronomia"
      : (state.currentSession ? state.currentSession.titulo : "Sessió");
    const certSubtitle = isGlobal
      ? "Història de l'astronomia · Mecànica celeste i temps · Instrumentació i observació · Cosmologia"
      : "";
    const certStatement = isGlobal
      ? "ha superat satisfactòriament l'<strong>Examen Global de Certificació</strong> del:"
      : "ha completat satisfactòriament l'avaluació corresponent a:";
    const scoreDetail = `${res.score} de ${res.total} encerts (${res.percent}%) - Qualificació: ${res.badgeText}`;
    const certDate = `Mataró, a ${res.date}`;

    // Obrir la nova finestra immediatament a l'esdeveniment d'usuari per evitar el bloqueig de popups
    const printWin = window.open("", "_blank");
    if (!printWin) {
      // Si el navegador bloqueja popups, intentar impressió directa
      window.print();
      return;
    }

    // Carregar imatge com a Data URL
    const logoSrc = await getLogoDataUrl();
    const safeFilename = "Certificat_Cosmos_Mataro_" + (studentName || "Alumne").replace(/[^a-zA-Z0-9À-ÿ]/g, "_") + ".pdf";

    const html = `<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificat - ${escapeHtml(studentName)} - Cosmos Mataró</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #0b1120;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      min-height: 100vh;
    }
    .action-bar {
      width: 100%;
      max-width: 820px;
      background: #1e293b;
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 10px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .action-text {
      font-size: 0.95rem;
      color: #cbd5e1;
    }
    .action-text strong {
      color: #38bdf8;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .btn {
      cursor: pointer;
      font-weight: 600;
      padding: 9px 18px;
      border-radius: 8px;
      border: none;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .btn-download {
      background: #059669;
      color: white;
    }
    .btn-download:hover {
      background: #047857;
    }
    .btn-print {
      background: #0284c7;
      color: white;
    }
    .btn-print:hover {
      background: #0369a1;
    }
    .btn-close {
      background: #475569;
      color: #f8fafc;
    }
    .btn-close:hover {
      background: #64748b;
    }
    /* Contenidor del diploma */
    .certificate-card {
      width: 100%;
      max-width: 820px;
      background: #ffffff;
      padding: 48px 40px;
      border: 8px double #1e3a8a;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      text-align: center;
      position: relative;
    }
    .cert-logo {
      max-height: 85px;
      width: auto;
      margin: 0 auto 18px;
      display: block;
    }
    h1 {
      font-size: 26pt;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 6pt;
      font-weight: 700;
    }
    h2 {
      font-size: 14pt;
      font-style: italic;
      color: #475569;
      margin-bottom: 28pt;
      font-weight: normal;
    }
    .cert-body {
      font-size: 13.5pt;
      line-height: 1.8;
      color: #1e293b;
      margin-bottom: 28pt;
    }
    .student-name {
      font-size: 23pt;
      font-weight: bold;
      color: #0f172a;
      border-bottom: 2px solid #1e3a8a;
      display: inline-block;
      padding: 0 25px 4pt;
      margin: 12pt 0 18pt;
    }
    .session-title {
      font-size: 15pt;
      color: #1e3a8a;
      font-weight: bold;
      margin: 10pt 0;
      display: block;
    }
    .cert-score {
      font-size: 15pt;
      font-weight: bold;
      color: #0284c7;
      margin: 14pt 0;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 45pt;
      font-size: 10.5pt;
      color: #334155;
    }
    .signature-box {
      border-top: 1px solid #94a3b8;
      width: 220px;
      padding-top: 6pt;
      text-align: center;
    }
    .signature-role {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 40pt;
    }
    .date-box {
      text-align: right;
    }
    .date-text {
      font-style: italic;
    }
    .web-url {
      font-size: 9pt;
      color: #64748b;
      margin-top: 4pt;
    }
    @media print {
      body {
        background: white !important;
        padding: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
      .certificate-card {
        border: 8px double #1e3a8a !important;
        box-shadow: none !important;
        max-width: 100% !important;
        padding: 40px 35px !important;
        margin: 0 auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div class="action-text">
      <span>📄 <strong>Diploma generat:</strong> pots descarregar el fitxer .pdf directament o imprimir-lo.</span>
    </div>
    <div class="btn-group">
      <button type="button" id="btn-dl-pdf" class="btn btn-download">
        <span>📥 Descarregar fitxer PDF</span>
      </button>
      <button type="button" onclick="window.print()" class="btn btn-print">
        <span>🖨️ Imprimir / Desar en PDF</span>
      </button>
      <button type="button" onclick="window.close()" class="btn btn-close">
        <span>✕ Tancar</span>
      </button>
    </div>
  </div>

  <div id="diploma-card" class="certificate-card">
    <img src="${logoSrc}" alt="Cosmos Mataró" class="cert-logo">
    <h1>Certificat d'Aprofitament</h1>
    <h2>Curs d'iniciació a l'astronomia</h2>

    <div class="cert-body">
      Es fa constar que l'alumne/a
      <br>
      <div class="student-name">${escapeHtml(studentName)}</div>
      <br>
      ${certStatement}
      <br>
      <strong class="session-title">${escapeHtml(sessionTitle)}</strong>
      ${certSubtitle ? `<div style="font-size: 11pt; color: #475569; margin: -4pt 0 14pt; font-style: italic;">${escapeHtml(certSubtitle)}</div>` : ""}
      <div class="cert-score">${escapeHtml(scoreDetail)}</div>
    </div>

    <div class="cert-footer">
      <div class="signature-box">
        <div class="signature-role">Signatura de Secretaria / Professorat:</div>
        <div><strong>Cosmos Mataró</strong></div>
      </div>
      <div class="date-box">
        <div class="date-text">${escapeHtml(certDate)}</div>
        <div class="web-url">cosmosmataro.org</div>
      </div>
    </div>
  </div>

  <script>
    document.getElementById("btn-dl-pdf").addEventListener("click", function() {
      const element = document.getElementById("diploma-card");
      const opt = {
        margin:       [8, 8, 8, 8],
        filename:     "${safeFilename}",
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
      };
      const btn = document.getElementById("btn-dl-pdf");
      const origText = btn.innerHTML;
      btn.innerHTML = "<span>⏳ Generant document PDF...</span>";
      btn.disabled = true;

      html2pdf().set(opt).from(element).save().then(function() {
        btn.innerHTML = origText;
        btn.disabled = false;
      }).catch(function(err) {
        console.error("Error html2pdf:", err);
        btn.innerHTML = origText;
        btn.disabled = false;
        window.print();
      });
    });
  <\/script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  }

  // Envío a Google Sheets mediante Google Apps Script
  async function submitResultsToGoogleSheets() {
    const webhookUrl = CONFIG.GOOGLE_SHEETS_WEBHOOK_URL;
    const isQuality = Boolean(state.results && state.results.isQuality);

    if (!webhookUrl || webhookUrl.trim() === "" || webhookUrl.includes("PEGAR_AQUI")) {
      elements.syncStatus.className = "sync-status offline";
      elements.syncStatus.innerHTML = `
        <span>ℹ️</span>
        <span>${isQuality ? "Enquesta completada localment." : "Avaluació completada localment."}</span>
      `;
      return;
    }

    elements.syncStatus.className = "sync-status saving";
    elements.syncStatus.innerHTML = isQuality
      ? `<span>⏳</span><span>Desant la teva valoració i comentaris al registre de Cosmos Mataró...</span>`
      : `<span>⏳</span><span>Desant resultats al registre de Cosmos Mataró...</span>`;

    const payload = isQuality ? {
      action: "submit_quality_survey",
      authEmail: state.auth.email || state.student.email,
      clave: state.auth.clave || "",
      nombre: state.student.name,
      email: state.student.email || state.auth.email,
      sesionId: "qualitat",
      sesionTitulo: state.currentSession.titulo || "Enquesta de Qualitat del Curs",
      comentarios: state.results.comments || state.feedbackComments || "",
      respuestas: state.results.reviewDetails.map(r => ({
        id: r.id,
        categoria: r.categoria,
        pregunta: r.pregunta,
        seleccionada: r.seleccionada,
        letra: r.letra,
        texto: r.respuestaTexto,
        textoCompleto: r.letra ? `${r.letra}) ${r.respuestaTexto}` : r.respuestaTexto
      }))
    } : {
      action: "submit_result",
      authEmail: state.auth.email || state.student.email,
      clave: state.auth.clave || "",
      nombre: state.student.name,
      email: state.student.email || state.auth.email,
      sesionId: state.currentSession.id,
      sesionTitulo: state.currentSession.titulo,
      aciertos: state.results.score,
      total: state.results.total,
      porcentaje: `${state.results.percent}%`,
      calificacion: state.results.badgeText,
      respuestas: state.results.reviewDetails.map(r => ({
        id: r.id,
        acierto: r.acierto,
        seleccionada: r.seleccionada,
        correcta: r.correcta
      }))
    };

    try {
      // text/plain evita el preflight CORS OPTIONS en Google Apps Script y permite leer la respuesta JSON
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        redirect: "follow",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result && result.status === "success") {
        elements.syncStatus.className = "sync-status success";
        elements.syncStatus.innerHTML = isQuality
          ? `<span>✓</span><span>Valoració i comentaris registrats amb èxit a Cosmos Mataró!</span>`
          : `<span>✓</span><span>Resultats registrats amb èxit a la secretaria de Cosmos Mataró!</span>`;
      } else {
        elements.syncStatus.className = "sync-status offline";
        elements.syncStatus.innerHTML = `
          <span>⚠️</span>
          <span>${escapeHtml((result && result.message) || "No s'han pogut desar les dades al registre.")}</span>
        `;
      }
    } catch (err) {
      console.error("Error en registrar a Google Sheets:", err);
      elements.syncStatus.className = "sync-status offline";
      elements.syncStatus.innerHTML = isQuality
        ? `<span>⚠️</span><span>No s'ha pogut connectar amb Google Sheets en aquest moment. La teva valoració s'ha completat localment.</span>`
        : `<span>⚠️</span><span>No s'ha pogut connectar amb Google Sheets en aquest moment. L'avaluació continua sent vàlida.</span>`;
    }
  }

  // Algorisme de Fisher-Yates per barallar elements d'un array sense biaix
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function buildMediaFigureHtml({ src, alt, caption, width, height, figureClass, lazy }) {
    const cleanSrc = typeof src === "string" ? src.trim() : "";
    if (!cleanSrc || /^(javascript|data|vbscript):/i.test(cleanSrc)) return "";
    const w = Number.isFinite(Number(width)) && Number(width) > 0 ? Number(width) : 680;
    const h = Number.isFinite(Number(height)) && Number(height) > 0 ? Number(height) : 420;
    const lazyAttr = lazy ? ' loading="lazy"' : "";
    const captionHtml = caption
      ? `<figcaption class="question-figcaption">${escapeHtml(caption)}</figcaption>`
      : "";
    return `
      <figure class="${escapeHtml(figureClass || "question-figure")}">
        <img src="${escapeHtml(cleanSrc)}" alt="${escapeHtml(alt)}" width="${w}" height="${h}" decoding="async"${lazyAttr}>
        ${captionHtml}
      </figure>
    `;
  }

  // Utilidad para escapar texto HTML
  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Arrancar al cargar el DOM
  document.addEventListener("DOMContentLoaded", init);
})();
