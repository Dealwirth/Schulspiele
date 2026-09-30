/* ==========================================================================
   Seidla — Fotonachweis
   Aufgaben gelten erst als erledigt, wenn ein Bild da ist. Die Aufnahme läuft
   über <input type="file" accept="image/*" capture="environment"> — das öffnet
   auf iPhone, iPad und Android die Kamera und am Laptop den Dateidialog.

   Vor dem Speichern wird das Bild auf Daumennagelgröße verkleinert. Handys
   liefern sonst mehrere Megabyte pro Foto, und der Gerätespeicher ist schnell
   voll. Für den Nachweis reicht ein kleines Bild vollkommen.
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  const MAX_EDGE = 720;   // längste Kante im gespeicherten Bild
  const QUALITY = 0.6;    // JPEG-Qualität

  /** Datei einlesen und auf Daumennagelgröße bringen. */
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
          try {
            const scale = Math.min(1, MAX_EDGE / Math.max(img.width || MAX_EDGE, img.height || MAX_EDGE));
            const w = Math.max(1, Math.round((img.width || MAX_EDGE) * scale));
            const h = Math.max(1, Math.round((img.height || MAX_EDGE) * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const g = canvas.getContext("2d");
            g.drawImage(img, 0, 0, w, h);
            resolve({ data: canvas.toDataURL("image/jpeg", QUALITY), w, h, bytes: Math.round(canvas.toDataURL("image/jpeg", QUALITY).length * 0.75) });
          } catch (e) { reject(new Error("Bild konnte nicht verkleinert werden.")); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
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
