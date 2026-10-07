# Battle'O'Kias

A trading card game in plain HTML, CSS and JavaScript. No build step, no frameworks.

## Run it

The code uses JavaScript modules, which browsers only load from a web server (not by
double-clicking `index.html`, which just shows a blank page). From this folder, run either:

```bash
python -m http.server 8000      # then open http://localhost:8000
npx serve .                     # or this, if you have Node
```

## Layout

| Path | What it is |
|------|------------|
| `index.html` | every screen, as `<section class="screen">` blocks |
| `style.css` | all the styling |
| `src/main.js` | entry point: sets up the screens, starts on the menu |
| `src/screens.js` | tiny screen switcher (`registerScreen`, `showScreen`) |
| `src/screens/menu.js` | main menu: title + New Game |
| `src/screens/game.js` | game screen: empty board for now, Esc returns to the menu |
| `src/engine/` | rules engine (plain JS, no graphics); run its tests with `npm test` |

## Adding a screen

1. Add `<section id="my-screen" class="screen">...</section>` to `index.html`.
2. Create `src/screens/my.js` that calls `registerScreen("my", { el: "#my-screen", onShow, onKey })`.
3. Call its setup function from `src/main.js`, and use `showScreen("my")` to switch to it.
