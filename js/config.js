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
  QUESTIONS_PER_SESSION_IN_GLOBAL: 5,  // 5 preguntas de cada una de las 4 sesiones = 20 preguntas en Examen Global
  PASS_PERCENT: 60,        // Mínimo para aprobar: 60% (12 aciertos)
  EXCELLENT_PERCENT: 85,   // Calificación de excelente: 85% (17 aciertos)

  // URL del Webhook de Google Apps Script (para validar acceso y registrar en Google Sheets)
  GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbzgnufLt06Q4mW_E5lHMLBEVDYdSaeQuhozIZcjW3TXMWP0ZvoYXbz93TkmyfAMJXsr/exec",

  // Control de acceso para alumnos que han completado el curso
  REQUIRE_ACCESS_KEY: true, // Exige correo electrónico y clave autorizada (pestaña "Alumnos" en Google Sheets)

  // Opciones de experiencia de usuario
  SHUFFLE_QUESTIONS: true,             // Barajar aleatoriamente el orden de las preguntas en cada intento
  ENABLE_DETAILED_EXPLANATIONS: true,  // Muestra explicaciones astronómicas tras finalizar
  ENABLE_CERTIFICATE_PRINT: true,      // Permite imprimir o guardar en PDF el comprobante/diploma
  ENABLE_IMMEDIATE_SESSION_SWITCH: true // Permite volver al selector para hacer otra sesión
};

// Evitar modificaciones accidentales
if (typeof Object.freeze === "function") {
  Object.freeze(CONFIG);
}
