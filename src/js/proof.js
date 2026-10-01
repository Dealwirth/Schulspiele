/* ==========================================================================
   Seidla — Fotonachweis
   Aufgaben gelten erst als erledigt, wenn ein Bild da ist. Die Aufnahme läuft
   über <input type="file" accept="image/*" capture="environment"> — das öffnet
   auf iPhone, iPad und Android die Kamera und am Laptop den Dateidialog.

   Vor dem Speichern wird das Bild verkleinert. Handys liefern sonst mehrere
   Megabyte pro Foto; das sprengt den Speicher und passt nicht durch den
   Funkkanal. Das Bild wird deshalb so lange nachgeschärft, bis es in das
   vorgegebene Maß passt — die Qualität sinkt dabei nur so weit wie nötig.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const MAX_EDGE = 1000;      // längste Kante im gespeicherten Bild
  const MIN_EDGE = 480;       // kleiner wird nicht gerechnet, sonst wird's Matsch
  const QUALITY_STEPS = [0.72, 0.62, 0.52, 0.42, 0.34];

  /** Datei einlesen und auf ein übertragbares Maß bringen. */
  function shrink(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error("Kein Bild ausgewählt.")); return; }
      if (!/^image\//.test(file.type || "")) { reject(new Error("Des is a koa Bild.")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Bild konnte nicht geöffnet werden."));
        img.onload = () => {
          try { resolve(crunch(img)); } catch (e) { reject(new Error("Bild konnte nicht verkleinert werden.")); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Erst die Qualität senken, dann erst die Kantenlänge. So bleibt das Bild
   * scharf, solange es geht — ein unscharfes Bild wäre als Nachweis wertlos.
   */
  function crunch(img) {
    const budget = SS.net && SS.net.photoBudget ? SS.net.photoBudget() : 200 * 1024;
    const srcW = img.width || MAX_EDGE, srcH = img.height || MAX_EDGE;
    let edge = MAX_EDGE;
    for (let round = 0; round < 8; round++) {
      const scale = Math.min(1, edge / Math.max(srcW, srcH));
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const g = canvas.getContext("2d");
      g.drawImage(img, 0, 0, w, h);
      for (const q of QUALITY_STEPS) {
        const data = canvas.toDataURL("image/jpeg", q);
        const bytes = Math.round((data.length - 23) * 0.75);
        if (bytes <= budget) return { data, w, h, bytes, quality: q };
      }
      // Selbst die schlechteste Qualität ist zu groß: eine Stufe kleiner rechnen.
      if (edge <= MIN_EDGE) break;
      edge = Math.max(MIN_EDGE, Math.round(edge * 0.75));
    }
    // Notnagel: das Kleinste, was wir haben.
    const scale = Math.min(1, MIN_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL("image/jpeg", 0.3);
    return { data, w, h, bytes: Math.round((data.length - 23) * 0.75), quality: 0.3 };
  }

  /** Wählt der Nutzer ein Bild aus? Liefert {data,w,h} oder null. */
  function pick() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.style.position = "fixed";
      input.style.opacity = "0";
      input.style.pointerEvents = "none";
      document.body.appendChild(input);
      let done = false;
      const finish = (val) => { if (done) return; done = true; input.remove(); resolve(val); };
      input.addEventListener("change", () => {
        const f = input.files && input.files[0];
        if (!f) { finish(null); return; }
        shrink(f).then(finish).catch((e) => { SS.toast(e.message, "err"); finish(null); });
      });
      // Wird der Dialog abgebrochen, feuert kein change. Nach einer Weile
      // aufräumen, damit nichts liegen bleibt.
      input.addEventListener("cancel", () => finish(null));
      input.click();
      setTimeout(() => finish(null), 180000);
    });
  }

  const img = (data, cls) => SS.el("img", { class: cls || "proof-img", src: data, alt: "Nachweis" });

  /** Wie viel Platz brauchen alle Nachweise zusammen? */
  function estimate(dataUrl) {
    if (!dataUrl) return 0;
    return Math.round(dataUrl.length * 0.75);
  }

  SS.proof = { pick, shrink, img, estimate, MAX_EDGE };
})();
