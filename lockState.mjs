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
    elapsedMs(nowMs) {
      return pressedAt === null ? null : nowMs - pressedAt;
    },
  };
}
