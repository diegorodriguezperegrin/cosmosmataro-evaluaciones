/**
 * =========================================================================
 * REGISTRO DE EVALUACIONES - AGRUPACIÓ ASTRONÒMICA COSMOS MATARÓ
 * Google Apps Script para recibir y guardar las respuestas de los alumnos
 * =========================================================================
 *
 * INSTRUCCIONES DE INSTALACIÓN (Sólo 2 minutos):
 * 1. Abre Google Sheets en tu navegador (https://sheets.new) y crea una hoja nueva.
 *    Nómbrala, por ejemplo: "Cosmos Mataró - Evaluaciones Curso Astronomía".
 * 2. En el menú superior de la hoja, ve a: Extensiones > Apps Script.
 * 3. Borra todo el código que aparezca y pega este archivo completo.
 * 4. Pulsa en el icono de guardar (disco) o Ctrl+S.
 * 5. Arriba a la derecha, haz clic en el botón azul "Implementar" (Deploy) > "Nueva implementación".
 * 6. En el engranaje "Seleccionar tipo", elige "Aplicación web" (Web app).
 * 7. Configura los campos:
 *    - Descripción: "Receptor de Evaluaciones Cosmos Mataró"
 *    - Ejecutar como: "Yo (tu cuenta de Google)"
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone)  <-- ¡IMPORTANTE!
 * 8. Pulsa "Implementar" y autoriza los permisos si te los pide Google.
 * 9. Copia la "URL de la aplicación web" (termina en /exec) y pégala en el archivo
 *    `js/config.js` de la aplicación web.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Esperar hasta 10 segundos para evitar escrituras simultáneas

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Si la hoja está completamente vacía, creamos los encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Marca temporal",
        "Nombre del Alumno",
        "Email",
        "ID Sesión",
        "Título de la Sesión",
        "Aciertos",
        "Total Preguntas",
        "Porcentaje",
        "Calificación",
        "Resumen de Respuestas (Correctas/Incorrectas)"
      ]);
      
      // Formato visual para la fila de cabecera
      var headerRange = sheet.getRange(1, 1, 1, 10);
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#f8fafc");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Parsear los datos recibidos desde el formulario web
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var timestamp = new Date();
    var nombre = data.nombre || "Anónimo";
    var email = data.email || "";
    var sesionId = data.sesionId || "";
    var sesionTitulo = data.sesionTitulo || "";
    var aciertos = Number(data.aciertos) || 0;
    var total = Number(data.total) || 20;
    var porcentaje = ((aciertos / total) * 100).toFixed(1) + "%";
    var calificacion = (aciertos >= 17) ? "Excelente" : (aciertos >= 12 ? "Apto" : "No apto");
    
    // Resumen compacto de respuestas (ej: P1:OK, P2:FAIL, ...)
    var respuestasDetalle = "";
    if (data.respuestas && Array.isArray(data.respuestas)) {
      respuestasDetalle = data.respuestas.map(function(r) {
        return "P" + r.id + ":" + (r.acierto ? "OK" : "ERR(Marcó:" + r.seleccionada + "/Era:" + r.correcta + ")");
      }).join(" | ");
    }

    // Añadir la fila con los resultados del alumno
    sheet.appendRow([
      timestamp,
      nombre,
      email,
      sesionId,
      sesionTitulo,
      aciertos,
      total,
      porcentaje,
      calificacion,
      respuestasDetalle
    ]);

    // Responder con JSON y cabeceras de éxito
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Evaluación guardada correctamente en Cosmos Mataró",
        timestamp: timestamp
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "online",
      message: "Webhook de Cosmos Mataró listo para recibir POSTs"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
