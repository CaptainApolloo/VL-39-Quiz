"use strict";
// Signal-Trainer: Abfrage mit 4 Antworten + Lernkartei (Leitner) im Browser-Speicher

const SPEICHER = "signalTrainer.v1";
const TAG = 24 * 60 * 60 * 1000;
// Abstand bis zur naechsten Abfrage je Fach: wachsende Pausen festigen das Gedaechtnis (Spacing)
const PAUSE = [0, 1, 3, 7, 14, 30].map(t => t * TAG);
const SICHER_AB = 3;     // ab Fach 3 gilt ein Signal als "sicher"
const NOCHMAL_NACH = 3;  // falsch beantwortete Signale kommen nach 3 anderen Fragen nochmal

let tr = null;           // Zustand der laufenden Runde

// --- Lernkartei --------------------------------------------------------
function kartei() {
  // try/catch, weil manche Browser (privater Modus) den Speicher sperren; dann ohne Fortschritt
  try { return JSON.parse(localStorage.getItem(SPEICHER)) || {}; } catch { return {}; }
}
function karteiSpeichern(k) { try { localStorage.setItem(SPEICHER, JSON.stringify(k)); } catch { /* egal */ } }
function eintrag(k, modus, id) { return (k[modus] && k[modus][id]) || null; }
function setzeEintrag(k, modus, id, e) { (k[modus] ||= {})[id] = e; }

function pool(gruppe) { return KARTEN.filter(k => gruppe === ALLE || k.g === gruppe); }

function standZeigen() {
  const k = kartei(), modus = $("trModus").value, p = pool($("trGruppe").value);
  const sicher = p.filter(c => (eintrag(k, modus, c.id)?.fach ?? -1) >= SICHER_AB).length;
  const gesehen = p.filter(c => eintrag(k, modus, c.id)).length;
  const faellig = p.filter(c => { const e = eintrag(k, modus, c.id); return e && e.faellig <= Date.now(); }).length;
  $("trBalken").style.width = `${Math.round(100 * sicher / p.length)}%`;
  $("trStand").textContent = `Sicher: ${sicher} von ${p.length} · schon geübt: ${gesehen} · heute fällig: ${faellig}`;
}

function trStartZeigen() { standZeigen(); zeige("trStart", "Signal-Trainer"); }

// --- Fragen auswaehlen -------------------------------------------------
function fragenWaehlen(p, modus, anzahl) {
  const k = kartei(), jetzt = Date.now();
  const mit = mischen(p.map(c => ({ c, e: eintrag(k, modus, c.id) })));
  // Reihenfolge: zuerst faellige (schwaechstes Fach zuerst), dann neue, dann der Rest
  const faellig = mit.filter(x => x.e && x.e.faellig <= jetzt).sort((a, b) => a.e.fach - b.e.fach);
  const neu = mit.filter(x => !x.e);
  const rest = mit.filter(x => x.e && x.e.faellig > jetzt).sort((a, b) => a.e.fach - b.e.fach);
  return [...faellig, ...neu, ...rest].slice(0, anzahl).map(x => x.c.id);
}

// Ablenker moeglichst aehnlich waehlen, damit genau die Unterschiede (alt/neu, Tag/Nacht,
// Form/Licht, Vorsignal/Hauptsignal) geuebt werden und nicht das Offensichtliche
function ablenker(richtig) {
  const r = KARTE[richtig], rs = schluessel(r);
  const andere = mischen(KARTEN.filter(k => schluessel(k) !== rs));
  const stufe = (k) =>
    k.t === r.t ? 0 :                      // gleiche Bezeichnung, andere Ausfuehrung
    k.k === r.k && k.a === r.a ? 1 :       // gleiche Signalart
    k.k === r.k || k.g === r.g ? 2 : 3;    // gleiche Gruppe
  andere.sort((a, b) => stufe(a) - stufe(b));
  const gewaehlt = [], schl = new Set([rs]);
  for (const k of andere) {
    if (schl.has(schluessel(k))) continue;
    schl.add(schluessel(k)); gewaehlt.push(k.id);
    if (gewaehlt.length === 3) break;
  }
  return gewaehlt;
}

// --- Runde -------------------------------------------------------------
function trStarten() {
  const modus = $("trModus").value;
  const p = pool($("trGruppe").value);
  const anzahl = Math.min(Number($("trAnzahl").value), p.length);
  tr = { modus, liste: fragenWaehlen(p, modus, anzahl), pos: 0, richtig: 0, fragen: 0,
         falschSet: new Set(), wiederholt: new Set() };
  trFrageZeigen();
}

function trFrageZeigen() {
  const id = tr.liste[tr.pos], c = KARTE[id];
  const ids = mischen([id, ...ablenker(id)]);
  $("trNr").textContent = `Frage ${tr.pos + 1} / ${tr.liste.length}`;
  $("trPunkte").textContent = `Richtig: ${tr.richtig}`;
  $("trLoesung").hidden = true;

  const auf = $("trAufgabe"), opt = $("trOptionen");
  opt.innerHTML = "";
  if (tr.modus === "bild") {
    auf.className = "aufgabe bildaufgabe";
    auf.innerHTML = `<p class="frage">Welches Signal ist das?</p><img src="${bild("s", id)}" alt="">`;
    opt.className = "optionen text";
    for (const o of ids) {
      const b = document.createElement("button");
      b.className = "opt";
      b.dataset.id = o;
      b.innerHTML = `<strong>${KARTE[o].t}</strong><span>${KARTE[o].k} · ${KARTE[o].a}</span>`;
      b.addEventListener("click", () => antworten(b));
      opt.appendChild(b);
    }
  } else {
    auf.className = "aufgabe textaufgabe";
    auf.innerHTML = `<p class="frage">Welches Symbol gehört dazu?</p><strong>${c.t}</strong><span>${c.k} · ${c.a}</span>`;
    opt.className = "optionen bilder";
    for (const o of ids) {
      const b = document.createElement("button");
      b.className = "opt";
      b.dataset.id = o;
      b.innerHTML = `<img src="${bild("s", o)}" alt="">`;
      b.addEventListener("click", () => antworten(b));
      opt.appendChild(b);
    }
  }
  zeige("trFrage", "Signal-Trainer");
}

function antworten(btn) {
  if (!$("trLoesung").hidden) return;  // schon beantwortet
  const id = tr.liste[tr.pos];
  // gleiche Bedeutung zaehlt als richtig (z. B. zwei Ausfuehrungen desselben Schlusssignals)
  const ok = schluessel(KARTE[btn.dataset.id]) === schluessel(KARTE[id]);
  for (const b of $("trOptionen").children) {
    b.disabled = true;
    if (schluessel(KARTE[b.dataset.id]) === schluessel(KARTE[id])) b.classList.add("ok");
  }
  if (!ok) btn.classList.add("falsch");
  tr.fragen++;

  const k = kartei(), alt = eintrag(k, tr.modus, id);
  const erstesMal = !tr.wiederholt.has(id);
  if (ok) {
    if (erstesMal) {
      tr.richtig++;
      const fach = Math.min((alt?.fach ?? 0) + 1, PAUSE.length - 1);
      setzeEintrag(k, tr.modus, id, { fach, faellig: Date.now() + PAUSE[fach] });
    }
    // nach einem Fehler in derselben Runde nicht befoerdern: einmal Glueck zaehlt nicht als gelernt
  } else {
    tr.falschSet.add(id);
    setzeEintrag(k, tr.modus, id, { fach: 0, faellig: Date.now() });
    if (!tr.wiederholt.has(id)) {
      tr.wiederholt.add(id);
      tr.liste.splice(Math.min(tr.pos + 1 + NOCHMAL_NACH, tr.liste.length), 0, id);
    }
  }
  karteiSpeichern(k);

  $("trUrteil").textContent = ok ? "Richtig!" : "Leider falsch. Das richtige Signal:";
  $("trUrteil").className = "meldung " + (ok ? "ok" : "falsch");
  // erst nach dem Laden scrollen: vorher hat das Bild Hoehe 0 und der Weiter-Knopf rutscht danach aus dem Bild
  const zumKnopf = () => $("trWeiter").scrollIntoView({ behavior: "smooth", block: "end" });
  $("trRueck").onload = zumKnopf;
  $("trRueck").src = bild("n", id);
  $("trLoesung").hidden = false;
  $("trPunkte").textContent = `Richtig: ${tr.richtig}`;
  if ($("trRueck").complete) zumKnopf();
}

function weiter() {
  tr.pos++;
  if (tr.pos < tr.liste.length) trFrageZeigen(); else trBeenden();
}

function trBeenden() {
  const erste = tr.liste.length - tr.wiederholt.size;
  $("trEndeText").textContent = `${tr.richtig} von ${erste} Signalen beim ersten Versuch richtig.`;
  const f = $("trFehler");
  f.innerHTML = "";
  for (const id of tr.falschSet) f.appendChild(paarElement(id));
  $("trFehlerTitel").hidden = tr.falschSet.size === 0;
  zeige("trEnde", "Signal-Trainer");
}

// --- Ereignisse ---------------------------------------------------------
gruppenAuffuellen($("trGruppe"));
$("trGruppe").addEventListener("change", standZeigen);
$("trModus").addEventListener("change", standZeigen);
$("trLos").addEventListener("click", trStarten);
$("trNochmal").addEventListener("click", trStarten);
$("trWeiter").addEventListener("click", weiter);
$("trRueck").addEventListener("click", () => zoomen($("trRueck").src));
$("trReset").addEventListener("click", () => {
  const g = $("trGruppe").value, modus = $("trModus").value;
  if (!confirm(`Fortschritt für „${g}“ (${$("trModus").selectedOptions[0].textContent}) löschen?`)) return;
  const k = kartei();
  for (const c of pool(g)) if (k[modus]) delete k[modus][c.id];
  karteiSpeichern(k);
  standZeigen();
});
