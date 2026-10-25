"use strict";
// Memory-Spiel + Startseite/Menue

let runde = [];        // gezogene Signal-IDs dieser Runde
let offen = [];        // aktuell aufgedeckte Feldkarten (max. 2)
let gesperrt = false;  // nach Fehlgriff erst weiter, wenn gelesen wurde
let zuege = 0, gefunden = 0;

function memStarten() {
  const gruppe = $("wahlGruppe").value;
  const pool = mischen(KARTEN.filter(k => gruppe === ALLE || k.g === gruppe));
  // Pro Bedeutung nur eine Karte: manche Rueckseiten sind wortgleich (z. B. Verschubverbot
  // aufgehoben als Schutzsignal), dann gaebe es zwei gleich richtige Paare
  const gesehen = new Set();
  const eindeutig = pool.filter(k => !gesehen.has(schluessel(k)) && gesehen.add(schluessel(k)));
  // kleine Gruppen (z. B. Sperrsignale) haben weniger Signale als gewuenschte Paare
  runde = eindeutig.slice(0, Number($("wahlPaare").value)).map(k => k.id);

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
  zeige("spiel", "Memory");
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
    if (gefunden === runde.length) setTimeout(memBeenden, 900);
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

function memBeenden() {
  $("endeText").textContent = `Alle ${runde.length} Paare in ${zuege} Zügen gefunden (bestmöglich: ${runde.length}).`;
  const rb = $("rueckblick");
  rb.innerHTML = "";
  for (const id of runde) rb.appendChild(paarElement(id));
  zeige("ende", "Memory");
}

// Symbol + Original-Rueckseite nebeneinander, antippen vergroessert
function paarElement(id) {
  const d = document.createElement("div");
  d.className = "paar";
  d.innerHTML = `<img src="${bild("s", id)}" alt=""><img src="${bild("n", id)}" alt="">`;
  d.querySelectorAll("img").forEach(img => img.addEventListener("click", () => zoomen(img.src)));
  return d;
}

// --- Ereignisse ---------------------------------------------------------
gruppenAuffuellen($("wahlGruppe"));
document.querySelectorAll(".spielwahl").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.ziel === "trStart") trStartZeigen(); else zeige("start", "Memory");
}));
$("btnStart").addEventListener("click", memStarten);
$("btnNochmal").addEventListener("click", memStarten);
$("btnZurueck").addEventListener("click", () => zeige("start", "Memory"));
$("btnMenue").addEventListener("click", () => zeige("home"));
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
zeige("home");
