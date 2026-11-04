/*
 * Bündel „mean“: arithmetisches Mittel (Kapitel 6) und Minimumeigenschaften (Kapitel 8).
 *   balance      Wippe: Drehpunkt a verschieben, Nulleigenschaft Σ(x_i − x̄) = 0 (Folie 114)
 *   table-mean   Mittel aus einer Häufigkeitstabelle (Folie 111) und aus Klassen (Folie 113),
 *                mit Aufgabe 8 (Übungsblatt 2) und Aufgabe 11 (Übungsblatt 3) als Beispielen
 *   outlier-tug  Ausreißer ziehen: Das Mittel wandert mit, der Median bleibt (Folie 116)
 *   min-curves   Σ|x_i − a| ist beim Median minimal (Folie 97), Σ(x_i − a)² beim Mittel (Folie 115)
 * Die reinen Hilfsfunktionen (ohne DOM) stehen in P und werden für tests/mean.test.js exportiert.
 * Alle Statistik kommt aus LM.stats, alle angezeigten Zahlen laufen durch LM.fmt.
 */
(function (root) {
  "use strict";

  /* ================================================================
     Reine Hilfsfunktionen (Node-Tests: tests/mean.test.js)
     ================================================================ */

  var EPS = 1e-9;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Auf ein Raster runden, ohne Gleitkomma-Reste (7,3000000001 → 7,3).
  function roundTo(v, step) { return +(Math.round(v / step) * step).toFixed(10); }

  // Glatte Schrittweite 1, 2, 5 · 10^k (mindestens raw).
  function niceStep(raw) {
    if (!(raw > 0) || !isFinite(raw)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    var m = n <= 1 + EPS ? 1 : n <= 2 + EPS ? 2 : n <= 5 + EPS ? 5 : 10;
    return +(m * p).toPrecision(12);
  }

  // Achsenstriche mit Schritt 1, 2, 5, 10 … (ohne 2,5, das passt besser zu ganzen Zahlen).
  function niceTicks(lo, hi, count) {
    var step = niceStep((hi - lo) / Math.max(1, count)), out = [];
    for (var k = Math.ceil(lo / step - EPS); k * step <= hi + step * EPS; k++) out.push(+(k * step).toPrecision(12));
    return out;
  }

  // Bereich einer Zahlengerade: eine glatte Einheit Rand links und rechts.
  function niceDomain(min, max) {
    if (!(max > min)) {
      var r = Math.max(1, Math.abs(min) * 0.1);
      return [min - r, max + r];
    }
    var unit = niceStep((max - min) / 8);
    return [
      +(Math.floor((min - unit) / unit + EPS) * unit).toPrecision(12),
      +(Math.ceil((max + unit) / unit - EPS) * unit).toPrecision(12)
    ];
  }

  // Schrittweite für den Drehpunkt: 0,1 bei kleinen Bereichen, sonst gröber.
  function aStep(span) { return span <= 25 + EPS ? 0.1 : niceStep(span / 100); }

  // Startposition des Drehpunkts: deutlich neben dem Mittel, damit die Wippe erst einmal kippt.
  function startA(lo, hi, mean, step) {
    var span = hi - lo, a = roundTo(lo + 0.3 * span, step);
    if (Math.abs(a - mean) < 0.12 * span) a = roundTo(mean > lo + span / 2 ? lo + 0.12 * span : hi - 0.12 * span, step);
    return clamp(a, lo, hi);
  }

  // Neigung der Wippe in Grad, proportional zum Drehmoment Σ(x_i − a) = n · (x̄ − a).
  // Volle Neigung maxDeg, wenn a um full · span neben dem Mittel liegt. Positiv: rechte Seite geht nach unten.
  function tiltDeg(sumDev, n, span, maxDeg, full) {
    if (!n || !(span > 0)) return 0;
    var deg = clamp((sumDev / n) / (full * span) * maxDeg, -maxDeg, maxDeg);
    return Math.abs(deg) < EPS ? 0 : deg;
  }

  // Das Brett darf nicht durch den Boden (drop) und nicht oben aus dem Bild (rise).
  // lenLeft/lenRight: Abstand vom Drehpunkt zum linken/rechten Brettende in Pixeln.
  function limitTilt(deg, lenLeft, lenRight, drop, rise) {
    if (!deg) return 0;
    var down = deg > 0 ? lenRight : lenLeft, up = deg > 0 ? lenLeft : lenRight, lim = Math.abs(deg);
    if (down > drop) lim = Math.min(lim, Math.asin(drop / down) * 180 / Math.PI);
    if (up > rise) lim = Math.min(lim, Math.asin(rise / up) * 180 / Math.PI);
    return deg > 0 ? lim : -lim;
  }

  // Magnet: Liegt v näher als tol an einem Ziel, springt es genau dorthin.
  function snap(v, targets, tol) {
    for (var i = 0; i < targets.length; i++) {
      if (isFinite(targets[i]) && Math.abs(v - targets[i]) < tol + EPS) return targets[i];
    }
    return v;
  }

  // Ein Schritt per Taste oder Knopf: aufs Raster, Magnet anwenden, nie am Magneten hängen bleiben.
  function stepValue(v, delta, grid, targets, tol, lo, hi) {
    var next = v;
    for (var k = 1; k <= 3; k++) {
      next = snap(clamp(roundTo(v + k * delta, grid), lo, hi), targets, tol);
      if (Math.abs(next - v) > EPS) return next;
    }
    return next;
  }

  function blank(s) { return String(s === null || s === undefined ? "" : s).trim() === ""; }
  function isInt(v) { return Math.abs(v - Math.round(v)) < EPS; }

  // Anzahl h_j prüfen: ganze Zahl ab 0.
  function countError(raw, v) {
    if (blank(raw)) return "empty";
    if (!isFinite(v)) return "nan";
    if (v < 0) return "neg";
    if (!isInt(v)) return "frac";
    return null;
  }

  // Häufigkeitstabelle: rows = [{a: "1", h: "3"}, …] als Text aus den Feldern.
  // Ergebnis: { ok, values, counts, n, errors: [{row, field: "a"|"h", code}], dup }
  function checkFreq(rows, parse) {
    var errors = [], values = [], counts = [];
    rows.forEach(function (r, i) {
      var a = parse(r.a), hh = parse(r.h);
      if (blank(r.a)) errors.push({ row: i, field: "a", code: "empty" });
      else if (!isFinite(a)) errors.push({ row: i, field: "a", code: "nan" });
      var ce = countError(r.h, hh);
      if (ce) errors.push({ row: i, field: "h", code: ce });
      values.push(a);
      counts.push(hh);
    });
    var n = NaN, dup = null;
    if (!errors.length) {
      n = counts.reduce(function (s, c) { return s + c; }, 0);
      if (n === 0) errors.push({ row: -1, field: "h", code: "zero" });
      for (var i = 0; i < values.length && dup === null; i++) {
        for (var j = i + 1; j < values.length; j++) if (Math.abs(values[i] - values[j]) < EPS) { dup = values[i]; break; }
      }
    }
    return { ok: !errors.length, values: values, counts: counts, n: n, errors: errors, dup: dup };
  }

  // Klassen (u_0, u_1], …, (u_{m−1}, u_m] mit Anzahlen h_1 … h_m.
  // Ergebnis: { ok, bounds, counts, n, errors: [{kind: "u"|"h", idx, code, lo, hi}] }
  function checkClasses(bounds, counts, parse) {
    var errors = [], u = bounds.map(function (s) { return parse(s); }), hs = counts.map(function (s) { return parse(s); });
    bounds.forEach(function (s, k) {
      if (blank(s)) errors.push({ kind: "u", idx: k, code: "empty" });
      else if (!isFinite(u[k])) errors.push({ kind: "u", idx: k, code: "nan" });
    });
    for (var k = 1; k < u.length; k++) {
      if (isFinite(u[k]) && isFinite(u[k - 1]) && !(u[k] > u[k - 1] + EPS)) errors.push({ kind: "u", idx: k, code: "order", lo: u[k - 1], hi: u[k] });
    }
    counts.forEach(function (s, j) {
      var ce = countError(s, hs[j]);
      if (ce) errors.push({ kind: "h", idx: j, code: ce });
    });
    var n = NaN;
    if (!errors.length) {
      n = hs.reduce(function (s, c) { return s + c; }, 0);
      if (n === 0) errors.push({ kind: "h", idx: -1, code: "zero" });
    }
    return { ok: !errors.length, bounds: u, counts: hs, n: n, errors: errors };
  }

  // Stimmen Grenzen und Anzahlen noch genau mit einem Beispiel überein? (Dann kennen wir das echte Mittel.)
  function sameClasses(bounds, counts, refBounds, refCounts) {
    function eq(a, b) {
      return a.length === b.length && a.every(function (v, k) { return Math.abs(v - b[k]) < EPS; });
    }
    return eq(bounds, refBounds) && eq(counts, refCounts);
  }

  // Punkte, die sich überdecken würden, stapeln (wie im Punktdiagramm).
  // items: [{x, w}] (Mitte und Breite in Pixeln) → Ebene je Punkt, 0 = unten.
  function dodge(items, gap) {
    var order = items.map(function (it, i) { return i; }).sort(function (i, j) { return items[i].x - items[j].x || i - j; });
    var levels = new Array(items.length), rows = [];
    order.forEach(function (i) {
      var l = items[i].x - items[i].w / 2, r = items[i].x + items[i].w / 2, lev = 0;
      for (;;) {
        var row = rows[lev] || (rows[lev] = []);
        var hit = row.some(function (b) { return l < b.r + gap && r > b.l - gap; });
        if (!hit) { row.push({ l: l, r: r }); levels[i] = lev; break; }
        lev++;
      }
    });
    return levels;
  }

  // Beschriftungen in Zeilen verteilen: wenn sie sich überlappen, rutscht die spätere eine Zeile tiefer.
  // labels: [{x, w}] → [{x (in [minX, maxX] geklemmt), w, row}]
  function placeLabels(labels, minX, maxX, gap) {
    var out = [];
    labels.forEach(function (lb) {
      var x = clamp(lb.x, minX + lb.w / 2, maxX - lb.w / 2), row = 0;
      while (out.some(function (o) { return o.row === row && Math.abs(o.x - x) < (o.w + lb.w) / 2 + gap; })) row++;
      out.push({ x: x, w: lb.w, row: row });
    });
    return out;
  }

  // Rechtes Ende der Achse beim Tauziehen: mindestens 20, sonst etwas Platz hinter dem größten Wert.
  function tugHi(maxV) { return Math.max(20, maxV + Math.max(2, 0.07 * maxV)); }

  // Knickstellen von a ↦ Σ|x_i − a| im Bereich [lo, hi]: die Ränder und alle Datenwerte dazwischen.
  function absBreaks(xs, lo, hi) {
    var pts = [lo, hi];
    xs.forEach(function (x) { if (x > lo && x < hi) pts.push(x); });
    pts.sort(function (a, b) { return a - b; });
    return pts.filter(function (v, i) { return i === 0 || v - pts[i - 1] > EPS; });
  }

  // Ansage für Screenreader mit Bremse: show(txt) merkt sich den Satz und sagt ihn erst nach `delay` ms Ruhe an.
  // Bei hold() (z. B. während einer Animation) wird gar nichts angesagt; release() sagt den letzten Satz sofort an.
  // Der erste Satz kommt sofort. Gleiche Sätze werden nicht zweimal angesagt.
  function announcer(write, delay, setT, clearT) {
    setT = setT || setTimeout;
    clearT = clearT || clearTimeout;
    var cur = "", said = "", timer = null, held = false;
    function flush() {
      if (timer !== null) { clearT(timer); timer = null; }
      if (cur && cur !== said) { said = cur; write(cur); }
    }
    function later() {
      if (timer !== null) clearT(timer);
      timer = setT(flush, delay);
    }
    return {
      show: function (txt) {
        cur = txt;
        if (!said) flush();
        else if (!held) later();
      },
      hold: function () { held = true; if (timer !== null) { clearT(timer); timer = null; } },
      release: function (now) { if (!held) return; held = false; if (now) flush(); else later(); },
      flush: flush
    };
  }

  // Beispieldaten der vier Module. Die Tests prüfen sie gegen die Folien und die Urlisten.
  var DATA = {
    balance: [[3, 6, 8, 9, 11], [1, 2, 2, 3, 3, 3, 4, 6]],
    noten: { a: [1, 2, 3, 4, 5, 6], h: [3, 5, 8, 6, 2, 1] },                       // Folie 111
    classes: [
      // Aufgabe 8 (Übungsblatt 2): 60 Reaktionszeiten, echtes Mittel 251,36 ms
      { u: [100, 150, 200, 250, 300, 350, 400, 800], h: [3, 9, 23, 15, 7, 1, 2], unit: "ms", trueVal: 251.36, trueDigits: 2 },
      // Aufgabe 11 (Übungsblatt 3): 100 Körpergewichte, Urliste auf Folie 148, echtes Mittel 67,953 kg
      { u: [60, 63, 66, 69, 72, 75], h: [5, 18, 42, 27, 8], unit: "kg", trueVal: 67.953, trueDigits: 3 }
    ],
    tug: { start: [3, 6, 8, 9, 11, 15], out: 150, maxV: 999 },                       // Folie 116 / Kapitel 6
    curves: [[3, 6, 8, 9, 11], [3, 6, 8, 9, 11, 15], [3, 6, 8, 9, 11, 40]]          // Folie 95 + Ausreißer
  };

  var P = {
    DATA: DATA,
    clamp: clamp, roundTo: roundTo, niceStep: niceStep, niceTicks: niceTicks, niceDomain: niceDomain,
    aStep: aStep, startA: startA, tiltDeg: tiltDeg, limitTilt: limitTilt, snap: snap, stepValue: stepValue,
    checkFreq: checkFreq, checkClasses: checkClasses, sameClasses: sameClasses, dodge: dodge, placeLabels: placeLabels,
    tugHi: tugHi, absBreaks: absBreaks, announcer: announcer
  };
  if (typeof module !== "undefined" && module.exports) module.exports = P;

  /* ================================================================
     Browser-Teil
     ================================================================ */

  var LM = root.LM;
  if (!LM || !LM.widget || typeof document === "undefined") return;
  var h = LM.h, fmt = LM.fmt, S = LM.stats;
  var uid = 0;

  function nid(p) { uid += 1; return "mn-" + p + "-" + uid; }
  function svgEl(tag, attrs, parent) { return LM.svg.el(tag, attrs, parent); }
  function tex(src) { return LM.tex(src, false); }
  // Zahl für KaTeX: Dezimalkomma als {,}, Minus als -
  function texNum(v, d) { return fmt(v, d === undefined ? 2 : d).replace(/−/g, "-").replace(",", "{,}"); }
  function texFactor(v, d) { var s = texNum(v, d); return v < 0 ? "(" + s + ")" : s; }
  function signed(v, d) { return (v > 0.0005 ? "+" : "") + fmt(v, d === undefined ? 2 : d); }

  function widgetHead(el, cls, title, badge, sub) {
    el.innerHTML = "";
    el.classList.add("widget", "mn", cls);
    el.appendChild(h("div", { class: "w-head" }, [
      h("h3", {}, [title + " ", badge ? h("span", { class: "w-badge", text: badge }) : null]),
      sub ? h("p", { class: "w-sub", html: sub }) : null
    ]));
  }

  // Umschalter als .seg (Standard) oder als Reihe von .chip-Knöpfen (asChips).
  function seg(labels, current, onPick, label, asChips) {
    var box = h("div", { class: asChips ? "mn-chips" : "seg", attrs: { role: "group", "aria-label": label } }), btns = [];
    function pick(i) {
      btns.forEach(function (b, j) { b.setAttribute("aria-pressed", String(i === j)); });
      onPick(i);
    }
    labels.forEach(function (lab, i) {
      var b = h("button", { class: asChips ? "chip" : null, text: lab, attrs: { type: "button", "aria-pressed": String(i === current) }, on: { click: function () { pick(i); } } });
      btns.push(b);
      box.appendChild(b);
    });
    return { el: box, pick: pick, btns: btns };
  }

  // Formel in zwei Stücken: Bricht die Zeile um, wandert der Schluss („= 77/25 = 3,08“) als Ganzes in die nächste Zeile.
  function texChain(head, tail) {
    return tex(head) + ' <span class="mn-nb">' + tex(tail) + "</span>";
  }

  // Zeiger-Position in SVG-Koordinaten (viewBox).
  function svgX(svg, e) {
    var r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    var k = vb && vb.width && r.width ? vb.width / r.width : 1;
    return (e.clientX - r.left) * k;
  }

  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  // Kleine Animation. Bei „weniger Bewegung“ sofort am Ziel. handle.active() sagt, ob sie noch läuft.
  function tween(ms, frame, done) {
    var alive = true, t0 = null;
    var handle = { stop: function () { alive = false; }, active: function () { return alive; } };
    if (LM.reduceMotion || !(ms > 0)) { alive = false; frame(1); if (done) done(); return handle; }
    function step(t) {
      if (!alive) return;
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      frame(ease(k));
      if (k < 1) requestAnimationFrame(step);
      else { alive = false; if (done) done(); }
    }
    requestAnimationFrame(step);
    return handle;
  }

  // Beschriftung als Pille (Rechteck mit runden Enden + Text) in einem SVG.
  function svgPill(parent, cls, height) {
    var H = height || 22, w = 0, cur = null;
    var g = svgEl("g", { class: "mn-tag " + cls }, parent);
    var r = svgEl("rect", { y: -H / 2, height: H, rx: H / 2, ry: H / 2 }, g);
    var t = svgEl("text", { x: 0, y: 4.2, "text-anchor": "middle" }, g);
    return {
      g: g,
      text: function (s) {
        if (s !== cur) {
          cur = s;
          t.textContent = s;
          var tw = 0;
          try { tw = t.getComputedTextLength(); } catch (e) { tw = 0; }
          w = (tw || s.length * 7) + 16;
          r.setAttribute("x", (-w / 2).toFixed(1));
          r.setAttribute("width", w.toFixed(1));
        }
        return w;
      },
      move: function (x, y) { g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")"); }
    };
  }

  // Ziehen auf einer SVG-Fläche. Maus und Stift sofort. Mit dem Finger erst bei waagrechter Bewegung
  // oder beim Antippen, damit man über der Grafik weiter senkrecht scrollen kann. Auf einem Griff
  // (opts.handle, CSS touch-action: none) geht es auch mit dem Finger sofort los.
  function dragSurface(svg, opts) {
    var act = null;
    svg.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var onHandle = opts.handle && e.target.closest ? e.target.closest(opts.handle) : null;
      act = { id: e.pointerId, live: e.pointerType !== "touch" || !!onHandle, x0: e.clientX, y0: e.clientY };
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      if (opts.down) opts.down(e);
      if (act.live) {
        e.preventDefault();
        opts.move(svgX(svg, e), e);
      }
    });
    svg.addEventListener("pointermove", function (e) {
      if (!act || e.pointerId !== act.id) return;
      if (!act.live) {
        var dx = Math.abs(e.clientX - act.x0), dy = Math.abs(e.clientY - act.y0);
        if (dx > 6 && dx > dy) act.live = true;
        else return;
      }
      opts.move(svgX(svg, e), e);
    });
    svg.addEventListener("pointerup", function (e) {
      if (!act || e.pointerId !== act.id) return;
      var tap = !act.live;
      act = null;
      if (tap) opts.move(svgX(svg, e), e);
      if (opts.up) opts.up(e);
    });
    svg.addEventListener("pointercancel", function (e) {
      if (!act || e.pointerId !== act.id) return;
      act = null;
      if (opts.up) opts.up(e);
    });
  }

  function fmtList(xs) { return xs.map(function (v) { return fmt(v, 2); }).join(", "); }

  /* ================================================================
     1. Wippe (balance)
     ================================================================ */

  LM.widget("balance", function (el) {
    var PRE = DATA.balance.map(function (xs) { return { label: fmtList(xs), xs: xs }; }).concat([{ label: "Eigene", xs: null }]);
    var st = { xs: [], mean: NaN, lo: 0, hi: 1, step: 0.1, a: 0, angle: 0, vel: 0, target: 0, mood: "", cheered: false, animNext: false };
    var G = null, geo = null, resp = null, raf = 0, slide = null;
    var XBAR = '<span class="mn-xbar">x̄</span>';

    widgetHead(el, "mn-bal", "Die Wippe", "Folie 114",
      "Jeder Wert ist ein gleich schweres Gewicht auf einem Brett. Verschieb den Drehpunkt <i>a</i>, bis das Brett gerade liegt.");

    var presets = seg(PRE.map(function (p) { return p.label; }), 0, choose, "Datensatz wählen");
    var hintId = nid("hint");
    var customIn = h("input", { class: "text-input mn-custom-in", attrs: { type: "text", value: "2; 4; 4; 5; 10", spellcheck: "false", autocomplete: "off", "aria-describedby": hintId } });
    var customMsg = h("p", { class: "feedback mn-custom-msg", attrs: { "aria-live": "polite" } });
    var customBox = h("div", { class: "mn-custom", attrs: { hidden: "" } }, [
      h("label", { class: "mn-custom-field" }, [h("span", { class: "mn-custom-lbl", text: "Deine Werte" }), customIn]),
      h("p", { class: "small muted", attrs: { id: hintId }, text: "Trenne die Zahlen mit Semikolon oder Leerzeichen. Dezimalkomma geht auch, zum Beispiel 2,5. Höchstens 12 Werte." }),
      customMsg
    ]);

    var chart = h("div", { class: "chart mn-bal-chart" });
    var svg = svgEl("svg", { class: "mn-svg", role: "group", "aria-label": "Wippe: Die Werte liegen als Gewichte auf einem Brett, darunter steht der Drehpunkt a." });
    chart.appendChild(svg);

    var btnL = h("button", { class: "btn btn-sm mn-nudge", text: "◀", attrs: { type: "button" }, on: { click: function () { nudge(-1, 1); } } });
    var btnR = h("button", { class: "btn btn-sm mn-nudge", text: "▶", attrs: { type: "button" }, on: { click: function () { nudge(1, 1); } } });
    var slider = h("input", { class: "slider", attrs: { type: "range", "aria-label": "Drehpunkt a" }, on: { input: function () { stopSlide(); setA(Number(slider.value), "user"); } } });
    var btnMean = h("button", { class: "btn btn-sm mn-btn-mean", attrs: { type: "button" }, html: '<span class="mn-tri-ico" aria-hidden="true"></span>Auf das Mittel', on: { click: goMean } });
    var status = h("p", { class: "mn-status", attrs: { role: "status", "aria-live": "polite" } });
    var dev = h("div", { class: "mn-dev" });
    var note = h("p", { class: "mn-note", html: "Das ist die <strong>Nulleigenschaft</strong> (Folie 114): Am Mittel ergeben alle Abweichungen zusammen genau 0. Darum ist das Mittel der <strong>Schwerpunkt</strong> der Werte." });

    el.appendChild(h("div", { class: "w-controls" }, [presets.el]));
    el.appendChild(customBox);
    el.appendChild(chart);
    el.appendChild(h("div", { class: "w-controls mn-ctl" }, [h("div", { class: "mn-arow" }, [btnL, slider, btnR]), btnMean]));
    el.appendChild(status);
    el.appendChild(dev);
    el.appendChild(note);

    function isBal() { return Math.abs(st.a - st.mean) < st.step / 2 + EPS; }

    function setData(xs, resetA) {
      st.xs = xs.slice();
      st.mean = S.mean(st.xs);
      var d = P.niceDomain(Math.min.apply(null, xs), Math.max.apply(null, xs));
      st.lo = d[0];
      st.hi = d[1];
      st.step = P.aStep(st.hi - st.lo);
      slider.min = String(st.lo);
      slider.max = String(st.hi);
      slider.step = String(st.step);
      btnL.setAttribute("aria-label", "Drehpunkt um " + fmt(st.step) + " nach links");
      btnR.setAttribute("aria-label", "Drehpunkt um " + fmt(st.step) + " nach rechts");
      st.a = resetA ? P.startA(st.lo, st.hi, st.mean, st.step) : clamp(P.roundTo(st.a, st.step), st.lo, st.hi);
      st.cheered = false;
      st.mood = "";
      st.animNext = true;
      if (resp) resp.redraw();
      refresh("data");
    }

    function build(w) {
      var mob = w < 560;
      var fr = S.freq(st.xs), maxMult = 1;
      fr.forEach(function (r) { if (r.h > maxMult) maxMult = r.h; });
      var stackMax = Math.min(5, maxMult), more = maxMult > stackMax;
      var padX = mob ? 4 : 10, inset = mob ? 14 : 20;
      var bh = mob ? 22 : 26, gapY = 3, T = mob ? 18 : 20, H = mob ? 44 : 56, rise = mob ? 30 : 44;
      var x = LM.svg.scale(st.lo, st.hi, padX + inset, w - padX - inset);
      var minGap = Infinity;
      for (var i = 1; i < fr.length; i++) minGap = Math.min(minGap, x(fr[i].value) - x(fr[i - 1].value));
      var bw = clamp(minGap - 5, 12, mob ? 26 : 34);
      var beamTop = 4 + (more ? 14 : 0) + rise + stackMax * (bh + gapY);
      var pivotY = beamTop + T, floorY = pivotY + H, height = floorY + (mob ? 28 : 32);

      svg.innerHTML = "";
      svg.setAttribute("viewBox", "0 0 " + w + " " + height);
      svg.setAttribute("width", w);
      svg.setAttribute("height", height);

      svgEl("line", { class: "mn-floor", x1: 2, x2: w - 2, y1: floorY, y2: floorY }, svg);
      var tw = mob ? 15 : 19;
      var ful = svgEl("g", { class: "mn-ful", tabindex: "0", role: "slider", "aria-label": "Drehpunkt a, mit den Pfeiltasten verschieben", "aria-valuemin": String(st.lo), "aria-valuemax": String(st.hi) }, svg);
      svgEl("rect", { class: "mn-hit", x: -28, y: pivotY - 6, width: 56, height: H + 10 }, ful);
      svgEl("path", { class: "mn-ful-tri", d: "M0 " + pivotY + " L" + (-tw) + " " + floorY + " L" + tw + " " + floorY + " Z" }, ful);

      var beam = svgEl("g", { class: "mn-beam-g" }, svg);
      svgEl("rect", { class: "mn-beam", x: padX, y: beamTop, width: w - 2 * padX, height: T, rx: 5 }, beam);
      P.niceTicks(st.lo, st.hi, Math.max(3, Math.floor((w - 2 * padX) / (mob ? 30 : 64)))).forEach(function (t) {
        var tx = x(t);
        svgEl("line", { class: "mn-rtick", x1: tx, x2: tx, y1: beamTop + 1, y2: beamTop + 5 }, beam);
        LM.svg.text(beam, tx, beamTop + T - 4.5, fmt(t, 2), { class: "mn-rlbl", "text-anchor": "middle" });
      });
      var weights = [];
      fr.forEach(function (r) {
        var vx = x(r.value), shown = Math.min(r.h, stackMax), lbl = fmt(r.value, 2), fits = lbl.length * 7 + 4 <= bw;
        for (var k = 0; k < shown; k++) {
          var y = beamTop - 1 - (k + 1) * bh - k * gapY;
          var g = svgEl("g", { class: "mn-weight" }, beam);
          svgEl("rect", { x: (vx - bw / 2).toFixed(1), y: y, width: bw, height: bh, rx: 6 }, g);
          if (fits) LM.svg.text(g, vx.toFixed(1), y + bh / 2 + 4.2, lbl, { "text-anchor": "middle" });
          weights.push({ v: r.value, g: g });
        }
        if (r.h > stackMax) LM.svg.text(beam, vx.toFixed(1), beamTop - 1 - shown * (bh + gapY) - 3, "×" + fmt(r.h, 0), { class: "mn-wmore", "text-anchor": "middle" });
      });
      var pin = svgEl("circle", { class: "mn-ful-pin", cx: 0, cy: pivotY, r: mob ? 3 : 3.5 }, svg);
      var aLbl = LM.svg.text(svg, 0, floorY + (mob ? 20 : 23), "", { class: "mn-albl", "text-anchor": "middle" });

      geo = { w: w, x: x, pivotY: pivotY, beamL: padX, beamR: w - padX, drop: H - 2, rise: rise };
      G = { beam: beam, ful: ful, pin: pin, aLbl: aLbl, weights: weights };
      place();
      retarget(!st.animNext);
      st.animNext = false;
    }

    function place() {
      if (!G) return;
      var ax = geo.x(st.a), bal = isBal();
      G.ful.setAttribute("transform", "translate(" + ax.toFixed(2) + " 0)");
      G.pin.setAttribute("cx", ax.toFixed(2));
      G.aLbl.textContent = bal ? "a = x̄ = " + fmt(st.mean) : "a = " + fmt(st.a);
      var half = G.aLbl.textContent.length * 4.3 + 4;
      G.aLbl.setAttribute("x", clamp(ax, half, geo.w - half).toFixed(2));
      G.ful.setAttribute("aria-valuenow", String(st.a));
      G.ful.setAttribute("aria-valuetext", "a = " + fmt(st.a) + (bal ? ", im Gleichgewicht" : ""));
      G.weights.forEach(function (wt) {
        var d = wt.v - st.a;
        wt.g.setAttribute("class", "mn-weight " + (Math.abs(d) < EPS ? "is-zero" : d < 0 ? "is-neg" : "is-pos"));
      });
      applyAngle();
    }

    function applyAngle() {
      if (!G) return;
      G.beam.setAttribute("transform", "rotate(" + st.angle.toFixed(3) + " " + geo.x(st.a).toFixed(2) + " " + geo.pivotY + ")");
    }

    function retarget(instant) {
      var sumDev = S.sum(st.xs.map(function (v) { return v - st.a; }));
      var deg = isBal() ? 0 : P.tiltDeg(sumDev, st.xs.length, st.hi - st.lo, 12, 0.15);
      if (geo) {
        var ax = geo.x(st.a);
        deg = P.limitTilt(deg, ax - geo.beamL, geo.beamR - ax, geo.drop, geo.rise);
      }
      st.target = deg;
      if (instant || LM.reduceMotion) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        st.angle = deg;
        st.vel = 0;
        applyAngle();
        return;
      }
      if (!raf) raf = requestAnimationFrame(spring);
    }

    // Gedämpfte Feder: Das Brett schwingt kurz nach und kommt dann zur Ruhe.
    function spring() {
      raf = 0;
      var e = st.target - st.angle;
      st.vel = (st.vel + e * 0.12) * 0.7;
      st.angle += st.vel;
      if (Math.abs(e) < 0.02 && Math.abs(st.vel) < 0.02) {
        st.angle = st.target;
        st.vel = 0;
        applyAngle();
        return;
      }
      applyAngle();
      raf = requestAnimationFrame(spring);
    }

    function refresh(how) {
      slider.value = String(st.a);
      slider.setAttribute("aria-valuetext", "a = " + fmt(st.a));
      place();
      retarget(false);
      renderDev();
      setMood(how);
    }

    function setMood(how) {
      var d = st.mean - st.a, m;
      if (isBal()) m = "bal";
      else if (Math.abs(d) <= 3 * st.step + EPS) m = d > 0 ? "nr" : "nl";
      else m = d > 0 ? "r" : "l";
      el.classList.toggle("is-bal", m === "bal");
      if (m === st.mood) return;
      st.mood = m;
      var txt = {
        bal: "<strong>Im Gleichgewicht!</strong> <i>a</i> = " + XBAR + " = " + fmt(st.mean) + ". Die Abweichungen heben sich auf.",
        r: "Das Brett kippt nach rechts. Rechts von <i>a</i> sind die Abweichungen zusammen größer. Schieb <i>a</i> nach rechts.",
        l: "Das Brett kippt nach links. Links von <i>a</i> sind die Abweichungen zusammen größer. Schieb <i>a</i> nach links.",
        nr: "Fast! Noch ein kleines Stück nach rechts.",
        nl: "Fast! Noch ein kleines Stück nach links."
      }[m];
      status.innerHTML = '<span class="mn-dot" aria-hidden="true"></span><span>' + txt + "</span>";
      if (m === "bal") {
        if (!LM.reduceMotion) {
          status.classList.remove("mn-pop");
          void status.offsetWidth;
          status.classList.add("mn-pop");
        }
        if (how === "user" && !st.cheered) {
          st.cheered = true;
          LM.celebrate(G ? G.ful : status);
        }
      }
    }

    function renderDev() {
      var a = st.a, neg = [], pos = [], zero = [];
      S.sorted(st.xs).forEach(function (v) {
        var d = v - a;
        if (Math.abs(d) < EPS) zero.push(v);
        else (d < 0 ? neg : pos).push({ v: v, d: d });
      });
      var sNeg = S.sum(neg.map(function (o) { return o.d; })), sPos = S.sum(pos.map(function (o) { return o.d; }));
      var total = S.sum(st.xs.map(function (v) { return v - a; }));
      if (Math.abs(total) < 1e-7) total = 0;
      var aTxt = fmt(a);
      function item(o) {
        return '<li><span class="mn-dev-calc">' + fmt(o.v) + " − " + aTxt + '</span><span class="mn-dev-res">' + signed(o.d) + "</span></li>";
      }
      function col(cls, head, list, sub) {
        return '<div class="mn-dev-col ' + cls + '"><p class="mn-dev-h">' + head + "</p>" +
          (list.length ? '<ul class="mn-dev-list">' + list.map(item).join("") + "</ul>" : '<p class="mn-dev-none">keine Werte</p>') +
          '<p class="mn-dev-sub"><span>zusammen</span><b>' + (list.length ? signed(sub) : "0") + "</b></p></div>";
      }
      var html = '<p class="mn-dev-title">Abweichungen vom Drehpunkt: <span class="mn-m">x<sub>i</sub> − a</span></p>' +
        '<div class="mn-dev-cols">' +
        col("mn-neg", '<span aria-hidden="true">◀ </span>links von <i>a</i>: negativ', neg, sNeg) +
        col("mn-pos", 'rechts von <i>a</i>: positiv<span aria-hidden="true"> ▶</span>', pos, sPos) +
        "</div>";
      if (zero.length) {
        html += '<p class="mn-dev-zero">Genau auf <i>a</i>: ' + zero.map(function (v) { return fmt(v); }).join(", ") +
          " (Abweichung 0, zieht nach keiner Seite)</p>";
      }
      var calc = neg.length && pos.length ? fmt(sNeg) + " + " + fmt(sPos) + " = " : "";
      html += '<p class="mn-dev-total' + (total === 0 ? " is-zero" : "") + '"><span class="mn-dev-sum">' + tex("\\textstyle\\sum (x_i - a)") +
        '</span><span class="mn-dev-eq"> = ' + calc + "<b>" + fmt(total) + "</b>" +
        (total === 0 ? ' <span class="mn-dev-ok">✓ hebt sich auf</span>' : "") + "</span></p>";
      dev.innerHTML = html;
    }

    function setA(v, how) {
      v = clamp(v, st.lo, st.hi);
      if (how !== "exact") v = P.snap(clamp(P.roundTo(v, st.step), st.lo, st.hi), [st.mean], st.step / 2);
      st.a = v;
      refresh(how === "exact" ? "button" : how);
    }

    function nudge(dir, mult) {
      stopSlide();
      st.a = P.stepValue(st.a, dir * mult * st.step, st.step, [st.mean], st.step / 2, st.lo, st.hi);
      refresh("user");
    }

    function stopSlide() { if (slide) { slide.stop(); slide = null; } }

    function goMean() {
      stopSlide();
      var from = st.a, to = st.mean;
      if (Math.abs(from - to) < EPS) { setA(to, "exact"); return; }
      slide = tween(700, function (k) { st.a = from + (to - from) * k; refresh("button"); }, function () {
        slide = null;
        st.a = to;
        refresh("button");
      });
    }

    function choose(i) {
      stopSlide();
      customBox.hidden = i !== 2;
      if (i < 2) { setData(PRE[i].xs, true); return; }
      readCustom();
      customIn.focus({ preventScroll: true });
    }

    function readCustom() {
      var r = LM.parseList(customIn.value), msg = "";
      if (r.bad.length) msg = "„" + r.bad[0] + "“ ist keine Zahl. Trenne die Werte mit Semikolon oder Leerzeichen.";
      else if (r.values.length < 2) msg = "Gib mindestens 2 Zahlen ein.";
      else if (r.values.length > 12) msg = "Höchstens 12 Zahlen, sonst wird die Wippe zu voll.";
      else if (r.values.some(function (v) { return Math.abs(v) > 100000; })) msg = "Nimm bitte Zahlen zwischen −100000 und 100000.";
      customIn.classList.toggle("is-miss", !!msg);
      customMsg.className = "feedback mn-custom-msg" + (msg ? " miss" : "");
      customMsg.textContent = msg || (fmt(r.values.length, 0) + " Werte liegen auf der Wippe. Finde den Schwerpunkt!");
      if (!msg) setData(r.values, true);
    }
    customIn.addEventListener("input", readCustom);

    svg.addEventListener("keydown", function (e) {
      if (!e.target.closest || !e.target.closest(".mn-ful")) return;
      var k = e.key, m = e.shiftKey ? 10 : 1;
      if (k === "ArrowRight" || k === "ArrowUp") nudge(1, m);
      else if (k === "ArrowLeft" || k === "ArrowDown") nudge(-1, m);
      else if (k === "PageUp") nudge(1, 10);
      else if (k === "PageDown") nudge(-1, 10);
      else if (k === "Home") { stopSlide(); setA(st.lo, "user"); }
      else if (k === "End") { stopSlide(); setA(st.hi, "user"); }
      else return;
      e.preventDefault();
    });

    dragSurface(svg, {
      handle: ".mn-ful",
      down: function (e) {
        stopSlide();
        if (G) {
          G.ful.classList.add("is-drag");
          if (e.pointerType !== "touch") G.ful.focus({ preventScroll: true });
        }
      },
      move: function (px) { if (geo) setA(geo.x.invert(px), "user"); },
      up: function () { if (G) G.ful.classList.remove("is-drag"); }
    });

    setData(PRE[0].xs, true);
    resp = LM.svg.responsive(chart, build);
  });

  /* ================================================================
     2. Mittel aus Tabellen (table-mean)
     ================================================================ */

  LM.widget("table-mean", function (el) {
    var NOTEN_A = DATA.noten.a, NOTEN_H = DATA.noten.h;
    // Klassen-Beispiele: Zahlen aus DATA.classes (trueVal = Mittel der echten Urliste), hier nur die Texte dazu.
    var CLS = [
      {
        label: "Aufgabe 8 (Reaktionszeiten)", short: "Aufgabe 8", trueFrom: "Aus den 60 echten Werten",
        ctx: "Aufgabe 8 (Übungsblatt 2): Reaktionszeiten von 60 Personen in Millisekunden. Hier sind sie in Klassen von 50 ms eingeteilt, die letzte Klasse ist breiter. Die einzelnen Werte siehst du nicht mehr."
      },
      {
        label: "Aufgabe 11 (Körpergewicht)", short: "Aufgabe 11", trueFrom: "Aus den 100 echten Werten von Folie 148",
        ctx: "Aufgabe 11 (Übungsblatt 3): Körpergewicht von 100 Studenten in Kilogramm. Die Aufgabe nennt nur die Klassen, nicht die einzelnen Werte."
      }
    ].map(function (c, i) { return Object.assign({}, DATA.classes[i], c); });
    var MAX_ROWS = 12;

    widgetHead(el, "mn-tm", "Mittel aus einer Tabelle", "Folien 111 und 113",
      "Keine Urliste, nur eine Tabelle? Dann zählt jeder Wert so oft, wie er vorkommt. Ändere die Zahlen und schau, was mit dem Mittel passiert.");

    var paneA = h("div", { class: "mn-tm-pane" });
    var paneB = h("div", { class: "mn-tm-pane", attrs: { hidden: "" } });
    var tabs = seg(["Häufigkeitstabelle", "Klassen"], 0, function (i) { paneA.hidden = i !== 0; paneB.hidden = i !== 1; }, "Art der Tabelle");
    el.appendChild(h("div", { class: "w-controls" }, [tabs.el]));
    el.appendChild(paneA);
    el.appendChild(paneB);

    // Spaltenkopf: Wort + Formelzeichen. `wide` (TeX) steht nur auf breiten Bildschirmen dahinter.
    function th(word, src, num, wide) {
      return '<th scope="col" class="mn-th' + (num ? " num" : "") + '"><span class="mn-th-w">' + word + "</span>" + tex(src) +
        (wide ? '<span class="mn-wide"> ' + tex(wide) + "</span>" : "") + "</th>";
    }
    function cellInput(value, label, cls, mode, onInput) {
      var inp = h("input", { class: "num-input mn-in " + cls, attrs: { type: "text", inputmode: mode, value: value, "aria-label": label, autocomplete: "off", spellcheck: "false" } });
      inp.addEventListener("input", function () { onInput(inp.value); });
      return inp;
    }
    function countText(code, raw, where) {
      if (code === "empty") return "Bei " + where + " fehlt die Anzahl.";
      if (code === "nan") return "„" + raw + "“ bei " + where + " ist keine Zahl.";
      if (code === "neg") return "Eine Anzahl kann nicht negativ sein (" + where + ").";
      if (code === "frac") return "Anzahlen sind ganze Zahlen wie 0, 1, 2 (" + where + ").";
      return "Alle Anzahlen sind 0. Ohne Werte gibt es kein Mittel.";
    }
    function resultBlock(cap1, cap2) {
      var line1 = h("p", { class: "mn-tm-line" }), line2 = h("p", { class: "mn-tm-line" });
      var val = h("span", { class: "stat-value" });
      var lab = h("span", { class: "stat-label" });
      var lines = h("div", { class: "mn-tm-lines" }, [h("p", { class: "mn-tm-cap", html: cap1 }), line1, cap2 ? h("p", { class: "mn-tm-cap", html: cap2 }) : null, cap2 ? line2 : null]);
      var box = h("div", { class: "mn-tm-res" }, [lines, h("div", { class: "stat s-mean mn-tm-stat", attrs: { "aria-live": "polite" } }, [lab, val])]);
      return { el: box, line1: line1, line2: line2, val: val, lab: lab };
    }

    /* ---------- Häufigkeitstabelle ---------- */
    (function () {
      var rows = [], inA = [], inH = [], cF = [], cP = [];
      function load() { rows = NOTEN_A.map(function (a, i) { return { a: String(a), h: String(NOTEN_H[i]) }; }); }
      load();
      paneA.appendChild(h("p", { class: "mn-tm-ctx", html: "Beispiel von Folie 111: Noten einer Klassenarbeit. " + tex("a_j") + " ist die Note, " + tex("h_j") + " sagt, wie oft sie vorkommt, und " + tex("f_j = h_j \\div n") + " ist ihr Anteil." }));
      var tbody = h("tbody"), sumN = h("td", { class: "num mn-sum" }), sumF = h("td", { class: "num mn-sum" }), sumP = h("td", { class: "num mn-sum" });
      var table = h("table", { class: "t mn-tm-t" }, [
        h("thead", { html: "<tr>" + th("Wert", "a_j") + th("Anzahl", "h_j") + th("Anteil", "f_j", true, "= h_j \\div n") + th("Produkt", "h_j \\cdot a_j", true) + '<th scope="col"><span class="mn-sr">Zeile entfernen</span></th></tr>' }),
        tbody,
        h("tfoot", {}, [h("tr", {}, [h("th", { attrs: { scope: "row" }, text: "Summe" }), sumN, sumF, sumP, h("td")])])
      ]);
      var addBtn = h("button", { class: "btn btn-sm", text: "+ Zeile", attrs: { type: "button" }, on: { click: addRow } });
      var resetBtn = h("button", { class: "btn btn-sm btn-ghost", text: "Noten-Beispiel laden", attrs: { type: "button" }, on: { click: function () { load(); render(); compute(); } } });
      var msg = h("p", { class: "feedback mn-tm-msg", attrs: { role: "status", "aria-live": "polite" } });
      var res = resultBlock("So steht es auf Folie 111: jede Anzahl mal ihren Wert, alles addieren, durch " + tex("n") + " teilen.",
        "Oder mit den Anteilen " + tex("f_j") + ": jeden Wert mal seinen Anteil, dann addieren.");
      res.lab.innerHTML = "Mittel " + tex("\\bar{x}");
      paneA.appendChild(h("div", { class: "table-wrap mn-tm-wrap" }, [table]));
      paneA.appendChild(h("div", { class: "mn-tm-actions" }, [addBtn, resetBtn]));
      paneA.appendChild(msg);
      paneA.appendChild(res.el);

      function addRow() {
        if (rows.length >= MAX_ROWS) return;
        var last = rows.length ? LM.parseNum(rows[rows.length - 1].a) : NaN;
        rows.push({ a: isFinite(last) ? fmt(last + 1, 4) : "", h: "1" });
        render();
        compute();
        inA[inA.length - 1].focus();
      }

      function render() {
        tbody.innerHTML = "";
        inA = []; inH = []; cF = []; cP = [];
        rows.forEach(function (r, i) {
          var ia = cellInput(r.a, "Zeile " + (i + 1) + ": Wert a", "", "decimal", function (v) { r.a = v; compute(); });
          var ih = cellInput(r.h, "Zeile " + (i + 1) + ": Anzahl h", "mn-in-sm", "numeric", function (v) { r.h = v; compute(); });
          var del = h("button", { class: "btn btn-sm btn-ghost mn-del", text: "×", attrs: { type: "button", "aria-label": "Zeile " + (i + 1) + " entfernen", title: "Zeile entfernen" }, on: { click: function () {
            rows.splice(i, 1);
            render();
            compute();
            // Fokus auf den nächsten ×-Knopf (kein Eingabefeld, damit am Handy keine Tastatur aufspringt)
            var dels = tbody.querySelectorAll(".mn-del"), next = dels[Math.min(i, dels.length - 1)];
            if (next && !next.disabled) next.focus(); else addBtn.focus();
          } } });
          if (rows.length <= 1) del.disabled = true;
          var tdF = h("td", { class: "num" }), tdP = h("td", { class: "num" });
          tbody.appendChild(h("tr", {}, [h("td", {}, [ia]), h("td", {}, [ih]), tdF, tdP, h("td", { class: "mn-del-cell" }, [del])]));
          inA.push(ia); inH.push(ih); cF.push(tdF); cP.push(tdP);
        });
        addBtn.disabled = rows.length >= MAX_ROWS;
      }

      function compute() {
        var r = P.checkFreq(rows, LM.parseNum);
        function bad(i, f) { return r.errors.some(function (e) { return e.row === i && e.field === f; }); }
        inA.forEach(function (inp, i) { inp.classList.toggle("is-miss", bad(i, "a")); });
        inH.forEach(function (inp, i) { inp.classList.toggle("is-miss", bad(i, "h")); });
        if (!r.ok) {
          cF.concat(cP).forEach(function (c) { c.textContent = "–"; });
          sumN.textContent = sumF.textContent = sumP.textContent = "–";
          var e = r.errors[0], where = "Zeile " + (e.row + 1);
          msg.className = "feedback mn-tm-msg miss";
          if (e.field === "a") msg.textContent = e.code === "empty" ? "In " + where + " fehlt der Wert." : "„" + rows[e.row].a + "“ in " + where + " ist keine Zahl.";
          else msg.textContent = countText(e.code, e.row >= 0 ? rows[e.row].h : "", where);
          res.el.classList.add("is-off");
          res.val.textContent = "–";
          return;
        }
        var t = S.meanTable(r.values, r.counts);
        rows.forEach(function (row, i) {
          cF[i].textContent = fmt(t.f[i], 3);
          cP[i].textContent = fmt(t.products[i], 4);
        });
        sumN.innerHTML = tex("n") + " = " + fmt(t.n, 0);
        sumF.textContent = fmt(S.sum(t.f), 3);
        sumP.textContent = fmt(t.sum, 4);
        msg.className = "feedback mn-tm-msg";
        msg.textContent = r.dup !== null ? "Hinweis: Der Wert " + fmt(r.dup, 4) + " steht mehrmals da. Das Mittel stimmt trotzdem, aber in einer Häufigkeitstabelle steht jeder Wert nur einmal." : "";
        var terms = [], fterms = [], fRounded = false;
        r.values.forEach(function (a, i) {
          if (!r.counts[i]) return;
          // Jedes Produkt in {…}: KaTeX bricht lange Zeilen dann nur zwischen den Summanden um.
          terms.push("{" + texNum(r.counts[i], 0) + " \\cdot " + texFactor(a, 4) + "}");
          if (Math.abs(t.f[i] - P.roundTo(t.f[i], 0.001)) > 1e-9) fRounded = true;
          fterms.push("{" + texNum(t.f[i], 3) + " \\cdot " + texFactor(a, 4) + "}");
        });
        var exact = Math.abs(t.value * 100 - Math.round(t.value * 100)) < 1e-6, eq = exact ? "=" : "\\approx";
        res.line1.innerHTML = texChain("\\bar{x} = \\tfrac{1}{" + texNum(t.n, 0) + "}\\,(" + terms.join(" + ") + ")",
          "= \\tfrac{" + texNum(t.sum, 4) + "}{" + texNum(t.n, 0) + "} " + eq + " " + texNum(t.value, 2));
        res.line2.innerHTML = texChain("\\bar{x} = " + fterms.join(" + "), (exact && !fRounded ? "=" : "\\approx") + " " + texNum(t.value, 2));
        res.el.classList.remove("is-off");
        res.val.textContent = fmt(t.value, 2);
      }

      render();
      compute();
    })();

    /* ---------- Klassen ---------- */
    (function () {
      var bounds = [], counts = [], inU = [], inH = [], lowSpans = [], cM = [], cP = [], cur = 0;
      function load(i) {
        cur = i;
        bounds = CLS[i].u.map(function (v) { return fmt(v, 4); });
        counts = CLS[i].h.map(String);
        ctx.textContent = CLS[i].ctx;
        resetBtn.textContent = CLS[i].short + " neu laden";
      }
      var pick = seg(CLS.map(function (c) { return c.label; }), 0, function (i) { load(i); render(); compute(); }, "Beispiel für Klassen wählen", true);
      var ctx = h("p", { class: "mn-tm-ctx" });
      var tbody = h("tbody"), sumN = h("td", { class: "num mn-sum" }), sumP = h("td", { class: "num mn-sum" });
      var table = h("table", { class: "t mn-tm-t mn-tm-cls" }, [
        h("thead", { html: "<tr>" + th("Klasse", "(u_{j-1},\\, u_j]") + th("Anzahl", "h_j") + th("Mitte", "x'_j", true) + th("Produkt", "h_j \\cdot x'_j", true) + "</tr>" }),
        tbody,
        h("tfoot", {}, [h("tr", {}, [h("th", { attrs: { scope: "row" }, text: "Summe" }), sumN, h("td"), sumP])])
      ]);
      var addBtn = h("button", { class: "btn btn-sm", text: "+ Klasse", attrs: { type: "button" }, on: { click: addClass } });
      var delBtn = h("button", { class: "btn btn-sm", text: "− Klasse", attrs: { type: "button", "aria-label": "Letzte Klasse entfernen" }, on: { click: function () {
        if (counts.length <= 1) return;
        counts.pop();
        bounds.pop();
        render();
        compute();
      } } });
      var resetBtn = h("button", { class: "btn btn-sm btn-ghost", attrs: { type: "button" }, on: { click: function () { load(cur); render(); compute(); } } });
      var midHint = h("p", { class: "mn-tm-mid small" });
      var msg = h("p", { class: "feedback mn-tm-msg", attrs: { role: "status", "aria-live": "polite" } });
      var res = resultBlock("Wie bei der Tabelle, nur mit den Klassenmitten " + tex("x'_j") + " statt der Werte:", null);
      res.lab.innerHTML = "Mittel " + tex("\\bar{x}") + " ungefähr";
      var why = h("div", { class: "callout callout-tip mn-tm-why" }, [
        h("p", { class: "callout-title", text: "Warum nur ungefähr?" }),
        h("p", { text: "Du kennst nur die Klassen, nicht die echten Werte. Darum tust du so, als läge jeder Wert genau in der Mitte seiner Klasse. Das ist eine Schätzung, deshalb steht dort ≈. Meist gleichen sich die kleinen Fehler der einzelnen Klassen gut aus." }),
        h("p", { class: "mn-tm-true", attrs: { "aria-live": "polite" } })
      ]);
      paneB.appendChild(h("div", { class: "mn-tm-pick" }, [h("span", { class: "mn-tm-pick-lbl", text: "Beispiel:" }), pick.el]));
      paneB.appendChild(ctx);
      paneB.appendChild(h("div", { class: "table-wrap mn-tm-wrap" }, [table]));
      paneB.appendChild(midHint);
      paneB.appendChild(h("div", { class: "mn-tm-actions" }, [addBtn, delBtn, resetBtn]));
      paneB.appendChild(msg);
      paneB.appendChild(res.el);
      paneB.appendChild(why);
      var trueP = why.querySelector(".mn-tm-true");
      load(0);

      function addClass() {
        if (counts.length >= MAX_ROWS) return;
        var last = LM.parseNum(bounds[bounds.length - 1]), prev = LM.parseNum(bounds[bounds.length - 2]);
        var width = isFinite(last) && isFinite(prev) && last > prev ? last - prev : 50;
        bounds.push(isFinite(last) ? fmt(last + width, 4) : "");
        counts.push("0");
        render();
        compute();
        inU[inU.length - 1].focus();
      }

      function render() {
        tbody.innerHTML = "";
        inU = []; inH = []; lowSpans = []; cM = []; cP = [];
        counts.forEach(function (c, j) {
          var cell = h("td", { class: "mn-cls-cell" });
          var wrap = h("span", { class: "mn-cls" });
          wrap.appendChild(h("span", { class: "mn-br", text: "(" }));
          if (j === 0) {
            var low = cellInput(bounds[0], "Klasse 1: untere Grenze", "mn-in-u", "decimal", function (v) { bounds[0] = v; compute(); });
            inU.push(low);
            wrap.appendChild(low);
          } else {
            var span = h("span", { class: "mn-cls-low" });
            lowSpans[j] = span;
            wrap.appendChild(span);
          }
          wrap.appendChild(h("span", { class: "mn-br", text: "," }));
          var up = cellInput(bounds[j + 1], "Klasse " + (j + 1) + ": obere Grenze", "mn-in-u", "decimal", function (v) { bounds[j + 1] = v; compute(); });
          inU.push(up);
          wrap.appendChild(up);
          wrap.appendChild(h("span", { class: "mn-br", text: "]" }));
          cell.appendChild(wrap);
          var ih = cellInput(c, "Klasse " + (j + 1) + ": Anzahl h", "mn-in-sm", "numeric", function (v) { counts[j] = v; compute(); });
          inH.push(ih);
          var tdM = h("td", { class: "num" }), tdP = h("td", { class: "num" });
          cM.push(tdM); cP.push(tdP);
          tbody.appendChild(h("tr", {}, [cell, h("td", {}, [ih]), tdM, tdP]));
        });
        addBtn.disabled = counts.length >= MAX_ROWS;
        delBtn.disabled = counts.length <= 1;
      }

      function boundText(k) { var v = LM.parseNum(bounds[k]); return isFinite(v) ? fmt(v, 4) : "?"; }

      function compute() {
        lowSpans.forEach(function (s, j) { if (s) s.textContent = boundText(j); });
        var r = P.checkClasses(bounds, counts, LM.parseNum);
        inU.forEach(function (inp, k) { inp.classList.toggle("is-miss", r.errors.some(function (e) { return e.kind === "u" && e.idx === k; })); });
        inH.forEach(function (inp, j) { inp.classList.toggle("is-miss", r.errors.some(function (e) { return e.kind === "h" && e.idx === j; })); });
        if (!r.ok) {
          cM.concat(cP).forEach(function (c) { c.textContent = "–"; });
          sumN.textContent = sumP.textContent = "–";
          var e = r.errors[0], txt;
          if (e.kind === "u") {
            var cls = e.idx === 0 ? 1 : e.idx;
            if (e.code === "empty") txt = "Bei Klasse " + cls + " fehlt eine Grenze.";
            else if (e.code === "nan") txt = "„" + bounds[e.idx] + "“ bei Klasse " + cls + " ist keine Zahl.";
            else txt = "Klasse " + e.idx + " geht von " + fmt(e.lo, 4) + " bis " + fmt(e.hi, 4) + ". Die obere Grenze muss größer sein als die untere.";
          } else {
            txt = countText(e.code, e.idx >= 0 ? counts[e.idx] : "", "Klasse " + (e.idx + 1));
          }
          msg.className = "feedback mn-tm-msg miss";
          msg.textContent = txt;
          midHint.textContent = "";
          res.el.classList.add("is-off");
          res.val.textContent = "–";
          trueP.textContent = "";
          return;
        }
        var g = S.groupedMean(r.bounds, r.counts);
        g.mids.forEach(function (m, j) {
          cM[j].textContent = fmt(m, 4);
          cP[j].textContent = fmt(g.products[j], 4);
        });
        sumN.innerHTML = tex("n") + " = " + fmt(g.n, 0);
        sumP.textContent = fmt(g.sum, 4);
        msg.className = "feedback mn-tm-msg";
        msg.textContent = "";
        midHint.innerHTML = "Klassenmitte: " + tex("x'_j = (u_{j-1} + u_j) \\div 2") + ", zum Beispiel (" + fmt(r.bounds[0], 4) + " + " + fmt(r.bounds[1], 4) + ") ÷ 2 = " + fmt(g.mids[0], 4) + ".";
        var terms = [];
        r.counts.forEach(function (hj, j) { if (hj) terms.push("{" + texNum(hj, 0) + " \\cdot " + texFactor(g.mids[j], 4) + "}"); });
        var exact = Math.abs(g.value * 100 - Math.round(g.value * 100)) < 1e-6;
        res.line1.innerHTML = texChain("\\bar{x} \\approx \\tfrac{1}{" + texNum(g.n, 0) + "}\\,(" + terms.join(" + ") + ")",
          "= \\tfrac{" + texNum(g.sum, 4) + "}{" + texNum(g.n, 0) + "} " + (exact ? "=" : "\\approx") + " " + texNum(g.value, 2));
        res.el.classList.remove("is-off");
        res.val.textContent = "≈ " + fmt(g.value, 2);
        var ex = CLS[cur], same = P.sameClasses(r.bounds, r.counts, ex.u, ex.h);
        if (same) {
          var miss = Math.abs(g.value - ex.trueVal), dg = ex.trueDigits;
          trueP.innerHTML = ex.trueFrom + " kommt <strong>" + fmt(ex.trueVal, dg) + " " + ex.unit + "</strong> heraus. Die Schätzung " +
            fmt(g.value, 2) + " " + ex.unit + " liegt also nur " + fmt(miss, dg) + " " + ex.unit + " daneben.";
        } else {
          trueP.textContent = "";
        }
        trueP.hidden = !same;
      }

      render();
      compute();
    })();
  });

  /* ================================================================
     3. Ausreißer-Tauziehen (outlier-tug)
     ================================================================ */

  LM.widget("outlier-tug", function (el) {
    var START = DATA.tug.start, MAXV = DATA.tug.maxV, OUT = DATA.tug.out;
    var med0 = S.median(START), mean0 = S.mean(START);
    var st = { xs: START.slice(), hi: P.tugHi(Math.max.apply(null, START)), drag: null };
    var geo = null, G = null, anim = null, zoom = null, pullRaf = 0, shown = "";

    widgetHead(el, "mn-tug", "Tauziehen mit einem Ausreißer", "Folie 116",
      "Zieh einen Punkt weit nach rechts oder drück auf „Ausreißer!“. Wer wandert mit: Median oder Mittel?");

    var chart = h("div", { class: "chart mn-tug-chart" });
    var svg = svgEl("svg", { class: "mn-svg", role: "group", "aria-label": "Zahlengerade mit sechs Werten zum Verschieben, dazu Median und Mittel" });
    chart.appendChild(svg);
    var btnOut = h("button", { class: "btn btn-primary", text: "Ausreißer!", attrs: { type: "button" }, on: { click: outlier } });
    var btnReset = h("button", { class: "btn", text: "Zurücksetzen", attrs: { type: "button" }, on: { click: reset } });
    var cMed = h("td", { class: "num" }), cMean = h("td", { class: "num" }), dMed = h("td", { class: "num mn-shift" }), dMean = h("td", { class: "num mn-shift" });
    var table = h("div", { class: "table-wrap mn-tug-table" }, [h("table", { class: "t" }, [
      h("thead", { html: '<tr><th scope="col">Lagemaß</th><th scope="col" class="mn-r">Start</th><th scope="col" class="mn-r">Jetzt</th><th scope="col" class="mn-r">verschoben</th></tr>' }),
      h("tbody", {}, [
        h("tr", {}, [h("th", { attrs: { scope: "row" } }, [h("span", { class: "tag tag-med", text: "Median" })]), h("td", { class: "num", text: fmt(med0, 2) }), cMed, dMed]),
        h("tr", {}, [h("th", { attrs: { scope: "row" } }, [h("span", { class: "tag tag-mean", text: "Mittel" })]), h("td", { class: "num", text: fmt(mean0, 2) }), cMean, dMean])
      ])
    ])]);
    // Sichtbarer Satz (folgt jedem Bild der Animation) und eine eigene Ansage für Screenreader:
    // Die Ansage kommt erst am Ende der „Ausreißer!“-Fahrt bzw. kurz nach dem letzten Zug oder Tastendruck.
    var shownP = h("p", { class: "mn-tug-live", attrs: { "aria-hidden": "true" } });
    var live = h("p", { class: "mn-sr", attrs: { role: "status", "aria-live": "polite" } });
    var speak = P.announcer(function (t) { live.textContent = t; }, 400);
    var hint = h("p", { class: "small muted", html: "Mit der Tastatur: Punkt mit <kbd>Tab</kbd> wählen, dann <kbd>←</kbd> <kbd>→</kbd> für ±1 oder mit <kbd>Umschalt</kbd> für ±10. Ziehst du einen Punkt über den rechten Rand hinaus, wächst die Achse mit." });

    el.appendChild(chart);
    el.appendChild(h("div", { class: "w-controls" }, [btnOut, btnReset]));
    el.appendChild(shownP);
    el.appendChild(live);
    el.appendChild(table);
    el.appendChild(hint);

    function scaleX() { return LM.svg.scale(0, st.hi, geo.x0, geo.x1); }

    function build(w) {
      var mob = w < 560;
      var padL = mob ? 6 : 12, padR = mob ? 8 : 12, ph = mob ? 22 : 24, levels = mob ? 4 : 3, lvlH = ph + 4, rowH = 22;
      var labTop = 4, axisY = labTop + 2 * (rowH + 5) + 12 + levels * lvlH, height = axisY + 40;
      svg.innerHTML = "";
      svg.setAttribute("viewBox", "0 0 " + w + " " + height);
      svg.setAttribute("width", w);
      svg.setAttribute("height", height);
      G = {};
      G.axis = svgEl("g", { class: "mn-tug-axis" }, svg);
      svgEl("line", { class: "ax", x1: padL, x2: w - padR, y1: axisY, y2: axisY }, svg);
      svgEl("path", { class: "mn-arrow", d: "M" + (w - padR) + " " + axisY + " l-8 -4.5 v9 z" }, svg);
      G.medLine = svgEl("line", { class: "mn-line-med" }, svg);
      G.meanLine = svgEl("line", { class: "mn-line-mean" }, svg);
      G.meanTri = svgEl("path", { class: "mk-mean mn-tri" }, svg);
      G.pts = st.xs.map(function (v, i) { return makePoint(i); });
      G.medTag = svgPill(svg, "mn-tag-med", rowH);
      G.meanTag = svgPill(svg, "mn-tag-mean", rowH);
      geo = { w: w, mob: mob, padL: padL, padR: padR, x0: padL + 16, x1: w - padR - 34, axisY: axisY, ph: ph, levels: levels, lvlH: lvlH, labTop: labTop, rowH: rowH };
      update();
    }

    function makePoint(i) {
      var g = svgEl("g", { class: "mn-pt", tabindex: "0", role: "slider", "aria-label": "Wert " + (i + 1) + " von 6", "aria-valuemin": "0", "aria-valuemax": String(MAXV) }, svg);
      var hit = svgEl("rect", { class: "mn-pt-hit" }, g);   // unsichtbare, größere Greiffläche (34 px hoch)
      var ring = svgEl("rect", { class: "mn-pt-ring" }, g);
      var body = svgEl("rect", { class: "mn-pt-body" }, g);
      var txt = svgEl("text", { class: "mn-pt-txt", "text-anchor": "middle", y: 4.3 }, g);
      g.addEventListener("pointerdown", function (e) { startDrag(e, i); });
      g.addEventListener("pointermove", moveDrag);
      g.addEventListener("pointerup", endDrag);
      g.addEventListener("pointercancel", endDrag);
      g.addEventListener("keydown", function (e) { keyPoint(e, i); });
      return { g: g, hit: hit, ring: ring, body: body, txt: txt, w: 0, last: null };
    }

    function update() {
      if (!geo) return;
      var x = scaleX(), ax = geo.axisY;
      G.axis.innerHTML = "";
      P.niceTicks(0, st.hi, geo.mob ? 5 : 10).forEach(function (t) {
        var tx = x(t);
        if (tx > geo.x1 + 10) return;
        svgEl("line", { class: "mn-tickmark", x1: tx.toFixed(1), x2: tx.toFixed(1), y1: ax, y2: ax + 5 }, G.axis);
        LM.svg.text(G.axis, tx.toFixed(1), ax + 33, fmt(t, 2), { class: "tick", "text-anchor": "middle" });
      });

      var items = st.xs.map(function (v, i) {
        var p = G.pts[i], s = fmt(v, 0);
        if (p.last !== s) {
          p.last = s;
          p.txt.textContent = s;
          p.w = Math.max(geo.ph, s.length * 7.2 + 12);
          p.body.setAttribute("x", (-p.w / 2).toFixed(1));
          p.body.setAttribute("y", -geo.ph / 2);
          p.body.setAttribute("width", p.w.toFixed(1));
          p.body.setAttribute("height", geo.ph);
          p.body.setAttribute("rx", geo.ph / 2);
          p.ring.setAttribute("x", (-p.w / 2 - 4).toFixed(1));
          p.ring.setAttribute("y", -geo.ph / 2 - 4);
          p.ring.setAttribute("width", (p.w + 8).toFixed(1));
          p.ring.setAttribute("height", geo.ph + 8);
          p.ring.setAttribute("rx", geo.ph / 2 + 4);
          var hw = Math.max(36, p.w + 10);
          p.hit.setAttribute("x", (-hw / 2).toFixed(1));
          p.hit.setAttribute("y", -17);
          p.hit.setAttribute("width", hw.toFixed(1));
          p.hit.setAttribute("height", 34);
        }
        return { x: x(v), w: p.w };
      });
      var lv = P.dodge(items, 2), maxLv = Math.max.apply(null, lv);
      var sp = maxLv + 1 > geo.levels ? (geo.levels * geo.lvlH - 4) / (maxLv + 1) : geo.lvlH;
      G.pts.forEach(function (p, i) {
        var cy = ax - 5 - geo.ph / 2 - lv[i] * sp;
        p.g.setAttribute("transform", "translate(" + items[i].x.toFixed(1) + " " + cy.toFixed(1) + ")");
        p.g.setAttribute("aria-valuenow", String(st.xs[i]));
        p.g.setAttribute("aria-valuetext", fmt(st.xs[i], 0));
      });

      var med = S.median(st.xs), mean = S.mean(st.xs);
      var wMed = G.medTag.text("Median " + fmt(med, 2)), wMean = G.meanTag.text("Mittel " + fmt(mean, 2));
      var mx = x(med), nx = x(mean);
      var pl = P.placeLabels([{ x: mx, w: wMed }, { x: nx, w: wMean }], 1, geo.w - 1, 6);
      function rowY(r) { return geo.labTop + geo.rowH / 2 + r * (geo.rowH + 5); }
      G.medTag.move(pl[0].x, rowY(pl[0].row));
      G.meanTag.move(pl[1].x, rowY(pl[1].row));
      setLine(G.medLine, mx, rowY(pl[0].row) + geo.rowH / 2, ax);
      setLine(G.meanLine, nx, rowY(pl[1].row) + geo.rowH / 2, ax);
      G.meanTri.setAttribute("d", "M" + nx.toFixed(1) + " " + (ax + 3) + " l-6.5 11 h13 z");

      cMed.textContent = fmt(med, 2);
      cMean.textContent = fmt(mean, 2);
      dMed.textContent = signed(med - med0);
      dMean.textContent = signed(mean - mean0);
      say(med, mean);
    }

    function setLine(l, x, y1, y2) {
      l.setAttribute("x1", x.toFixed(1));
      l.setAttribute("x2", x.toFixed(1));
      l.setAttribute("y1", y1.toFixed(1));
      l.setAttribute("y2", y2);
    }

    function shift(d) { return fmt(Math.abs(d), 2) + (d > 0.005 ? " nach rechts" : d < -0.005 ? " nach links" : ""); }

    function say(med, mean) {
      var dm = mean - mean0, dd = med - med0, txt;
      if (Math.abs(dm) < 0.005 && Math.abs(dd) < 0.005) {
        txt = "Noch alles wie am Start: Median " + fmt(med0, 2) + ", Mittel " + fmt(mean0, 2) + ". Zieh einen Punkt weit nach rechts!";
      } else {
        txt = "Das Mittel hat sich um " + shift(dm) + " verschoben, der Median um " + shift(dd) + ".";
        if (Math.abs(dm) >= 3 && Math.abs(dm) >= 4 * Math.abs(dd)) {
          txt += Math.abs(dd) < 0.005 ? " Der Median bleibt stehen: Er ist robust gegen Ausreißer." : " Der Median bewegt sich kaum: Er ist robust gegen Ausreißer.";
        }
      }
      if (txt !== shown) {
        shown = txt;
        shownP.textContent = txt;
      }
      speak.show(txt);
    }

    function stopAnims() {
      if (anim) { anim.stop(); anim = null; }
      speak.release(false);
      if (zoom) { zoom.stop(); zoom = null; }
    }

    function zoomTo(target) {
      if (zoom) { zoom.stop(); zoom = null; }
      var from = st.hi;
      if (Math.abs(target - from) < 0.01) { st.hi = target; update(); return; }
      zoom = tween(360, function (k) { st.hi = from + (target - from) * k; update(); }, function () { zoom = null; });
    }

    function fitHi() { return P.tugHi(Math.max.apply(null, st.xs)); }

    function setVal(i, v) {
      v = clamp(Math.round(v), 0, MAXV);
      if (st.xs[i] === v) return;
      st.xs[i] = v;
      update();
    }

    function startDrag(e, i) {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      stopAnims();
      var p = G.pts[i];
      try { p.g.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      p.g.focus({ preventScroll: true });
      p.g.classList.add("is-drag");
      st.drag = { i: i, id: e.pointerId, pulling: false, g: p.g };
    }

    function moveDrag(e) {
      var d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      var px = svgX(svg, e);
      if (px > geo.x1 + 6 && st.xs[d.i] < MAXV) {
        if (!d.pulling) { d.pulling = true; pull(); }
        return;
      }
      d.pulling = false;
      setVal(d.i, scaleX().invert(px));
    }

    // Über den rechten Rand hinaus ziehen: Die Achse wächst, der Punkt wandert mit.
    function pull() {
      var d = st.drag;
      pullRaf = 0;
      if (!d || !d.pulling) return;
      st.hi = Math.min(P.tugHi(MAXV), st.hi * 1.02 + 0.3);
      st.xs[d.i] = clamp(Math.round(st.hi), 0, MAXV);
      update();
      if (st.xs[d.i] < MAXV) pullRaf = requestAnimationFrame(pull);
    }

    function endDrag(e) {
      var d = st.drag;
      if (!d || d.id !== e.pointerId) return;
      st.drag = null;
      if (pullRaf) { cancelAnimationFrame(pullRaf); pullRaf = 0; }
      d.g.classList.remove("is-drag");
      zoomTo(fitHi());
    }

    function keyPoint(e, i) {
      var k = e.key, step = e.shiftKey ? 10 : 1, v = st.xs[i];
      if (k === "ArrowRight" || k === "ArrowUp") v += step;
      else if (k === "ArrowLeft" || k === "ArrowDown") v -= step;
      else if (k === "PageUp") v += 10;
      else if (k === "PageDown") v -= 10;
      else if (k === "Home") v = 0;
      else return;
      e.preventDefault();
      stopAnims();
      setVal(i, v);
      zoomTo(fitHi());
    }

    // Der größte Wert wandert nach 150. Der Knopf bleibt aktiv (Fokus bleibt erhalten); ein zweiter Klick während der Fahrt zählt nicht.
    function outlier() {
      if (anim && anim.active()) return;
      stopAnims();
      var maxV = Math.max.apply(null, st.xs), i = st.xs.lastIndexOf(maxV), from = st.xs[i];
      if (from === OUT) { zoomTo(fitHi()); return; }
      speak.hold();
      anim = tween(1300, function (k) {
        st.xs[i] = Math.round(from + (OUT - from) * k);
        st.hi = fitHi();
        update();
      }, function () { anim = null; speak.release(true); });
    }

    function reset() {
      stopAnims();
      st.xs = START.slice();
      update();
      zoomTo(fitHi());
    }

    LM.svg.responsive(chart, build);
  });

  /* ================================================================
     4. Minimum-Kurven (min-curves)
     ================================================================ */

  LM.widget("min-curves", function (el) {
    var PRE = ["ungerade", "gerade", "mit Ausreißer"].map(function (label, i) { return { label: label, xs: DATA.curves[i] }; });
    var STEP = 0.1;
    var st = { pi: 0, xs: [], lo: 0, hi: 1, a: 4, med: 0, mean: 0, mz: null, fmin: 0, gmin: 0, liveKey: null };
    var slide = null, resp = null, CF, CG;

    widgetHead(el, "mn-mc", "Zwei Summen, zwei Minima", "Folien 97 und 115",
      "Schieb <i>a</i> über die Zahlengerade. Oben siehst du die Summe der Abstände, unten die Summe der quadrierten Abstände. Wo wird jede Summe am kleinsten?");

    var presets = seg(PRE.map(function (p) { return p.label; }), 0, choose, "Datensatz wählen");
    var dataP = h("p", { class: "mn-mc-data" });
    function block(kind, title, src) {
      var val = h("span", { class: "mn-mc-val" });
      var ok = h("span", { class: "mn-okbadge", text: "kleiner geht es nicht" });
      var head = h("div", { class: "mn-mc-head" }, [h("span", { class: "mn-mc-title", html: title + " " + tex(src) }), val, ok]);
      var box = h("div", { class: "chart mn-mc-chart" });
      var note = h("p", { class: "mn-mc-note" });
      var wrap = h("div", { class: "mn-mc-block mn-mc-" + kind }, [head, box, note]);
      var svg = svgEl("svg", { class: "mn-svg", role: "img", "aria-label": title });
      box.appendChild(svg);
      var C = { kind: kind, svg: svg, val: val, ok: ok, note: note, wrap: wrap };
      dragSurface(svg, {
        down: function () { stopSlide(); },
        move: function (px) { if (C.x) setA(C.x.invert(px), "user"); }
      });
      return C;
    }
    CF = block("f", "Summe der Abstände", "\\textstyle\\sum \\lvert x_i - a \\rvert");
    CG = block("g", "Summe der Quadrate", "\\textstyle\\sum (x_i - a)^2");
    var charts = h("div", { class: "mn-mc-charts" }, [CF.wrap, CG.wrap]);

    var btnL = h("button", { class: "btn btn-sm mn-nudge", text: "◀", attrs: { type: "button", "aria-label": "a um 0,1 nach links" }, on: { click: function () { nudge(-1); } } });
    var btnR = h("button", { class: "btn btn-sm mn-nudge", text: "▶", attrs: { type: "button", "aria-label": "a um 0,1 nach rechts" }, on: { click: function () { nudge(1); } } });
    var slider = h("input", { class: "slider", attrs: { type: "range", step: String(STEP), "aria-label": "Position a" }, on: { input: function () { stopSlide(); setA(Number(slider.value), "user"); } } });
    var btnMed = h("button", { class: "btn btn-sm mn-btn-med", attrs: { type: "button" }, html: '<span class="mn-line-ico" aria-hidden="true"></span>a auf den Median', on: { click: function () { slideTo(st.med); } } });
    var btnMean = h("button", { class: "btn btn-sm mn-btn-mean", attrs: { type: "button" }, html: '<span class="mn-tri-ico" aria-hidden="true"></span>a auf das Mittel', on: { click: function () { slideTo(st.mean); } } });
    var live = h("p", { class: "mn-sr", attrs: { role: "status", "aria-live": "polite" } });

    el.appendChild(h("div", { class: "w-controls" }, [presets.el]));
    el.appendChild(dataP);
    el.appendChild(charts);
    el.appendChild(h("div", { class: "w-controls mn-ctl" }, [h("div", { class: "mn-arow" }, [btnL, slider, btnR]), h("div", { class: "mn-jump" }, [btnMed, btnMean])]));
    el.appendChild(live);

    function fOf(a) { return S.sumAbs(st.xs, a); }
    function gOf(a) { return S.sumSq(st.xs, a); }

    function choose(i) {
      stopSlide();
      st.pi = i;
      st.xs = PRE[i].xs.slice();
      st.med = S.median(st.xs);
      st.mean = S.mean(st.xs);
      st.mz = S.absMinimizer(st.xs);
      st.fmin = S.sumAbs(st.xs, st.med);
      st.gmin = S.sumSq(st.xs, st.mean);
      var d = P.niceDomain(Math.min.apply(null, st.xs), Math.max.apply(null, st.xs));
      st.lo = Math.max(0, d[0]);
      st.hi = d[1];
      slider.min = String(st.lo);
      slider.max = String(st.hi);
      st.a = clamp(st.a, st.lo, st.hi);
      var n = st.xs.length;
      dataP.innerHTML = "Daten: " + fmtList(st.xs) + " · " + tex("n = " + n) + (n % 2 ? " (ungerade)" : " (gerade)");
      var flat = st.mz.to > st.mz.from;
      var even = "Zwischen " + fmt(st.mz.from) + " und " + fmt(st.mz.to) + " ist die Kurve flach (türkis hinterlegt). Bei geradem " + tex("n") + " ist jeder Wert dazwischen gleich gut; der Median liegt genau in der Mitte.";
      if (i === 0) {
        CF.note.innerHTML = '<span class="mn-key mn-key-med" aria-hidden="true"></span>Der tiefste Punkt liegt genau beim Median ' + fmt(st.med) + ".";
        CG.note.innerHTML = '<span class="mn-key mn-key-mean" aria-hidden="true"></span>Der tiefste Punkt liegt genau beim Mittel ' + fmt(st.mean) + ".";
      } else if (i === 1) {
        CF.note.innerHTML = '<span class="mn-key mn-key-med" aria-hidden="true"></span>' + even;
        CG.note.innerHTML = '<span class="mn-key mn-key-mean" aria-hidden="true"></span>Hier gibt es nur einen tiefsten Punkt: genau beim Mittel ' + fmt(st.mean) + ".";
      } else {
        var mean6 = S.mean(PRE[1].xs);
        CF.note.innerHTML = '<span class="mn-key mn-key-med" aria-hidden="true"></span>' + (flat ? even : "") +
          " Der Ausreißer " + fmt(Math.max.apply(null, st.xs)) + " ändert daran nichts: Der Median ist robust.";
        CG.note.innerHTML = '<span class="mn-key mn-key-mean" aria-hidden="true"></span>Ohne Ausreißer lag der tiefste Punkt bei ' + fmt(mean6) +
          " (leeres Dreieck). Der Ausreißer " + fmt(Math.max.apply(null, st.xs)) + " zieht ihn nach rechts, bis zum Mittel " + fmt(st.mean) + ".";
      }
      st.liveKey = null;
      if (resp) resp.redraw();
      update();
    }

    function drawChart(C, w) {
      var mob = w < 560, svg = C.svg;
      var mL = mob ? 40 : 50, mR = mob ? 10 : 18, mT = C.kind === "f" ? 34 : 26, mB = 32, ph = mob ? 118 : 150;
      var H = mT + ph + mB, f = C.kind === "f" ? fOf : gOf;
      svg.innerHTML = "";
      svg.setAttribute("viewBox", "0 0 " + w + " " + H);
      svg.setAttribute("width", w);
      svg.setAttribute("height", H);
      var x = LM.svg.scale(st.lo, st.hi, mL, w - mR);
      var top = Math.max(f(st.lo), f(st.hi)) * 1.05;
      var yt = P.niceTicks(0, top, mob ? 3 : 4);
      top = Math.max(top, yt[yt.length - 1]);
      var y = LM.svg.scale(0, top, mT + ph, mT), base = mT + ph;
      yt.forEach(function (t) {
        svgEl("line", { class: "gridline", x1: mL, x2: w - mR, y1: y(t).toFixed(1), y2: y(t).toFixed(1) }, svg);
        LM.svg.text(svg, mL - 7, (y(t) + 4).toFixed(1), fmt(t, 2), { class: "tick", "text-anchor": "end" });
      });
      if (C.kind === "f" && st.mz.to > st.mz.from) {
        // Bei geradem n: das ganze flache Stück als helle Säule hinterlegen, damit es auch schmal gut sichtbar ist.
        svgEl("rect", { class: "mn-flatzone", x: x(st.mz.from).toFixed(1), y: mT - 2, width: (x(st.mz.to) - x(st.mz.from)).toFixed(1), height: base - mT + 2 }, svg);
      }
      svgEl("line", { class: "ax", x1: mL, x2: w - mR, y1: base, y2: base }, svg);
      P.niceTicks(st.lo, st.hi, mob ? 6 : 10).forEach(function (t) {
        var tx = x(t).toFixed(1);
        svgEl("line", { class: "mn-tickmark", x1: tx, x2: tx, y1: base, y2: base + 4 }, svg);
        LM.svg.text(svg, tx, base + 25, fmt(t, 2), { class: "tick", "text-anchor": "middle" });
      });
      st.xs.forEach(function (v) {
        svgEl("line", { class: "mn-dtick", x1: x(v).toFixed(1), x2: x(v).toFixed(1), y1: base - 10, y2: base - 1 }, svg);
      });
      var d = "";
      if (C.kind === "f") {
        P.absBreaks(st.xs, st.lo, st.hi).forEach(function (a, i) { d += (i ? " L" : "M") + x(a).toFixed(1) + " " + y(f(a)).toFixed(1); });
      } else {
        for (var i = 0; i <= 160; i++) {
          var a = st.lo + (st.hi - st.lo) * i / 160;
          d += (i ? " L" : "M") + x(a).toFixed(1) + " " + y(f(a)).toFixed(1);
        }
      }
      svgEl("path", { class: "mn-curve", d: d }, svg);
      if (C.kind === "f" && st.mz.to > st.mz.from) {
        svgEl("line", { class: "mn-flat", x1: x(st.mz.from).toFixed(1), x2: x(st.mz.to).toFixed(1), y1: y(st.fmin).toFixed(1), y2: y(st.fmin).toFixed(1) }, svg);
      }
      // Reihenfolge: a-Linie unter den Beschriftungen (bleiben lesbar), der a-Punkt ganz oben.
      C.aLine = svgEl("line", { class: "mn-aline", y1: mT - (C.kind === "f" ? 8 : 4), y2: base }, svg);
      var tag, tagX, tagY;
      if (C.kind === "f") {
        svgEl("circle", { class: "mk-med mn-mindot", cx: x(st.med).toFixed(1), cy: y(st.fmin).toFixed(1), r: 5.5 }, svg);
        tag = svgPill(svg, "mn-tag-med");
        var wm = tag.text("Median " + fmt(st.med));
        tagX = clamp(x(st.med), mL + wm / 2, w - mR - wm / 2);
        tagY = y(st.fmin) - 20;
      } else {
        if (st.pi === 2) {
          // Wo lag das Minimum ohne Ausreißer? Leeres Dreieck, dazu ein Pfeil zum neuen Mittel.
          var gx = x(S.mean(PRE[1].xs)), mx = x(st.mean), ay = base + 6;
          svgEl("path", { class: "mn-ghost", d: "M" + gx.toFixed(1) + " " + (base + 1.5) + " l-5.5 9.5 h11 z" }, svg);
          if (mx - gx > 34) {
            svgEl("path", { class: "mn-ghost-arrow", d: "M" + (gx + 9).toFixed(1) + " " + ay + " H" + (mx - 12).toFixed(1) }, svg);
            svgEl("path", { class: "mn-ghost-head", d: "M" + (mx - 9).toFixed(1) + " " + ay + " l-6 -3.5 v7 z" }, svg);
          }
        }
        svgEl("circle", { class: "mk-mean mn-mindot", cx: x(st.mean).toFixed(1), cy: y(st.gmin).toFixed(1), r: 5.5 }, svg);
        svgEl("path", { class: "mk-mean", d: "M" + x(st.mean).toFixed(1) + " " + (base + 1) + " l-6 10 h12 z" }, svg);
        tag = svgPill(svg, "mn-tag-mean");
        var wn = tag.text("Mittel " + fmt(st.mean));
        tagX = clamp(x(st.mean), mL + wn / 2, w - mR - wn / 2);
        tagY = y(st.gmin) - 20;
      }
      tag.move(tagX, tagY);
      C.aDot = svgEl("circle", { class: "mn-adot", r: 6 }, svg);
      C.aTag = C.kind === "f" ? svgPill(svg, "mn-tag-a", 20) : null;
      svgEl("rect", { class: "mn-hitbox", x: mL - 6, y: 0, width: w - mL - mR + 12, height: H }, svg);
      C.x = x;
      C.y = y;
      C.f = f;
      C.mT = mT;
      C.mL = mL;
      C.mR = mR;
      C.w = w;
    }

    function update() {
      [CF, CG].forEach(function (C) {
        if (!C.x) return;
        var ax = C.x(st.a), val = C.f(st.a);
        C.aLine.setAttribute("x1", ax.toFixed(1));
        C.aLine.setAttribute("x2", ax.toFixed(1));
        C.aDot.setAttribute("cx", ax.toFixed(1));
        C.aDot.setAttribute("cy", C.y(val).toFixed(1));
        if (C.aTag) {
          var w = C.aTag.text("a = " + fmt(st.a));
          C.aTag.move(clamp(ax, C.mL + w / 2 - 6, C.w - C.mR - w / 2 + 6), C.mT - 20);
        }
      });
      var fv = fOf(st.a), gv = gOf(st.a);
      var atF = fv <= st.fmin + 1e-9, atG = Math.abs(st.a - st.mean) < 1e-9;
      CF.val.textContent = "= " + fmt(fv);
      CG.val.textContent = "= " + fmt(gv);
      CF.ok.classList.toggle("is-on", atF);
      CG.ok.classList.toggle("is-on", atG);
      CF.wrap.classList.toggle("is-min", atF);
      CG.wrap.classList.toggle("is-min", atG);
      slider.value = String(st.a);
      slider.setAttribute("aria-valuetext", "a = " + fmt(st.a) + ", Summe der Abstände " + fmt(fv) + ", Summe der Quadrate " + fmt(gv));
      var key = (atF ? "f" : "") + (atG ? "g" : "");
      if (key !== st.liveKey) {
        st.liveKey = key;
        live.textContent = atF && atG ? "Beide Summen sind hier am kleinsten." :
          atF ? "Die Summe der Abstände ist hier am kleinsten. Kleiner geht es nicht." :
          atG ? "Die Summe der Quadrate ist hier am kleinsten. Kleiner geht es nicht." : "";
      }
    }

    function setA(v, how) {
      v = clamp(v, st.lo, st.hi);
      if (how !== "exact") v = P.snap(clamp(P.roundTo(v, STEP), st.lo, st.hi), [st.med, st.mean], STEP / 2);
      st.a = v;
      update();
    }

    function nudge(dir) {
      stopSlide();
      st.a = P.stepValue(st.a, dir * STEP, STEP, [st.med, st.mean], STEP / 2, st.lo, st.hi);
      update();
    }

    function stopSlide() { if (slide) { slide.stop(); slide = null; } }

    function slideTo(target) {
      stopSlide();
      var from = st.a;
      slide = tween(Math.abs(target - from) < EPS ? 0 : 650, function (k) { setA(from + (target - from) * k, "exact"); }, function () {
        slide = null;
        setA(target, "exact");
      });
    }

    slider.addEventListener("keydown", function () { stopSlide(); });

    choose(0);
    resp = LM.svg.responsive(charts, function (w) {
      drawChart(CF, CF.wrap.querySelector(".mn-mc-chart").clientWidth || w);
      drawChart(CG, CG.wrap.querySelector(".mn-mc-chart").clientWidth || w);
      update();
    });
  });
})(typeof window !== "undefined" ? window : globalThis);
