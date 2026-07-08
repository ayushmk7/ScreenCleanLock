# ScreenCleanLock

A tiny static web app that locks your screen and keyboard so you can wipe your monitor without triggering clicks, scrolls, or keystrokes. No dependencies, no build step — just HTML, CSS, and vanilla JS.

**Live:** [screencleanlock.vercel.app](https://screencleanlock.vercel.app)

## How it works

1. Click **Lock**. The page goes fullscreen and a black overlay covers the screen.
2. While locked, clicks, scrolls, touches, and right-clicks are suppressed — safe to wipe the screen or keyboard.
3. Hold **Space** for 2 seconds to unlock. A countdown shows how much longer to hold.
4. Pressing **Escape** force-exits fullscreen (browsers don't let JS block this) — the app detects the fullscreen change and unlocks automatically, staying in sync with reality.

## Run locally

No build step needed. Serve the directory with any static file server, e.g.:

```
npx serve .
```

Then open the printed local URL.

## Test

```
node --test
```

Runs the unit tests in [lockState.test.mjs](lockState.test.mjs) using Node's built-in test runner.

## Deploy

Deployed on Vercel as a static site (see [vercel.json](vercel.json)). Push to `main` and Vercel builds automatically, or deploy manually:

```
vercel --prod
```

## Project structure

- [index.html](index.html) — markup and styles
- [app.mjs](app.mjs) — lock/unlock behavior, event suppression, fullscreen sync
- [lockState.mjs](lockState.mjs) — hold-to-unlock timing logic
- [lockState.test.mjs](lockState.test.mjs) — unit tests for the hold tracker
