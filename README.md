# GRINDSET — Workout Tracker

A two-panel pushup tracker built for a 24 sets × 30 reps × 45s-rest workout
(edit the numbers in `js/engine.js` → `DEFAULT_CONFIG` for a different plan).

- **`me.html`** — your panel. PIN-locked. Full controls, live pace tracking,
  and a low-key **Manual Adjust** section for nudging the rep count up or down.
- **`dad.html`** — spectator panel. Read-only, no adjust controls, no way to
  tell it exists. Share this link with your dad.

Adjusting reps recalculates elapsed time using your real average time-per-rep
(plus a full 45s rest for every set boundary it skips over), so the clock on
both panels always matches the rep count — nudge it and the timer jumps too.

## 1. Run it locally

Just open `index.html` in a browser — no build step. On one device/browser,
`me.html` and `dad.html` will sync live between tabs automatically (via
`localStorage`).

## 2. Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "grindset tracker"
git branch -M main
git remote add origin https://github.com/<you>/grindset.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Deploy from branch → `main` / root**.
Your app will be live at `https://<you>.github.io/grindset/`.

Send yourself `.../me.html` and your dad `.../dad.html`.

## 3. Cross-device sync (optional but recommended)

By default, syncing uses `localStorage`, which **only works between tabs on
the same browser/device** — great for testing, not for "my phone, his phone."

For real cross-device live sync:

1. Go to [Firebase console](https://console.firebase.google.com) → create a
   free project.
2. Build → Realtime Database → Create database → start in **test mode**.
3. Project settings → your apps → add a **web app** → copy the config object.
4. Paste those values into `js/firebase-config.js`.
5. Commit and push. Both panels will now update instantly across devices.

(Test mode leaves the database open to anyone with the URL — fine for a
personal fitness tracker, but don't put anything sensitive in it.)

## 4. Changing the PIN

`me.html` defaults to PIN **`7734`**. To set your own, open the browser
console on `me.html` once and run:

```js
localStorage.setItem('grindset_pin', '1234'); // your new PIN
```

That's stored per-device, so set it separately on each device you use.

## How the manual adjust math works

- Every genuine rep tap records how long that rep took. The last ~40 taps are
  averaged into your pace.
- **Adding** N reps fast-forwards the clock by `N × your average pace`, plus
  one full 45s rest for every set boundary the jump skips over. If it lands
  you exactly on a set boundary, a real rest period starts.
- **Removing** N reps unwinds the same math in reverse, including pulling
  back a rest if it uncrosses a set boundary.
- If you haven't done a single real rep yet, it falls back to a 1.8s/rep
  estimate.
