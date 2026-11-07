/**
 * Cosmos Mataró - Plataforma de Evaluación
 * Lógica de la aplicación web (SPA)
 */

(function () {
  "use strict";

  // Estado global de la aplicación
  const state = {
    sessionsData: null,
    currentSession: null,
    rawQuestions: [],
    questions: [],
    student: {
      name: "",
      email: ""
    },
    currentQuestionIndex: 0,
    answers: {}, // { [questionId]: optionIndex }
    results: null
  };

  // Referencias al DOM
  const views = {
    sessions: document.getElementById("view-sessions"),
    registration: document.getElementById("view-registration"),
    quiz: document.getElementById("view-quiz"),
    results: document.getElementById("view-results")
  };

  const elements = {
    // Header & Brand
    headerBadge: document.getElementById("header-session-badge"),
    
    // Sesiones
    sessionsGrid: document.getElementById("sessions-grid"),
    
    // Registro
    regSessionTitle: document.getElementById("reg-session-title"),
    regForm: document.getElementById("student-form"),
    studentName: document.getElementById("student-name"),
    studentEmail: document.getElementById("student-email"),
    btnBackToSessions: document.getElementById("btn-back-to-sessions"),
    
    // Quiz
    quizSessionTitle: document.getElementById("quiz-session-title"),
    quizProgressText: document.getElementById("quiz-progress-text"),
    quizProgressFill: document.getElementById("quiz-progress-fill"),
    questionNavStrip: document.getElementById("question-nav-strip"),
    questionNumber: document.getElementById("question-number"),
    questionPrompt: document.getElementById("question-prompt"),
    optionsList: document.getElementById("options-list"),
    btnPrev: document.getElementById("btn-prev"),
    btnNext: document.getElementById("btn-next"),
    btnSubmit: document.getElementById("btn-submit"),
    
    // Modal sin responder
    modalUnanswered: document.getElementById("modal-unanswered"),
    unansweredCount: document.getElementById("unanswered-count"),
    btnModalReview: document.getElementById("btn-modal-review"),
    btnModalConfirm: document.getElementById("btn-modal-confirm"),
    
    // Resultados
    scoreNum: document.getElementById("score-num"),
    scoreBadge: document.getElementById("score-badge"),
    resultsStudent: document.getElementById("results-student"),
    resultsSession: document.getElementById("results-session"),
    resultsDate: document.getElementById("results-date"),
    syncStatus: document.getElementById("sync-status"),
    reviewList: document.getElementById("review-list"),
    btnPrintCert: document.getElementById("btn-print-cert"),
    btnRetry: document.getElementById("btn-retry"),
    btnRestart: document.getElementById("btn-restart"),
    
    // Certificado imprimible
    certName: document.getElementById("cert-student-name"),
    certSession: document.getElementById("cert-session-title"),
    certScore: document.getElementById("cert-score-detail"),
    certDate: document.getElementById("cert-date")
  };

  // Inicialización de la aplicación
  async function init() {
    setupEventListeners();
    await loadSessionsData();
    checkUrlParameters();
  }

  // Cambio de vistas
  function switchView(viewName) {
    Object.keys(views).forEach(key => {
      if (key === viewName) {
        views[key].classList.remove("hidden");
      } else {
        views[key].classList.add("hidden");
      }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Cargar metadatos de las sesiones
  async function loadSessionsData() {
    try {
      const response = await fetch("data/sesiones.json");
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

  // Renderizar tarjetas de las 4 sesiones
  function renderSessionsGrid() {
    if (!state.sessionsData || !state.sessionsData.sesiones) return;
    
    elements.sessionsGrid.innerHTML = state.sessionsData.sesiones.map(s => `
      <div class="session-item" data-session-id="${s.id}">
        <div class="session-badge">Sessió ${s.id}</div>
        <div class="session-title">${escapeHtml(s.titulo)}</div>
        <div class="session-desc">${escapeHtml(s.descripcion)}</div>
        <div class="session-action">
          <span>Realitzar avaluació (20 preguntes)</span>
          <span>→</span>
        </div>
      </div>
    `).join("");

    elements.sessionsGrid.querySelectorAll(".session-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = parseInt(item.getAttribute("data-session-id"), 10);
        selectSession(id);
      });
    });
  }

  // Detectar parámetro ?sesion=X en la URL (ideal para Google Sites)
  function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const sesionParam = urlParams.get("sesion") || urlParams.get("session");
    if (sesionParam && state.sessionsData) {
      const id = parseInt(sesionParam, 10);
      if (id >= 1 && id <= 4) {
        selectSession(id);
      }
    }
  }

  // Seleccionar una sesión y cargar su archivo JSON
  async function selectSession(sessionId) {
    const session = state.sessionsData.sesiones.find(s => s.id === sessionId);
    if (!session) return;

    state.currentSession = session;
    elements.headerBadge.textContent = `Sessió ${session.id}`;
    elements.headerBadge.classList.remove("hidden");
    elements.regSessionTitle.textContent = session.titulo;

    try {
      const resp = await fetch(session.archivo);
      if (!resp.ok) throw new Error(`No s'ha pogut carregar ${session.archivo}`);
      const data = await resp.json();
      state.rawQuestions = data.preguntas || [];
      state.questions = (typeof CONFIG !== "undefined" && CONFIG.SHUFFLE_QUESTIONS !== false)
        ? shuffleArray([...state.rawQuestions])
        : [...state.rawQuestions];
      state.answers = {};
      state.currentQuestionIndex = 0;

      switchView("registration");
    } catch (err) {
      alert(`Error en carregar les preguntes de la sessió: ${err.message}`);
    }
  }

  // Event Listeners
  function setupEventListeners() {
    // Volver a selector de sesiones
    elements.btnBackToSessions.addEventListener("click", () => {
      elements.headerBadge.classList.add("hidden");
      switchView("sessions");
    });

    // Envío del formulario de registro del alumno
    elements.regForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = elements.studentName.value.trim();
      const email = elements.studentEmail.value.trim();

      if (!name) {
        alert("Si us plau, introdueix el teu nom i cognoms.");
        return;
      }

      state.student.name = name;
      state.student.email = email;

      startQuiz();
    });

    // Navegación del cuestionario
    elements.btnPrev.addEventListener("click", () => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderCurrentQuestion();
      }
    });

    elements.btnNext.addEventListener("click", () => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderCurrentQuestion();
      }
    });

    elements.btnSubmit.addEventListener("click", () => {
      handleQuizSubmissionAttempt();
    });

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

    // Repetir el mateix test (amb preguntes barallades)
    if (elements.btnRetry) {
      elements.btnRetry.addEventListener("click", () => {
        startQuiz();
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

      const key = e.key;
      if (["1", "2", "3", "4"].includes(key)) {
        const optionIndex = parseInt(key, 10) - 1;
        selectOption(optionIndex);
      } else if (key === "ArrowLeft" && state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderCurrentQuestion();
      } else if (key === "ArrowRight" && state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex++;
        renderCurrentQuestion();
      }
    });
  }

  // Iniciar la evaluación
  function startQuiz() {
    // Si està activat el barallat, reordenar les preguntes aleatòriament a cada intent
    if (typeof CONFIG !== "undefined" && CONFIG.SHUFFLE_QUESTIONS !== false && state.rawQuestions.length > 0) {
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

  // Renderizar la barra de navegación de píldoras (1..20)
  function renderNavStrip() {
    elements.questionNavStrip.innerHTML = state.questions.map((q, idx) => {
      const num = idx + 1;
      const isAnswered = state.answers[q.id] !== undefined;
      const isCurrent = idx === state.currentQuestionIndex;

      let classes = "nav-pill";
      if (isCurrent) classes += " current";
      else if (isAnswered) classes += " answered";

      return `<button type="button" class="${classes}" data-index="${idx}">${num}</button>`;
    }).join("");

    elements.questionNavStrip.querySelectorAll(".nav-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        state.currentQuestionIndex = parseInt(btn.getAttribute("data-index"), 10);
        renderCurrentQuestion();
      });
    });
  }

  // Renderizar la pregunta actual
  function renderCurrentQuestion() {
    const q = state.questions[state.currentQuestionIndex];
    if (!q) return;

    const total = state.questions.length;
    const currentNum = state.currentQuestionIndex + 1;

    // Actualizar progreso
    elements.quizProgressText.textContent = `Pregunta ${currentNum} de ${total}`;
    const percentProgress = (currentNum / total) * 100;
    elements.quizProgressFill.style.width = `${percentProgress}%`;

    elements.questionNumber.textContent = `Pregunta ${currentNum}`;
    elements.questionPrompt.textContent = q.pregunta;

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

    if (state.currentQuestionIndex === total - 1) {
      elements.btnNext.classList.add("hidden");
      elements.btnSubmit.classList.remove("hidden");
    } else {
      elements.btnNext.classList.remove("hidden");
      elements.btnSubmit.classList.add("hidden");
    }

    renderNavStrip();
  }

  // Seleccionar una opción
  function selectOption(optionIndex) {
    const q = state.questions[state.currentQuestionIndex];
    if (!q) return;

    state.answers[q.id] = optionIndex;
    renderCurrentQuestion();

    // Avance automático a la siguiente pregunta tras 300ms para una experiencia muy fluida
    if (state.currentQuestionIndex < state.questions.length - 1) {
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
        opciones: q.opciones,
        correcta: q.correcta,
        seleccionada: selected !== undefined ? selected : -1,
        acierto: isCorrect,
        explicacion: q.explicacion || ""
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

    elements.scoreNum.textContent = res.score;
    elements.scoreBadge.textContent = res.badgeText;
    elements.scoreBadge.className = `badge-result badge-${res.calificacion}`;

    elements.resultsStudent.textContent = state.student.name;
    elements.resultsSession.textContent = state.currentSession.titulo;
    elements.resultsDate.textContent = res.date;

    // Rellenar certificado imprimible
    elements.certName.textContent = state.student.name;
    elements.certSession.textContent = state.currentSession.titulo;
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
          <span class="review-badge ${isCorrect ? "correct" : "wrong"}">
            ${isCorrect ? "✓ Correcta" : "✗ Incorrecta"}
          </span>
          <div class="review-question">
            Pregunta ${idx + 1}: ${escapeHtml(item.pregunta)}
          </div>
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
    const res = state.results;
    if (!res) {
      alert("No hi ha resultats disponibles per generar el diploma.");
      return;
    }

    const studentName = state.student.name || "Alumne/a";
    const sessionTitle = state.currentSession ? state.currentSession.titulo : "Sessió";
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
      ha completat satisfactòriament l'avaluació corresponent a:
      <br>
      <strong class="session-title">${escapeHtml(sessionTitle)}</strong>
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

    if (!webhookUrl || webhookUrl.trim() === "" || webhookUrl.includes("PEGAR_AQUI")) {
      elements.syncStatus.className = "sync-status offline";
      elements.syncStatus.innerHTML = `
        <span>ℹ️</span>
        <span>Avaluació completada localment.</span>
      `;
      return;
    }

    elements.syncStatus.className = "sync-status saving";
    elements.syncStatus.innerHTML = `
      <span>⏳</span>
      <span>Desant resultats al registre de Cosmos Mataró...</span>
    `;

    const payload = {
      nombre: state.student.name,
      email: state.student.email,
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
      // Usamos mode: 'no-cors' para Google Apps Script Web App
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      elements.syncStatus.className = "sync-status success";
      elements.syncStatus.innerHTML = `
        <span>✓</span>
        <span>¡Resultats registrats amb èxit a la secretaria de Cosmos Mataró!</span>
      `;
    } catch (err) {
      console.error("Error en registrar a Google Sheets:", err);
      elements.syncStatus.className = "sync-status offline";
      elements.syncStatus.innerHTML = `
        <span>⚠️</span>
        <span>No s'ha pogut connectar amb Google Sheets en aquest moment. L'avaluació continua sent vàlida.</span>
      `;
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
