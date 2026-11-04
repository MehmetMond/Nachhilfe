/*
 * Übungsblatt 3 (Kapitel 11): geführte Lösung der Aufgaben 9 bis 12.
 * Vier Module ue-a9, ue-a10, ue-a11, ue-a12 mit gemeinsamem Aufbau: Kopf mit Fortschritt, die Teile a), b), …
 * als senkrechte Schrittfolge (So gehst du vor, Eingaben, Prüfen, Tipp, Lösung), eine Grafik nach jedem
 * gelösten Teil und am Ende „Mit R nachprüfen“ (Code mit Kommentaren, Kopieren, „Was R antwortet“).
 * Gerechnet wird nur mit LM.stats, Zahlen zeigt LM.fmt, Formeln setzt LM.tex.
 * Die reinen Lösungs-Bausteine liegen in LM._ue (in Node: module.exports) für tests/uebung.test.js.
 */
(function (root) {
  "use strict";
  var LM = (root.LM = root.LM || {});
  function ST() { return LM.stats; }

  /* =====================================================================
     Daten von Übungsblatt 2 und 3 und Folie 148
     ===================================================================== */

  // Aufgabe 9: die 100 Noten, Zeile für Zeile wie auf dem Blatt
  var NOTEN_ROWS = [
    "441125245432122343343534323",
    "121223224332333243342332332",
    "323432332334333244312133443",
    "3213313125132213133"
  ];
  var NOTEN = NOTEN_ROWS.join("").split("").map(Number);

  // Aufgabe 10 = die 60 Reaktionszeiten aus Aufgabe 8 (ms), Reihenfolge wie auf Blatt 2 (Zeilen zu 11 Werten)
  var RT = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];
  var RT_ROW = 11;

  // Aufgabe 11: Klassen (60,63] … (72,75] und Anzahlen; die echten 100 Werte stehen auf Folie 148
  var A11_BOUNDS = [60, 63, 66, 69, 72, 75];
  var A11_COUNTS = [5, 18, 42, 27, 8];
  var GEWICHT = [61.1, 62.0, 62.2, 61.8, 60.2, 63.4, 63.5, 64.1, 65.0, 64.2, 67.5, 65.4, 64.7, 64.4, 65.1, 65.2, 68.2, 63.8, 63.6, 65.3,
    66.9, 63.4, 65.0, 67.2, 67.2, 67.2, 68.4, 66.6, 67.4, 67.6, 66.0, 68.7, 66.8, 66.1, 66.3, 66.5, 68.9, 67.9, 69.4, 67.7,
    66.4, 68.4, 67.7, 67.2, 66.7, 66.0, 67.8, 67.8, 67.7, 68.2, 68.8, 66.5, 68.8, 66.8, 66.1, 67.1, 68.7, 68.8, 68.9, 66.8,
    68.3, 68.3, 67.9, 67.3, 66.0, 70.9, 70.5, 69.0, 69.1, 69.7, 69.6, 70.9, 70.1, 70.1, 69.3, 71.1, 70.2, 71.7, 69.3, 71.9,
    71.1, 70.9, 71.6, 71.0, 70.6, 69.5, 69.1, 71.3, 70.2, 71.1, 69.5, 71.7, 73.8, 72.3, 72.2, 73.0, 72.4, 74.9, 72.5, 72.3];

  // Aufgabe 12: Fehleranteile f_0 … f_5
  var F12 = [0.55, 0.46, 0.35, 0.29, 0.25, 0.21];

  /* =====================================================================
     Reine Lösungs-Bausteine (ohne DOM, in Node testbar)
     ===================================================================== */

  function round(v, d) { var p = Math.pow(10, d); return Math.round(v * p + (v >= 0 ? 1e-9 : -1e-9)) / p; }
  function range(a, b) { var out = []; for (var i = a; i <= b; i++) out.push(i); return out; }

  // F(x) einer Treppenfunktion: Anteil der Werte ≤ x (values aufsteigend, F kumuliert)
  function ecdfAt(values, F, x) {
    var out = 0;
    for (var j = 0; j < values.length; j++) if (values[j] <= x + 1e-9) out = F[j];
    return out;
  }

  function solveA9() {
    var S = ST(), xs = NOTEN, n = xs.length, table = S.freq(xs);
    var values = table.map(function (r) { return r.value; });
    var h = table.map(function (r) { return r.h; });
    var mt = S.meanTable(values, h);
    var mode = S.modeInfo(xs), med = S.medianInfo(xs), mean = S.meanInfo(xs);
    var q1 = S.quantileInfo(xs, 0.25), q3 = S.quantileInfo(xs, 0.75);
    // kumuliert wie R cumsum(f): f_j = h_j / n nacheinander aufsummiert
    var cum = [], c = 0;
    table.forEach(function (r) { c += r.h / n; cum.push(c); });
    return {
      n: n, rows: NOTEN_ROWS, sorted: S.sorted(xs), values: values, h: h,
      f: table.map(function (r) { return r.f; }),
      H: table.map(function (r) { return r.H; }),
      F: table.map(function (r) { return r.F; }),
      cumsum: cum,
      blocks: table.map(function (r) { return { value: r.value, from: r.from, to: r.to }; }),
      products: mt.products, sum: mt.sum,
      mode: mode.value, modeCount: mode.maxCount,
      median: med.value, medianPositions: med.positions,
      mean: mean.value,
      q1: q1.value, q1np: q1.np, q1Positions: q1.positions,
      q3: q3.value, q3np: q3.np, q3Positions: q3.positions,
      q1t7: S.quantileType7(xs, 0.25), q3t7: S.quantileType7(xs, 0.75),
      diff: mean.value - med.value, direction: S.skewDirection(mean.value - med.value),
      meanOfLevels: S.mean(values)
    };
  }

  function solveA10() {
    var S = ST(), xs = RT, s = S.sorted(xs), n = s.length;
    var mean = S.meanInfo(xs), med = S.medianInfo(xs);
    var q1 = S.quantileInfo(xs, 0.25), q3 = S.quantileInfo(xs, 0.75);
    var b15 = S.boxplot(xs, 1.5), b0 = S.boxplot(xs, 0), sk = S.skewInfo(xs, 0.25);
    var hin = S.hinges(xs);
    function pos(v) { return s.indexOf(v) + 1; }
    var noOutXs = xs.filter(function (v) { return b15.out.indexOf(v) < 0; });
    var noMed = S.medianInfo(noOutXs), noMean = S.mean(noOutXs);
    function trim(t) {
      var ti = S.trimInfo(xs, t);
      return { t: t, k: ti.k, m: ti.m, sum: ti.sum, value: ti.value, low: ti.low, high: ti.high,
        lowPositions: range(1, ti.k), highPositions: range(n - ti.k + 1, n) };
    }
    return {
      n: n, sorted: s, sum: mean.sum, mean: mean.value,
      median: med.value, medianPositions: med.positions,
      min: s[0], max: s[n - 1],
      q1: q1.value, q1np: q1.np, q1Positions: q1.positions,
      q3: q3.value, q3np: q3.np, q3Positions: q3.positions,
      q1t7: S.quantileType7(xs, 0.25), q3t7: S.quantileType7(xs, 0.75),
      iqr: b15.iqr, step: 1.5 * b15.iqr, fences: b15.fences,
      whiskerLo: b15.lo, whiskerHi: b15.hi, whiskerLoPos: pos(b15.lo), whiskerHiPos: pos(b15.hi),
      out: b15.out, outPositions: b15.out.map(pos),
      range0: { lo: b0.lo, hi: b0.hi },
      rStats: [b15.lo, hin[1], hin[2], hin[3], b15.hi],
      diff: sk.diff, direction: sk.diffDirection, gp: sk.gp,
      noOut: { n: noOutXs.length, sum: S.sum(noOutXs), mean: noMean, median: noMed.value, medianPositions: noMed.positions, diff: noMean - noMed.value },
      trim: { 2: trim(0.02), 5: trim(0.05), 10: trim(0.1), 20: trim(0.2), 25: trim(0.25) },
      // typische Fehler beim getrimmten Mittel
      wrongTrim: function (t) { var ti = S.trimInfo(xs, t); return { byN: ti.sum / n, oneSide: ti.sum / (n - ti.k) }; },
      // Position auf Karopapier: Achse ab 100 ms, 1 cm = 50 ms
      cm: function (v) { return (v - 100) / 50; }
    };
  }

  function solveA11() {
    var S = ST(), g = S.groupedMean(A11_BOUNDS, A11_COUNTS), real = S.meanInfo(GEWICHT);
    var lowerSum = 0, upperSum = 0;
    A11_COUNTS.forEach(function (c, j) { lowerSum += c * A11_BOUNDS[j]; upperSum += c * A11_BOUNDS[j + 1]; });
    var midSum = S.sum(g.mids);
    var realCounts = A11_COUNTS.map(function (c, j) {
      return GEWICHT.filter(function (x) { return x > A11_BOUNDS[j] && x <= A11_BOUNDS[j + 1]; }).length;
    });
    return {
      bounds: A11_BOUNDS, counts: A11_COUNTS, n: g.n,
      mids: g.mids, products: g.products, sum: g.sum, mean: g.value,
      f: A11_COUNTS.map(function (c) { return c / g.n; }),
      realMean: real.value, realMedian: S.median(GEWICHT), realCounts: realCounts,
      gap: real.value - g.value,
      wrong: { lowerSum: lowerSum, upperSum: upperSum, midSum: midSum, midMean: midSum / A11_COUNTS.length, byClasses: g.sum / A11_COUNTS.length }
    };
  }

  function solveA12() {
    var S = ST(), f = F12;
    var x = f.slice(1).map(function (v, i) { return v / f[i]; });
    var g = S.geometricInfo(x), am = S.mean(x);
    var pred = range(1, 5).map(function (i) { return f[0] * Math.pow(g.value, i); });
    var predAM = range(1, 5).map(function (i) { return f[0] * Math.pow(am, i); });
    var x4 = x.map(function (v) { return round(v, 4); });
    return {
      f: f, x: x, x4: x4,
      // Was der Taschenrechner mit den gerundeten Zahlen ergibt (kleine Abweichung durch Runden)
      productX4: x4.reduce(function (p, v) { return p * v; }, 1),
      gm4pow5: Math.pow(round(g.value, 4), 5),
      product: g.product, gm: g.value, am: am, median: S.median(x), hm: S.harmonicMean(x),
      pred: pred, pred4: pred.map(function (v) { return round(v, 4); }), predAM: predAM,
      percentOf: 100 * g.value, percentDown: 100 * (1 - g.value),
      inverse: f.slice(1).map(function (v, i) { return f[i] / v; }),
      differences: f.slice(1).map(function (v, i) { return f[i] - v; })
    };
  }

  /* ---------- So druckt R Zahlen (print mit 7 signifikanten Stellen) ---------- */

  // Wie viele Nachkommastellen braucht R für v? (kleinste Stellenzahl, die den 7-stelligen Wert trifft)
  function rDecimals(v) {
    if (!isFinite(v) || v === 0) return 0;
    var a = Math.abs(v), r7 = Number(a.toPrecision(7)), sig = 1;
    while (sig < 7 && Number(a.toPrecision(sig)) !== r7) sig++;
    var e = Math.floor(Math.log10(r7) + 1e-12);
    return Math.max(0, sig - 1 - e);
  }
  function padL(s, w) { s = String(s); while (s.length < w) s = " " + s; return s; }
  // Ein Vektor wird mit gemeinsamer Stellenzahl und gemeinsamer Breite gedruckt
  function rFormat(xs) {
    var d = 0;
    xs.forEach(function (v) { d = Math.max(d, rDecimals(v)); });
    var strs = xs.map(function (v) { return v.toFixed(d); }), w = 0;
    strs.forEach(function (s) { w = Math.max(w, s.length); });
    return strs.map(function (s) { return padL(s, w); });
  }
  function rVec(xs) { return "[1] " + rFormat(xs).join(" "); }
  function rNamed(names, xs) {
    var vals = rFormat(xs), w = 0;
    names.forEach(function (nm, i) { w = Math.max(w, nm.length, vals[i].trim().length); });
    return [names.map(function (nm) { return padL(nm, w); }).join(" "),
      vals.map(function (v) { return padL(v.trim(), w); }).join(" ")];
  }

  /* ---------- R-Code und Ausgaben je Aufgabe ---------- */

  function dataLines(head, rows, comments, fmt, sep) {
    var ind = "";
    while (ind.length < head.length) ind += " ";
    return rows.map(function (row, i) {
      var last = i === rows.length - 1;
      return [(i ? ind : head) + row.map(fmt).join(sep) + (last ? ")" : ","), comments[i]];
    });
  }
  function chunk(xs, size) { var out = []; for (var i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size)); return out; }

  function rA9() {
    var a = solveA9(), names = a.values.map(String);
    var rows = NOTEN_ROWS.map(function (r) { return r.split(""); });
    var code = dataLines("x <- c(", rows, ["Zeile 1 vom Blatt", "Zeile 2", "Zeile 3", "Zeile 4: zusammen 100 Noten"], String, ",").concat([
      ["h <- table(x)", "absolute Häufigkeiten h_j auszählen (Folie 41)"],
      ["h", "Tabelle anzeigen"],
      ["f <- h / sum(h)", "relative Häufigkeiten f_j = h_j / n (Folie 41)"],
      ["f", "anzeigen"],
      ['plot(f, type = "h", lwd = 4, xlab = "Note", ylab = "rel. Haeufigkeit")', "Stabdiagramm (Folie 42)"],
      ["cumsum(f)", "kumulierte Häufigkeiten F_j, Folie 49–50 (R-Befehl nicht auf den Folien)"],
      ["F <- ecdf(x)", "empirische Verteilungsfunktion (Folie 52)"],
      ['plot(F, xlab = "Note", ylab = "F(x)")', "als Treppe zeichnen (Folie 52)"],
      ["names(which.max(h))", "Modus: Note mit der größten Anzahl, Folie 92 (R-Befehl nicht auf den Folien)"],
      ["median(x)", "Median (Folie 96)"],
      ["mean(x)", "arithmetisches Mittel (Folie 112)"],
      ["quantile(x, probs = c(0.25, 0.75), type = 2)", "0,25- und 0,75-Quantil nach Folie 101 (Folie 103)"]
    ]);
    var out = [
      { cmd: "h", lines: ["x"].concat(rNamed(names, a.h)) },
      { cmd: "f", lines: ["x"].concat(rNamed(names, a.f)) },
      { cmd: "cumsum(f)", lines: rNamed(names, a.cumsum) },
      { cmd: "names(which.max(h))", lines: ['[1] "' + a.mode + '"'] },
      { cmd: "median(x)", lines: [rVec([a.median])] },
      { cmd: "mean(x)", lines: [rVec([a.mean])] },
      { cmd: "quantile(x, probs = c(0.25, 0.75), type = 2)", lines: rNamed(["25%", "75%"], [a.q1, a.q3]) }
    ];
    return { code: code, out: out };
  }

  function rA10() {
    var a = solveA10();
    var rows = chunk(RT, RT_ROW);
    var code = dataLines("x <- c(", rows, ["Urliste aus Aufgabe 8, Zeile 1", "Zeile 2", "Zeile 3", "Zeile 4", "Zeile 5",
      "Zeile 6: zusammen 60 Zeiten in ms"], function (v) { return v.toFixed(1); }, ", ").concat([
      ['boxplot(x, horizontal = TRUE, xlab = "Reaktionszeit [ms]")', "Boxplot, R-Standard range = 1.5 (Folie 108)"],
      ['boxplot(x, horizontal = TRUE, range = 0, xlab = "Reaktionszeit [ms]")', "Whisker bis Min und Max (Folie 107)"],
      ["boxplot.stats(x)$stats", "die 5 Zahlen, die R zeichnet (R-Befehl nicht auf den Folien)"],
      ["boxplot.stats(x)$out", "die Ausreißer, die R als Punkte zeichnet (R-Befehl nicht auf den Folien)"],
      ["quantile(x, probs = c(0.25, 0.5, 0.75), type = 2)", "Quartile nach Folie 101"],
      ["mean(x)", "arithmetisches Mittel (Folie 112)"],
      ["median(x)", "Median (Folie 96)"],
      ["mean(x) - median(x)", "größer als 0: tendenziell rechtsschief (Folie 140)"],
      ["y <- x[x < 500]", "ohne die zwei Ausreißer (R-Befehl nicht auf den Folien)"],
      ["round(mean(y), 2)", "Mittel ohne Ausreißer, auf 2 Stellen"],
      ["median(y)", "Median ohne Ausreißer"],
      ["round(mean(x, trim = 0.05), 2)", "getrimmtes Mittel, Folie 116: 5 % je Seite weg, k = 3 (R-Befehl nicht auf den Folien)"],
      ["round(mean(x, trim = 0.1), 2)", "getrimmtes Mittel, Folie 116: 10 % je Seite weg, k = 6 (R-Befehl nicht auf den Folien)"]
    ]);
    var out = [
      { cmd: "boxplot.stats(x)$stats", lines: [rVec(a.rStats)] },
      { cmd: "boxplot.stats(x)$out", lines: [rVec(a.out)] },
      { cmd: "quantile(x, probs = c(0.25, 0.5, 0.75), type = 2)", lines: rNamed(["25%", "50%", "75%"], [a.q1, a.median, a.q3]) },
      { cmd: "mean(x)", lines: [rVec([a.mean])] },
      { cmd: "median(x)", lines: [rVec([a.median])] },
      { cmd: "mean(x) - median(x)", lines: [rVec([a.diff])] },
      { cmd: "round(mean(y), 2)", lines: [rVec([round(a.noOut.mean, 2)])] },
      { cmd: "median(y)", lines: [rVec([a.noOut.median])] },
      { cmd: "round(mean(x, trim = 0.05), 2)", lines: [rVec([round(a.trim[5].value, 2)])] },
      { cmd: "round(mean(x, trim = 0.1), 2)", lines: [rVec([round(a.trim[10].value, 2)])] }
    ];
    return { code: code, out: out };
  }

  function rA11() {
    var a = solveA11();
    var rows = chunk(GEWICHT, 10), com = rows.map(function (r, i) { return "Werte " + (10 * i + 1) + " bis " + (10 * i + 10); });
    com[0] = "zum Vergleich die echten Werte, " + com[0];
    com[9] = com[9] + " (Folie 148)";
    var code = [
      ["mitte <- c(61.5, 64.5, 67.5, 70.5, 73.5)", "Klassenmitten x'_j = (Untergrenze + Obergrenze) / 2"],
      ["h <- c(5, 18, 42, 27, 8)", "Anzahl der Studenten je Klasse h_j"],
      ["h * mitte", "die Produkte h_j · x'_j"],
      ["sum(h * mitte)", "ihre Summe"],
      ["sum(h * mitte) / sum(h)", "geteilt durch n = 100: Näherung für das Mittel (Folie 113)"]
    ].concat(dataLines("gewicht <- c(", rows, com, function (v) { return v.toFixed(1); }, ",")).concat([
      ["hist(gewicht, breaks = c(60, 63, 66, 69, 72, 75))", "Histogramm mit denselben Klassen (Folie 66)"],
      ["mean(gewicht)", "echtes Mittel der 100 Werte"]
    ]);
    var out = [
      { cmd: "h * mitte", lines: [rVec(a.products)] },
      { cmd: "sum(h * mitte)", lines: [rVec([a.sum])] },
      { cmd: "sum(h * mitte) / sum(h)", lines: [rVec([a.mean])] },
      { cmd: "mean(gewicht)", lines: [rVec([a.realMean])] }
    ];
    return { code: code, out: out };
  }

  function rA12() {
    var a = solveA12();
    var code = [
      ["f <- c(0.55, 0.46, 0.35, 0.29, 0.25, 0.21)", "Fehleranteile f_0 bis f_5"],
      ["x <- f[2:6] / f[1:5]", "x_i = f_i / f_(i-1); R zählt ab 1, f[1] ist f_0"],
      ["round(x, 4)", "die 5 Lernfortschritte, auf 4 Stellen gerundet"],
      ["prod(x)", "ihr Produkt, kürzt sich zu f_5 / f_0 (R-Befehl nicht auf den Folien)"],
      ["geometric_mean <- function(x) {", "geometrisches Mittel selbst bauen (Folie 118)"],
      ["  exp(mean(log(x)))", "e hoch (Mittel der Logarithmen)"],
      ["}", "Ende der Funktion"],
      ["geometric_mean(x)", "mittlerer Lernfortschritt"],
      ["mean(x)", "zum Vergleich: arithmetisches Mittel der Faktoren"],
      ["round(f[1] * geometric_mean(x)^(1:5), 4)", "Vorhersage f_0 · GM^i für i = 1 bis 5"]
    ];
    var out = [
      { cmd: "round(x, 4)", lines: [rVec(a.x4)] },
      { cmd: "prod(x)", lines: [rVec([a.product])] },
      { cmd: "geometric_mean(x)", lines: [rVec([a.gm])] },
      { cmd: "mean(x)", lines: [rVec([a.am])] },
      { cmd: "round(f[1] * geometric_mean(x)^(1:5), 4)", lines: [rVec(a.pred4)] }
    ];
    return { code: code, out: out };
  }

  var core = {
    NOTEN: NOTEN, NOTEN_ROWS: NOTEN_ROWS, RT: RT, GEWICHT: GEWICHT, A11_BOUNDS: A11_BOUNDS, A11_COUNTS: A11_COUNTS, F12: F12,
    round: round, ecdfAt: ecdfAt,
    solveA9: solveA9, solveA10: solveA10, solveA11: solveA11, solveA12: solveA12,
    rDecimals: rDecimals, rFormat: rFormat, rVec: rVec, rNamed: rNamed,
    rA9: rA9, rA10: rA10, rA11: rA11, rA12: rA12
  };
  LM._ue = core;
  if (typeof module !== "undefined" && module.exports) module.exports = core;

  /* =====================================================================
     Oberfläche: kleine Helfer
     ===================================================================== */

  function H(tag, o, kids) { return LM.h(tag, o, kids); }
  function fm(v, d) { return LM.fmt(v, d === undefined ? 2 : d); }
  // Zahl für TeX: Dezimalkomma als {,}
  function tn(v, d) { return fm(v, d).replace(/,/g, "{,}").replace(/−/g, "-"); }
  function T(src) { return LM.tex(src); }
  function TD(src) { return '<div class="ue-tex">' + LM.tex(src, true) + "</div>"; }
  // mehrzeilig, ausgerichtet am &: TA(["a &= b", "&= c"])
  function TA(rows) { return TD("\\begin{aligned}" + rows.join(" \\\\ ") + "\\end{aligned}"); }
  // Quantil bzw. Median aus zwei Plätzen, untereinander
  function TQ(head, name, k, v1, v2, res, d) {
    return TA(["&" + head + " \\;\\Rightarrow", name + " &=\\tfrac12\\,[x_{(" + k + ")} + x_{(" + (k + 1) + ")}]",
      "&= \\tfrac12\\,(" + tn(v1, d) + " + " + tn(v2, d) + ") = " + tn(res)]);
  }
  // leichtes Formelzeichen ohne KaTeX, z. B. sym("h", "j") → h_j
  function sym(v, sub, bar) {
    return '<span class="ue-sym"><i' + (bar ? ' class="ue-bar"' : "") + ">" + v + "</i>" + (sub !== undefined ? "<sub>" + sub + "</sub>" : "") + "</span>";
  }
  function ref(txt) { return '<p class="ue-ref">' + txt + "</p>"; }
  var seq = 0;
  function uid(p) { seq += 1; return "ue-" + p + "-" + seq; }
  function val(x) { return typeof x === "function" ? x() : x; }
  var PRAISE = ["Richtig!", "Genau so!", "Stimmt!", "Super, richtig!"];
  var ICON = {
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };

  // Text in die Zwischenablage, sonst markieren und Strg + C anbieten
  function copyText(codeEl, msg) {
    function selectIt() {
      try {
        var sel = window.getSelection(), rg = document.createRange();
        rg.selectNodeContents(codeEl);
        sel.removeAllRanges();
        sel.addRange(rg);
      } catch (e) { /* nichts */ }
      msg.className = "ue-copy-msg";
      msg.textContent = "Der Code ist markiert. Drück jetzt Strg + C (am Mac: Cmd + C).";
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeEl.textContent).then(function () {
          msg.className = "ue-copy-msg is-ok";
          msg.textContent = "Kopiert. Jetzt in RStudio einfügen und ausführen.";
        }, selectIt);
      } else selectIt();
    } catch (e) { selectIt(); }
  }

  // „Mit R nachprüfen“: Code mit deutschem Kommentar in jeder Zeile, Kopieren, aufklappbare Ausgabe
  function rBlock(spec) {
    var codeEl = H("code"), outEl = H("code"), col = 0, CAP = 30;
    spec.code.forEach(function (l) { if (l[0].length <= CAP) col = Math.max(col, l[0].length); });
    spec.code.forEach(function (l, i) {
      var gap = l[0].length <= CAP ? col - l[0].length + 3 : 3, sp = "";
      while (sp.length < gap) sp += " ";
      codeEl.appendChild(document.createTextNode(l[0] + sp));
      codeEl.appendChild(H("span", { class: "ue-com", text: "# " + l[1] }));
      if (i < spec.code.length - 1) codeEl.appendChild(document.createTextNode("\n"));
    });
    spec.out.forEach(function (o, i) {
      outEl.appendChild(H("span", { class: "ue-com", text: "> " }));
      outEl.appendChild(H("span", { class: "ue-cmd", text: o.cmd }));
      outEl.appendChild(document.createTextNode("\n" + o.lines.join("\n") + (i < spec.out.length - 1 ? "\n" : "")));
    });
    var msg = H("p", { class: "ue-copy-msg", attrs: { role: "status", "aria-live": "polite" } });
    var copyBtn = H("button", { class: "btn btn-sm", attrs: { type: "button" }, html: ICON.copy + "Code kopieren" });
    copyBtn.addEventListener("click", function () { copyText(codeEl, msg); });
    return H("section", { class: "ue-r", attrs: { "aria-label": "Mit R nachprüfen" } }, [
      H("div", { class: "ue-r-head" }, [H("h4", { text: "Mit R nachprüfen" }), copyBtn]),
      H("p", { class: "ue-r-sub", html: "Kopier den Code in RStudio und führ ihn aus. Hinter jeder Zeile steht, was sie tut. Befehle mit „(R-Befehl nicht auf den Folien)“ musst du in der Klausur nicht kennen. Die Rechnung dahinter schon." }),
      H("pre", { class: "ue-pre", attrs: { tabindex: "0", "aria-label": "R-Code" } }, [codeEl]),
      msg,
      H("details", { class: "ue-rout" }, [
        H("summary", { text: "Was R antwortet" }),
        H("pre", { class: "ue-pre ue-pre-out", attrs: { tabindex: "0", "aria-label": "Ausgabe von R" } }, [outEl]),
        H("p", { class: "ue-r-note", text: "Hinter jedem > steht der Befehl, darunter die Antwort von R. R schreibt Punkt statt Komma. Grafiken (plot, boxplot, hist) erscheinen im Grafikfenster." })
      ])
    ]);
  }

  /* =====================================================================
     Das Arbeitsblatt: Kopf, Teile als Schrittfolge, Prüfen, Tipps, Lösung
     ===================================================================== */

  function buildSheet(el, cfg, restart) {
    var saved = LM.store.get(cfg.key, null);
    var st = saved && saved.v === 1 && saved.s ? saved : { v: 1, s: {}, open: {}, ui: {} };
    if (!st.open) st.open = {};
    if (!st.ui) st.ui = {};
    var sheet = { cfg: cfg, st: st, el: el, parts: [], restoring: true };
    var saveT = 0;
    sheet.save = function () { clearTimeout(saveT); LM.store.set(cfg.key, st); };
    sheet.saveSoon = function () { clearTimeout(saveT); saveT = setTimeout(sheet.save, 400); };
    sheet.ui = function (k, v) { if (v === undefined) return st.ui[k]; st.ui[k] = v; sheet.save(); return v; };
    sheet.done = function (id) { var s = st.s[id]; return s ? s.st : 0; };
    sheet.partDone = function (pid) { var p = sheet.parts.filter(function (x) { return x.id === pid; })[0]; return p ? partState(p) : 0; };

    /* ---------- Kopf und Fortschritt ---------- */

    el.appendChild(H("div", { class: "w-head" }, [
      H("h3", { html: '<span class="w-badge">' + LM.esc(cfg.badge) + "</span> " + LM.esc(cfg.title) }),
      H("p", { class: "w-sub", text: cfg.sub })
    ]));
    var dots = H("span", { class: "ue-dots", attrs: { "aria-hidden": "true" } });
    var progT = H("span", { class: "ue-prog-t", attrs: { role: "status", "aria-live": "polite" } });
    var resetBtn = H("button", { class: "btn btn-sm btn-ghost ue-reset", attrs: { type: "button", title: "Alle Eingaben dieser Aufgabe löschen" }, html: ICON.reset + '<span class="ue-reset-t">Von vorn</span>' });
    var armT = 0;
    resetBtn.addEventListener("click", function () {
      if (resetBtn.classList.contains("is-armed")) { clearTimeout(armT); restart(); return; }
      resetBtn.classList.add("is-armed");
      resetBtn.querySelector(".ue-reset-t").textContent = "Sicher? Nochmal klicken";
      armT = setTimeout(function () {
        resetBtn.classList.remove("is-armed");
        resetBtn.querySelector(".ue-reset-t").textContent = "Von vorn";
      }, 4000);
    });
    el.appendChild(H("div", { class: "ue-top" }, [H("div", { class: "ue-prog" }, [dots, progT]), resetBtn]));

    if (cfg.intro) {
      var intro = H("div", { class: "ue-intro" });
      el.appendChild(intro);
      cfg.intro(intro, sheet);
    }

    var ol = H("ol", { class: "ue-steps" });
    el.appendChild(ol);
    var fin = H("div", { class: "ue-final", attrs: { hidden: "" } });
    var finText = H("p", { attrs: { role: "status", "aria-live": "polite" } });
    fin.appendChild(finText);

    /* ---------- Teile ---------- */

    function partState(p) {
      var all = true, rev = false;
      p.stages.forEach(function (sg) { var v = sheet.done(sg.id); if (!v) all = false; if (v === 2) rev = true; });
      return all ? (rev ? 2 : 1) : 0;
    }
    function isOpen(p) { return p.btn.getAttribute("aria-expanded") === "true"; }
    function setOpen(p, on, user) {
      p.btn.setAttribute("aria-expanded", String(on));
      if (on) p.body.removeAttribute("hidden"); else p.body.setAttribute("hidden", "");
      p.li.classList.toggle("is-open", on);
      if (user) { st.open[p.id] = on; sheet.save(); }
    }

    cfg.parts.forEach(function (pc, idx) {
      var p = { cfg: pc, idx: idx, id: pc.id, stages: [], visualBuilt: false };
      var bodyId = uid("body");
      p.stateLbl = H("span", { class: "ue-pstate" });
      p.btn = H("button", { class: "ue-pbtn", attrs: { type: "button", "aria-expanded": "false", "aria-controls": bodyId } }, [
        H("span", { class: "ue-mark", attrs: { "aria-hidden": "true" } }, [H("span", { class: "ue-mark-t", text: pc.mark })]),
        H("span", { class: "ue-ptitle" }, [
          pc.tag ? H("span", { class: "ue-ptag", text: pc.tag }) : null,
          H("span", { class: "ue-ptext", html: pc.title })
        ]),
        p.stateLbl,
        H("span", { class: "ue-chev", html: ICON.chev })
      ]);
      p.body = H("div", { class: "ue-pbody", attrs: { id: bodyId, hidden: "" } });
      p.li = H("li", { class: "ue-part" }, [H("h4", { class: "ue-ph" }, [p.btn]), p.body]);
      ol.appendChild(p.li);
      if (pc.how) {
        p.body.appendChild(H("div", { class: "ue-how" }, [
          H("p", { class: "ue-how-t", text: "So gehst du vor" }),
          H("ol", {}, pc.how.map(function (t) { return H("li", { html: val(t) }); }))
        ]));
      }
      pc.stages.forEach(function (sc, k) { p.stages.push(buildStage(p, sc, k)); });
      p.visual = H("div", { class: "ue-visual", attrs: { hidden: "" } });
      p.body.appendChild(p.visual);
      p.btn.addEventListener("click", function () { setOpen(p, !isOpen(p), true); });
      sheet.parts.push(p);
    });
    el.appendChild(fin);
    if (cfg.r) el.appendChild(rBlock(cfg.r()));

    /* ---------- Ein Schritt: Eingaben oder Auswahl, Prüfen, Tipp, Lösung ---------- */

    function buildStage(p, sc, k) {
      var sg = { cfg: sc, id: p.id + "." + sc.id, part: p, k: k, F: {}, tipsShown: 0 };
      sg.ss = st.s[sg.id] || (st.s[sg.id] = { st: 0, vals: {}, tips: 0 });
      var box = H("div", { class: "ue-stage" });
      p.body.appendChild(box);
      sg.box = box;
      if (sc.title) box.appendChild(H("p", { class: "ue-stage-t", html: sc.title }));
      if (sc.prompt) box.appendChild(H("p", { class: "ue-prompt", html: val(sc.prompt) }));
      if (sc.extra) sc.extra(box, sheet, sg);
      if (sc.type === "mc") buildMC(sg, box); else buildFields(sg, box);
      var checkBtn = sc.type === "mc" ? null : H("button", { class: "btn btn-primary btn-sm ue-check", attrs: { type: "button" }, text: "Prüfen" });
      sg.tipBtn = sc.tips && sc.tips.length ? H("button", { class: "btn btn-sm ue-tipbtn", attrs: { type: "button" }, text: "Tipp" }) : null;
      var solBtn = sc.noHelp ? null : H("button", { class: "btn btn-sm btn-ghost ue-solbtn", attrs: { type: "button" }, text: "Lösung zeigen" });
      sg.actions = H("div", { class: "ue-actions" }, [checkBtn, sg.tipBtn, solBtn]);
      sg.fb = H("p", { class: "feedback ue-fb", attrs: { role: "status", "aria-live": "polite", tabindex: "-1" } });
      sg.tipsEl = H("ol", { class: "ue-tips", attrs: { hidden: "" } });
      sg.why = H("div", { class: "ue-why", attrs: { hidden: "" } });
      sg.sol = sc.solution ? H("details", { class: "ue-sol", attrs: { hidden: "" } }, [H("summary", { text: "Rechenweg ansehen" }), H("div", { class: "ue-sol-body" })]) : null;
      [sg.actions, sg.fb, sg.tipsEl, sg.why, sg.sol].forEach(function (x) { if (x) box.appendChild(x); });
      if (checkBtn) checkBtn.addEventListener("click", function () { check(sg); });
      if (sg.tipBtn) sg.tipBtn.addEventListener("click", function () { showTip(sg, true); });
      if (solBtn) solBtn.addEventListener("click", function () { done(sg, 2, true); });
      if (sg.sol) sg.sol.addEventListener("toggle", function () { if (sg.sol.open) fillSolution(sg); });
      return sg;
    }

    function buildFields(sg, box) {
      var sc = sg.cfg;
      sc.fields.forEach(function (f) {
        var id = uid("in");
        var inp = H("input", { class: "num-input ue-in ue-in-" + (f.w || "m"), attrs: { id: id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false" } });
        if (f.aria) inp.setAttribute("aria-label", f.aria);
        if (f.ph) inp.setAttribute("placeholder", f.ph);
        var lab = H("label", { class: "ue-lab", attrs: { for: id }, html: f.label || "" });
        if (sg.ss.vals[f.id] !== undefined) inp.value = sg.ss.vals[f.id];
        inp.addEventListener("input", function () {
          inp.classList.remove("is-ok", "is-miss");
          inp.removeAttribute("aria-invalid");
          sg.ss.vals[f.id] = inp.value;
          sheet.saveSoon();
        });
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); check(sg); } });
        if (f.focus) {
          inp.addEventListener("focus", function () { f.focus(true); });
          inp.addEventListener("blur", function () { f.focus(false); });
        }
        sg.F[f.id] = { cfg: f, input: inp, label: lab };
      });
      var holder = H("div", { class: "ue-fields-wrap" });
      box.appendChild(holder);
      if (sc.layout) sc.layout(holder, sg.F, sheet, sg);
      else holder.appendChild(H("div", { class: "ue-fields" }, sc.fields.map(function (f) {
        return H("div", { class: "ue-field" }, [sg.F[f.id].label, sg.F[f.id].input, f.unit ? H("span", { class: "ue-unit", html: f.unit }) : null]);
      })));
    }

    function buildMC(sg, box) {
      var sc = sg.cfg;
      var grp = H("div", { class: "ue-mc", attrs: { role: "group", "aria-label": sc.groupLabel || "Antworten zur Auswahl" } });
      sg.opts = sc.options.map(function (o) {
        var b = H("button", { class: "ue-opt", attrs: { type: "button", "aria-pressed": "false" }, html: '<span class="ue-opt-dot" aria-hidden="true"></span><span class="ue-opt-t">' + o.html + "</span>" });
        b.addEventListener("click", function () {
          if (sg.ss.st) return;
          sg.opts.forEach(function (x) { x.btn.setAttribute("aria-pressed", String(x.btn === b)); });
          if (o.ok || sc.anyOk) { sg.ss.pick = o.id; done(sg, 1, true); return; }
          b.classList.add("is-miss");
          sg.fb.className = "feedback ue-fb miss";
          sg.fb.innerHTML = val(o.why);
        });
        grp.appendChild(b);
        return { cfg: o, btn: b };
      });
      box.appendChild(grp);
    }

    function expectOf(f) { return val(f.expect); }

    function check(sg) {
      if (sg.ss.st) return;
      var sc = sg.cfg, ctx = { v: {}, ok: {}, empty: {}, bad: {} };
      var nOk = 0, nBad = 0, nNeed = 0, first = null;
      sc.fields.forEach(function (f) {
        var inp = sg.F[f.id].input;
        var r = LM.check(inp.value, expectOf(f), f.tol !== undefined ? { tol: f.tol } : { decimals: f.dec === undefined ? 2 : f.dec });
        ctx.v[f.id] = r.value; ctx.ok[f.id] = r.ok; ctx.empty[f.id] = r.empty; ctx.bad[f.id] = !r.empty && !isFinite(r.value);
        if (r.ok && f.trap) { var m = f.trap(r.value, ctx); if (m) { ctx.ok[f.id] = false; ctx.trapped = ctx.trapped || {}; ctx.trapped[f.id] = m; } }
      });
      sc.fields.forEach(function (f) {
        var inp = sg.F[f.id].input, ok = ctx.ok[f.id], empty = ctx.empty[f.id];
        inp.classList.toggle("is-ok", ok);
        inp.classList.toggle("is-miss", !ok && !empty);
        if (!ok && !empty) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
        if (!f.optional) nNeed++;
        if (ok) { if (!f.optional) nOk++; return; }
        if (empty) return;
        nBad++;
        if (first) return;
        if (ctx.bad[f.id]) first = "„" + LM.esc(inp.value.trim()) + "“ ist keine Zahl. Schreib Zahlen mit Komma, zum Beispiel " + (f.example || "0,13") + ".";
        else if (ctx.trapped && ctx.trapped[f.id]) first = ctx.trapped[f.id];
        else if (f.diag) first = f.diag(ctx.v[f.id], ctx) || null;
      });
      if (sc.onCheck) sc.onCheck(ctx, sheet);
      if (!nBad && nOk === nNeed) { done(sg, 1, true); return; }
      var msg, cls = "miss";
      if (!nBad && !nOk) { msg = "Trag zuerst deine Ergebnisse ein. Dann klick auf „Prüfen“."; cls = "is-note"; }
      else if (!nBad) { msg = (sc.partial && sc.partial(ctx)) || "Bis hierhin stimmt alles. Füll noch die leeren Felder aus."; cls = "is-note"; }
      else {
        var cross = sc.cross ? sc.cross(ctx) : null;
        var head = nNeed > 1 ? nOk + " von " + nNeed + " stimmen. " : "Noch nicht. ";
        msg = head + (first || cross || "Schau dir die rot markierten Felder noch einmal an. Ein Tipp hilft dir weiter.");
      }
      sg.fb.className = "feedback ue-fb " + cls;
      sg.fb.innerHTML = msg;
    }

    function showTip(sg, live) {
      var tips = sg.cfg.tips, i = sg.tipsShown;
      if (!tips || i >= tips.length) return;
      sg.tipsEl.appendChild(H("li", { class: "ue-tip", html: '<span class="ue-tip-n">Tipp ' + (i + 1) + "</span>" + val(tips[i]) }));
      sg.tipsEl.hidden = false;
      sg.tipsShown = i + 1;
      sg.tipBtn.textContent = sg.tipsShown < tips.length ? "Noch ein Tipp (" + sg.tipsShown + "/" + tips.length + ")" : "Alle Tipps gezeigt";
      sg.tipBtn.disabled = sg.tipsShown >= tips.length;
      if (live) { sg.ss.tips = sg.tipsShown; sheet.save(); }
    }

    function fillSolution(sg) {
      if (sg.solFilled) return;
      sg.solFilled = true;
      sg.sol.querySelector(".ue-sol-body").innerHTML = val(sg.cfg.solution);
    }

    function done(sg, how, live) {
      var sc = sg.cfg;
      var hadFocus = live && sg.box.contains(document.activeElement);
      sg.ss.st = how;
      if (sc.type === "mc") {
        sg.opts.forEach(function (x) {
          var on = sc.anyOk ? x.cfg.id === sg.ss.pick : !!x.cfg.ok;
          x.btn.classList.toggle("is-ok", on);
          x.btn.classList.remove("is-miss");
          x.btn.setAttribute("aria-pressed", String(on));
          if (!on) x.btn.disabled = true;
        });
      } else {
        sc.fields.forEach(function (f) {
          var o = sg.F[f.id], inp = o.input;
          if (how === 2 || (f.optional && !inp.value.trim())) {
            inp.value = fm(expectOf(f), f.show !== undefined ? f.show : f.dec === undefined ? 2 : f.dec);
            inp.classList.add("ue-shown");
          }
          inp.readOnly = true;
          inp.classList.remove("is-miss");
          inp.classList.add("is-ok");
          inp.removeAttribute("aria-invalid");
          sg.ss.vals[f.id] = inp.value;
        });
      }
      sg.box.classList.add(how === 1 ? "is-solved" : "is-revealed");
      sg.actions.hidden = true;
      sg.tipsEl.hidden = true;
      sg.fb.className = "feedback ue-fb " + (how === 1 ? "ok" : "is-shown");
      sg.fb.innerHTML = how === 1 ? (val(sc.okText) || PRAISE[(sg.k + sg.part.idx) % PRAISE.length])
        : "Hier ist die Lösung. Lies den Rechenweg und probier es später noch einmal allein.";
      var why = val(sc.why);
      if (why) { sg.why.innerHTML = why; sg.why.hidden = false; }
      if (sg.sol) {
        sg.sol.hidden = false;
        sg.sol.querySelector("summary").textContent = how === 2 ? "Lösung mit Rechenweg" : "Rechenweg ansehen";
        if (how === 2) { fillSolution(sg); sg.sol.open = true; }
      }
      var nx = sg.part.stages[sg.k + 1];
      if (nx) nx.box.hidden = false;
      if (sc.onDone) sc.onDone(how, live, sheet);
      if (!live) return;
      sheet.save();
      refresh(sg.part);
      if (hadFocus) {
        var target = nx ? nx.box.querySelector("input:not([readonly]), .ue-opt:not([disabled]), button") : sg.fb;
        if (target) target.focus({ preventScroll: !nx });
      }
    }

    /* ---------- Zustand anzeigen ---------- */

    function refresh(justPart) {
      if (sheet.restoring) return;
      var nDone = 0, nRev = 0, cur = null, total = sheet.parts.length;
      dots.innerHTML = "";
      sheet.parts.forEach(function (p) {
        var s = partState(p);
        if (s) nDone++;
        if (s === 2) nRev++;
        if (!s && !cur) cur = p;
      });
      sheet.parts.forEach(function (p) {
        var s = partState(p), state = s === 1 ? "solved" : s === 2 ? "revealed" : p === cur ? "current" : "todo";
        p.li.setAttribute("data-state", state);
        p.stateLbl.textContent = s === 1 ? "gelöst" : s === 2 ? "mit Lösung" : p === cur ? "jetzt dran" : "";
        dots.appendChild(H("span", { class: "ue-dot is-" + state }));
        if (s && !p.visualBuilt && p.cfg.visual) {
          p.visualBuilt = true;
          p.visual.hidden = false;
          p.cfg.visual(p.visual, sheet);
        }
      });
      var unit = nDone === 1 && total === 1 ? cfg.unit[0] : cfg.unit[1];
      progT.textContent = nDone + " von " + total + " " + unit + " gelöst" + (nRev ? " (" + nRev + " mit Lösung)" : "");
      if (justPart && partState(justPart) && cur && !isOpen(cur)) setOpen(cur, true, true);
      if (cfg.onChange) cfg.onChange(sheet);
      if (nDone === total) {
        var wasHidden = fin.hidden;
        fin.hidden = false;
        fin.className = "ue-final " + (nRev ? "is-partial" : "is-full");
        var revNames = sheet.parts.filter(function (p) { return partState(p) === 2; }).map(function (p) { return p.cfg.name || p.cfg.mark; });
        finText.innerHTML = nRev
          ? "<strong>" + LM.esc(cfg.badge) + " ist durch.</strong> Bei " + LM.esc(revNames.join(", ")) + " hast du die Lösung angesehen. Klick oben auf „Von vorn“, wenn du es noch einmal allein probieren willst."
          : "<strong>Stark! " + LM.esc(cfg.badge) + " hast du komplett selbst gelöst.</strong> " + (cfg.finalNote || "Unten kannst du alles mit R nachprüfen.");
        if (justPart && wasHidden && !nRev) LM.celebrate(fin);
      } else fin.hidden = true;
    }

    /* ---------- Gespeicherten Stand wiederherstellen ---------- */

    sheet.parts.forEach(function (p) {
      p.stages.forEach(function (sg, k) {
        if (k > 0 && !sheet.done(p.stages[k - 1].id)) sg.box.hidden = true;
        if (sg.ss.st) done(sg, sg.ss.st, false);
        else for (var i = 0; i < (sg.ss.tips || 0); i++) showTip(sg, false);
      });
    });
    var firstOpen = null;
    sheet.parts.forEach(function (p) { if (!firstOpen && !partState(p)) firstOpen = p; });
    sheet.parts.forEach(function (p) {
      setOpen(p, st.open[p.id] !== undefined ? !!st.open[p.id] : p === (firstOpen || sheet.parts[0]), false);
    });
    sheet.restoring = false;
    refresh(null);
    return sheet;
  }

  function register(name, make) {
    LM.widget(name, function (el) {
      function start(focus) {
        el.innerHTML = "";
        el.className = "widget ue";
        var cfg = make();
        buildSheet(el, cfg, function () { LM.store.set(cfg.key, null); start(true); });
        if (focus) { var b = el.querySelector(".ue-pbtn"); if (b) b.focus({ preventScroll: true }); }
      }
      start(false);
    });
  }

  /* =====================================================================
     Grafiken (SVG, responsiv, Farben nur über Klassen)
     ===================================================================== */

  function E(tag, attrs, parent) { return LM.svg.el(tag, attrs, parent); }
  function TX(parent, x, y, str, attrs) { return LM.svg.text(parent, x, y, str, attrs); }
  // Dreieck mit Spitze bei (x, y), nach oben zeigend (Mittel-Marke wie auf der ganzen Seite)
  function tri(parent, x, y, cls, s) { s = s || 7; return E("path", { class: cls, d: "M" + x + " " + y + "l" + s + " " + 1.6 * s + "h" + -2 * s + "z" }, parent); }

  // SVG, das sich bei jeder Breitenänderung neu zeichnet. draw(svg, W) gibt die Höhe zurück.
  function svgChart(host, aria, draw) {
    var wrap = H("div", { class: "chart ue-chart" });
    host.appendChild(wrap);
    var svg = E("svg", { class: "ue-svg", role: "img", "aria-label": aria }, wrap);
    var api = { wrap: wrap, svg: svg, W: 0 };
    function render() {
      if (!api.W) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var hgt = draw(svg, api.W);
      svg.setAttribute("viewBox", "0 0 " + api.W + " " + hgt);
      svg.setAttribute("width", api.W);
      svg.setAttribute("height", hgt);
    }
    LM.svg.responsive(wrap, function (w) { api.W = w; render(); });
    api.redraw = function () { api.W = wrap.clientWidth || api.W; render(); };
    api.aria = function (s) { svg.setAttribute("aria-label", s); };
    return api;
  }
  function textW(t, fallback) { var w = 0; try { w = t.getComputedTextLength(); } catch (e) { w = 0; } return w || fallback; }
  function caption(host, html) { host.appendChild(H("p", { class: "ue-cap", html: html })); }

  /* ---------- Aufgabe 9: Strichliste ---------- */

  function tally(host, sheet, a9, spans) {
    var note = H("span", { class: "ue-tally-note", attrs: { role: "status", "aria-live": "polite" }, text: "Oder zähl selbst, mit Papier und Stift." });
    var btn = H("button", { class: "btn btn-sm", attrs: { type: "button" }, text: "Auszählen" });
    var grid = H("div", { class: "ue-tally", attrs: { role: "group", "aria-label": "Strichliste der Noten 1 bis 5" } });
    var cols = a9.values.map(function (v) {
      var groups = H("div", { class: "ue-tgroups" }), cnt = H("div", { class: "ue-tcount" });
      grid.appendChild(H("div", { class: "ue-tcol" }, [H("div", { class: "ue-thead", text: "Note " + v }), groups, cnt]));
      return { v: v, groups: groups, cnt: cnt, n: 0, svg: null };
    });
    host.appendChild(H("div", { class: "ue-tally-bar" }, [btn, note]));
    host.appendChild(grid);
    var raf = 0;
    function addStroke(c) {
      var s = c.n % 5;
      if (!s) c.svg = E("svg", { class: "ue-tg", viewBox: "0 0 28 22", width: 28, height: 22, "aria-hidden": "true" }, c.groups);
      if (s < 4) E("line", { x1: 5 + s * 5.5, y1: 3, x2: 5 + s * 5.5, y2: 19 }, c.svg);
      else E("line", { x1: 1.5, y1: 16.5, x2: 26.5, y2: 5.5 }, c.svg);
      c.n++;
    }
    function clear() {
      cols.forEach(function (c) { c.groups.innerHTML = ""; c.n = 0; });
      spans.forEach(function (s) { s.classList.remove("is-counted", "is-now"); });
    }
    function finished(live) {
      grid.classList.add("is-full");
      btn.disabled = false;
      btn.textContent = "Noch mal zählen";
      if (live) note.textContent = "Fertig. Jeder Strich ist eine Note. Zähl jetzt die Striche: Ein Bündel sind 5.";
      else note.textContent = "Jeder Strich ist eine Note. Ein Bündel sind 5.";
      if (live) sheet.ui("tally", true);
    }
    function fillAll(live) {
      clear();
      NOTEN.forEach(function (v, i) { addStroke(cols[v - 1]); spans[i].classList.add("is-counted"); });
      finished(live);
    }
    function run() {
      if (LM.reduceMotion) { fillAll(true); return; }
      cancelAnimationFrame(raf);
      clear();
      grid.classList.remove("is-full");
      btn.disabled = true;
      note.textContent = "Ich gehe die Noten der Reihe nach durch …";
      var i = 0, t0 = 0, PER = 30;
      raf = requestAnimationFrame(function frame(t) {
        if (!t0) t0 = t;
        var target = Math.min(NOTEN.length, Math.floor((t - t0) / PER) + 1);
        while (i < target) {
          if (i) spans[i - 1].classList.remove("is-now");
          spans[i].classList.add("is-counted", "is-now");
          addStroke(cols[NOTEN[i] - 1]);
          i++;
        }
        if (i < NOTEN.length) raf = requestAnimationFrame(frame);
        else { spans[i - 1].classList.remove("is-now"); raf = 0; finished(true); }
      });
    }
    btn.addEventListener("click", run);
    if (sheet.ui("tally")) fillAll(false);
    return {
      showCounts: function (on) {
        cols.forEach(function (c, j) { c.cnt.textContent = on ? "h = " + a9.h[j] : ""; });
        grid.classList.toggle("has-counts", !!on);
      }
    };
  }

  /* ---------- Aufgabe 9: Stabdiagramm wie plot(f, type = "h") ---------- */

  function stickChart(host, a9, marks) {
    var aria = "Stabdiagramm der relativen Häufigkeiten: " + a9.values.map(function (v, j) { return "Note " + v + ": " + fm(a9.f[j]); }).join(", ") +
      (marks ? ". Modus " + fm(a9.mode, 0) + ", Mittel " + fm(a9.mean) + "." : ".");
    return svgChart(host, aria, function (svg, W) {
      var padL = 40, padR = 12, top = marks ? 44 : 28, ph = W < 480 ? 150 : 180, y0 = top + ph;
      var x = LM.svg.scale(0.5, 5.5, padL, W - padR), y = LM.svg.scale(0, 0.5, y0, top);
      [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach(function (t) {
        E("line", { class: "gridline", x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
        TX(svg, padL - 7, y(t) + 4, fm(t, 1), { class: "tick", "text-anchor": "end" });
      });
      TX(svg, 4, 12, "relative Häufigkeit", { class: "axis-label" });
      E("line", { class: "ax", x1: padL, x2: W - padR, y1: y0, y2: y0 }, svg);
      a9.values.forEach(function (v, j) {
        var isMod = marks && v === a9.mode;
        E("line", { class: "ue-stick" + (isMod ? " is-mod" : ""), x1: x(v), x2: x(v), y1: y0, y2: y(a9.f[j]) }, svg);
        TX(svg, x(v), y(a9.f[j]) - 8, fm(a9.f[j]), { class: isMod ? "lbl lbl-mod" : "ue-vlab", "text-anchor": "middle" });
        TX(svg, x(v), y0 + 17, String(v), { class: "tick", "text-anchor": "middle" });
        if (isMod) TX(svg, x(v), y(a9.f[j]) - 24, "Modus = " + fm(a9.mode, 0), { class: "lbl lbl-mod", "text-anchor": "middle" });
      });
      TX(svg, W - padR, y0 + 34, "Note", { class: "axis-label", "text-anchor": "end" });
      if (marks) {
        tri(svg, x(a9.mean), y0 + 3, "mk-mean", 6);
        TX(svg, x(a9.mean), y0 + 34, "Mittel = " + fm(a9.mean), { class: "lbl lbl-mean", "text-anchor": "middle" });
      }
      return y0 + 42;
    });
  }

  /* ---------- Aufgabe 9: empirische Verteilungsfunktion mit Ablese-Regler ---------- */

  function ecdfChart(host, a9) {
    var xsel = 2.5;
    var ch = svgChart(host, "Treppenfunktion F(x) der 100 Noten: 0 vor Note 1, dann " + a9.F.map(function (v) { return fm(v); }).join(", ") + ".", function (svg, W) {
      var padL = 40, padR = 14, top = 22, ph = W < 480 ? 170 : 210, y0 = top + ph;
      var x = LM.svg.scale(0, 6, padL, W - padR), y = LM.svg.scale(0, 1, y0, top);
      [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (t) {
        E("line", { class: "gridline", x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
        TX(svg, padL - 7, y(t) + 4, fm(t, 1), { class: "tick", "text-anchor": "end" });
      });
      TX(svg, 4, 12, "F(x)", { class: "axis-label" });
      E("line", { class: "ax", x1: padL, x2: W - padR, y1: y0, y2: y0 }, svg);
      for (var t = 0; t <= 6; t++) TX(svg, x(t), y0 + 17, String(t), { class: "tick", "text-anchor": "middle" });
      TX(svg, W - padR, y0 + 34, "x (Note)", { class: "axis-label", "text-anchor": "end" });
      // Ablesehilfe hinter der Treppe
      var fx = ecdfAt(a9.values, a9.F, xsel);
      E("line", { class: "ue-read", x1: x(xsel), x2: x(xsel), y1: y0, y2: y(fx) }, svg);
      E("line", { class: "ue-read", x1: padL, x2: x(xsel), y1: y(fx), y2: y(fx) }, svg);
      var vals = a9.values, F = a9.F, prev = 0;
      E("line", { class: "ue-step", x1: x(0), x2: x(vals[0]), y1: y(0), y2: y(0) }, svg);
      vals.forEach(function (v, j) {
        var nx = j < vals.length - 1 ? vals[j + 1] : 6;
        E("line", { class: "ue-jump", x1: x(v), x2: x(v), y1: y(prev), y2: y(F[j]) }, svg);
        E("line", { class: "ue-step", x1: x(v), x2: x(nx), y1: y(F[j]), y2: y(F[j]) }, svg);
        TX(svg, (x(v) + x(nx)) / 2, y(F[j]) - 8, fm(F[j]), { class: "ue-vlab", "text-anchor": "middle" });
        E("circle", { class: "ue-open", cx: x(v), cy: y(prev), r: 4.5 }, svg);
        E("circle", { class: "ue-fill", cx: x(v), cy: y(F[j]), r: 4.5 }, svg);
        prev = F[j];
      });
      E("circle", { class: "ue-read-dot", cx: x(xsel), cy: y(fx), r: 6 }, svg);
      return y0 + 42;
    });
    var id = uid("x");
    var slider = H("input", { class: "slider ue-slider", attrs: { id: id, type: "range", min: "0", max: "6", step: "0.5", value: String(xsel) } });
    var out = H("p", { class: "ue-read-out", attrs: { role: "status", "aria-live": "polite" } });
    function upd() {
      var fx = ecdfAt(a9.values, a9.F, xsel), n = Math.round(fx * a9.n);
      out.innerHTML = T("F(" + tn(xsel, 1) + ") = " + tn(fx)) + " &nbsp;→&nbsp; " + n + " von " + a9.n + " Noten sind höchstens " + fm(xsel, 1) + ".";
      slider.setAttribute("aria-valuetext", "x = " + fm(xsel, 1) + ", F = " + fm(fx));
    }
    slider.addEventListener("input", function () { xsel = Number(slider.value); upd(); ch.redraw(); });
    host.appendChild(H("div", { class: "ue-read-row" }, [H("label", { class: "field", attrs: { for: id }, text: "Lies ab bei x =" }), slider]));
    host.appendChild(out);
    upd();
    return ch;
  }

  /* ---------- Aufgabe 9: die 100 Plätze als Streifen ---------- */

  function placeStrip(host, a9, showQ) {
    var aria = "Die 100 sortierten Noten als Streifen. " + a9.blocks.map(function (b) { return "Note " + b.value + ": Platz " + b.from + " bis " + b.to; }).join(", ") +
      ". Median auf Platz 50 und 51: " + fm(a9.median, 0) + (showQ ? ". Q1 auf Platz 25 und 26: " + fm(a9.q1, 0) + ". Q3 auf Platz 75 und 76: " + fm(a9.q3, 0) : "") + ".";
    svgChart(host, aria, function (svg, W) {
      var pad = 12, narrow = W < 520, top = showQ ? 46 : 28, bh = 34, y2 = top + bh;
      var x = LM.svg.scale(0, 100, pad, W - pad);
      a9.blocks.forEach(function (b, j) {
        var x1 = x(b.from - 1), x2 = x(b.to), w = x2 - x1;
        E("rect", { class: "ue-blk ue-blk-" + (j % 2), x: x1, y: top, width: w, height: bh }, svg);
        TX(svg, (x1 + x2) / 2, top + bh / 2 + 5, w > 52 ? "Note " + b.value : String(b.value), { class: "ue-blk-t", "text-anchor": "middle" });
      });
      [1, 25, 50, 75, 100].forEach(function (p) {
        E("line", { class: "ax", x1: x(p - 0.5), x2: x(p - 0.5), y1: y2, y2: y2 + 5 }, svg);
        TX(svg, x(p - 0.5), y2 + 18, p === 1 ? "Platz 1" : String(p), { class: "tick", "text-anchor": p === 1 ? "start" : p === 100 ? "end" : "middle" });
      });
      function marker(pos, cls, lineCls, txt, row) {
        var ly = 14 + row * 18;
        E("line", { class: lineCls, x1: x(pos), x2: x(pos), y1: ly + 4, y2: y2 + 3 }, svg);
        var t = TX(svg, x(pos), ly, txt, { class: "lbl " + cls, "text-anchor": "middle" });
        var w = textW(t, txt.length * 6.5), cx = Math.max(pad + w / 2, Math.min(W - pad - w / 2, x(pos)));
        t.setAttribute("x", cx);
      }
      marker(50, "lbl-med", "ue-mline-med", narrow ? "Median = " + fm(a9.median, 0) : "Median = " + fm(a9.median, 0) + " (Platz 50 und 51)", 0);
      if (showQ) {
        marker(25, "lbl-q", "ue-mline-q", narrow ? "Q1 = " + fm(a9.q1, 0) : "Q1 = " + fm(a9.q1, 0) + " (Platz 25 und 26)", 1);
        marker(75, "lbl-q", "ue-mline-q", narrow ? "Q3 = " + fm(a9.q3, 0) : "Q3 = " + fm(a9.q3, 0) + " (Platz 75 und 76)", 1);
      }
      return y2 + 26;
    });
    host.appendChild(H("p", { class: "ue-legend", html: a9.blocks.map(function (b) { return "<span>Note " + b.value + ": Platz " + b.from + "–" + b.to + "</span>"; }).join("") }));
  }

  // kleine Tabelle für Lösungen: erste Spalte Zeilenkopf, Rest Zahlen
  function miniTable(head, rows) {
    var html = '<div class="table-wrap ue-tw"><table class="t ue-t"><thead><tr>' + head.map(function (c, i) {
      return "<th" + (i ? ' class="num"' : "") + ' scope="col">' + c + "</th>";
    }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html += "<tr>" + r.map(function (c, i) { return i ? '<td class="num">' + c + "</td>" : '<th scope="row">' + c + "</th>"; }).join("") + "</tr>";
    });
    return html + "</tbody></table></div>";
  }
  function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
  function inSet(v, list, tol) { for (var i = 0; i < list.length; i++) if (near(v, list[i], tol)) return true; return false; }

  /* =====================================================================
     Aufgabe 9: 100 Klausurnoten
     ===================================================================== */

  function makeA9() {
    var a = solveA9(), V = a.values, tl = null;
    var blk = function (v) { var b = a.blocks[v - 1]; return "Platz " + b.from + " bis " + b.to; };

    // Fünf Eingaben nebeneinander: Note 1 … Note 5, darunter auf Wunsch die laufende Summe
    function row5(prefix, head, sumTarget, sumDec) {
      return function (holder, F) {
        var grid = H("div", { class: "ue-row5" });
        V.forEach(function (v) {
          var o = F[prefix + v];
          o.label.textContent = "Note " + v;
          grid.appendChild(H("div", { class: "ue-cell5" }, [o.label, o.input]));
        });
        holder.appendChild(H("div", { class: "ue-row5-wrap" }, [H("span", { class: "ue-row5-h", html: head }), grid]));
        if (sumTarget === undefined) return;
        var out = H("p", { class: "ue-sum", attrs: { "aria-live": "polite" } });
        function upd() {
          var s = 0, all = true;
          V.forEach(function (v) { var x = LM.parseNum(F[prefix + v].input.value); if (isFinite(x)) s += x; else all = false; });
          var ok = all && near(s, sumTarget, 1e-6);
          out.className = "ue-sum" + (ok ? " is-ok" : "");
          out.textContent = all ? "Summe deiner Zahlen: " + fm(s, sumDec) + (ok ? " ✓" : " (es müssen " + fm(sumTarget, sumDec) + " sein)") : "Summe deiner Zahlen: " + fm(s, sumDec) + " …";
        }
        V.forEach(function (v) { F[prefix + v].input.addEventListener("input", upd); });
        upd();
      };
    }
    function fields5(prefix, exp, dec, aria, diag) {
      return V.map(function (v, j) {
        return { id: prefix + v, expect: exp[j], dec: dec, w: "s", aria: aria + " für Note " + v, example: dec ? "0,13" : "13",
          diag: function (x, ctx) { return diag(j, x, ctx); } };
      });
    }
    function sumOf(ctx, prefix) {
      var s = 0, all = true;
      V.forEach(function (v) { var x = ctx.v[prefix + v]; if (isFinite(x)) s += x; else all = false; });
      return all ? s : NaN;
    }
    var hRow = ["<i>h</i><sub>j</sub>"].concat(a.h.map(String)).concat(["100"]);
    var fRow = ["<i>f</i><sub>j</sub>"].concat(a.f.map(function (v) { return fm(v); })).concat(["1"]);
    var head5 = ["Note <i>a</i><sub>j</sub>"].concat(V.map(String)).concat(["Summe"]);
    var sAt = function (p) { return a.sorted[p - 1]; };

    return {
      key: "ue-a9", badge: "Aufgabe 9", title: "100 Klausurnoten auswerten", unit: ["Teil", "Teilen"],
      sub: "Vier Teile: Häufigkeiten, Verteilungsfunktion, Lagemaße, Quantile. Rechne selbst, dann prüf. Die Grafik erscheint, sobald ein Teil gelöst ist.",
      finalNote: "Unten kannst du alles mit R nachprüfen, genau wie es das Blatt verlangt.",
      onChange: function (sheet) { if (tl) tl.showCounts(!!sheet.done("a.h")); },
      intro: function (box, sheet) {
        var spans = [];
        var rows = NOTEN_ROWS.map(function (r) {
          return H("div", { class: "ue-grow" }, r.split("").map(function (d) { var s = H("span", { class: "ue-g", text: d }); spans.push(s); return s; }));
        });
        var data = H("div", { class: "ue-data" }, [
          H("p", { class: "ue-data-t", html: "Die 100 Noten, wie auf dem Blatt" }),
          H("div", { class: "ue-grades", attrs: { role: "img", "aria-label": "Die 100 Noten: " + NOTEN.join(" ") } }, rows)
        ]);
        box.appendChild(data);
        tl = tally(data, sheet, a, spans);
      },
      parts: [
        {
          id: "a", mark: "a", name: "Teil a", title: "Häufigkeiten und Stabdiagramm",
          how: [
            "Zähl für jede Note, wie oft sie vorkommt. Das ist die <b>absolute Häufigkeit</b> " + sym("h", "j") + ".",
            "Probe: Zusammen müssen es " + T("n = 100") + " sein.",
            "Teil jede Anzahl durch " + T("n = 100") + ". Das ist die <b>relative Häufigkeit</b> " + sym("f", "j") + ", also der Anteil.",
            "Zeichne für jede Note einen senkrechten Strich, so hoch wie " + sym("f", "j") + ". Das ist das Stabdiagramm."
          ],
          stages: [
            {
              id: "h", prompt: "Wie oft kommt jede Note vor? Die Strichliste oben hilft dir.",
              fields: fields5("h", a.h, 0, "Anzahl h", function (j, x) {
                if (near(x, a.n)) return "100 ist die Zahl aller Noten. Gesucht ist, wie oft Note " + V[j] + " vorkommt.";
                if (near(x, a.h[j], 3)) return "Bei Note " + V[j] + " bist du knapp daneben. Zähl die Bündel in der Strichliste noch einmal: Jedes Bündel sind 5 Striche.";
                return null;
              }),
              layout: row5("h", sym("h", "j"), a.n, 0),
              cross: function (ctx) {
                var s = sumOf(ctx, "h");
                return isFinite(s) && !near(s, a.n) ? "Deine Anzahlen ergeben zusammen " + fm(s, 0) + ". Es sind aber 100 Noten. Irgendwo fehlt etwas oder ist doppelt." : null;
              },
              tips: [
                "Klick oben auf „Auszählen“. Dann entsteht für jede Note eine Strichliste.",
                "Ein Bündel aus vier Strichen mit Querstrich zählt 5. Zähl erst die Bündel, dann die einzelnen Striche. Beispiel: 3 Bündel und 2 Striche sind " + T("3 \\cdot 5 + 2 = 17") + ".",
                "Note 1 kommt " + a.h[0] + "-mal vor. Und alle Anzahlen zusammen müssen 100 ergeben (Folie 35)."
              ],
              okText: "Richtig! Zusammen " + a.h.join(" + ") + " = 100 Noten.",
              solution: function () {
                return "<p>Für jede Note zählst du, wie oft sie vorkommt:</p>" + miniTable(head5, [hRow]) +
                  TD(a.h.join(" + ") + " = 100 = n") + ref("Folie 32: absolute Häufigkeit " + sym("h", "j") + " · Folie 35: alle " + sym("h", "j") + " zusammen ergeben n · in R: <code>table(x)</code>, Folie 41");
              }
            },
            {
              id: "f", prompt: "Jetzt die relativen Häufigkeiten: " + T("f_j = h_j \\div n") + ".",
              fields: fields5("f", a.f, 2, "Anteil f", function (j, x) {
                if (near(x, a.h[j])) return "Bei Note " + V[j] + " steht noch die Anzahl. Teil sie durch " + T("n = 100") + ".";
                if (near(x, a.h[j] / 5, 0.006)) return "Teil durch " + T("n = 100") + " (alle Noten), nicht durch die 5 Notenstufen.";
                if (near(x, a.h[j] / 10, 0.006)) return "Fast: Durch 100 teilen heißt, das Komma um <b>zwei</b> Stellen nach links zu schieben.";
                return null;
              }),
              layout: row5("f", sym("f", "j"), 1, 2),
              cross: function (ctx) {
                var s = sumOf(ctx, "f");
                return isFinite(s) && !near(s, 1, 0.011) ? "Deine Anteile ergeben zusammen " + fm(s) + ". Es muss genau 1 herauskommen (Folie 35)." : null;
              },
              tips: [
                "Relative Häufigkeit heißt: Anteil an allen. Also Anzahl geteilt durch n.",
                "Durch 100 teilen heißt: Komma um zwei Stellen nach links. Aus 25 wird 0,25.",
                "Note 1: " + T("f_1 = 13 \\div 100 = 0{,}13") + ". Alle " + sym("f", "j") + " zusammen ergeben 1."
              ],
              okText: "Richtig! Und zusammen ergeben die Anteile genau 1.",
              solution: function () {
                return "<p>Teil jede Anzahl durch " + T("n = 100") + ":</p>" + miniTable(head5, [hRow, fRow]) +
                  TD("f_j = \\frac{h_j}{n}, \\quad \\text{z. B. } f_3 = \\frac{" + a.h[2] + "}{100} = " + tn(a.f[2])) +
                  ref("Folie 32: " + sym("f", "j") + " = " + sym("h", "j") + " ÷ n · Folie 35: alle " + sym("f", "j") + " zusammen ergeben 1 · in R: <code>f &lt;- h / sum(h)</code>, Folie 41");
              }
            }
          ],
          visual: function (box) {
            stickChart(box, a, false);
            caption(box, "So zeichnet R das mit <code>plot(f, type = \"h\")</code> (Folie 42): dünne Striche statt breiter Säulen. Zwischen den Noten gibt es nichts, darum die Lücken.");
          }
        },
        {
          id: "b", mark: "b", name: "Teil b", title: "Empirische Verteilungsfunktion",
          how: [
            "Kumulieren heißt aufsummieren: " + T("F_j = f_1 + \\dots + f_j") + ".",
            sym("F", "j") + " ist der Anteil der Noten, die <b>höchstens</b> j sind. " + sym("F", "2") + " ist also der Anteil der Noten 1 und 2.",
            "Der letzte Wert ist immer 1, denn alle Noten sind höchstens 5.",
            "Zeichnen: eine Treppe. An jeder Note springt F um " + sym("f", "j") + " nach oben."
          ],
          stages: [
            {
              id: "F", prompt: "Rechne die kumulierten relativen Häufigkeiten " + sym("F", "j") + " aus.",
              fields: fields5("F", a.F, 2, "kumulierter Anteil F", function (j, x) {
                if (j > 0 && near(x, a.f[j], 0.005)) return "Bei Note " + V[j] + " steht nur " + sym("f", V[j]) + ". Kumulieren heißt: alles bis hierhin zusammenzählen.";
                if (near(x, a.H[j])) return "Das ist die Anzahl " + sym("H", V[j]) + ". Teil sie noch durch " + T("n = 100") + ".";
                if (j === V.length - 1) return "Am Ende muss 1 stehen: Alle 100 Noten sind höchstens 5.";
                return null;
              }),
              layout: row5("F", sym("F", "j")),
              cross: function (ctx) {
                for (var j = 1; j < V.length; j++) if (ctx.v["F" + V[j]] < ctx.v["F" + V[j - 1]] - 1e-9) return "F wird nie kleiner. Es kommt ja immer etwas dazu.";
                return null;
              },
              tips: [
                T("F_1 = f_1 = 0{,}13") + ". Dann zählst du immer das nächste " + sym("f", "j") + " dazu.",
                T("F_2 = 0{,}13 + 0{,}25 = 0{,}38") + ". Danach " + T("F_3 = 0{,}38 + 0{,}42") + " und so weiter.",
                "Mit den Plätzen geht es auch: Die Zweien enden bei Platz " + a.H[1] + ", also " + T("F_2 = " + a.H[1] + " \\div 100") + "."
              ],
              okText: "Richtig! Die Treppe endet bei 1.",
              solution: function () {
                var cases = "F(x) = \\begin{cases} 0 & x < " + V[0] + " \\\\ " + V.map(function (v, j) {
                  return tn(a.F[j]) + " & " + (j < V.length - 1 ? v + " \\le x < " + V[j + 1] : "x \\ge " + v);
                }).join(" \\\\ ") + " \\end{cases}";
                return "<p>Zähl die Anteile von links nach rechts zusammen:</p>" +
                  miniTable(head5.slice(0, 6), [hRow.slice(0, 6), ["<i>H</i><sub>j</sub>"].concat(a.H.map(String)), fRow.slice(0, 6), ["<i>F</i><sub>j</sub>"].concat(a.F.map(function (v) { return fm(v); }))]) +
                  "<p>Als Funktion für jede Zahl x:</p>" + TD(cases) +
                  "<p>An jeder Note springt F um " + sym("f", "j") + " nach oben. Der Punkt am linken Ende jeder Stufe gehört dazu (gefüllt). Am Sprung zeigt ein leerer Kreis, wo die Stufe davor endet.</p>" +
                  ref("Folie 49: H(x) und F(x) · Folie 50: Beispiel mit Noten · Folie 51: Eigenschaften · in R: <code>ecdf(x)</code>, Folie 52");
              }
            }
          ],
          visual: function (box) {
            ecdfChart(box, a);
            caption(box, "Gefüllter Punkt: Dieser Wert gilt genau an der Note. Leerer Kreis: Dort endet die Stufe davor. Stell den Regler auf 2: Dann gilt schon " + fm(a.F[1]) + ".");
          }
        },
        {
          id: "c", mark: "c", name: "Teil c", title: "Modus, Median und Mittel",
          how: [
            "<span class=\"t-mod\"><b>Modus</b></span>: die Note, die am häufigsten vorkommt. Die Antwort ist die Note, nicht die Anzahl.",
            "<span class=\"t-med\"><b>Median</b></span>: " + T("n = 100") + " ist gerade. Du brauchst die Plätze 50 und 51 der sortierten Noten.",
            "<span class=\"t-mean\"><b>Mittel</b></span>: Jede Note zählt so oft, wie sie vorkommt: " + T("(1 \\cdot h_1 + 2 \\cdot h_2 + \\dots + 5 \\cdot h_5) \\div 100") + "."
          ],
          stages: [
            {
              id: "m", prompt: "Trag alle drei Lagemaße ein.",
              fields: [
                { id: "mod", label: '<span class="t-mod">Modus</span>', expect: a.mode, dec: 0, w: "s", example: "2",
                  diag: function (x) {
                    if (inSet(x, a.h)) return "Das ist eine Anzahl. Gesucht ist die Note, die am häufigsten vorkommt.";
                    return "Der Modus ist die Note mit der größten Anzahl. Schau in deine Tabelle aus Teil a.";
                  } },
                { id: "med", label: '<span class="t-med">Median</span>', expect: a.median, dec: 2, w: "s", example: "2",
                  diag: function (x) {
                    if (inSet(x, [50, 51, 50.5])) return "Das ist der Platz, nicht der Wert. Welche Note steht auf Platz 50 und 51?";
                    if (inSet(x, a.h)) return "Das ist eine Anzahl. Gesucht ist die Note auf Platz 50 und 51.";
                    if (x >= 1 && x <= 5) return "Schau, welche Note auf Platz 50 und 51 steht. Die Note " + Math.round(x) + " belegt " + blk(Math.min(5, Math.max(1, Math.round(x)))) + ".";
                    return "Schau, welche Note auf den Plätzen 50 und 51 steht.";
                  } },
                { id: "mean", label: '<span class="t-mean">Mittel</span>', expect: a.mean, dec: 2, w: "m", example: "2,5",
                  diag: function (x) {
                    if (near(x, a.meanOfLevels)) return "3 ist das Mittel der Zahlen 1 bis 5. Aber die Noten kommen verschieden oft vor: Jede Note zählt so oft, wie sie vorkommt.";
                    if (near(x, a.sum)) return "273 ist die Summe aller Noten. Teil noch durch " + T("n = 100") + ".";
                    if (near(x, a.sum / 5, 0.01)) return "Teil durch " + T("n = 100") + " (alle Noten), nicht durch die 5 Notenstufen.";
                    if (near(x, a.mean, 0.06)) return "Fast! Rechne genauer und runde auf zwei Nachkommastellen.";
                    return null;
                  } }
              ],
              tips: [
                "Modus: Such in deiner Tabelle aus Teil a die größte Anzahl. Die Note dazu ist der Modus.",
                "Median: Sortiert kommen erst " + a.h[0] + " Einsen (" + blk(1) + "), dann " + a.h[1] + " Zweien (" + blk(2) + "), dann " + a.h[2] + " Dreien (" + blk(3) + "). Welche Note steht auf Platz 50 und 51?",
                "Mittel: " + T(a.products.map(function (p, j) { return V[j] + " \\cdot " + a.h[j]; }).join(" + ") + " = " + a.sum) + ". Jetzt noch durch 100 teilen."
              ],
              okText: "Richtig! Modus " + fm(a.mode, 0) + ", Median " + fm(a.median, 0) + ", Mittel " + fm(a.mean) + ".",
              why: function () {
                return "<p><b>Übrigens:</b> Das Mittel ist etwas kleiner als der Median: " + T("\\bar{x} - \\tilde{x} = " + tn(a.mean) + " - " + tn(a.median) + " = " + tn(a.diff) + " < 0") +
                  ". Nach Folie 140 ist die Verteilung also tendenziell <b>" + a.direction + "</b>: Der längere Ausläufer liegt bei den guten Noten. Mehr dazu in <a href=\"#schiefe\">Kapitel 9</a>.</p>" +
                  "<p>Noten sind streng genommen ordinal. Das Blatt fragt trotzdem nach dem Mittel, wie Folie 111 (siehe <a href=\"#wahl\">Kapitel 10</a>).</p>";
              },
              solution: function () {
                return "<p><span class=\"t-mod\"><b>Modus:</b></span> Die größte Anzahl ist " + T("h_3 = " + a.modeCount) + ". Also " + T("x_{mod} = " + a.mode) + " (Folie 92).</p>" +
                  "<p><span class=\"t-med\"><b>Median:</b></span> " + T("n = 100") + " ist gerade (Folie 94):</p>" +
                  TQ("n = 100", "\\tilde{x}", 50, sAt(50), sAt(51), a.median, 0) +
                  "<p>Platz 50 und 51 liegen beide im Block der Dreien (" + blk(3) + ").</p>" +
                  "<p><span class=\"t-mean\"><b>Mittel:</b></span> Jede Note mal ihre Anzahl, alles zusammen, durch n (Folie 111):</p>" +
                  TA(["\\bar{x} &= \\frac{1}{n} \\sum_j h_j \\cdot a_j", "&= \\frac{" + a.products.join(" + ") + "}{100}", "&= \\frac{" + a.sum + "}{100} = " + tn(a.mean)]) +
                  ref("Folie 92: Modus · Folie 94: Median · Folie 111: Mittel aus der Häufigkeitstabelle");
              }
            }
          ],
          visual: function (box) {
            stickChart(box, a, true);
            placeStrip(box, a, false);
            caption(box, "Oben: Der höchste Stab ist der Modus, das Dreieck zeigt das Mittel. Unten: alle 100 Noten sortiert. Platz 50 und 51 liegen mitten im Block der Dreien.");
          }
        },
        {
          id: "d", mark: "d", name: "Teil d", title: "0,25- und 0,75-Quantil",
          how: [
            "Rechne " + T("n \\cdot p") + ". Für " + T("p = 0{,}25") + ": " + T("100 \\cdot 0{,}25 = 25") + ".",
            "Ganze Zahl k? Dann nimm das Mittel aus Platz k und Platz k + 1 (Folie 101). Keine ganze Zahl? Dann aufrunden und den Wert auf diesem Platz nehmen.",
            "Schau nach, welche Note auf diesen Plätzen steht."
          ],
          stages: [
            {
              id: "q", prompt: "Bestimme das 0,25-Quantil " + T("Q_1") + " und das 0,75-Quantil " + T("Q_3") + ".",
              fields: [
                { id: "q1", label: '<span class="t-q">0,25-Quantil</span> ' + T("Q_1"), expect: a.q1, dec: 2, w: "s", example: "2",
                  diag: function (x) {
                    if (inSet(x, [25, 26, 25.5])) return "Das ist der Platz. Welche Note steht auf Platz 25 und 26?";
                    if (near(x, 2.5)) return "Platz 25 und 26 liegen beide im Block der Zweien (" + blk(2) + "). Das Mittel aus 2 und 2 ist 2.";
                    if (near(x, 1)) return "Die Einsen reichen nur bis Platz " + a.blocks[0].to + ".";
                    if (near(x, 3)) return "Die Dreien fangen erst bei Platz " + a.blocks[2].from + " an.";
                    return null;
                  } },
                { id: "q3", label: '<span class="t-q">0,75-Quantil</span> ' + T("Q_3"), expect: a.q3, dec: 2, w: "s", example: "3",
                  diag: function (x) {
                    if (inSet(x, [75, 76, 75.5])) return "Das ist der Platz. Welche Note steht auf Platz 75 und 76?";
                    if (near(x, 3.5)) return "Platz 75 und 76 liegen beide bei den Dreien (" + blk(3) + "). Das Mittel aus 3 und 3 ist 3.";
                    if (near(x, 4)) return "Die Vieren fangen erst bei Platz " + a.blocks[3].from + " an.";
                    if (near(x, 2)) return "Die Zweien enden schon bei Platz " + a.blocks[1].to + ".";
                    return null;
                  } }
              ],
              tips: [
                T("100 \\cdot 0{,}25 = 25") + " ist eine ganze Zahl. Also brauchst du " + T("\\tfrac12\\,[x_{(25)} + x_{(26)}]") + ".",
                "Note 2 belegt " + blk(2) + ". Platz 25 und 26 sind also beide eine 2.",
                "Für das 0,75-Quantil: " + T("100 \\cdot 0{,}75 = 75") + ", also Platz 75 und 76. Note 3 belegt " + blk(3) + "."
              ],
              okText: "Richtig! " + T("Q_1 = " + tn(a.q1)) + " und " + T("Q_3 = " + tn(a.q3)) + ".",
              why: "<p>Zwischen " + T("Q_1") + " und " + T("Q_3") + " liegt die mittlere Hälfte aller Noten, hier von " + fm(a.q1) + " bis " + fm(a.q3) + ".</p>",
              solution: function () {
                var same = near(a.q1t7, a.q1) && near(a.q3t7, a.q3);
                return TQ("100 \\cdot 0{,}25 = 25", "Q_1", 25, sAt(25), sAt(26), a.q1, 0) +
                  TQ("100 \\cdot 0{,}75 = 75", "Q_3", 75, sAt(75), sAt(76), a.q3, 0) +
                  "<p>Platz 25 und 26 liegen im Block der Zweien (" + blk(2) + "), Platz 75 und 76 im Block der Dreien (" + blk(3) + ").</p>" +
                  (same ? "<p>Ohne <code>type = 2</code> rechnet R mit einer anderen Regel (Typ 7). Hier kommt zufällig dasselbe heraus. Schreib <code>type = 2</code> trotzdem immer dazu.</p>" : "") +
                  ref("Folie 101: p-Quantil · Folie 104: Quartile · in R: <code>quantile(x, probs = c(0.25, 0.75), type = 2)</code>, Folie 103");
              }
            }
          ],
          visual: function (box) {
            placeStrip(box, a, true);
            caption(box, "Die gestrichelten Linien teilen die 100 Plätze in Viertel. Zwischen " + T("Q_1") + " und " + T("Q_3") + " liegt die mittlere Hälfte der Noten.");
          }
        }
      ],
      r: rA9
    };
  }

/* =====================================================================
     Gemeinsame Helfer für Aufgabe 10 bis 12
     ===================================================================== */

  // Breite eines SVG-Texts messen (ohne ihn stehen zu lassen)
  function measure(svg, str, cls) {
    var t = TX(svg, -9999, -9999, str, { class: cls });
    var w = textW(t, str.length * 6.8);
    svg.removeChild(t);
    return w;
  }
  // Beschriftungen in Reihen legen, damit sich nichts überlappt. Reihe 0 liegt am nächsten an der Grafik.
  // items: { x, text, cls, anchor? } → bekommt left, w, row. Rückgabe: Zahl der Reihen.
  function stackLabels(svg, items, W, pad) {
    var rows = [];
    items.forEach(function (it) {
      var w = measure(svg, it.text, it.cls), anchor = it.anchor || "middle";
      var left = anchor === "start" ? it.x + 4 : anchor === "end" ? it.x - w - 4 : it.x - w / 2;
      left = Math.max(pad, Math.min(W - pad - w, left));
      it.left = left;
      it.w = w;
      var r = 0;
      while (rows[r] && rows[r].some(function (o) { return left < o.left + o.w + 7 && o.left < left + w + 7; })) r++;
      (rows[r] = rows[r] || []).push(it);
      it.row = r;
    });
    return rows.length;
  }
  // Erst alle Hilfslinien, dann die Texte (mit Hof), damit Linien nie über Schrift liegen
  function drawLabels(svg, items, baseY, rowH, targetY) {
    items.forEach(function (it) {
      if (it.line === false) return;
      var y = baseY - it.row * rowH;
      E("line", { class: it.lineCls || "ue-lead", x1: it.x, x2: it.x, y1: y + 4, y2: it.ty !== undefined ? it.ty : targetY }, svg);
    });
    items.forEach(function (it) { TX(svg, it.left, baseY - it.row * rowH, it.text, { class: it.cls + " ue-halo" }); });
  }
  function diamond(parent, x, y, cls, s) {
    s = s || 6;
    return E("path", { class: cls, d: "M" + x + " " + (y - s) + "l" + s + " " + s + "l" + -s + " " + s + "l" + -s + " " + -s + "z" }, parent);
  }
  // Umschalter (.seg) mit aria-pressed; onPick(wert)
  function seg(label, options, current, onPick) {
    var box = H("div", { class: "seg", attrs: { role: "group", "aria-label": label } });
    var btns = options.map(function (o) {
      var b = H("button", { attrs: { type: "button", "aria-pressed": String(o.v === current) }, html: o.html });
      b.addEventListener("click", function () {
        if (b.disabled) return;
        btns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onPick(o.v);
      });
      box.appendChild(b);
      return b;
    });
    return { el: box, btns: btns, set: function (v) { options.forEach(function (o, i) { btns[i].setAttribute("aria-pressed", String(o.v === v)); }); },
      disable: function (on) { btns.forEach(function (b) { b.disabled = !!on; }); box.classList.toggle("is-locked", !!on); } };
  }
  function statTile(cls, label, value) {
    return H("div", { class: "stat " + cls }, [H("span", { class: "stat-label", html: label }), H("span", { class: "stat-value", html: value })]);
  }
  // Eingaben in einer Reihe mit Überschrift (wie bei Aufgabe 9), für beliebig viele Felder
  function rowLayout(ids, labels, head) {
    return function (holder, F) {
      var grid = H("div", { class: "ue-row5" });
      ids.forEach(function (id, i) {
        var o = F[id];
        o.label.innerHTML = labels[i];
        grid.appendChild(H("div", { class: "ue-cell5" }, [o.label, o.input]));
      });
      holder.appendChild(H("div", { class: "ue-row5-wrap" }, [H("span", { class: "ue-row5-h", html: head }), grid]));
    };
  }

  /* =====================================================================
     Aufgabe 10: 60 Reaktionszeiten
     ===================================================================== */

  // Boxplot der Reaktionszeiten, waagrecht. getRange() → 1.5 oder 0
  function rtBox(host, a, getRange) {
    return svgChart(host, "", function (svg, W) {
      var rg = getRange(), b = rg ? { lo: a.whiskerLo, hi: a.whiskerHi, out: a.out } : { lo: a.range0.lo, hi: a.range0.hi, out: [] };
      var pad = 12, narrow = W < 520, x = LM.svg.scale(50, 850, pad + 4, W - pad - 4);
      var items = [
        { x: x(a.median), text: "Median " + fm(a.median), cls: "lbl lbl-med", lineCls: "ue-lead ue-lead-med", kind: "box" },
        { x: x(a.q1), text: "Q1 " + fm(a.q1), cls: "lbl lbl-q", lineCls: "ue-lead ue-lead-q", anchor: "end", kind: "box" },
        { x: x(a.q3), text: "Q3 " + fm(a.q3), cls: "lbl lbl-q", lineCls: "ue-lead ue-lead-q", anchor: "start", kind: "box" },
        { x: x(b.lo), text: "Min " + fm(b.lo, 1), cls: "lbl ue-lbl-ink", kind: "mid" },
        { x: x(b.hi), text: (rg ? (narrow ? "" : "Whisker ") : "Max ") + fm(b.hi, 1), cls: "lbl ue-lbl-ink", kind: "mid" }
      ];
      b.out.forEach(function (v) { items.push({ x: x(v), text: (narrow ? "" : "Ausreißer ") + fm(v, 1), cls: "lbl lbl-q", kind: "mid" }); });
      if (rg) {
        items.push({ x: x(a.fences[1]), text: "Grenze " + fm(a.fences[1], 3), cls: "lbl ue-lbl-muted", lineCls: "ue-fence", kind: "fence" });
        items.push({ x: x(a.fences[0]), text: "Grenze " + fm(a.fences[0], 3), cls: "lbl ue-lbl-muted", lineCls: "ue-fence", anchor: "start", kind: "fence" });
      }
      var rowH = 17, nRows = stackLabels(svg, items, W, pad);
      var base = 14 + (nRows - 1) * rowH, boxTop = base + 16, bh = 36, mid = boxTop + bh / 2, ax = boxTop + bh + 16;
      items.forEach(function (it) { it.ty = it.kind === "fence" ? ax : it.kind === "mid" ? mid - 8 : boxTop; });
      drawLabels(svg, items, base, rowH, boxTop);
      E("line", { class: "whisker", x1: x(b.lo), x2: x(a.q1), y1: mid, y2: mid }, svg);
      E("line", { class: "whisker", x1: x(a.q3), x2: x(b.hi), y1: mid, y2: mid }, svg);
      E("line", { class: "whisker", x1: x(b.lo), x2: x(b.lo), y1: mid - 9, y2: mid + 9 }, svg);
      E("line", { class: "whisker", x1: x(b.hi), x2: x(b.hi), y1: mid - 9, y2: mid + 9 }, svg);
      E("rect", { class: "box-q", x: x(a.q1), y: boxTop, width: x(a.q3) - x(a.q1), height: bh, rx: 3 }, svg);
      E("line", { class: "ue-medline", x1: x(a.median), x2: x(a.median), y1: boxTop, y2: boxTop + bh }, svg);
      b.out.forEach(function (v) { E("circle", { class: "dot-out", cx: x(v), cy: mid, r: 5.5 }, svg); });
      E("line", { class: "ax", x1: pad, x2: W - pad, y1: ax, y2: ax }, svg);
      LM.svg.ticks(100, 800, narrow ? 4 : 8).forEach(function (t) {
        E("line", { class: "ax", x1: x(t), x2: x(t), y1: ax, y2: ax + 5 }, svg);
        TX(svg, x(t), ax + 19, fm(t, 0), { class: "tick", "text-anchor": "middle" });
      });
      TX(svg, W - pad, ax + 37, "Reaktionszeit [ms]", { class: "axis-label", "text-anchor": "end" });
      svg.setAttribute("aria-label", "Boxplot der 60 Reaktionszeiten" + (rg ? " (R-Standard, range = 1,5)" : " (range = 0)") + ": Whisker von " + fm(b.lo, 1) + " bis " + fm(b.hi, 1) +
        ", Box von Q1 = " + fm(a.q1) + " bis Q3 = " + fm(a.q3) + ", Median " + fm(a.median) +
        (b.out.length ? ", Ausreißer " + b.out.map(function (v) { return fm(v, 1); }).join(" und ") : "") + ".");
      return ax + 44;
    });
  }

  // Punktdiagramm der 60 Zeiten mit Mittel, Median und (optional) getrimmtem Mittel.
  // Bereich 120 bis 400 ms maßstabsgetreu, die zwei Ausreißer rechts hinter einem Achsenbruch.
  function rtDots(host, a, getState) {
    var ch = svgChart(host, "", function (svg, W) {
      var st = getState(), pad = 12, narrow = W < 520, zone = narrow ? 84 : 104;
      var x1 = W - pad - zone - 12, x = LM.svg.scale(120, 400, pad + 6, x1);
      var zx = function (v) { return v < 600 ? x1 + 12 + zone * 0.24 : x1 + 12 + zone * 0.78; };
      var px = function (v) { return v <= 400 ? x(v) : zx(v); };
      var d = narrow ? 7 : 9, r = d / 2 - 0.6, stacks = {}, maxK = 0;
      var cutK = st.trim ? st.trim.k : 0;
      var dots = a.sorted.map(function (v, i) {
        var bin = Math.round(px(v) / d), k = stacks[bin] || 0;
        stacks[bin] = k + 1;
        maxK = Math.max(maxK, k + 1);
        var cls = "dot";
        if (st.noOut && a.out.indexOf(v) >= 0) cls = "ue-dot-gone";
        else if (cutK && (i < cutK || i >= a.n - cutK)) cls = "ue-dot-cut";
        return { cx: bin * d, k: k, cls: cls };
      });
      var m = st.noOut ? a.noOut.mean : a.mean, md = st.noOut ? a.noOut.median : a.median;
      var items = [
        { x: x(md), text: "Median " + fm(md), cls: "lbl lbl-med", lineCls: "ue-mline-med2" },
        { x: x(m), text: "Mittel " + fm(m), cls: "lbl lbl-mean", lineCls: "ue-mline-mean" }
      ];
      if (st.trim) items.push({ x: x(st.trim.value), text: (narrow ? "getr. " : "getrimmt ") + fm(st.trim.value), cls: "lbl lbl-mean", lineCls: "ue-mline-trim" });
      var rowH = 17, nRows = stackLabels(svg, items, W, pad);
      var base = 14 + (nRows - 1) * rowH, dotTop = base + 12, ax = dotTop + maxK * d + 6;
      drawLabels(svg, items, base, rowH, ax);
      dots.forEach(function (o) { E("circle", { class: o.cls, cx: o.cx, cy: ax - r - 2 - o.k * d, r: r }, svg); });
      // Achse mit Bruch
      E("line", { class: "ax", x1: pad, x2: x1 + 3, y1: ax, y2: ax }, svg);
      E("line", { class: "ax", x1: x1 + 9, x2: W - pad, y1: ax, y2: ax }, svg);
      E("path", { class: "ue-break", d: "M" + (x1 + 1) + " " + (ax + 6) + "l4 -12M" + (x1 + 7) + " " + (ax + 6) + "l4 -12" }, svg);
      LM.svg.ticks(150, 400, narrow ? 3 : 6).forEach(function (t) {
        if (t < 120 || t > (narrow ? 350 : 400)) return;
        E("line", { class: "ax", x1: x(t), x2: x(t), y1: ax, y2: ax + 4 }, svg);
        TX(svg, x(t), ax + 28, fm(t, 0), { class: "tick", "text-anchor": "middle" });
      });
      a.out.forEach(function (v) { TX(svg, zx(v), ax + 28, fm(v, 1), { class: "tick", "text-anchor": "middle" }); });
      tri(svg, x(m), ax + 2, "mk-mean", 6);
      if (st.trim) diamond(svg, x(st.trim.value), ax + 9, "ue-mk-trim", 5.5);
      TX(svg, W - pad, ax + 46, "Reaktionszeit [ms]", { class: "axis-label", "text-anchor": "end" });
      svg.setAttribute("aria-label", "Die 60 Reaktionszeiten als Punkte" + (st.noOut ? ", ohne die zwei Ausreißer" : "") + (st.trim ? ", die " + st.trim.k + " kleinsten und größten Werte gestrichen" : "") +
        ". Median " + fm(md) + ", Mittel " + fm(m) + (st.trim ? ", getrimmtes Mittel " + fm(st.trim.value) : "") + ". Die Ausreißer 519,6 und 794,5 stehen rechts hinter einem Achsenbruch.");
      return ax + 54;
    });
    return ch;
  }

  function makeA10() {
    var a = solveA10(), s = a.sorted, n = a.n, sheetRef = null, cells = null, legend = null, focusSet = [];
    var sAt = function (p) { return s[p - 1]; };
    var pl = function (ps) { return "Platz " + ps.join(" und "); };
    function choice() { var c = sheetRef && sheetRef.ui("trim"); return c === 5 ? 5 : 10; }

    // Plätze in der sortierten Tabelle einfärben, je nachdem, was schon gelöst ist
    function paint() {
      if (!cells) return;
      var sh = sheetRef, cls = {}, used = {};
      function add(ps, c) { ps.forEach(function (p) { cls[p] = (cls[p] ? cls[p] + " " : "") + c; }); used[c] = true; }
      if (sh.done("a.five")) { add([1, n], "is-ext"); add(a.q1Positions.concat(a.q3Positions), "is-q"); add(a.medianPositions, "is-med"); }
      if (sh.done("a.whisk")) add(a.outPositions, "is-out");
      if (sh.done("c.trim")) { var tr = a.trim[choice()]; add(tr.lowPositions.concat(tr.highPositions), "is-cut"); }
      cells.forEach(function (c, i) {
        var p = i + 1;
        c.className = "ue-sc" + (cls[p] ? " " + cls[p] : "") + (focusSet.indexOf(p) >= 0 ? " is-hl" : "");
      });
      var parts = [];
      if (used["is-q"]) parts.push('<span class="ue-key ue-key-q">Q1 und Q3: Platz 15/16 und 45/46</span>', '<span class="ue-key ue-key-med">Median: Platz 30/31</span>');
      if (used["is-out"]) parts.push('<span class="ue-key ue-key-out">Ausreißer</span>');
      if (used["is-cut"]) parts.push('<span class="ue-key ue-key-cut">beim Trimmen gestrichen</span>');
      legend.innerHTML = parts.join("");
      legend.hidden = !parts.length;
    }
    function focusOn(ps) { return function (on) { focusSet = on ? ps : []; paint(); }; }

    var trimSeg = null, dotsB = null, noOut = false;
    var tr = function () { return a.trim[choice()]; };
    var pct = function () { return choice() + "\u00a0%"; };

    return {
      key: "ue-a10", badge: "Aufgabe 10", title: "60 Reaktionszeiten: Boxplot, Mittel, Trimmen", unit: ["Teil", "Teilen"],
      sub: "Drei Teile. Das Blatt will die Zahlen aus R. Hier rechnest du sie einmal selbst, dann weißt du, was R da tut.",
      finalNote: "Unten steht der R-Code, mit dem du alles nachprüfen kannst.",
      onChange: function () { paint(); },
      intro: function (box, sheet) {
        sheetRef = sheet;
        var raw = H("details", { class: "ue-raw" }, [
          H("summary", { text: "Urliste aus Aufgabe 8 (60 Zeiten in ms, wie auf dem Blatt)" }),
          H("div", { class: "ue-raw-rows" }, chunk(RT, RT_ROW).map(function (row) {
            return H("div", { class: "ue-raw-row" }, row.map(function (v) { return H("span", { text: fm(v, 1) }); }));
          }))
        ]);
        var grid = H("div", { class: "ue-st", attrs: { role: "list", "aria-label": "Die 60 Zeiten sortiert, mit Platznummer" } });
        cells = s.map(function (v, i) {
          var c = H("div", { class: "ue-sc", attrs: { role: "listitem", "aria-label": "Platz " + (i + 1) + ": " + fm(v, 1) + " ms" } }, [
            H("span", { class: "ue-sc-p", text: String(i + 1) }), H("span", { class: "ue-sc-v", text: fm(v, 1) })
          ]);
          grid.appendChild(c);
          return c;
        });
        legend = H("p", { class: "ue-keys", attrs: { hidden: "" } });
        box.appendChild(H("div", { class: "ue-data" }, [
          raw,
          H("p", { class: "ue-data-t", html: "Sortiert: die kleine Zahl ist der Platz, die große die Zeit in ms" }),
          grid, legend
        ]));
      },
      parts: [
        {
          id: "a", mark: "a", name: "Teil a", title: "Boxplot: die Zahlen dafür",
          how: [
            "Die Liste oben ist schon sortiert. Min steht auf Platz 1, Max auf Platz 60.",
            "Quartile nach Folie 101: " + T("60 \\cdot 0{,}25 = 15") + " ist ganz, also Mittel aus Platz 15 und 16. Genauso " + T("60 \\cdot 0{,}5 = 30") + " (Median) und " + T("60 \\cdot 0{,}75 = 45") + ".",
            "R zieht die Whisker nicht immer bis Min und Max. Es rechnet erst zwei Grenzen mit " + T("1{,}5 \\cdot") + " Quartilabstand (Folie 108).",
            "Dann zeichnen: Achse, Box von Q1 bis Q3, Strich beim Median, Whisker, Ausreißer als Kreise."
          ],
          stages: [
            {
              id: "five", prompt: "Lies die fünf Zahlen ab. Klickst du in ein Feld, leuchten oben die passenden Plätze auf.",
              fields: [
                { id: "min", label: "Min", expect: a.min, dec: 1, w: "m", example: "134,8", focus: focusOn([1]),
                  diag: function (x) {
                    if (near(x, RT[0], 0.05)) return "232,4 ist der erste Wert der Urliste. Gesucht ist der kleinste Wert, also Platz 1 der sortierten Liste.";
                    return "Min ist der kleinste Wert: Platz 1 der sortierten Liste.";
                  } },
                { id: "q1", label: '<span class="t-q">Q1</span>', expect: a.q1, dec: 2, w: "m", example: "203,25", focus: focusOn(a.q1Positions),
                  diag: function (x) {
                    if (inSet(x, [15, 16, 15.5])) return "Das ist der Platz. Gesucht ist die Zeit auf diesem Platz.";
                    if (inSet(x, [sAt(15), sAt(16)], 0.05)) return "Das ist nur einer der beiden Werte. " + T("60 \\cdot 0{,}25 = 15") + " ist ganz: Nimm das Mittel aus Platz 15 und 16.";
                    if (near(x, a.q1t7, 0.006)) return "Das rechnet R ohne <code>type = 2</code> (Typ 7). In der Vorlesung gilt Folie 101: Mittel aus Platz 15 und 16.";
                    return null;
                  } },
                { id: "med", label: '<span class="t-med">Median</span>', expect: a.median, dec: 2, w: "m", example: "234,35", focus: focusOn(a.medianPositions),
                  diag: function (x) {
                    if (inSet(x, [30, 31, 30.5])) return "Das ist der Platz. Gesucht ist die Zeit.";
                    if (inSet(x, [sAt(30), sAt(31)], 0.05)) return "Bei n = 60 (gerade) brauchst du beide mittleren Werte: Mittel aus Platz 30 und 31.";
                    if (near(x, a.mean, 0.006)) return "Das ist das arithmetische Mittel. Der Median ist der Wert in der Mitte der sortierten Liste.";
                    return null;
                  } },
                { id: "q3", label: '<span class="t-q">Q3</span>', expect: a.q3, dec: 2, w: "m", example: "279", focus: focusOn(a.q3Positions),
                  diag: function (x) {
                    if (inSet(x, [45, 46, 45.5])) return "Das ist der Platz. Gesucht ist die Zeit.";
                    if (inSet(x, [sAt(45), sAt(46)], 0.05)) return "Das ist nur einer der beiden Werte. " + T("60 \\cdot 0{,}75 = 45") + " ist ganz: Mittel aus Platz 45 und 46.";
                    if (near(x, a.q3t7, 0.006)) return "Das rechnet R ohne <code>type = 2</code> (Typ 7). Nach Folie 101: Mittel aus Platz 45 und 46.";
                    return null;
                  } },
                { id: "max", label: "Max", expect: a.max, dec: 1, w: "m", example: "794,5", focus: focusOn([n]),
                  diag: function (x) {
                    if (near(x, RT[n - 1], 0.05)) return "307,8 ist der letzte Wert der Urliste. Gesucht ist der größte Wert, also Platz 60.";
                    if (near(x, a.whiskerHi, 0.05)) return "Gesucht ist hier das Maximum, Platz 60. Wo der Whisker endet, kommt gleich.";
                    return "Max ist der größte Wert: Platz 60 der sortierten Liste.";
                  } }
              ],
              tips: [
                T("60 \\cdot 0{,}25 = 15") + " ist eine ganze Zahl. Dann nimmst du das Mittel aus Platz 15 und Platz 16 (Folie 101).",
                "Platz 15 ist " + fm(sAt(15), 1) + ", Platz 16 ist " + fm(sAt(16), 1) + ". Also " + T("Q_1 = (" + tn(sAt(15), 1) + " + " + tn(sAt(16), 1) + ") \\div 2") + ".",
                "Median: Platz 30 und 31 (" + fm(sAt(30), 1) + " und " + fm(sAt(31), 1) + "). Q3: Platz 45 und 46 (" + fm(sAt(45), 1) + " und " + fm(sAt(46), 1) + ")."
              ],
              okText: "Richtig! Das sind die fünf Zahlen für den Boxplot mit range = 0.",
              solution: function () {
                return TD("x_{(1)} = " + tn(a.min, 1) + ", \\qquad x_{(60)} = " + tn(a.max, 1)) +
                  TQ("60 \\cdot 0{,}25 = 15", "Q_1", 15, sAt(15), sAt(16), a.q1, 1) +
                  TQ("60 \\cdot 0{,}5 = 30", "\\tilde{x}", 30, sAt(30), sAt(31), a.median, 1) +
                  TQ("60 \\cdot 0{,}75 = 45", "Q_3", 45, sAt(45), sAt(46), a.q3, 1) +
                  ref("Folie 101: p-Quantil · Folie 104: Quartile · Folie 105: Boxplot · in R: <code>quantile(x, probs = c(0.25, 0.5, 0.75), type = 2)</code>");
              }
            },
            {
              id: "fence", prompt: "Jetzt rechnest du nach, was R im Hintergrund macht (Standard <code>range = 1.5</code>, Folie 108).",
              fields: [
                { id: "iqr", label: "Quartilabstand " + T("Q_3 - Q_1"), expect: a.iqr, dec: 2, w: "m", example: "75,75",
                  diag: function (x) {
                    if (near(x, a.max - a.min, 0.05)) return "Das ist die Spannweite Max − Min. Der Quartilabstand ist " + T("Q_3 - Q_1") + ".";
                    if (near(x, a.q1 + a.q3, 0.05)) return "Abziehen, nicht addieren: " + T("Q_3 - Q_1") + ".";
                    return null;
                  } },
                { id: "lf", label: "untere Grenze", expect: a.fences[0], dec: 2, show: 3, w: "m", example: "89,625",
                  diag: function (x) {
                    if (near(x, a.q1 - a.iqr, 0.006)) return "Du hast nur einmal den Quartilabstand abgezogen. R nimmt das 1,5-fache: " + T("Q_1 - 1{,}5 \\cdot " + tn(a.iqr)) + ".";
                    if (near(x, a.min - a.step, 0.006)) return "Die Grenze geht von " + T("Q_1") + " aus, nicht vom Minimum.";
                    return null;
                  } },
                { id: "uf", label: "obere Grenze", expect: a.fences[1], dec: 2, show: 3, w: "m", example: "392,625",
                  diag: function (x) {
                    if (near(x, a.q3 + a.iqr, 0.006)) return "Du hast nur einmal den Quartilabstand addiert. R nimmt das 1,5-fache: " + T("Q_3 + 1{,}5 \\cdot " + tn(a.iqr)) + ".";
                    if (near(x, a.max + a.step, 0.006)) return "Die Grenze geht von " + T("Q_3") + " aus, nicht vom Maximum.";
                    return null;
                  } }
              ],
              tips: [
                "Quartilabstand: " + T("Q_3 - Q_1 = " + tn(a.q3) + " - " + tn(a.q1)) + ".",
                T("1{,}5 \\cdot " + tn(a.iqr) + " = " + tn(a.step, 3)) + ". Das ist der Abstand der Grenzen von der Box.",
                "Untere Grenze: " + T("Q_1 - " + tn(a.step, 3)) + ". Obere Grenze: " + T("Q_3 + " + tn(a.step, 3)) + "."
              ],
              okText: "Richtig! Alles außerhalb von " + fm(a.fences[0], 3) + " bis " + fm(a.fences[1], 3) + " ms zeichnet R als Ausreißer.",
              solution: function () {
                return TD("Q_3 - Q_1 = " + tn(a.q3) + " - " + tn(a.q1) + " = " + tn(a.iqr)) +
                  TD("1{,}5 \\cdot " + tn(a.iqr) + " = " + tn(a.step, 3)) +
                  "<p>Untere Grenze " + T("Q_1 - " + tn(a.step, 3)) + ", obere Grenze " + T("Q_3 + " + tn(a.step, 3)) + ":</p>" +
                  TA([tn(a.q1) + " - " + tn(a.step, 3) + " &= " + tn(a.fences[0], 3), tn(a.q3) + " + " + tn(a.step, 3) + " &= " + tn(a.fences[1], 3)]) +
                  ref("Folie 104: Quartilabstand · Folie 108: range, Standard 1,5 · Folie 109: Beispiel mit range = 1");
              }
            },
            {
              id: "whisk", prompt: "Welche Werte liegen außerhalb der Grenzen? Die Whisker gehen bis zum äußersten Wert, der noch <b>innerhalb</b> liegt.",
              fields: [
                { id: "wlo", label: "Whisker unten bis", expect: a.whiskerLo, dec: 1, w: "m", example: "134,8",
                  diag: function (x) {
                    if (near(x, a.fences[0], 0.006)) return "Der Whisker endet nie an der Grenze selbst, sondern an einem echten Messwert. Welcher kleinste Wert liegt noch über " + fm(a.fences[0], 3) + "?";
                    return "Ist der kleinste Wert " + fm(a.min, 1) + " größer als die untere Grenze " + fm(a.fences[0], 3) + "? Dann geht der Whisker bis dorthin.";
                  } },
                { id: "whi", label: "Whisker oben bis", expect: a.whiskerHi, dec: 1, w: "m", example: "371,1",
                  diag: function (x) {
                    if (near(x, a.fences[1], 0.006)) return "Der Whisker endet nicht an der Grenze, sondern beim größten Messwert, der noch darunter liegt.";
                    if (inSet(x, a.out, 0.05)) return fm(x, 1) + " liegt über der Grenze " + fm(a.fences[1], 3) + ". Das ist ein Ausreißer, kein Whisker-Ende.";
                    return null;
                  } },
                { id: "o1", label: "Ausreißer 1", expect: a.out[0], dec: 1, w: "m", example: "519,6",
                  diag: function (x) { return near(x, a.whiskerHi, 0.05) ? "371,1 liegt unter " + fm(a.fences[1], 3) + ". Das ist noch kein Ausreißer." : "Schau in die letzte Zeile der sortierten Liste: Welche Werte sind größer als " + fm(a.fences[1], 3) + "?"; } },
                { id: "o2", label: "Ausreißer 2", expect: a.out[1], dec: 1, w: "m", example: "794,5",
                  diag: function () { return "Der größte Ausreißer ist der größte Wert überhaupt."; } }
              ],
              tips: [
                "Unten: Der kleinste Wert ist " + fm(a.min, 1) + ". Er liegt über der Grenze " + fm(a.fences[0], 3) + ". Unten gibt es also keinen Ausreißer.",
                "Oben: Geh die letzte Zeile der sortierten Liste von rechts durch. Welche Zeiten sind größer als " + fm(a.fences[1], 3) + "?",
                "Nur " + fm(a.out[0], 1) + " und " + fm(a.out[1], 1) + " liegen darüber. Der größte Wert darunter ist " + fm(a.whiskerHi, 1) + " (Platz " + a.whiskerHiPos + ")."
              ],
              okText: "Richtig! Genau so zeichnet R den Boxplot.",
              why: "<p>Das sind genau die Zahlen, die R mit <code>boxplot.stats(x)</code> ausgibt. Bei n = 60 legt R die Box genau auf die Quartile von Folie 101.</p>",
              solution: function () {
                return "<p>Untere Grenze " + fm(a.fences[0], 3) + ": Kein Wert liegt darunter. Der Whisker geht bis zum Minimum " + fm(a.whiskerLo, 1) + ".</p>" +
                  "<p>Obere Grenze " + fm(a.fences[1], 3) + ": " + fm(a.out[0], 1) + " (Platz " + a.outPositions[0] + ") und " + fm(a.out[1], 1) + " (Platz " + a.outPositions[1] + ") liegen darüber. Das sind die Ausreißer. " +
                  "Der größte Wert innerhalb ist " + fm(a.whiskerHi, 1) + " (Platz " + a.whiskerHiPos + "). Bis dorthin geht der obere Whisker.</p>" +
                  ref("Folie 108: Whisker bei range > 0 · in R: <code>boxplot.stats(x)$stats</code> und <code>$out</code> (R-Befehle nicht auf den Folien)");
              }
            }
          ],
          visual: function (box, sheet) {
            var rg = sheet.ui("range") === 0 ? 0 : 1.5;
            var sw = seg("Whisker-Regel", [{ v: 1.5, html: "range = 1,5 (R-Standard)" }, { v: 0, html: "range = 0" }], rg, function (v) {
              rg = v; sheet.ui("range", v); chart.redraw(); note.innerHTML = rangeNote();
            });
            function rangeNote() {
              return rg ? "So zeichnet R <code>boxplot(x)</code>: Die Whisker enden bei " + fm(a.whiskerLo, 1) + " und " + fm(a.whiskerHi, 1) + ". Die zwei Kreise sind Ausreißer."
                : "Mit <code>range = 0</code> (Folie 107) gehen die Whisker bis Min und Max. Dann sieht man die Ausreißer nicht mehr einzeln.";
            }
            box.appendChild(H("div", { class: "ue-vbar" }, [sw.el]));
            var chart = rtBox(box, a, function () { return rg; });
            var note = H("p", { class: "ue-cap", attrs: { "aria-live": "polite" }, html: rangeNote() });
            box.appendChild(note);
            var cm = function (v) { return fm(a.cm(v), 1); };
            box.appendChild(H("div", { class: "callout callout-tip" }, [
              H("p", { class: "callout-title", text: "Von Hand auf Karopapier" }),
              H("p", { html: "Nimm <b>1 cm = 50 ms</b> (2 Kästchen) und lass die Achse bei 100 ms anfangen. Bis 800 ms sind das 14 cm. Dann misst du vom Achsenanfang:" }),
              H("p", { class: "ue-cm", html: [
                ["Min", a.whiskerLo], ["Q1", a.q1], ["Median", a.median], ["Q3", a.q3], ["Whisker", a.whiskerHi], ["Ausreißer", a.out[0]], ["Ausreißer", a.out[1]]
              ].map(function (r) { return "<span>" + r[0] + " " + fm(r[1], 2) + " → <b>" + cm(r[1]) + " cm</b></span>"; }).join("") }),
              H("p", { class: "small", html: "Rechnung: " + T("(\\text{Wert} - 100) \\div 50") + ". Box ungefähr 1,5 cm hoch, Ausreißer als kleine Kreise." })
            ]));
          }
        },
        {
          id: "b", mark: "b", name: "Teil b", title: "Mittel und Median im Vergleich",
          how: [
            "<span class=\"t-mean\"><b>Mittel</b></span>: alle 60 Zeiten addieren, durch 60 teilen. In R: <code>mean(x)</code>.",
            "<span class=\"t-med\"><b>Median</b></span>: kennst du schon aus Teil a (Platz 30 und 31).",
            "Vergleiche: Welcher Wert ist größer? Und welche Zeiten könnten das Mittel verschieben?"
          ],
          stages: [
            {
              id: "mm", prompt: "Trag Mittel und Median ein.",
              fields: [
                { id: "mean", label: '<span class="t-mean">Mittel</span> ' + T("\\bar{x}"), expect: a.mean, dec: 2, w: "m", example: "251,36",
                  diag: function (x) {
                    if (near(x, a.sum, 0.06)) return "Das ist die Summe. Teil sie noch durch n = 60.";
                    if (near(x, a.median, 0.006)) return "Das ist der Median. Das Mittel ist Summe durch n.";
                    if (near(x, a.mean, 0.06)) return "Fast! Runde auf zwei Nachkommastellen.";
                    return null;
                  } },
                { id: "med", label: '<span class="t-med">Median</span> ' + T("\\tilde{x}"), expect: a.median, dec: 2, w: "m", example: "234,35",
                  diag: function (x) { return near(x, a.mean, 0.006) ? "Das ist das Mittel. Der Median ist das Mittel aus Platz 30 und 31." : "Den Median hast du in Teil a schon ausgerechnet: Mittel aus Platz 30 und 31."; } }
              ],
              tips: [
                "Die Summe aller 60 Zeiten ist " + fm(a.sum, 1) + " ms.",
                T(tn(a.sum, 1) + " \\div 60 = " + tn(a.mean)) + ". Den Median kennst du aus Teil a."
              ],
              okText: "Richtig! Das Mittel ist um " + fm(a.diff) + " ms größer als der Median.",
              solution: function () {
                return TA(["\\bar{x} &= \\frac{1}{60} \\sum_{i=1}^{60} x_i", "&= \\frac{" + tn(a.sum, 1) + "}{60} = " + tn(a.mean)]) +
                  TQ("n = 60", "\\tilde{x}", 30, sAt(30), sAt(31), a.median, 1) +
                  ref("Folie 110: Mittel · Folie 94: Median · in R: <code>mean(x)</code> (Folie 112) und <code>median(x)</code> (Folie 96)");
              }
            },
            {
              id: "why", type: "mc", groupLabel: "Wodurch entsteht der Unterschied?",
              prompt: "Wodurch entsteht der Unterschied von " + fm(a.diff) + " ms?",
              options: [
                { id: "skew", ok: true, html: "Die Verteilung ist <b>rechtsschief</b>: Einige sehr lange Zeiten, vor allem " + fm(a.out[0], 1) + " und " + fm(a.out[1], 1) + " ms, ziehen das Mittel nach oben. Der Median ist robust und bleibt fast stehen." },
                { id: "avg", html: "Der Median ist ungenau, weil bei n = 60 zwei Werte gemittelt werden.",
                  why: "Nicht ganz. Das Mitteln von Platz 30 und 31 (" + fm(sAt(30), 1) + " und " + fm(sAt(31), 1) + ") verschiebt den Median höchstens um 2 ms. Die 17 ms kommen woanders her." },
                { id: "left", html: "Die Verteilung ist linksschief: Die sehr kurzen Zeiten ziehen das Mittel nach unten.",
                  why: "Schau auf das Vorzeichen: " + T("\\bar{x} - \\tilde{x} = " + tn(a.diff) + " > 0") + ". Das Mittel liegt <b>über</b> dem Median, wird also nach oben gezogen." },
                { id: "round", html: "Das liegt an Rundungsfehlern in R.",
                  why: "R rechnet sehr genau. Der Unterschied steckt in den Daten selbst: Schau dir die größten Werte der Liste an." }
              ],
              why: function () {
                return "<p>" + T("\\bar{x} - \\tilde{x} = " + tn(a.mean) + " - " + tn(a.median) + " = " + tn(a.diff) + " > 0") +
                  ". Nach Folie 140 heißt das: tendenziell <b>rechtsschief</b> bzw. linkssteil. Der lange Ausläufer zeigt zu den langen Zeiten. Mehr dazu in <a href=\"#schiefe\">Kapitel 9</a>.</p>" +
                  "<p>Das Mittel verwendet jeden Wert mit seiner Größe. 794,5 ms zieht es deshalb stark nach oben. Für den Median zählt nur die Reihenfolge (Folie 116: Das Mittel ist empfindlich gegen Ausreißer).</p>";
              }
            }
          ],
          visual: function (box, sheet) {
            noOut = !!sheet.ui("noOut");
            var btn = H("button", { class: "chip", attrs: { type: "button", "aria-pressed": String(noOut) }, text: "Ohne die zwei Ausreißer" });
            var tiles = H("div", { class: "stats-row ue-tiles", attrs: { role: "status", "aria-live": "polite" } });
            var msg = H("p", { class: "ue-cap" });
            function upd() {
              var m = noOut ? a.noOut.mean : a.mean, md = noOut ? a.noOut.median : a.median;
              tiles.innerHTML = "";
              tiles.appendChild(statTile("s-mean", "Mittel" + (noOut ? " (58 Werte)" : ""), fm(m)));
              tiles.appendChild(statTile("s-med", "Median" + (noOut ? " (58 Werte)" : ""), fm(md)));
              tiles.appendChild(statTile("", "Unterschied " + T("\\bar{x} - \\tilde{x}"), fm(m - md)));
              msg.innerHTML = noOut
                ? "Ohne 519,6 und 794,5 rutscht das Mittel um " + fm(a.mean - a.noOut.mean) + " ms nach unten, der Median nur um " + fm(a.median - a.noOut.median) + " ms. Der Unterschied schrumpft von " + fm(a.diff) + " auf " + fm(a.noOut.diff) + " ms. Der Rest kommt vom allgemein langen Ausläufer nach rechts."
                : "Mit allen 60 Werten: Das Mittel liegt " + fm(a.diff) + " ms rechts vom Median. Klick auf „Ohne die zwei Ausreißer“ und schau, wer sich bewegt.";
            }
            btn.addEventListener("click", function () {
              noOut = !noOut;
              btn.setAttribute("aria-pressed", String(noOut));
              sheet.ui("noOut", noOut);
              upd();
              dotsB.redraw();
            });
            box.appendChild(H("div", { class: "ue-vbar" }, [btn]));
            dotsB = rtDots(box, a, function () { return { noOut: noOut }; });
            box.appendChild(tiles);
            box.appendChild(msg);
            upd();
          }
        },
        {
          id: "c", mark: "c", name: "Teil c", title: "Ein geeignetes getrimmtes Mittel",
          how: [
            "Getrimmt heißt: An <b>beiden</b> Enden die extremsten Werte streichen, vom Rest das normale Mittel (Folie 116).",
            "Wie R: " + T("k = n \\cdot \\text{Anteil}") + ", abgerundet. So viele Werte fallen unten <b>und</b> oben weg.",
            "„Geeignet“ heißt hier: Beide Ausreißer müssen raus. Oben brauchst du also " + T("k \\ge 2") + "."
          ],
          stages: [
            {
              id: "trim", prompt: "Such dir einen Anteil aus und rechne.",
              extra: function (box, sheet) {
                trimSeg = seg("Anteil je Seite", [{ v: 5, html: "5\u00a0% je Seite" }, { v: 10, html: "10\u00a0% je Seite" }], choice(), function (v) {
                  sheet.ui("trim", v);
                });
                box.appendChild(H("div", { class: "ue-vbar" }, [trimSeg.el]));
              },
              onDone: function () { if (trimSeg) trimSeg.disable(true); },
              fields: [
                { id: "k", label: T("k") + " je Seite", expect: function () { return tr().k; }, dec: 0, w: "s", example: "6",
                  diag: function (x) {
                    var t = tr();
                    if (near(x, 2 * t.k)) return "k zählt nur <b>eine</b> Seite: " + pct() + " von 60 sind " + t.k + " unten und " + t.k + " oben.";
                    if (near(x, choice() === 10 ? a.trim[5].k : a.trim[10].k)) return "Das passt zum anderen Anteil. Rechne " + T("60 \\cdot " + (choice() === 10 ? "0{,}1" : "0{,}05")) + ".";
                    return "Rechne " + T("60 \\cdot " + (choice() === 10 ? "0{,}1" : "0{,}05")) + " und runde ab.";
                  } },
                { id: "m", label: "Werte übrig", expect: function () { return tr().m; }, dec: 0, w: "s", example: "48",
                  diag: function (x) {
                    var t = tr();
                    if (near(x, n - t.k)) return "Du hast nur an einem Ende gestrichen. Es fallen unten <b>und</b> oben je " + t.k + " Werte weg.";
                    return "Rechne " + T("60 - 2 \\cdot k") + ".";
                  } },
                { id: "tm", label: '<span class="t-mean">getrimmtes Mittel</span>', expect: function () { return tr().value; }, dec: 2, w: "m", example: "239,12",
                  diag: function (x) {
                    var t = tr(), w = a.wrongTrim(choice() / 100);
                    if (near(x, a.mean, 0.006)) return "Das ist das normale Mittel aller 60 Werte. Erst streichen, dann mitteln.";
                    if (near(x, a.median, 0.006)) return "Das ist der Median. Gesucht ist das Mittel der übrigen " + t.m + " Werte.";
                    if (near(x, w.byN, 0.006)) return "Du hast durch 60 geteilt. Es sind aber nur noch " + t.m + " Werte übrig.";
                    if (near(x, w.oneSide, 0.006)) return "Du hast durch " + (n - t.k) + " geteilt. Es bleiben " + t.m + " Werte: unten und oben fallen je " + t.k + " weg.";
                    if (near(x, choice() === 10 ? a.trim[5].value : a.trim[10].value, 0.006)) return "Das ist das getrimmte Mittel für den anderen Anteil. Oben ist " + pct() + " gewählt.";
                    return null;
                  } }
              ],
              tips: [
                function () { var t = tr(); return T("60 \\cdot " + (choice() === 10 ? "0{,}1" : "0{,}05") + " = " + t.k) + ". Also fallen unten " + t.k + " und oben " + t.k + " Werte weg. Es bleiben " + T("60 - 2 \\cdot " + t.k + " = " + t.m) + "."; },
                function () { var t = tr(); return "Gestrichen werden die Plätze 1 bis " + t.k + " und " + (n - t.k + 1) + " bis 60. Oben sind das " + t.high.map(function (v) { return fm(v, 1); }).join("; ") + "."; },
                function () { var t = tr(); return "Die übrigen " + t.m + " Werte ergeben zusammen " + fm(t.sum, 1) + ". Jetzt noch durch " + t.m + " teilen."; }
              ],
              okText: function () { return "Richtig! Getrimmtes Mittel " + fm(tr().value) + " ms aus " + tr().m + " Werten."; },
              why: function () {
                return "<p><b>Warum geeignet?</b> Oben müssen mindestens die 2 Ausreißer weg, also " + T("k \\ge 2") + ". " +
                  "Mit 5\u00a0% ist " + T("k = " + a.trim[5].k) + ": reicht. Mit 10\u00a0% ist " + T("k = " + a.trim[10].k) + ": geht auch, so wie das Beispiel auf Folie 116. " +
                  "Mit nur 2\u00a0% wäre " + T("k = " + a.trim[2].k) + ": Dann bliebe 519,6 drin.</p>" +
                  "<p>Beide Ergebnisse (" + fm(a.trim[5].value) + " und " + fm(a.trim[10].value) + ") liegen zwischen Median und Mittel. Sie sind kaum noch von Ausreißern beeinflusst.</p>";
              },
              solution: function () {
                var t = tr(), c = choice();
                return "<p>Für " + c + "\u00a0% je Seite:</p>" +
                  TA(["k &= \\lfloor 60 \\cdot " + (c === 10 ? "0{,}1" : "0{,}05") + " \\rfloor = " + t.k, "m &= 60 - 2 \\cdot " + t.k + " = " + t.m + " \\text{ Werte}"]) +
                  "<p>Gestrichen unten: " + t.low.map(function (v) { return fm(v, 1); }).join("; ") + ". Oben: " + t.high.map(function (v) { return fm(v, 1); }).join("; ") + ".</p>" +
                  TD("\\bar{x}_{\\text{getr.}} = \\frac{" + tn(t.sum, 1) + "}{" + t.m + "} = " + tn(t.value)) +
                  "<p>Zum Vergleich der andere Anteil: " + (c === 10 ? "5\u00a0%: k = " + a.trim[5].k + ", " + a.trim[5].m + " Werte, " + fm(a.trim[5].value) : "10\u00a0%: k = " + a.trim[10].k + ", " + a.trim[10].m + " Werte, " + fm(a.trim[10].value)) + " ms.</p>" +
                  ref("Folie 116: getrimmtes Mittel · in R: <code>mean(x, trim = " + (c === 10 ? "0.1" : "0.05") + ")</code> (R-Befehl nicht auf den Folien) · siehe auch <a href=\"#weitere\">Kapitel 7</a>");
              }
            }
          ],
          visual: function (box) {
            var t = tr();
            rtDots(box, a, function () { return { trim: t }; });
            var tiles = H("div", { class: "stats-row ue-tiles" }, [
              statTile("s-mean", "Mittel (alle 60)", fm(a.mean)),
              statTile("s-mean ue-s-trim", "getrimmt 5\u00a0%", fm(a.trim[5].value)),
              statTile("s-mean ue-s-trim", "getrimmt 10\u00a0%", fm(a.trim[10].value)),
              statTile("s-med", "Median", fm(a.median))
            ]);
            box.appendChild(tiles);
            caption(box, "Blasse Punkte sind gestrichen (" + choice() + "\u00a0% je Seite, Raute = getrimmtes Mittel). Je mehr du trimmst, desto näher rückt das Ergebnis an den Median: 20\u00a0% ergibt " +
              fm(a.trim[20].value) + ", 25\u00a0% ergibt " + fm(a.trim[25].value) + ".");
          }
        }
      ],
      r: rA10
    };
  }


  /* =====================================================================
     Aufgabe 11: Körpergewicht in Klassen
     ===================================================================== */

  // Histogramm der Klassen; st() → { mids, mean, real }
  function weightHist(host, a, st) {
    return svgChart(host, "", function (svg, W) {
      var s = st(), padL = 34, padR = 12, narrow = W < 520;
      var items = [];
      var x = LM.svg.scale(59, 76, padL, W - padR);
      if (s.mean) items.push({ x: x(a.mean), text: (s.real ? "Näherung " : "Mittel ≈ ") + fm(a.mean), cls: "lbl lbl-mean", lineCls: "ue-mline-mean", anchor: s.real ? "end" : "middle" });
      if (s.real) items.push({ x: x(a.realMean), text: "echt " + fm(a.realMean, 3), cls: "lbl lbl-mean", lineCls: "ue-mline-mean", anchor: "start" });
      var rowH = 17, nRows = items.length ? stackLabels(svg, items, W, 6) : 0;
      var top = (nRows ? 34 : 22) + nRows * rowH, ph = narrow ? 170 : 210, y0 = top + ph;
      var y = LM.svg.scale(0, 45, y0, top);
      [0, 10, 20, 30, 40].forEach(function (t) {
        E("line", { class: "gridline", x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
        TX(svg, padL - 7, y(t) + 4, String(t), { class: "tick", "text-anchor": "end" });
      });
      TX(svg, 4, 12, "Anzahl Studenten", { class: "axis-label" });
      a.counts.forEach(function (h, j) {
        var xl = x(a.bounds[j]), xr = x(a.bounds[j + 1]);
        E("rect", { class: "bar ue-hbar" + (s.real ? " is-faded" : ""), x: xl + 0.75, y: y(h), width: xr - xl - 1.5, height: y0 - y(h) }, svg);
        TX(svg, (xl + xr) / 2, y(h) - 6, String(h), { class: "ue-vlab", "text-anchor": "middle" });
      });
      if (s.real) {
        var d = narrow ? 4.4 : 5.6, stacks = {};
        a.real.forEach(function (v) {
          var bin = Math.round(x(v) / d), k = stacks[bin] || 0;
          stacks[bin] = k + 1;
          E("circle", { class: "ue-rdot", cx: bin * d, cy: y0 - d / 2 - k * d, r: d / 2 - 0.4 }, svg);
        });
      }
      if (s.mids) {
        a.mids.forEach(function (m, j) {
          E("line", { class: "ue-midline", x1: x(m), x2: x(m), y1: y(a.counts[j]), y2: y0 }, svg);
          diamond(svg, x(m), y0, "ue-mk-mid", 4.5);
        });
      }
      if (items.length) drawLabels(svg, items, 32 + (nRows - 1) * rowH, rowH, y0);
      E("line", { class: "ax", x1: padL, x2: W - padR, y1: y0, y2: y0 }, svg);
      a.bounds.forEach(function (b) {
        E("line", { class: "ax", x1: x(b), x2: x(b), y1: y0, y2: y0 + 5 }, svg);
        TX(svg, x(b), y0 + 19, String(b), { class: "tick", "text-anchor": "middle" });
      });
      var hgt = y0 + 26;
      if (s.mids) {
        a.mids.forEach(function (m) { TX(svg, x(m), y0 + 37, fm(m, 1), { class: "ue-midlab", "text-anchor": "middle" }); });
        hgt = y0 + 44;
      }
      if (s.mean) {
        tri(svg, x(a.mean), y0 + 2, "mk-mean", 5);
        if (s.real) E("path", { class: "ue-tri-open", d: "M" + x(a.realMean) + " " + (y0 + 2) + "l5 8h-10z" }, svg);
      }
      TX(svg, W - padR, hgt + 10, "Gewicht (kg)", { class: "axis-label", "text-anchor": "end" });
      svg.setAttribute("aria-label", "Histogramm der Gewichtsklassen 60 bis 75 kg mit Anzahlen " + a.counts.join(", ") +
        (s.mids ? ". Klassenmitten " + a.mids.map(function (m) { return fm(m, 1); }).join(", ") : "") +
        (s.mean ? ". Genähertes Mittel " + fm(a.mean) + " kg" : "") + (s.real ? ". Punkte: die 100 echten Werte, echtes Mittel " + fm(a.realMean, 3) + " kg" : "") + ".");
      return hgt + 16;
    });
  }

  function makeA11() {
    var a = solveA11(), K = a.counts.length, idx = range(0, K - 1);
    var kl = function (j) { return "(" + a.bounds[j] + ", " + a.bounds[j + 1] + "]"; };
    var real = false;
    a.real = GEWICHT;

    // Tabelle mit den Eingaben: Klasse | h_j | Spalte(n) mit Text | Eingabespalte
    function tableLayout(prefix, cols, inputHead) {
      return function (holder, F) {
        var head = H("tr", {}, [H("th", { attrs: { scope: "col" }, text: "Klasse" }), H("th", { class: "num", attrs: { scope: "col" }, html: sym("h", "j") })]
          .concat(cols.map(function (c) { return H("th", { class: "num", attrs: { scope: "col" }, html: c.head }); }))
          .concat([H("th", { class: "num", attrs: { scope: "col" }, html: inputHead })]));
        var body = H("tbody", {}, idx.map(function (j) {
          var o = F[prefix + j];
          o.label.className = "ue-sr";
          o.label.textContent = inputHead.replace(/<[^>]+>/g, "") + " für Klasse " + kl(j);
          return H("tr", {}, [H("th", { attrs: { scope: "row" }, text: kl(j) }), H("td", { class: "num", text: String(a.counts[j]) })]
            .concat(cols.map(function (c) { return H("td", { class: "num", text: c.cell(j) }); }))
            .concat([H("td", { class: "num ue-tdin" }, [o.label, o.input])]));
        }));
        holder.appendChild(H("div", { class: "table-wrap ue-tw ue-tinwrap" }, [H("table", { class: "t ue-t ue-tin" }, [H("thead", {}, [head]), body])]));
      };
    }

    return {
      key: "ue-a11", badge: "Aufgabe 11", title: "Mittel aus einer Klassen-Tabelle", unit: ["Schritt", "Schritten"],
      sub: "Du kennst nur die Klassen, nicht die einzelnen Gewichte. Trotzdem kannst du das Mittel gut schätzen: mit den Klassenmitten (Folie 113).",
      finalNote: "Unten siehst du, wie du das mit R nachrechnest.",
      intro: function (box) {
        box.appendChild(H("div", { class: "ue-data" }, [
          H("p", { class: "ue-data-t", text: "Die Daten vom Blatt: 100 Studenten in 5 Gewichtsklassen" }),
          H("div", { class: "table-wrap ue-tw ue-tinwrap" }, [H("table", { class: "t ue-t" }, [
            H("thead", {}, [H("tr", {}, [H("th", { attrs: { scope: "col" }, text: "Gewicht (kg)" }), H("th", { class: "num", attrs: { scope: "col" }, text: "Anzahl der Studenten" })])]),
            H("tbody", {}, idx.map(function (j) { return H("tr", {}, [H("th", { attrs: { scope: "row" }, text: kl(j) }), H("td", { class: "num", text: String(a.counts[j]) })]); })
              .concat([H("tr", {}, [H("th", { attrs: { scope: "row" }, text: "zusammen" }), H("td", { class: "num", text: String(a.n) })])]))
          ])]),
          H("p", { class: "small muted", html: "(60, 63] heißt: über 60 kg bis einschließlich 63 kg. Alle Klassen sind 3 kg breit." })
        ]));
      },
      parts: [
        {
          id: "a", mark: "1", tag: "Schritt 1", name: "Schritt 1", title: "Die Klassenmitten",
          how: [
            "Du weißt nicht, was die 5 Studenten der ersten Klasse genau wiegen. Also tust du so, als wögen alle genau die Mitte ihrer Klasse.",
            "Mitte = (Untergrenze + Obergrenze) ÷ 2, also " + T("x'_j = (u_{j-1} + u_j) \\div 2") + " (Folie 113)."
          ],
          stages: [
            {
              id: "mid", prompt: "Rechne für jede Klasse die Mitte " + sym("x′", "j") + " aus.",
              fields: idx.map(function (j) {
                return { id: "x" + j, expect: a.mids[j], dec: 2, show: 1, w: "s", example: "61,5",
                  diag: function (x) {
                    if (near(x, a.bounds[j]) || near(x, a.bounds[j + 1])) return "Bei " + kl(j) + " steht eine Klassengrenze. Gesucht ist die Mitte: (Untergrenze + Obergrenze) ÷ 2.";
                    if (near(x, a.bounds[j] + a.bounds[j + 1])) return "Bei " + kl(j) + " hast du addiert. Jetzt noch durch 2 teilen.";
                    if (near(x, a.counts[j])) return "Bei " + kl(j) + " steht die Anzahl. Gesucht ist die Mitte der Klasse in kg.";
                    return null;
                  } };
              }),
              layout: tableLayout("x", [], sym("x′", "j")),
              tips: [
                "Erste Klasse (60, 63]: " + T("(60 + 63) \\div 2 = 61{,}5") + ".",
                "Alle Klassen sind 3 kg breit. Die nächste Mitte liegt also immer 3 kg weiter: 61,5, 64,5, …"
              ],
              okText: "Richtig! Jede Mitte liegt 1,5 kg über der Untergrenze.",
              solution: function () {
                return miniTable(["Klasse"].concat(idx.map(kl)), [["<i>x′</i><sub>j</sub>"].concat(idx.map(function (j) { return fm(a.mids[j], 1); }))]) +
                  TA(["x'_1 &= \\frac{60 + 63}{2} = 61{,}5", "x'_2 &= \\frac{63 + 66}{2} = 64{,}5 \\quad \\dots"]) +
                  ref("Folie 113: Klassenmitte " + T("x'_j = (u_{j-1} + u_j) / 2"));
              }
            }
          ],
          visual: function (box) {
            weightHist(box, a, function () { return { mids: true }; });
            caption(box, "Die Rauten unten und die gestrichelten Linien zeigen die Klassenmitten. Jede Säule wird so behandelt, als lägen alle ihre Werte genau dort.");
          }
        },
        {
          id: "b", mark: "2", tag: "Schritt 2", name: "Schritt 2", title: "Anzahl mal Mitte, dann alles zusammen",
          how: [
            "Jede Mitte zählt so oft, wie Studenten in der Klasse sind: " + T("h_j \\cdot x'_j") + ".",
            "Dann addierst du alle fünf Produkte. Das ist ungefähr das Gesamtgewicht aller 100 Studenten."
          ],
          stages: [
            {
              id: "prod", prompt: "Die Produkte darfst du ausfüllen (freiwillig). Die Summe brauchst du auf jeden Fall.",
              fields: idx.map(function (j) {
                return { id: "p" + j, expect: a.products[j], dec: 1, w: "m", optional: true, example: "307,5",
                  diag: function (x) {
                    if (near(x, a.counts[j] * a.bounds[j], 0.05) || near(x, a.counts[j] * a.bounds[j + 1], 0.05)) return "Bei " + kl(j) + " hast du eine Grenze statt der Mitte genommen.";
                    if (near(x, a.counts[j] + a.mids[j], 0.05)) return "Bei " + kl(j) + " hast du addiert. Gesucht ist das Produkt " + T("h_j \\cdot x'_j") + ".";
                    return null;
                  } };
              }).concat([
                { id: "sum", label: "Summe " + T("\\sum h_j \\cdot x'_j"), expect: a.sum, dec: 1, w: "l", example: "6795",
                  diag: function (x) {
                    if (near(x, a.wrong.midSum, 0.05)) return "Das ist die Summe der fünf Mitten. Jede Mitte muss erst mit ihrer Anzahl " + sym("h", "j") + " malgenommen werden.";
                    if (near(x, a.wrong.lowerSum, 0.05)) return "Du hast mit den Untergrenzen gerechnet. Nimm die Mitten.";
                    if (near(x, a.wrong.upperSum, 0.05)) return "Du hast mit den Obergrenzen gerechnet. Nimm die Mitten.";
                    if (near(x, a.mean, 0.006)) return "Das ist schon das Mittel. Hier ist erst die Summe gefragt.";
                    return null;
                  } }
              ]),
              layout: function (holder, F, sheet, sg) {
                tableLayout("p", [{ head: sym("x′", "j"), cell: function (j) { return fm(a.mids[j], 1); } }], sym("h", "j") + " · " + sym("x′", "j"))(holder, F);
                var o = F.sum;
                holder.appendChild(H("div", { class: "ue-fields ue-sumrow" }, [H("div", { class: "ue-field" }, [o.label, o.input])]));
              },
              cross: function (ctx) {
                var s = 0, all = true;
                idx.forEach(function (j) { var v = ctx.v["p" + j]; if (isFinite(v)) s += v; else all = false; });
                if (all && isFinite(ctx.v.sum) && !near(s, ctx.v.sum, 0.05)) return "Deine Produkte ergeben zusammen " + fm(s, 1) + ". Prüf die Summe.";
                return null;
              },
              tips: [
                "Erste Klasse: " + T("5 \\cdot 61{,}5 = 307{,}5") + ". Die anderen gehen genauso.",
                "Die Produkte sind " + a.products.map(function (p) { return fm(p, 1); }).join("; ") + ". Jetzt alle zusammenzählen."
              ],
              okText: "Richtig! Zusammen etwa " + fm(a.sum, 1) + " kg.",
              solution: function () {
                return miniTable(["Klasse", "<i>h</i><sub>j</sub>", "<i>x′</i><sub>j</sub>", "<i>h</i><sub>j</sub> · <i>x′</i><sub>j</sub>"],
                  idx.map(function (j) { return [kl(j), String(a.counts[j]), fm(a.mids[j], 1), fm(a.products[j], 1)]; }).concat([["Summe", "100", "", "<b>" + fm(a.sum, 1) + "</b>"]])) +
                  TA(["&\\sum_j h_j \\cdot x'_j", "&= " + a.products.slice(0, 3).map(function (p) { return tn(p, 1); }).join(" + "), "&\\quad + " + a.products.slice(3).map(function (p) { return tn(p, 1); }).join(" + "), "&= " + tn(a.sum, 1)]) +
                  ref("Folie 111: Mittel aus der Häufigkeitstabelle · Folie 113: mit Klassenmitten");
              }
            }
          ]
        },
        {
          id: "c", mark: "3", tag: "Schritt 3", name: "Schritt 3", title: "Das genäherte Mittel",
          how: [
            "Teil die Summe durch die Zahl der Studenten: " + T("n = 100") + ".",
            "Gleich gut geht es mit Anteilen: " + T("\\bar{x} \\approx \\sum_j f_j \\cdot x'_j") + " mit " + T("f_j = h_j \\div n") + " (Folie 113)."
          ],
          stages: [
            {
              id: "mean", prompt: "Wie groß ist das Mittel ungefähr?",
              fields: [
                { id: "m", label: '<span class="t-mean">Mittel</span> ' + T("\\bar{x} \\approx"), expect: a.mean, dec: 2, w: "m", example: "67,95",
                  diag: function (x) {
                    if (near(x, a.wrong.byClasses, 0.06)) return "Teil durch " + T("n = 100") + " Studenten, nicht durch 5 Klassen.";
                    if (near(x, a.wrong.midMean, 0.006)) return "67,5 ist das Mittel der 5 Mitten. Die Klassen sind aber verschieden voll: In (66, 69] sind 42 Studenten, in (60, 63] nur 5. Jede Mitte zählt so oft, wie Studenten darin sind.";
                    if (near(x, a.wrong.lowerSum / 100, 0.006) || near(x, a.wrong.upperSum / 100, 0.006)) return "Du hast mit den Klassengrenzen gerechnet. Nimm die Mitten.";
                    if (near(x, a.sum, 0.05)) return "Das ist die Summe. Teil sie noch durch 100.";
                    return null;
                  } }
              ],
              tips: [
                T(tn(a.sum, 1) + " \\div 100") + ". Durch 100 teilen heißt: Komma zwei Stellen nach links."
              ],
              okText: "Richtig! Etwa " + fm(a.mean) + " kg.",
              solution: function () {
                return TA(["\\bar{x} &\\approx \\frac{1}{n} \\sum_j h_j \\cdot x'_j", "&= \\frac{" + tn(a.sum, 1) + "}{100} = " + tn(a.mean)]) +
                  "<p>Oder mit Anteilen " + T("f_j") + ":</p>" +
                  TA(["&\\sum_j f_j \\cdot x'_j", "&= " + idx.slice(0, 2).map(function (j) { return tn(a.f[j]) + " \\cdot " + tn(a.mids[j], 1); }).join(" + "),
                    "&\\quad + " + idx.slice(2, 4).map(function (j) { return tn(a.f[j]) + " \\cdot " + tn(a.mids[j], 1); }).join(" + "),
                    "&\\quad + " + tn(a.f[4]) + " \\cdot " + tn(a.mids[4], 1) + " = " + tn(a.mean)]) +
                  ref("Folie 113: " + T("\\bar{x} \\approx \\sum f_j \\cdot x'_j"));
              }
            }
          ],
          visual: function (box, sheet) {
            real = !!sheet.ui("real");
            var chart = weightHist(box, a, function () { return { mids: true, mean: true, real: real }; });
            var btn = H("button", { class: "btn btn-sm", attrs: { type: "button", "aria-pressed": String(real) } });
            var out = H("div", { class: "ue-check-real", attrs: { role: "status", "aria-live": "polite" } });
            function upd() {
              btn.textContent = real ? "Echte Werte ausblenden" : "Wie gut ist die Näherung?";
              btn.className = "btn btn-sm" + (real ? "" : " btn-primary");
              btn.setAttribute("aria-pressed", String(real));
              out.innerHTML = real
                ? "<p>Die Punkte sind die <b>echten 100 Gewichte</b> von Folie 148. Sie fallen genau in diese Klassen. Ihr echtes Mittel ist " + T("\\bar{x} = " + tn(a.realMean, 3)) +
                  " kg (offenes Dreieck). Die Näherung " + fm(a.mean) + " kg liegt also <b>nur " + fm(Math.abs(a.gap), 3) + " kg daneben</b>.</p>" +
                  "<p class=\"small muted\">So gut klappt das, weil sich die Werte in jeder Klasse ziemlich gleichmäßig um die Mitte verteilen. Fehler nach oben und nach unten heben sich fast auf.</p>"
                : "";
              out.hidden = !real;
            }
            btn.addEventListener("click", function () { real = !real; sheet.ui("real", real); upd(); chart.redraw(); });
            box.appendChild(H("div", { class: "ue-vbar" }, [btn]));
            box.appendChild(out);
            caption(box, "Das Dreieck unter der Achse zeigt das genäherte Mittel. Es liegt etwas rechts von der Mitte 67,5 der vollsten Klasse, weil rechts mehr Studenten sind (27 + 8) als links (18 + 5).");
            upd();
          }
        }
      ],
      r: rA11
    };
  }

  /* =====================================================================
     Aufgabe 12: Lernfortschritt
     ===================================================================== */

  // Säulen f_0 … f_5 mit Bögen dazwischen, auf jedem Bogen der Faktor x_i (oder "?")
  function chainChart(host, a, getX) {
    return svgChart(host, "", function (svg, W) {
      var padL = 34, padR = 10, narrow = W < 520, top = 74, ph = narrow ? 130 : 160, y0 = top + ph;
      var x = LM.svg.scale(-0.5, 5.5, padL, W - padR), y = LM.svg.scale(0, 0.6, y0, top);
      var step = x(1) - x(0), bw = Math.min(46, step * 0.52);
      [0, 0.2, 0.4, 0.6].forEach(function (t) {
        E("line", { class: "gridline", x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
        TX(svg, padL - 6, y(t) + 4, fm(t, 1), { class: "tick", "text-anchor": "end" });
      });
      TX(svg, 4, 12, "Fehleranteil", { class: "axis-label" });
      a.f.forEach(function (v, i) {
        E("rect", { class: "ue-fbar", x: x(i) - bw / 2, y: y(v), width: bw, height: y0 - y(v), rx: 3 }, svg);
        TX(svg, x(i), y(v) - 6, fm(v), { class: "ue-vlab", "text-anchor": "middle" });
        var t = TX(svg, x(i), y0 + 18, "", { class: "tick", "text-anchor": "middle" });
        t.appendChild(document.createTextNode("f"));
        E("tspan", { "baseline-shift": "sub", "font-size": "9" }, t).textContent = String(i);
      });
      E("line", { class: "ax", x1: padL, x2: W - padR, y1: y0, y2: y0 }, svg);
      TX(svg, W - padR, y0 + 36, "Durchgang i = 0 bis 5", { class: "axis-label", "text-anchor": "end" });
      for (var i = 1; i < a.f.length; i++) {
        var xa = x(i - 1) + 4, xb = x(i) - 4, ya = y(a.f[i - 1]) - 20, yb = y(a.f[i]) - 20;
        var apex = Math.min(ya, yb) - 14;
        var cx = (xa + xb) / 2;
        E("path", { class: "ue-arc", d: "M" + xa + " " + ya + "Q" + cx + " " + (apex - 6) + " " + xb + " " + yb }, svg);
        E("path", { class: "ue-arc-head", d: "M" + xb + " " + yb + "l-6 -3.5l1.5 6.5z" }, svg);
        var v = getX(i), known = isFinite(v);
        TX(svg, cx, apex - 6, "· " + (known ? fm(v, narrow ? 3 : 4) : "?"), { class: "ue-flab" + (known ? " is-known" : "") + (narrow ? " is-narrow" : "") + " ue-halo", "text-anchor": "middle" });
      }
      svg.setAttribute("aria-label", "Fehleranteile " + a.f.map(function (v, k) { return "f" + k + " = " + fm(v); }).join(", ") + ". Von Säule zu Säule wird mit dem Faktor x_i malgenommen.");
      return y0 + 44;
    });
  }

  // Beobachtete Fehleranteile (Punkte) und Vorhersage f_0 · GM^i (Kurve)
  function predChart(host, a, getAM) {
    return svgChart(host, "", function (svg, W) {
      var showAM = getAM(), padL = 38, padR = 16, narrow = W < 520, top = 30, ph = narrow ? 190 : 230, y0 = top + ph;
      var x = LM.svg.scale(0, 5, padL + 10, W - padR - 10), y = LM.svg.scale(0.1, 0.6, y0, top);
      [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(function (t) {
        E("line", { class: "gridline", x1: padL, x2: W - padR, y1: y(t), y2: y(t) }, svg);
        TX(svg, padL - 6, y(t) + 4, fm(t, 1), { class: "tick", "text-anchor": "end" });
      });
      TX(svg, 4, 12, "Fehleranteil", { class: "axis-label" });
      E("line", { class: "ax", x1: padL, x2: W - padR, y1: y0, y2: y0 }, svg);
      for (var i = 0; i <= 5; i++) TX(svg, x(i), y0 + 18, String(i), { class: "tick", "text-anchor": "middle" });
      TX(svg, W - padR, y0 + 36, "Durchgang i", { class: "axis-label", "text-anchor": "end" });
      function curve(g, cls) {
        var d = "";
        for (var t = 0; t <= 5.0001; t += 0.1) d += (d ? "L" : "M") + x(t).toFixed(1) + " " + y(a.f[0] * Math.pow(g, t)).toFixed(1);
        E("path", { class: cls, d: d }, svg);
      }
      if (showAM) curve(a.am, "ue-pcurve-am");
      curve(a.gm, "ue-pcurve");
      a.f.forEach(function (v, k) { E("circle", { class: "dot", cx: x(k), cy: y(v), r: 5 }, svg); });
      a.pred.forEach(function (v, k) { E("circle", { class: "ue-pdot", cx: x(k + 1), cy: y(v), r: 3.6 }, svg); });
      var xe = x(5), ye = y(a.pred[4]);
      TX(svg, xe - 4, ye + 21, "Durchgang 5: genau " + fm(a.f[5]), { class: "lbl lbl-mean ue-halo", "text-anchor": "end" });
      if (showAM) TX(svg, xe - 4, ye + 37, "mit AM: " + fm(a.predAM[4], 4), { class: "lbl ue-lbl-muted ue-halo", "text-anchor": "end" });
      svg.setAttribute("aria-label", "Beobachtete Fehleranteile " + a.f.map(function (v) { return fm(v); }).join(", ") +
        " als Punkte. Vorhersage mit dem geometrischen Mittel als Kurve: " + a.pred.map(function (v) { return fm(v, 4); }).join(", ") + ". Am Ende trifft sie 0,21 genau.");
      return y0 + 44;
    });
  }

  function makeA12() {
    var a = solveA12(), I = range(1, 5), xF = null, chain = null, sheetRef = null;
    var fi = function (i) { return tn(a.f[i]); };
    function factor(i) {
      if (sheetRef && sheetRef.done("s1.x")) return a.x[i - 1];
      if (!xF) return NaN;
      var v = LM.parseNum(xF["x" + i].input.value);
      return isFinite(v) && v > 0 && v < 2 ? v : NaN;
    }
    var telescope = ["x_1 \\cdots x_5 &= \\frac{\\cancel{f_1}}{f_0} \\cdot \\frac{\\cancel{f_2}}{\\cancel{f_1}} \\cdot \\frac{\\cancel{f_3}}{\\cancel{f_2}}",
      "&\\quad \\cdot \\frac{\\cancel{f_4}}{\\cancel{f_3}} \\cdot \\frac{f_5}{\\cancel{f_4}} = \\frac{f_5}{f_0}"];
    var amOn = false;

    return {
      key: "ue-a12", badge: "Aufgabe 12", title: "Mittlerer Lernfortschritt", unit: ["Schritt", "Schritten"],
      sub: "Fünf Schritte: Faktoren ausrechnen, das passende Mittel wählen, ausrechnen, deuten, vorhersagen.",
      finalNote: "Unten steht der R-Code dazu, mit der Funktion geometric_mean von Folie 118.",
      onChange: function () { if (chain) chain.redraw(); },
      intro: function (box, sheet) {
        sheetRef = sheet;
        chain = chainChart(box, a, factor);
        caption(box, "Von Durchgang zu Durchgang wird der Fehleranteil mit einem Faktor " + sym("x", "i") + " malgenommen. Die Faktoren rechnest du in Schritt 1 aus.");
      },
      parts: [
        {
          id: "s1", mark: "1", tag: "Teil a", name: "Schritt 1", title: "Die Lernfortschritte " + sym("x", "i"),
          how: [
            T("x_i = f_i \\div f_{i-1}") + ": neuer Wert geteilt durch den Wert davor.",
            "Beispiel: " + T("x_1 = f_1 \\div f_0 = 0{,}46 \\div 0{,}55") + ".",
            "Runde auf 4 Nachkommastellen. Ein Wert unter 1 heißt: Der Fehleranteil ist gesunken."
          ],
          stages: [
            {
              id: "x", prompt: "Rechne die fünf Verhältnisse aus. Die Faktoren erscheinen oben auf den Bögen.",
              fields: I.map(function (i) {
                return { id: "x" + i, expect: a.x[i - 1], tol: 0.0005, show: 4, w: "s", example: "0,8364", aria: "x" + i,
                  diag: function (v) {
                    if (near(v, a.inverse[i - 1], 0.0006)) return "Bei " + sym("x", i) + " ist es umgekehrt: " + T("x_" + i + " = f_" + i + " \\div f_" + (i - 1)) + ", also der <b>neue</b> Wert oben im Bruch.";
                    if (near(v, a.differences[i - 1], 0.0006) || near(v, -a.differences[i - 1], 0.0006)) return "Bei " + sym("x", i) + " hast du abgezogen. Gesucht ist das Verhältnis, also teilen.";
                    if (near(v, a.x[i - 1], 0.006)) return "Bei " + sym("x", i) + " fast! Runde auf vier Nachkommastellen.";
                    return null;
                  } };
              }),
              layout: function (holder, F) {
                xF = F;
                rowLayout(I.map(function (i) { return "x" + i; }), I.map(function (i) { return sym("x", i); }), "")(holder, F);
                I.forEach(function (i) { F["x" + i].input.addEventListener("input", function () { if (chain) chain.redraw(); }); });
              },
              tips: [
                T("x_1 = 0{,}46 \\div 0{,}55 = 0{,}8364") + ". Genauso " + T("x_2 = 0{,}35 \\div 0{,}46") + ".",
                "Immer: Wert rechts geteilt durch Wert links in der Tabelle. Alle " + sym("x", "i") + " liegen zwischen 0,7 und 0,9."
              ],
              okText: "Richtig! Alle Faktoren sind kleiner als 1: Der Fehleranteil sinkt jedes Mal.",
              solution: function () {
                return TA(I.map(function (i) { return "x_" + i + " &= \\frac{" + fi(i) + "}{" + fi(i - 1) + "} = " + tn(a.x[i - 1], 4); })) +
                  ref("Aufgabenblatt: " + T("x_i = f_i / f_{i-1}") + " · in R: <code>f[2:6] / f[1:5]</code>");
              }
            }
          ]
        },
        {
          id: "s2", mark: "2", tag: "Teil a", name: "Schritt 2", title: "Welches Mittel passt?",
          stages: [
            {
              id: "mc", type: "mc", groupLabel: "Welches Maß passt für den mittleren Lernfortschritt?",
              prompt: "Die Faktoren werden nacheinander <b>malgenommen</b>: " + T("f_5 = f_0 \\cdot x_1 \\cdot x_2 \\cdot x_3 \\cdot x_4 \\cdot x_5") + ". Welches Maß passt?",
              options: [
                { id: "am", html: "das arithmetische Mittel", why: "Das arithmetische Mittel passt, wenn sich Werte <b>addieren</b>. Hier wird aber malgenommen: Fünfmal das arithmetische Mittel hintereinander trifft " + T("f_5") + " nicht genau." },
                { id: "gm", ok: true, html: "das geometrische Mittel" },
                { id: "hm", html: "das harmonische Mittel", why: "Das harmonische Mittel passt zu Verhältnissen mit festem Zähler, etwa km/h bei gleicher Strecke (Folie 120). Hier werden Faktoren hintereinander angewendet." },
                { id: "med", html: "der Median", why: "Der Median nimmt nur den mittleren Faktor (" + fm(a.median, 4) + ") und übersieht die anderen. Mit ihm landest du nicht bei " + T("f_5 = 0{,}21") + "." }
              ],
              okText: "Richtig! Das geometrische Mittel.",
              why: "<p>Für Faktoren, die nacheinander wirken (Wachstum, <b>konstante Lernrate</b>, Inflation), nimmt man das geometrische Mittel (Folie 119). " +
                "Es ist der eine Faktor, der fünfmal hintereinander genau dasselbe ergibt wie die fünf echten Faktoren. Mehr in <a href=\"#weitere\">Kapitel 7</a>.</p>"
            }
          ]
        },
        {
          id: "s3", mark: "3", tag: "Teil a", name: "Schritt 3", title: "Das geometrische Mittel ausrechnen",
          how: [
            T("GM = \\sqrt[5]{x_1 \\cdot x_2 \\cdot x_3 \\cdot x_4 \\cdot x_5}") + " (Folie 117).",
            "Trick: Im Produkt kürzt sich fast alles weg. Übrig bleibt " + T("f_5 \\div f_0") + ".",
            "Dann die 5. Wurzel ziehen. Auf dem Taschenrechner: " + T("0{,}3818^{\\,1/5}") + " oder " + T("0{,}3818^{\\,0{,}2}") + "."
          ],
          stages: [
            {
              id: "prod", prompt: "Erst das Produkt. Schau, was sich kürzt:",
              extra: function (box) { box.appendChild(H("div", { html: TA(telescope) })); },
              fields: [
                { id: "p", label: "Produkt " + T("= f_5 \\div f_0 ="), expect: a.product, tol: 0.0005, show: 4, w: "m", example: "0,3818",
                  diag: function (v) {
                    if (near(v, 1 / a.product, 0.001)) return "Umgekehrt: " + T("f_5 \\div f_0 = 0{,}21 \\div 0{,}55") + ".";
                    if (near(v, a.f[0] - a.f[5], 0.001)) return "Teilen, nicht abziehen: " + T("0{,}21 \\div 0{,}55") + ".";
                    return null;
                  } }
              ],
              tips: [
                "Jedes " + T("f_1, \\dots, f_4") + " steht einmal oben und einmal unten im Bruch. Es kürzt sich weg.",
                "Übrig bleibt " + T("0{,}21 \\div 0{,}55") + "."
              ],
              okText: "Richtig! Das Produkt der fünf Faktoren ist " + fm(a.product, 4) + ".",
              solution: function () {
                return TA(telescope.concat(["&= \\frac{0{,}21}{0{,}55} = " + tn(a.product, 4)])) +
                  "<p>Zur Kontrolle mit den gerundeten Faktoren: " + T(a.x4.map(function (v) { return tn(v, 4); }).join(" \\cdot ") + " \\approx " + tn(a.productX4, 4)) + ".</p>" +
                  "<p>Die kleine Abweichung kommt vom Runden. Exakt ist es " + T("0{,}21 \\div 0{,}55 = " + tn(a.product, 4)) + ".</p>" +
                  ref("Folie 117: GM als 5. Wurzel aus dem Produkt");
              }
            },
            {
              id: "gm", prompt: "Jetzt die 5. Wurzel: " + T("GM = \\sqrt[5]{" + tn(a.product, 4) + "}"),
              fields: [
                { id: "g", label: '<span class="t-mean">GM</span> =', expect: a.gm, tol: 0.0005, show: 4, w: "m", example: "0,8248",
                  diag: function (v) {
                    if (near(v, a.product / 5, 0.001)) return "Du hast durch 5 geteilt. Beim geometrischen Mittel ziehst du die 5. <b>Wurzel</b>: " + T("0{,}3818^{\\,1/5}") + ".";
                    if (near(v, Math.sqrt(a.product), 0.001)) return "Das ist die Quadratwurzel. Du brauchst die 5. Wurzel: " + T("0{,}3818^{\\,1/5}") + ".";
                    if (near(v, Math.pow(a.product, 5), 0.0005)) return "Du hast hoch 5 gerechnet. Richtig ist hoch " + T("1/5 = 0{,}2") + ".";
                    if (near(v, a.am, 0.0002)) return "Das ist das arithmetische Mittel der fünf Faktoren. Gesucht ist das geometrische.";
                    if (near(v, a.gm, 0.006)) return "Fast! Rechne mit mehr Stellen und runde auf 4 Nachkommastellen.";
                    return null;
                  } }
              ],
              tips: [
                "Auf dem Taschenrechner: " + T("0{,}3818") + ", dann die Taste " + T("x^y") + " (oder ^), dann " + T("0{,}2") + ".",
                "Probe: Die Zahl hoch 5 muss wieder etwa 0,3818 ergeben. Sie liegt zwischen 0,8 und 0,85."
              ],
              okText: "Richtig! GM ≈ " + fm(a.gm, 4) + ".",
              solution: function () {
                return TA(["GM &= \\sqrt[5]{x_1 \\cdots x_5} = \\left(\\frac{f_5}{f_0}\\right)^{1/5}", "&= " + tn(a.product, 4) + "^{\\,0{,}2} = " + tn(a.gm, 4)]) +
                  "<p>Probe: " + T(tn(a.gm, 4) + "^5 \\approx " + tn(a.gm4pow5, 4)) + ". Das ist fast " + T(tn(a.product, 4)) + ". Die kleine Abweichung kommt vom Runden. Passt.</p>" +
                  ref("Folie 117: Definition · Folie 118: in R <code>exp(mean(log(x)))</code> · Folie 119: konstante Lernrate");
              }
            }
          ]
        },
        {
          id: "s4", mark: "4", tag: "Teil a", name: "Schritt 4", title: "Was bedeutet " + fm(a.gm, 4) + "?",
          stages: [
            {
              id: "mc", type: "mc", groupLabel: "Was bedeutet der mittlere Lernfortschritt?",
              prompt: "Der mittlere Lernfortschritt ist " + T("GM \\approx " + tn(a.gm, 4)) + ". Was heißt das?",
              options: [
                { id: "pp", html: "Pro Durchgang sinkt der Fehleranteil um 0,8248 Prozentpunkte.", why: "0,8248 ist ein <b>Faktor</b> zum Malnehmen, keine Differenz. Von 0,55 auf 0,46 sind es zum Beispiel 9 Prozentpunkte, nicht 0,8." },
                { id: "down", html: "Pro Durchgang sinkt der Fehleranteil um etwa 82,5\u00a0%.", why: "Andersherum: Es <b>bleiben</b> 82,5\u00a0% übrig. Weg sind nur 100\u00a0% − 82,5\u00a0% = 17,5\u00a0%." },
                { id: "ok", ok: true, html: "Pro Durchgang sinkt der Fehleranteil im Schnitt auf etwa 82,5\u00a0% des vorherigen Werts, also um etwa 17,5\u00a0%." },
                { id: "end", html: "Am Ende sind 82,5\u00a0% der Fehler übrig.", why: "Nach 5 Durchgängen sind es " + T("0{,}21 \\div 0{,}55 \\approx 38\\,\\%") + ". Die 82,5\u00a0% gelten für <b>einen</b> Durchgang." }
              ],
              okText: "Richtig!",
              why: "<p>" + T(tn(a.gm, 4) + " = " + tn(a.percentOf, 1) + "\\,\\%") + ". Jeder Durchgang behält im Schnitt etwa 82,5\u00a0% der Fehler, " +
                "also sinkt der Fehleranteil um etwa " + fm(a.percentDown, 1) + "\u00a0% pro Durchgang.</p>"
            }
          ]
        },
        {
          id: "s5", mark: "5", tag: "Teil b", name: "Schritt 5", title: "Vorhersage bei konstantem Lernfortschritt",
          how: [
            "Konstanter Lernfortschritt heißt: Jedes Mal mit demselben Faktor " + T("GM") + " malnehmen.",
            "Also " + T("\\hat{f}_i = f_0 \\cdot GM^{\\,i}") + ", zum Beispiel " + T("\\hat{f}_2 = 0{,}55 \\cdot " + tn(a.gm, 4) + "^2") + ".",
            "Rechne mit dem ungerundeten GM weiter (Taschenrechner-Speicher), sonst weicht die 4. Stelle ab."
          ],
          stages: [
            {
              id: "pred", prompt: "Welche Fehleranteile sagt das Modell für die Durchgänge 1 bis 5 vorher?",
              fields: I.map(function (i) {
                return { id: "f" + i, expect: a.pred[i - 1], tol: 0.001, show: 4, w: "s", example: "0,4537", aria: "Vorhersage für Durchgang " + i,
                  diag: function (v) {
                    if (near(v, a.f[i], 0.0005) && !near(a.f[i], a.pred[i - 1], 0.001)) return "Bei Durchgang " + i + " steht der beobachtete Wert. Gesucht ist die Vorhersage " + T("0{,}55 \\cdot GM^{" + i + "}") + ".";
                    if (near(v, a.f[0] * a.gm * i, 0.001)) return "Bei Durchgang " + i + ": " + T("GM^{" + i + "}") + " heißt " + i + "-mal malnehmen, nicht mal " + i + ".";
                    if (near(v, a.predAM[i - 1], 0.0003)) return "Bei Durchgang " + i + " hast du mit dem arithmetischen Mittel gerechnet. Nimm GM.";
                    return null;
                  } };
              }),
              layout: rowLayout(I.map(function (i) { return "f" + i; }), I.map(function (i) { return "<i>f̂</i><sub>" + i + "</sub>"; }), ""),
              tips: [
                T("\\hat{f}_1 = 0{,}55 \\cdot " + tn(a.gm, 4) + " = " + tn(a.pred[0], 4)) + ". Für den nächsten nimmst du das Ergebnis wieder mal GM.",
                "Kontrolle: Der letzte Wert muss genau " + T("f_5 = 0{,}21") + " sein. Das liegt am Kürzen aus Schritt 3."
              ],
              okText: "Richtig! Und am Ende kommt genau 0,21 heraus.",
              why: "<p>Der letzte Wert trifft " + T("f_5 = 0{,}21") + " genau: " + T("0{,}55 \\cdot GM^5 = 0{,}55 \\cdot \\frac{0{,}21}{0{,}55} = 0{,}21") + ". Dazwischen weicht die Vorhersage etwas ab, weil das echte Lernen nicht ganz gleichmäßig war.</p>",
              solution: function () {
                return TD("\\hat{f}_i = f_0 \\cdot GM^{\\,i} = 0{,}55 \\cdot " + tn(a.gm, 4) + "^{\\,i}") +
                  miniTable(["Durchgang <i>i</i>"].concat(I.map(String)), [
                    ["Vorhersage <i>f̂</i><sub>i</sub>"].concat(a.pred.map(function (v) { return fm(v, 4); })),
                    ["beobachtet <i>f</i><sub>i</sub>"].concat(I.map(function (i) { return fm(a.f[i]); }))
                  ]) + ref("Folie 119: konstante Lernrate · in R: <code>f[1] * geometric_mean(x)^(1:5)</code>");
              }
            }
          ],
          visual: function (box, sheet) {
            amOn = !!sheet.ui("am");
            var btn = H("button", { class: "chip", attrs: { type: "button", "aria-pressed": String(amOn) }, text: "Zum Vergleich: arithmetisches Mittel" });
            var note = H("div", { class: "callout callout-extra", attrs: { role: "status", "aria-live": "polite" } });
            function upd() {
              note.hidden = !amOn;
              note.innerHTML = '<p class="callout-title">Extra</p><p>Mit dem arithmetischen Mittel der Faktoren (' + fm(a.am, 4) + ") wäre die Vorhersage für Durchgang 5 " +
                T("0{,}55 \\cdot " + tn(a.am, 4) + "^5 = " + tn(a.predAM[4], 4)) + ", nicht 0,21. Hier ist der Unterschied klein, aber nur das geometrische Mittel trifft genau.</p>";
            }
            var chart = predChart(box, a, function () { return amOn; });
            btn.addEventListener("click", function () { amOn = !amOn; btn.setAttribute("aria-pressed", String(amOn)); sheet.ui("am", amOn); upd(); chart.redraw(); });
            box.appendChild(H("p", { class: "ue-legend2", html: '<span class="ue-lg ue-lg-obs">beobachtet</span><span class="ue-lg ue-lg-pred">Vorhersage mit GM</span>' }));
            box.appendChild(H("div", { class: "ue-vbar" }, [btn]));
            box.appendChild(note);
            upd();
          }
        }
      ],
      r: rA12
    };
  }

  if (typeof LM.widget === "function") {
    register("ue-a9", makeA9);
    register("ue-a10", makeA10);
    register("ue-a11", makeA11);
    register("ue-a12", makeA12);
  }
})(typeof window !== "undefined" ? window : globalThis);
