"use strict";
// Gemeinsame Helfer fuer Trainer und Memory

const $ = (id) => document.getElementById(id);
const ALLE = "Alle Signale (gemischt)";
const SEKTIONEN = ["home", "trStart", "trFrage", "trEnde", "start", "spiel", "ende"];
const KARTE = Object.fromEntries(KARTEN.map(k => [k.id, k]));

// Zwei Karten mit gleichem Schluessel bedeuten dasselbe (z. B. Schlusssignal in zwei Ausfuehrungen).
// Sie duerfen nie gleichzeitig als "richtig" und "falsch" angeboten werden.
const schluessel = (k) => `${k.t}|${k.k}|${k.a}`;

function bild(typ, id) { return `img/${typ}${String(id).padStart(3, "0")}.jpg`; }

function mischen(arr) {
  // Fisher-Yates statt sort(random), weil sort-basiertes Mischen ungleich verteilt
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function gruppenAuffuellen(sel) {
  const opt = (wert, text) => { const o = document.createElement("option"); o.value = wert; o.textContent = text; sel.appendChild(o); };
  opt(ALLE, `${ALLE} – ${KARTEN.length}`);
  for (const g of GRUPPEN) opt(g, `${g} – ${KARTEN.filter(k => k.g === g).length}`);
}

function zeige(id, titel) {
  for (const s of SEKTIONEN) $(s).hidden = s !== id;
  $("btnMenue").hidden = id === "home";
  $("titel").textContent = titel || "Signal-Training";
  window.scrollTo(0, 0);
}

function zoomen(src) { const z = $("zoom"); z.querySelector("img").src = src; z.hidden = false; }
