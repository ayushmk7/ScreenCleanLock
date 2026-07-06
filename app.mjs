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
