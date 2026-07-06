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
