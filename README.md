# Cosmos Mataró · Evaluaciones del Curso de Iniciación a la Astronomía

Aplicación web interactiva diseñada para la evaluación continua de los alumnos del **Curso de Iniciación a la Astronomía** de la **Agrupació Astronòmica Cosmos Mataró**, optimizada para integrarse directamente dentro de **Google Sites** y desplegarse gratuitamente en **GitHub Pages**.

---

## 🌟 Características Principales

- **4 Sesiones Formativas**: 20 preguntas con 4 opciones por cada sesión (80 preguntas en total).
- **Separación Limpia de Datos y Código**: Todas las preguntas están en archivos JSON independientes (`data/sesion-1.json`, etc.) para que cualquier profesor pueda editarlas o completarlas sin tocar código.
- **Modo Selector o Modo Sesión Directa**:
  - Si se accede a la raíz, el alumno elige la sesión que desea realizar.
  - Si se incluye el parámetro en la URL (ej: `?sesion=1` o `?sesion=2`), la aplicación carga directamente esa sesión (ideal para incrustar una sesión por cada página de Google Sites).
- **Corrección Inmediata y Explicaciones Didácticas**: Al terminar, el alumno ve su nota, las respuestas correctas/incorrectas y la explicación astronómica pedagógica de cada fallo.
- **Certificado Imprimible / Guardar en PDF**: Botón que genera un diploma formal de aprovechamiento con estética oficial de Cosmos Mataró mediante `window.print()`.
- **Integración con Google Sheets**: Envío automático de calificaciones, marcas temporales, nombres y respuestas de alumnos a una hoja de cálculo privada mediante un webhook ligero en Google Apps Script.
- **Diseño Astronómico Moderno y Responsive**: Estética cósmica oscura, navegación fluida por teclado o ratón, adaptable a ordenadores, tablets y teléfonos móviles dentro del `<iframe>` de Google Sites.

---

## 📁 Estructura del Proyecto

```text
cosmosmataro-evaluaciones/
├── index.html                  # Página principal de la aplicación
├── assets/
│   └── logo.svg                # Emblema vectorial de Cosmos Mataró
├── css/
│   └── style.css               # Estilos astronómicos, animaciones y formato para diploma
├── js/
│   ├── config.js               # Parámetros (URL webhook, nota de corte, nombres)
│   └── app.js                  # Lógica del cuestionario, puntuaciones y envío
├── data/
│   ├── sesiones.json           # Títulos y descripciones de las 4 sesiones
│   ├── sesion-1.json           # 20 preguntas: El cielo nocturno y la esfera celeste
│   ├── sesion-2.json           # 20 preguntas: El Sistema Solar
│   ├── sesion-3.json           # 20 preguntas: Instrumentación y observación
│   └── sesion-4.json           # 20 preguntas: Estrellas, espacio profundo y cosmología
├── google-apps-script/
│   └── Code.gs                 # Script para vincular automáticamente con Google Sheets
├── README.md                   # Esta guía
└── .gitignore
```

---

## ✍️ Cómo Rellenar o Modificar las Preguntas de los Profesores

Los archivos se encuentran en la carpeta `data/`:
- `data/sesion-1.json`
- `data/sesion-2.json`
- `data/sesion-3.json`
- `data/sesion-4.json`

Cada pregunta sigue este formato estándar:

```json
{
  "id": 1,
  "pregunta": "¿Cuál es la estrella más brillante del cielo nocturno?",
  "opciones": [
    "Polaris",
    "Sirio",
    "Betelgeuse",
    "Vega"
  ],
  "correcta": 1,
  "explicacion": "Sirio (Alpha Canis Majoris) es la estrella más brillante con magnitud -1.46."
}
```

> **Nota sobre el índice `correcta`**:
> - `0` = Primera opción (A)
> - `1` = Segunda opción (B)
> - `2` = Tercera opción (C)
> - `3` = Cuarta opción (D)

---

## 🚀 Despliegue en GitHub Pages (Hosting Gratuito)

1. Crea un nuevo repositorio en tu cuenta de GitHub (ejemplo: `cosmosmataro-evaluaciones`).
2. Sube estos archivos a la rama principal (`main`):
   ```bash
   git init
   git add .
   git commit -m "Versión inicial: Evaluaciones Cosmos Mataró"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/cosmosmataro-evaluaciones.git
   git push -u origin main
   ```
3. En GitHub, ve a la pestaña **Settings** > **Pages** de tu repositorio.
4. En **Build and deployment > Source**, selecciona:
   - Branch: `main`
   - Folder: `/ (root)`
5. Haz clic en **Save**. En un par de minutos tu web estará disponible en:
   `https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/`

---

## 🌐 Inclusión en Google Sites

En el editor de tu sitio web en Google Sites:

### Opción A: Bloque único con selector de sesiones
1. En el menú lateral derecho, pulsa en **Insertar** > **Insertar código o URL** (`<>`).
2. Elige la pestaña **Por URL**.
3. Pega el enlace de GitHub Pages:
   ```text
   https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/
   ```
4. Ajusta el ancho y alto del contenedor en la página para que se vea amplio y cómodo.

### Opción B: Una página por cada sesión del curso
Si en tu Google Sites tienes una página dedicada a cada sesión, puedes incrustar directamente la sesión correspondiente añadiendo `?sesion=X`:
- **Página Sesión 1:** `https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/?sesion=1`
- **Página Sesión 2:** `https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/?sesion=2`
- **Página Sesión 3:** `https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/?sesion=3`
- **Página Sesión 4:** `https://TU_USUARIO.github.io/cosmosmataro-evaluaciones/?sesion=4`

---

## 📊 Conexión con Google Sheets (Registro de Respuestas de Alumnos)

Para que los resultados y notas de los alumnos se guarden automáticamente en una hoja de cálculo privada de Cosmos Mataró:

1. Crea una nueva hoja en Google Drive (ej: *"Evaluaciones Curso Astronomía - Cosmos Mataró"*).
2. Ve a **Extensiones** > **Apps Script**.
3. Reemplaza cualquier código existente por el contenido del archivo `google-apps-script/Code.gs`.
4. Guarda el archivo con el icono del disco o `Ctrl+S`.
5. Arriba a la derecha, pulsa en el botón azul **Implementar** (Deploy) > **Nueva implementación**.
6. En el tipo, selecciona **Aplicación web**.
7. Configuración:
   - **Ejecutar como**: `Yo` (tu cuenta)
   - **Quién tiene acceso**: `Cualquier usuario` (Anyone) *(necesario para que los alumnos puedan enviar sus notas sin necesidad de iniciar sesión en Google)*.
8. Pulsa **Implementar**, autoriza los permisos y copia la **URL de la aplicación web** generada (termina en `/exec`).
9. Abre el archivo `js/config.js` y pega esa URL en:
   ```javascript
   GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/TU_SCRIPT_ID/exec",
   ```
10. ¡Listo! A partir de ese momento, cada vez que un alumno finalice una sesión se creará una nueva fila en tu hoja con su nombre, correo, fecha, puntuación y desglose de respuestas.

---

## 💻 Prueba Local en tu Ordenador

Si quieres probar la aplicación en tu propio equipo antes de subirla a GitHub:

```bash
# Con Python (ya instalado en tu sistema):
python -m http.server 8000
```
Luego abre en tu navegador: [http://localhost:8000](http://localhost:8000)
O para probar una sesión directa: [http://localhost:8000/?sesion=1](http://localhost:8000/?sesion=1)
