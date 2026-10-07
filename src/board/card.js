// Card faces. One frame for every card, coloured by type, reading the fields
// from cards.json: { id, name, type, cost, level, text, ... }.
// Unit cards (RULES.md): the unit image fills the card as its background, with an
// Attack stat, a Defense stat and a Formation Effect. Fields: image, attack, defense, formation.

export const CARD_TYPES = {
  unit:      { label: "Unit",        color: "#c9a35a" },
  spell:     { label: "Spell",       color: "#3fa37a" },
  field:     { label: "Field Spell", color: "#2e8f9a" },
  trap:      { label: "Trap",        color: "#b0457a" },
  equipment: { label: "Equipment",   color: "#7f8fa3" },
  artifact:  { label: "Artifact",    color: "#d07f2c" },
  monster:   { label: "Monster",     color: "#a8322e" },
  formation: { label: "Formation",   color: "#5a6fd0" },
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
  const isUnit = card?.type === "unit";
  if (isUnit) el.classList.add("is-unit");
  if (card?.image) el.style.setProperty("--card-image", `url("${encodeURI(card.image)}")`);
  el.title = card?.name ?? "";
  el.innerHTML = `
    <div class="card-top">
      ${card?.cost != null ? `<span class="card-cost">${esc(card.cost)}</span>` : ""}
      <span class="card-name">${esc(card?.name ?? "Card")}</span>
    </div>
    <div class="card-art"></div>
    <div class="card-type">${esc(type.label)}${card?.level ? ` <span class="card-level">${"★".repeat(card.level)}</span>` : ""}</div>
    ${isUnit && card?.formation ? `<div class="card-formation"><b>Formation:</b> ${esc(card.formation)}</div>` : ""}
    <div class="card-text">${esc(card?.text)}</div>
    ${isUnit ? `<div class="card-stats">
      <span class="stat-atk" title="Attack">&#x2694; ${esc(card?.attack ?? "?")}</span>
      <span class="stat-def" title="Defense">&#x1F6E1; ${esc(card?.defense ?? "?")}</span>
    </div>` : ""}`;
  return el;
}
