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
  martial: { label: "School of Martial", symbol: "⚔", color: "#c8483a" },
  mystic:  { label: "School of Mystic",  symbol: "✦", color: "#7a5ce0" },
  alchemy: { label: "School of Alchemy", symbol: "⚗", color: "#3f9a5a" },
  // Not a deck theme: cards with it fit in every deck (Dyllan, 9 Oct).
  battleokias: { label: "Battle'O'Kias (fits any deck)", symbol: "◆", color: "#d9b45a" },
};
// Old names (Dyllan, 9 Oct: Arms is now Martial, Magic is now Mystic), so older data still draws.
const SIGNET_ALIASES = { arms: "martial", magic: "mystic", "battle'o'kias": "battleokias", bok: "battleokias" };
// Retired Signets (only the three base Signets are used now): not drawn at all.
const RETIRED_SIGNETS = new Set(["mercenary", "hero"]);

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Formation cards (RULES.md): `slots` lists the Unit Position Slots the Formation needs,
// as ups indexes on the owner's side (row*3+col, row 0 = front row). Frontal Assault is [0,1,2].
// Damage Grade / Defense Grade (RULES.md) read from damageGrade / defenseGrade (placeholders 1 / 0).
// Drawn as a mini 3x3 with the front row at the top, the way the owner sees their grid.
// Formations with `slotOptions` (Line Defense: any one full row) draw every option lit, marked
// "any one row", since the engine counts whichever full option is strongest.
export function formationPattern(slots, options = null) {
  const set = new Set(options ? options.flat() : slots);
  const cells = Array.from({ length: 9 }, (_, i) => `<span class="fp-cell${set.has(i) ? " is-on" : ""}"></span>`).join("");
  const title = options ? "Needs one full row of units, any row; the strongest full row counts (front row at the top)" : "Needs units in the highlighted slots (front row at the top)";
  return `<div class="formation-pattern${options ? " is-options" : ""}" title="${title}">${cells}${options ? `<span class="fp-note">any one row</span>` : ""}</div>`;
}

function signetIcons(signets = []) {
  return signets
    .map((id) => String(id).toLowerCase())
    .map((id) => SIGNET_ALIASES[id] ?? id)
    .filter((id) => !RETIRED_SIGNETS.has(id))
    .map((id, i) => {
      // The first Signet sets the promotion line; any after it are sub-Signets, drawn smaller.
      const cls = i === 0 ? "signet" : "signet is-sub";
      const role = i === 0 ? " (promotion line)" : " (sub-Signet)";
      const sg = SIGNETS[id];
      if (!sg) return `<span class="${cls}" title="${esc(id)}${role}">?</span>`;
      return `<span class="${cls}" title="${sg.label}${role}" style="--signet-color:${sg.color}">${sg.symbol}</span>`;
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
  // Named units (Grade 4 and up) carry a Class and flavour text.
  const named = isUnit && (card?.class || card?.flavor);
  if (named) el.classList.add("is-named");
  if (card?.image) el.style.setProperty("--card-image", `url("${encodeURI(card.image)}")`);
  el.title = [card?.name ?? "", named && card.class ? `Class: ${card.class}` : "", named && card.flavor ? `\u201c${card.flavor}\u201d` : ""].filter(Boolean).join("\n");
  el.innerHTML = `
    <div class="card-top">
      <span class="card-signets">${signetIcons(card?.signets)}</span>
      ${grade != null ? `<span class="card-cost card-grade" data-grade="${esc(Math.min(grade, 6))}" title="${isUnit ? `Grade ${esc(grade)}: costs ${esc(grade)} Energy` : `Costs ${esc(grade)} Energy`}">${esc(grade)}</span>` : ""}
    </div>
    <div class="card-name">${esc(card?.name ?? "Card")}</div>
    <div class="card-art">${card?.type === "formation" && Array.isArray(card.slotOptions) ? formationPattern(null, card.slotOptions) : card?.type === "formation" && Array.isArray(card.slots) ? formationPattern(card.slots) : ""}</div>
    <div class="card-type">${esc(type.label)}${named && card.class ? ` <span class="card-class">\u00b7 ${esc(card.class)}</span>` : ""}</div>
    ${isUnit && card?.formation ? `<div class="card-formation"><b>Formation:</b> ${esc(card.formation)}</div>` : ""}
    <div class="card-text">${esc(card?.text)}</div>
    ${named && card.flavor ? `<div class="card-flavor">${esc(card.flavor)}</div>` : ""}
    ${card?.type === "formation" ? `<div class="card-stats formation-grades">
      <span class="stat-dmg-grade" title="Damage Grade: Damage Counters dealt when this Formation's attack lands">&#x1F4A5; ${esc(card?.damageGrade ?? 1)}</span>
      <span class="stat-def-grade" title="Defense Grade: taken off the attacker's Damage Grade">&#x1F6E1; ${esc(card?.defenseGrade ?? 0)}</span>
    </div>` : ""}
    ${isUnit ? `<div class="card-stats">
      <span class="stat-atk${card?.statMods?.attack ? ` is-${card.statMods.attack}` : ""}" title="Attack${card?.statMods?.attack ? ` (base ${esc(card.baseStats.attack)})` : ""}">&#x2694; ${esc(card?.attack ?? "?")}</span>
      <span class="stat-def${card?.statMods?.defense ? ` is-${card.statMods.defense}` : ""}" title="Defense${card?.statMods?.defense ? ` (base ${esc(card.baseStats.defense)})` : ""}">&#x1F6E1; ${esc(card?.defense ?? "?")}</span>
    </div>` : ""}`;
  return el;
}
