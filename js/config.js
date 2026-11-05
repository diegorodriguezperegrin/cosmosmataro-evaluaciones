/**
 * Configuración general de la plataforma de evaluación
 * Cosmos Mataró - Curso de Iniciación a la Astronomía
 */

const CONFIG = {
  // Datos institucionales
  ORGANIZATION_NAME: "Cosmos, Grup d'Astronomia de Mataró",
  ORGANIZATION_SUBTITLE: "Agrupació Astronòmica",
  COURSE_TITLE: "Curs d'iniciació a l'astronomia",

  // Criterios de evaluación (sobre 20 preguntas)
  TOTAL_QUESTIONS: 20,
  PASS_PERCENT: 60,        // Mínimo para aprobar: 60% (12 aciertos)
  EXCELLENT_PERCENT: 85,   // Calificación de excelente: 85% (17 aciertos)

  // URL del Webhook de Google Apps Script (para registrar en Google Sheets)
  // Pega aquí la URL que obtengas al implementar Code.gs (termina en /exec)
  // Si se deja vacío, la app funciona en modo demostración/local sin bloquear al alumno.
  GOOGLE_SHEETS_WEBHOOK_URL: "",

  // Opciones de experiencia de usuario
  ENABLE_DETAILED_EXPLANATIONS: true,  // Muestra explicaciones astronómicas tras finalizar
  ENABLE_CERTIFICATE_PRINT: true,      // Permite imprimir o guardar en PDF el comprobante/diploma
  ENABLE_IMMEDIATE_SESSION_SWITCH: true // Permite volver al selector para hacer otra sesión
};

// Evitar modificaciones accidentales
if (typeof Object.freeze === "function") {
  Object.freeze(CONFIG);
}
