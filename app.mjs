import { createHoldTracker } from './lockState.mjs';

const UNLOCK_HOLD_MS = 2000;

const lockButton = document.getElementById('lockButton');
const overlay = document.getElementById('overlay');
const holdTimer = document.getElementById('holdTimer');

const tracker = createHoldTracker(UNLOCK_HOLD_MS);
let locked = false;
let rafId = null;

function suppressEvent(event) {
  event.preventDefault();
  event.stopPropagation();
}

function updateHoldTimer(nowMs) {
  const elapsed = tracker.elapsedMs(nowMs);
  if (elapsed === null) {
    holdTimer.classList.remove('active');
    return;
  }
  const remaining = Math.max(0, UNLOCK_HOLD_MS - elapsed);
  holdTimer.textContent = `${(remaining / 1000).toFixed(3)}s`;
  holdTimer.classList.add('active');
}

function checkUnlock() {
  const now = performance.now();
  updateHoldTimer(now);
  if (tracker.isHeldLongEnough(now)) {
    unlock();
    return;
  }
  rafId = requestAnimationFrame(checkUnlock);
}

// Listeners are attached once and gated on `locked` rather than
// added/removed by lock()/unlock(). OS key-repeat keeps firing keydown
// events for as long as Space is physically held; add/remove timing
// around the exact instant unlock() fires could let one slip through
// unsuppressed. A synchronous flag check has no such race.

function onKeyDown(event) {
  if (!locked) return;
  if (event.code === 'Space') {
    tracker.press(performance.now());
  }
  suppressEvent(event);
}

function onKeyUp(event) {
  if (!locked) return;
  if (event.code === 'Space') {
    tracker.release();
  }
  suppressEvent(event);
}

function onContextMenu(event) {
  if (!locked) return;
  suppressEvent(event);
}

function onScrollOrTouch(event) {
  if (!locked) return;
  suppressEvent(event);
}

function onFullscreenChange() {
  // Browsers force-exit fullscreen on Escape and JS cannot stop it —
  // if that happens while we think we're locked, re-sync to reality.
  if (locked && !document.fullscreenElement) {
    unlock();
  }
}

window.addEventListener('keydown', onKeyDown, true);
window.addEventListener('keyup', onKeyUp, true);
window.addEventListener('contextmenu', onContextMenu, true);
window.addEventListener('wheel', onScrollOrTouch, { capture: true, passive: false });
window.addEventListener('touchmove', onScrollOrTouch, { capture: true, passive: false });
document.addEventListener('fullscreenchange', onFullscreenChange);

function lock() {
  locked = true;
  // Even with the flag gate above, a stray unsuppressed Space keyup should
  // not be able to activate a focused button — so make sure nothing is
  // focused for the duration of the lock.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  overlay.classList.add('active');
  document.documentElement.requestFullscreen().catch(() => {});
  rafId = requestAnimationFrame(checkUnlock);
}

function unlock() {
  locked = false;
  overlay.classList.remove('active');
  holdTimer.classList.remove('active');
  tracker.release();
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

lockButton.addEventListener('click', lock);
