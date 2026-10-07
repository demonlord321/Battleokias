// Tiny screen switcher: only one <section class="screen"> is visible at a time.
//
// Usage:
//   registerScreen("menu", { el: "#menu-screen", onShow() {...}, onHide() {...}, onKey(e) {...} });
//   showScreen("menu");

const screens = {};
let current = null;

export function registerScreen(name, { el, onShow, onHide, onKey } = {}) {
  const element = document.querySelector(el);
  if (!element) throw new Error(`Screen "${name}": no element matches ${el}`);
  screens[name] = { element, onShow, onHide, onKey };
}

export function showScreen(name) {
  const next = screens[name];
  if (!next) throw new Error(`Unknown screen "${name}"`);
  if (current) {
    current.element.classList.remove("active");
    current.onHide?.();
  }
  current = next;
  current.element.classList.add("active");
  current.onShow?.();
}

export function currentScreen() {
  return Object.keys(screens).find((name) => screens[name] === current) ?? null;
}

// Key presses go to whichever screen is showing.
document.addEventListener("keydown", (e) => current?.onKey?.(e));
