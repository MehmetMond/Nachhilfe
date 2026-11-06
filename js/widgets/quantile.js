/*
 * Bündel „quantile“ der Lagemaße-Seite (Kapitel 4 und 5)
 *
 *   quantile-explorer  p-Quantil nach Folie 101 zum Anfassen: Datensatz wählen, p einstellen,
 *                      n · p, Fallunterscheidung, Ergebnis, Probe mit der Definition (Folie 100)
 *                      und R (type = 2 gegen den Standard, Folie 103).
 *   boxplot-builder    Fünf Zahlen und Boxplot (Folien 105–109) mit range = 0 / 1 / 1.5,
 *                      und Übungsmodus „Selbst bauen“.
 *
 * Gerechnet wird nur mit LM.stats, Zahlen kommen aus LM.fmt, Formeln aus LM.tex.
 * Die reinen Hilfsfunktionen stehen in `core` und werden in Node getestet:
 *   node --test tests/quantile.test.js
 */
(function (root) {
  "use strict";

  var LM = root.LM;
  if (!LM || !LM.stats || !LM.fmt) return;

  var EPS = 1e-9;
  var TWO_THIRDS = 2 / 3;
  var KEYS = ["min", "q1", "med", "q3", "max"];
  var NAMES = { min: "Min", q1: "Q1", med: "Median", q3: "Q3", max: "Max" };
  var LONG = { min: "Min · kleinster Wert", q1: "Q1 · unteres Quartil", med: "Median", q3: "Q3 · oberes Quartil", max: "Max · größter Wert" };
  // Ab so vielen Werten zeigt die Boxplot-Werkstatt nur die wichtigen Plätze (der Rest steht als „…“ dazwischen)
  var FOLD_N = 20;
  // Übungsblatt 2, Aufgabe 8: 60 Reaktionszeiten in ms (Urliste, Reihenfolge wie auf dem Blatt)
  var RT_A8 = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];
  var uidN = 0;

  /* =====================================================================
     Reine Hilfsfunktionen (ohne DOM, in Node getestet)
     ===================================================================== */

  function uid(p) { uidN += 1; return "qx-" + p + "-" + uidN; }
  function isThird(p) { return Math.abs(p - TWO_THIRDS) < EPS; }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function num(v) { return LM.fmt(v, 4); }
  // Zahl für KaTeX: Dezimalkomma als {,} (sonst setzt TeX ein Leerzeichen dahinter), normales Minus
  function tnum(v, d) { return LM.fmt(v, d === undefined ? 4 : d).replace("−", "-").replace(",", "{,}"); }
  function tpar(v) { return v < 0 ? "(" + tnum(v) + ")" : tnum(v); }
  function pct(share) { return LM.fmt(share * 100, 1) + " %"; }

  // p in Worten: 0,25 / 2/3 (2/3 ist exakt zwei Drittel, nicht 0,67)
  function pName(p) { return isThird(p) ? "2/3" : LM.fmt(p, 2); }
  function pShow(p) { return isThird(p) ? "2/3 ≈ " + LM.fmt(p, 2) : LM.fmt(p, 2); }
  function pSub(p) { return isThird(p) ? "2/3" : tnum(p, 2); }
  function pFactor(p) { return isThird(p) ? "\\tfrac{2}{3}" : tnum(p, 2); }

  // Ist v mit höchstens 4 Nachkommastellen exakt darstellbar? (sonst schreiben wir ≈)
  function isExact(v) { return Math.abs(v * 1e4 - Math.round(v * 1e4)) < 1e-6; }
  function npShow(np) { return isExact(np) ? LM.fmt(np, 4) : "≈ " + LM.fmt(np, 2); }
  function npTex(n, p) {
    var np = n * p;
    return "n \\cdot p = " + n + " \\cdot " + pFactor(p) + (isExact(np) ? " = " + tnum(np, 4) : " \\approx " + tnum(np, 2));
  }

  // Andere Namen für besondere Quantile (Folie 104)
  function quantileAlias(p) {
    if (isThird(p)) return "";
    var c = Math.round(p * 100);
    if (c === 25) return "Q<sub>1</sub>, das untere Quartil";
    if (c === 50) return "der Median (Q<sub>2</sub>)";
    if (c === 75) return "Q<sub>3</sub>, das obere Quartil";
    if (c % 10 === 0) return "D<sub>" + c / 10 + "</sub>, das " + c / 10 + ". Dezil";
    return "P<sub>" + c + "</sub>, das " + c + ". Perzentil";
  }

  // Probe mit der Definition (Folie 100): mindestens p·100 % der Werte ≤ q und mindestens (1 − p)·100 % ≥ q
  function defCheck(xs, q, p) {
    var n = xs.length, le = 0, ge = 0;
    xs.forEach(function (v) {
      if (v <= q + EPS) le += 1;
      if (v >= q - EPS) ge += 1;
    });
    return { n: n, le: le, ge: ge, okLe: le >= n * p - EPS, okGe: ge >= n * (1 - p) - EPS };
  }

  /* ---------- R-Schreibweise (Punkt als Dezimalzeichen, wie R druckt) ---------- */

  function rNum(v) { return String(Number(Number(v).toPrecision(7))); }
  function rProbArg(p) { return isThird(p) ? "2/3" : String(Math.round(p * 100) / 100); }
  function rProbName(p) { return rNum(100 * p) + "%"; }
  function rVector(xs) { return "x <- c(" + xs.map(rNum).join(", ") + ")"; }
  function rCall(p, type2) { return "quantile(x, probs = " + rProbArg(p) + (type2 ? ", type = 2" : "") + ")"; }
  function padLeft(s, w) { while (s.length < w) s = " " + s; return s; }
  // Ausgabe wie in R: Name („25%“) über dem Wert, beide rechtsbündig
  function rResult(p, v) {
    var a = rProbName(p), b = rNum(v), w = Math.max(a.length, b.length);
    return [padLeft(a, w), padLeft(b, w)];
  }
  // R-Code fürs Quantil-Labor: jede Code-Zeile mit deutschem Kommentar darüber. {cmt} oder {code}
  function rQuantileLines(raw, p) {
    return [
      { cmt: "# die Werte als Vektor x speichern" },
      { code: rVector(raw) },
      { cmt: "# " + pName(p) + "-Quantil nach der Regel von Folie 101" },
      { code: rCall(p, true) },
      { cmt: "# zum Vergleich ohne type: andere Regel" },
      { code: rCall(p, false) }
    ];
  }
  // „Was R antwortet“: Konsole mit Befehl (> …) und Ausgabe. {echo} | {out, alt}; alt = Ausgabe ohne type = 2
  function rAnswer(p, q, t7) {
    var a = rResult(p, q), b = rResult(p, t7);
    return [
      { echo: "> " + rCall(p, true) }, { out: a[0] }, { out: a[1] },
      { echo: "> " + rCall(p, false) }, { out: b[0], alt: true }, { out: b[1], alt: true }
    ];
  }
  // R-Code zur Boxplot-Werkstatt (Folien 107–109): Kommentar und Befehl
  function rBoxLines(range) {
    var cmt = !range ? "# liegender Boxplot, Whisker bis zum kleinsten und größten Wert"
      : range === 1 ? "# Whisker höchstens 1 Quartilabstand über die Box hinaus"
      : "# wie boxplot(x) ohne range: höchstens 1,5 Quartilabstände";
    return [{ cmt: cmt }, { code: "boxplot(x, horizontal = TRUE, range = " + (range === 1.5 ? "1.5" : String(range)) + ")" }];
  }

  /* ---------- Fünf Zahlen des Boxplots ---------- */

  function fiveNumbers(xs) {
    var S = LM.stats, s = S.sorted(xs), n = s.length;
    var md = S.medianInfo(s), q1 = S.quantileInfo(s, 0.25), q3 = S.quantileInfo(s, 0.75);
    return [
      { key: "min", value: s[0], positions: [1] },
      { key: "q1", value: q1.value, positions: q1.positions, info: q1, p: 0.25 },
      { key: "med", value: md.value, positions: md.positions, info: md },
      { key: "q3", value: q3.value, positions: q3.positions, info: q3, p: 0.75 },
      { key: "max", value: s[n - 1], positions: [n] }
    ];
  }
  function placesText(pos) { return pos.length === 1 ? "Platz " + pos[0] : "Mittel aus Platz " + pos[0] + " und " + pos[1]; }
  // Kurzer Rechenweg für eine der fünf Zahlen (HTML)
  function howHtml(f, n) {
    if (f.key === "min") return LM.tex("x_{(1)}") + " ganz links";
    if (f.key === "max") return LM.tex("x_{(" + n + ")}") + " ganz rechts";
    if (f.key === "med") return "n = " + n + " ist " + (f.info.odd ? "ungerade" : "gerade") + " → " + placesText(f.positions);
    return LM.tex(n + " \\cdot " + tnum(f.p, 2) + " = " + tnum(f.info.np, 4)) +
      (f.info.integer ? " → ganze Zahl → " : " → aufrunden → ") + placesText(f.positions);
  }

  // Viele Werte: nur die Plätze zeigen, die man für die fünf Zahlen braucht (sortiert, ohne Doppelte)
  function foldKeep(five, n) {
    var seen = {}, out = [];
    five.forEach(function (f) {
      f.positions.forEach(function (p) { if (p >= 1 && p <= n && !seen[p]) { seen[p] = true; out.push(p); } });
    });
    return out.sort(function (a, b) { return a - b; });
  }
  // Pro Platz 1 … n: far = ausblenden, gap = direkt davor fehlen Plätze (dort steht „…“)
  function foldPlan(n, keep) {
    var set = {}, out = [];
    keep.forEach(function (p) { set[p] = true; });
    for (var i = 1; i <= n; i++) out.push({ far: !set[i], gap: !!set[i] && i > 1 && !set[i - 1] });
    return out;
  }

  /* ---------- Typische Fehler im Übungsmodus erkennen ---------- */

  // kind: min | q1 | med | q3 | max, text: Eingabe, raw: Werte in der gezeigten (unsortierten) Reihenfolge.
  // Antwort: { ok, code, msg } – msg ist ein freundlicher Hinweis (HTML-sicher, nur Zahlen und Text).
  function diagnose(kind, text, raw) {
    var S = LM.stats, s = S.sorted(raw), n = s.length, five = fiveNumbers(raw), by = {};
    five.forEach(function (f) { by[f.key] = f; });
    var want = by[kind].value, res = LM.check(text, want, { decimals: 2 });
    if (res.ok) return { ok: true, code: "ok", msg: "" };
    if (res.empty) return { ok: false, code: "empty", msg: "Noch leer. Trag eine Zahl ein." };
    if (!isFinite(res.value)) return { ok: false, code: "nan", msg: "Das ist keine Zahl. Schreib zum Beispiel 8,5." };
    var v = res.value;
    // Passt die Eingabe zu einem typischen falschen Wert? (nur wenn der sich vom richtigen unterscheidet)
    function is(cand) { return isFinite(cand) && Math.abs(cand - want) > 0.005 && Math.abs(v - cand) <= 0.005 + EPS; }
    function hit(code, msg) { return { ok: false, code: code, msg: msg }; }

    if (kind === "min" || kind === "max") {
      var isMin = kind === "min";
      if (is(isMin ? raw[0] : raw[n - 1])) {
        return hit("unsorted", "Der " + (isMin ? "erste" : "letzte") + " Wert in der Liste ist nicht automatisch der " + (isMin ? "kleinste" : "größte") + ". Sortier zuerst.");
      }
      if (is(isMin ? s[n - 1] : s[0])) return hit("swap", "Verwechselt? Min ist der kleinste Wert, Max der größte.");
      return hit("generic", isMin ? "Min ist der kleinste Wert. Nach dem Sortieren steht er ganz links auf Platz 1."
        : "Max ist der größte Wert. Nach dem Sortieren steht er ganz rechts auf Platz " + n + ".");
    }

    if (kind === "med") {
      var odd = n % 2 === 1, m = (n + 1) / 2;
      if (!odd && (is(s[n / 2 - 1]) || is(s[n / 2]))) {
        return hit("half", "n = " + n + " ist gerade. Dann nimmst du das Mittel der beiden mittleren Werte: Platz " + n / 2 + " und Platz " + (n / 2 + 1) + ".");
      }
      if (odd && n > 1 && (is((s[m - 2] + s[m - 1]) / 2) || (m < n && is((s[m - 1] + s[m]) / 2)))) {
        return hit("avg", "n = " + n + " ist ungerade. Dann gibt es genau einen mittleren Wert auf Platz " + m + ". Hier wird nichts gemittelt.");
      }
      var rawMid = odd ? raw[m - 1] : (raw[n / 2 - 1] + raw[n / 2]) / 2;
      if (is(rawMid)) return hit("unsorted", "Hast du vorher sortiert? Der Median ist die Mitte der sortierten Liste.");
      if (is(S.mean(raw))) return hit("mean", "Das ist das arithmetische Mittel. Der Median ist der mittlere Wert der sortierten Liste.");
      return hit("generic", odd ? "n = " + n + " ist ungerade. Der Median steht auf Platz (" + n + " + 1) / 2 = " + m + "."
        : "n = " + n + " ist gerade. Der Median ist das Mittel aus Platz " + n / 2 + " und Platz " + (n / 2 + 1) + ".");
    }

    // Quartile
    var lower = kind === "q1", p = lower ? 0.25 : 0.75, pTxt = LM.fmt(p, 2), info = by[kind].info;
    var npTxt = "n · " + pTxt + " = " + n + " · " + pTxt + " = " + LM.fmt(info.np, 4);
    if (is(by[lower ? "q3" : "q1"].value)) {
      return hit("swap", "Verwechselt? Q1 gehört zu p = 0,25 (unten), Q3 zu p = 0,75 (oben).");
    }
    if (is(by.med.value)) {
      return hit("median", "Das ist der Median. " + (lower ? "Q1 liegt weiter links" : "Q3 liegt weiter rechts") + ": Rechne n · " + pTxt + ".");
    }
    if (!info.integer) {
      var fl = Math.floor(info.np);
      if (fl >= 1 && is(s[fl - 1])) {
        return hit("down", "Abgerundet? " + npTxt + " ist keine ganze Zahl. Dann wird immer aufgerundet, hier auf Platz " + info.k + ".");
      }
      if (fl >= 1 && is((s[fl - 1] + s[fl]) / 2)) {
        return hit("avg", npTxt + " ist keine ganze Zahl. Dann wird nicht gemittelt, sondern aufgerundet: Platz " + info.k + ".");
      }
    } else if (is(s[info.k - 1]) || is(s[info.k])) {
      return hit("one", npTxt + " ist eine ganze Zahl. Dann brauchst du das Mittel aus Platz " + info.k + " und Platz " + (info.k + 1) + ".");
    }
    if (is(S.quantileType7(s, p))) {
      return hit("type7", "Das wäre R ohne type = 2. In der Vorlesung gilt die Regel von Folie 101.");
    }
    var rawQ = info.integer ? (raw[info.k - 1] + raw[info.k]) / 2 : raw[info.k - 1];
    if (is(rawQ)) return hit("unsorted", "Hast du vorher sortiert? Die Plätze zählen in der sortierten Liste.");
    return hit("generic", info.integer
      ? "Rechne " + npTxt + ". Das ist eine ganze Zahl, also brauchst du das Mittel aus Platz " + info.k + " und Platz " + (info.k + 1) + "."
      : "Rechne " + npTxt + ". Keine ganze Zahl, also aufrunden. Welcher Wert steht auf diesem Platz?");
  }

  // Auswertung „Selbst bauen“. texts: {min, q1, med, q3, max} wie eingetippt.
  // state: "empty" (nichts eingetragen) | "partial" (Felder fehlen) | "done" (alle fünf ausgefüllt)
  function practiceVerdict(texts, raw) {
    var res = {}, vals = {}, okN = 0, missing = [];
    KEYS.forEach(function (k) {
      var t = texts[k] === undefined || texts[k] === null ? "" : String(texts[k]);
      res[k] = diagnose(k, t, raw);
      vals[k] = LM.parseNum(t);
      if (res[k].ok) okN += 1;
      if (res[k].code === "empty") missing.push(k);
    });
    var allNum = KEYS.every(function (k) { return isFinite(vals[k]); });
    var ordered = allNum && KEYS.every(function (k, i) { return i === 0 || vals[KEYS[i - 1]] <= vals[k] + EPS; });
    return {
      state: missing.length === KEYS.length ? "empty" : missing.length ? "partial" : "done",
      res: res, vals: vals, okN: okN, missing: missing, allNum: allNum, ordered: ordered
    };
  }

  // Rückmeldung zu practiceVerdict: { cls: "" | "ok" | "miss", text }. ghost: Wird der eigene Versuch eingezeichnet?
  function practiceMessage(v, ghost) {
    if (v.state === "empty") return { cls: "miss", text: "Trag zuerst deine Zahlen ein. Tipp: Sortier die Werte vorher." };
    if (v.state === "partial") {
      var filled = KEYS.length - v.missing.length, names = v.missing.map(function (k) { return NAMES[k]; }), lead;
      if (filled === 1) lead = v.okN ? "Die eingetragene Zahl stimmt." : "Die eingetragene Zahl stimmt noch nicht.";
      else if (v.okN === filled) lead = "Deine " + filled + " Zahlen stimmen alle.";
      else lead = "Von deinen " + filled + " Zahlen " + (v.okN === 0 ? "stimmt noch keine." : v.okN === 1 ? "stimmt eine." : "stimmen " + v.okN + ".");
      var list = names.length < 2 ? names[0] : names.slice(0, -1).join(", ") + " und " + names[names.length - 1];
      return { cls: "", text: lead + " Noch leer: " + list + ". Füll alle fünf aus, dann zeichne ich dir den Boxplot." };
    }
    if (v.okN === KEYS.length) return { cls: "ok", text: "Alle fünf stimmen. Stark! Unten siehst du deinen Boxplot." };
    var head = v.okN === 0 ? "Noch stimmt keine der fünf Zahlen." : v.okN === 1 ? "1 von 5 stimmt." : v.okN + " von 5 stimmen.";
    return { cls: "miss", text: head + " Lies die Hinweise. Unten siehst du den richtigen Boxplot" + (ghost ? ", rot gestrichelt deinen Versuch." : ".") };
  }

  /* ---------- Zufallsdaten ---------- */

  function randInt(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function shuffle(xs, rnd) {
    var a = xs.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // Quantil-Labor: 5 bis 16 ganze Zahlen von 1 bis 30
  function randomQuantileData(rnd) {
    var n = randInt(rnd, 5, 16), out = [];
    for (var i = 0; i < n; i++) out.push(randInt(rnd, 1, 30));
    return out;
  }
  // Boxplot zum Anschauen: 8 bis 15 Werte um 35, oft mit einem Ausreißer
  function randomBoxData(rnd) {
    var n = randInt(rnd, 8, 15), out = [];
    for (var i = 0; i < n; i++) out.push(20 + randInt(rnd, 0, 15) + randInt(rnd, 0, 15));
    if (rnd() < 0.6) out[0] = rnd() < 0.7 ? randInt(rnd, 64, 80) : randInt(rnd, 1, 8);
    return shuffle(out, rnd);
  }
  // Übungsaufgabe: 7 bis 12 ganze Zahlen von 1 bis 30, gemischt
  function practiceData(rnd) {
    var n = randInt(rnd, 7, 12), out = [];
    for (var i = 0; i < n; i++) out.push(randInt(rnd, 1, 15) + randInt(rnd, 0, 15));
    return shuffle(out, rnd);
  }

  /* ---------- Zeichnen: Beschriftungen, Punktstapel, Bereich, Boxplot-Modell ---------- */

  // Beschriftungen ohne Überlappung auf Zeilen verteilen. items: {x, w, anchor: start|middle|end}.
  // Ergänzt it.l (linker Rand, in [0, W] geschoben) und it.row (0 = nah an der Box). Gibt die Zeilenzahl zurück.
  function placeLabels(items, W, gap) {
    var rows = [];
    gap = gap === undefined ? 6 : gap;
    items.forEach(function (it) {
      var l = it.anchor === "end" ? it.x - it.w : it.anchor === "start" ? it.x : it.x - it.w / 2;
      l = Math.max(0, Math.min(W - it.w, l));
      var r = l + it.w, row = 0;
      for (;;) {
        var segs = rows[row] || (rows[row] = []);
        var free = segs.every(function (sg) { return r + gap <= sg[0] || l >= sg[1] + gap; });
        if (free) { segs.push([l, r]); break; }
        row += 1;
      }
      it.l = l;
      it.row = row;
    });
    return Math.max(1, rows.length);
  }

  // Welche Beschriftungen werden von einer senkrechten Linie gekreuzt? Die bekommen eine Unterlage in Flächenfarbe,
  // damit die Linie nicht durch den Text (auch nicht durch die Lücke zwischen Wörtern) läuft.
  // labels: [{l, w, y}] (y = Grundlinie, Schrift 12 px), lines: [{x, y1, y2}]. Ergebnis: Kasten je Label oder null.
  function labelPlates(labels, lines) {
    return labels.map(function (it) {
      var box = { x: it.l - 2, y: it.y - 11, width: it.w + 2, height: 15 };
      var hit = lines.some(function (ln) {
        var a = Math.min(ln.y1, ln.y2), b = Math.max(ln.y1, ln.y2);
        return ln.x > box.x && ln.x < box.x + box.width && a < box.y + box.height && b > box.y;
      });
      return hit ? box : null;
    });
  }

  // Punkte (Pixelpositionen, sortiert) stapeln, damit sich keine überdecken. Ergebnis: Ebene je Punkt.
  function swarm(px, r) {
    var levels = [];
    return px.map(function (x) {
      var lv = 0;
      while ((levels[lv] || []).some(function (o) { return Math.abs(o - x) < 2 * r + 0.5; })) lv += 1;
      (levels[lv] = levels[lv] || []).push(x);
      return lv;
    });
  }

  // Achsenbereich mit etwas Rand
  function domainFor(values) {
    var lo = Infinity, hi = -Infinity;
    values.forEach(function (v) { if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } });
    if (!isFinite(lo)) return [0, 1];
    if (hi - lo < EPS) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.06;
    return [lo - pad, hi + pad];
  }

  // Achsenbereich zum Boxplot: alle Werte und die Grenzen, wenn sie nicht zu weit draußen liegen
  // (dann sieht man die gestrichelten Linien und dass die Punkte dazwischen liegen). Weiter draußen: Pfeil am Rand.
  function boxDomain(m) {
    var lo = m.s[0], hi = m.s[m.n - 1], span = hi - lo, vals = m.s.slice();
    if (m.fences) m.fences.forEach(function (f) { if (f >= lo - 0.6 * span - EPS && f <= hi + 0.6 * span + EPS) vals.push(f); });
    return domainFor(vals);
  }

  // Alles, was der Boxplot braucht. outA: 1 = dieser (sortierte) Wert ist ein Ausreißer.
  function boxModel(xs, range) {
    var s = LM.stats.sorted(xs), n = s.length, b = LM.stats.boxplot(s, range);
    var low = b.out.filter(function (v) { return v < b.q1; }).length, high = b.out.length - low;
    return {
      s: s, n: n, q1: b.q1, med: b.med, q3: b.q3, iqr: b.iqr, lo: b.lo, hi: b.hi,
      out: b.out, fences: b.fences, range: b.range, fenceA: b.fences ? 1 : 0,
      outA: s.map(function (v, i) { return i < low || i >= n - high ? 1 : 0; })
    };
  }

  // Zwischenbild beim Umschalten von range (gleiche Daten): Whisker gleiten, Grenzen und Ausreißer blenden.
  function lerpModel(a, b, t) {
    var m = {}, k;
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) m[k] = b[k];
    function L(u, v) { return u + (v - u) * t; }
    m.lo = L(a.lo, b.lo);
    m.hi = L(a.hi, b.hi);
    var fa = a.fences || b.fences, fb = b.fences || a.fences;
    m.fences = fa && fb ? [L(fa[0], fb[0]), L(fa[1], fb[1])] : null;
    m.fenceA = L(a.fenceA, b.fenceA);
    m.outA = b.outA.map(function (v, i) { return L(a.outA[i] || 0, v); });
    // Achse zoomt weich mit, wenn die Grenzen dazukommen oder wegfallen
    if (a.dom && b.dom) m.dom = [L(a.dom[0], b.dom[0]), L(a.dom[1], b.dom[1])];
    // Beschriftungen zeigen gleich die Endwerte (keine flackernden Zwischenzahlen)
    m.labLo = b.lo; m.labHi = b.hi; m.labF = b.fences || a.fences;
    return m;
  }

  function uniq(xs) { return xs.filter(function (v, i) { return i === 0 || Math.abs(v - xs[i - 1]) > EPS; }); }
  function listAnd(xs) {
    var t = xs.map(num);
    return t.length < 2 ? t.join("") : t.slice(0, -1).join(", ") + " und " + t[t.length - 1];
  }

  function describeBox(m) {
    var t = "Boxplot von " + m.n + " Werten. Min " + num(m.s[0]) + ", Q1 " + num(m.q1) + ", Median " + num(m.med) +
      ", Q3 " + num(m.q3) + ", Max " + num(m.s[m.n - 1]) + ". Whisker von " + num(m.lo) + " bis " + num(m.hi) + ". ";
    t += m.out.length ? "Ausreißer: " + listAnd(uniq(m.out)) + "." : "Keine Ausreißer.";
    if (m.ghost) t += " Gestrichelt: dein Versuch.";
    return t;
  }

  // Erklärung zu range (HTML)
  function rangeHtml(m) {
    var lo = m.s[0], hi = m.s[m.n - 1];
    if (!m.range) {
      return '<ul class="qx-list"><li>Mit <code>range = 0</code> gehen die Whisker vom kleinsten bis zum größten Wert: von ' +
        num(lo) + " bis " + num(hi) + ". So sieht der Boxplot auf Folie 107 aus.</li>" +
        "<li>Ausreißer werden dabei nie einzeln gezeigt. Schalte auf <code>range = 1.5</code> und schau, was passiert.</li></ul>";
    }
    var r = tnum(m.range, 1), f = m.fences;
    var lows = uniq(m.out.filter(function (v) { return v < m.q1; }));
    var highs = uniq(m.out.filter(function (v) { return v > m.q3; }));
    var items = [
      "Quartilabstand: " + LM.tex("Q_{\\text{dif}} = Q_3 - Q_1 = " + tnum(m.q3) + " - " + tpar(m.q1) + " = " + tnum(m.iqr)),
      "Grenzen nach Folie 108: " + LM.tex(tnum(m.q1) + " - " + r + " \\cdot " + tpar(m.iqr) + " = " + tnum(f[0])) + " und " +
        LM.tex(tnum(m.q3) + " + " + r + " \\cdot " + tpar(m.iqr) + " = " + tnum(f[1])),
      "Die Whisker gehen nur bis zum äußersten Wert innerhalb der Grenzen: " + num(m.lo) + " und " + num(m.hi) + "."
    ];
    if (!m.out.length) items.push("Kein Wert liegt außerhalb der Grenzen. Also gibt es keine Ausreißer.");
    else {
      var parts = [];
      if (lows.length) parts.push(listAnd(lows) + (lows.length > 1 ? " liegen" : " liegt") + " unter " + num(f[0]));
      if (highs.length) parts.push(listAnd(highs) + (highs.length > 1 ? " liegen" : " liegt") + " über " + num(f[1]));
      var many = lows.length + highs.length > 1;
      items.push("<strong>Ausreißer:</strong> " + parts.join(", ") + ". Im Boxplot " + (many ? "erscheinen sie als einzelne Punkte." : "erscheint er als einzelner Punkt."));
    }
    return '<ul class="qx-list">' + items.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
  }

  // Wo liegt die Grenze nach n · p Werten?
  // Ganze Zahl k → genau geschafft: Grenze in der Lücke zwischen Platz k und k + 1 (violette Linie).
  // Kommazahl    → halbe Werte gibt es nicht: abzählen, ab welchem Platz die Mindestanzahl erreicht ist.
  function cutPlace(info) {
    var n = info.n, np = info.np;
    if (!(n > 0) || !isFinite(np)) return null;
    var need = npShow(np).replace("≈ ", "etwa "), share = pct(info.p);
    var intro = "Mindestens " + share + " sollen links liegen, das sind " + (info.integer ? "genau " : "") + need + " von " + n + " Werten.";
    if (info.integer) {
      var k = info.k;
      return {
        pos: k, gap: true, rows: [],
        text: intro + " Mit Platz " + k + " ist das genau geschafft. Die violette Linie zeigt die Grenze: Sie liegt in der Lücke zwischen Platz " +
          k + " und " + (k + 1) + ".",
        after: "Beide Nachbarn der Lücke passen, darum nimmst du ihr Mittel."
      };
    }
    var c = Math.ceil(np - 1e-9);
    function row(m, ok) {
      return { upto: m, ok: ok, label: (m === 0 ? "ohne Karte" : "bis Platz " + m) + ": " + m + " " + (m === 1 ? "Wert" : "Werte") + " = " + pct(m / n) };
    }
    return {
      pos: c, gap: false, rows: [row(c - 1, false), row(c, true)],
      text: intro + " Halbe Werte gibt es nicht. Also zählst du ab:",
      after: "Also ist Platz " + c + " das Quantil. Die Karte bleibt ganz, sie wird nicht geteilt."
    };
  }

  var core = {
    RT_A8: RT_A8, FOLD_N: FOLD_N, cutPlace: cutPlace,
    isThird: isThird, pName: pName, pShow: pShow, pSub: pSub, npShow: npShow, npTex: npTex, quantileAlias: quantileAlias,
    defCheck: defCheck, rNum: rNum, rProbArg: rProbArg, rProbName: rProbName, rVector: rVector, rCall: rCall, rResult: rResult,
    rQuantileLines: rQuantileLines, rAnswer: rAnswer, rBoxLines: rBoxLines,
    fiveNumbers: fiveNumbers, howHtml: howHtml, foldKeep: foldKeep, foldPlan: foldPlan,
    diagnose: diagnose, practiceVerdict: practiceVerdict, practiceMessage: practiceMessage,
    randomQuantileData: randomQuantileData, randomBoxData: randomBoxData, practiceData: practiceData, shuffle: shuffle,
    placeLabels: placeLabels, labelPlates: labelPlates, swarm: swarm, domainFor: domainFor, boxDomain: boxDomain, boxModel: boxModel, lerpModel: lerpModel,
    describeBox: describeBox, rangeHtml: rangeHtml
  };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof document === "undefined" || !LM.widget || !LM.h) return;

  /* =====================================================================
     Kleine UI-Bausteine
     ===================================================================== */

  function head(el, title, badge, sub) {
    el.appendChild(LM.h("div", { class: "w-head" }, [
      LM.h("h3", {}, [title + " ", LM.h("span", { class: "w-badge", text: badge })]),
      LM.h("p", { class: "w-sub", text: sub })
    ]));
  }

  // R-Zeilen ({cmt} | {code} | {echo} | {out, alt}) als HTML für ein <pre>. altBad: Ausgabe ohne type = 2 rot.
  // Jede Zeile ist ein eigener Block: Bricht sie auf dem Handy um, wird der Rest eingerückt (sieht nicht wie ein neuer Befehl aus).
  function rHtml(lines, altBad) {
    return lines.map(function (l) {
      var cls = l.cmt ? "qx-rcmt" : l.echo ? "qx-recho" : l.out !== undefined ? "qx-rout" + (l.alt && altBad ? " is-bad" : "") : "qx-rcode";
      var txt = l.cmt || l.echo || (l.out !== undefined ? l.out : l.code);
      return '<span class="qx-ln ' + cls + '">' + LM.esc(txt) + "</span>";
    }).join("");
  }

  // .seg mit aria-pressed. items: {key, label | html}
  function segment(items, label, onPick) {
    var seg = LM.h("div", { class: "seg", attrs: { role: "group", "aria-label": label } });
    var btns = items.map(function (it) {
      var b = LM.h("button", {
        html: it.html || LM.esc(it.label),
        attrs: { type: "button", "aria-pressed": "false", "aria-label": it.aria || null },
        on: { click: function () { onPick(it.key); } }
      });
      b._key = it.key;
      seg.appendChild(b);
      return b;
    });
    return {
      el: seg,
      set: function (key) { btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b._key === key)); }); }
    };
  }

  // Eingabefeld für eigene Zahlen (wird gespeichert)
  function ownInput(o) {
    var id = uid("own");
    var ta = LM.h("textarea", { class: "data-input", attrs: { id: id, rows: "2", spellcheck: "false", autocomplete: "off", placeholder: "z. B. " + o.def } });
    var msg = LM.h("p", { class: "qx-parse", attrs: { "aria-live": "polite" } });
    var box = LM.h("div", { class: "qx-own", attrs: { hidden: "" } }, [
      LM.h("label", { class: "qx-label", text: "Deine Zahlen", attrs: { for: id } }),
      ta,
      LM.h("p", { class: "qx-note", text: "Trenne die Zahlen mit Semikolon oder Leerzeichen. 8,5 ist eine Kommazahl." }),
      msg
    ]);
    var saved = LM.store.get(o.store, null);
    ta.value = typeof saved === "string" && saved.trim() ? saved : o.def;
    var timer = 0;
    ta.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(apply, 250); });
    function read() {
      var r = LM.parseList(ta.value), max = o.max || 60, vals = r.values.slice(0, max), parts = [];
      var bad = r.bad.length > 0, few = vals.length < o.min;
      if (few) parts.push("Gib mindestens " + o.min + " " + plural(o.min, "Zahl", "Zahlen") + " ein.");
      else parts.push(vals.length + " " + plural(vals.length, "Wert", "Werte") + " erkannt.");
      if (r.values.length > max) parts.push("Ich nehme die ersten " + max + ".");
      if (bad) {
        parts.push("Nicht erkannt: " + r.bad.slice(0, 4).map(function (b) { return "„" + b + "“"; }).join(", ") + (r.bad.length > 4 ? " …" : "") + ".");
        if (r.bad.some(function (b) { return /\d,\d.*,/.test(b); })) parts.push("Nach einem Komma braucht es ein Leerzeichen.");
      }
      msg.textContent = parts.join(" ");
      msg.classList.toggle("is-bad", bad || few);
      return few ? null : vals;
    }
    function apply() {
      LM.store.set(o.store, ta.value);
      var v = read();
      if (v) o.onChange(v);
    }
    return { el: box, read: read, show: function (on) { box.hidden = !on; } };
  }

  // Karten markieren; neu markierte Karten hüpfen kurz („pop“), außer bei weniger Bewegung
  function markCards(cards, groups, prevSig, quiet) {
    var sig = JSON.stringify(groups);
    cards.clear();
    groups.forEach(function (g) { cards.mark(g.pos, g.cls); });
    if (!quiet && !LM.reduceMotion && prevSig && prevSig !== sig) {
      groups.forEach(function (g) {
        g.pos.forEach(function (p) {
          var e = cards.item(p);
          if (!e) return;
          e.classList.remove("pop");
          void e.offsetWidth;
          e.classList.add("pop");
        });
      });
    }
    return sig;
  }

  function bump(node) {
    if (LM.reduceMotion || !node) return;
    node.classList.remove("qx-bump");
    void node.offsetWidth;
    node.classList.add("qx-bump");
  }

  function legendHtml(m) {
    var k = function (cls, txt) { return '<span class="qx-key"><span class="qx-sw ' + cls + '" aria-hidden="true"></span>' + txt + "</span>"; };
    var items = [k("qx-sw-box", "Box: Q1 bis Q3"), k("qx-sw-med", "Median"), k("qx-sw-wh", "Whisker"), k("qx-sw-dot", "ein Wert")];
    if (m.out && m.out.length) items.push(k("qx-sw-out", "Ausreißer"));
    if (m.fences) items.push(k("qx-sw-fence", "Grenze"));
    if (m.ghost) items.push(k("qx-sw-ghost", "dein Versuch"));
    return items.join("");
  }

  /* ---------- Boxplot als SVG (responsiv, mit sanftem Umschalten) ---------- */

  function makeBoxChart(host) {
    var wrap = LM.h("div", { class: "chart qx-chart" });
    host.appendChild(wrap);
    var svg = LM.svg.el("svg", { class: "qx-svg", role: "img", "aria-label": "Boxplot" }, wrap);
    var cur = null, raf = 0, W = 0;
    var resp = LM.svg.responsive(wrap, function (w) { W = w; if (cur) render(cur); });
    // Beschriftungsbreiten hängen von der Schrift ab: einmal neu zeichnen, wenn die Webfonts da sind
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cur && !raf) render(cur); });

    function set(m, animate) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      svg.setAttribute("aria-label", describeBox(m));
      var from = cur;
      if (!animate || !from || LM.reduceMotion || from.key !== m.key) {
        cur = m;
        render(m);
        if (from && from.key !== m.key && !LM.reduceMotion) {
          svg.classList.remove("qx-fade");
          void svg.getBoundingClientRect();
          svg.classList.add("qx-fade");
        }
        return;
      }
      var t0 = 0;
      raf = requestAnimationFrame(function frame(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 480), e = 1 - Math.pow(1 - k, 3);
        cur = k < 1 ? lerpModel(from, m, e) : m;
        render(cur);
        raf = k < 1 ? requestAnimationFrame(frame) : 0;
      });
    }

    function render(m) {
      W = wrap.clientWidth || W;
      if (!W || !m) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var E = LM.svg.el, T = LM.svg.text;
      // viele Werte (z. B. n = 60): kleinere Punkte, damit der Stapel nicht zum Klumpen wird
      var padX = 10, ROW = 17, BH = 40, rad = m.n > 30 ? (W < 480 ? 3.2 : 4.2) : (W < 480 ? 4.5 : 5.5);
      var xl = padX, xr = W - padX, x = LM.svg.scale(m.dom[0], m.dom[1], xl, xr);
      var labLo = m.labLo !== undefined ? m.labLo : m.lo, labHi = m.labHi !== undefined ? m.labHi : m.hi;
      var labF = m.labF || m.fences;
      var labels = [], vlines = [];
      function vline(cls, lx, y1, y2) {
        vlines.push({ x: lx, y1: y1, y2: y2 });
        return E("line", { class: cls, x1: lx, x2: lx, y1: y1, y2: y2 }, svg);
      }

      function label(str, cls, at, anchor, opacity) {
        var t = T(svg, 0, 0, str, { class: "lbl " + cls, "text-anchor": "start" });
        var w = 0;
        try { w = t.getComputedTextLength(); } catch (e) { w = 0; }
        if (!w) w = str.length * 6.8;
        if (opacity !== undefined && opacity < 1) t.style.opacity = String(Math.max(0, opacity));
        var it = { t: t, x: at, w: w + 2, anchor: anchor || "middle" };
        labels.push(it);
        return it;
      }

      // obere Beschriftung: Q1 links an der Box, Q3 rechts, Median dazwischen (oder eine Zeile höher)
      var lq1 = label("Q1 = " + num(m.q1), "lbl-q", x(m.q1), "end");
      var lq3 = label("Q3 = " + num(m.q3), "lbl-q", x(m.q3), "start");
      var lmed = label("Median = " + num(m.med), "lbl-med", x(m.med), "middle");
      var top = [lq1, lq3, lmed], fenceLabs = [];
      if (m.fences && m.fenceA > 0.02) {
        m.fences.forEach(function (f, i) {
          var inside = f >= m.dom[0] && f <= m.dom[1], shown = labF ? labF[i] : f;
          var txt = inside ? "Grenze " + num(shown) : i === 0 ? "← Grenze " + num(shown) : "Grenze " + num(shown) + " →";
          var it = label(txt, "qx-lbl-muted", inside ? x(f) : i === 0 ? xl : xr, inside ? "middle" : i === 0 ? "start" : "end", m.fenceA);
          it.f = f; it.inside = inside;
          top.push(it); fenceLabs.push(it);
        });
      }
      var topRows = placeLabels(top, W, 8);
      var T0 = topRows * ROW + 10, mid = T0 + BH / 2, B1 = T0 + BH;
      function topY(row) { return T0 - 8 - row * ROW; }
      top.forEach(function (it) { it.y = topY(it.row); });

      // untere Beschriftung: Whisker-Enden und Ausreißer
      var loIsMin = Math.abs(labLo - m.s[0]) < EPS, hiIsMax = Math.abs(labHi - m.s[m.n - 1]) < EPS;
      var bottom = [
        label((loIsMin ? "Min = " : "Whisker-Ende = ") + num(labLo), "qx-lbl-ink", x(m.lo), "middle"),
        label((hiIsMax ? "Max = " : "Whisker-Ende = ") + num(labHi), "qx-lbl-ink", x(m.hi), "middle")
      ];
      bottom[0].cap = m.lo; bottom[1].cap = m.hi;
      [true, false].forEach(function (low) {
        var idx = [], a = 0;
        m.s.forEach(function (v, i) { if (m.outA[i] > 0.02 && (low ? v < m.q1 : v > m.q3)) { idx.push(i); a = Math.max(a, m.outA[i]); } });
        if (!idx.length) return;
        var vals = uniq(idx.map(function (i) { return m.s[i]; }));
        var cx = (x(vals[0]) + x(vals[vals.length - 1])) / 2;
        bottom.push(label(vals.length === 1 ? "Ausreißer " + num(vals[0]) : "Ausreißer", "lbl-q", cx, "middle", a));
      });
      var botRows = placeLabels(bottom, W, 8);
      function botY(row) { return B1 + 18 + row * ROW; }
      bottom.forEach(function (it) { it.y = botY(it.row); });

      // Punktstapel aller Werte über der Achse
      var px = m.s.map(x), lv = swarm(px, rad), L = Math.max.apply(null, lv.concat([0])) + 1;
      var stepY = 2 * rad + 2;
      if (L > 9) stepY = Math.max(3, (9 * stepY) / L);
      var stripTop = botY(botRows - 1) + 14;
      var yAxis = stripTop + (L - 1) * stepY + 2 * rad + 6;
      var H = yAxis + 40;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);

      // Hilfslinien von der Box zu den Punkten (Quartile gestrichelt, Median durchgezogen)
      vline("qx-guide qx-guide-q", x(m.q1), B1, yAxis);
      vline("qx-guide qx-guide-q", x(m.q3), B1, yAxis);
      vline("qx-guide qx-guide-med", x(m.med), B1, yAxis);

      // Grenzen (range > 0)
      fenceLabs.forEach(function (it) {
        if (!it.inside) return;
        var ln = vline("qx-fence", x(it.f), it.y + 5, yAxis);
        ln.style.opacity = String(m.fenceA);
      });

      // Whisker und Box
      E("line", { class: "whisker", x1: x(m.lo), x2: x(m.q1), y1: mid, y2: mid }, svg);
      E("line", { class: "whisker", x1: x(m.q3), x2: x(m.hi), y1: mid, y2: mid }, svg);
      E("line", { class: "whisker", x1: x(m.lo), x2: x(m.lo), y1: mid - 9, y2: mid + 9 }, svg);
      E("line", { class: "whisker", x1: x(m.hi), x2: x(m.hi), y1: mid - 9, y2: mid + 9 }, svg);
      E("rect", { class: "box-q", x: x(m.q1), y: T0, width: Math.max(2, x(m.q3) - x(m.q1)), height: BH, rx: 4 }, svg);
      E("line", { class: "qx-medline", x1: x(m.med), x2: x(m.med), y1: T0, y2: B1 }, svg);

      // Versuch der Lernenden als gestrichelter Geist
      if (m.ghost) {
        var g = m.ghost, gg = E("g", { class: "qx-ghost-g" }, svg);
        E("line", { class: "qx-ghost", x1: x(g.min), x2: x(g.q1), y1: mid, y2: mid }, gg);
        E("line", { class: "qx-ghost", x1: x(g.q3), x2: x(g.max), y1: mid, y2: mid }, gg);
        E("line", { class: "qx-ghost", x1: x(g.min), x2: x(g.min), y1: mid - 12, y2: mid + 12 }, gg);
        E("line", { class: "qx-ghost", x1: x(g.max), x2: x(g.max), y1: mid - 12, y2: mid + 12 }, gg);
        E("rect", { class: "qx-ghost", x: x(g.q1), y: T0 - 5, width: Math.max(2, x(g.q3) - x(g.q1)), height: BH + 10, rx: 5 }, gg);
        E("line", { class: "qx-ghost", x1: x(g.med), x2: x(g.med), y1: T0 - 5, y2: B1 + 5 }, gg);
      }

      // Ausreißer auf Höhe der Whisker (wie R)
      m.s.forEach(function (v, i) {
        if (m.outA[i] <= 0.02) return;
        var c = E("circle", { class: "dot-out", cx: x(v), cy: mid, r: rad + 0.5 }, svg);
        if (m.outA[i] < 1) c.style.opacity = String(m.outA[i]);
      });

      // Punktstapel
      m.s.forEach(function (v, i) {
        E("circle", { class: m.outA[i] >= 0.5 ? "dot-out" : "dot", cx: px[i], cy: yAxis - rad - 4 - lv[i] * stepY, r: rad }, svg);
      });

      // Achse
      E("line", { class: "ax", x1: xl, x2: xr, y1: yAxis, y2: yAxis }, svg);
      LM.svg.ticks(m.dom[0], m.dom[1], Math.max(5, Math.floor(W / 70))).forEach(function (t) {
        var tx = x(t);
        if (tx < xl - 0.5 || tx > xr + 0.5) return;
        E("line", { class: "ax", x1: tx, x2: tx, y1: yAxis, y2: yAxis + 4 }, svg);
        T(svg, tx, yAxis + 17, LM.fmt(t, 2), { class: "tick", "text-anchor": "middle" });
      });
      if (m.axis) T(svg, W / 2, yAxis + 34, m.axis, { class: "axis-label", "text-anchor": "middle" });

      // Verbindungsstriche von den Beschriftungen zur Box
      [[lq1, m.q1], [lq3, m.q3], [lmed, m.med]].forEach(function (pair) {
        var it = pair[0], lx = x(pair[1]);
        vline("qx-lead", lx, T0 - 1, it.y + 4);
      });
      bottom.slice(0, 2).forEach(function (it) {
        var lx = x(it.cap);
        if (it.row > 0) vline("qx-lead", lx, mid + 10, it.y - 12);
      });

      // Beschriftungen nach vorn holen und setzen; gekreuzte bekommen eine Unterlage
      var plates = labelPlates(labels, vlines);
      labels.forEach(function (it, i) {
        if (plates[i]) {
          var pb = plates[i];
          var pl = E("rect", { class: "qx-lblbg", x: pb.x, y: pb.y, width: pb.width, height: pb.height, rx: 3 }, svg);
          if (it.t.style.opacity) pl.style.opacity = it.t.style.opacity;
        }
        it.t.setAttribute("x", it.l);
        it.t.setAttribute("y", it.y);
        svg.appendChild(it.t);
      });
    }

    return { el: wrap, set: set, redraw: resp.redraw };
  }

  // Fünf Kacheln Min, Q1, Median, Q3, Max mit kurzem Rechenweg
  function fiveTiles(parent) {
    var row = LM.h("div", { class: "qx-five" });
    parent.appendChild(row);
    var parts = {};
    KEYS.forEach(function (k) {
      var cls = k === "med" ? "stat s-med" : k === "q1" || k === "q3" ? "stat s-q" : "stat";
      var val = LM.h("span", { class: "stat-value" }), how = LM.h("span", { class: "qx-how" });
      row.appendChild(LM.h("div", { class: cls + " qx-tile" }, [LM.h("span", { class: "stat-label", text: LONG[k] }), val, how]));
      parts[k] = { val: val, how: how };
    });
    return {
      el: row,
      set: function (xs) {
        var n = xs.length;
        fiveNumbers(xs).forEach(function (f) {
          parts[f.key].val.textContent = num(f.value);
          parts[f.key].how.innerHTML = howHtml(f, n);
        });
      }
    };
  }

  /* =====================================================================
     Modul 1: quantile-explorer (Kapitel 4)
     ===================================================================== */

  function mountExplorer(el) {
    var S = LM.stats;
    el.classList.add("widget", "qx", "qx-explorer");
    head(el, "Quantil-Labor", "Ausprobieren", "Wähl Daten und schieb p hin und her. Du siehst sofort, welcher Platz das p-Quantil ist und warum.");

    var presets = {
      f102: [3, 6, 8, 9, 11, 15],
      noten: S.expand([1, 2, 3, 4, 5, 6], [3, 5, 8, 6, 2, 1]),
      puls: [62, 64, 68, 70, 70, 74, 74, 76, 76, 78, 78, 80]
    };
    var st = { key: "f102", raw: presets.f102.slice(), p: 0.25, ver: 1, shown: 0, sorting: false, sig: "", lastVal: null, sortT: 0, liveT: 0 };

    /* --- Daten --- */
    var seg = segment([
      { key: "f102", label: "Folie 102" },
      { key: "noten", label: "Noten (n = 25)" },
      { key: "puls", label: "Ruhepuls (n = 12)" },
      { key: "rand", label: "Zufällig" },
      { key: "own", label: "Eigene" }
    ], "Datensatz wählen", function (k) { pick(k); });
    var reroll = LM.h("button", { class: "btn btn-sm btn-ghost", text: "Neu würfeln", attrs: { type: "button", hidden: "" }, on: { click: function () { pick("rand"); } } });
    var own = ownInput({
      store: "qx-own-quantile", def: "3; 6; 8; 9; 11; 15", min: 1,
      onChange: function (vals) { if (st.key !== "own") return; st.raw = vals; st.ver += 1; render(false); }
    });
    el.appendChild(LM.h("div", { class: "w-controls" }, [LM.h("span", { class: "qx-label", text: "Daten" }), seg.el, reroll]));
    el.appendChild(own.el);

    /* --- p einstellen --- */
    var sid = uid("p");
    var pVal = LM.h("output", { class: "qx-pval", attrs: { for: sid } });
    var pPct = LM.h("span", { class: "qx-ppct" });
    var slider = LM.h("input", { class: "slider qx-range", attrs: { id: sid, type: "range", min: "0.01", max: "0.99", step: "0.01", value: "0.25" } });
    var minus = LM.h("button", { class: "btn btn-sm qx-pm", text: "−", attrs: { type: "button", "aria-label": "p um 0,01 verkleinern" } });
    var plus = LM.h("button", { class: "btn btn-sm qx-pm", text: "+", attrs: { type: "button", "aria-label": "p um 0,01 vergrößern" } });
    var chipBox = LM.h("div", { class: "qx-chips", attrs: { role: "group", "aria-label": "Häufige Werte für p" } });
    var chips = [0.1, 0.25, 0.5, TWO_THIRDS, 0.75, 0.8, 0.9].map(function (v) {
      var c = LM.h("button", { class: "chip", text: pName(v), attrs: { type: "button", "aria-pressed": "false", "aria-label": "p = " + pShow(v) }, on: { click: function () { setP(v); } } });
      c._p = v;
      chipBox.appendChild(c);
      return c;
    });
    slider.addEventListener("input", function () { setP(Number(slider.value), true); });
    minus.addEventListener("click", function () { setP(isThird(st.p) ? Math.floor(st.p * 100) / 100 : st.p - 0.01); });
    plus.addEventListener("click", function () { setP(isThird(st.p) ? Math.ceil(st.p * 100) / 100 : st.p + 0.01); });
    el.appendChild(LM.h("div", { class: "qx-pbox" }, [
      LM.h("div", { class: "qx-phead" }, [LM.h("label", { class: "qx-label", text: "Anteil p", attrs: { for: sid } }), pVal, pPct]),
      LM.h("div", { class: "qx-slide" }, [minus, slider, plus]),
      chipBox
    ]));

    /* --- Rechenweg in vier Schritten --- */
    function stepLi(title, kids, cls) {
      return LM.h("li", { class: cls || "" }, [LM.h("div", { class: "qx-stepbody" }, [LM.h("h4", { class: "qx-steptitle", text: title })].concat(kids))]);
    }
    var cardsHost = LM.h("div", { class: "qx-cards" });
    var cards = LM.cards(cardsHost, { values: [], sorted: true });
    var sortNote = LM.h("p", { class: "qx-note" });
    var cutLine = LM.h("span", { class: "qx-cut", attrs: { "aria-hidden": "true" } });
    var countList = LM.h("ul", { class: "qx-count" });
    var countAfter = LM.h("p", { class: "qx-note qx-count-after" });
    var npEl = LM.h("div", { class: "qx-np" });
    function branch(title, rule) {
      var badge = LM.h("span", { class: "qx-branch-badge" }), now = LM.h("p", { class: "qx-branch-now" });
      var box = LM.h("div", { class: "qx-branch" }, [badge, LM.h("p", { class: "qx-branch-title", text: title }), LM.h("p", { class: "qx-branch-rule", text: rule }), now]);
      return { el: box, badge: badge, now: now };
    }
    var bA = branch("Keine ganze Zahl", "→ aufrunden → Platz k");
    var bB = branch("Ganze Zahl k", "→ Mittel aus Platz k und k + 1");
    var tileLab = LM.h("span", { class: "stat-label" }), tileVal = LM.h("span", { class: "stat-value" });
    var tile = LM.h("div", { class: "stat s-q qx-res-tile" }, [tileLab, tileVal]);
    var resTex = LM.h("div", { class: "qx-res-tex" });
    var alias = LM.h("p", { class: "qx-note" });
    el.appendChild(LM.h("ol", { class: "steps qx-steps" }, [
      stepLi("Sortieren", [cardsHost, sortNote, countList, countAfter]),
      stepLi("n · p rechnen", [npEl]),
      stepLi("Fall bestimmen", [LM.h("div", { class: "qx-branches" }, [bA.el, bB.el])]),
      stepLi("Ergebnis", [LM.h("div", { class: "qx-result" }, [tile, resTex]), alias], "is-active")
    ]));

    /* --- Probe mit der Definition (Folie 100) --- */
    var lblLe = LM.h("span", { class: "qx-strip-lbl qx-r1" }), lblGe = LM.h("span", { class: "qx-strip-lbl qx-r2" });
    var rowLe = LM.h("div", { class: "qx-cells" }), rowGe = LM.h("div", { class: "qx-cells" });
    var pmark = LM.h("span", { class: "qx-pmark" });
    var cellsWrap = LM.h("div", { class: "qx-cells-wrap" }, [rowLe, rowGe, pmark]);
    var pmarkTxt = LM.h("span", { class: "qx-pmark-txt" });
    var strip = LM.h("div", { class: "qx-strip", attrs: { "aria-hidden": "true" } }, [lblLe, lblGe, cellsWrap, LM.h("div", { class: "qx-pmark-row" }, [pmarkTxt])]);
    var defList = LM.h("ul", { class: "qx-def-list" });
    var stripNote = LM.h("p", { class: "qx-note" });
    var defPanel = LM.h("div", { class: "qx-panel" }, [
      LM.h("p", { class: "qx-sec-title", text: "Probe mit der Definition (Folie 100)" }),
      LM.h("p", { class: "qx-rule", html: "Mindestens " + LM.tex("p \\cdot 100\\,\\%") + " der Werte sind " + LM.tex("\\le \\tilde{x}_p") +
        " und mindestens " + LM.tex("(1-p) \\cdot 100\\,\\%") + " sind " + LM.tex("\\ge \\tilde{x}_p") + "." }),
      strip, defList, stripNote
    ]);
    var stripN = 0;
    LM.svg.responsive(cellsWrap, function (w) { tight(w); });
    function tight(w) {
      w = w || cellsWrap.clientWidth;
      if (!w || !stripN) return;
      strip.classList.toggle("is-tight", (w - (stripN - 1) * 2) / stripN < 22);
    }

    /* --- Und in R? --- */
    var rCode = LM.h("pre", { class: "qx-code" });
    var rOut = LM.h("pre", { class: "qx-code qx-code-out" });
    var rAns = LM.h("details", { class: "qx-rans" }, [LM.h("summary", { class: "qx-rans-sum", text: "Was R antwortet" }), rOut]);
    var rWarn = LM.h("p", { class: "qx-warn" });
    var rPanel = LM.h("div", { class: "qx-panel" }, [
      LM.h("p", { class: "qx-sec-title", text: "Und in R?" }),
      LM.h("p", { class: "qx-rule", html: "Die Regel von Folie 101 heißt in R <code>type = 2</code> (Folie 103). Jede Zeile hat einen Kommentar mit <code>#</code>, den R nicht ausführt." }),
      rCode, rAns, rWarn
    ]);
    el.appendChild(LM.h("div", { class: "qx-extras" }, [defPanel, rPanel]));

    var live = LM.h("p", { class: "qx-sr", attrs: { role: "status", "aria-live": "polite" } });
    el.appendChild(live);

    /* --- Logik --- */
    function pick(key) {
      if (key === st.key && key !== "rand") return;
      if (key === "own") {
        var v = own.read();
        st.key = key;
        if (v) st.raw = v;
      } else {
        st.key = key;
        st.raw = key === "rand" ? randomQuantileData(Math.random) : presets[key].slice();
      }
      seg.set(key);
      reroll.hidden = key !== "rand";
      own.show(key === "own");
      st.ver += 1;
      render(key === "rand");
    }

    function setP(p, fromSlider) {
      p = Math.min(0.99, Math.max(0.01, p));
      if (!isThird(p)) p = Math.round(p * 100) / 100;
      st.p = p;
      if (!fromSlider) slider.value = String(Math.round(p * 100) / 100);
      render(false);
    }

    function markQ(info) {
      if (cutLine.parentNode) cutLine.parentNode.removeChild(cutLine);
      if (st.sorting) { cards.clear(); return; }
      st.sig = markCards(cards, [{ pos: info.positions, cls: "is-q" }], st.sig);
      var cut = cutPlace(info), host = cut && cut.gap && cards.item(cut.pos);
      if (host) host.appendChild(cutLine);
    }

    function isAscending(xs) { return xs.every(function (v, i) { return i === 0 || xs[i - 1] <= v; }); }

    function render(animateSort) {
      var s = S.sorted(st.raw), n = s.length, p = st.p, info = S.quantileInfo(s, p);
      var k = info.k, q = info.value;

      // p-Anzeige
      pVal.textContent = "p = " + pShow(p);
      pPct.textContent = "(" + pct(p) + ")";
      slider.setAttribute("aria-valuetext", "p = " + pShow(p));
      var fill = (Number(slider.value) - 0.01) / 0.98;
      slider.style.setProperty("--qx-fill", "calc(11px + (100% - 22px) * " + fill.toFixed(4) + ")");
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(Math.abs(c._p - p) < EPS)); });
      minus.disabled = p <= 0.01 + EPS;
      plus.disabled = p >= 0.99 - EPS;

      // 1 Sortieren
      if (st.shown !== st.ver) {
        st.shown = st.ver;
        st.sig = "";
        clearTimeout(st.sortT);
        cards.el.classList.toggle("ncards-sm", n > 12);
        if (animateSort && !LM.reduceMotion && !isAscending(st.raw)) {
          cards.set(st.raw, false);
          st.sorting = true;
          var ver = st.ver;
          st.sortT = setTimeout(function () {
            if (ver !== st.ver) return;
            cards.sort(function () {
              if (ver !== st.ver) return;
              st.sorting = false;
              markQ(S.quantileInfo(st.raw, st.p));
            });
          }, 450);
        } else {
          st.sorting = false;
          cards.set(s, true);
        }
      }
      markQ(info);
      var cutInfo = cutPlace(info);
      sortNote.textContent = "n = " + n + " " + plural(n, "Wert", "Werte") + ", der Größe nach. " + (cutInfo ? cutInfo.text : "");
      countList.innerHTML = "";
      (cutInfo ? cutInfo.rows : []).forEach(function (r) {
        countList.appendChild(LM.h("li", { class: r.ok ? "is-ok" : "is-bad" }, [
          LM.h("span", { class: "qx-count-lbl", text: r.label }),
          LM.h("span", { class: "qx-count-verdict", text: r.ok ? "✓ reicht" : "✗ zu wenig" })
        ]));
      });
      countList.hidden = !countList.children.length;
      countAfter.textContent = cutInfo ? cutInfo.after : "";

      // 2 n · p
      npEl.innerHTML = '<span class="qx-tex-lg">' + LM.tex(npTex(n, p)) + "</span>" +
        '<span class="qx-pill">' + (info.integer ? "ganze Zahl" : "keine ganze Zahl") + "</span>";

      // 3 Fall bestimmen
      var on = info.integer ? bB : bA, off = info.integer ? bA : bB;
      on.el.className = "qx-branch is-on";
      off.el.className = "qx-branch is-off";
      on.badge.textContent = "Trifft zu ✓";
      off.badge.textContent = "Trifft nicht zu";
      if (info.integer) {
        bB.now.textContent = LM.fmt(info.np, 4) + " ist ganz → Mittel aus Platz " + k + " und " + (k + 1);
        bA.now.textContent = "Beispiel: 1,5 → Platz 2";
      } else {
        bA.now.textContent = npShow(info.np) + " → aufrunden → Platz " + k;
        bB.now.textContent = "Beispiel: 4 → Platz 4 und 5";
      }

      // 4 Ergebnis
      var sub = pSub(p), t1, t2;
      if (info.integer) {
        t1 = "\\tilde{x}_{" + sub + "} = \\tfrac{1}{2}\\left[x_{(" + k + ")} + x_{(" + (k + 1) + ")}\\right]";
        t2 = "= \\tfrac{1}{2}\\left(" + tnum(s[k - 1]) + " + " + tpar(s[k]) + "\\right) = " + tnum(q);
      } else {
        t1 = "\\tilde{x}_{" + sub + "} = x_{(" + k + ")}";
        t2 = "= " + tnum(q);
      }
      resTex.innerHTML = '<span class="qx-tex-lg">' + LM.tex(t1) + '</span> <span class="qx-tex-lg">' + LM.tex(t2) + "</span>";
      tileLab.innerHTML = LM.esc(pName(p)) + "-Quantil " + LM.tex("\\tilde{x}_{" + sub + "}");
      tileVal.textContent = num(q);
      if (st.lastVal !== null && Math.abs(st.lastVal - q) > EPS) bump(tile);
      st.lastVal = q;
      var a = quantileAlias(p);
      alias.innerHTML = a ? "Auch genannt: " + a + "." : "Für 2/3 gibt es keinen eigenen Namen. Es ist einfach das 2/3-Quantil.";

      // Probe
      var chk = defCheck(s, q, p);
      stripN = n;
      rowLe.innerHTML = "";
      rowGe.innerHTML = "";
      s.forEach(function (v, i) {
        var chosen = info.positions.indexOf(i + 1) >= 0 ? " is-pick" : "";
        rowLe.appendChild(LM.h("span", { class: "qx-cell" + (v <= q + EPS ? " is-in" : "") + chosen }, [LM.h("span", { class: "qx-cv", text: num(v) })]));
        rowGe.appendChild(LM.h("span", { class: "qx-cell" + (v >= q - EPS ? " is-in" : "") + chosen }, [LM.h("span", { class: "qx-cv", text: num(v) })]));
      });
      tight();
      lblLe.textContent = "≤ " + num(q);
      lblGe.textContent = "≥ " + num(q);
      var left = "calc(" + p.toFixed(6) + " * (100% + 2px) - 1px)";
      pmark.style.left = left;
      pmarkTxt.style.left = left;
      pmarkTxt.style.transform = p < 0.2 ? "translateX(-8px)" : p > 0.8 ? "translateX(calc(-100% + 8px))" : "translateX(-50%)";
      pmarkTxt.textContent = "n · p = " + npShow(info.np);
      function okMark(ok) { return '<span class="qx-ok' + (ok ? "" : " is-no") + '" aria-hidden="true">' + (ok ? "✓" : "✗") + "</span>"; }
      // „1 von 4 Werten ist …“, „3 von 4 Werten sind …“, „1 von 1 Wert ist …“
      function countTxt(c) { return "<strong>" + c + " von " + n + "</strong> " + plural(n, "Wert", "Werten") + " " + plural(c, "ist", "sind"); }
      defList.innerHTML =
        "<li>" + okMark(chk.okLe) + "<span>" + countTxt(chk.le) + " ≤ " + num(q) + ", also " + pct(chk.le / n) +
          ". Nötig: mindestens p · 100 % = " + pct(p) + ".</span></li>" +
        "<li>" + okMark(chk.okGe) + "<span>" + countTxt(chk.ge) + " ≥ " + num(q) + ", also " + pct(chk.ge / n) +
          ". Nötig: mindestens (1 − p) · 100 % = " + pct(1 - p) + ".</span></li>";
      stripNote.textContent = "Jedes Kästchen ist ein Wert, sortiert wie oben. Die Linie steht bei n · p = " + npShow(info.np) +
        ". Die obere Reihe muss von links bis an die Linie reichen, die untere von rechts. " +
        (chk.okLe && chk.okGe ? "Beides klappt, also passt " + num(q) + "." : "");

      // R
      var t7 = S.quantileType7(s, p), differs = Math.abs(t7 - q) > EPS;
      rCode.innerHTML = rHtml(rQuantileLines(st.raw, p));
      rOut.innerHTML = rHtml(rAnswer(p, q, t7), differs);
      rWarn.className = "qx-warn " + (differs ? "is-bad" : "is-same");
      rWarn.innerHTML = differs
        ? "<strong>Achtung:</strong> Ohne <code>type = 2</code> käme " + num(t7) + " heraus – das ist nicht die Regel der Vorlesung."
        : "Hier käme ohne <code>type = 2</code> zufällig auch " + num(q) + " heraus. Schreib <code>type = 2</code> trotzdem immer dazu.";

      // Ansage für Screenreader (kurz verzögert, damit der Regler nicht dauernd spricht)
      clearTimeout(st.liveT);
      st.liveT = setTimeout(function () {
        live.textContent = pName(p) + "-Quantil = " + num(q) + ". n mal p = " + npShow(info.np) + ", " +
          (info.integer ? "ganze Zahl: Mittel aus Platz " + k + " und " + (k + 1) : "keine ganze Zahl: aufrunden auf Platz " + k) + ".";
      }, 350);
    }

    seg.set(st.key);
    render(false);
  }

  /* =====================================================================
     Modul 2: boxplot-builder (Kapitel 5)
     ===================================================================== */

  function mountBox(el) {
    var S = LM.stats;
    el.classList.add("widget", "qx", "qx-box");
    head(el, "Boxplot-Werkstatt", "Bauen", "Aus fünf Zahlen wird ein Bild. Schau dir Beispiele an oder bau den Boxplot selbst.");

    var modeSeg = segment([{ key: "explore", label: "Anschauen" }, { key: "practice", label: "Selbst bauen" }], "Modus wählen", setMode);
    el.appendChild(LM.h("div", { class: "w-controls" }, [modeSeg.el]));
    var paneE = LM.h("div", { class: "qx-pane" });
    var paneP = LM.h("div", { class: "qx-pane", attrs: { hidden: "" } });
    el.appendChild(paneE);
    el.appendChild(paneP);

    /* ---------- Anschauen ---------- */
    var PULS = [62, 64, 68, 70, 70, 74, 74, 76, 76, 78, 78, 80];
    var presets = {
      puls: { data: PULS, axis: "Ruhepuls (Schläge pro Minute)" },
      f109: { data: [58].concat(PULS, [89]), axis: "Ruhepuls (Schläge pro Minute)", range: 1 },
      wait: { data: [12, 5, 20, 8, 4, 38, 10, 5, 15], axis: "Wartezeit in Minuten" },
      rt: { data: RT_A8, axis: "Reaktionszeit in ms", range: 1.5 },
      rand: { axis: "Zufallswerte" },
      own: { axis: "Deine Werte" }
    };
    var st = { key: "puls", raw: PULS.slice(), range: 0, ver: 1, shown: 0, sig: "", unfold: false };

    var seg = segment([
      { key: "puls", label: "Ruhepuls (Folie 106)" },
      { key: "f109", label: "Folie 109 (mit 58 und 89)" },
      { key: "wait", label: "Wartezeiten" },
      { key: "rt", label: "Reaktionszeiten (Aufgabe 8, n = 60)" },
      { key: "rand", label: "Zufällig" },
      { key: "own", label: "Eigene" }
    ], "Datensatz wählen", function (k) { pick(k); });
    var reroll = LM.h("button", { class: "btn btn-sm btn-ghost", text: "Neu würfeln", attrs: { type: "button", hidden: "" }, on: { click: function () { pick("rand"); } } });
    var own = ownInput({
      store: "qx-own-boxplot", def: "2; 4; 4; 5; 7; 9; 30", min: 2,
      onChange: function (vals) { if (st.key !== "own") return; st.raw = vals; st.ver += 1; renderE(false); }
    });
    paneE.appendChild(LM.h("div", { class: "w-controls" }, [LM.h("span", { class: "qx-label", text: "Daten" }), seg.el, reroll]));
    paneE.appendChild(own.el);

    var cardsHost = LM.h("div", { class: "qx-cards qx-foldable" });
    var cards = LM.cards(cardsHost, { values: [], sorted: true, small: true });
    var foldBtn = LM.h("button", {
      class: "btn btn-sm btn-ghost qx-foldbtn",
      attrs: { type: "button", "aria-expanded": "false", hidden: "" },
      on: { click: function () { st.unfold = !st.unfold; applyFold(); } }
    });
    var foldNote = LM.h("p", { class: "qx-note", attrs: { hidden: "" } });
    paneE.appendChild(LM.h("div", { class: "qx-block" }, [
      LM.h("div", { class: "qx-blockhead" }, [LM.h("p", { class: "qx-sec-title", text: "Sortierte Werte" }), foldBtn]),
      cardsHost,
      foldNote,
      LM.h("p", { class: "qx-legend qx-legend-cards" }, [
        LM.h("span", { class: "tag tag-q", text: "Plätze für Q1 und Q3" }),
        LM.h("span", { class: "tag tag-med", text: "Plätze für den Median" })
      ])
    ]));
    var tiles = fiveTiles(paneE);

    var rangeSeg = segment([
      { key: "0", html: '<span class="qx-mono">0</span>', aria: "range = 0" },
      { key: "1", html: '<span class="qx-mono">1</span>', aria: "range = 1" },
      { key: "1.5", html: '<span class="qx-mono">1.5</span>', aria: "range = 1.5" }
    ], "Whisker-Regel in R: range", function (k) { setRange(Number(k)); });
    var rBox = LM.h("pre", { class: "qx-code qx-code-sm", attrs: { "aria-label": "R-Code für diesen Boxplot" } });
    paneE.appendChild(LM.h("div", { class: "qx-rangebar" }, [
      LM.h("div", { class: "qx-rangehead" }, [
        LM.h("span", { class: "qx-label", text: "Whisker in R" }),
        LM.h("span", { class: "qx-rangepick" }, [LM.h("code", { class: "qx-mono qx-rangeeq", text: "range =" }), rangeSeg.el])
      ]),
      rBox
    ]));
    var slideNote = LM.h("p", { class: "qx-slide-note", attrs: { hidden: "" } });
    paneE.appendChild(slideNote);
    var chart = makeBoxChart(paneE);
    var legend = LM.h("div", { class: "qx-legend" });
    var expl = LM.h("div", { class: "qx-expl", attrs: { "aria-live": "polite" } });
    paneE.appendChild(legend);
    paneE.appendChild(expl);

    function pick(key) {
      if (key === st.key && key !== "rand") return;
      if (key === "own") {
        var v = own.read();
        st.key = key;
        if (v) st.raw = v;
      } else {
        st.key = key;
        st.raw = key === "rand" ? randomBoxData(Math.random) : presets[key].data.slice();
      }
      if (presets[key].range !== undefined) st.range = presets[key].range;
      seg.set(key);
      reroll.hidden = key !== "rand";
      own.show(key === "own");
      st.ver += 1;
      renderE(false);
    }

    function setRange(r) {
      if (r === st.range) return;
      st.range = r;
      renderE(true);
    }

    // Bei vielen Werten nur die gebrauchten Plätze zeigen („…“ dazwischen); Knopf schaltet auf alle Werte um
    function applyFold() {
      var vals = cards.values(), n = vals.length, big = n > FOLD_N, folded = big && !st.unfold;
      foldBtn.hidden = !big;
      foldBtn.textContent = st.unfold ? "Nur die wichtigen Plätze" : "Alle " + n + " Werte zeigen";
      foldBtn.setAttribute("aria-expanded", String(big && st.unfold));
      var keep = folded ? foldKeep(fiveNumbers(vals), n) : [], plan = folded ? foldPlan(n, keep) : null;
      for (var i = 1; i <= n; i++) {
        var e = cards.item(i);
        if (!e) continue;
        e.classList.toggle("qx-far", !!plan && plan[i - 1].far);
        e.classList.toggle("qx-gap", !!plan && plan[i - 1].gap);
      }
      foldNote.hidden = !folded;
      foldNote.textContent = folded ? "Bei " + n + " Werten siehst du hier nur die Plätze, die du für die fünf Zahlen brauchst: " +
        listAnd(keep) + ". Die Punkte (…) stehen für die Werte dazwischen." : "";
    }

    function renderE(animate) {
      var s = S.sorted(st.raw), n = s.length;
      if (st.shown !== st.ver) {
        st.shown = st.ver;
        st.sig = "";
        cards.set(s, true);
      }
      var five = fiveNumbers(s);
      st.sig = markCards(cards, [
        { pos: five[2].positions, cls: "is-med" },
        { pos: five[1].positions, cls: "is-q" },
        { pos: five[3].positions, cls: "is-q" }
      ], st.sig, true);
      applyFold();
      tiles.set(s);
      rangeSeg.set(String(st.range));
      rBox.innerHTML = rHtml(rBoxLines(st.range));
      var m = boxModel(s, st.range);
      m.key = "e" + st.ver;
      m.dom = boxDomain(m);
      m.axis = presets[st.key].axis;
      chart.set(m, animate);
      legend.innerHTML = legendHtml(m);
      expl.innerHTML = rangeHtml(m);
      if (st.key === "f109") {
        slideNote.hidden = false;
        slideNote.innerHTML = st.range === 1
          ? "Wie auf Folie 109: Mit <code>range = 1</code> liegt 89 außerhalb der Grenzen und wird zum Ausreißer."
          : "Folie 109 zeichnet mit <code>range = 1</code>. Schalte um und vergleiche.";
      } else if (st.key === "rt") {
        slideNote.hidden = false;
        slideNote.innerHTML = st.range === 1.5
          ? "Aufgabe 10 a): <code>boxplot(x)</code> ohne <code>range</code> rechnet mit range = 1.5. Dann liegen " +
            listAnd(uniq(m.out)) + " außerhalb der Grenzen. R zeichnet sie als Ausreißer."
          : "In Aufgabe 10 a) zeichnet R mit <code>boxplot(x)</code>, also mit range = 1.5. Schalte um und vergleiche.";
      } else slideNote.hidden = true;
    }

    /* ---------- Selbst bauen ---------- */
    var pr = { raw: [], ver: 0, revealed: false, counted: false, made: false, sig: "" };
    var pCardsHost = LM.h("div", { class: "qx-cards" });
    var pCards = LM.cards(pCardsHost, { values: [] });
    var sortBtn = LM.h("button", { class: "btn btn-sm", text: "Sortieren", attrs: { type: "button" }, on: { click: sortP } });
    var nInfo = LM.h("span", { class: "qx-note" });
    var inputs = {};
    var fields = LM.h("div", { class: "qx-five-in" });
    KEYS.forEach(function (k, idx) {
      var id = uid("in-" + k);
      var inp = LM.h("input", {
        class: "num-input",
        attrs: { id: id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false" },
        on: {
          // Enter springt zum nächsten leeren Feld; sind alle danach ausgefüllt, wird geprüft
          keydown: function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            var next = KEYS.slice(idx + 1).filter(function (j) { return !inputs[j].value.trim(); })[0];
            if (next && inp.value.trim()) inputs[next].focus(); else check();
          },
          input: function () { inp.classList.remove("is-ok", "is-miss"); inp.removeAttribute("aria-invalid"); }
        }
      });
      fields.appendChild(LM.h("div", { class: "qx-in" }, [LM.h("label", { class: "qx-in-name", text: NAMES[k], attrs: { for: id } }), inp]));
      inputs[k] = inp;
    });
    var checkBtn = LM.h("button", { class: "btn btn-primary", text: "Prüfen", attrs: { type: "button" }, on: { click: check } });
    var solveBtn = LM.h("button", { class: "btn btn-ghost", text: "Lösung zeigen", attrs: { type: "button" }, on: { click: reveal } });
    var newBtn = LM.h("button", { class: "btn", text: "Neue Aufgabe", attrs: { type: "button" }, on: { click: newTask } });
    var score = LM.h("span", { class: "qx-score" });
    var fb = LM.h("p", { class: "feedback", attrs: { role: "status", "aria-live": "polite" } });
    var hints = LM.h("ul", { class: "qx-hints" });
    var after = LM.h("div", { class: "qx-after", attrs: { hidden: "" } });
    after.appendChild(LM.h("p", { class: "qx-sec-title", text: "So sieht der richtige Boxplot aus" }));
    var pChart = makeBoxChart(after);
    var pLegend = LM.h("div", { class: "qx-legend" });
    after.appendChild(pLegend);
    var sol = LM.h("div", { class: "solution qx-solution", attrs: { hidden: "" } });
    var solText = LM.h("p", {});
    sol.appendChild(LM.h("p", { class: "qx-sec-title", text: "Lösung" }));
    sol.appendChild(solText);
    var solTiles = fiveTiles(sol);

    paneP.appendChild(LM.h("p", { class: "qx-task", html: "Bestimme die fünf Zahlen für den Boxplot. <strong>Achtung:</strong> Die Werte sind noch nicht sortiert." }));
    paneP.appendChild(pCardsHost);
    paneP.appendChild(LM.h("div", { class: "w-controls" }, [sortBtn, nInfo]));
    paneP.appendChild(fields);
    paneP.appendChild(LM.h("div", { class: "w-controls" }, [checkBtn, solveBtn, newBtn, score]));
    paneP.appendChild(fb);
    paneP.appendChild(hints);
    paneP.appendChild(after);
    paneP.appendChild(sol);

    function showScore() {
      var c = LM.store.get("qx-boxplot-solved", 0);
      score.textContent = "Richtig gebaut: " + (Number(c) || 0);
    }

    function newTask() {
      pr.raw = practiceData(Math.random);
      pr.ver += 1;
      pr.revealed = false;
      pr.counted = false;
      pr.sig = "";
      pCards.set(pr.raw, false);
      sortBtn.disabled = false;
      sortBtn.textContent = "Sortieren";
      nInfo.textContent = "n = " + pr.raw.length + " Werte. Tipp: Zuerst sortieren.";
      KEYS.forEach(function (k) {
        inputs[k].value = "";
        inputs[k].classList.remove("is-ok", "is-miss");
        inputs[k].removeAttribute("aria-invalid");
      });
      fb.className = "feedback";
      fb.textContent = "";
      hints.innerHTML = "";
      after.hidden = true;
      sol.hidden = true;
    }

    function sortP(done) {
      if (pCards.isSorted()) { if (typeof done === "function") done(); return; }
      sortBtn.disabled = true;
      sortBtn.textContent = "Sortiert ✓";
      nInfo.textContent = "n = " + pr.raw.length + " Werte, jetzt sortiert. Zähl die Plätze von links ab.";
      pCards.sort(typeof done === "function" ? done : null);
    }

    function practiceModel(ghost) {
      var m = boxModel(pr.raw, 0), dv = m.s.slice();
      if (ghost) {
        var span = (m.s[m.n - 1] - m.s[0]) || 1;
        var fine = KEYS.every(function (k) { return ghost[k] >= m.s[0] - span && ghost[k] <= m.s[m.n - 1] + span; });
        if (fine) dv = dv.concat([ghost.min, ghost.max]); else ghost = null;
      }
      m.dom = domainFor(dv);
      m.ghost = ghost;
      m.key = "p" + pr.ver + (ghost ? "g" + KEYS.map(function (k) { return ghost[k]; }).join("_") : "");
      m.axis = "Werte der Aufgabe";
      return m;
    }

    function check() {
      var texts = {}, list = [];
      KEYS.forEach(function (k) { texts[k] = inputs[k].value; });
      var v = practiceVerdict(texts, pr.raw), tried = v.state !== "empty";
      KEYS.forEach(function (k) {
        var r = v.res[k], judged = tried && r.code !== "empty";
        inputs[k].classList.toggle("is-ok", judged && r.ok);
        inputs[k].classList.toggle("is-miss", judged && !r.ok);
        if (judged) inputs[k].setAttribute("aria-invalid", String(!r.ok)); else inputs[k].removeAttribute("aria-invalid");
        if (judged && !r.ok) list.push("<li><strong>" + NAMES[k] + ":</strong> " + LM.esc(r.msg) + "</li>");
      });
      if (v.allNum && !v.ordered) list.push('<li class="is-tip"><strong>Tipp:</strong> Es gilt immer Min ≤ Q1 ≤ Median ≤ Q3 ≤ Max.</li>');
      hints.innerHTML = list.join("");
      // Den richtigen Boxplot gibt es erst, wenn alle fünf Felder ausgefüllt sind (sonst wäre die Lösung verraten)
      var m = null;
      if (v.state === "done") {
        var g = v.okN < 5 && v.ordered ? { min: v.vals.min, q1: v.vals.q1, med: v.vals.med, q3: v.vals.q3, max: v.vals.max } : null;
        m = practiceModel(g);
      }
      var msg = practiceMessage(v, !!(m && m.ghost));
      fb.className = "feedback" + (msg.cls ? " " + msg.cls : "");
      fb.textContent = msg.text;
      if (!m) {
        inputs[v.missing[0]].focus();
        return;
      }
      if (v.okN === 5) {
        if (!pr.revealed && !pr.counted) {
          pr.counted = true;
          LM.store.set("qx-boxplot-solved", (Number(LM.store.get("qx-boxplot-solved", 0)) || 0) + 1);
          showScore();
        }
        LM.celebrate(checkBtn);
      }
      after.hidden = false;
      pChart.set(m, false);
      pLegend.innerHTML = legendHtml(m);
    }

    function reveal() {
      pr.revealed = true;
      var s = S.sorted(pr.raw), five = fiveNumbers(s);
      function markSol() {
        pr.sig = markCards(pCards, [
          { pos: five[2].positions, cls: "is-med" },
          { pos: five[1].positions, cls: "is-q" },
          { pos: five[3].positions, cls: "is-q" }
        ], pr.sig, true);
      }
      sortP(markSol);
      solText.innerHTML = "<strong>Sortiert:</strong> " + s.map(num).join("; ") + " (n = " + s.length + ")";
      solTiles.set(s);
      sol.hidden = false;
      if (after.hidden) {
        after.hidden = false;
        var m = practiceModel(null);
        pChart.set(m, false);
        pLegend.innerHTML = legendHtml(m);
      }
    }

    function setMode(k) {
      modeSeg.set(k);
      paneE.hidden = k !== "explore";
      paneP.hidden = k !== "practice";
      if (k === "practice" && !pr.made) {
        pr.made = true;
        newTask();
      }
    }

    modeSeg.set("explore");
    seg.set(st.key);
    showScore();
    renderE(false);
  }

  LM.widget("quantile-explorer", mountExplorer);
  LM.widget("boxplot-builder", mountBox);
})(typeof window !== "undefined" ? window : globalThis);
