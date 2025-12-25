

# Project Rules: Gartic Phone UserScript Extension

## Role & Context
You are an expert **UserScript (Tampermonkey) Developer**, proficient in Modern JavaScript (ES6+), DOM Manipulation, Canvas API, and Reverse Engineering web applications.

**Target Site:** `https://garticphone.com/`
**Platform:** Tampermonkey / Violentmonkey (Browser UserScript).
**Goal:** Create a modular overlay extension that enhances the drawing experience (Painter), adds a playback system (Timelapse), and provides reference tools (Reference), managed by a central core (ModulesManager).

---

## 1. Code Style and Structure

- **Language:** JavaScript (ES6+).
- **Type Safety:** Use **JSDoc** strictly for all functions and complex objects to ensure type inference in IDEs.
- **Paradigm:**
  - Follow **Functional Programming** patterns where possible.
  - **Avoid ES6 Classes** for simple logic; use **Factory Functions** or **Module Pattern** (Closure-based objects) for stateful components (like the Player or Painter).
- **Naming Conventions:**
  - Variables: `camelCase` (e.g., `isDrawing`, `currentStroke`).
  - Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_BRUSH_SIZE`).
  - DOM Elements: Prefix with `el` (e.g., `elCanvas`, `elSettingsBtn`).
  - Private/Internal methods: Prefix with underscore `_updateState`.
- **File Structure (Logical):**
  - Even if bundled into one file, structure logic as:
    - `Core/`: ModulesManager, EventBus.
    - `Modules/`: Painter, Timelapse, Reference.
    - `UI/`: Components for Settings, Overlays (using Template Literals).
    - `Utils/`: DOM helpers, Math helpers (geometry).

---

## 2. Architecture: The ModulesManager Pattern

**Core Responsibility:**
The extension must be built around a **ModulesManager** object/factory that handles the lifecycle of features.

- **Isolation:** Every module (Painter, Timelapse, Reference) must export `init()`, `destroy()` (or `disable()`), and `isEnabled` properties.
- **Error Handling:** If a module throws a fatal error, the Manager must `catch` it, disable the module, notify the user, and keep other modules running.
- **UI & Settings:**
  - Inject a "Master Settings" gear icon next to the main Gartic logo/buttons.
  - Support **Hot-swapping**: Users can toggle modules ON/OFF in real-time without refreshing.
  - **Tooltips:** Implement a custom tooltip system (`?` icon) for configuration options.

---

## 3. UserScript & Browser API Usage

- **DOM Access:**
  - Use `MutationObserver` to detect when Gartic Phone changes views (e.g., Lobby -> Game -> Album). **Do not rely on fixed timeouts.**
  - Use `document.querySelector` with robust selectors (checking for partial class names if they are hashed).
- **Storage:**
  - Use `localStorage` for simple configs.
  - Use `GM_setValue` / `GM_getValue` for cross-session persistent data if `localStorage` is unreliable/cleared by the site.
- **Networking:**
  - Use `GM_xmlhttpRequest` for the **Reference Module** to bypass CORS when fetching images (Google Images, Pinterest).
- **Security:**
  - Isolate UI styles using **Shadow DOM** or unique CSS namespaces (`#gp-ext-root`) to prevent conflicts with the game's CSS.

---

## 4. Module Specifications (Functional Requirements)

### A. Timelapse Player
*Vector-based recording and playback of the drawing process.*

- **Data Capture:** Hook into the drawing events (pointer coordinates) to record paths.
- **Rendering:**
  - Use HTML5 Canvas API.
  - **No Pixelation:** Render paths as vectors.
  - **Speed Logic:**
    - 1-100: Interpolated animation (smooth strokes).
    - 100+: Instant stroke rendering.
- **Triggers:**
  - **Album Phase:** `MMB` (Middle Mouse) on artwork -> Replaces IMG with Player Canvas.
- **Controls:**
  - `LMB`: Play/Pause.
  - `MMB`: Expand (fill game UI) / Collapse.
  - `Double LMB`: Fullscreen.
  - `RMB`: Context Menu (Save GIF/JSON).
  - **Speed Slider:** Hold `LMB` on indicator + Drag Horizontal.

### B. Painter (Enhanced Editor)
*Gesture-based controls and precision tools.*

- **Gesture System (The "Vibe" Feature):**
  - Logic: `Hotkey (Hold)` + `LMB Down` + `Drag` = Change Value.
  - Support configurable Axis (X/Y) and Sensitivity.
  - Visual Feedback: Show a slider/indicator near cursor during adjustment.
- **Key Features:**
  - **Zoom:** Scale/Translate canvas wrapper. `Z` (Drag), `S` (Center), `A` (Reset).
  - **Brush:** `Ctrl` (Size), `Shift` (Opacity), `V` (Value/Brightness).
  - **Tools:** `Alt` (Color Picker), `Tab` (Quick Palette), `Space` (Pan).
- **Pixel Perfect:** Implement coordinate correction to fix standard Gartic offset issues.

### C. Reference Window
*Floating, draggable window for image searches.*

- **Sources:** Google Images (Region: US), Pinterest, Unsplash.
- **Interaction:**
  - **Drag & Drop:** Allow dropping local files into the Reference window.
  - **Window Management:** Resizable borders, minimize/maximize on double-click.
  - **CORS Handling:** MUST use `GM_xmlhttpRequest` to fetch search results/images.
- **UI Logic:**
  - Keep history of session searches.
  - Auto-hide/move overlapping banner ads if they obstruct the editor.

---

## 5. UI and UX Guidelines

- **Style:** Minimalist, matching Gartic Phone's cartoonish/flat aesthetic.
- **Feedback:** Use "Toast" notifications for actions (e.g., "Timelapse Saved", "Module Disabled").
- **Localization:**
  - UI Labels: English (Technical).
  - Tooltips: Detailed descriptions as provided in specs.
- **Accessibility:** Ensure hotkeys do not hard-lock the browser. Use `e.preventDefault()` only when the extension explicitly handles the event.

---

## 6. Development Workflow (Vibe Coding)

1.  **Skeleton:** Create the `ModulesManager` and the basic UserScript metadata block (`// ==UserScript==`).
2.  **Hooking:** Identify the correct DOM elements for the Canvas and Toolbar using DevTools.
3.  **Painter Core:** Implement the `GestureHandler` factory function to manage `mousedown` -> `mousemove` -> `mouseup` flows for parameter changing.
4.  **Recorder:** Implement the path recorder.
5.  **UI Injection:** Build the Settings menu and Reference window using template literals and insert them into the DOM.

---

## 7. UserScript Metadata Template

Start the project with this configuration:

```javascript
// ==UserScript==
// @name         Gartic Phone Extended
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Modules: Painter, Timelapse, Reference for Gartic Phone
// @author       VibeCoder
// @match        https://garticphone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=garticphone.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

8. Project Structure & Build Strategy (Updated)
We will use a Bundler Approach to maintain modularity during development but ensure stability for the end-user.
Directory Structure
code
Text
/src
  /Core
    - ModulesManager.js  (Main entry point, handles loading)
    - EventBus.js        (Communication between modules)
  /Modules
    /Painter
      - index.js
      - GestureHandler.js
      - Tools.js
    /Timelapse
      - index.js
      - Recorder.js
      - Player.js
    /Reference
      - index.js
      - UI.js
  /Utils
    - DOM.js             (React Fiber helpers, MutationObservers)
    - Math.js            (Coordinate correction)
  - main.js              (Imports everything and inits ModulesManager)
Technical Strategy regarding "Reference Implementation"
Instead of splitting the installed UserScript into multiple GreasyFork scripts:
Development: Write code in separate ES6 modules.
Build: Use a build script (Esbuild/Vite) to bundle everything into a single dist/GarticExtension.user.js.
Extraction Goals:
Look for __reactFiber access patterns in reference code to hook into Game State reliably.
Inspect how WebSocket is monkey-patched to capture stroke data for the Timelapse module.