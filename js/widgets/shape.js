/*
 * Bündel „shape“ der Lagemaße-Seite.
 *   lin-trans    Kapitel 6: Umrechnen mit y_i = p·x_i + q (Folien 133–136). Zwei Zahlengeraden,
 *                jeder Wert und das Mittel wandern nach derselben Regel. Probe mit LM.stats.linear + mean.
 *   skew-shaper  Kapitel 9: Schiefe zum Anfassen (Folien 140–142, Beispiele 146 und 148–150).
 *                Histogramm mit Modus, Median und Mittel, x̄ − x̃, Reihenfolge und Quartilskoeffizient.
 * Rechnen nur über LM.stats, Zahlen nur über LM.fmt, Formeln über LM.tex. Stile: css/widgets/shape.css (Präfix sh-).
 * Die reine Logik (Formgenerator, Klassen, Auswertung, Texte) steht oben ohne DOM.
 * In Node wird sie exportiert und in tests/shape.test.js geprüft; im Browser liegt sie zusätzlich in LM._shape.
 */
(function (root) {
  "use strict";
  var LM = (root.LM = root.LM || {});

  /* =====================================================================
     Reine Logik (kein DOM)
     ===================================================================== */

  var EPS = 1e-9;
  function S() { return LM.stats; }
  function fmt(v, d) { return LM.fmt(v, d === undefined ? 3 : d); }
  function range(lo, hi) { var out = []; for (var v = lo; v <= hi; v++) out.push(v); return out; }

  // Zahl für KaTeX: Dezimalkomma als {,} und ein normales Minus
  function texNum(v, d) { return fmt(v, d).replace("−", "-").replace(",", "{,}"); }
  // Negative Zahlen in Klammern, z. B. „1,8 · (−3)“
  function texPar(v, d) { var s = texNum(v, d); return s.charAt(0) === "-" ? "(" + s + ")" : s; }
  // Wird die Zahl beim Anzeigen mit d Nachkommastellen gerundet?
  function isRounded(v, d) { return Math.abs(LM.parseNum(fmt(v, d)) - v) > 1e-9 * Math.max(1, Math.abs(v)); }

  /* ---------- Daten ---------- */

  // Höchsttemperaturen (°C) von Folie 129 bzw. 146
  var TEMPS = [16, 4, 13, 9, 8];

  // 60 Reaktionszeiten (ms) aus Übungsblatt 2, Aufgabe 8
  var RT_A8 = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];

  // Körpergewicht (kg) von 100 Studenten, Urliste von Folie 148
  var GEWICHT = [61.1, 62.0, 62.2, 61.8, 60.2, 63.4, 63.5, 64.1, 65.0, 64.2, 67.5, 65.4, 64.7, 64.4, 65.1, 65.2, 68.2, 63.8, 63.6, 65.3,
    66.9, 63.4, 65.0, 67.2, 67.2, 67.2, 68.4, 66.6, 67.4, 67.6, 66.0, 68.7, 66.8, 66.1, 66.3, 66.5, 68.9, 67.9, 69.4, 67.7,
    66.4, 68.4, 67.7, 67.2, 66.7, 66.0, 67.8, 67.8, 67.7, 68.2, 68.8, 66.5, 68.8, 66.8, 66.1, 67.1, 68.7, 68.8, 68.9, 66.8,
    68.3, 68.3, 67.9, 67.3, 66.0, 70.9, 70.5, 69.0, 69.1, 69.7, 69.6, 70.9, 70.1, 70.1, 69.3, 71.1, 70.2, 71.7, 69.3, 71.9,
    71.1, 70.9, 71.6, 71.0, 70.6, 69.5, 69.1, 71.3, 70.2, 71.1, 69.5, 71.7, 73.8, 72.3, 72.2, 73.0, 72.4, 74.9, 72.5, 72.3];

  /* ---------- Formgenerator (deterministisch) ---------- */

  // Beta-Form auf den Werten 1 … K: Gewicht u^(a−1) · (K − u)^(b−1) mit u = v − 0,5.
  // a < b: Gipfel links, langer Ausläufer rechts (rechtsschief). a = b: spiegelsymmetrisch.
  function betaWeights(K, a, b) {
    var w = [];
    for (var v = 1; v <= K; v++) { var u = v - 0.5; w.push(Math.pow(u, a - 1) * Math.pow(K - u, b - 1)); }
    return w;
  }

  // n Stück im Verhältnis der Gewichte verteilen (größte Reste), Summe genau n.
  function apportion(weights, n) {
    var W = S().sum(weights);
    var raw = weights.map(function (w) { return w * n / W; });
    var c = raw.map(function (r) { return Math.floor(r); });
    var rest = n - S().sum(c);
    var order = raw.map(function (r, i) { return i; }).sort(function (i, j) {
      return (raw[j] - c[j]) - (raw[i] - c[i]) || i - j;
    });
    for (var k = 0; k < rest; k++) c[order[k]]++;
    return c;
  }

  // Wie apportion, aber exakt spiegelsymmetrisch (K ungerade): Die Mitte bekommt eine Anzahl mit derselben
  // Parität wie n, jedes Paar links/rechts gleich viel. Dann ist x̄ − x̃ = 0 und g = 0 ganz genau.
  function apportionSym(weights, n) {
    var K = weights.length, mid = (K - 1) / 2, W = S().sum(weights), par = n % 2;
    var hMid = par + 2 * Math.round((weights[mid] * n / W - par) / 2);
    var half = apportion(weights.slice(mid + 1), (n - hMid) / 2), out = [];
    for (var i = 0; i < K; i++) out.push(i === mid ? hMid : half[Math.abs(i - mid) - 1]);
    return out;
  }

  // Sieben Stellungen des Reglers „Form“. Jede Stufe hat ihre eigene Beta-Form; die Parameter sind so gewählt,
  // dass jede Stufe eingipflig ist, einen eindeutigen Modus hat und x̄ − x̃ und g mit der Stufe wachsen
  // (geprüft in tests/shape.test.js). Linksschiefe Stufen sind das genaue Spiegelbild der rechtsschiefen.
  var SHAPE_K = 15, SHAPE_N = 100, SHAPE_MAX = 3;
  var STOPS = [{ a: 4.5, b: 4.5 }, { a: 2.8, b: 4.0 }, { a: 1.7, b: 3.3 }, { a: 1.5, b: 3.7 }];
  var STOP_NAMES = {
    "-3": "stark linksschief", "-2": "linksschief", "-1": "leicht linksschief", "0": "symmetrisch",
    "1": "leicht rechtsschief", "2": "rechtsschief", "3": "stark rechtsschief"
  };

  function clampStep(step) { return Math.max(-SHAPE_MAX, Math.min(SHAPE_MAX, Math.round(Number(step) || 0))); }

  // Anzahlen über den Werten 1 … 15 (n = 100) für Stufe −3 … 3 (negativ = linksschief, positiv = rechtsschief)
  function shapeCounts(step) {
    step = clampStep(step);
    var st = STOPS[Math.abs(step)], w = betaWeights(SHAPE_K, st.a, st.b);
    var counts = step === 0 ? apportionSym(w, SHAPE_N) : apportion(w, SHAPE_N);
    if (step < 0) counts = counts.slice().reverse();
    return { values: range(1, SHAPE_K), counts: counts };
  }
  function stepName(step) { return STOP_NAMES[String(clampStep(step))]; }

  // „Leichte Klausur“: 100 ausgedachte Ergebnisse von 0 bis 20 Punkten, Gipfel weit rechts (linksschief)
  function examCounts() {
    return { values: range(0, 20), counts: apportion(betaWeights(21, 5.6, 1.5), SHAPE_N) };
  }

  /* ---------- Klassen und Balken ---------- */

  // Klassen (u_{j−1}, u_j] wie in R hist(right = TRUE); die erste Klasse schließt ihre linke Grenze mit ein.
  function classBins(xs, lo, width, m) {
    var bins = [];
    for (var j = 0; j < m; j++) bins.push({ lo: lo + j * width, hi: lo + (j + 1) * width, mid: lo + (j + 0.5) * width, h: 0 });
    xs.forEach(function (x) {
      var k = Math.ceil((x - lo) / width - EPS) - 1;
      if (k < 0 && x >= lo - EPS) k = 0;
      if (k >= 0 && k < m) bins[k].h++;
    });
    return bins;
  }

  // Einzelwerte: ein schmaler Balken pro Wert (wie ein Stabdiagramm)
  function valueBins(values, counts) {
    return values.map(function (v, j) { return { lo: v - 0.4, hi: v + 0.4, mid: v, h: counts[j], value: v }; });
  }

  // In welchem Balken liegt der Wert v?
  function binIndex(bins, v, kind) {
    for (var j = 0; j < bins.length; j++) {
      var b = bins[j];
      if (kind === "values" ? Math.abs(b.value - v) < EPS : ((v > b.lo + EPS || (j === 0 && v >= b.lo - EPS)) && v <= b.hi + EPS)) return j;
    }
    return -1;
  }

  // Obergrenze der Zählachse: „schöne“ ganze Zahl ≥ m
  function niceCountMax(m) {
    m = Math.max(1, m);
    var t = LM.svg.ticks(0, m, 5), step = t.length > 1 ? t[1] - t[0] : 1;
    step = Math.max(1, Math.ceil(step - EPS));
    return Math.max(2, Math.ceil(m / step - EPS) * step);
  }
  function countTicks(yMax) {
    var t = LM.svg.ticks(0, yMax, 4), step = t.length > 1 ? t[1] - t[0] : 1;
    step = Math.max(1, Math.ceil(step - EPS));
    var out = [];
    for (var v = 0; v <= yMax + EPS; v += step) out.push(v);
    return out;
  }

  // Die fünf Datensätze des Schiefe-Moduls. xs ist immer die Urliste (bei Häufigkeiten über LM.stats.expand).
  function buildSet(id, opt) {
    opt = opt || {};
    var st = S(), set;
    if (id === "form" || id === "exam") {
      var sc = id === "form" ? shapeCounts(opt.step) : examCounts();
      set = {
        id: id, kind: "values", values: sc.values, counts: sc.counts, xs: st.expand(sc.values, sc.counts),
        bins: valueBins(sc.values, sc.counts),
        domain: [sc.values[0] - 0.6, sc.values[sc.values.length - 1] + 0.6],
        xTitle: id === "form" ? "Wert" : "Punkte", unit: id === "form" ? "" : " Punkte", digits: 3
      };
      set.yMax = id === "form" ? FORM_YMAX() : niceCountMax(Math.max.apply(null, sc.counts));
      return set;
    }
    if (id === "f146") {
      var vals = range(3, 17), table = st.freq(TEMPS);
      var counts = vals.map(function (v) {
        var row = table.filter(function (r) { return r.value === v; })[0];
        return row ? row.h : 0;
      });
      return {
        id: id, kind: "values", values: vals, counts: counts, xs: TEMPS.slice(),
        bins: valueBins(vals, counts), domain: [2.4, 17.6], yMax: 2,
        xTitle: "Höchsttemperatur in °C", unit: " °C", digits: 3
      };
    }
    if (id === "rt") {
      return {
        id: id, kind: "classes", xs: RT_A8.slice(), bins: classBins(RT_A8, 100, 50, 14), domain: [100, 800],
        yMax: 25, xTitle: "Reaktionszeit in ms", unit: " ms", digits: 3, outliers: true, classWidth: 50
      };
    }
    if (id === "weight") {
      var w = opt.width === 3 ? 3 : 1;
      var bins = classBins(GEWICHT, 60, w, 15 / w);
      return {
        id: id, kind: "classes", xs: GEWICHT.slice(), bins: bins, domain: [60, 75],
        yMax: niceCountMax(Math.max.apply(null, bins.map(function (b) { return b.h; }))),
        xTitle: "Körpergewicht in kg", unit: " kg", digits: 3, classWidth: w
      };
    }
    return null;
  }

  // Größte Anzahl über alle Stufen, damit die Zählachse beim Ziehen am Regler stillsteht
  var formYMax = null;
  function FORM_YMAX() {
    if (formYMax === null) {
      var m = 0;
      for (var s = -SHAPE_MAX; s <= SHAPE_MAX; s++) m = Math.max(m, Math.max.apply(null, shapeCounts(s).counts));
      formYMax = niceCountMax(m);
    }
    return formYMax;
  }

  /* ---------- Auswertung Schiefe ---------- */

  // Alles, was das Schiefe-Modul anzeigt: Modus, Median, Mittel, x̄ − x̃ und Quartilskoeffizient (p = 0,25).
  function analyse(xs) {
    var st = S(), mi = st.modeInfo(xs), sk = st.skewInfo(xs, 0.25);
    var an = {
      n: xs.length, modeInfo: mi, mode: mi.value, median: st.median(xs), mean: st.mean(xs), skew: sk,
      q1: sk.qLow, q3: sk.qHigh, iqr: sk.qHigh - sk.qLow, dir: sk.diffDirection, gdir: sk.gpDirection
    };
    // „fast symmetrisch“: Mittel und Median liegen weniger als 5 % der Boxbreite auseinander und |g| < 0,15
    an.mild = an.dir !== "symmetrisch" && an.dir === an.gdir && Math.abs(sk.gp) < 0.15 &&
      an.iqr > EPS && Math.abs(sk.diff) / an.iqr < 0.05;
    an.agree = an.dir === an.gdir || an.gdir === "undefiniert";
    return an;
  }

  // Reihenfolge der Lagemaße auf der Achse (von links nach rechts), „=“ bei Gleichstand
  function orderOf(an) {
    var items = [];
    if (an.mode !== null) items.push({ key: "mod", name: "Modus", v: an.mode });
    items.push({ key: "med", name: "Median", v: an.median });
    items.push({ key: "mean", name: "Mittel", v: an.mean });
    var rank = { mod: 0, med: 1, mean: 2 };
    items.sort(function (a, b) { return Math.abs(a.v - b.v) < EPS ? rank[a.key] - rank[b.key] : a.v - b.v; });
    var rel = [];
    for (var i = 1; i < items.length; i++) rel.push(Math.abs(items[i].v - items[i - 1].v) < EPS ? "=" : "<");
    var text = items[0].name;
    for (i = 1; i < items.length; i++) text += " " + rel[i - 1] + " " + items[i].name;
    return { items: items, rel: rel, keys: items.map(function (it) { return it.key; }), text: text };
  }

  // Passt die Reihenfolge zu Folie 141? (positiv: Modus < Median < Mittel, negativ: umgekehrt, symmetrisch: gleich)
  function orderMatchesSlide(an, ord) {
    var keys = ord.keys.join(","), strict = ord.rel.every(function (r) { return r === "<"; });
    if (an.dir === "symmetrisch") return ord.rel.every(function (r) { return r === "="; });
    if (an.dir === "rechtsschief") return strict && (keys === "mod,med,mean" || keys === "med,mean");
    if (an.dir === "linksschief") return strict && (keys === "mean,med,mod" || keys === "mean,med");
    return false;
  }

  // Wörter von Folie 140 (x̄ − x̃) und Folie 142 (g_p)
  var DIFF_WORDS = {
    symmetrisch: "symmetrisch (Schiefe gleich Null)",
    rechtsschief: "tendenziell rechtsschief bzw. linkssteil (positive Schiefe)",
    linksschief: "tendenziell linksschief bzw. rechtssteil (negative Schiefe)",
    undefiniert: "nicht bestimmt"
  };
  var G_WORDS = {
    symmetrisch: "symmetrisch (Schiefe gleich Null)",
    rechtsschief: "rechtsschief bzw. linkssteil (positive Schiefe)",
    linksschief: "linksschief bzw. rechtssteil (negative Schiefe)",
    undefiniert: "nicht bestimmt, weil Q₃ − Q₁ = 0 ist"
  };

  function relTex(v) { return v > 0 ? " > 0" : v < 0 ? " < 0" : ""; }

  // x̄ − x̃ mit eingesetzten Zahlen
  function diffTex(an) {
    var sk = an.skew;
    var eq = (isRounded(sk.mean, 3) || isRounded(sk.median, 3) || isRounded(sk.diff, 3)) ? " \\approx " : " = ";
    return "\\bar{x} - \\tilde{x} = " + texNum(sk.mean) + " - " + texPar(sk.median) + eq + texNum(sk.diff) + relTex(sk.diff);
  }

  // Quartilskoeffizient mit eingesetzten Zahlen, in drei Stücken (damit es auf dem Handy umbrechen kann)
  function gTexParts(an) {
    var sk = an.skew;
    if (!isFinite(sk.gp)) return null;
    var q1 = texNum(sk.qLow), q3 = texNum(sk.qHigh), md = texNum(sk.median);
    return [
      "g_{0{,}25} = \\dfrac{(" + q3 + " - " + md + ") - (" + md + " - " + q1 + ")}{" + q3 + " - " + q1 + "}",
      "= \\dfrac{" + texNum(sk.upper) + " - " + texPar(sk.lower) + "}{" + texNum(an.iqr) + "}",
      (isRounded(sk.gp, 3) ? "\\approx " : "= ") + texNum(sk.gp) + relTex(sk.gp)
    ];
  }

  // Balken mit dem Gipfel: der Modus-Balken oder (bei Klassen ohne eindeutigen Modus) der eindeutig höchste Balken.
  // −1, wenn es keinen Gipfel gibt (z. B. fünf verschiedene Werte, jeder einmal).
  function peakIndex(set, an) {
    if (an.mode !== null) return binIndex(set.bins, an.mode, set.kind);
    if (set.kind !== "classes") return -1;
    var hs = set.bins.map(function (b) { return b.h; }), mx = Math.max.apply(null, hs);
    return hs.filter(function (h) { return h === mx; }).length === 1 ? hs.indexOf(mx) : -1;
  }

  // Überschrift des Ergebnisses. peak = false: Die Daten haben keinen Gipfel, also ohne „Gipfel“ beschreiben.
  function verdictOf(an, peak) {
    if (!an.agree) return { cls: "mixed", title: "Nicht eindeutig", sub: "Mittel minus Median und g zeigen in verschiedene Richtungen. Die Verteilung ist kaum schief." };
    if (an.dir === "symmetrisch") return { cls: "sym", title: "Symmetrisch", sub: "Keine Schiefe: Beide Seiten sehen gleich aus." };
    var right = an.dir === "rechtsschief";
    if (an.mild) {
      return right
        ? { cls: "pos", title: "Fast symmetrisch, leicht rechtsschief", sub: "Mittel minus Median und g sind positiv, aber beide sehr klein." }
        : { cls: "neg", title: "Fast symmetrisch, leicht linksschief", sub: "Mittel minus Median und g sind negativ, aber beide sehr klein." };
    }
    if (peak === false) {
      return right
        ? { cls: "pos", title: "Rechtsschief = linkssteil", sub: "Positive Schiefe: Rechts liegen die Werte weiter draußen als links." }
        : { cls: "neg", title: "Linksschief = rechtssteil", sub: "Negative Schiefe: Links liegen die Werte weiter draußen als rechts." };
    }
    return right
      ? { cls: "pos", title: "Rechtsschief = linkssteil", sub: "Positive Schiefe: Gipfel links, langer Ausläufer nach rechts." }
      : { cls: "neg", title: "Linksschief = rechtssteil", sub: "Negative Schiefe: Gipfel rechts, langer Ausläufer nach links." };
  }

  // Was der lange Ausläufer mit dem Mittel macht
  function tailText(an, set) {
    if (an.dir === "symmetrisch") return "Warum? Beide Seiten sind gleich lang. Kein Ausläufer zieht das Mittel weg, darum liegt es genau auf dem Median.";
    var right = an.dir === "rechtsschief", side = right ? "rechts" : "links";
    if (an.mild) {
      return "Warum so wenig? Die " + (right ? "rechte" : "linke") + " Seite ist nur ein kleines bisschen länger. Darum zieht sie das Mittel nur ganz knapp nach " + side + ".";
    }
    var t = set && peakIndex(set, an) < 0
      ? "Warum? " + (right ? "Rechts" : "Links") + " liegen die Werte weiter draußen und ziehen das Mittel nach " + side + ", denn beim Mittel zählt jeder Wert mit seiner Größe. " +
        "Der Median zählt nur ab und bleibt in der Mitte."
      : "Warum? Der lange Ausläufer " + side + " zieht das Mittel nach " + side + ", denn beim Mittel zählt jeder Wert mit seiner Größe. " +
        "Der Median zählt nur ab und bleibt näher am Gipfel.";
    if (set && set.outliers) {
      var b = S().boxplot(set.xs, 1.5), far = b.out.filter(function (v) { return right ? v > b.q3 : v < b.q1; });
      if (far.length) {
        t += " Besonders stark ziehen die Ausreißer " + joinDe(far.map(function (v) { return fmt(v); })) + (set.unit || "") + ".";
      }
    }
    return t;
  }

  function joinDe(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " und " + items[items.length - 1];
  }
  function timesDe(h) { return h === 1 ? "einmal" : h + "-mal"; }

  /* ---------- Lineare Transformation ---------- */

  var P_MIN = -3, P_MAX = 3, Q_MIN = -50, Q_MAX = 50;

  function checkP(p) {
    if (!isFinite(p)) return { ok: false, msg: "Gib für p eine Zahl ein, zum Beispiel 1,5." };
    if (Math.abs(p) < EPS) return { ok: false, zero: true, msg: "p = 0 geht nicht. Dann würde jeder Wert zu q, und du könntest nie mehr zurückrechnen. Deshalb verlangt Folie 133: p ≠ 0." };
    if (p < P_MIN - EPS || p > P_MAX + EPS) return { ok: false, msg: "Wähle p zwischen −3 und 3." };
    return { ok: true };
  }
  function checkQ(q) {
    if (!isFinite(q)) return { ok: false, msg: "Gib für q eine Zahl ein, zum Beispiel −10." };
    if (q < Q_MIN - EPS || q > Q_MAX + EPS) return { ok: false, msg: "Wähle q zwischen −50 und 50." };
    return { ok: true };
  }

  // Eigene Werte für die Umrechnung: 2 bis 12 Zahlen
  function parseValues(text) {
    var r = LM.parseList(text);
    if (r.bad.length) return { ok: false, msg: "Das verstehe ich nicht: „" + r.bad.slice(0, 3).join("“, „") + "“. Trenne die Zahlen mit Leerzeichen oder Semikolon." };
    if (r.values.length < 2) return { ok: false, msg: "Gib mindestens 2 Zahlen ein." };
    if (r.values.length > 12) return { ok: false, msg: "Höchstens 12 Zahlen, damit alles lesbar bleibt." };
    for (var i = 0; i < r.values.length; i++) {
      if (Math.abs(r.values[i]) > 1000) return { ok: false, msg: "Bitte nur Zahlen zwischen −1000 und 1000." };
    }
    return { ok: true, values: r.values, msg: r.values.length + " Werte übernommen." };
  }

  // Alles zur Umrechnung: neue Werte, Mittel auf zwei Wegen (Formel und Probe), Median (Extra)
  function linInfo(xs, p, q) {
    var st = S(), ys = st.linear(xs, p, q);
    var xMean = st.mean(xs), yMean = st.mean(ys), yFormula = p * xMean + q;
    var xMed = st.median(xs), yMed = st.median(ys), yMedFormula = p * xMed + q;
    function tol(v) { return 1e-9 * Math.max(1, Math.abs(v)); }
    return {
      xs: xs, ys: ys, p: p, q: q, n: xs.length,
      xSum: st.sum(xs), ySum: st.sum(ys), xMean: xMean, yMean: yMean, yFormula: yFormula,
      meanOk: Math.abs(yMean - yFormula) <= tol(yFormula),
      xMed: xMed, yMed: yMed, yMedFormula: yMedFormula, medOk: Math.abs(yMed - yMedFormula) <= tol(yMedFormula),
      devs: st.meanInfo(xs).deviations, devSum: st.meanInfo(xs).deviationSum
    };
  }

  function pTimes(p) { return Math.abs(p - 1) < EPS ? "" : Math.abs(p + 1) < EPS ? "-" : texNum(p, 2) + " \\cdot "; }
  function qPlus(q) { return Math.abs(q) < EPS ? "" : q > 0 ? " + " + texNum(q, 2) : " - " + texNum(-q, 2); }

  // Die Regel als Formel, z. B. y_i = 1,8 · x_i + 32
  function ruleTex(preset, info) {
    if (preset === "center") {
      return "y_i = x_i - \\bar{x}" + (isRounded(info.xMean, 2) ? " \\approx " : " = ") + "x_i" + qPlus(-info.xMean);
    }
    return "y_i = " + pTimes(info.p) + "x_i" + qPlus(info.q);
  }

  // ȳ = p · x̄ + q mit Zahlen
  function meanTex(info) {
    var eq = (isRounded(info.xMean, 2) || isRounded(info.q, 2) || isRounded(info.p, 2) || isRounded(info.yFormula, 2)) ? " \\approx " : " = ";
    var qs = info.q >= 0 ? " + " + texNum(info.q, 2) : " - " + texNum(-info.q, 2);
    return "\\bar{y} = p \\cdot \\bar{x} + q = " + texPar(info.p, 2) + " \\cdot " + texPar(info.xMean, 2) + qs + eq + texNum(info.yFormula, 2);
  }

  // Probe: Mittel der umgerechneten Werte direkt ausgerechnet. Zwei Stücke, damit es auf dem Handy sauber umbricht.
  function probeTexParts(info) {
    var n = info.n, eq = (isRounded(info.yMean, 2) || info.ys.some(function (y) { return isRounded(y, 2); })) ? "\\approx" : "=";
    var top = n <= 6 ? info.ys.map(function (y) { return texPar(y, 2); }).join(" + ") : "y_1 + y_2 + \\dots + y_{" + n + "}";
    return [
      "\\dfrac{" + top + "}{" + n + "}",
      (n <= 6 ? eq : "=") + " \\dfrac{" + texNum(info.ySum, 2) + "}{" + n + "}" + (isRounded(info.yMean, 2) ? " \\approx " : " = ") + texNum(info.yMean, 2)
    ];
  }
  function probeTex(info) { return probeTexParts(info).join(" "); }

  // Achsenstriche für die Zahlengeraden: kleinste Schrittweite 1, 2 oder 5 · 10^k, bei der die Zahlen
  // mindestens minPx Pixel auseinanderliegen (keine 2,5er-Schritte, die wirken unruhig).
  function lineTicks(d0, d1, pxWidth, minPx) {
    var span = Math.abs(d1 - d0) || 1, step = span, k0 = Math.floor(Math.log10(span)) - 3;
    search:
    for (var k = k0; k <= k0 + 5; k++) {
      for (var i = 0; i < 3; i++) {
        var s = [1, 2, 5][i] * Math.pow(10, k);
        if (s / span * pxWidth >= minPx) { step = s; break search; }
      }
    }
    var out = [];
    for (var v = Math.ceil(Math.min(d0, d1) / step - EPS) * step; v <= Math.max(d0, d1) + EPS * step; v += step) out.push(+v.toPrecision(12));
    return out;
  }

  // Nulleigenschaft beim Zentrieren: (+6) + (−6) + (+3) + (−1) + (−2) = 0
  function zeroTex(info) {
    var terms = info.devs.map(function (d) {
      var s = texNum(d, 2);
      return "(" + (s !== "0" && s.charAt(0) !== "-" ? "+" : "") + s + ")";
    });
    if (terms.length > 8) terms = terms.slice(0, 7).concat(["\\dots"]);
    return terms.join(" + ") + " = 0";
  }

  // Achsenbereich für beide Zahlengeraden (gemeinsame Skala, „schön“ gerundet)
  function niceDomain(vals) {
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi - lo < EPS) { lo -= 1; hi += 1; }
    var t = LM.svg.ticks(lo, hi, 6), step = t.length > 1 ? t[1] - t[0] : 1;
    return [Math.floor(lo / step + EPS) * step, Math.ceil(hi / step - EPS) * step];
  }
  // Alten Bereich behalten, solange alles hineinpasst und nicht zu sehr gestaucht ist (ruhiges Bild beim Ziehen)
  function keepDomain(dom, vals) {
    if (!dom) return false;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    return lo >= dom[0] - EPS && hi <= dom[1] + EPS && (hi - lo) >= 0.35 * (dom[1] - dom[0]);
  }

  /* ---------- Beschriftungen ohne Überlappung ---------- */

  // Etiketten in einer Zeile: Wunschmitte x und Breite w. Schiebt sie auseinander und hält sie in [minX, maxX].
  function placeRow(items, minX, maxX, gap) {
    gap = gap === undefined ? 4 : gap;
    var idx = items.map(function (it, i) { return i; }).sort(function (i, j) { return items[i].x - items[j].x; });
    var pos = items.map(function (it) { return Math.min(Math.max(it.x, minX + it.w / 2), maxX - it.w / 2); });
    var k, a, b;
    for (k = 1; k < idx.length; k++) {
      a = idx[k - 1]; b = idx[k];
      var need = pos[a] + items[a].w / 2 + gap + items[b].w / 2;
      if (pos[b] < need) pos[b] = need;
    }
    if (idx.length) {
      var last = idx[idx.length - 1];
      pos[last] = Math.min(pos[last], maxX - items[last].w / 2);
    }
    for (k = idx.length - 2; k >= 0; k--) {
      a = idx[k]; b = idx[k + 1];
      var lim = pos[b] - items[b].w / 2 - gap - items[a].w / 2;
      if (pos[a] > lim) pos[a] = lim;
    }
    return pos;
  }

  // Mitte für eine Beschriftung der Breite w nahe x, so dass keine der senkrechten Linien (x-Werte in lines)
  // durch sie läuft (mit Abstand gap) und sie zwischen minX und maxX bleibt. Geht das nicht, bleibt sie bei x.
  function avoidLines(x, w, lines, minX, maxX, gap) {
    gap = gap === undefined ? 4 : gap;
    var lo = minX + w / 2, hi = maxX - w / 2, half = w / 2 + gap;
    var start = Math.min(Math.max(x, lo), hi);
    function free(c) {
      if (c < lo - 1e-6 || c > hi + 1e-6) return false;
      return lines.every(function (L) { return L <= c - half + 1e-6 || L >= c + half - 1e-6; });
    }
    var cands = [start];
    lines.forEach(function (L) { cands.push(L - half, L + half); });
    var best = null;
    cands.forEach(function (c) {
      if (free(c) && (best === null || Math.abs(c - x) < Math.abs(best - x) - 1e-9)) best = c;
    });
    return best === null ? start : best;
  }

  // geschätzte Textbreite in px (Bricolage/Atkinson, fett)
  function textW(str, px) { return String(str).length * (px || 12) * 0.6 + 2; }

  var core = {
    TEMPS: TEMPS, RT_A8: RT_A8, GEWICHT: GEWICHT, STOPS: STOPS, SHAPE_MAX: SHAPE_MAX,
    texNum: texNum, texPar: texPar, isRounded: isRounded, range: range,
    betaWeights: betaWeights, apportion: apportion, apportionSym: apportionSym,
    shapeCounts: shapeCounts, stepName: stepName, clampStep: clampStep, examCounts: examCounts,
    classBins: classBins, valueBins: valueBins, binIndex: binIndex, niceCountMax: niceCountMax, countTicks: countTicks,
    buildSet: buildSet, formYMax: FORM_YMAX,
    analyse: analyse, orderOf: orderOf, orderMatchesSlide: orderMatchesSlide, DIFF_WORDS: DIFF_WORDS, G_WORDS: G_WORDS,
    diffTex: diffTex, gTexParts: gTexParts, peakIndex: peakIndex, verdictOf: verdictOf, tailText: tailText, joinDe: joinDe, timesDe: timesDe,
    checkP: checkP, checkQ: checkQ, parseValues: parseValues, linInfo: linInfo,
    ruleTex: ruleTex, meanTex: meanTex, probeTex: probeTex, probeTexParts: probeTexParts, zeroTex: zeroTex, lineTicks: lineTicks,
    niceDomain: niceDomain, keepDomain: keepDomain, placeRow: placeRow, avoidLines: avoidLines, textW: textW
  };
  LM._shape = core;
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined" || typeof LM.widget !== "function") return;

  /* =====================================================================
     Gemeinsame UI-Helfer
     ===================================================================== */

  var E = function (tag, attrs, parent) { return LM.svg.el(tag, attrs, parent); };
  var uid = 0;
  function nextId(p) { uid += 1; return "sh-" + p + "-" + uid; }

  // Segment-Knöpfe (.seg) mit aria-pressed
  function segGroup(label, options, onPick) {
    var btns = {};
    var el = LM.h("div", { class: "seg", attrs: { role: "group", "aria-label": label } });
    options.forEach(function (o) {
      var b = LM.h("button", { text: o.text, attrs: { type: "button", "aria-pressed": "false", "data-id": o.id }, on: { click: function () { onPick(o.id); } } });
      btns[o.id] = b;
      el.appendChild(b);
    });
    return {
      el: el, btns: btns,
      set: function (id) { Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", String(k === String(id))); }); }
    };
  }

  // Kurze Animation mit requestAnimationFrame; endet von selbst. Bei „weniger Bewegung“ sofort fertig.
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function animate(ms, frame, done) {
    var stopped = false;
    if (LM.reduceMotion || typeof window.requestAnimationFrame !== "function") {
      frame(1);
      if (done) done();
      return { stop: function () {} };
    }
    var t0 = null;
    function tick(t) {
      if (stopped) return;
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      frame(easeInOut(k));
      if (k < 1) window.requestAnimationFrame(tick);
      else if (done) done();
    }
    window.requestAnimationFrame(tick);
    return { stop: function () { stopped = true; } };
  }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function svgText(parent, x, y, str, cls, extra) {
    var attrs = { class: cls };
    if (extra) Object.keys(extra).forEach(function (k) { attrs[k] = extra[k]; });
    return LM.svg.text(parent, x, y, str, attrs);
  }

  /* =====================================================================
     lin-trans: lineare Transformation (Kapitel 6)
     ===================================================================== */

  LM.widget("lin-trans", function (el) {
    el.classList.add("widget", "sh-lt");
    el.innerHTML = "";

    var PRESETS = {
      f: { p: 1.8, q: 32 },
      center: { p: 1 },
      double: { p: 2, q: 0 }
    };
    var st = {
      data: "temp", xs: TEMPS.slice(), preset: "f", ownP: 1.8, ownQ: 32,
      info: null, domain: null, drawn: null, anim: null, hl: -1, chartW: 0, valid: true
    };

    /* ---- Kopf ---- */
    var head = LM.h("div", { class: "w-head" }, [
      LM.h("h3", { html: "Umrechnen: Das Mittel wandert mit <span class=\"w-badge\">Folien 133–136</span>" }),
      LM.h("p", { class: "w-sub", text: "Jeder Wert x wird nach derselben Regel zu y = p · x + q. Wähle eine Umrechnung und schau, wo das Mittel landet." })
    ]);

    /* ---- Daten ---- */
    var dataSeg = segGroup("Daten", [
      { id: "temp", text: "Höchsttemperaturen (Folie 129)" },
      { id: "own", text: "Eigene Werte" }
    ], pickData);
    var ownId = nextId("own");
    var ownInput = LM.h("input", {
      class: "text-input sh-own-input",
      attrs: { id: ownId, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", value: "16 4 13 9 8" },
      on: { input: onOwnInput }
    });
    var ownMsg = LM.h("p", { class: "sh-msg", attrs: { role: "status" } });
    var ownPanel = LM.h("div", { class: "sh-own", attrs: { hidden: "" } }, [
      LM.h("label", { class: "sh-lab", attrs: { for: ownId }, text: "Deine Werte (2 bis 12 Zahlen, mit Leerzeichen getrennt):" }),
      ownInput, ownMsg
    ]);

    /* ---- Umrechnung ---- */
    var presetSeg = segGroup("Umrechnung", [
      { id: "f", text: "°C → °F (p = 1,8, q = 32)" },
      { id: "center", text: "Zentrieren (p = 1, q = −x̄)" },
      { id: "double", text: "Verdoppeln (p = 2, q = 0)" },
      { id: "own", text: "Eigene" }
    ], pickPreset);

    function pqRow(name, min, max, step, hint) {
      var id = nextId(name);
      var input = LM.h("input", { class: "num-input sh-pq-input", attrs: { id: id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false" } });
      var slider = LM.h("input", { class: "slider sh-pq-slider", attrs: { type: "range", min: min, max: max, step: step, "aria-label": name + " mit dem Regler einstellen (" + hint + ")" } });
      var row = LM.h("div", { class: "sh-pq-row" }, [
        LM.h("label", { class: "sh-pq-name", attrs: { for: id }, html: "<i>" + name + "</i> =" }),
        input, slider
      ]);
      return { row: row, input: input, slider: slider };
    }
    var pRow = pqRow("p", P_MIN, P_MAX, 0.1, "von −3 bis 3, nicht 0");
    var qRow = pqRow("q", Q_MIN, Q_MAX, 1, "von −50 bis 50");
    var pqMsg = LM.h("p", { class: "sh-msg", attrs: { role: "status" } });
    var pqPanel = LM.h("div", { class: "sh-pq", attrs: { hidden: "" } }, [
      LM.h("p", { class: "sh-pq-help", text: "Stell p (Streckung) und q (Verschiebung) selbst ein:" }),
      pRow.row, qRow.row, pqMsg
    ]);

    var controls = LM.h("div", { class: "sh-ctl" }, [
      LM.h("div", { class: "sh-ctl-row" }, [LM.h("span", { class: "sh-ctl-label", text: "Daten" }), dataSeg.el]),
      ownPanel,
      LM.h("div", { class: "sh-ctl-row" }, [LM.h("span", { class: "sh-ctl-label", text: "Umrechnung" }), presetSeg.el]),
      pqPanel
    ]);

    /* ---- Regel, Bild, Tabelle ---- */
    var rule = LM.h("div", { class: "sh-rule" });
    var chart = LM.h("div", { class: "chart sh-lt-chart", attrs: { role: "img" } });
    var svg = E("svg", { class: "sh-svg", focusable: "false", "aria-hidden": "true" }, chart);
    var cap = LM.h("p", { class: "sh-cap", html: "Jede graue Linie führt von einem Wert <i>x</i> zu seinem neuen Wert <i>y</i>. " +
      "Die <span class=\"t-mean\"><strong>rote gestrichelte Linie</strong></span> zeigt, wohin das Mittel wandert." });
    var tableWrap = LM.h("div", { class: "table-wrap sh-lt-tablewrap" });

    /* ---- Ergebnisse ---- */
    var formulaBox = LM.h("div", { class: "sh-res" });
    var probeBox = LM.h("div", { class: "sh-res" });
    var whyBox = LM.h("p", { class: "sh-why", text: "Warum klappt das? Das Mittel ist der Schwerpunkt der Werte. Strecken (mal p) und Verschieben (plus q) machen mit dem Schwerpunkt genau dasselbe wie mit jedem einzelnen Wert." });
    var zeroBox = LM.h("div", { class: "sh-zero", attrs: { hidden: "" } });
    var out = LM.h("div", { class: "w-out sh-lt-out" }, [formulaBox, probeBox, zeroBox, whyBox]);
    var sr = LM.h("p", { class: "sh-sr", attrs: { role: "status", "aria-live": "polite" } });

    var figure = LM.h("div", { class: "sh-figure" }, [chart, cap]);
    [head, controls, rule, figure, tableWrap, out, sr].forEach(function (c) { el.appendChild(c); });

    /* ---- Hervorheben eines Wertes (Tabelle oder Punkt) ---- */
    function setHl(i) {
      if (st.hl === i) return;
      st.hl = i;
      el.querySelectorAll("[data-i]").forEach(function (n) {
        var on = Number(n.getAttribute("data-i")) === i;
        if (n.classList) n.classList.toggle("is-hl", on);
        else n.setAttribute("class", (n.getAttribute("class") || "").replace(/\s?is-hl/g, "") + (on ? " is-hl" : ""));
      });
    }
    tableWrap.addEventListener("pointerover", function (e) {
      var c = e.target.closest ? e.target.closest("[data-i]") : null;
      if (c) setHl(Number(c.getAttribute("data-i")));
    });
    tableWrap.addEventListener("pointerleave", function () { setHl(-1); });
    chart.addEventListener("pointerover", function (e) {
      var c = e.target.closest ? e.target.closest("[data-i]") : null;
      setHl(c ? Number(c.getAttribute("data-i")) : -1);
    });
    chart.addEventListener("pointerleave", function () { setHl(-1); });

    /* ---- Zahlengeraden zeichnen ---- */
    // Einheiten: °C → °F setzt Celsius voraus; sonst nur bei den Temperaturen eine Einheit
    function units() {
      var temp = st.data === "temp";
      if (st.preset === "f") return { x: "°C", y: "°F" };
      return { x: temp ? "°C" : "", y: temp && st.preset === "center" ? "°C" : "" };
    }

    function draw(fr) {
      var W = st.chartW;
      if (!W || !fr) return;
      var gut = 44, x0 = gut + 12, x1 = W - 14;
      var yT = 44, yB = yT + (W >= 560 ? 108 : 88), H = yB + 44, u = units();
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      var sx = LM.svg.scale(fr.d0, fr.d1, x0, x1);
      var xs = st.xs, ys = S().linear(xs, fr.p, fr.q);
      var xm = S().mean(xs), ym = S().mean(ys);

      // Namen der Geraden links
      var mid = { "text-anchor": "middle" };
      svgText(svg, 20, yT + 6, "x", "sh-var", mid);
      if (u.x) svgText(svg, 20, yT + 23, u.x, "sh-unit", mid);
      svgText(svg, 20, yB + 6, "y", "sh-var", mid);
      if (u.y) svgText(svg, 20, yB + 23, u.y, "sh-unit", mid);

      // Geraden
      E("line", { x1: x0 - 10, x2: x1 + 10, y1: yT, y2: yT, class: "sh-line" }, svg);
      E("line", { x1: x0 - 10, x2: x1 + 10, y1: yB, y2: yB, class: "sh-line" }, svg);

      // Mittel-Etiketten (Pillen) zuerst planen, damit Striche darunter ausgeblendet werden können
      function pill(cx, line, text) {
        var w = textW(text, 13) + 14;
        var c = Math.min(Math.max(cx, w / 2 + 2), W - w / 2 - 2);
        return { c: c, w: w, text: text, line: line };
      }
      var topTxt = "x̄ = " + fmt(xm, 2) + (u.x ? " " + u.x : "");
      var botTxt = "ȳ = " + fmt(ym, 2) + (u.y ? " " + u.y : "");
      var pTop = pill(sx(xm), "top", topTxt), pBot = pill(sx(ym), "bot", botTxt);

      // Striche und Zahlen (gleiche Skala oben und unten)
      var ticks = lineTicks(fr.d0, fr.d1, x1 - x0, 64);
      ticks.forEach(function (t) {
        var x = sx(t);
        if (x < x0 - 12 || x > x1 + 12) return;
        var label = fmt(t, 2), w = textW(label, 12);
        var zero = Math.abs(t) < EPS && st.preset === "center";
        E("line", { x1: x, x2: x, y1: yT - 5, y2: yT, class: "sh-tickmark" }, svg);
        E("line", { x1: x, x2: x, y1: yB, y2: yB + 5, class: "sh-tickmark" + (zero ? " sh-tick-zero" : "") }, svg);
        if (Math.abs(x - pTop.c) > (w + pTop.w) / 2 + 3) svgText(svg, x, 20, label, "tick", { "text-anchor": "middle" });
        if (Math.abs(x - pBot.c) > (w + pBot.w) / 2 + 3) svgText(svg, x, yB + 29, label, "tick" + (zero ? " sh-tick-zerolbl" : ""), { "text-anchor": "middle" });
      });

      // Verbindungen: jeder Wert zu seinem Bild
      xs.forEach(function (x, i) {
        E("line", { x1: sx(x), y1: yT, x2: sx(ys[i]), y2: yB, class: "sh-conn" + (st.hl === i ? " is-hl" : ""), "data-i": i }, svg);
      });
      // Verbindung des Mittels (hervorgehoben)
      E("line", { x1: sx(xm), y1: yT, x2: sx(ym), y2: yB, class: "sh-conn-mean" }, svg);

      // Punkte
      xs.forEach(function (x, i) {
        E("circle", { cx: sx(x), cy: yT, r: 6, class: "dot sh-dot" + (st.hl === i ? " is-hl" : ""), "data-i": i }, svg);
        E("circle", { cx: sx(ys[i]), cy: yB, r: 6, class: "dot sh-dot" + (st.hl === i ? " is-hl" : ""), "data-i": i }, svg);
      });

      // Dreiecke des Mittels: oben ▼ auf die x-Gerade, unten ▲ auf die y-Gerade
      var cxT = sx(xm), cxB = sx(ym);
      E("path", { d: "M" + (cxT - 6.5) + "," + (yT - 13) + "H" + (cxT + 6.5) + "L" + cxT + "," + (yT - 1.5) + "Z", class: "mk-mean sh-tri" }, svg);
      E("path", { d: "M" + (cxB - 6.5) + "," + (yB + 13) + "H" + (cxB + 6.5) + "L" + cxB + "," + (yB + 1.5) + "Z", class: "mk-mean sh-tri" }, svg);

      // Pillen mit x̄ und ȳ
      [[pTop, 6], [pBot, yB + 15]].forEach(function (pp) {
        var p = pp[0], y = pp[1];
        var g = E("g", { class: "sh-pill" + (p.line === "bot" && st.preset === "center" ? " sh-pill-zero" : "") }, svg);
        E("rect", { x: p.c - p.w / 2, y: y, width: p.w, height: 20, rx: 10, class: "sh-pill-bg" }, g);
        svgText(g, p.c, y + 14.5, p.text, "sh-pill-txt", { "text-anchor": "middle" });
      });
    }

    function onResize(w) { st.chartW = w; draw(st.drawn); }

    /* ---- Texte ---- */
    function renderTexts(info) {
      var u = units();
      rule.innerHTML = '<span class="sh-rule-k">Regel</span> ' + LM.tex(ruleTex(st.preset, info));

      formulaBox.innerHTML = '<span class="sh-res-k">Mit der Formel (Folie 134)</span><span class="sh-math">' + LM.tex(meanTex(info)) + "</span>";
      var pp = probeTexParts(info);
      probeBox.innerHTML = '<span class="sh-res-k">Probe: Mittel der umgerechneten Werte</span><span class="sh-math sh-wrap">' +
        '<span class="sh-gpart">' + LM.tex("\\bar{y} = " + pp[0]) + '</span><span class="sh-gpart">' + LM.tex(pp[1]) + "</span></span>" +
        (info.meanOk ? '<span class="sh-check">✓ Beide Wege ergeben dasselbe.</span>' : '<span class="sh-check is-bad">Die Probe passt nicht.</span>');

      if (st.preset === "center") {
        zeroBox.hidden = false;
        zeroBox.innerHTML = '<p class="sh-zero-title">' + LM.tex("\\bar{y} = 0") + " ist die Nulleigenschaft (Folie 114)</p>" +
          "<p>Beim Zentrieren ist jedes <span class=\"m\">y<sub>i</sub> = x<sub>i</sub> − x̄</span> der Abstand zum Mittel. Diese Abstände heben sich immer auf:</p>" +
          '<p class="sh-math">' + LM.tex(zeroTex(info)) + "</p>" +
          "<p>Darum ist das neue Mittel " + LM.tex("0 \\div " + info.n + " = 0") + ". Das Mittel sitzt nach dem Zentrieren genau auf der Null.</p>";
      } else {
        zeroBox.hidden = true;
        zeroBox.innerHTML = "";
      }

      renderTable(info, u);
      chart.setAttribute("aria-label", "Zwei Zahlengeraden. Oben die x-Werte " + info.xs.map(function (v) { return fmt(v, 2); }).join(", ") +
        ", unten die umgerechneten y-Werte " + info.ys.map(function (v) { return fmt(v, 2); }).join(", ") +
        ". Das Mittel " + fmt(info.xMean, 2) + " wird zu " + fmt(info.yMean, 2) + ".");
      sr.textContent = "Neues Mittel: " + fmt(info.yFormula, 2) + (u.y ? " " + u.y : "") + ". " + (info.meanOk ? "Die Probe stimmt." : "");
    }

    function renderTable(info, u) {
      var h = '<table class="t sh-lt-table"><thead><tr><th scope="col"><span class="sh-sr">Zeile</span></th>';
      info.xs.forEach(function (x, i) { h += '<th scope="col" class="num" data-i="' + i + '"><i>i</i> = ' + (i + 1) + "</th>"; });
      h += '<th scope="col" class="num">Summe</th><th scope="col" class="num sh-col-mean">Mittel</th></tr></thead><tbody>';
      function row(name, unit, vals, sum, mean) {
        var r = '<tr><th scope="row"><i>' + name + "</i><sub>i</sub>" + (unit ? ' <span class="sh-th-unit">(' + unit + ")</span>" : "") + "</th>";
        vals.forEach(function (v, i) { r += '<td class="num" data-i="' + i + '">' + fmt(v, 2) + "</td>"; });
        return r + '<td class="num">' + fmt(sum, 2) + '</td><td class="num sh-col-mean">' + fmt(mean, 2) + "</td></tr>";
      }
      h += row("x", u.x, info.xs, info.xSum, info.xMean) + row("y", u.y, info.ys, info.ySum, info.yMean) + "</tbody></table>";
      tableWrap.innerHTML = h;
      if (st.hl >= 0) { var keep = st.hl; st.hl = -1; setHl(keep); }
    }

    /* ---- Zustand → Anzeige ---- */
    function targetPQ() {
      if (st.preset === "own") return { p: st.ownP, q: st.ownQ };
      if (st.preset === "center") return { p: 1, q: -S().mean(st.xs) };
      return { p: PRESETS[st.preset].p, q: PRESETS[st.preset].q };
    }

    function update(opts) {
      opts = opts || {};
      var pq = targetPQ();
      var cp = checkP(pq.p), cq = checkQ(pq.q);
      if (st.preset === "own") {
        pqMsg.textContent = !cp.ok ? cp.msg : (!cq.ok ? cq.msg : "");
        pqMsg.className = "sh-msg" + (!cp.ok || !cq.ok ? " is-miss" : "");
        pRow.input.classList.toggle("is-miss", !cp.ok);
        qRow.input.classList.toggle("is-miss", !cq.ok);
      }
      if (!cp.ok || !cq.ok) {
        st.valid = false;
        el.classList.add("sh-stale");
        return;
      }
      st.valid = true;
      el.classList.remove("sh-stale");
      var info = linInfo(st.xs, pq.p, pq.q);
      st.info = info;
      renderTexts(info);

      var all = info.xs.concat(info.ys);
      if (!keepDomain(st.domain, all)) st.domain = niceDomain(all);
      var target = { p: pq.p, q: pq.q, d0: st.domain[0], d1: st.domain[1] };
      if (st.anim) { st.anim.stop(); st.anim = null; }
      var from = st.drawn;
      if (!from || !opts.animate || opts.dataChanged) {
        st.drawn = target;
        draw(target);
        return;
      }
      st.anim = animate(480, function (k) {
        st.drawn = { p: lerp(from.p, target.p, k), q: lerp(from.q, target.q, k), d0: lerp(from.d0, target.d0, k), d1: lerp(from.d1, target.d1, k) };
        draw(st.drawn);
      }, function () { st.anim = null; st.drawn = target; });
    }

    function syncPQInputs() {
      pRow.input.value = fmt(st.ownP, 2);
      qRow.input.value = fmt(st.ownQ, 2);
      pRow.slider.value = String(st.ownP);
      qRow.slider.value = String(st.ownQ);
      pRow.input.classList.remove("is-miss");
      qRow.input.classList.remove("is-miss");
      pqMsg.textContent = "";
      pqMsg.className = "sh-msg";
    }

    function pickPreset(id) {
      if (id === "own" && st.preset !== "own") {
        // die eigene Umrechnung startet bei der gerade gezeigten
        var pq = st.valid && st.info ? { p: st.info.p, q: st.info.q } : { p: st.ownP, q: st.ownQ };
        st.ownP = Math.round(pq.p * 100) / 100;
        st.ownQ = Math.round(pq.q * 100) / 100;
        syncPQInputs();
      }
      st.preset = id;
      presetSeg.set(id);
      pqPanel.hidden = id !== "own";
      update({ animate: true });
    }

    function pickData(id) {
      st.data = id;
      dataSeg.set(id);
      ownPanel.hidden = id !== "own";
      if (id === "temp") {
        st.xs = TEMPS.slice();
        ownMsg.textContent = "";
        update({ dataChanged: true });
      } else {
        onOwnInput();
        ownInput.focus();
      }
    }

    function onOwnInput() {
      var r = parseValues(ownInput.value);
      ownMsg.textContent = r.msg;
      ownMsg.className = "sh-msg" + (r.ok ? "" : " is-miss");
      ownInput.classList.toggle("is-miss", !r.ok);
      if (!r.ok) return;
      st.xs = r.values;
      update({ dataChanged: true });
    }

    function onPInput(fromSlider) {
      var v = fromSlider ? Number(pRow.slider.value) : LM.parseNum(pRow.input.value);
      if (fromSlider) { v = Math.round(v * 10) / 10; pRow.input.value = fmt(v, 2); }
      else if (isFinite(v)) pRow.slider.value = String(v);
      st.ownP = v;
      update();
    }
    function onQInput(fromSlider) {
      var v = fromSlider ? Number(qRow.slider.value) : LM.parseNum(qRow.input.value);
      if (fromSlider) qRow.input.value = fmt(v, 2);
      else if (isFinite(v)) qRow.slider.value = String(v);
      st.ownQ = v;
      update();
    }
    pRow.slider.addEventListener("input", function () { onPInput(true); });
    qRow.slider.addEventListener("input", function () { onQInput(true); });
    pRow.input.addEventListener("input", function () { onPInput(false); });
    qRow.input.addEventListener("input", function () { onQInput(false); });
    [pRow.input, qRow.input].forEach(function (inp) {
      inp.addEventListener("change", function () {
        var v = LM.parseNum(inp.value);
        if (isFinite(v)) inp.value = fmt(v, 2);
      });
    });

    dataSeg.set("temp");
    presetSeg.set("f");
    syncPQInputs();
    update();
    LM.svg.responsive(chart, onResize);
  });

  /* =====================================================================
     skew-shaper: Schiefe zum Anfassen (Kapitel 9)
     ===================================================================== */

  LM.widget("skew-shaper", function (el) {
    el.classList.add("widget", "sh-sk");
    el.innerHTML = "";

    var st = { set: "form", step: 2, width: 1, data: null, an: null, drawn: null, anim: null, chartW: 0 };

    var head = LM.h("div", { class: "w-head" }, [
      LM.h("h3", { html: "Schiefe zum Anfassen <span class=\"w-badge\">Folien 140–142</span>" }),
      LM.h("p", { class: "w-sub", text: "Verbiege die Verteilung und beobachte, wie Modus, Median und Mittel auseinanderlaufen. Oder schau dir echte Daten an." })
    ]);

    var setSeg = segGroup("Datensatz", [
      { id: "form", text: "Selbst formen" },
      { id: "rt", text: "Reaktionszeiten (Aufgabe 8)" },
      { id: "exam", text: "Leichte Klausur" },
      { id: "weight", text: "Körpergewicht (Folie 148)" },
      { id: "f146", text: "Folie 146: 16, 4, 13, 9, 8" }
    ], pickSet);

    /* ---- Regler „Form“ ---- */
    var sliderId = nextId("form");
    var formName = LM.h("strong", { class: "sh-form-name" });
    var slider = LM.h("input", {
      class: "slider sh-form-slider",
      attrs: { id: sliderId, type: "range", min: -SHAPE_MAX, max: SHAPE_MAX, step: 1, value: st.step }
    });
    var leftBtn = LM.h("button", {
      class: "btn btn-sm sh-step", html: "<span aria-hidden=\"true\">◀</span>",
      attrs: { type: "button", "aria-label": "Eine Stufe Richtung linksschief" },
      on: { click: function () { setStep(st.step - 1); } }
    });
    var rightBtn = LM.h("button", {
      class: "btn btn-sm sh-step", html: "<span aria-hidden=\"true\">▶</span>",
      attrs: { type: "button", "aria-label": "Eine Stufe Richtung rechtsschief" },
      on: { click: function () { setStep(st.step + 1); } }
    });
    var jumps = LM.h("div", { class: "sh-jumps" }, [
      [-SHAPE_MAX, "linksschief"], [0, "symmetrisch"], [SHAPE_MAX, "rechtsschief"]
    ].map(function (j) {
      return LM.h("button", {
        class: "btn btn-sm btn-ghost sh-jump", text: j[1],
        attrs: { type: "button", "aria-label": "Form: " + stepName(j[0]) },
        on: { click: function () { setStep(j[0]); } }
      });
    }));
    var formPanel = LM.h("div", { class: "sh-form" }, [
      LM.h("div", { class: "sh-form-top" }, [LM.h("label", { attrs: { for: sliderId }, text: "Form:" }), formName]),
      LM.h("div", { class: "sh-form-row" }, [leftBtn, slider, rightBtn]),
      jumps
    ]);
    slider.addEventListener("input", function () { setStep(Number(slider.value)); });

    /* ---- Klassenbreite beim Körpergewicht ---- */
    var widthSeg = segGroup("Klassenbreite", [
      { id: "1", text: "1 kg (wie Folie 149)" },
      { id: "3", text: "3 kg (wie Aufgabe 11)" }
    ], function (id) { st.width = Number(id); widthSeg.set(id); load(false); });
    var widthPanel = LM.h("div", { class: "sh-ctl-row sh-width", attrs: { hidden: "" } }, [
      LM.h("span", { class: "sh-ctl-label", text: "Klassenbreite" }), widthSeg.el
    ]);

    var note = LM.h("p", { class: "sh-note" });
    var chart = LM.h("div", { class: "chart sh-sk-chart", attrs: { role: "img" } });
    var svg = E("svg", { class: "sh-svg", focusable: "false", "aria-hidden": "true" }, chart);

    /* ---- Kacheln ---- */
    function tile(cls, label, withSub) {
      var val = LM.h("span", { class: "stat-value" }), sub = withSub ? LM.h("span", { class: "sh-stat-sub" }) : null;
      var t = LM.h("div", { class: "stat " + cls }, [LM.h("span", { class: "stat-label", text: label }), val, sub]);
      return { el: t, val: val, sub: sub };
    }
    function setVal(t, v, unit) {
      t.val.innerHTML = LM.esc(v) + (unit ? ' <span class="sh-unit-s">' + LM.esc(unit.trim()) + "</span>" : "");
    }
    var tMod = tile("s-mod", "Modus", true), tMed = tile("s-med", "Median"), tMean = tile("s-mean", "Mittel");
    var tiles = LM.h("div", { class: "stats-row sh-tiles" }, [tMod.el, tMed.el, tMean.el]);

    var verdict = LM.h("div", { class: "sh-verdict" });
    var facts = LM.h("dl", { class: "sh-facts" });
    var tail = LM.h("p", { class: "sh-tail" });
    var sr = LM.h("p", { class: "sh-sr", attrs: { role: "status", "aria-live": "polite" } });
    var outBox = LM.h("div", { class: "w-out sh-sk-out" }, [tiles, verdict, facts, tail]);

    [head, setSeg.el, formPanel, widthPanel, note, chart, outBox, sr].forEach(function (c) { el.appendChild(c); });

    /* ---- Histogramm ---- */
    var NOTES = {
      form: "100 ausgedachte Werte von 1 bis 15. Zieh am Regler und verbiege die Form.",
      rt: "60 Reaktionszeiten in ms aus Aufgabe 8, gezeichnet in Klassen zu je 50 ms. Modus, Median und Mittel kommen aus der Urliste, nicht aus den Klassen.",
      exam: "100 ausgedachte Ergebnisse einer sehr leichten Klausur (0 bis 20 Punkte). Die meisten haben viele Punkte, ein paar wenige fallen weit zurück.",
      // mit Formeln, darum erst beim Anzeigen gesetzt (hält das Laden der Seite schlank)
      weight: function () {
        return "100 Körpergewichte in kg von Folie 148. R rechnet auf Folie 150 genau die Werte unten aus: " +
          LM.tex("\\bar{x} - \\tilde{x} = 0{,}053") + " und " + LM.tex("g_{0{,}25} = 0{,}128") + ". " +
          "Übrigens: Der Momentkoeffizient auf Folie 151 ist sogar leicht negativ (−0,238). Bei fast symmetrischen Daten sind sich die Maße nicht immer einig.";
      },
      f146: "Die fünf Höchsttemperaturen in °C von Folie 146. Jeder Wert kommt nur einmal vor. Mit so wenigen Werten sieht man die Schiefe kaum, aber die Rechnung klappt."
    };

    // Darstellung als Zahlen, die sich animieren lassen
    function frameOf(data, an) {
      return { counts: data.bins.map(function (b) { return b.h; }), med: an.median, mean: an.mean, q1: an.q1, q3: an.q3 };
    }

    function draw(fr) {
      var W = st.chartW, data = st.data, an = st.an;
      if (!W || !fr || !data) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var narrow = W < 480;
      var padL = 40, padR = 12;
      var rowMean = 14, rowMed = 31, rowMod = 48, plotTop = 58, plotH = narrow ? 138 : 168, plotB = plotTop + plotH;
      var H = plotB + 112;
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      var sx = LM.svg.scale(data.domain[0], data.domain[1], padL + 4, W - padR);
      var sy = function (v) { return plotB - v / data.yMax * plotH; };

      // Zählachse
      countTicks(data.yMax).forEach(function (t) {
        E("line", { x1: padL, x2: W - padR, y1: sy(t), y2: sy(t), class: "gridline" }, svg);
        svgText(svg, padL - 7, sy(t) + 4, fmt(t, 0), "tick", { "text-anchor": "end" });
      });
      svgText(svg, 11, plotTop + plotH / 2, "Anzahl", "axis-label", { "text-anchor": "middle", transform: "rotate(-90 11 " + (plotTop + plotH / 2) + ")" });

      // Balken
      var pk = peakIndex(data, an), modeIdx = an.mode !== null ? pk : -1, peakIdx = an.mode === null ? pk : -1;
      data.bins.forEach(function (b, j) {
        var h = fr.counts[j];
        if (!(h > 0.01)) return;
        var gap = data.kind === "classes" ? 1 : 0;
        var xa = sx(b.lo) + gap / 2, xb = sx(b.hi) - gap / 2;
        E("rect", { x: xa, y: sy(h), width: Math.max(1, xb - xa), height: plotB - sy(h), rx: data.kind === "values" ? 2 : 0, class: "bar" + (j === modeIdx ? " is-mod" : "") }, svg);
      });

      // Wertachse
      E("line", { x1: padL, x2: W - padR, y1: plotB, y2: plotB, class: "ax" }, svg);
      var plotW = W - padR - padL;
      var xt;
      if (data.kind === "values") {
        var span = data.values[data.values.length - 1] - data.values[0], maxN = Math.max(3, Math.floor(plotW / 26));
        var stp = [1, 2, 5, 10].filter(function (s) { return span / s + 1 <= maxN; })[0] || 10;
        xt = data.values.filter(function (v) { return v % stp === 0; });
      } else {
        xt = LM.svg.ticks(data.domain[0], data.domain[1], Math.max(3, Math.floor(plotW / 60)));
      }
      xt.forEach(function (t) {
        var x = sx(t);
        E("line", { x1: x, x2: x, y1: plotB, y2: plotB + 4, class: "ax" }, svg);
        svgText(svg, x, plotB + 27, fmt(t, 2), "tick", { "text-anchor": "middle" });
      });
      svgText(svg, W - padR, plotB + 44, data.xTitle, "axis-label", { "text-anchor": "end" });

      // Marken: Median (durchgezogen), Mittel (gestrichelt + Dreieck)
      var xMed = sx(fr.med), xMean = sx(fr.mean);
      E("line", { x1: xMed, x2: xMed, y1: plotB, y2: rowMed + 5, class: "mk-med sh-med-line" }, svg);
      E("line", { x1: xMean, x2: xMean, y1: plotB, y2: rowMean + 5, class: "mk-mean sh-mean-line" }, svg);
      E("path", { d: "M" + (xMean - 6.5) + "," + (plotB + 13) + "H" + (xMean + 6.5) + "L" + xMean + "," + (plotB + 1.5) + "Z", class: "mk-mean sh-tri" }, svg);

      // Beschriftungen in drei Zeilen (gestaffelt), mit Rand in Hintergrundfarbe. Die Mittel-Linie reicht bis in die
      // oberste Zeile, die Median-Linie bis in die zweite. Darunter weicht jede Beschriftung den Linien seitlich aus.
      function label(x, y, text, cls, lines) {
        var t = svgText(svg, x, y, text, "lbl sh-halo " + cls, { "text-anchor": "middle" });
        var real = 0;
        try { real = t.getComputedTextLength(); } catch (e) { /* noch nicht sichtbar */ }
        var w = real > 0 ? real + 4 : textW(text, 12.5);   // +4: Rand (Halo)
        t.setAttribute("x", avoidLines(x, w, lines, 2, W - 2, 4).toFixed(1));
        return t;
      }
      label(xMean, rowMean, "Mittel " + fmt(an.mean), "lbl-mean", []);
      label(xMed, rowMed, "Median " + fmt(an.median), "lbl-med", [xMean]);
      if (modeIdx >= 0) {
        var mb = data.bins[modeIdx];
        label(sx(mb.mid), rowMod, "Modus " + fmt(an.mode), "lbl-mod", [xMed, xMean]);
      } else if (peakIdx >= 0) {
        var pb = data.bins[peakIdx];
        label(sx(pb.mid), rowMod, "Gipfel", "sh-peak-lbl", [xMed, xMean]);
      }

      // Box von Q1 bis Q3 mit den beiden Hälften (Quartilskoeffizient)
      var bTop = plotB + 68, bH = 16, xq1 = sx(fr.q1), xq3 = sx(fr.q3);
      E("rect", { x: xq1, y: bTop, width: Math.max(1, xq3 - xq1), height: bH, rx: 3, class: "box-q sh-box" }, svg);
      E("line", { x1: xMed, x2: xMed, y1: bTop - 3, y2: bTop + bH + 3, class: "mk-med sh-box-med" }, svg);
      if (isFinite(an.skew.gp)) {
        // Längen der beiden Boxhälften; mit Namen, wenn Platz ist, sonst nur die Zahlen
        var halves = function (lt, rt) {
          var lw = textW(lt, 12), rw = textW(rt, 12);
          var lc = Math.max(Math.min((xq1 + xMed) / 2, xMed - 6 - lw / 2), lw / 2 + 2);
          var rc = Math.min(Math.max((xMed + xq3) / 2, xMed + 6 + rw / 2), W - rw / 2 - 2);
          return { lt: lt, rt: rt, lc: lc, rc: rc, fits: lc + lw / 2 <= xMed - 4 && rc - rw / 2 >= xMed + 4 };
        };
        var hv = halves("x̃ − Q₁ = " + fmt(an.skew.lower), "Q₃ − x̃ = " + fmt(an.skew.upper));
        if (!hv.fits) hv = halves(fmt(an.skew.lower), fmt(an.skew.upper));
        svgText(svg, hv.lc, bTop - 7, hv.lt, "lbl lbl-q sh-halo", { "text-anchor": "middle" });
        svgText(svg, hv.rc, bTop - 7, hv.rt, "lbl lbl-q sh-halo", { "text-anchor": "middle" });
      }
      var q1t = "Q₁ = " + fmt(an.q1), q3t = "Q₃ = " + fmt(an.q3);
      var qp = placeRow([{ x: xq1, w: textW(q1t, 12) }, { x: xq3, w: textW(q3t, 12) }], 2, W - 2, 8);
      svgText(svg, qp[0], bTop + bH + 17, q1t, "lbl lbl-q", { "text-anchor": "middle" });
      svgText(svg, qp[1], bTop + bH + 17, q3t, "lbl lbl-q", { "text-anchor": "middle" });
    }

    function onResize(w) { st.chartW = w; draw(st.drawn); }

    /* ---- Texte ---- */
    function renderTexts(data, an) {
      var u = data.unit || "";
      // Kacheln
      if (an.mode !== null) {
        setVal(tMod, fmt(an.mode), u);
        tMod.sub.innerHTML = 'kommt <span class="sh-nowrap">' + LM.esc(timesDe(an.modeInfo.maxCount)) + "</span> vor";
      } else {
        setVal(tMod, "keiner", "");
        tMod.sub.textContent = an.modeInfo.allEqual
          ? (an.modeInfo.maxCount === 1 ? "Jeder Wert kommt nur einmal vor." : "Alle Werte kommen gleich oft vor.")
          : "Kein eindeutiger Modus.";
      }
      setVal(tMed, fmt(an.median), u);
      setVal(tMean, fmt(an.mean), u);

      // Ergebnis
      var v = verdictOf(an, peakIndex(data, an) >= 0);
      verdict.className = "sh-verdict is-" + v.cls;
      verdict.innerHTML = '<span class="sh-verdict-k">Ergebnis</span><strong class="sh-verdict-t">' + LM.esc(v.title) + "</strong>" +
        '<span class="sh-verdict-s">' + LM.esc(v.sub) + "</span>";

      // drei Kennzeichen
      var ord = orderOf(an), okOrder = orderMatchesSlide(an, ord);
      var tagCls = { mod: "tag-mod", med: "tag-med", mean: "tag-mean" };
      var ordHtml = ord.items.map(function (it, i) {
        return (i ? '<span class="sh-rel">' + ord.rel[i - 1] + "</span>" : "") +
          '<span class="tag ' + tagCls[it.key] + '">' + it.name + " " + fmt(it.v) + "</span>";
      }).join("");
      var ordNote;
      if (an.dir === "symmetrisch") ordNote = "Bei einer symmetrischen Verteilung fallen alle drei zusammen.";
      else if (an.dir === "rechtsschief") ordNote = (okOrder ? "✓ Genau wie auf Folie 141: " : "Folie 141: ") + "Bei positiver Schiefe liegt der Modus links, dann kommt der Median, dann das Mittel.";
      else if (an.dir === "linksschief") ordNote = (okOrder ? "✓ Genau wie auf Folie 141: " : "Folie 141: ") + "Bei negativer Schiefe ist es umgekehrt: erst das Mittel, dann der Median, dann der Modus.";
      else ordNote = "";
      if (an.mode === null) {
        ordNote += " Einen eindeutigen Modus gibt es hier nicht" + (data.kind === "classes" ? ", aber der Gipfel des Histogramms liegt " + (an.dir === "linksschief" ? "rechts." : "links.") : ".");
      }

      var g = gTexParts(an);
      facts.innerHTML =
        '<div class="sh-fact"><dt>Mittel minus Median</dt><dd><span class="sh-math">' + LM.tex(diffTex(an)) + "</span>" +
        '<span class="sh-word">' + LM.esc(DIFF_WORDS[an.dir]) + "</span></dd></div>" +
        '<div class="sh-fact"><dt>Reihenfolge</dt><dd><span class="sh-order">' + ordHtml + '</span><span class="sh-word sh-word-plain">' + LM.esc(ordNote.trim()) + "</span></dd></div>" +
        '<div class="sh-fact"><dt>Quartilskoeffizient</dt><dd>' +
        (g ? '<span class="sh-math sh-gtex">' + g.map(function (part) { return '<span class="sh-gpart">' + LM.tex(part) + "</span>"; }).join("") + "</span>" +
          '<span class="sh-word">' + LM.esc(G_WORDS[an.gdir]) + "</span>" +
          '<span class="sh-hint">In der Box unter dem Histogramm: linke Hälfte ' + LM.esc(fmt(an.skew.lower)) + ", rechte Hälfte " + LM.esc(fmt(an.skew.upper)) + ". " +
          (an.skew.upper > an.skew.lower + EPS ? "Die rechte Hälfte ist länger." : an.skew.upper < an.skew.lower - EPS ? "Die linke Hälfte ist länger." : "Beide Hälften sind gleich lang.") + "</span>"
          : '<span class="sh-word">' + LM.esc(G_WORDS.undefiniert) + "</span>") +
        "</dd></div>";

      tail.textContent = tailText(an, data);

      chart.setAttribute("aria-label", "Histogramm, " + v.title + ". " + (an.mode !== null ? "Modus " + fmt(an.mode) + ", " : "Kein eindeutiger Modus, ") +
        "Median " + fmt(an.median) + ", Mittel " + fmt(an.mean) + ".");
      sr.textContent = (st.set === "form" ? "Form: " + stepName(st.step) + ". " : "") + v.title + ". Mittel minus Median: " + fmt(an.skew.diff) +
        ". Quartilskoeffizient: " + (isFinite(an.skew.gp) ? fmt(an.skew.gp) : "nicht bestimmt") + ".";
    }

    /* ---- Laden und Wechseln ---- */
    function load(animateIt) {
      var data = buildSet(st.set, { step: st.step, width: st.width });
      var an = analyse(data.xs);
      var target = frameOf(data, an);
      var from = st.drawn, sameBins = st.data && st.data.id === data.id && st.data.bins.length === data.bins.length && st.data.kind === data.kind &&
        (data.id !== "weight" || st.data.classWidth === data.classWidth);
      st.data = data;
      st.an = an;
      var nt = NOTES[data.id];
      note.innerHTML = typeof nt === "function" ? nt() : LM.esc(nt);
      renderTexts(data, an);
      if (st.anim) { st.anim.stop(); st.anim = null; }
      if (!animateIt || !from || !sameBins) {
        st.drawn = target;
        draw(target);
        return;
      }
      st.anim = animate(360, function (k) {
        st.drawn = {
          counts: target.counts.map(function (c, j) { return lerp(from.counts[j], c, k); }),
          med: lerp(from.med, target.med, k), mean: lerp(from.mean, target.mean, k),
          q1: lerp(from.q1, target.q1, k), q3: lerp(from.q3, target.q3, k)
        };
        draw(st.drawn);
      }, function () { st.anim = null; st.drawn = target; draw(target); });
    }

    function syncForm() {
      slider.value = String(st.step);
      slider.setAttribute("aria-valuetext", stepName(st.step));
      formName.textContent = stepName(st.step);
      leftBtn.disabled = st.step <= -SHAPE_MAX;
      rightBtn.disabled = st.step >= SHAPE_MAX;
    }

    function setStep(s) {
      s = clampStep(s);
      var changed = s !== st.step || st.set !== "form";
      st.step = s;
      syncForm();
      if (st.set !== "form") { pickSet("form"); return; }
      if (changed) load(true);
    }

    function pickSet(id) {
      st.set = id;
      setSeg.set(id);
      formPanel.hidden = id !== "form";
      widthPanel.hidden = id !== "weight";
      load(false);
    }

    setSeg.set("form");
    widthSeg.set("1");
    syncForm();
    load(false);
    LM.svg.responsive(chart, onResize);
  });
})(typeof window !== "undefined" ? window : globalThis);
