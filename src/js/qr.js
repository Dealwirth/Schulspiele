/* ==========================================================================
   Seidla — QR-Code
   Damit niemand einen vierstelligen Code abtippen muss: der Wirt zeigt einen
   QR-Code, den die anderen mit der Kamera abscannen. Darin steckt die Adresse
   der Seite samt Code — wer scannt, landet direkt im Beitritt.

   Der Code wird als SVG gezeichnet, damit er auf jedem Bildschirm scharf
   bleibt. Die Rechenarbeit macht die Bibliothek qrcode-generator (MIT).
   ========================================================================== */
(function () {
  "use strict";
  const SS = window.SS;

  /** Ist die QR-Bibliothek geladen? */
  const available = () => typeof window.qrcode === "function";

  /**
   * Adresse für den Beitritt. Der Code steckt als Parameter drin, damit
   * ein Scan direkt in die richtige Runde führt.
   */
  function joinUrl(code) {
    const base = location.origin + location.pathname;
    return base + "#join=" + String(code || "").toUpperCase();
  }

  /** Text in einen QR-Code verwandeln: { svg, size, modules }. */
  function make(text, opts) {
    opts = opts || {};
    if (!available()) return null;
    try {
      // Fehlerkorrektur M: guter Kompromiss aus Größe und Robustheit.
      const qr = window.qrcode(0, opts.ec || "M");
      qr.addData(String(text));
      qr.make();
      const count = qr.getModuleCount();
      const quiet = opts.quiet === undefined ? 2 : opts.quiet;   // Ruhezone
      const total = count + quiet * 2;
      const dark = opts.dark || "#140d08";
      const light = opts.light || "#f4e9d4";
      const parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + total + '" ' +
        'width="' + (opts.size || 260) + '" height="' + (opts.size || 260) + '" shape-rendering="crispEdges">',
        '<rect width="' + total + '" height="' + total + '" fill="' + light + '"/>',
        '<path fill="' + dark + '" d="',
      ];
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) parts.push("M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z");
        }
      }
      parts.push('"/></svg>');
      return { svg: parts.join(""), size: opts.size || 260, modules: count };
    } catch (e) {
      console.warn("QR-Code konnte nicht gebaut werden", e);
      return null;
    }
  }

  /** Fertiges Element für die Anzeige. */
  function element(text, opts) {
    const made = make(text, opts);
    if (!made) {
      return SS.el("div", { class: "qr-fallback muted small", text: "QR-Code gerade nicht möglich — bitte den Code eintippen." });
    }
    const box = SS.el("div", { class: "qr-box" });
    box.innerHTML = made.svg;
    return box;
  }

  SS.qr = { available, make, element, joinUrl };
})();
