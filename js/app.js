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

    // Imprimir diploma / PDF
    elements.btnPrintCert.addEventListener("click", () => {
      window.print();
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
