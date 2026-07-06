# ScreenCleanLock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page web app with a "Lock Screen" button that goes fullscreen black, swallows all clicks/keys/scrolls, and only unlocks when the user holds Space for 2 seconds — so a screen/keyboard can be wiped down without triggering anything.

**Architecture:** Plain HTML + vanilla ESM JavaScript, no build step, no framework, no dependencies. The hold-to-unlock timing logic is pulled into a pure module (`lockState.mjs`) so it can be unit-tested with Node's built-in test runner; DOM/Fullscreen wiring lives in `app.mjs` and is verified manually (jsdom/Playwright would be a new dependency for a two-file app — not worth it).

**Tech Stack:** Vanilla HTML/CSS/JS (ES modules), Node's built-in `node:test` + `node:assert/strict` for the one unit-testable piece, Python's built-in `http.server` for local serving (avoids `file://` ES-module CORS restrictions in Chrome). Deployed as a zero-config static site on Vercel (no build step, no framework preset).

## Global Constraints

- No build step, no bundler, no npm dependencies — plain HTML/CSS/ESM JS only.
- No frameworks/libraries — vanilla DOM APIs (YAGNI for a 2-file app).
- Unit tests use Node's built-in test runner (`node --test`) — no test framework dependency.
- Requires Node 18+ (to run the unit test) and any modern evergreen browser (to run the app).
- Known browser constraint: browsers reserve the **Escape** key to force-exit Fullscreen and JS cannot intercept/preventDefault that keypress. Therefore Escape must NOT be the unlock key (a single accidental Escape would silently exit fullscreen while the app still thinks it's locked). Space is used instead, and a `fullscreenchange` listener detects the forced Escape-exit case and re-syncs app state.

---

## File Structure

- `index.html` — page markup: lock button, overlay div with unlock hint, loads `app.mjs`.
- `lockState.mjs` — pure logic: a hold-tracker (press/release/elapsed-check) with no DOM dependency. This is the only piece worth automated-testing.
- `lockState.test.mjs` — `node:test` unit tests for `lockState.mjs`.
- `app.mjs` — DOM wiring: lock/unlock, Fullscreen API calls, input-suppression listeners, `fullscreenchange` safeguard. Imports `lockState.mjs`.
- `vercel.json` — pins static (no-build) deployment and forces the correct `Content-Type` on `.mjs` files so the module script loads on Vercel's CDN exactly like it does locally.

### Task 1: Hold-tracker pure logic

**Files:**
- Create: `lockState.mjs`
- Test: `lockState.test.mjs`

**Interfaces:**
- Produces: `createHoldTracker(thresholdMs)` returning `{ press(nowMs), release(), isHeldLongEnough(nowMs) }`. Task 2's `app.mjs` consumes this exact signature.

- [ ] **Step 1: Write the failing test**

Create `lockState.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHoldTracker } from './lockState.mjs';

test('not held long enough before threshold', () => {
  const tracker = createHoldTracker(2000);
  tracker.press(1000);
  assert.equal(tracker.isHeldLongEnough(1000), false);
  assert.equal(tracker.isHeldLongEnough(2500), false);
});

test('held long enough once threshold reached', () => {
  const tracker = createHoldTracker(2000);
  tracker.press(1000);
  assert.equal(tracker.isHeldLongEnough(3000), true);
});

test('release resets the hold', () => {
  const tracker = createHoldTracker(2000);
  tracker.press(1000);
  tracker.release();
  assert.equal(tracker.isHeldLongEnough(5000), false);
});

test('repeated press calls (key-repeat while held) do not reset the start time', () => {
  const tracker = createHoldTracker(2000);
  tracker.press(1000);
  tracker.press(1500);
  tracker.press(1900);
  assert.equal(tracker.isHeldLongEnough(3000), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lockState.test.mjs`
Expected: FAIL — `Cannot find module './lockState.mjs'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `lockState.mjs`:

```js
export function createHoldTracker(thresholdMs) {
  let pressedAt = null;

  return {
    press(nowMs) {
      if (pressedAt === null) {
        pressedAt = nowMs;
      }
    },
    release() {
      pressedAt = null;
    },
    isHeldLongEnough(nowMs) {
      return pressedAt !== null && (nowMs - pressedAt) >= thresholdMs;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lockState.test.mjs`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lockState.mjs lockState.test.mjs
git commit -m "feat: add hold-to-unlock timing logic"
```

---

### Task 2: Lock-screen UI (fullscreen overlay, input suppression, unlock)

**Files:**
- Create: `index.html`
- Create: `app.mjs`

**Interfaces:**
- Consumes: `createHoldTracker(thresholdMs)` from Task 1, exact signature `{ press(nowMs), release(), isHeldLongEnough(nowMs) }`.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ScreenCleanLock</title>
<style>
  html, body {
    margin: 0;
    height: 100%;
    overflow: hidden;
    background: #111;
    color: #eee;
    font-family: system-ui, sans-serif;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }
  #lockButton {
    font-size: 1.5rem;
    padding: 0.75em 1.5em;
    border-radius: 0.5em;
    border: none;
    background: #2d6cdf;
    color: white;
    cursor: pointer;
  }
  #overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 999999;
    cursor: none;
    align-items: flex-end;
    justify-content: center;
  }
  #overlay.active {
    display: flex;
  }
  #overlay p {
    color: #333;
    font-size: 0.85rem;
    margin-bottom: 2rem;
  }
</style>
</head>
<body>
  <button id="lockButton">Lock Screen</button>
  <div id="overlay">
    <p>Hold Space for 2 seconds to unlock</p>
  </div>
  <script type="module" src="./app.mjs"></script>
</body>
</html>
```

- [ ] **Step 2: Create `app.mjs`**

```js
import { createHoldTracker } from './lockState.mjs';

const UNLOCK_HOLD_MS = 2000;

const lockButton = document.getElementById('lockButton');
const overlay = document.getElementById('overlay');

const tracker = createHoldTracker(UNLOCK_HOLD_MS);
let locked = false;
let rafId = null;

function suppressEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function checkUnlock() {
  if (tracker.isHeldLongEnough(performance.now())) {
    unlock();
    return;
  }
  rafId = requestAnimationFrame(checkUnlock);
}

function onKeyDown(event) {
  if (event.code === 'Space') {
    tracker.press(performance.now());
  }
  suppressEvent(event);
}

function onKeyUp(event) {
  if (event.code === 'Space') {
    tracker.release();
  }
  suppressEvent(event);
}

function onFullscreenChange() {
  // Browsers force-exit fullscreen on Escape and JS cannot stop it —
  // if that happens while we think we're locked, re-sync to reality.
  if (locked && !document.fullscreenElement) {
    unlock();
  }
}

function lock() {
  locked = true;
  overlay.classList.add('active');
  document.documentElement.requestFullscreen().catch(() => {});
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('contextmenu', suppressEvent, true);
  window.addEventListener('wheel', suppressEvent, { capture: true, passive: false });
  window.addEventListener('touchmove', suppressEvent, { capture: true, passive: false });
  document.addEventListener('fullscreenchange', onFullscreenChange);
  rafId = requestAnimationFrame(checkUnlock);
}

function unlock() {
  locked = false;
  overlay.classList.remove('active');
  tracker.release();
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('keyup', onKeyUp, true);
  window.removeEventListener('contextmenu', suppressEvent, true);
  window.removeEventListener('wheel', suppressEvent, true);
  window.removeEventListener('touchmove', suppressEvent, true);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
}

lockButton.addEventListener('click', lock);
```

- [ ] **Step 3: Serve the app locally**

Run (from the project root): `python3 -m http.server 8000`
(Plain `file://` won't work — Chrome blocks ES-module imports over `file://` due to CORS.)

- [ ] **Step 4: Manually verify the lock/unlock cycle**

Open `http://localhost:8000/index.html` in a browser and check every item:

- Click "Lock Screen" → screen goes fullscreen black, hint text visible near the bottom, cursor hidden.
- Click anywhere on the black screen → nothing happens.
- Press random keys (letters, arrows) → nothing happens, no scrolling/navigation.
- Scroll wheel / pinch-zoom / touch-drag → nothing happens.
- Right-click → no context menu appears.
- Hold Space for 2+ seconds → overlay disappears, fullscreen exits, "Lock Screen" button is back.
- Press Space briefly (under 2s) and release → nothing unlocks; screen stays black.
- Lock again, then press Escape → browser force-exits fullscreen (expected browser behavior); overlay should also disappear immediately (via the `fullscreenchange` handler) instead of leaving a stuck black screen with no fullscreen behind it.

Expected: every bullet behaves as described. If any fails, fix `app.mjs` before proceeding.

- [ ] **Step 5: Commit**

```bash
git add index.html app.mjs
git commit -m "feat: wire up fullscreen lock screen with hold-to-unlock"
```

---

### Task 3: Vercel deployment config

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: nothing (static config only).
- Produces: nothing (last task).

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*).mjs",
      "headers": [
        { "key": "Content-Type", "value": "application/javascript; charset=utf-8" }
      ]
    }
  ]
}
```

This pins two things explicitly rather than relying on Vercel's auto-detection: no build step (there's no `package.json`, so Vercel already serves the repo as static — this file just makes it explicit and future-proof), and a forced `Content-Type` on `.mjs` so the `<script type="module">` import in `index.html` can't break due to a MIME mismatch on Vercel's CDN.

- [ ] **Step 2: Validate the JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"`
Expected: prints `valid` with no error.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: pin static Vercel deployment config"
```

- [ ] **Step 4: Deploy and smoke-test (manual — requires a Vercel account)**

Either:
- Run `npx vercel --prod` from the project root and follow the login/link prompts, or
- Import the GitHub repo at vercel.com/new (Framework Preset: "Other", Build Command: none, Output Directory: `.`).

Once deployed, open the production URL and repeat the full manual checklist from Task 2 Step 4 (lock, click/key/scroll suppression, right-click, hold-to-unlock, Escape force-exit re-sync). Production CDN headers can differ from the local `http.server` — this is the only way to confirm the deployed version behaves the same.
