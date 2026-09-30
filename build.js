#!/usr/bin/env node
/* ==========================================================================
   Schulspiele — Build
   Erzeugt aus src/ eine einzige, abhängigkeitsfreie index.html im
   Wurzelverzeichnis. Dadurch lässt sich die Seite zusätzlich als einzelne
   Datei weitergeben (USB-Stick, Schulserver, Mailanhang).

   Aufruf:  node build.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const root = __dirname;
const src = path.join(root, "src");
const outFile = path.join(root, "index.html");

const SCRIPTS = [
  "vendor/peerjs.min.js",
  "js/app.js",
  "js/net.js",
  "js/ui.js",
  "js/games/content.js",
  "js/games/registry.js",
  "js/games/util.js",
  "js/games/board.js",
  "js/games/party.js",
  "js/games/trivia.js",
  "js/boot.js",
];

const read = (p) => fs.readFileSync(path.join(src, p), "utf8");

function build() {
  let html = read("index.html");
  const css = read("css/classic.css");

  // Alle Skript-Tags entfernen — sie werden unten gebündelt wieder eingesetzt.
  html = html.replace(/[ \t]*<script[^>]*><\/script>\s*\n?/g, "");

  // Stylesheet durch eingebettetes CSS ersetzen.
  html = html.replace(
    /<link rel="stylesheet" href="css\/classic\.css">/,
    () => "<style>\n" + css + "\n</style>"
  );

  const bundle = SCRIPTS.map((s) => "/* ── " + s + " ── */\n" + read(s)).join("\n;\n");

  // Als Funktion einsetzen, damit "$&" und "$$" im Quelltext unverändert bleiben.
  html = html.replace("</body>", () => "<script>\n" + bundle + "\n</script>\n</body>");

  fs.writeFileSync(outFile, html, "utf8");
  const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
  console.log("Gebaut: " + outFile + "  (" + kb + " KB, " + SCRIPTS.length + " Skripte)");
}

build();
