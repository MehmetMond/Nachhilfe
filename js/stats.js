/*
 * Rechenkern der Lagemaße-Seite.
 * Alle Definitionen folgen der Vorlesung Statistik 1 (Folien 90–120, 133–142):
 *   Modus      Folie 92   (nur eindeutig, sonst kein Modus)
 *   Median     Folie 94   (n ungerade: x((n+1)/2), n gerade: Mittel der beiden mittleren)
 *   p-Quantil  Folie 101  (n·p keine ganze Zahl: aufrunden; ganze Zahl k: Mittel aus x(k), x(k+1)) = R type 2
 *   Mittel     Folien 110–113 (Urliste, Häufigkeitstabelle, Klassenmitten)
 *   getrimmtes Mittel Folie 116 (wie R mean(x, trim)), geometrisches/harmonisches Mittel Folien 117–120
 *   lineare Transformation Folien 133–134, Schiefe Folien 140–142 (x̄ − x̃, Quantilskoeffizient)
 * Läuft im Browser (window.LM.stats) und in Node (module.exports) für die Tests.
 */
(function (root) {
  "use strict";

  var EPS = 1e-9;

  function isInt(v) { return Math.abs(v - Math.round(v)) < EPS; }
  function sorted(xs) { return xs.slice().sort(function (a, b) { return a - b; }); }
  function sum(xs) {
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s;
  }

  /* ---------- Häufigkeiten ---------- */

  // Häufigkeitstabelle nach Wert sortiert. from/to sind die Plätze (1-basiert) in der sortierten Liste.
  function freq(xs) {
    var s = sorted(xs), n = s.length, out = [], cum = 0, i = 0;
    while (i < n) {
      var v = s[i], j = i;
      while (j < n && s[j] === v) j++;
      var h = j - i;
      cum += h;
      out.push({ value: v, h: h, f: h / n, H: cum, F: cum / n, from: i + 1, to: j });
      i = j;
    }
    return out;
  }

  /* ---------- Modus (Folie 92) ---------- */

  // value ist null, wenn der häufigste Wert nicht eindeutig ist (dann gibt es laut Folie keinen Modus).
  function modeInfo(xs) {
    var table = freq(xs), max = 0;
    table.forEach(function (r) { if (r.h > max) max = r.h; });
    var top = table.filter(function (r) { return r.h === max; }).map(function (r) { return r.value; });
    var unique = top.length === 1;
    return {
      table: table,
      maxCount: max,
      values: top,
      unique: unique,
      value: unique ? top[0] : null,
      // jeder Wert kommt gleich oft vor (z. B. alle genau einmal) → kein Modus
      allEqual: table.length > 1 && top.length === table.length
    };
  }
  function mode(xs) { return modeInfo(xs).value; }

  /* ---------- Median (Folie 94) ---------- */

  function medianInfo(xs) {
    var s = sorted(xs), n = s.length;
    if (!n) return { sorted: s, n: 0, odd: false, positions: [], value: NaN };
    var odd = n % 2 === 1;
    var positions = odd ? [(n + 1) / 2] : [n / 2, n / 2 + 1];
    var value = odd ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return { sorted: s, n: n, odd: odd, positions: positions, value: value };
  }
  function median(xs) { return medianInfo(xs).value; }

  /* ---------- p-Quantil (Folie 101, R: type = 2) ---------- */

  function quantileInfo(xs, p) {
    var s = sorted(xs), n = s.length;
    if (!n || !(p > 0 && p < 1)) return { sorted: s, n: n, p: p, np: NaN, integer: false, k: NaN, positions: [], value: NaN };
    var np = n * p, integer = isInt(np), k, positions, value;
    if (integer) {
      k = Math.round(np);
      positions = [k, k + 1];
      value = (s[k - 1] + s[k]) / 2;
    } else {
      k = Math.ceil(np);
      positions = [k];
      value = s[k - 1];
    }
    return { sorted: s, n: n, p: p, np: np, integer: integer, k: k, positions: positions, value: value };
  }
  function quantile(xs, p) { return quantileInfo(xs, p).value; }

  // Zum Vergleich: R ohne type, also type = 7 (lineare Interpolation). Nicht die Regel der Vorlesung!
  function quantileType7(xs, p) {
    var s = sorted(xs), n = s.length;
    if (!n) return NaN;
    var h = (n - 1) * p + 1, lo = Math.floor(h + EPS), frac = h - lo;
    if (Math.abs(frac) < EPS) return s[lo - 1];
    return s[lo - 1] + frac * (s[Math.min(lo, n - 1)] - s[lo - 1]);
  }

  function quartiles(xs) {
    var q1 = quantile(xs, 0.25), q2 = median(xs), q3 = quantile(xs, 0.75);
    return { q1: q1, q2: q2, q3: q3, iqr: q3 - q1 };
  }

  /* ---------- Boxplot (Folien 105–109) ---------- */

  // range = 0: Whisker bis Min und Max. range > 0: Whisker bis zum äußersten Wert innerhalb
  // [Q1 − range·IQR, Q3 + range·IQR], Werte außerhalb sind Ausreißer (wie boxplot() in R).
  function boxplot(xs, range) {
    var s = sorted(xs), n = s.length, q = quartiles(s);
    if (!n) return null;
    if (!range) return { q1: q.q1, med: q.q2, q3: q.q3, iqr: q.iqr, lo: s[0], hi: s[n - 1], out: [], fences: null, range: 0 };
    var lf = q.q1 - range * q.iqr, uf = q.q3 + range * q.iqr;
    var inside = s.filter(function (v) { return v >= lf - EPS && v <= uf + EPS; });
    var out = s.filter(function (v) { return v < lf - EPS || v > uf + EPS; });
    return {
      q1: q.q1, med: q.q2, q3: q.q3, iqr: q.iqr,
      lo: inside.length ? inside[0] : q.q1,
      hi: inside.length ? inside[inside.length - 1] : q.q3,
      out: out, fences: [lf, uf], range: range
    };
  }

  // So legt R boxplot() die Box (Tukey-Hinges, fivenum). Weicht bei manchen n von den Quartilen ab.
  function hinges(xs) {
    var s = sorted(xs), n = s.length;
    if (!n) return [];
    var n4 = Math.floor((n + 3) / 2) / 2;
    var d = [1, n4, (n + 1) / 2, n + 1 - n4, n];
    return d.map(function (i) { return (s[Math.floor(i) - 1] + s[Math.ceil(i) - 1]) / 2; });
  }

  /* ---------- Arithmetisches Mittel (Folien 110–116) ---------- */

  function meanInfo(xs) {
    var n = xs.length, total = sum(xs), value = n ? total / n : NaN;
    var deviations = xs.map(function (x) { return x - value; });
    return { n: n, sum: total, value: value, deviations: deviations, deviationSum: sum(deviations) };
  }
  function mean(xs) { return meanInfo(xs).value; }

  // Häufigkeitstabelle: Werte a_j mit Anzahlen h_j (Folie 111)
  function expand(values, counts) {
    var out = [];
    values.forEach(function (a, j) { for (var c = 0; c < counts[j]; c++) out.push(a); });
    return out;
  }
  function meanTable(values, counts) {
    var n = sum(counts), products = values.map(function (a, j) { return a * counts[j]; });
    var total = sum(products);
    return { n: n, products: products, sum: total, value: n ? total / n : NaN, f: counts.map(function (h) { return h / n; }) };
  }

  // Klassen mit Grenzen u_0 < u_1 < … < u_m und Anzahlen h_1 … h_m (Folie 113)
  function groupedMean(bounds, counts) {
    var mids = [], products = [];
    for (var j = 0; j < counts.length; j++) {
      var mid = (bounds[j] + bounds[j + 1]) / 2;
      mids.push(mid);
      products.push(mid * counts[j]);
    }
    var n = sum(counts), total = sum(products);
    return { n: n, mids: mids, products: products, sum: total, value: n ? total / n : NaN };
  }

  /* ---------- Minimumeigenschaften (Folien 97, 115) ---------- */

  function sumAbs(xs, a) { return sum(xs.map(function (x) { return Math.abs(x - a); })); }
  function sumSq(xs, a) { return sum(xs.map(function (x) { return (x - a) * (x - a); })); }

  // Wo ist Σ|x − a| minimal? Bei ungeradem n genau beim Median, bei geradem n auf dem ganzen
  // Stück zwischen den beiden mittleren Werten (der Median liegt in der Mitte davon).
  function absMinimizer(xs) {
    var s = sorted(xs), n = s.length;
    if (!n) return null;
    if (n % 2) return { from: s[(n - 1) / 2], to: s[(n - 1) / 2] };
    return { from: s[n / 2 - 1], to: s[n / 2] };
  }

  /* ---------- Getrimmtes Mittel (Folie 116) ---------- */

  // Wie R: mean(x, trim = t). Sortieren, an JEDEM Ende k = floor(n·t) Werte weglassen,
  // vom Rest das Mittel. t = 0.1 heißt also: 10 % unten UND 10 % oben weg.
  function trimInfo(xs, t) {
    var s = sorted(xs), n = s.length;
    t = Number(t) || 0;
    if (!n || t < 0 || t >= 0.5) return { sorted: s, n: n, t: t, k: NaN, low: [], kept: [], high: [], m: 0, sum: NaN, value: NaN };
    var k = Math.floor(n * t + EPS);
    var kept = s.slice(k, n - k), total = sum(kept);
    return {
      sorted: s, n: n, t: t, k: k,
      low: s.slice(0, k), kept: kept, high: s.slice(n - k),
      m: kept.length, sum: total, value: kept.length ? total / kept.length : NaN
    };
  }
  function trimmedMean(xs, t) { return trimInfo(xs, t).value; }

  /* ---------- Geometrisches und harmonisches Mittel (Folien 117–120) ---------- */

  // Voraussetzung (Folie 117): alle x_i > 0. Sonst value = NaN und ok = false.
  function allPositive(xs) {
    if (!xs.length) return false;
    for (var i = 0; i < xs.length; i++) if (!(xs[i] > 0)) return false;
    return true;
  }

  // GM = (x_1 · … · x_n)^(1/n); log(GM) = Mittel der log(x_i) (Folie 117). R: exp(mean(log(x))) (Folie 118).
  function geometricInfo(xs) {
    var n = xs.length, ok = allPositive(xs);
    if (!ok) return { n: n, ok: false, product: NaN, logs: [], logMean: NaN, value: NaN };
    var product = 1, logs = xs.map(function (x) { product *= x; return Math.log(x); });
    var logMean = sum(logs) / n;
    return { n: n, ok: true, product: product, logs: logs, logMean: logMean, value: Math.exp(logMean) };
  }
  function geometricMean(xs) { return geometricInfo(xs).value; }

  // HM = n / Σ(1/x_i) (Folie 120)
  function harmonicInfo(xs) {
    var n = xs.length, ok = allPositive(xs);
    if (!ok) return { n: n, ok: false, reciprocals: [], reciprocalSum: NaN, value: NaN };
    var rec = xs.map(function (x) { return 1 / x; }), rs = sum(rec);
    return { n: n, ok: true, reciprocals: rec, reciprocalSum: rs, value: n / rs };
  }
  function harmonicMean(xs) { return harmonicInfo(xs).value; }

  /* ---------- Schiefe (Folien 140–142) ---------- */

  // Erster Anhaltspunkt: x̄ − x̃ (Folie 140). > 0 rechtsschief/linkssteil, < 0 linksschief/rechtssteil, = 0 symmetrisch.
  // Quantilskoeffizient (Folie 142): g_p = ((x̃_{1−p} − x̃) − (x̃ − x̃_p)) / (x̃_{1−p} − x̃_p); p = 0.25 → Quartilskoeffizient.
  // Quantile nach Folie 101 (R type = 2), wie in R auf Folie 150.
  function skewDirection(v) {
    if (!isFinite(v)) return "undefiniert";
    if (Math.abs(v) < EPS) return "symmetrisch";
    return v > 0 ? "rechtsschief" : "linksschief";
  }
  function skewInfo(xs, p) {
    p = p === undefined ? 0.25 : p;
    var n = xs.length;
    if (!n || !(p > 0 && p < 0.5)) return { n: n, p: p, mean: NaN, median: NaN, diff: NaN, diffDirection: "undefiniert", qLow: NaN, qHigh: NaN, upper: NaN, lower: NaN, gp: NaN, gpDirection: "undefiniert" };
    var m = mean(xs), med = median(xs), diff = m - med;
    var lo = quantile(xs, p), hi = quantile(xs, 1 - p);
    var upper = hi - med, lower = med - lo, width = hi - lo;
    var gp = Math.abs(width) < EPS ? NaN : (upper - lower) / width;
    if (Math.abs(diff) < EPS) diff = 0;
    if (isFinite(gp) && Math.abs(gp) < EPS) gp = 0;
    return {
      n: n, p: p, mean: m, median: med, diff: diff, diffDirection: skewDirection(diff),
      qLow: lo, qHigh: hi, upper: upper, lower: lower, gp: gp, gpDirection: skewDirection(gp)
    };
  }

  /* ---------- Lineare Transformation (Folien 133–134) ---------- */

  // y_i = p·x_i + q  →  ȳ = p·x̄ + q
  function linear(xs, p, q) { return xs.map(function (x) { return p * x + q; }); }

  /* ---------- Alles auf einmal ---------- */

  function summary(xs) {
    var s = sorted(xs);
    return {
      n: s.length,
      sorted: s,
      min: s[0],
      max: s[s.length - 1],
      mode: modeInfo(s),
      median: medianInfo(s),
      mean: meanInfo(xs),
      q1: quantileInfo(s, 0.25),
      q3: quantileInfo(s, 0.75),
      box0: boxplot(s, 0),
      box15: boxplot(s, 1.5),
      hinges: hinges(s),
      trim10: trimInfo(s, 0.1),
      geometric: geometricInfo(xs),
      harmonic: harmonicInfo(xs),
      skew: skewInfo(xs, 0.25)
    };
  }

  var api = {
    EPS: EPS, isInt: isInt, sorted: sorted, sum: sum,
    freq: freq, modeInfo: modeInfo, mode: mode,
    medianInfo: medianInfo, median: median,
    quantileInfo: quantileInfo, quantile: quantile, quantileType7: quantileType7, quartiles: quartiles,
    boxplot: boxplot, hinges: hinges,
    meanInfo: meanInfo, mean: mean, expand: expand, meanTable: meanTable, groupedMean: groupedMean,
    sumAbs: sumAbs, sumSq: sumSq, absMinimizer: absMinimizer,
    trimInfo: trimInfo, trimmedMean: trimmedMean,
    allPositive: allPositive, geometricInfo: geometricInfo, geometricMean: geometricMean,
    harmonicInfo: harmonicInfo, harmonicMean: harmonicMean,
    skewDirection: skewDirection, skewInfo: skewInfo, linear: linear,
    summary: summary
  };

  root.LM = root.LM || {};
  root.LM.stats = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
