# Cosmos Mataró · Evaluaciones del Curso de Iniciación a la Astronomía

Aplicación web interactiva diseñada para la evaluación continua de los alumnos del **Curso de Iniciación a la Astronomía** de la **Agrupació Astronòmica Cosmos Mataró**, optimizada para integrarse directamente dentro de **Google Sites** y desplegarse gratuitamente en **GitHub Pages**.

---

## 🌟 Características Principales

- **4 Sesiones Formativas + Examen Global**: 20 preguntas con 4 opciones por cada sesión (80 preguntas en total) más un **Examen Global de Certificación** que combina 5 preguntas aleatorias y equilibradas de cada módulo.
- **Doble Nivel Pedagógico**:
  - Las sesiones 1 a 4 funcionan como autoevaluación continua y formativa con corrección y explicaciones didácticas.
  - El **Examen Global de Certificación** da acceso exclusivo al **Certificado Oficial d'Aprofitament** en PDF al alcanzar un mínimo del 60% (12 aciertos).
- **Separación Limpia de Datos y Código**: Todas las preguntas están en archivos JSON independientes (`data/sesion-1.json`, etc.) para que cualquier profesor pueda editarlas o completarlas sin tocar código.
- **Modo Selector o Modo Sesión Directa**:
  - Si se accede a la raíz, el alumno elige la sesión o el Examen Global que desea realizar.
  - Si se incluye el parámetro en la URL (ej: `?sesion=1`, `?sesion=4` o `?sesion=global`), la aplicación carga directamente esa prueba (ideal para incrustar por páginas en Google Sites).
- **Corrección Inmediata y Explicaciones Didácticas**: Al terminar, el alumno ve su nota, las respuestas correctas/incorrectas con la etiqueta de la sesión de origen y la explicación astronómica pedagógica de cada fallo.
- **Certificado Imprimible / Descargar en PDF**: Ventana emergente con `html2pdf.js` y `@media print` para descargar directamente o imprimir el diploma formal oficial de aprovechamiento de Cosmos Mataró.
- **Acceso Exclusivo por Correo y Clave**: Pantalla inicial vinculada a una lista de alumnos autorizados en Google Sheets (`Email` + `Clave`), protegiendo tanto las sesiones como el Examen Global para que solo puedan acceder quienes han completado el curso.
- **Integración con Google Sheets**: Validación de alumnos en tiempo real y envío automático de calificaciones, marcas temporales, nombres y respuestas a una hoja de cálculo privada mediante Google Apps Script.
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
│   ├── sesion-1.json           # 20 preguntas: Història de l'astronomia
│   ├── sesion-2.json           # 20 preguntas: Sistemes de referència, Temps i Espai, i Mecànica celeste
│   ├── sesion-3.json           # 20 preguntas: Instrumentación y observación
│   └── sesion-4.json           # 20 preguntas: Origen i destí: Cosmologia
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

## 📊 Conexión con Google Sheets (Registro de Respuestas y Control de Acceso)

Para que solo los alumnos que han completado el curso puedan acceder (mediante correo electrónico y clave) y sus notas se guarden automáticamente en una hoja de cálculo privada de Cosmos Mataró:

### 1. Configurar o actualizar Google Apps Script
1. Abre tu hoja de cálculo en Google Drive (o crea una nueva en [sheets.new](https://sheets.new)).
2. Ve a **Extensiones** > **Apps Script**.
3. Reemplaza cualquier código existente por el contenido completo del archivo `google-apps-script/Code.gs`.
4. Guarda el archivo con el icono del disco o `Ctrl+S`.
5. Publica los cambios como Aplicación web:
   - **Si es la primera vez**: Pulsa **Implementar** > **Nueva implementación** > tipo **Aplicación web**, con **Ejecutar como**: `Yo` y **Quién tiene acceso**: `Cualquier usuario` (Anyone). Copia la URL `/exec` generada y pégala en `GOOGLE_SHEETS_WEBHOOK_URL` dentro de `js/config.js`.
   - **Si ya lo tenías implementado**: Pulsa **Implementar** > **Gestionar implementaciones** > icono del lápiz (**Editar**) > en *Versión* elige **Nueva versión** > **Implementar** *(guardar el script sin crear una nueva versión no actualiza la URL activa)*.

### 2. Gestionar la lista de alumnos y claves en Google Sheets
1. Recarga tu hoja de cálculo de Google Sheets y en el menú superior verás **Cosmos Mataró** > **Preparar pestaña "Alumnos"** *(también se crea automáticamente al primer intento de acceso)*.
2. En la pestaña **`Alumnos`**, añade a los alumnos autorizados con estas columnas:
   - **`Email`**: Correo electrónico del alumno (se valida sin distinguir mayúsculas/minúsculas).
   - **`Clave`**: Clave de acceso asignada (puede ser una clave personal por alumno o la misma para un grupo; si la dejas vacía, puedes usar el menú **Cosmos Mataró > Generar claves para alumnos sin clave** para crear códigos automáticamente como `CM-7K9P2M`).
   - **`Nombre`** *(opcional)*: Si lo rellenas, se autocompletará en el formulario del diploma.
   - **`Activo`** *(opcional)*: Déjalo en blanco o pon `Sí` para permitir el acceso; escribe `No` para revocar el acceso a un alumno concreto.
   - **`Último acceso`** *(automático)*: Se actualiza con la fecha/hora cada vez que el alumno entra correctamente.
3. Los resultados de los exámenes se seguirán guardando en tu otra pestaña de resultados (por ejemplo `Hoja 1` o `Resultados`).

> **Nota**: Si en algún momento necesitas abrir la plataforma temporalmente sin pedir clave, cambia `REQUIRE_ACCESS_KEY: false` en `js/config.js`.

---

## 💻 Prueba Local en tu Ordenador

Si quieres probar la aplicación en tu propio equipo antes de subirla a GitHub:

```bash
# Con Python (ya instalado en tu sistema):
python -m http.server 8000
```
Luego abre en tu navegador: [http://localhost:8000](http://localhost:8000)
O para probar una sesión directa: [http://localhost:8000/?sesion=1](http://localhost:8000/?sesion=1)
