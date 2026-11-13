/**
 * =========================================================================
 * REGISTRO DE EVALUACIONES Y CONTROL DE ACCESO - COSMOS MATARÓ
 * Google Apps Script para validar alumnos autorizados y guardar respuestas
 * =========================================================================
 *
 * INSTRUCCIONES DE INSTALACIÓN / ACTUALIZACIÓN:
 * 1. Abre tu hoja de Google Sheets de evaluaciones (o crea una nueva en sheets.new).
 * 2. En el menú superior, ve a: Extensiones > Apps Script.
 * 3. Reemplaza todo el código existente por el contenido de este archivo y guarda (Ctrl+S).
 * 4. Para crear la pestaña de alumnos autorizados, vuelve a la hoja de cálculo,
 *    recarga la página y usa el menú superior: "Cosmos Mataró > Preparar pestaña Alumnos"
 *    (o deja que se cree automáticamente al primer intento de acceso).
 * 5. En Apps Script, implementa como Aplicación web:
 *    - Si es NUEVA: Implementar > Nueva implementación > Tipo: Aplicación web.
 *      - Ejecutar como: "Yo (tu cuenta de Google)"
 *      - Quién tiene acceso: "Cualquier usuario" (Anyone) <-- ¡IMPORTANTE!
 *    - Si ya estaba IMPLEMENTADA antes: Implementar > Gestionar implementaciones >
 *      icono del lápiz (Editar) > Versión: "Nueva versión" > Implementar.
 * 6. Si la URL /exec ha cambiado, pégala en `js/config.js` (`GOOGLE_SHEETS_WEBHOOK_URL`).
 */

var ACCESS_CONFIG = {
  ACCESS_SHEET_NAME: "Alumnos",
  ACCESS_SHEET_ALIASES: ["alumnos", "alumnes", "claves", "claus", "acceso", "acces"],
  RESULTS_DEFAULT_SHEET_NAME: "Resultados",
  QUALITY_SHEET_NAME: "Qualitat",
  QUALITY_SHEET_ALIASES: ["qualitat", "calidad", "enquesta", "encuesta", "valoracio", "valoracions", "opiniones", "opinio"],
  REQUIRE_ACCESS_KEY: true,      // Exige email + clave válida para validar y para guardar resultados
  CASE_SENSITIVE_KEYS: false,    // false = ignora mayúsculas/minúsculas en la clave (recomendado)
  KEY_PREFIX: "CM-",             // Prefijo al generar claves automáticas desde el menú
  KEY_LENGTH: 6                  // Longitud del código aleatorio generado (ej. CM-7K9P2M)
};

/**
 * Añade un menú práctico en Google Sheets para gestionar la lista de alumnos y claves.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("Cosmos Mataró")
      .addItem('Preparar pestaña "Alumnos"', "prepararPestanaAlumnos")
      .addItem('Preparar pestaña "Qualitat" (Enquesta)', "prepararPestanaQualitat")
      .addItem("Generar claves para alumnos sin clave", "generarClavesFaltantes")
      .addToUi();
  } catch (err) {
    // Ignorar si se ejecuta fuera del contexto de interfaz de hoja de cálculo
  }
}

/**
 * Crea o verifica la pestaña "Alumnos" con sus columnas y formato.
 */
function prepararPestanaAlumnos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existed = Boolean(findAccessSheet_(ss));
  var sheet = getOrCreateAccessSheet_(ss);

  ss.setActiveSheet(sheet);

  try {
    var msg = existed
      ? 'La pestaña "' + sheet.getName() + '" ya está lista. Asegúrate de mantener las columnas Email y Clave.'
      : 'Se ha creado la pestaña "' + sheet.getName() + '". Añade los correos de los alumnos que han completado el curso y sus claves.';
    SpreadsheetApp.getUi().alert("Cosmos Mataró", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // Ejecución sin UI
  }
}

/**
 * Crea o verifica la pestaña "Qualitat" para registrar las valoraciones y comentarios.
 */
function prepararPestanaQualitat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existed = Boolean(findQualitySheet_(ss));
  var sheet = getOrCreateQualitySheet_(ss);

  ss.setActiveSheet(sheet);

  try {
    var msg = existed
      ? 'La pestaña "' + sheet.getName() + '" ya está lista para recoger valoraciones.'
      : 'Se ha creado la pestaña "' + sheet.getName() + '" con las columnas para las 10 preguntas y el campo de comentarios.';
    SpreadsheetApp.getUi().alert("Cosmos Mataró", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // Ejecución sin UI
  }
}

/**
 * Genera claves aleatorias legibles para todas las filas de "Alumnos" que tengan Email pero Clave vacía.
 */
function generarClavesFaltantes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateAccessSheet_(ss);
  var range = sheet.getDataRange();
  var values = range.getValues();

  if (values.length <= 1) {
    try {
      SpreadsheetApp.getUi().alert(
        "Cosmos Mataró",
        'Añade primero los correos de los alumnos en la pestaña "' + sheet.getName() + '" (desde la fila 2).',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (err) {}
    return;
  }

  var cols = parseAccessColumns_(values[0]);
  var startRow = looksLikeEmail_(values[0][cols.email]) ? 0 : 1;
  var generatedCount = 0;

  for (var r = startRow; r < values.length; r++) {
    var emailVal = String(values[r][cols.email] || "").trim();
    var keyVal = String(values[r][cols.clave] || "").trim();

    if (emailVal && !keyVal) {
      var newKey = generateReadableKey_(ACCESS_CONFIG.KEY_PREFIX, ACCESS_CONFIG.KEY_LENGTH);
      sheet.getRange(r + 1, cols.clave + 1).setValue(newKey);

      if (cols.activo !== -1) {
        var activeVal = String(values[r][cols.activo] || "").trim();
        if (!activeVal) {
          sheet.getRange(r + 1, cols.activo + 1).setValue("Sí");
        }
      }
      generatedCount++;
    }
  }

  try {
    var msg = generatedCount > 0
      ? "Se han generado " + generatedCount + " claves nuevas correctamente."
      : "No había filas con correo electrónico y clave vacía.";
    SpreadsheetApp.getUi().alert("Cosmos Mataró", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {}
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000); // Esperar hasta 10 segundos para evitar escrituras simultáneas

  try {
    var data = parseRequestData_(e);
    var action = String(data.action || "submit_result").trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // =========================================================================
    // ACCIÓN 1: Verificar acceso (Email + Clave en la pestaña "Alumnos")
    // =========================================================================
    if (action === "verify_access") {
      if (!ACCESS_CONFIG.REQUIRE_ACCESS_KEY) {
        return jsonResponse_({
          status: "success",
          authorized: true,
          email: String(data.email || "").trim().toLowerCase(),
          nombre: ""
        });
      }

      var accessResult = verifyStudentCredentials_(ss, data.email, data.clave);
      if (!accessResult.authorized) {
        return jsonResponse_({
          status: "error",
          code: accessResult.code,
          message: accessResult.message
        });
      }

      // Registrar marca temporal de último acceso si existe esa columna
      if (accessResult.lastAccessCol !== -1) {
        accessResult.sheet
          .getRange(accessResult.rowNumber, accessResult.lastAccessCol + 1)
          .setValue(new Date());
      }

      return jsonResponse_({
        status: "success",
        authorized: true,
        email: accessResult.email,
        nombre: accessResult.nombre || ""
      });
    }

    // =========================================================================
    // ACCIÓN 2: Guardar encuesta de calidad del curso (pestaña "Qualitat")
    // =========================================================================
    if (action === "submit_quality_survey" || data.tipo === "qualitat" || data.sesionId === "qualitat") {
      var verifiedEmail = "";
      if (ACCESS_CONFIG.REQUIRE_ACCESS_KEY) {
        var authEmail = data.authEmail || data.email || "";
        var authKey = data.clave || data.accessKey || "";
        var authCheck = verifyStudentCredentials_(ss, authEmail, authKey);

        if (!authCheck.authorized) {
          return jsonResponse_({
            status: "error",
            code: "unauthorized",
            message: "Accés no autoritzat per registrar l'enquesta de qualitat."
          });
        }
        verifiedEmail = authCheck.email;
      }

      var qSheet = getOrCreateQualitySheet_(ss);
      var timestamp = new Date();
      var nombre = String(data.nombre || "Anònim").trim();
      var email = String(data.email || verifiedEmail || "").trim();
      var comentarios = String(data.comentarios || data.comentaris || "").trim();

      // Mapear respuestas P1 a P10
      var pValues = [];
      var answersMap = {};
      if (data.respuestas && Array.isArray(data.respuestas)) {
        data.respuestas.forEach(function(r) {
          var val = "";
          if (r.textoCompleto) {
            val = r.textoCompleto;
          } else if (r.letra && r.texto) {
            val = r.letra + ") " + r.texto;
          } else if (r.texto) {
            val = r.texto;
          } else if (r.seleccionada !== undefined && r.seleccionada !== -1) {
            var letter = ["A", "B", "C", "D"][r.seleccionada] || "";
            val = letter ? (letter + ") " + (r.opcionTexto || "")) : ("Opció " + (r.seleccionada + 1));
          }
          answersMap[r.id] = val;
        });
      }

      for (var qIdx = 1; qIdx <= 10; qIdx++) {
        pValues.push(answersMap[qIdx] || answersMap["q" + qIdx] || "");
      }

      qSheet.appendRow([timestamp, nombre, email].concat(pValues).concat([comentarios]));

      return jsonResponse_({
        status: "success",
        message: "Enquesta de qualitat desada correctament a Cosmos Mataró",
        timestamp: timestamp
      });
    }

    // =========================================================================
    // ACCIÓN 3: Guardar resultados de la evaluación en la hoja de Resultados
    // =========================================================================
    var verifiedEmail = "";
    if (ACCESS_CONFIG.REQUIRE_ACCESS_KEY) {
      var authEmail = data.authEmail || data.email || "";
      var authKey = data.clave || data.accessKey || "";
      var authCheck = verifyStudentCredentials_(ss, authEmail, authKey);

      if (!authCheck.authorized) {
        return jsonResponse_({
          status: "error",
          code: "unauthorized",
          message: "Accés no autoritzat per registrar resultats."
        });
      }
      verifiedEmail = authCheck.email;
    }

    var sheet = getResultsSheet_(ss);

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

    var timestamp = new Date();
    var nombre = String(data.nombre || "Anónimo").trim();
    var email = String(data.email || verifiedEmail || "").trim();
    var sesionId = data.sesionId || "";
    var sesionTitulo = data.sesionTitulo || "";
    var aciertos = Number(data.aciertos) || 0;
    var total = Number(data.total) || 20;
    var porcentaje = ((aciertos / total) * 100).toFixed(1) + "%";
    var calificacion = (aciertos >= 17) ? "Excelente" : (aciertos >= 12 ? "Apto" : "No apto");

    // Resumen compacto de respuestas (ej: P1:OK, P2:ERR(...))
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

    return jsonResponse_({
      status: "success",
      message: "Evaluación guardada correctamente en Cosmos Mataró",
      timestamp: timestamp
    });

  } catch (error) {
    return jsonResponse_({
      status: "error",
      message: error.toString()
    });

  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

function doGet(e) {
  return jsonResponse_({
    status: "online",
    accessProtection: ACCESS_CONFIG.REQUIRE_ACCESS_KEY,
    message: "Webhook de Cosmos Mataró listo para recibir peticiones POST"
  });
}

// =========================================================================
// FUNCIONES AUXILIARES PRIVADAS
// =========================================================================

function parseRequestData_(e) {
  if (e && e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  if (e && e.parameter) {
    return e.parameter;
  }
  return {};
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeText_(val) {
  var str = String(val || "").trim().toLowerCase();
  if (typeof str.normalize === "function") {
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  return str;
}

function looksLikeEmail_(val) {
  var s = String(val || "").trim();
  return s.indexOf("@") !== -1 && s.indexOf(".") !== -1;
}

function isAccessSheetName_(name) {
  var norm = normalizeText_(name);
  return ACCESS_CONFIG.ACCESS_SHEET_ALIASES.indexOf(norm) !== -1;
}

function findAccessSheet_(ss) {
  var exact = ss.getSheetByName(ACCESS_CONFIG.ACCESS_SHEET_NAME);
  if (exact) return exact;

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (isAccessSheetName_(sheets[i].getName())) {
      return sheets[i];
    }
  }
  return null;
}

function getOrCreateAccessSheet_(ss) {
  var existing = findAccessSheet_(ss);
  if (existing) return existing;

  var sheet = ss.insertSheet(ACCESS_CONFIG.ACCESS_SHEET_NAME);
  sheet.appendRow(["Email", "Clave", "Nombre", "Activo", "Último acceso"]);

  var headerRange = sheet.getRange(1, 1, 1, 5);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#f8fafc");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // Fila de ejemplo desactivada para guiar al profesorado sin dar acceso real
  sheet.appendRow([
    "alumne.exemple@correu.cat",
    "CM-EXEMPLE",
    "Maria García López (exemple)",
    "No",
    ""
  ]);
  sheet.getRange(2, 1, 1, 5).setFontColor("#64748b").setFontStyle("italic");

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 180);

  return sheet;
}

function isQualitySheetName_(name) {
  var norm = normalizeText_(name);
  return ACCESS_CONFIG.QUALITY_SHEET_ALIASES.indexOf(norm) !== -1;
}

function findQualitySheet_(ss) {
  var exact = ss.getSheetByName(ACCESS_CONFIG.QUALITY_SHEET_NAME);
  if (exact) return exact;

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (isQualitySheetName_(sheets[i].getName())) {
      return sheets[i];
    }
  }
  return null;
}

function getOrCreateQualitySheet_(ss) {
  var existing = findQualitySheet_(ss);
  if (existing) return existing;

  var sheet = ss.insertSheet(ACCESS_CONFIG.QUALITY_SHEET_NAME);
  sheet.appendRow([
    "Marca temporal",
    "Nom de l'Alumne",
    "Email",
    "P1: Extensió",
    "P2: Dificultat",
    "P3: Eines pedagògiques",
    "P4: Professorat",
    "P5: Atenció a dubtes",
    "P6: Pràctiques i telescopis",
    "P7: Material de suport",
    "P8: Organització",
    "P9: Expectatives",
    "P10: Valoració global",
    "Comentaris i propostes de millora"
  ]);

  var headerRange = sheet.getRange(1, 1, 1, 14);
  headerRange.setBackground("#0f172a");
  headerRange.setFontColor("#38bdf8");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 240);
  for (var c = 4; c <= 13; c++) {
    sheet.setColumnWidth(c, 240);
  }
  sheet.setColumnWidth(14, 420);

  return sheet;
}

function getResultsSheet_(ss) {
  var exact = ss.getSheetByName(ACCESS_CONFIG.RESULTS_DEFAULT_SHEET_NAME);
  if (exact) return exact;

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (!isAccessSheetName_(name) && !isQualitySheetName_(name)) {
      return sheets[i];
    }
  }
  return ss.insertSheet(ACCESS_CONFIG.RESULTS_DEFAULT_SHEET_NAME);
}

function parseAccessColumns_(headerRow) {
  var cols = {
    email: 0,
    clave: 1,
    nombre: 2,
    activo: 3,
    lastAccess: 4
  };

  if (!headerRow || headerRow.length === 0) return cols;
  if (looksLikeEmail_(headerRow[0])) {
    // Hoja sin cabecera: usar posiciones estándar
    if (headerRow.length < 3) cols.nombre = -1;
    if (headerRow.length < 4) cols.activo = -1;
    if (headerRow.length < 5) cols.lastAccess = -1;
    return cols;
  }

  var found = {
    email: -1,
    clave: -1,
    nombre: -1,
    activo: -1,
    lastAccess: -1
  };

  for (var c = 0; c < headerRow.length; c++) {
    var h = normalizeText_(headerRow[c]);
    if (found.email === -1 && (h === "email" || h === "mail" || h.indexOf("correu") !== -1 || h.indexOf("correo") !== -1)) {
      found.email = c;
    } else if (found.clave === -1 && (h === "clave" || h === "clau" || h === "codigo" || h === "codi" || h === "key" || h.indexOf("contrasen") !== -1 || h === "password")) {
      found.clave = c;
    } else if (found.nombre === -1 && (h === "nom" || h.indexOf("nom ") === 0 || h.indexOf("nombre") !== -1 || h.indexOf("alumne") !== -1 || h.indexOf("alumno") !== -1)) {
      found.nombre = c;
    } else if (found.activo === -1 && (h === "activo" || h === "actiu" || h.indexOf("habilit") !== -1 || h.indexOf("autoriz") !== -1 || h === "estado" || h === "estat")) {
      found.activo = c;
    } else if (found.lastAccess === -1 && (h.indexOf("acceso") !== -1 || h.indexOf("acces") !== -1)) {
      found.lastAccess = c;
    }
  }

  if (found.email !== -1 || found.clave !== -1) {
    cols.email = found.email !== -1 ? found.email : 0;
    cols.clave = found.clave !== -1 ? found.clave : 1;
    cols.nombre = found.nombre;
    cols.activo = found.activo;
    cols.lastAccess = found.lastAccess;
    return cols;
  }

  if (headerRow.length < 3) cols.nombre = -1;
  if (headerRow.length < 4) cols.activo = -1;
  if (headerRow.length < 5) cols.lastAccess = -1;

  return cols;
}

function isRowActive_(rawValue) {
  var norm = normalizeText_(rawValue);
  if (!norm) return true; // En blanco = activo por defecto
  var disabledValues = ["no", "false", "0", "n", "inactivo", "inactiu", "desactivado", "desactivat", "bloqueado", "bloquejat", "baja", "baixa"];
  return disabledValues.indexOf(norm) === -1;
}

function verifyStudentCredentials_(ss, rawEmail, rawClave) {
  var email = String(rawEmail || "").trim().toLowerCase();
  var clave = String(rawClave || "").trim();

  if (!email || !clave) {
    return {
      authorized: false,
      code: "missing_credentials",
      message: "Cal introduir el correu electrònic i la clau d'accés."
    };
  }

  var accessSheet = getOrCreateAccessSheet_(ss);
  var values = accessSheet.getDataRange().getValues();
  if (!values || values.length === 0) {
    return {
      authorized: false,
      code: "no_students_configured",
      message: "No hi ha cap llista d'alumnes autoritzats configurada."
    };
  }

  var cols = parseAccessColumns_(values[0]);
  var startRow = looksLikeEmail_(values[0][cols.email]) ? 0 : 1;
  var normalizedInputKey = ACCESS_CONFIG.CASE_SENSITIVE_KEYS ? clave : clave.toUpperCase();

  for (var i = startRow; i < values.length; i++) {
    var row = values[i];
    var rowEmail = String(row[cols.email] || "").trim().toLowerCase();
    if (!rowEmail || rowEmail !== email) continue;

    var active = cols.activo === -1 ? true : isRowActive_(row[cols.activo]);
    if (!active) continue;

    var rowKey = String(row[cols.clave] || "").trim();
    if (!rowKey) continue;

    var normalizedRowKey = ACCESS_CONFIG.CASE_SENSITIVE_KEYS ? rowKey : rowKey.toUpperCase();
    if (normalizedRowKey === normalizedInputKey) {
      var rowName = cols.nombre !== -1 ? String(row[cols.nombre] || "").trim() : "";
      return {
        authorized: true,
        rowNumber: i + 1,
        email: rowEmail,
        nombre: rowName,
        sheet: accessSheet,
        lastAccessCol: cols.lastAccess
      };
    }
  }

  return {
    authorized: false,
    code: "invalid_credentials",
    message: "El correu electrònic o la clau d'accés no són vàlids, o l'accés no està activat."
  };
}

function generateReadableKey_(prefix, length) {
  // Alfabeto sin caracteres ambiguos (0/O, 1/I/L)
  var chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var code = "";
  for (var i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return String(prefix || "") + code;
}
