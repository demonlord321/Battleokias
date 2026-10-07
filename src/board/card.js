// Card faces. One frame for every card, coloured by type, reading the fields
// from cards.json: { id, name, type, cost, level, text, ... }.
// Type-specific stats (attack, defense...) slot into .card-stats once RULES.md has them.

export const CARD_TYPES = {
  unit:      { label: "Unit",        color: "#c9a35a" },
  spell:     { label: "Spell",       color: "#3fa37a" },
  field:     { label: "Field Spell", color: "#2e8f9a" },
  trap:      { label: "Trap",        color: "#b0457a" },
  equipment: { label: "Equipment",   color: "#7f8fa3" },
  artifact:  { label: "Artifact",    color: "#d07f2c" },
  monster:   { label: "Monster",     color: "#a8322e" },
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderCard(card, faceUp = true) {
  const el = document.createElement("div");
  if (!faceUp) {
    el.className = "card card-back";
    return el;
  }
  const type = CARD_TYPES[card?.type] ?? { label: card?.type ?? "Card", color: "#9a92b8" };
  el.className = `card card-face type-${card?.type ?? "unknown"}`;
  el.style.setProperty("--type-color", type.color);
  el.dataset.cardId = card?.id ?? "";
  el.title = card?.name ?? "";
  el.innerHTML = `
    <div class="card-top">
      ${card?.cost != null ? `<span class="card-cost">${esc(card.cost)}</span>` : ""}
      <span class="card-name">${esc(card?.name ?? "Card")}</span>
    </div>
    <div class="card-art"></div>
    <div class="card-type">${esc(type.label)}${card?.level ? ` <span class="card-level">${"★".repeat(card.level)}</span>` : ""}</div>
    <div class="card-text">${esc(card?.text)}</div>
    <div class="card-stats"></div>`;
  return el;
}
