"use strict";

const $ = (id) => document.getElementById(id);
const ALLE = "Alle Signale (gemischt)";

let runde = [];        // gezogene Signal-IDs dieser Runde
let offen = [];        // aktuell aufgedeckte Feldkarten (max. 2)
let gesperrt = false;  // nach Fehlgriff erst weiter, wenn gelesen wurde
let zuege = 0, gefunden = 0;

// --- Startbildschirm ---------------------------------------------------
function gruppenAuffuellen() {
  const sel = $("wahlGruppe");
  const opt = (wert, text) => { const o = document.createElement("option"); o.value = wert; o.textContent = text; sel.appendChild(o); };
  opt(ALLE, `${ALLE} – ${KARTEN.length}`);
  for (const g of GRUPPEN) opt(g, `${g} – ${KARTEN.filter(k => k.g === g).length}`);
}

function mischen(arr) {
  // Fisher-Yates statt sort(random), weil sort-basiertes Mischen ungleich verteilt
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function bild(typ, id) { return `img/${typ}${String(id).padStart(3, "0")}.jpg`; }

// --- Spiel -------------------------------------------------------------
function starten() {
  const gruppe = $("wahlGruppe").value;
  const pool = KARTEN.filter(k => gruppe === ALLE || k.g === gruppe).map(k => k.id);
  // kleine Gruppen (z. B. Sperrsignale) haben weniger Signale als gewuenschte Paare
  const anzahl = Math.min(Number($("wahlPaare").value), pool.length);
  runde = mischen(pool).slice(0, anzahl);

  const karten = mischen(runde.flatMap(id => [{ id, typ: "s" }, { id, typ: "n" }]));
  const feld = $("feld");
  feld.innerHTML = "";
  feld.classList.toggle("viele", karten.length > 12);
  for (const k of karten) {
    const el = document.createElement("div");
    el.className = "k";
    el.dataset.id = k.id;
    el.dataset.typ = k.typ;
    el.innerHTML = `<div class="innen"><div class="seite zu"></div><div class="seite auf"><img src="${bild(k.typ, k.id)}" alt=""></div></div>`;
    el.addEventListener("click", () => antippen(el));
    feld.appendChild(el);
  }
  offen = []; gesperrt = false; zuege = 0; gefunden = 0;
  vorschauLeeren();
  meldung("Tippe zwei Karten an.", "");
  statusZeigen();
  $("start").hidden = true; $("ende").hidden = true; $("spiel").hidden = false; $("btnMenue").hidden = false;
  window.scrollTo(0, 0);
}

function antippen(el) {
  if (gesperrt) { zudecken(); return; }
  // bereits gefundene Karten nur gross anzeigen, damit man nachlesen kann
  if (el.classList.contains("gefunden")) { zoomen(bild(el.dataset.typ, el.dataset.id)); return; }
  if (offen.includes(el)) return;

  el.classList.add("offen");
  offen.push(el);
  vorschauSetzen(offen.length, el);
  if (offen.length < 2) { meldung("Und die zweite Karte?", ""); return; }

  zuege++;
  const [a, b] = offen;
  // Paar nur, wenn gleiches Signal UND einmal Symbol, einmal Bezeichnung
  if (a.dataset.id === b.dataset.id && a.dataset.typ !== b.dataset.typ) {
    a.classList.add("gefunden"); b.classList.add("gefunden");
    a.classList.remove("offen"); b.classList.remove("offen");
    $("vs1").classList.add("ok"); $("vs2").classList.add("ok");
    offen = [];
    gefunden++;
    meldung("Richtig! Ein Paar gefunden.", "ok");
    statusZeigen();
    if (gefunden === runde.length) setTimeout(beenden, 900);
  } else {
    $("vs1").classList.add("falsch"); $("vs2").classList.add("falsch");
    // kein automatisches Zudecken: man soll in Ruhe lesen koennen, warum es nicht passt
    gesperrt = true;
    meldung("Passt nicht. Tippe irgendwo, um weiterzuspielen.", "falsch");
    statusZeigen();
  }
}

function zudecken() {
  for (const el of offen) el.classList.remove("offen");
  offen = []; gesperrt = false;
  vorschauLeeren();
  meldung("Tippe zwei Karten an.", "");
}

function vorschauSetzen(platz, el) {
  if (platz === 1) vorschauLeeren();
  const p = $("vs" + platz);
  p.className = "vs-platz voll";
  p.innerHTML = `<img src="${bild(el.dataset.typ, el.dataset.id)}" alt="">`;
}
function vorschauLeeren() {
  for (const p of [$("vs1"), $("vs2")]) { p.className = "vs-platz"; p.innerHTML = ""; }
}

function meldung(text, art) { const m = $("meldung"); m.textContent = text; m.className = "meldung " + art; }
function statusZeigen() {
  $("anzeigePaare").textContent = `Paare: ${gefunden} / ${runde.length}`;
  $("anzeigeZuege").textContent = `Züge: ${zuege}`;
}

function beenden() {
  $("endeText").textContent = `Alle ${runde.length} Paare in ${zuege} Zügen gefunden (bestmöglich: ${runde.length}).`;
  const rb = $("rueckblick");
  rb.innerHTML = "";
  for (const id of runde) {
    const d = document.createElement("div");
    d.className = "paar";
    d.innerHTML = `<img src="${bild("s", id)}" alt=""><img src="${bild("n", id)}" alt="">`;
    d.querySelectorAll("img").forEach(img => img.addEventListener("click", () => zoomen(img.src)));
    rb.appendChild(d);
  }
  $("spiel").hidden = true; $("ende").hidden = false;
  window.scrollTo(0, 0);
}

function zoomen(src) { const z = $("zoom"); z.querySelector("img").src = src; z.hidden = false; }

function zumMenue() {
  $("spiel").hidden = true; $("ende").hidden = true; $("start").hidden = false; $("btnMenue").hidden = true;
}

// --- Ereignisse ---------------------------------------------------------
gruppenAuffuellen();
$("btnStart").addEventListener("click", starten);
$("btnNochmal").addEventListener("click", starten);
$("btnZurueck").addEventListener("click", zumMenue);
$("btnMenue").addEventListener("click", zumMenue);
$("zoom").addEventListener("click", () => { $("zoom").hidden = true; });
// Tippen auf die Vorschau zeigt die Karte im Vollbild, falls die Schrift zu klein ist
for (const p of ["vs1", "vs2"]) $(p).addEventListener("click", (e) => {
  const img = $(p).querySelector("img");
  if (img) { e.stopPropagation(); zoomen(img.src); }
});
// nach einem Fehlgriff weiterspielen, egal wohin getippt wird
document.addEventListener("click", (e) => {
  if (gesperrt && !e.target.closest(".k") && !e.target.closest(".vs-platz") && !e.target.closest(".zoom")) zudecken();
});
