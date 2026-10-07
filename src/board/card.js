// Card faces. One frame for every card, coloured by type, reading the fields
// from cards.json: { id, name, type, grade (falls back to cost), text, ... }.
// Unit cards (RULES.md): the unit image fills the card as its background, with an
// Attack stat, a Defense stat and a Formation Effect. Fields: image, attack, defense, formation.

export const CARD_TYPES = {
  unit:      { label: "Unit",        color: "#c9a35a" },
  spell:     { label: "Spell",       color: "#3fa37a" },
  field_spell: { label: "Field Spell", color: "#2e8f9a" },
  field:     { label: "Field Spell", color: "#2e8f9a" }, // older name, kept so old data still renders
  trap:      { label: "Trap",        color: "#b0457a" },
  equipment: { label: "Equipment",   color: "#7f8fa3" },
  artifact:  { label: "Artifact",    color: "#d07f2c" },
  monster:   { label: "Monster",     color: "#a8322e" },
  formation: { label: "Formation",   color: "#5a6fd0" },
};

// Signets (RULES.md): the card's Signet symbols sit in its top-left corner.
// A card can carry more than one.
export const SIGNETS = {
  arms:    { label: "School of Arms",    symbol: "⚔", color: "#c8483a" },
  magic:   { label: "School of Magic",   symbol: "✦", color: "#7a5ce0" },
  alchemy: { label: "School of Alchemy", symbol: "⚗", color: "#3f9a5a" },
};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Formation cards (RULES.md): `slots` lists the Unit Position Slots the Formation needs,
// as ups indexes on the owner's side (row*3+col, row 0 = front row). Frontal Assault is [0,1,2].
// Drawn as a mini 3x3 with the front row at the top, the way the owner sees their grid.
export function formationPattern(slots) {
  const set = new Set(slots);
  const cells = Array.from({ length: 9 }, (_, i) => `<span class="fp-cell${set.has(i) ? " is-on" : ""}"></span>`).join("");
  return `<div class="formation-pattern" title="Needs units in the highlighted slots (front row at the top)">${cells}</div>`;
}

function signetIcons(signets = []) {
  return signets
    .map((id) => {
      const sg = SIGNETS[String(id).toLowerCase()];
      if (!sg) return `<span class="signet" title="${esc(id)}">?</span>`;
      return `<span class="signet" title="${sg.label}" style="--signet-color:${sg.color}">${sg.symbol}</span>`;
    })
    .join("");
}

export function renderCard(card, faceUp = true) {
  const el = document.createElement("div");
  if (!faceUp) {
    el.className = "card card-back";
    return el;
  }
  const type = CARD_TYPES[card?.type] ?? { label: card?.type ?? "Card", color: "#9a92b8" };
  const grade = card?.grade ?? card?.cost ?? null;
  el.className = `card card-face type-${card?.type ?? "unknown"}`;
  el.style.setProperty("--type-color", type.color);
  el.dataset.cardId = card?.id ?? "";
  const isUnit = card?.type === "unit";
  if (isUnit) el.classList.add("is-unit");
  if (card?.image) el.style.setProperty("--card-image", `url("${encodeURI(card.image)}")`);
  el.title = card?.name ?? "";
  el.innerHTML = `
    <div class="card-top">
      <span class="card-signets">${signetIcons(card?.signets)}</span>
      ${grade != null ? `<span class="card-cost card-grade" data-grade="${esc(Math.min(grade, 6))}" title="${isUnit ? `Grade ${esc(grade)}: costs ${esc(grade)} Energy` : `Costs ${esc(grade)} Energy`}">${esc(grade)}</span>` : ""}
    </div>
    <div class="card-name">${esc(card?.name ?? "Card")}</div>
    <div class="card-art">${card?.type === "formation" && Array.isArray(card.slots) ? formationPattern(card.slots) : ""}</div>
    <div class="card-type">${esc(type.label)}</div>
    ${isUnit && card?.formation ? `<div class="card-formation"><b>Formation:</b> ${esc(card.formation)}</div>` : ""}
    <div class="card-text">${esc(card?.text)}</div>
    ${isUnit ? `<div class="card-stats">
      <span class="stat-atk" title="Attack">&#x2694; ${esc(card?.attack ?? "?")}</span>
      <span class="stat-def" title="Defense">&#x1F6E1; ${esc(card?.defense ?? "?")}</span>
    </div>` : ""}`;
  return el;
}
