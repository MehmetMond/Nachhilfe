/*
 * Bündel „more“ (Kapitel 7: Weitere Mittelwerte), Klassenpräfix mo-.
 *   trim-mean  Getrimmtes Mittel (Folie 116, gerechnet wie R mean(x, trim = t)): Punktstreifen mit Streichzonen,
 *              Wanderkurve des getrimmten Mittels, R-Zeile
 *   geo-mean   Geometrisches Mittel für Wachstumsfaktoren (Folien 117–119, Aufgabe 12): echter Verlauf,
 *              konstant mit GM, konstant mit AM; Log-Trick mit R-Funktion von Folie 118
 *   harm-mean  Harmonisches Mittel fürs Durchschnittstempo auf gleicher Strecke (Folie 120);
 *              Extra: gleiche Zeit statt gleiche Strecke
 * Die reinen Hilfsfunktionen (ohne DOM) stehen in P und werden für tests/more.test.js exportiert.
 * Alle Statistik kommt aus LM.stats, alle angezeigten Zahlen laufen durch LM.fmt.
 */
(function (root) {
  "use strict";

  /* ================================================================
     Reine Hilfsfunktionen (Node-Tests: tests/more.test.js)
     ================================================================ */

  var EPS = 1e-9;

  // Übungsblatt 2, Aufgabe 8: 60 Reaktionszeiten in ms (wie RT_A8 in tests/stats.test.js)
  var RT_A8 = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];
  // Übungsblatt 3, Aufgabe 12: relative Fehlerhäufigkeiten f_0 … f_5
  var A12_F = [0.55, 0.46, 0.35, 0.29, 0.25, 0.21];

  function St() { return root.LM.stats; }
  function F(v, d) { return root.LM.fmt(v, d); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  // Auf ein Raster runden, ohne Gleitkomma-Reste (1,2000000001 → 1,2)
  function roundTo(v, step) { return +(Math.round(v / step) * step).toFixed(10); }
  // Ein Schritt für die +/−-Knöpfe: auf dem Raster und in den Grenzen
  function stepValue(v, dir, step, lo, hi) { return clamp(roundTo(v + dir * step, step), lo, hi); }
  // Wird v beim Anzeigen mit d Nachkommastellen gerundet? Dann schreiben wir ≈ statt =.
  function isRounded(v, d) { var f = Math.pow(10, d); return Math.abs(v * f - Math.round(v * f)) > 1e-6; }

  // Glatte Schrittweite 1, 2, 5 · 10^k
  function niceStep(raw) {
    if (!(raw > 0) || !isFinite(raw)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    var m = n <= 1 + EPS ? 1 : n <= 2 + EPS ? 2 : n <= 5 + EPS ? 5 : 10;
    return +(m * p).toPrecision(12);
  }

  // Bereich einer Zahlengerade, auf glatte Einheiten gerundet
  function domainFor(lo, hi) {
    if (!(hi > lo)) {
      var r = Math.max(1, Math.abs(lo) * 0.1);
      return { lo: lo - r, hi: hi + r, unit: niceStep(r) };
    }
    var unit = niceStep((hi - lo) / 8);
    return {
      lo: +(Math.floor(lo / unit + EPS) * unit).toPrecision(12),
      hi: +(Math.ceil(hi / unit - EPS) * unit).toPrecision(12),
      unit: unit
    };
  }

  // Achsenstriche: Vielfache von unit, mindestens minPx Pixel auseinander
  function tickValues(dom, pxPerUnit, minPx) {
    var mult = [1, 2, 5, 10, 20, 50, 100], step = dom.unit, out = [];
    for (var i = 0; i < mult.length; i++) { step = dom.unit * mult[i]; if (step * pxPerUnit >= minPx) break; }
    for (var k = Math.ceil(dom.lo / step - EPS); k * step <= dom.hi + EPS * Math.max(1, Math.abs(step)); k++) out.push(+(k * step).toPrecision(12));
    return out;
  }

  // Wie viele Nachkommastellen haben die Daten? (höchstens max) 232.4 → 1
  function decimalsOf(xs, max) {
    max = max === undefined ? 3 : max;
    var d = 0;
    for (var i = 0; i < xs.length; i++) {
      var found = false;
      for (var k = 0; k <= max; k++) {
        var f = Math.pow(10, k);
        if (Math.abs(xs[i] * f - Math.round(xs[i] * f)) < 1e-7 * Math.max(1, Math.abs(xs[i]))) { d = Math.max(d, k); found = true; break; }
      }
      if (!found) d = max;
    }
    return d;
  }

  // Genau d Nachkommastellen (über LM.fmt, Nullen aufgefüllt): fixedDe(175, 1) → "175,0"
  function fixedDe(v, d) {
    var s = F(v, d);
    if (!d || s === "–") return s;
    var i = s.indexOf(",");
    if (i < 0) return s + "," + new Array(d + 1).join("0");
    return s + new Array(d - (s.length - i - 1) + 1).join("0");
  }

  // Zahlen für KaTeX: Dezimalkomma als {,}, Minus als -
  function texNum(v, d) { return F(v, d).replace(",", "{,}").replace("−", "-"); }
  function texFixed(v, d) { return fixedDe(v, d).replace(",", "{,}").replace("−", "-"); }
  function eqTex(v, d) { return (isRounded(v, d) ? "\\approx " : "= ") + texNum(v, d); }

  // Sinnvolle Nachkommastellen je nach Größe: 156,25 · 1,1292 · 0,3818 · 0,000064
  function smartDigits(v) {
    var a = Math.abs(v);
    if (!(a > 0) || !isFinite(a)) return 2;
    if (a >= 10) return 2;
    if (a >= 1) return 4;
    return clamp(3 - Math.floor(Math.log10(a)), 4, 8);
  }

  // "a", "a und b", "a, b und c"
  function joinDe(items) {
    if (items.length <= 1) return items.join("");
    return items.slice(0, -1).join(", ") + " und " + items[items.length - 1];
  }
  var NUMW = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
  function numWord(n) { return n >= 0 && n < NUMW.length ? NUMW[n] : String(n); }

  // Veränderung eines Faktors in Prozent: 1,2 → "+20 %", 0,5 → "−50 %", 1 → "±0 %"
  function pctChange(x) {
    var v = (x - 1) * 100, s = F(Math.abs(v), 2);
    if (s === "0") return "±0 %";
    return (v > 0 ? "+" : "−") + s + " %";
  }

  /* ---------- Getrimmtes Mittel ---------- */

  // Alles, was das Modul zu einem Anteil pct (in %, je Seite) braucht. Rechnet nur mit LM.stats.
  function trimView(xs, pct) {
    var S = St(), t = pct / 100, info = S.trimInfo(xs, t), n = info.n, k = info.k;
    var med = S.median(xs), box = n ? S.boxplot(xs, 1.5) : null, out = box ? box.out : [];
    var outLow = out.filter(function (v) { return v < med; });
    var outHigh = out.filter(function (v) { return v > med; });
    var a = outLow.length, b = outHigh.length, ka = Math.min(a, k), kb = Math.min(b, k);
    var need = Math.max(a, b);
    return {
      info: info, n: n, k: k, m: info.m, t: t, pct: pct, np: n * t, npInt: S.isInt(n * t),
      mean: S.mean(xs), median: med, value: info.value,
      // ab diesem Prozentsatz fällt je Seite mindestens 1 Wert weg
      firstPct: n ? Math.ceil(100 / n - EPS) : NaN,
      out: out, outLow: outLow, outHigh: outHigh,
      gone: outLow.slice(0, ka).concat(outHigh.slice(b - kb)),
      still: outLow.slice(ka).concat(outHigh.slice(0, b - kb)),
      // ab diesem Prozentsatz sind alle Ausreißer gestrichen
      allPct: need ? Math.ceil(100 * need / n - EPS) : 0
    };
  }

  // k = ⌊n · t⌋ = ⌊60 · 0,10⌋ = 6
  function kTex(v) {
    var s = "k = \\lfloor n \\cdot t \\rfloor = \\lfloor " + v.n + " \\cdot " + texFixed(v.t, 2) + " \\rfloor";
    if (!v.npInt) s += " = \\lfloor " + texNum(v.np, 4) + " \\rfloor";
    return s + " = " + v.k;
  }
  // Worte direkt hinter „= k“: „= 6 Werte pro Seite → 48 Werte bleiben“
  function kWords(v) {
    if (v.k === 0) return "Werte pro Seite → nichts fällt weg, alle " + v.n + " Werte bleiben";
    return (v.k === 1 ? "Wert" : "Werte") + " pro Seite → " + (v.m === 1 ? "1 Wert bleibt" : v.m + " Werte bleiben");
  }

  // Sätze: Was ist weg? Was ist mit den Ausreißern? f formatiert einen Datenwert.
  function trimSentences(v, f) {
    var cut, outS = "";
    if (v.k === 0) {
      if (v.pct === 0) cut = "Bei 0 % fällt nichts weg. Das getrimmte Mittel ist dann einfach das normale Mittel.";
      else {
        cut = "Bei " + (v.n < 10 ? "nur " : "") + v.n + " Werten fällt bei " + v.pct + " % noch nichts weg: " +
          v.n + " · " + F(v.t, 2) + " = " + F(v.np, 4) + ", abgerundet 0.";
        cut += v.firstPct <= 25 ? " Erst ab " + v.firstPct + " % fällt je Seite 1 Wert weg." : " Bis 25 % fällt hier nie etwas weg.";
      }
    } else {
      var lo = v.info.low, hi = v.info.high;
      if (v.k === 1) cut = "Weg sind unten " + f(lo[0]) + " und oben " + f(hi[0]) + ".";
      else if (v.k <= 3) cut = "Weg sind unten " + joinDe(lo.map(f)) + " sowie oben " + joinDe(hi.map(f)) + ".";
      else cut = "Weg sind unten " + f(lo[0]) + " … " + f(lo[lo.length - 1]) + " und oben " + f(hi[0]) + " … " + f(hi[hi.length - 1]) + ".";
    }
    var no = v.out.length;
    if (no) {
      var one = no === 1;
      var subj = one ? "Der Ausreißer " + f(v.out[0]) : "Die " + numWord(no) + " Ausreißer " + joinDe(v.out.map(f));
      if (!v.still.length) outS = subj + (one ? " ist" : " sind") + " damit raus.";
      else if (!v.gone.length) {
        var dir = v.outHigh.length && !v.outLow.length ? " nach oben" : v.outLow.length && !v.outHigh.length ? " nach unten" : "";
        outS = subj + (one ? " ist noch drin" : " sind noch drin");
        if (dir) outS += (one ? " und zieht" : " und ziehen") + " das Mittel" + dir;
        outS += ".";
        if (v.allPct <= 25) outS += " Ab " + v.allPct + " % " + (one ? "ist er" : no === 2 ? "sind beide" : "sind alle") + " raus.";
      } else {
        outS = "Von den " + numWord(no) + " Ausreißern " + (v.gone.length === 1 ? "ist " : "sind ") + joinDe(v.gone.map(f)) +
          " schon raus, " + joinDe(v.still.map(f)) + (v.still.length === 1 ? " ist" : " sind") + " noch drin.";
      }
    }
    // Wie nah ist das getrimmte Mittel am Median? (nur wenn etwas gestrichen ist)
    var near = "";
    if (v.k > 0) {
      var d0 = Math.abs(v.mean - v.median), d1 = Math.abs(v.value - v.median);
      if (d1 < 0.005) near = "Abstand zum Median: ohne Trimmen " + F(d0, 2) + ", jetzt 0. Das getrimmte Mittel ist hier genau der Median.";
      else near = "Abstand zum Median: ohne Trimmen " + F(d0, 2) + ", jetzt " + (d1 < d0 - 1e-9 ? "nur noch " : "") + F(d1, 2) + ".";
    }
    return { cut: cut, out: outS, near: near };
  }

  // Getrimmtes Mittel für 0 % … maxPct % (für die Wanderkurve)
  function trimCurve(xs, maxPct) {
    var out = [];
    for (var p = 0; p <= maxPct; p++) {
      var i = St().trimInfo(xs, p / 100);
      out.push({ p: p, k: i.k, m: i.m, value: i.value });
    }
    return out;
  }

  // Punkte (Pixel-x, aufsteigend sortiert) auf Ebenen stapeln: Auf derselben Ebene liegen zwei Punkte
  // mindestens gap auseinander. Gleiche Werte landen übereinander.
  function stackDots(px, gap) {
    var lastX = [], levels = [];
    for (var i = 0; i < px.length; i++) {
      var L = 0;
      while (L < lastX.length && px[i] - lastX[L] < gap - 1e-9) L++;
      lastX[L] = px[i];
      levels.push(L);
    }
    return levels;
  }

  // Punktgröße für den Streifen: so groß wie möglich (Radius bis 5), aber nicht zu hoch gestapelt.
  // Unter 3 px Radius geht es nur bei sehr hohen Stapeln (viele gleiche Werte).
  function dotLayout(px, W) {
    var r = clamp(W / 92, 3.1, 5), gap, levels, maxL;
    for (;;) {
      gap = 2 * r + 1.3;
      levels = stackDots(px, gap);
      maxL = levels.length ? Math.max.apply(null, levels) : 0;
      if (maxL <= 11) break;
      if (r - 0.3 < 3 && (maxL <= 22 || r - 0.3 < 2)) break;
      r -= 0.3;
    }
    return { r: r, gap: gap, levels: levels, maxL: maxL };
  }

  /* ---------- R-Ausgaben ---------- */

  // Runden wie R (ab Version 4): genau in der Mitte → zur geraden Ziffer, sonst nach dem echten Binärwert.
  function rRound(x, d) {
    if (!isFinite(x)) return x;
    var neg = x < 0, s = Math.abs(x).toFixed(Math.min(100, d + 25)), dot = s.indexOf(".");
    var head = s.slice(0, dot + 1 + d), tail = s.slice(dot + 1 + d);
    var up;
    if (/^50*$/.test(tail)) up = Number(head.replace(".", "").slice(-1)) % 2 === 1;
    else up = tail.charAt(0) >= "5";
    var unit = Math.pow(10, -d), r = Number(head.replace(/\.$/, ""));
    if (up) r += unit;
    r = Number(r.toFixed(d));
    return neg ? -r : r;
  }
  // So druckt R eine Zahl (7 signifikante Stellen, Punkt als Dezimaltrenner)
  function rNum(v) {
    if (isNaN(v)) return "NaN";
    if (!isFinite(v)) return v > 0 ? "Inf" : "-Inf";
    return String(Number(v.toPrecision(7)));
  }
  // Zahl im R-Code
  function rLit(v) { return String(Number(v.toPrecision(12))); }
  function rTrimCall(pct) { return "round(mean(x, trim = " + rLit(pct / 100) + "), 2)"; }
  function rTrimOut(xs, pct) { return "[1] " + rNum(rRound(St().trimInfo(xs, pct / 100).value, 2)); }

  /* ---------- Geometrisches Mittel ---------- */

  // Faktoren x_i = f_i / f_{i−1}
  function ratios(fs) {
    var out = [];
    for (var i = 1; i < fs.length; i++) out.push(fs[i] / fs[i - 1]);
    return out;
  }

  // Verläufe: echt (Start · Produkt der Faktoren), konstant mit GM, konstant mit AM
  function growth(xs, start) {
    var S = St(), n = xs.length, g = S.geometricInfo(xs), am = S.mean(xs);
    var real = [start], prod = 1;
    for (var i = 0; i < n; i++) { prod *= xs[i]; real.push(start * prod); }
    var gmPath = [], amPath = [];
    for (var j = 0; j <= n; j++) {
      gmPath.push(g.ok ? start * Math.pow(g.value, j) : NaN);
      amPath.push(start * Math.pow(am, j));
    }
    return {
      n: n, start: start, xs: xs.slice(), ok: g.ok, info: g, gm: g.value, am: am, product: prod,
      real: real, gmPath: gmPath, amPath: amPath,
      end: real[n], endGm: gmPath[n], endAm: amPath[n], miss: amPath[n] - real[n]
    };
  }

  function symProd(n) {
    if (n === 1) return "x_1";
    if (n === 2) return "x_1 \\cdot x_2";
    if (n === 3) return "x_1 \\cdot x_2 \\cdot x_3";
    return "x_1 \\cdot \\ldots \\cdot x_{" + n + "}";
  }
  function symSum(n) {
    if (n === 1) return "x_1";
    if (n === 2) return "x_1 + x_2";
    if (n === 3) return "x_1 + x_2 + x_3";
    return "x_1 + \\ldots + x_{" + n + "}";
  }
  // Zahlenliste für TeX, ab 5 Werten gekürzt: 0,8364 · 0,7609 · … · 0,84
  function listTex(xs, d, op) {
    var p = xs.map(function (x) { return texNum(x, d); });
    if (p.length > 4) p = [p[0], p[1], "\\ldots", p[p.length - 1]];
    return p.join(" " + op + " ");
  }
  function gmTex(G, d) {
    var e = "^{1/" + G.n + "}";
    return "GM = (" + symProd(G.n) + ")" + e + " = (" + listTex(G.xs, d, "\\cdot") + ")" + e + " " +
      eqTex(G.product, smartDigits(G.product)) + e + " " + eqTex(G.gm, 4);
  }
  function amTex(G, d) {
    return "AM = (" + symSum(G.n) + ") \\div " + G.n + " = (" + listTex(G.xs, d, "+") + ") \\div " + G.n + " " + eqTex(G.am, 4);
  }
  // Teleskop-Produkt aus Aufgabe 12: alles dazwischen kürzt sich weg
  function telescopeTex(fs) {
    var n = fs.length - 1, parts = [];
    for (var i = 1; i <= n; i++) {
      var num = texNum(fs[i], 4), den = texNum(fs[i - 1], 4);
      if (i < n) num = "\\cancel{" + num + "}";
      if (i > 1) den = "\\cancel{" + den + "}";
      parts.push("\\dfrac{" + num + "}{" + den + "}");
    }
    return parts.join(" \\cdot ") + " = \\dfrac{" + texNum(fs[n], 4) + "}{" + texNum(fs[0], 4) + "}";
  }
  // Mittel der Logarithmen: (ln x_1 + … + ln x_n) ÷ n
  function logMeanTex(G) {
    var logs = G.info.logs, n = G.n;
    var terms = logs.map(function (l, i) {
      var s = texNum(Math.abs(l), 4);
      if (i === 0) return (l < 0 && s !== "0" ? "-" : "") + s;
      return (l < 0 && s !== "0" ? " - " : " + ") + s;
    });
    if (terms.length > 4) terms = [terms[0], terms[1], " + \\ldots", terms[terms.length - 1]];
    var total = St().sum(logs);
    return "\\overline{\\ln x} = \\dfrac{" + terms.join("") + "}{" + n + "} " + eqTex(total, 4).replace(/^(\\approx |= )/, "$1\\dfrac{") +
      "}{" + n + "} " + eqTex(G.info.logMean, 4);
  }
  function rGeoOut(G) { return "[1] " + rNum(G.gm); }

  /* ---------- Harmonisches Mittel ---------- */

  // Zwei Abschnitte mit den Tempi v1, v2. mode "km": gleiche Strecke `amount` je Abschnitt (hin und zurück),
  // mode "zeit": gleiche Zeit `amount` (Stunden) je Abschnitt.
  function trip(v1, v2, mode, amount) {
    var S = St(), hm = S.harmonicInfo([v1, v2]), am = S.mean([v1, v2]);
    var d1, d2, t1, t2;
    if (mode === "zeit") { t1 = t2 = amount; d1 = v1 * amount; d2 = v2 * amount; }
    else { d1 = d2 = amount; t1 = amount / v1; t2 = amount / v2; }
    var dist = d1 + d2, time = t1 + t2;
    return {
      mode: mode, v1: v1, v2: v2, d1: d1, d2: d2, t1: t1, t2: t2, dist: dist, time: time, avg: dist / time,
      ok: hm.ok, hmInfo: hm, hm: hm.value, am: am, right: mode === "zeit" ? "am" : "hm"
    };
  }

  // Dauer in Stunden als Text: 2,6667 → "2 h 40 min" (auf ganze Minuten gerundet; approx sagt, ob gerundet wurde)
  function duration(hours) {
    var totalMin = hours * 60, mins = Math.round(totalMin), approx = Math.abs(totalMin - mins) > 1e-6;
    var hh = Math.floor(mins / 60), mm = mins % 60;
    var text = hh && mm ? hh + " h " + mm + " min" : hh ? hh + " h" : mm + " min";
    return { text: text, approx: approx, minutes: mins };
  }

  function hmTex(v1, v2) {
    var hm = St().harmonicInfo([v1, v2]);
    return "HM = \\dfrac{n}{\\sum \\frac{1}{x_i}} = \\dfrac{2}{\\frac{1}{" + texNum(v1, 2) + "} + \\frac{1}{" + texNum(v2, 2) + "}} " + eqTex(hm.value, 2);
  }
  function amSpeedTex(v1, v2) {
    return "AM = \\dfrac{" + texNum(v1, 2) + " + " + texNum(v2, 2) + "}{2} " + eqTex(St().mean([v1, v2]), 2);
  }

  var P = {
    RT_A8: RT_A8, A12_F: A12_F,
    clamp: clamp, roundTo: roundTo, stepValue: stepValue, isRounded: isRounded, niceStep: niceStep, domainFor: domainFor,
    tickValues: tickValues, decimalsOf: decimalsOf, fixedDe: fixedDe, texNum: texNum, texFixed: texFixed, eqTex: eqTex,
    smartDigits: smartDigits, joinDe: joinDe, numWord: numWord, pctChange: pctChange,
    trimView: trimView, kTex: kTex, kWords: kWords, trimSentences: trimSentences, trimCurve: trimCurve, stackDots: stackDots, dotLayout: dotLayout,
    rRound: rRound, rNum: rNum, rLit: rLit, rTrimCall: rTrimCall, rTrimOut: rTrimOut,
    ratios: ratios, growth: growth, gmTex: gmTex, amTex: amTex, telescopeTex: telescopeTex, logMeanTex: logMeanTex, rGeoOut: rGeoOut,
    trip: trip, duration: duration, hmTex: hmTex, amSpeedTex: amSpeedTex
  };
  if (typeof module !== "undefined" && module.exports) module.exports = P;

  /* ================================================================
     Browser-Teil
     ================================================================ */

  var LM = root.LM;
  if (!LM || !LM.widget || typeof document === "undefined") return;
  var h = LM.h, fmt = LM.fmt, S = LM.stats;
  var uidN = 0;

  function uid(p) { uidN += 1; return "mo-" + p + "-" + uidN; }
  function svgEl(tag, attrs, parent) { return LM.svg.el(tag, attrs, parent); }
  function txt(parent, x, y, str, attrs) { return LM.svg.text(parent, x, y, str, attrs); }
  function tex(src) { return LM.tex(src); }
  function textW(t) {
    var w = 0;
    try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
    return w > 0 ? w : String(t.textContent).length * 6.9;
  }
  // Gruppe verschieben. Gruppen mit data-anim="wait" bekommen ihre erste Lage ohne Übergang
  // und gleiten erst danach (sonst würden sie beim Neuzeichnen von (0, 0) aus hereinfliegen).
  function move(g, x, y) {
    g.style.transform = "translate(" + x + "px," + (y || 0) + "px)";
    if (g.getAttribute("data-anim") === "wait") {
      void g.getBoundingClientRect();
      g.removeAttribute("data-anim");
      g.classList.add("mo-anim");
    }
  }
  function animGroup(parent, cls) { return svgEl("g", { class: cls || "", "data-anim": "wait" }, parent); }
  function newSvg(box, W, H, label) {
    box.innerHTML = "";
    return svgEl("svg", { class: "mo-svg", width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": label || "" }, box);
  }
  function sizeSvg(svg, W, H) {
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  }
  function whenFonts(fn) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn); }

  function head(el, title, badge, sub) {
    el.appendChild(h("div", { class: "w-head" }, [
      h("h3", { html: LM.esc(title) + ' <span class="w-badge">' + LM.esc(badge) + "</span>" }),
      h("p", { class: "w-sub", text: sub })
    ]));
  }

  // Umschalter (.seg) mit aria-pressed
  function segGroup(label, items, current, onPick) {
    var btns = {};
    var box = h("div", { class: "seg mo-seg", attrs: { role: "group", "aria-label": label } });
    items.forEach(function (it) {
      btns[it[0]] = h("button", { text: it[1], attrs: { type: "button", "aria-pressed": String(it[0] === current) }, on: { click: function () { onPick(it[0]); } } });
      box.appendChild(btns[it[0]]);
    });
    return { el: box, set: function (id) { Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", String(k === id)); }); } };
  }

  // Kennzahl-Kachel mit kleiner Unterzeile
  function tile(label, cls) {
    var lab = h("span", { class: "stat-label", html: label });
    var val = h("span", { class: "stat-value" });
    var sub = h("span", { class: "mo-stat-sub", attrs: { hidden: "" } });
    var el = h("div", { class: "stat mo-stat " + (cls || "") }, [lab, val, sub]);
    return {
      el: el, lab: lab,
      set: function (valueHtml, subHtml, labelHtml) {
        val.innerHTML = valueHtml;
        sub.innerHTML = subHtml || "";
        sub.hidden = !subHtml;
        if (labelHtml !== undefined) lab.innerHTML = labelHtml;
      }
    };
  }
  function unitHtml(u) { return u ? ' <span class="mo-unit">' + LM.esc(u) + "</span>" : ""; }

  // R-Code und aufklappbar „Was R antwortet“. Zeilen: [code, kommentar]; der deutsche Kommentar steht
  // jeweils über seiner Codezeile (so bleibt der Code schmal und passt aufs Handy).
  function rBlock(titleHtml) {
    var code = h("code"), outCode = h("code");
    var pre = h("pre", { class: "mo-pre", attrs: { tabindex: "0", "aria-label": "R-Code" } }, [code]);
    var det = h("details", { class: "mo-rdet" }, [h("summary", { text: "Was R antwortet" }), h("pre", { class: "mo-pre mo-rout" }, [outCode])]);
    var el = h("div", { class: "mo-r" }, [h("p", { class: "mo-r-title", html: titleHtml }), pre, det]);
    return {
      el: el,
      set: function (lines, output) {
        // jede Zeile ein eigener Block: Kommentare dürfen umbrechen (mit Einzug), Code nicht
        var out = [];
        lines.forEach(function (l) {
          if (l[1]) out.push('<span class="mo-l mo-com"># ' + LM.esc(l[1]) + "</span>");
          if (l[0]) out.push('<span class="mo-l">' + LM.esc(l[0]) + "</span>");
        });
        code.innerHTML = out.join("");
        outCode.textContent = output;
      }
    };
  }

  // Zeile mit Regler und −/+-Knöpfen. o: {name, labelHtml, min, max, step, value, show(v) → html, say(v) → text, onChange(v)}
  function rangeRow(o) {
    var id = uid("r");
    var input = h("input", { class: "slider", attrs: { type: "range", id: id, min: o.min, max: o.max, step: o.step, value: o.value } });
    var out = h("output", { class: "mo-row-val", attrs: { for: id } });
    var minus = h("button", { class: "btn btn-sm mo-nudge", text: "−", attrs: { type: "button" } });
    var plus = h("button", { class: "btn btn-sm mo-nudge", text: "+", attrs: { type: "button" } });
    var lab = h("label", { class: "mo-row-label", attrs: { for: id } });
    var row = h("div", { class: "mo-row" }, [lab, minus, input, plus, out]);
    var api = {
      el: row, input: input, value: o.value,
      set: function (v, silent) {
        v = clamp(roundTo(v, o.step), o.min, o.max);
        api.value = v;
        if (Number(input.value) !== v) input.value = v;
        out.innerHTML = o.show(v);
        input.setAttribute("aria-valuetext", o.say ? o.say(v) : out.textContent);
        minus.setAttribute("aria-disabled", String(v <= o.min + EPS));
        plus.setAttribute("aria-disabled", String(v >= o.max - EPS));
        if (!silent) o.onChange(v);
      },
      config: function (no) {
        Object.keys(no).forEach(function (k) { o[k] = no[k]; });
        input.min = o.min; input.max = o.max; input.step = o.step;
        lab.innerHTML = o.labelHtml || LM.esc(o.name);
        minus.setAttribute("aria-label", o.name + " kleiner");
        plus.setAttribute("aria-label", o.name + " größer");
      }
    };
    input.addEventListener("input", function () { api.set(Number(input.value)); });
    minus.addEventListener("click", function () { if (api.value > o.min + EPS) api.set(stepValue(api.value, -1, o.step, o.min, o.max)); });
    plus.addEventListener("click", function () { if (api.value < o.max - EPS) api.set(stepValue(api.value, 1, o.step, o.min, o.max)); });
    api.config({});
    api.set(o.value, true);
    return api;
  }

  // Beschriftungs-Pille im SVG. set(teile, x, y, links, rechts) zentriert bei x, bleibt aber im Bild.
  // teile: Text oder Liste [[text, klasse], …] (z. B. „(richtig)“ in Grün).
  function makePill(parent, cls, animate) {
    var g = svgEl("g", animate ? { class: "mo-pill " + cls, "data-anim": "wait" } : { class: "mo-pill " + cls }, parent);
    var rect = svgEl("rect", { x: -20, y: -10.5, width: 40, height: 21, rx: 10.5, ry: 10.5 }, g);
    var t = svgEl("text", { x: 0, y: 4.3, "text-anchor": "middle" }, g);
    var last = null, w = 40;
    return {
      g: g,
      set: function (parts, x, y, lo, hi) {
        var key = JSON.stringify(parts);
        if (key !== last) {
          last = key;
          t.textContent = "";
          (typeof parts === "string" ? [[parts, ""]] : parts).forEach(function (p) {
            var s = svgEl("tspan", p[1] ? { class: p[1] } : {}, t);
            s.textContent = p[0];
          });
          w = textW(t) + 18;
          rect.setAttribute("x", -w / 2);
          rect.setAttribute("width", w);
        }
        var cx = hi - lo <= w ? (lo + hi) / 2 : clamp(x, lo + w / 2, hi - w / 2);
        move(g, cx, y);
        return { x: cx, w: w };
      }
    };
  }

  /* ================================================================
     1. Getrimmtes Mittel (trim-mean)
     ================================================================ */

  LM.widget("trim-mean", function (el) {
    var PRE = [
      { id: "rt", label: "Reaktionszeiten (Aufgabe 8, n = 60)", xs: RT_A8, unit: "ms", what: "die 60 Reaktionszeiten aus Aufgabe 8" },
      { id: "f95", label: "Folie 95 mit Ausreißer", xs: [3, 6, 8, 9, 11, 150], unit: "", what: "" },
      { id: "own", label: "Eigene", xs: null, unit: "", what: "" }
    ];
    var CHIPS = [0, 5, 10, 20];
    var st = { pre: "rt", pct: 10, xs: RT_A8.slice(), pad: 1, unit: "ms", ownText: "12 5 20 8 4 38 10 5 15" };
    var cur = null, curve = null, G = null, SP = null, ownTimer = 0, wasAllOut = null;

    el.classList.add("widget", "mo", "mo-trim");
    if (LM.reduceMotion) el.classList.add("mo-still");
    head(el, "Getrimmtes Mittel: erst die Ränder weg, dann mitteln", "Folie 116",
      "Schieb den Regler. An jedem Ende fallen gleich viele Werte weg, vom Rest nimmst du das normale Mittel. Schau, wohin das Mittel wandert.");

    /* --- Daten --- */
    var seg = segGroup("Daten wählen", PRE.map(function (p) { return [p.id, p.label]; }), st.pre, choose);
    var ownId = uid("own");
    var ownTa = h("textarea", { class: "data-input mo-own-in", attrs: { id: ownId, rows: "2", spellcheck: "false", autocomplete: "off", placeholder: "z. B. 3 6 8 9 11 150" } });
    ownTa.value = st.ownText;
    var ownMsg = h("p", { class: "mo-own-msg", attrs: { "aria-live": "polite" } });
    var ownBox = h("div", { class: "mo-own", attrs: { hidden: "" } }, [
      h("label", { class: "mo-own-label", attrs: { for: ownId }, text: "Deine Zahlen, getrennt mit Leerzeichen oder Semikolon:" }), ownTa, ownMsg
    ]);
    ownTa.addEventListener("input", function () { clearTimeout(ownTimer); ownTimer = setTimeout(applyOwn, 260); });

    /* --- Regler --- */
    var sId = uid("t");
    var slider = h("input", { class: "slider", attrs: { type: "range", id: sId, min: 0, max: 25, step: 1, value: st.pct } });
    var tOut = h("output", { class: "mo-tval", attrs: { for: sId } });
    var chipBtns = CHIPS.map(function (p) {
      return h("button", { class: "chip", text: p + " %", attrs: { type: "button", "aria-pressed": "false", "aria-label": p + " % je Seite" }, on: { click: function () { setPct(p); } } });
    });
    slider.addEventListener("input", function () { setPct(Number(slider.value)); });
    var ctl = h("div", { class: "mo-tctl" }, [
      h("div", { class: "mo-tctl-top" }, [h("label", { class: "mo-tlabel", attrs: { for: sId }, text: "Weglassen je Seite" }), tOut]),
      slider,
      h("div", { class: "mo-chips", attrs: { role: "group", "aria-label": "Schnellwahl" } }, chipBtns)
    ]);

    /* --- Rechnung --- */
    var kMath = h("p", { class: "mo-kline" });
    var mLine = h("p", { class: "mo-mline" });
    var kHint = h("p", { class: "mo-khint" });
    var kBox = h("div", { class: "mo-kbox" }, [kMath, mLine, kHint]);

    /* --- Diagramm, Kennzahlen, Sätze, Wanderkurve, R --- */
    var stripBox = h("div", { class: "chart mo-strip" });
    var tMean = tile("Mittel", "s-mean mo-dashed"), tTrim = tile("getrimmtes Mittel", "s-mean"), tMed = tile("Median", "s-med");
    var cutP = h("p", { class: "mo-cut" }), outP = h("p", { class: "mo-outs" }), nearP = h("p", { class: "mo-near" });
    var say = h("div", { class: "mo-say", attrs: { role: "status", "aria-live": "polite" } }, [cutP, outP, nearP]);
    var sparkBox = h("div", { class: "chart mo-spark" });
    var sparkNote = h("p", { class: "mo-spark-note" });
    var R = rBlock('In R <span class="mo-r-note">(R-Befehl nicht auf den Folien)</span>');
    // Der Befehl ist Zusatz, das getrimmte Mittel selbst steht auf Folie 116.
    R.el.insertBefore(h("p", { class: "mo-hint mo-r-hint", text: "Den R-Befehl musst du in der Klausur nicht kennen. Die Rechnung dahinter schon: Das getrimmte Mittel steht auf Folie 116." }), R.el.children[1]);

    el.appendChild(h("div", { class: "w-controls mo-data" }, [seg.el]));
    el.appendChild(ownBox);
    el.appendChild(ctl);
    el.appendChild(kBox);
    el.appendChild(h("div", { class: "w-out" }, [
      stripBox,
      h("div", { class: "stats-row mo-tiles mo-tiles-tail" }, [tMean.el, tTrim.el, tMed.el]),
      say,
      h("div", { class: "mo-spark-wrap" }, [
        h("p", { class: "mo-spark-title", html: "So wandert das getrimmte Mittel <span>von 0 % bis 49 % je Seite. Hinterlegt: der Bereich deines Reglers (0 bis 25 %).</span>" }),
        sparkBox, sparkNote
      ]),
      R.el
    ]));

    // Datenwerte wie in der Vorlage (Aufgabe 8: immer eine Nachkommastelle, „175,0“), eigene Zahlen wie getippt
    function fData(x) { return st.pad === null ? fmt(x, 4) : fixedDe(x, st.pad); }

    function compute() { cur = trimView(st.xs, st.pct); }

    function setPct(p) {
      p = clamp(Math.round(p), 0, 25);
      if (p === st.pct && cur) { syncCtl(); return; }
      st.pct = p;
      compute();
      render();
      stripUpdate();
      sparkUpdate();
    }

    function choose(id) {
      st.pre = id;
      seg.set(id);
      var p = PRE.filter(function (q) { return q.id === id; })[0];
      ownBox.hidden = id !== "own";
      if (id === "own") { applyOwn(); return; }
      ownMsg.textContent = "";
      setData(p.xs, p.unit, decimalsOf(p.xs, 3));
    }

    function applyOwn() {
      st.ownText = ownTa.value;
      var r = LM.parseList(ownTa.value);
      var bad = r.bad.length ? "Das verstehe ich nicht: " + r.bad.slice(0, 3).join(", ") + (r.bad.length > 3 ? " …" : "") + ". " : "";
      ownMsg.className = "mo-own-msg";
      if (r.values.length < 2) { ownMsg.textContent = bad + "Tipp mindestens zwei Zahlen ein."; ownMsg.classList.add("is-miss"); return; }
      if (r.values.length > 300) { ownMsg.textContent = "Bitte höchstens 300 Zahlen."; ownMsg.classList.add("is-miss"); return; }
      ownMsg.textContent = bad + r.values.length + " Zahlen erkannt.";
      if (bad) ownMsg.classList.add("is-miss");
      setData(r.values, "", null);
    }

    function setData(xs, unit, pad) {
      st.xs = xs.slice();
      st.pad = pad;
      st.unit = unit;
      wasAllOut = null;
      compute();
      curve = trimCurve(st.xs, 49);
      render();
      strip.redraw();
      sparkChart.redraw();
    }

    function syncCtl() {
      var v = cur;
      tOut.textContent = st.pct + " %";
      if (Number(slider.value) !== st.pct) slider.value = st.pct;
      slider.setAttribute("aria-valuetext", st.pct + " % je Seite, " + (v.k === 1 ? "1 Wert" : v.k + " Werte") + " je Seite weg");
      chipBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", String(CHIPS[i] === st.pct)); });
    }

    function render() {
      var v = cur, u = st.unit ? " " + st.unit : "";
      syncCtl();
      kMath.innerHTML = tex(kTex(v)) + ' <span class="mo-kwords">' + LM.esc(kWords(v)) + "</span>";
      kHint.innerHTML = tex("\\lfloor \\; \\rfloor") + " heißt abrunden. " + tex("t") + " ist der Anteil je Seite, hier " + st.pct + " % = " + fixedDe(v.t, 2) + ".";
      mLine.innerHTML = (v.k ? "Mittel der übrigen " + v.m + " Werte: " : "Mittel aller " + v.n + " Werte: ") +
        '<span class="mo-nowrap">' + tex(texNum(v.info.sum, 4) + " \\div " + v.m + " " + eqTex(v.value, 2)) +
        (u ? '<span class="mo-unit">' + u + "</span>" : "") + "</span>";
      tMean.set(fmt(v.mean, 2) + unitHtml(st.unit), "aus allen " + v.n + " Werten", "Mittel");
      tTrim.set(fmt(v.value, 2) + unitHtml(st.unit), "aus " + (v.m === 1 ? "1 Wert" : v.m + " Werten") + (v.k ? ", je Seite " + v.k + " weg" : ", nichts weg"),
        "getrimmtes Mittel (" + st.pct + " %)");
      tMed.set(fmt(v.median, 2) + unitHtml(st.unit), "die Mitte der sortierten Werte", "Median");
      var ts = trimSentences(v, fData);
      cutP.textContent = ts.cut;
      outP.textContent = ts.out;
      outP.hidden = !ts.out;
      nearP.textContent = ts.near;
      nearP.hidden = !ts.near;
      var allOut = v.out.length > 0 && !v.still.length;
      outP.classList.toggle("is-done", allOut);
      if (allOut && wasAllOut === false && !LM.reduceMotion) {
        outP.classList.remove("mo-pop");
        void outP.offsetWidth;
        outP.classList.add("mo-pop");
      }
      wasAllOut = allOut;
      var p = PRE.filter(function (q) { return q.id === st.pre; })[0];
      var lines = [];
      if (v.n <= 12) lines.push(["x <- c(" + st.xs.map(rLit).join(", ") + ")", "deine Daten"]);
      else lines.push(["", "x enthält " + (p && p.what ? p.what : "deine " + v.n + " Werte")]);
      lines.push([rTrimCall(st.pct), "getrimmtes Mittel: je Seite " + st.pct + " % weg, auf 2 Stellen gerundet"]);
      R.set(lines, rTrimOut(st.xs, st.pct));
    }

    /* --- Punktstreifen --- */
    function drawStrip(W) {
      var s = S.sorted(st.xs), n = s.length;
      if (!n) { stripBox.innerHTML = ""; G = null; return; }
      var svg = newSvg(stripBox, W, 100, "");
      var hatchId = uid("hatch");
      var defs = svgEl("defs", {}, svg);
      var pat = svgEl("pattern", { id: hatchId, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      svgEl("line", { class: "mo-hatch-line", x1: 0, y1: 0, x2: 0, y2: 7 }, pat);

      var padX = 10, x0 = padX + 6, x1 = W - padX - 6;
      var dom = domainFor(s[0], s[n - 1]);
      var X = LM.svg.scale(dom.lo, dom.hi, x0, x1);
      var px = s.map(X);
      var lay = dotLayout(px, W), r = lay.r, gap = lay.gap, levels = lay.levels, maxL = lay.maxL;
      var rowY = [12, 37, 62];                 // Pillen: Mittel, Median, getrimmt
      var zoneTop = rowY[2] + 17, cntY = zoneTop + 14;
      var dotsTop = cntY + 8;
      var axisY = dotsTop + (maxL + 1) * gap + 4;
      var H = axisY + 34;
      sizeSvg(svg, W, H);

      var gZones = svgEl("g", { class: "mo-zones" }, svg);
      function zone() {
        var g = svgEl("g", { class: "mo-zone" }, gZones);
        var bg = svgEl("rect", { class: "mo-zone-bg", y: zoneTop, height: axisY - zoneTop, x: 0, width: 0 }, g);
        var ht = svgEl("rect", { class: "mo-zone-hatch", y: zoneTop, height: axisY - zoneTop, x: 0, width: 0, fill: "url(#" + hatchId + ")" }, g);
        var ln = svgEl("line", { class: "mo-cutline", y1: zoneTop, y2: axisY, x1: 0, x2: 0 }, g);
        return { g: g, bg: bg, ht: ht, ln: ln };
      }
      var zL = zone(), zR = zone();

      // Achse
      svgEl("line", { class: "ax", x1: x0 - 6, x2: x1 + 6, y1: axisY, y2: axisY }, svg);
      tickValues(dom, (x1 - x0) / (dom.hi - dom.lo), W < 480 ? 46 : 56).forEach(function (tv) {
        var tx = X(tv);
        svgEl("line", { class: "ax", x1: tx, x2: tx, y1: axisY, y2: axisY + 4 }, svg);
        txt(svg, tx, axisY + 28, fmt(tv, 2), { class: "tick", "text-anchor": "middle" });
      });

      // Punkte
      var gDots = svgEl("g", { class: "mo-dots" }, svg);
      var dots = s.map(function (v, i) {
        return svgEl("circle", { class: "mo-dot", cx: px[i], cy: axisY - 3 - r - levels[i] * gap, r: r }, gDots);
      });

      // Linien: Mittel (gestrichelt + Dreieck), Median, getrimmt (bewegt sich)
      var v = cur, xm = X(v.mean), xmed = X(v.median);
      svgEl("line", { class: "mo-ln mo-ln-mean", x1: xm, x2: xm, y1: rowY[0] + 10, y2: axisY }, svg);
      svgEl("polygon", { class: "mo-tri", points: xm + "," + (axisY + 3) + " " + (xm - 6) + "," + (axisY + 13) + " " + (xm + 6) + "," + (axisY + 13) }, svg);
      svgEl("line", { class: "mo-ln mo-ln-med", x1: xmed, x2: xmed, y1: rowY[1] + 10, y2: axisY }, svg);
      var trimG = animGroup(svg);
      svgEl("line", { class: "mo-ln mo-ln-trim", x1: 0, x2: 0, y1: rowY[2] + 10, y2: axisY }, trimG);

      // Zähler „6 weg“
      var cntL = txt(svg, x0 - 4, cntY, "", { class: "mo-zone-lbl mo-halo", "text-anchor": "start" });
      var cntR = txt(svg, x1 + 4, cntY, "", { class: "mo-zone-lbl mo-halo", "text-anchor": "end" });

      // Pillen
      var pMean = makePill(svg, "mo-pill-mean"), pMed = makePill(svg, "mo-pill-med"), pTrim = makePill(svg, "mo-pill-trim", true);
      pMean.set("Mittel " + fmt(v.mean, 2), xm, rowY[0], 2, W - 2);
      pMed.set("Median " + fmt(v.median, 2), xmed, rowY[1], 2, W - 2);

      G = { svg: svg, W: W, X: X, s: s, n: n, dots: dots, zL: zL, zR: zR, cntL: cntL, cntR: cntR, trimG: trimG, pTrim: pTrim,
        rowY: rowY, left: x0 - 6, right: x1 + 6 };
      stripUpdate();
    }

    function stripUpdate() {
      if (!G) return;
      var v = cur, k = v.k, n = G.n;
      G.dots.forEach(function (c, i) { c.classList.toggle("is-cut", i < k || i >= n - k); });
      function setZone(z, a, b) {
        var w = Math.max(0, b - a);
        [z.bg, z.ht].forEach(function (rc) { rc.setAttribute("x", a); rc.setAttribute("width", w); });
        z.g.style.display = w > 0 ? "" : "none";
      }
      if (k > 0) {
        var cl = (G.X(G.s[k - 1]) + G.X(G.s[k])) / 2, ch = (G.X(G.s[n - k - 1]) + G.X(G.s[n - k])) / 2;
        setZone(G.zL, G.left, cl);
        setZone(G.zR, ch, G.right);
        G.zL.ln.setAttribute("x1", cl); G.zL.ln.setAttribute("x2", cl);
        G.zR.ln.setAttribute("x1", ch); G.zR.ln.setAttribute("x2", ch);
        G.cntL.textContent = k + " weg";
        G.cntR.textContent = k + " weg";
      } else {
        setZone(G.zL, 0, 0);
        setZone(G.zR, 0, 0);
        G.cntL.textContent = "";
        G.cntR.textContent = "";
      }
      var tx = G.X(v.value);
      move(G.trimG, tx, 0);
      G.pTrim.set("getrimmt " + fmt(v.value, 2), tx, G.rowY[2], 2, G.W - 2);
      G.svg.setAttribute("aria-label", "Punktstreifen mit den " + n + " sortierten Werten. " +
        (k ? "Je " + k + " Werte links und rechts sind gestrichen. " : "Nichts ist gestrichen. ") +
        "Mittel " + fmt(v.mean, 2) + ", getrimmtes Mittel " + fmt(v.value, 2) + ", Median " + fmt(v.median, 2) + ".");
    }

    /* --- Wanderkurve --- */
    function drawSpark(W) {
      if (!curve || !curve.length) { sparkBox.innerHTML = ""; SP = null; return; }
      var H = 150, m = { l: 48, r: 14, t: 16, b: 30 };
      var svg = newSvg(sparkBox, W, H, "");
      var med = cur.median;
      var vals = curve.map(function (c) { return c.value; }).concat([med]);
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
      var pad = (hi - lo) * 0.14;
      lo -= pad; hi += pad;
      var X = LM.svg.scale(0, 49, m.l, W - m.r), Y = LM.svg.scale(lo, hi, H - m.b, m.t);
      LM.svg.ticks(lo, hi, 3).forEach(function (tv) {
        svgEl("line", { class: "gridline", x1: m.l, x2: W - m.r, y1: Y(tv), y2: Y(tv) }, svg);
        txt(svg, m.l - 7, Y(tv) + 4, fmt(tv, 2), { class: "tick", "text-anchor": "end" });
      });
      (W < 480 ? [0, 25, 49] : [0, 10, 20, 25, 30, 40, 49]).forEach(function (p) {
        txt(svg, X(p), H - m.b + 18, p + " %", { class: "tick", "text-anchor": p === 0 ? "start" : p === 49 ? "end" : "middle" });
      });
      // Bereich des Reglers (0–25 %) leicht hinterlegt
      svgEl("rect", { class: "mo-sp-band", x: X(0), y: m.t, width: X(25) - X(0), height: H - m.b - m.t }, svg);
      // Mittel und Median als Bezugslinien: Die Kurve wandert von der einen zur anderen
      var mean = cur.mean, yMean = Y(mean), yMed = Y(med), close = Math.abs(yMean - yMed) < 18;
      svgEl("line", { class: "mo-ln mo-ln-mean mo-sp-ref", x1: m.l, x2: W - m.r, y1: yMean, y2: yMean }, svg);
      svgEl("line", { class: "mo-ln mo-ln-med mo-sp-med", x1: m.l, x2: W - m.r, y1: yMed, y2: yMed }, svg);
      // Stufenkurve
      function path(from, to) {
        var d = "";
        for (var p = from; p <= to; p++) {
          var y = Y(curve[p].value), a = X(Math.max(from, p - 0.5)), b = X(Math.min(to, p + 0.5));
          d += (d ? " L" : "M") + a + "," + y + " L" + b + "," + y;
        }
        return d;
      }
      svgEl("path", { class: "mo-sp-path is-far", d: path(25, 49) }, svg);
      svgEl("path", { class: "mo-sp-path", d: path(0, 25) }, svg);
      // Beschriftungen rechts: Mittel auf der Seite weg vom Median, Median auf der Seite weg vom Kurvenende
      var meanAbove = close ? mean >= med : mean > med;
      var medAbove = close ? !meanAbove : !(curve[49].value > med + 1e-9);
      txt(svg, W - m.r - 2, yMean + (meanAbove ? -7 : 15), "Mittel " + fmt(mean, 2), { class: "lbl lbl-mean mo-halo", "text-anchor": "end" });
      txt(svg, W - m.r - 2, yMed + (medAbove ? -7 : 15), "Median " + fmt(med, 2), { class: "lbl lbl-med mo-halo", "text-anchor": "end" });
      // aktueller Punkt
      var guide = animGroup(svg);
      svgEl("line", { class: "mo-sp-guide", x1: 0, x2: 0, y1: m.t, y2: H - m.b }, guide);
      var dotG = animGroup(svg);
      svgEl("circle", { class: "mo-sp-dot", cx: 0, cy: 0, r: 5.5 }, dotG);
      var vl = txt(dotG, 0, -11, "", { class: "mo-sp-val mo-halo", "text-anchor": "middle" });
      SP = { svg: svg, X: X, Y: Y, guide: guide, dotG: dotG, vl: vl, W: W, m: m };
      sparkUpdate();
    }

    function sparkUpdate() {
      if (!SP || !curve) return;
      var c = curve[st.pct], x = SP.X(st.pct), y = SP.Y(c.value);
      move(SP.guide, x, 0);
      move(SP.dotG, x, y);
      SP.vl.textContent = fmt(c.value, 2);
      SP.vl.setAttribute("text-anchor", x < SP.m.l + 24 ? "start" : "middle");
      SP.vl.setAttribute("x", x < SP.m.l + 24 ? -4 : 0);
      var c49 = curve[49];
      SP.svg.setAttribute("aria-label", "Kurve des getrimmten Mittels für 0 % bis 49 % je Seite. Bei 0 % " + fmt(curve[0].value, 2) +
        ", bei " + st.pct + " % " + fmt(c.value, 2) + ", bei 49 % " + fmt(c49.value, 2) + ". Median " + fmt(cur.median, 2) + ".");
      var same = Math.abs(c49.value - cur.median) < 1e-9;
      sparkNote.textContent = "Links (0 %) ist es das normale Mittel. Ganz rechts (49 %) " +
        (c49.m === 1 ? "bleibt nur noch der mittlere Wert übrig" : "bleiben nur noch die " + numWord(c49.m) + " mittleren Werte übrig") +
        (same ? ". Ihr Mittel ist genau der Median." : ". Das liegt schon nah am Median.");
      if (same && c49.m === 1) sparkNote.textContent = "Links (0 %) ist es das normale Mittel. Ganz rechts (49 %) bleibt nur noch der mittlere Wert übrig. Das ist genau der Median.";
    }

    compute();
    curve = trimCurve(st.xs, 49);
    render();
    var strip = LM.svg.responsive(stripBox, drawStrip);
    var sparkChart = LM.svg.responsive(sparkBox, drawSpark);
    whenFonts(function () { strip.redraw(); sparkChart.redraw(); });
  });

  /* ================================================================
     2. Geometrisches Mittel (geo-mean)
     ================================================================ */

  LM.widget("geo-mean", function (el) {
    var PRE = [
      { id: "kurs", label: "Kurs ×2, dann ×0,5", start: 100, xs: [2, 0.5], yName: "Kurs", xName: "Schritt" },
      { id: "a12", label: "Lernfortschritt (Aufgabe 12)", start: 0.55, xs: ratios(A12_F), yName: "Fehleranteil f", xName: "Durchgang i" },
      { id: "own", label: "Eigene Faktoren", start: 100, xs: null, yName: "Wert (Start 100)", xName: "Schritt" }
    ];
    var st = { pre: "kurs", own: [1.2, 0.8, 1.5], log: false };
    var cur = null, rows = [];

    el.classList.add("widget", "mo", "mo-geo");
    head(el, "Geometrisches Mittel: der faire Schnitt für Faktoren", "Folien 117–119",
      "Bei Wachstum wird malgenommen, nicht addiert. Welcher feste Faktor pro Schritt bringt dich genau ans Ziel?");

    var seg = segGroup("Beispiel wählen", PRE.map(function (p) { return [p.id, p.label]; }), st.pre, choose);
    var facBox = h("div", { class: "mo-facs" });
    var ownRows = h("div", { class: "mo-rows mo-own-rows" });
    var addBtn = h("button", { class: "btn btn-sm", text: "+ Faktor dazu", attrs: { type: "button" }, on: { click: addFactor } });
    var ownBox = h("div", { class: "mo-geo-own", attrs: { hidden: "" } }, [
      h("p", { class: "mo-hint", text: "Stell 2 bis 6 Faktoren ein. ×1,2 heißt +20 %, ×0,8 heißt −20 %. Start ist 100." }),
      ownRows, h("div", { class: "mo-own-actions" }, [addBtn])
    ]);
    var warn = h("p", { class: "mo-warn", attrs: { hidden: "" } });
    var legend = h("ul", { class: "mo-legend", attrs: { "aria-label": "Legende" } });
    var chartBox = h("div", { class: "chart mo-geo-chart" });
    var tGM = tile("geometrisches Mittel", "s-mean"), tAM = tile("arithmetisches Mittel", "s-mean mo-dashed");
    var fGM = h("p", { class: "mo-f" }), fAM = h("p", { class: "mo-f" });
    var fProd = h("div", { class: "mo-f mo-prod" }), fWhy = h("p", { class: "mo-why" }), fExtra = h("p", { class: "mo-extra-p" });
    var logId = uid("log");
    var logBtn = h("button", { class: "chip mo-logbtn", text: "Log-Trick (Folie 117/118)", attrs: { type: "button", "aria-pressed": "false", "aria-controls": logId }, on: { click: toggleLog } });
    var logPanel = h("div", { class: "mo-logpanel", attrs: { id: logId, hidden: "" } });
    var live = h("p", { class: "mo-sr", attrs: { role: "status", "aria-live": "polite" } });
    var R = rBlock("In R: eigene Funktion von Folie 118");

    el.appendChild(h("div", { class: "w-controls" }, [seg.el]));
    el.appendChild(ownBox);
    el.appendChild(facBox);
    var results = h("div", { class: "w-out mo-geo-out" }, [
      legend, chartBox,
      h("div", { class: "stats-row mo-tiles" }, [tGM.el, tAM.el]),
      h("div", { class: "mo-fbox" }, [fGM, fAM, fProd, fWhy, fExtra]),
      h("div", { class: "mo-logwrap" }, [logBtn, logPanel])
    ]);
    el.appendChild(warn);
    el.appendChild(results);
    el.appendChild(live);

    function preset() { return PRE.filter(function (p) { return p.id === st.pre; })[0]; }
    function dig(v) { return smartDigits(v); }

    function choose(id) {
      st.pre = id;
      seg.set(id);
      ownBox.hidden = id !== "own";
      if (id === "own") buildOwn();
      update();
    }

    function buildOwn(focusIdx) {
      ownRows.innerHTML = "";
      rows = st.own.map(function (v, i) {
        var r = rangeRow({
          name: "Faktor " + (i + 1), labelHtml: "Faktor x<sub>" + (i + 1) + "</sub>", min: 0.2, max: 3, step: 0.05, value: v,
          show: function (x) { return "×" + fmt(x, 2) + ' <small class="mo-pct">' + pctChange(x) + "</small>"; },
          say: function (x) { return "mal " + fmt(x, 2) + ", " + pctChange(x); },
          onChange: function (x) { st.own[i] = x; update(); }
        });
        var rm = h("button", { class: "btn btn-sm btn-ghost mo-rm", text: "✕", attrs: { type: "button", "aria-label": "Faktor " + (i + 1) + " entfernen" }, on: { click: function () { removeFactor(i); } } });
        rm.hidden = st.own.length <= 2;
        r.el.classList.add("mo-row-rm");
        r.el.appendChild(rm);
        ownRows.appendChild(r.el);
        return r;
      });
      addBtn.disabled = st.own.length >= 6;
      if (focusIdx !== undefined && rows[focusIdx]) rows[focusIdx].input.focus();
    }
    function addFactor() {
      if (st.own.length >= 6) return;
      st.own.push(1.1);
      buildOwn(st.own.length - 1);
      update();
    }
    function removeFactor(i) {
      if (st.own.length <= 2) return;
      st.own.splice(i, 1);
      buildOwn(Math.min(i, st.own.length - 1));
      update();
    }

    function toggleLog() {
      st.log = !st.log;
      logBtn.setAttribute("aria-pressed", String(st.log));
      logPanel.hidden = !st.log;
      if (st.log) renderLog();
    }

    function renderFacts() {
      var p = preset(), G = cur;
      facBox.innerHTML = "";
      facBox.hidden = p.id === "own";
      if (p.id === "kurs") {
        facBox.appendChild(h("p", { class: "mo-facline" }, [
          h("span", { class: "mo-fac mo-fac-start", text: "Start: 100" }),
          h("span", { class: "mo-fac", html: "Schritt 1: ×2 <small>(+100 %)</small>" }),
          h("span", { class: "mo-fac", html: "Schritt 2: ×0,5 <small>(−50 %)</small>" }),
          h("span", { class: "mo-fac mo-fac-start", text: "Ende: 100" })
        ]));
      } else if (p.id === "a12") {
        // breit: Durchgänge nebeneinander (wie auf dem Übungsblatt); schmal: untereinander (kein Seitwärts-Scrollen)
        var head1 = "<tr><th scope=\"row\">Durchgang " + tex("i") + "</th>" + A12_F.map(function (f, i) { return '<td class="num">' + i + "</td>"; }).join("") + "</tr>";
        var row1 = "<tr><th scope=\"row\">Fehleranteil " + tex("f_i") + "</th>" + A12_F.map(function (f) { return '<td class="num">' + fmt(f, 2) + "</td>"; }).join("") + "</tr>";
        var row2 = "<tr><th scope=\"row\">Faktor " + tex("x_i = f_i / f_{i-1}") + '</th><td class="num">–</td>' +
          G.xs.map(function (x) { return '<td class="num">' + fmt(x, 4) + "</td>"; }).join("") + "</tr>";
        var vHead = '<thead><tr><th scope="col">' + tex("i") + '</th><th scope="col" class="num">' + tex("f_i") + '</th><th scope="col" class="num">' +
          tex("x_i = f_i / f_{i-1}") + "</th></tr></thead>";
        var vBody = A12_F.map(function (f, i) {
          return '<tr><th scope="row">' + i + '</th><td class="num">' + fmt(f, 2) + '</td><td class="num">' +
            (i ? fmt(f, 2) + " ÷ " + fmt(A12_F[i - 1], 2) + (isRounded(G.xs[i - 1], 4) ? " ≈ " : " = ") + fmt(G.xs[i - 1], 4) : "–") + "</td></tr>";
        }).join("");
        facBox.appendChild(h("div", { class: "table-wrap mo-a12 mo-a12-h" }, [h("table", { class: "t", html: "<tbody>" + head1 + row1 + row2 + "</tbody>" })]));
        facBox.appendChild(h("div", { class: "table-wrap mo-a12 mo-a12-v" }, [h("table", { class: "t", html: vHead + "<tbody>" + vBody + "</tbody>" })]));
      }
    }

    function update() {
      var p = preset(), xs = p.id === "own" ? st.own.slice() : p.xs;
      cur = growth(xs, p.start);
      var G = cur;
      renderFacts();
      warn.hidden = G.ok;
      results.hidden = !G.ok;
      if (!G.ok) {
        warn.textContent = "Das geometrische Mittel geht nur mit positiven Werten: Alle Faktoren müssen größer als 0 sein (Folie 117).";
        live.textContent = warn.textContent;
        return;
      }
      var d = dig(Math.max(Math.abs(G.end), Math.abs(G.endAm), Math.abs(G.start)));
      var same = Math.abs(G.miss) <= 1e-9 * Math.max(1, Math.abs(G.end));
      legend.innerHTML =
        '<li><svg width="30" height="12" aria-hidden="true"><line class="mo-g-real" x1="1" y1="6" x2="29" y2="6"/><circle class="mo-g-dot" cx="15" cy="6" r="4"/></svg>echter Verlauf</li>' +
        '<li><svg width="30" height="12" aria-hidden="true"><line class="mo-g-gm" x1="1" y1="6" x2="29" y2="6"/></svg>konstant mit geometrischem Mittel (×' + fmt(G.gm, 4) + ")</li>" +
        '<li><svg width="30" height="12" aria-hidden="true"><line class="mo-g-am" x1="1" y1="6" x2="29" y2="6"/></svg>konstant mit arithmetischem Mittel (×' + fmt(G.am, 4) + ")</li>";
      tGM.set(fmt(G.gm, 4), "pro Schritt " + pctChange(G.gm) + ". Trifft das Ende genau: " + fmt(G.end, d));
      tAM.set(fmt(G.am, 4), same ? "Alle Faktoren gleich: trifft auch genau." : "Landet bei " + fmt(G.endAm, d) + " statt " + fmt(G.end, d) + ".");
      fGM.innerHTML = tex(gmTex(G, 4));
      fAM.innerHTML = tex(amTex(G, 4));
      var pd = smartDigits(G.product);
      if (p.id === "a12") {
        fProd.innerHTML = "<p>Das Produkt der Faktoren ist <strong>Endwert ÷ Startwert</strong>. Hier kürzt sich alles dazwischen weg:</p>" +
          '<p class="mo-tele">' + tex(telescopeTex(A12_F) + " " + eqTex(G.product, 4)) + "</p>";
      } else {
        fProd.innerHTML = "<p>Das Produkt der Faktoren ist <strong>Endwert ÷ Startwert</strong>: " +
          tex(listTex(G.xs, 4, "\\cdot") + " " + eqTex(G.product, pd) + " = " + texNum(G.end, d) + " \\div " + texNum(G.start, d)) + ".</p>";
      }
      fWhy.innerHTML = "Darum trifft der Weg mit dem geometrischen Mittel immer genau: " + tex("GM^{" + G.n + "}") +
        " ist genau dieses Produkt. Mit dem arithmetischen Mittel klappt das nur, wenn alle Faktoren gleich sind.";
      if (p.id === "kurs") {
        fExtra.innerHTML = "Erst +100 %, dann −50 %: Am Ende steht der Kurs wieder bei 100. Das arithmetische Mittel 1,25 würde 25 % Wachstum pro Schritt vorgaukeln. Richtig ist das geometrische Mittel 1, also im Schnitt kein Wachstum.";
      } else if (p.id === "a12") {
        fExtra.innerHTML = "Bedeutung: Der Fehleranteil sinkt pro Durchgang auf etwa " + fmt(G.gm * 100, 1) + " % des vorigen Werts, also um etwa " +
          fmt((1 - G.gm) * 100, 1) + " %. Das arithmetische Mittel " + fmt(G.am, 4) + " ist hier zufällig ähnlich. Es landet aber bei " +
          fmt(G.endAm, 4) + " statt genau bei " + tex("f_5 = 0{,}21") + ".";
      } else {
        fExtra.innerHTML = "Im Schnitt pro Schritt: ×" + fmt(G.gm, 4) + ", also " + pctChange(G.gm) + ".";
      }
      live.textContent = "Geometrisches Mittel " + fmt(G.gm, 4) + ", arithmetisches Mittel " + fmt(G.am, 4) + ". Echter Endwert " +
        fmt(G.end, d) + ", mit dem arithmetischen Mittel " + fmt(G.endAm, d) + ".";
      if (st.log) renderLog();
      chart.redraw();
    }

    function renderLog() {
      var G = cur;
      if (!G || !G.ok) { logPanel.innerHTML = ""; return; }
      var body = G.xs.map(function (x, i) {
        return "<tr><td>" + tex("x_{" + (i + 1) + "}") + '</td><td class="num">' + fmt(x, 4) + '</td><td class="num">' + fmt(G.info.logs[i], 4) + "</td></tr>";
      }).join("");
      var p = preset(), xsCode;
      if (p.id === "a12") xsCode = "x <- c(" + A12_F.slice(1).map(function (f, i) { return rLit(f) + "/" + rLit(A12_F[i]); }).join(", ") + ")";
      else xsCode = "x <- c(" + G.xs.map(rLit).join(", ") + ")";
      logPanel.innerHTML = "";
      logPanel.appendChild(h("p", { html: "Der Logarithmus macht aus Malnehmen ein Plus: " + tex("\\ln(a \\cdot b) = \\ln a + \\ln b") +
        ". Darum ist " + tex("\\ln(GM)") + " einfach das normale Mittel der " + tex("\\ln x_i") + " (Folie 117). Mit " + tex("e^{\\dots}") +
        " kommst du zurück, in R heißt das <code>exp</code>." }));
      logPanel.appendChild(h("div", { class: "table-wrap mo-logtab" }, [h("table", { class: "t", html:
        '<thead><tr><th scope="col">Faktor</th><th scope="col" class="num">' + tex("x_i") + '</th><th scope="col" class="num">' + tex("\\ln x_i") + "</th></tr></thead><tbody>" + body + "</tbody>" })]));
      logPanel.appendChild(h("p", { class: "mo-f", html: tex(logMeanTex(G)) }));
      logPanel.appendChild(h("p", { class: "mo-f", html: tex("GM = e^{" + texNum(G.info.logMean, 4) + "} " + eqTex(G.gm, 4)) }));
      R.set([
        ["geometric_mean <- function(x) {", "eigene Funktion (Folie 118): Mittel der log-Werte, dann mit exp zurück"],
        ["  exp(mean(log(x)))", ""],
        ["}", ""],
        [xsCode, p.id === "a12" ? "die Faktoren f_i / f_(i-1)" : p.id === "kurs" ? "die Faktoren: mal 2, dann mal 0,5" : "deine Faktoren"],
        ["geometric_mean(x)", "geometrisches Mittel ausrechnen"]
      ], rGeoOut(G));
      logPanel.appendChild(R.el);
      logPanel.appendChild(h("p", { class: "mo-hint", html: "<code>log</code> ist in R der natürliche Logarithmus " + tex("\\ln") + "." }));
    }

    function drawChart(W) {
      var G = cur;
      if (!G || !G.ok) { chartBox.innerHTML = ""; return; }
      var p = preset(), n = G.n;
      var H = W < 480 ? 236 : 266, m = { l: 50, r: 64, t: 28, b: 42 };
      var svg = newSvg(chartBox, W, H, "");
      var X = LM.svg.scale(0, n, m.l, W - m.r);
      var all = G.real.concat(G.gmPath, G.amPath);
      var top = Math.max.apply(null, all) * 1.08;
      var Y = LM.svg.scale(0, top, H - m.b, m.t);
      LM.svg.ticks(0, top, 5).forEach(function (tv) {
        svgEl("line", { class: "gridline", x1: m.l, x2: W - m.r + 8, y1: Y(tv), y2: Y(tv) }, svg);
        txt(svg, m.l - 8, Y(tv) + 4, fmt(tv, 4), { class: "tick", "text-anchor": "end" });
      });
      svgEl("line", { class: "ax", x1: m.l, x2: W - m.r + 8, y1: Y(0), y2: Y(0) }, svg);
      for (var i = 0; i <= n; i++) {
        svgEl("line", { class: "ax", x1: X(i), x2: X(i), y1: Y(0), y2: Y(0) + 4 }, svg);
        txt(svg, X(i), Y(0) + 18, String(i), { class: "tick", "text-anchor": "middle" });
      }
      txt(svg, (m.l + W - m.r) / 2, H - 6, p.xName, { class: "axis-label", "text-anchor": "middle" });
      txt(svg, 4, 14, p.yName, { class: "axis-label", "text-anchor": "start" });
      function pts(arr) { return arr.map(function (v, j) { return X(j) + "," + Y(v); }).join(" "); }
      svgEl("polyline", { class: "mo-g-am", points: pts(G.amPath) }, svg);
      svgEl("polyline", { class: "mo-g-gm", points: pts(G.gmPath) }, svg);
      svgEl("polyline", { class: "mo-g-real", points: pts(G.real) }, svg);
      svgEl("circle", { class: "mo-g-amend", cx: X(n), cy: Y(G.endAm), r: 4 }, svg);
      svgEl("circle", { class: "mo-g-ring", cx: X(n), cy: Y(G.end), r: 9 }, svg);
      G.real.forEach(function (v, j) { svgEl("circle", { class: "mo-g-dot", cx: X(j), cy: Y(v), r: 4.5 }, svg); });
      // Faktoren zwischen den Schritten, in der Zeile der Achsenbeschriftung: 0 ×2 1 ×0,5 2
      if (X(1) - X(0) >= 64) {
        for (var j = 1; j <= n; j++) {
          txt(svg, (X(j - 1) + X(j)) / 2, Y(0) + 18, "×" + fmt(G.xs[j - 1], 2), { class: "mo-g-fac", "text-anchor": "middle" });
        }
      }
      // Lücke am Ende: So weit liegt das AM daneben
      var yR = Y(G.end), yA = Y(G.endAm), bx = X(n) + 13, d = dig(Math.max(Math.abs(G.end), Math.abs(G.endAm)));
      if (Math.abs(G.miss) > 1e-9 * Math.max(1, Math.abs(G.end))) {
        if (Math.abs(yA - yR) >= 3) svgEl("path", { class: "mo-g-gap", d: "M" + (bx - 4) + "," + yA + " H" + bx + " V" + yR + " H" + (bx - 4) }, svg);
        var missTxt = "+" + fmt(G.miss, d);
        var gl = txt(svg, bx + 5, (yA + yR) / 2 + 1, missTxt, { class: "mo-g-gaplbl mo-halo", "text-anchor": "start" });
        var gl2 = txt(svg, bx + 5, (yA + yR) / 2 + 14, "zu viel", { class: "mo-g-gapsub mo-halo", "text-anchor": "start" });
        if (Math.max(textW(gl), textW(gl2)) > W - bx - 6 || Math.abs(yA - yR) < 14) {
          // passt rechts nicht: eine Zeile am Endpunkt, auf der Seite, von der keine Linien kommen
          // (fällt der Verlauf, kommen die Linien von oben → Text darunter; sonst darüber)
          gl2.remove();
          gl.textContent = "AM " + missTxt + " zu viel";
          var below = G.gm < 1 && Math.max(yA, yR) + 24 <= Y(0) - 4;
          gl.setAttribute("x", W - 4);
          gl.setAttribute("y", below ? Math.max(yA, yR) + 24 : Math.min(yA, yR) - 15);
          gl.setAttribute("text-anchor", "end");
        }
      } else {
        txt(svg, W - 4, yR - 15, "beide genau", { class: "mo-g-gapsub mo-halo", "text-anchor": "end" });
      }
      svg.setAttribute("aria-label", "Liniendiagramm über " + n + " Schritte. Echter Verlauf von " + fmt(G.start, dig(G.start)) + " bis " +
        fmt(G.end, dig(G.end)) + ". Konstant mit dem geometrischen Mittel endet genau dort. Konstant mit dem arithmetischen Mittel endet bei " +
        fmt(G.endAm, dig(G.endAm)) + ".");
    }

    cur = growth(PRE[0].xs, PRE[0].start);
    var chart = LM.svg.responsive(chartBox, drawChart);
    update();
    whenFonts(function () { chart.redraw(); });
  });

  /* ================================================================
     3. Harmonisches Mittel (harm-mean)
     ================================================================ */

  LM.widget("harm-mean", function (el) {
    var st = { v1: 30, v2: 90, km: 60, hours: 1, mode: "km" };
    var cur = null;

    el.classList.add("widget", "mo", "mo-harm");
    head(el, "Harmonisches Mittel: das echte Durchschnittstempo", "Folie 120",
      "Hin und zurück ist die Strecke gleich, nur das Tempo nicht. Wie schnell warst du im Schnitt wirklich?");

    function kmh(v) { return fmt(v, 2) + " km/h"; }
    var r1 = rangeRow({ name: "Hinweg-Tempo", min: 10, max: 150, step: 5, value: st.v1, show: kmh, onChange: function (v) { st.v1 = v; update(); } });
    var r2 = rangeRow({ name: "Rückweg-Tempo", min: 10, max: 150, step: 5, value: st.v2, show: kmh, onChange: function (v) { st.v2 = v; update(); } });
    var r3 = rangeRow({ name: "Strecke", min: 10, max: 200, step: 10, value: st.km, show: function (v) { return fmt(v, 2) + " km"; },
      onChange: function (v) { if (st.mode === "km") st.km = v; else st.hours = v; update(); } });
    var modeBtn = h("button", { class: "chip mo-modebtn", attrs: { type: "button", "aria-pressed": "false" },
      html: 'Gleiche Zeit statt gleiche Strecke <span class="mo-xtag">Extra</span>', on: { click: function () { setMode(st.mode === "km" ? "zeit" : "km"); } } });
    var extra = h("div", { class: "callout callout-extra mo-extra", attrs: { hidden: "" } }, [
      h("p", { class: "callout-title", text: "Extra: Der Fall „gleiche Zeit“ steht nicht auf den Folien" }),
      h("p", { class: "mo-extra-txt" })
    ]);
    var timeBox = h("div", { class: "chart mo-time" }), speedBox = h("div", { class: "chart mo-speed" });
    var tAvg = tile("echter Schnitt", "mo-s-real"), tHM = tile("harmonisches Mittel", "s-mean"), tAM = tile("arithmetisches Mittel", "s-mean mo-dashed");
    var sayP = h("p", { class: "mo-hsay", attrs: { role: "status", "aria-live": "polite" } });
    var fHM = h("p", { class: "mo-f" }), fAM = h("p", { class: "mo-f" }), why = h("p", { class: "mo-why" });

    el.appendChild(h("div", { class: "mo-rows mo-harm-rows" }, [r1.el, r2.el, r3.el]));
    el.appendChild(h("div", { class: "w-controls" }, [modeBtn]));
    el.appendChild(extra);
    el.appendChild(h("div", { class: "w-out" }, [
      h("p", { class: "mo-chart-title", text: "Zeit unterwegs" }), timeBox,
      h("p", { class: "mo-chart-title", text: "Tempo in km/h" }), speedBox,
      h("div", { class: "stats-row mo-tiles mo-tiles-lead" }, [tAvg.el, tHM.el, tAM.el]),
      sayP,
      h("div", { class: "mo-fbox" }, [fHM, fAM]),
      why
    ]));

    function setMode(mode) {
      st.mode = mode;
      modeBtn.setAttribute("aria-pressed", String(mode === "zeit"));
      extra.hidden = mode !== "zeit";
      if (mode === "zeit") {
        r1.config({ name: "Tempo Abschnitt 1" });
        r2.config({ name: "Tempo Abschnitt 2" });
        r3.config({ name: "Zeit je Abschnitt", min: 0.25, max: 4, step: 0.25, show: function (v) { return duration(v).text; } });
        r3.set(st.hours, true);
      } else {
        r1.config({ name: "Hinweg-Tempo" });
        r2.config({ name: "Rückweg-Tempo" });
        r3.config({ name: "Strecke", min: 10, max: 200, step: 10, show: function (v) { return fmt(v, 2) + " km"; } });
        r3.set(st.km, true);
      }
      r1.set(st.v1, true);
      r2.set(st.v2, true);
      update();
    }

    function durTxt(hours) { var d = duration(hours); return (d.approx ? "etwa " : "") + d.text; }

    function update() {
      cur = trip(st.v1, st.v2, st.mode, st.mode === "km" ? st.km : st.hours);
      var T = cur, zeit = T.mode === "zeit";
      var hmOk = !zeit, eq = Math.abs(T.v1 - T.v2) < 1e-9;
      tAvg.set(fmt(T.avg, 2) + unitHtml("km/h"), fmt(T.dist, 2) + " km in " + durTxt(T.time));
      tHM.set(fmt(T.hm, 2) + unitHtml("km/h"), eq ? "gleich, weil beide Tempos gleich sind" : hmOk ? '<b class="mo-okt">✓ richtig</b>' : '<b class="mo-badt">✗ falsch</b>');
      tAM.set(fmt(T.am, 2) + unitHtml("km/h"), eq ? "gleich, weil beide Tempos gleich sind" : hmOk ? '<b class="mo-badt">✗ falsch</b>' : '<b class="mo-okt">✓ richtig</b>');
      var eqs = function (v) { return (isRounded(v, 2) ? "≈ " : "= ") + fmt(v, 2); };
      if (!zeit) {
        sayP.textContent = fmt(T.dist, 2) + " km in " + durTxt(T.time) + " " + eqs(T.avg) + " km/h. Das harmonische Mittel 2 ÷ (1/" +
          fmt(T.v1, 2) + " + 1/" + fmt(T.v2, 2) + ") " + eqs(T.hm) + " liefert genau das.";
        if (eq) why.textContent = "Hin und zurück gleich schnell: Dann sind beide Mittel gleich. Stell zwei verschiedene Tempos ein!";
        else {
          var slow = Math.min(T.v1, T.v2), fast = Math.max(T.v1, T.v2);
          why.innerHTML = "<strong>Warum nicht " + fmt(T.am, 2) + "?</strong> Mit " + fmt(slow, 2) + " km/h bist du " + durTxt(st.km / slow) +
            " unterwegs, mit " + fmt(fast, 2) + " km/h nur " + durTxt(st.km / fast) + ". Das langsame Tempo zählt also länger mit und drückt den Schnitt. " +
            "Die Strecke ändert daran übrigens nichts: Probier den Regler aus.";
        }
      } else {
        sayP.textContent = "In " + durTxt(st.hours) + " mit " + fmt(T.v1, 2) + " km/h schaffst du " + fmt(T.d1, 2) + " km, in " + durTxt(st.hours) +
          " mit " + fmt(T.v2, 2) + " km/h " + fmt(T.d2, 2) + " km. Zusammen " + fmt(T.dist, 2) + " km in " + durTxt(T.time) + " " + eqs(T.avg) +
          " km/h. Hier stimmt das arithmetische Mittel (" + fmt(T.v1, 2) + " + " + fmt(T.v2, 2) + ") ÷ 2 " + eqs(T.am) + ".";
        why.textContent = eq ? "Beide Tempos gleich: Dann sind beide Mittel gleich." : "Jetzt fährst du gleich lange langsam und schnell. Darum zählt jedes Tempo gleich viel.";
      }
      extra.querySelector(".mo-extra-txt").textContent = "Es kommt darauf an, was fest ist. Ist die Strecke fest (km steht oben in km/h), " +
        "nimmst du das harmonische Mittel. Das steht auf Folie 120. Ist dagegen die Zeit fest (h steht unten), nimmst du das arithmetische Mittel.";
      fHM.innerHTML = tex(hmTex(T.v1, T.v2));
      fAM.innerHTML = tex(amSpeedTex(T.v1, T.v2));
      timeChart.redraw();
      speedChart.redraw();
    }

    function drawTime(W) {
      var T = cur;
      if (!T) return;
      var zeit = T.mode === "zeit", H = 136, l = 8, rr = W - 8;
      var svg = newSvg(timeBox, W, H, "");
      var X = LM.svg.scale(0, T.time, l, rr);
      var rowsDef = [
        { y: 16, lab: (zeit ? "Abschnitt 1: " + durTxt(T.t1) + " mit " : "Hinweg: " + fmt(T.d1, 2) + " km mit ") + fmt(T.v1, 2) + " km/h", a: 0, b: T.t1, inner: zeit ? fmt(T.d1, 2) + " km" : durTxt(T.t1), cls: "mo-bar1" },
        { y: 66, lab: (zeit ? "Abschnitt 2: " + durTxt(T.t2) + " mit " : "Rückweg: " + fmt(T.d2, 2) + " km mit ") + fmt(T.v2, 2) + " km/h", a: T.t1, b: T.time, inner: zeit ? fmt(T.d2, 2) + " km" : durTxt(T.t2), cls: "mo-bar2" }
      ];
      rowsDef.forEach(function (r, i) {
        txt(svg, l, r.y, r.lab, { class: "mo-bar-lab", "text-anchor": "start" });
        var xa = X(r.a), xb = X(r.b);
        svgEl("rect", { class: "mo-bar " + r.cls, x: xa, y: r.y + 6, width: Math.max(2, xb - xa), height: 24, rx: 6, ry: 6 }, svg);
        var t = txt(svg, (xa + xb) / 2, r.y + 23, r.inner, { class: "mo-bar-in", "text-anchor": "middle" });
        var w = textW(t);
        if (w + 14 > xb - xa) {
          t.setAttribute("class", "mo-bar-out mo-halo");
          if (i === 0) { t.setAttribute("x", xb + 6); t.setAttribute("text-anchor", "start"); }
          else { t.setAttribute("x", xa - 6); t.setAttribute("text-anchor", "end"); }
        }
      });
      var by = 108;
      svgEl("path", { class: "mo-brace", d: "M" + X(0) + "," + (by - 5) + " V" + by + " H" + X(T.time) + " V" + (by - 5) }, svg);
      txt(svg, (X(0) + X(T.time)) / 2, by + 20, "zusammen " + fmt(T.dist, 2) + " km in " + durTxt(T.time), { class: "mo-brace-lab", "text-anchor": "middle" });
      svg.setAttribute("aria-label", "Zeitbalken: " + rowsDef[0].lab + ", " + durTxt(T.t1) + ". " + rowsDef[1].lab + ", " + durTxt(T.t2) +
        ". Zusammen " + durTxt(T.time) + ".");
    }

    function drawSpeed(W) {
      var T = cur;
      if (!T) return;
      var zeit = T.mode === "zeit";
      var axisY = 72, H = axisY + 62, l = 14, rr = W - 14;
      var svg = newSvg(speedBox, W, H, "");
      var X = LM.svg.scale(0, 150, l, rr);
      svgEl("line", { class: "ax", x1: l, x2: rr, y1: axisY, y2: axisY }, svg);
      for (var v = 0; v <= 150; v += 10) {
        var major = v % 50 === 0;
        svgEl("line", { class: major ? "ax" : "mo-minor", x1: X(v), x2: X(v), y1: axisY, y2: axisY + (major ? 5 : 3) }, svg);
        if (major) txt(svg, X(v), axisY + 19, v === 150 ? "150 km/h" : String(v), { class: "tick", "text-anchor": v === 150 ? "end" : v === 0 ? "start" : "middle" });
      }
      var xh = X(T.hm), xa = X(T.am);
      var hmRight = !zeit, eq = Math.abs(T.v1 - T.v2) < 1e-9;
      svgEl("line", { class: "mo-ln mo-ln-trim", x1: xh, x2: xh, y1: 22, y2: axisY }, svg);
      svgEl("line", { class: "mo-ln mo-ln-mean", x1: xa, x2: xa, y1: axisY, y2: axisY + 30 }, svg);
      svgEl("polygon", { class: "mo-tri", points: xa + "," + (axisY + 3) + " " + (xa - 6) + "," + (axisY + 13) + " " + (xa + 6) + "," + (axisY + 13) }, svg);
      // die beiden Tempos als Punkte
      var labA = zeit ? "erst " : "Hinweg ", labB = zeit ? "dann " : "Rückweg ";
      var sp = [{ v: T.v1, lab: labA + fmt(T.v1, 2) }, { v: T.v2, lab: labB + fmt(T.v2, 2) }];
      if (eq) sp = [{ v: T.v1, lab: (zeit ? "beide " : "hin und zurück ") + fmt(T.v1, 2) }];
      var labels = sp.map(function (s) {
        svgEl("circle", { class: "mo-sp-pt", cx: X(s.v), cy: axisY, r: 5 }, svg);
        return txt(svg, X(s.v), axisY - 11, s.lab, { class: "mo-sp-ptlbl mo-halo", "text-anchor": "middle" });
      });
      function put(t, x, anchor) { t.setAttribute("x", x); t.setAttribute("text-anchor", anchor); }
      function span(t) {
        var w = textW(t), x = Number(t.getAttribute("x")), a = t.getAttribute("text-anchor");
        var left = a === "middle" ? x - w / 2 : a === "end" ? x - w : x;
        return [left, left + w];
      }
      // 1. zwei Beschriftungen zu eng: auseinanderschieben
      if (labels.length === 2) {
        var a = sp[0].v <= sp[1].v ? 0 : 1, b = 1 - a;
        if (span(labels[a])[1] + 8 > span(labels[b])[0]) {
          put(labels[a], X(sp[a].v) + 4, "end");
          put(labels[b], X(sp[b].v) - 4, "start");
        }
      }
      // 2. nicht über die Linie des harmonischen Mittels schreiben, 3. im Bild bleiben
      labels.forEach(function (t, i) {
        var s = span(t);
        if (s[0] - 3 < xh && s[1] + 3 > xh) {
          if (X(sp[i].v) < xh - 0.5) put(t, xh - 6, "end"); else put(t, xh + 6, "start");
        }
        s = span(t);
        if (s[0] < 2) put(t, 2, "start");
        if (s[1] > W - 2) put(t, W - 2, "end");
      });
      var pH = makePill(svg, "mo-pill-hm"), pA = makePill(svg, "mo-pill-am");
      var okTag = eq ? "" : hmRight ? " (richtig)" : " (falsch)", okTagA = eq ? "" : hmRight ? " (falsch)" : " (richtig)";
      pH.set([["harmonisches Mittel " + fmt(T.hm, 2) + " km/h", ""], [okTag, hmRight ? "mo-okt" : "mo-badt"]], xh, 12, 2, W - 2);
      pA.set([["arithmetisches Mittel " + fmt(T.am, 2) + " km/h", ""], [okTagA, hmRight ? "mo-badt" : "mo-okt"]], xa, axisY + 41, 2, W - 2);
      svg.setAttribute("aria-label", "Tempo-Achse von 0 bis 150 km/h. Tempos " + fmt(T.v1, 2) + " und " + fmt(T.v2, 2) +
        ". Harmonisches Mittel " + fmt(T.hm, 2) + ", arithmetisches Mittel " + fmt(T.am, 2) + ". Richtig ist hier das " +
        (hmRight ? "harmonische" : "arithmetische") + " Mittel.");
    }

    var timeChart = LM.svg.responsive(timeBox, function (W) { if (cur) drawTime(W); });
    var speedChart = LM.svg.responsive(speedBox, function (W) { if (cur) drawSpeed(W); });
    setMode("km");
    whenFonts(function () { timeChart.redraw(); speedChart.redraw(); });
  });
})(typeof window !== "undefined" ? window : globalThis);
