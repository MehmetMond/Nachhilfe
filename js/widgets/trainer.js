/*
 * Aufgaben-Trainer (Kapitel 13): unendlich viele Klausuraufgaben zu allen Lagemaßen.
 * 17 Aufgabentypen in zwei Gruppen, drei Niveaus, Rückmeldung pro Feld mit gezielten Tipps zu typischen Fehlern,
 * Rechenweg mit KaTeX und Punktestand in LM.store("trainer").
 * Die Aufgaben entstehen in makeTrainer(deps, rng) als reine Funktionen ohne DOM. So laufen sie auch in Node
 * (module.exports) für tests/trainer.test.js. Gerechnet wird nur mit LM.stats, Zahlen zeigt LM.fmt (Dezimalkomma).
 * In allen Texten stehen Formeln als $…$ (KaTeX) und R-Code als `…`.
 */
(function (root) {
  "use strict";
  var LM = (root.LM = root.LM || {});

  var TYPES = [
    { id: "medOdd", label: "Median (n ungerade)", group: "basis", tag: "med" },
    { id: "medEven", label: "Median (n gerade)", group: "basis", tag: "med" },
    { id: "mode", label: "Modus", group: "basis", tag: "mod" },
    { id: "mean", label: "Mittel (Urliste)", group: "basis", tag: "mean" },
    { id: "quart", label: "Quartile", group: "basis", tag: "q" },
    { id: "pq", label: "p-Quantil", group: "basis", tag: "q" },
    { id: "tabMean", label: "Mittel aus Tabelle", group: "basis", tag: "mean" },
    { id: "tabMed", label: "Median aus Tabelle", group: "basis", tag: "med" },
    { id: "missing", label: "Fehlender Wert", group: "basis", tag: "mean" },
    { id: "box", label: "Boxplot", group: "basis", tag: "q" },
    { id: "classMean", label: "Mittel aus Klassen", group: "basis", tag: "mean" },
    { id: "concept", label: "Konzept", group: "basis", tag: null },
    { id: "trim", label: "Getrimmtes Mittel", group: "mehr", tag: "mean" },
    { id: "geo", label: "Geometrisches Mittel", group: "mehr", tag: "mean" },
    { id: "harm", label: "Harmonisches Mittel", group: "mehr", tag: "mean" },
    { id: "skew", label: "Schiefe", group: "mehr", tag: null },
    { id: "lin", label: "Lineare Transformation", group: "mehr", tag: "mean" }
  ];
  var GROUPS = [{ id: "basis", label: "Grundlagen" }, { id: "mehr", label: "Weitere Mittel & Schiefe" }];
  var LEVELS = [{ id: "leicht", label: "Leicht" }, { id: "mittel", label: "Mittel" }, { id: "klausur", label: "Klausur" }];

  /* Urlisten: Wertebereich, Schiefe der Zufallswerte, Schrittweite bei „Klausur“ (sonst ganze Zahlen). */
  var CTX = [
    { id: "warte", lo: 3, hi: 40, skew: 1.6, kstep: 0, label: "Wartezeit in Minuten", out: [70, 110],
      say: function (n) { return "In einer Arztpraxis wurden die Wartezeiten von " + n + " Personen notiert (in Minuten)."; } },
    { id: "punkte", lo: 6, hi: 30, kstep: 0.5, label: "Punkte",
      say: function (n) { return n + " Studierende haben einen Übungstest geschrieben. Das sind ihre Punkte."; } },
    { id: "schlaf", lo: 4, hi: 10, kstep: 0.5, label: "Schlaf in Stunden",
      say: function (n) { return "Du fragst " + n + " Leute aus deinem Semester, wie viele Stunden sie letzte Nacht geschlafen haben."; } },
    { id: "rt", lo: 190, hi: 420, skew: 1.8, kstep: 0.1, label: "Reaktionszeit in ms", out: [650, 900],
      say: function (n) { return "In einem Experiment wurden " + n + " Reaktionszeiten gemessen (in Millisekunden)."; } },
    { id: "alter", lo: 18, hi: 34, skew: 1.5, kstep: 0, label: "Alter in Jahren", out: [52, 67],
      say: function (n) { return "Das ist das Alter von " + n + " Teilnehmenden einer Studie (in Jahren)."; } },
    { id: "handy", lo: 1, hi: 9, kstep: 0.5, label: "Bildschirmzeit in Stunden",
      say: function (n) { return n + " Personen haben notiert, wie viele Stunden pro Tag sie am Handy waren."; } },
    { id: "pendel", lo: 5, hi: 60, skew: 1.4, kstep: 0, label: "Pendelzeit in Minuten", out: [95, 140],
      say: function (n) { return "So viele Minuten brauchen " + n + " Studierende für den Weg zur Uni."; } },
    { id: "stress", lo: 10, hi: 50, kstep: 0, label: "Stresswert",
      say: function (n) { return n + " Personen haben einen Stressfragebogen ausgefüllt (Punktwerte von 10 bis 50)."; } },
    { id: "buecher", lo: 0, hi: 14, skew: 1.7, kstep: 0, label: "Bücher pro Jahr", out: [35, 60],
      say: function (n) { return n + " Personen sagen, wie viele Bücher sie im letzten Jahr gelesen haben."; } },
    { id: "geschw", lo: 0, hi: 5, skew: 1.6, kstep: 0, label: "Geschwister",
      say: function (n) { return n + " Erstsemester wurden nach der Zahl ihrer Geschwister gefragt."; } },
    { id: "noten", lo: 1, hi: 5, kstep: 0, label: "Note",
      say: function (n) { return "In einer Nachklausur gab es diese " + n + " Noten."; } }
  ];

  /* Kleine Wertebereiche für den Modus (viele Wiederholungen) */
  var MODE_CTX = [
    { lo: 0, hi: 4, label: "Geschwister", say: function (n) { return n + " Erstsemester wurden nach der Zahl ihrer Geschwister gefragt."; } },
    { lo: 0, hi: 5, label: "Tassen Kaffee pro Tag", say: function (n) { return n + " Personen sagen, wie viele Tassen Kaffee sie am Tag trinken."; } },
    { lo: 1, hi: 5, label: "Note", say: function (n) { return "In einer Nachklausur gab es diese " + n + " Noten."; } },
    { lo: 0, hi: 7, label: "Bücher pro Jahr", say: function (n) { return n + " Personen sagen, wie viele Bücher sie im letzten Jahr gelesen haben."; } },
    { lo: 19, hi: 25, label: "Alter in Jahren", say: function (n) { return "Das ist das Alter von " + n + " Personen in einem Seminar (in Jahren)."; } },
    { lo: 1, hi: 7, label: "Antwort (1 bis 7)", say: function (n) { return n + " Personen beantworten eine Frage auf einer Skala von 1 bis 7."; } },
    { lo: 4, hi: 10, label: "Punkte", say: function (n) { return n + " Personen haben ein Quiz mit 10 Fragen gemacht. Das sind ihre Punkte."; } }
  ];

  /* Häufigkeitstabellen */
  var TAB_CTX = [
    { values: [1, 2, 3, 4, 5], name: "Note", say: function (n) { return "In einer Klausur wurden " + n + " Noten vergeben."; } },
    { values: [0, 1, 2, 3, 4], name: "Geschwister", say: function (n) { return n + " Studierende wurden nach der Zahl ihrer Geschwister gefragt."; } },
    { values: [0, 1, 2, 3, 4, 5], name: "Tassen", say: function (n) { return n + " Personen sagen, wie viele Tassen Kaffee sie pro Tag trinken."; } },
    { values: [0, 1, 2, 3, 4, 5], name: "Fehler", say: function (n) { return "Bei einem Gedächtnistest wurden die Fehler von " + n + " Personen gezählt."; } },
    { values: [5, 6, 7, 8, 9, 10], name: "Punkte", say: function (n) { return n + " Personen haben ein Quiz mit 10 Fragen gemacht."; } },
    { values: [1, 2, 3, 4, 5, 6], name: "Sporttage", say: function (n) { return n + " Studierende sagen, an wie vielen Tagen pro Woche sie Sport machen."; } }
  ];

  /* Klassierte Daten */
  var CLASS_CTX = [
    { unit: "kg", what: "Gewicht", starts: [54, 57, 60], widths: [3, 4, 5], ms: [4, 5],
      say: function (n) { return "Das Körpergewicht von " + n + " Personen wurde in Klassen eingeteilt (in kg)."; } },
    { unit: "min", what: "Pendelzeit", starts: [0], widths: [10, 15], ms: [4, 5, 6],
      say: function (n) { return n + " Studierende haben ihre Pendelzeit zur Uni angegeben, eingeteilt in Klassen (in Minuten)."; } },
    { unit: "ms", what: "Reaktionszeit", starts: [150, 200], widths: [50], ms: [4, 5],
      say: function (n) { return "In einem Experiment wurden " + n + " Reaktionszeiten gemessen und in Klassen eingeteilt (in ms)."; } },
    { unit: "Jahre", what: "Alter", starts: [18], widths: [4, 5], ms: [4, 5],
      say: function (n) { return "Das Alter von " + n + " Teilnehmenden wurde in Klassen eingeteilt (in Jahren)."; } },
    { unit: "h", what: "Lernzeit pro Woche", starts: [0], widths: [4, 5], ms: [4, 5, 6],
      say: function (n) { return n + " Studierende geben an, wie viele Stunden sie pro Woche lernen (in Klassen)."; } }
  ];

  var SKEW_OPTS = [
    { value: "linksschief", label: "linksschief", sub: "= rechtssteil" },
    { value: "symmetrisch", label: "symmetrisch", sub: "" },
    { value: "rechtsschief", label: "rechtsschief", sub: "= linkssteil" }
  ];

  function makeTrainer(deps, rng) {
    var S = deps.stats, fmt = deps.fmt, check = deps.check;
    rng = rng || Math.random;
    var EPS = 1e-9;
    var TYPE = {};
    TYPES.forEach(function (t) { TYPE[t.id] = t; });

    /* ---------- kleine Helfer ---------- */

    function F(v, d) { return fmt(v, d === undefined ? 2 : d); }
    function I(v) { return fmt(v, 0); }
    // Zahl für TeX: Dezimalkomma als {,}
    function T(v, d) { return F(v, d).replace(",", "{,}").replace("−", "-"); }
    function TP(v, d) { var s = T(v, d); return s.charAt(0) === "-" ? "(" + s + ")" : s; }
    function ri(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
    function pick(a) { return a[Math.floor(rng() * a.length)]; }
    function chance(p) { return rng() < p; }
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function ascending(a) { for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false; return true; }
    function descending(a) { for (var i = 1; i < a.length; i++) if (a[i] > a[i - 1]) return false; return true; }
    // gemischt, aber weder auf- noch absteigend sortiert (sonst übt man das Sortieren nicht)
    function scramble(a) {
      var b = a.slice();
      for (var t = 0; t < 40; t++) { b = shuffle(a); if (!ascending(b) && !descending(b)) return b; }
      return b;
    }
    function exactIn(v, d) { var f = Math.pow(10, d); return isFinite(v) && Math.abs(v * f - Math.round(v * f)) < 1e-6; }
    function snap(v, step) { var r = Math.round(v / step) * step; return Math.round(r * 10) / 10; }
    function near(a, b) { return isFinite(a) && isFinite(b) && Math.abs(a - b) <= 0.005 + EPS; }
    function eq(v) { return exactIn(v, 2) ? "=" : "\\approx"; }
    function texSum(xs) { return xs.map(function (v, i) { return i ? TP(v, 4) : T(v, 4); }).join(" + "); }
    function listText(xs) { return xs.map(function (v) { return F(v, 4); }).join("; "); }
    function und(list) { return list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " und " + list[list.length - 1]; }
    function pct(p) { return F(p * 100, 1) + " %"; }
    function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }

    function drawOne(ctx, step) {
      var u = rng();
      if (ctx.skew) u = Math.pow(u, ctx.skew);   // mehr kleine als große Werte, wie bei echten Wartezeiten
      return snap(ctx.lo + u * (ctx.hi - ctx.lo), step);
    }
    function drawData(ctx, n, step) { var xs = []; for (var i = 0; i < n; i++) xs.push(drawOne(ctx, step)); return xs; }
    function stepFor(ctx, level) { return level === "klausur" && ctx.kstep && chance(0.5) ? ctx.kstep : 1; }
    function wide(c) { return c.hi - c.lo >= 8; }

    // eingipflige Anzahlen für m Spalten mit Summe total (jede Anzahl mindestens 1)
    function genCounts(m, total) {
      var peak = ri(0, m - 1), w = [], j;
      for (j = 0; j < m; j++) w.push(0.4 + 4 * Math.exp(-Math.pow(j - peak, 2) / 1.6) * (0.6 + 0.8 * rng()));
      var ws = S.sum(w), left = total - m;
      var raw = w.map(function (x) { return x / ws * left; });
      var base = raw.map(Math.floor), rest = left - S.sum(base);
      var order = raw.map(function (r, i) { return { i: i, f: r - Math.floor(r) + rng() * 0.01 }; }).sort(function (a, b) { return b.f - a.f; });
      for (j = 0; j < rest; j++) base[order[j % m].i]++;
      return base.map(function (b) { return b + 1; });
    }

    /* ---------- Felder ---------- */

    function numField(key, label, expected, o) {
      o = o || {};
      var dec = o.decimals === undefined ? 2 : o.decimals;
      var rounded = !exactIn(expected, dec);
      return {
        key: key, kind: "num", label: label, expected: expected, decimals: dec, tol: o.tol,
        round: rounded, tag: o.tag || null, traps: o.traps || [],
        generic: o.generic || "Noch nicht. Rechne nochmal nach oder schau in den Rechenweg.",
        show: (rounded ? "≈ " : "") + F(expected, dec)
      };
    }

    var H_SORT = "Hast du vorher sortiert? Gezählt wird in der sortierten Liste, nicht in der Liste, wie sie dasteht.";

    // Typische Fehler beim Median
    function medianTraps(xs, shown, mi) {
      var n = mi.n, s = mi.sorted, p = mi.positions, t = [];
      if (mi.odd) {
        t.push({ id: "unsorted", values: [shown[(n - 1) / 2]], hint: H_SORT });
        t.push({ id: "neighbor", values: [s[p[0] - 2], s[p[0]]], hint: "Knapp daneben. Zähl die Plätze nochmal: Bei $n = " + I(n) + "$ ist Platz $\\frac{n+1}{2} = " + I(p[0]) + "$ die Mitte." });
        t.push({ id: "position", values: [p[0]], hint: "Das ist die Platznummer. Gesucht ist der Wert, der auf diesem Platz steht." });
      } else {
        t.push({ id: "evenOne", values: [s[p[0] - 1], s[p[1] - 1]], hint: "Bei gerader Anzahl gibt es zwei mittlere Werte, $x_{(" + I(p[0]) + ")}$ und $x_{(" + I(p[1]) + ")}$. Der Median ist ihr Mittel." });
        t.push({ id: "unsorted", values: [(shown[n / 2 - 1] + shown[n / 2]) / 2, shown[n / 2 - 1], shown[n / 2]], hint: H_SORT });
        t.push({ id: "noHalf", values: [s[p[0] - 1] + s[p[1] - 1]], hint: "Du hast die beiden mittleren Werte addiert. Teile die Summe noch durch 2." });
        t.push({ id: "position", values: [p[0], p[1], (p[0] + p[1]) / 2], hint: "Das ist eine Platznummer. Gesucht ist der Wert, der dort steht." });
      }
      t.push({ id: "mean", values: [S.mean(xs)], hint: "Das ist das arithmetische Mittel. Für den Median sortierst du und nimmst die Mitte." });
      return t;
    }

    // Typische Fehler bei Quantilen (Folie 101)
    function quantTraps(xs, shown, qi, p, isQuartile) {
      var s = qi.sorted, k = qi.k, t = [];
      if (qi.integer) {
        t.push({ id: "forgotAvg", values: [s[k - 1], s[k]], hint: "$n \\cdot p$ ist hier eine ganze Zahl. Dann nimmst du das Mittel aus $x_{(k)}$ und $x_{(k+1)}$ (Folie 101)." });
      } else {
        var kd = Math.floor(qi.np);
        if (kd >= 1) {
          t.push({ id: "roundDown", values: [s[kd - 1]], hint: "Du hast abgerundet. Ist $n \\cdot p$ keine ganze Zahl, wird immer aufgerundet (Folie 101)." });
          t.push({ id: "avgNonInt", values: [(s[kd - 1] + s[kd]) / 2], hint: "Gemittelt wird nur, wenn $n \\cdot p$ eine ganze Zahl ist. Hier rundest du auf und nimmst einen einzigen Wert." });
        }
      }
      t.push({ id: "type7", values: [S.quantileType7(xs, p)], hint: "Das ist der Wert, den R ohne `type = 2` liefert (lineare Interpolation). In der Klausur gilt Folie 101: $n \\cdot p$ rechnen, dann aufrunden oder mitteln." });
      t.push({ id: "unsorted", values: qi.integer ? [shown[k - 1], (shown[k - 1] + shown[k]) / 2] : [shown[k - 1]], hint: H_SORT });
      if (isQuartile) {
        t.push({ id: "swap", values: [S.quantile(xs, 1 - p)], hint: p < 0.5 ? "Das ist $Q_3$, das 0,75-Quantil. Gesucht ist $Q_1$, das 0,25-Quantil." : "Das ist $Q_1$, das 0,25-Quantil. Gesucht ist $Q_3$, das 0,75-Quantil." });
      }
      t.push({ id: "median", values: [S.median(xs)], hint: "Das ist der Median, also das 0,5-Quantil. Rechne $n \\cdot p$ mit deinem $p$." });
      t.push({ id: "position", values: [k, qi.np], hint: "Das ist die Platznummer. Gesucht ist der Wert, der auf diesem Platz steht." });
      return t;
    }

    function meanTraps(xs, mi) {
      var n = mi.n;
      return [
        { id: "sum", values: [mi.sum], hint: "Das ist die Summe aller Werte. Teile sie noch durch $n = " + I(n) + "$." },
        { id: "wrongN", values: [mi.sum / (n - 1), mi.sum / (n + 1)], hint: "Zähl nochmal, wie viele Werte es sind: $n = " + I(n) + "$." },
        { id: "median", values: [S.median(xs)], hint: "Das ist der Median. Für das Mittel addierst du alle Werte und teilst durch $n$." }
      ];
    }

    /* ---------- Bausteine für den Rechenweg ---------- */

    function sortStep(s, marks) {
      return { text: "Sortiere die " + I(s.length) + " Werte der Größe nach:", cards: { values: s, marks: marks || [] } };
    }
    // Median-Zeilen aus medianInfo
    function medianSteps(mi, sym) {
      var n = mi.n, s = mi.sorted, p = mi.positions;
      sym = sym || "\\tilde{x}";
      if (mi.odd) {
        return [
          { text: "$n = " + I(n) + "$ ist ungerade. Es gibt genau einen mittleren Platz: $\\frac{n+1}{2} = \\frac{" + I(n + 1) + "}{2} = " + I(p[0]) + "$." },
          { text: "$" + sym + " = x_{(" + I(p[0]) + ")} = " + T(mi.value, 4) + "$" }
        ];
      }
      return [
        { text: "$n = " + I(n) + "$ ist gerade. Es gibt zwei mittlere Plätze: $\\frac{n}{2} = " + I(p[0]) + "$ und $\\frac{n}{2} + 1 = " + I(p[1]) + "$." },
        { text: "$" + sym + " = \\tfrac12\\,[x_{(" + I(p[0]) + ")} + x_{(" + I(p[1]) + ")}] = \\tfrac12\\,(" + T(s[p[0] - 1], 4) + " + " + TP(s[p[1] - 1], 4) + ") = " + T(mi.value, 4) + "$" }
      ];
    }
    function pTex(p) { return Math.abs(p - 1 / 3) < EPS ? "\\tfrac{1}{3}" : Math.abs(p - 2 / 3) < EPS ? "\\tfrac{2}{3}" : T(p, 2); }
    function pSub(p) { return Math.abs(p - 1 / 3) < EPS ? "1/3" : Math.abs(p - 2 / 3) < EPS ? "2/3" : T(p, 2); }
    function pWord(p) { return Math.abs(p - 1 / 3) < EPS ? "1/3" : Math.abs(p - 2 / 3) < EPS ? "2/3" : F(p, 2); }
    // Quantil-Zeilen aus quantileInfo
    function quantSteps(qi, sym) {
      var s = qi.sorted, k = qi.k, n = qi.n, out = [];
      var npText = qi.integer ? "= " + I(k) : (exactIn(qi.np, 2) ? "= " : "\\approx ") + T(qi.np, 2);
      out.push({ text: "$n \\cdot p = " + I(n) + " \\cdot " + pTex(qi.p) + " " + npText + "$" });
      if (qi.integer) {
        out.push({ text: "Das ist eine ganze Zahl. Also nimmst du das Mittel aus Platz " + I(k) + " und Platz " + I(k + 1) + ":" });
        out.push({ text: "$" + sym + " = \\tfrac12\\,[x_{(" + I(k) + ")} + x_{(" + I(k + 1) + ")}] = \\tfrac12\\,(" + T(s[k - 1], 4) + " + " + TP(s[k], 4) + ") = " + T(qi.value, 4) + "$" });
      } else {
        out.push({ text: "Das ist keine ganze Zahl. Also rundest du auf: $k = " + I(k) + "$." });
        out.push({ text: "$" + sym + " = x_{(" + I(k) + ")} = " + T(qi.value, 4) + "$" });
      }
      return out;
    }

    function finish(type, level, o) {
      o.type = type;
      o.level = level;
      o.title = TYPE[type].label;
      if (o.tag === undefined) o.tag = TYPE[type].tag;
      if (o.data) o.dataText = listText(o.data);
      o.round = o.fields.some(function (f) { return f.kind === "num" && f.round; });
      return o;
    }
    function quantLine(qi, sym) {
      var s = qi.sorted, k = qi.k;
      if (qi.integer) return "$n \\cdot p = " + I(qi.n) + " \\cdot " + pTex(qi.p) + " = " + I(k) + "$ ist ganzzahlig, also $" + sym + " = \\tfrac12\\,(" + T(s[k - 1], 4) + " + " + TP(s[k], 4) + ") = " + T(qi.value, 4) + "$";
      return "$n \\cdot p = " + I(qi.n) + " \\cdot " + pTex(qi.p) + " " + (exactIn(qi.np, 2) ? "= " : "\\approx ") + T(qi.np, 2) + "$, aufrunden auf $k = " + I(k) + "$, also $" + sym + " = x_{(" + I(k) + ")} = " + T(qi.value, 4) + "$";
    }
    function medLine(mi) {
      var s = mi.sorted, p = mi.positions;
      if (mi.odd) return "$n = " + I(mi.n) + "$ ist ungerade, Platz " + I(p[0]) + ": $\\tilde{x} = " + T(mi.value, 4) + "$";
      return "$n = " + I(mi.n) + "$ ist gerade, Plätze " + I(p[0]) + " und " + I(p[1]) + ": $\\tilde{x} = \\tfrac12\\,(" + T(s[p[0] - 1], 4) + " + " + TP(s[p[1] - 1], 4) + ") = " + T(mi.value, 4) + "$";
    }

    /* ================= Grundlagen ================= */

    function genMedian(level, even) {
      var ctx, n, step, xs, mi, shown, tries = 0;
      function okMedian() {
        var s = mi.sorted;
        if (even && s[n / 2 - 1] === s[n / 2]) return false;          // zwei verschiedene mittlere Werte
        var um = even ? (shown[n / 2 - 1] + shown[n / 2]) / 2 : shown[(n - 1) / 2];
        return !near(um, mi.value);                                    // „unsortiert“ muss ein Fehler sein
      }
      do {
        ctx = pick(CTX);
        n = even ? pick(level === "leicht" ? [6, 8] : level === "mittel" ? [8, 10] : [10, 12])
                 : pick(level === "leicht" ? [5, 7] : level === "mittel" ? [7, 9] : [9, 11]);
        step = stepFor(ctx, level);
        xs = drawData(ctx, n, step);
        mi = S.medianInfo(xs);
        shown = scramble(xs);
        tries++;
      } while (tries < 80 && !okMedian());
      return finish(even ? "medEven" : "medOdd", level, {
        text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
        ask: "Bestimme den Median $\\tilde{x}$.",
        fields: [numField("med", "Median $\\tilde{x}$", mi.value, {
          tag: "med", traps: medianTraps(xs, shown, mi),
          generic: even ? "Noch nicht. Sortiere zuerst. Dann nimmst du das Mittel der beiden mittleren Werte."
                        : "Noch nicht. Sortiere zuerst. Dann nimmst du den Wert auf dem mittleren Platz."
        })],
        steps: [sortStep(mi.sorted, [{ pos: mi.positions, cls: "is-med" }])].concat(medianSteps(mi)),
        why: mi.odd ? "Links und rechts vom Median liegen je " + I((n - 1) / 2) + " Werte. Darum ist er die Mitte."
                    : "Links und rechts von den beiden mittleren Plätzen liegen je " + I(n / 2 - 1) + " Werte. Der Median liegt genau dazwischen."
      });
    }

    function drawPeaked(lo, hi, peak) {
      var w = [], v;
      for (v = lo; v <= hi; v++) w.push(1 + 5 * Math.exp(-Math.pow(v - peak, 2) / 1.2));
      var r = rng() * S.sum(w);
      for (v = lo; v <= hi; v++) { r -= w[v - lo]; if (r <= 0) return v; }
      return hi;
    }

    function genMode(level) {
      var tie = chance(level === "leicht" ? 0.2 : 0.3), ctx, n, xs, info, tries = 0;
      function okMode() {
        if (info.maxCount < 2) return false;
        if (tie) return !info.unique && info.values.length === 2;
        return info.unique && info.maxCount !== info.value;   // Anzahl ≠ Wert, damit der Fehler auffällt
      }
      do {
        ctx = pick(MODE_CTX);
        n = level === "leicht" ? ri(7, 9) : level === "mittel" ? ri(9, 11) : ri(10, 12);
        var p1 = ri(ctx.lo, ctx.hi), p2 = tie ? ri(ctx.lo, ctx.hi) : p1;
        xs = [];
        for (var i = 0; i < n; i++) xs.push(drawPeaked(ctx.lo, ctx.hi, i % 2 ? p2 : p1));
        info = S.modeInfo(xs);
        tries++;
      } while (tries < 400 && !okMode());
      var shown = scramble(xs), tab = info.table, mv = info.value, traps = [];
      if (info.unique) {
        traps.push({ id: "count", values: [info.maxCount], hint: "Das ist die Anzahl: Der häufigste Wert kommt " + I(info.maxCount) + "-mal vor. Gefragt ist der Wert selbst." });
        tab.forEach(function (r) {
          if (r.value !== mv) traps.push({ id: "lessFrequent", values: [r.value], hint: "Der Wert " + F(r.value, 4) + " kommt nur " + I(r.h) + "-mal vor. Gibt es einen Wert, der öfter vorkommt?" });
        });
      } else {
        info.values.forEach(function (v) {
          var others = info.values.filter(function (u) { return u !== v; }).map(function (u) { return F(u, 4); });
          traps.push({ id: "tieValue", values: [v], hint: "Der Wert " + F(v, 4) + " kommt " + I(info.maxCount) + "-mal vor, aber " + und(others) + " auch. Bei Gleichstand gibt es keinen eindeutigen Modus." });
        });
        traps.push({ id: "count", values: [info.maxCount], hint: "Das ist eine Anzahl, kein Wert. Und schau genau: Zwei Werte kommen gleich oft vor." });
      }
      traps.push({ id: "median", values: [S.median(xs)], hint: "Das ist der Median. Der Modus ist einfach der Wert, der am häufigsten vorkommt." });
      traps.push({ id: "mean", values: [S.mean(xs)], hint: "Das ist das Mittel. Der Modus ist einfach der Wert, der am häufigsten vorkommt." });
      var hl = [];
      tab.forEach(function (r, i) { if (r.h === info.maxCount) hl.push(i + 1); });
      var steps = [{ text: "Zähle, wie oft jeder Wert vorkommt:", table: { rowHead: true, hlCols: hl, hlCls: "mod",
        rows: [["Wert"].concat(tab.map(function (r) { return F(r.value, 4); })), ["Anzahl"].concat(tab.map(function (r) { return I(r.h); }))] } }];
      if (info.unique) steps.push({ text: "Am häufigsten ist der Wert " + F(mv, 4) + " (" + I(info.maxCount) + "-mal). Also ist $x_{\\text{mod}} = " + T(mv, 4) + "$." });
      else steps.push({ text: "Die Werte " + und(info.values.map(function (v) { return F(v, 4); })) + " kommen beide " + I(info.maxCount) + "-mal vor. Keiner ist allein am häufigsten. Darum gibt es keinen (eindeutigen) Modus (Folie 92)." });
      return finish("mode", level, {
        text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
        ask: "Bestimme den Modus $x_{\\text{mod}}$. Gibt es keinen eindeutigen, wähle „kein Modus“.",
        fields: [{
          key: "mode", kind: "mode", label: "Modus $x_{\\text{mod}}$", expected: mv, tag: "mod", traps: traps, decimals: 2, round: false,
          noneHint: "Doch, es gibt einen: Ein Wert kommt öfter vor als alle anderen. Zähle nochmal, wie oft jeder Wert vorkommt.",
          generic: info.unique ? "Noch nicht. Zähle, wie oft jeder Wert vorkommt, und nimm den häufigsten." : "Zähle, wie oft jeder Wert vorkommt. Gibt es einen klaren Sieger?",
          show: info.unique ? F(mv, 4) : "kein Modus"
        }],
        steps: steps,
        why: "Der Modus ist immer ein Wert aus den Daten, nie eine Anzahl. Bei Gleichstand gibt es keinen."
      });
    }

    function genMean(level) {
      var ctx, n, step, xs, mi, tries = 0;
      function okMean() {
        var clean = level === "leicht" ? exactIn(mi.value, 0) : level === "mittel" ? exactIn(mi.value, 2) : true;
        return clean && !near(mi.value, S.median(xs));
      }
      do {
        ctx = pick(CTX);
        n = level === "leicht" ? ri(5, 6) : level === "mittel" ? ri(6, 9) : ri(8, 12);
        step = stepFor(ctx, level);
        xs = drawData(ctx, n, step);
        mi = S.meanInfo(xs);
        tries++;
      } while (tries < 300 && !okMean());
      var shown = scramble(xs);
      return finish("mean", level, {
        text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
        ask: "Berechne das arithmetische Mittel $\\bar{x}$.",
        fields: [numField("mean", "Mittel $\\bar{x}$", mi.value, { tag: "mean", traps: meanTraps(xs, mi), generic: "Noch nicht. Addiere alle Werte und teile durch $n = " + I(n) + "$." })],
        steps: [
          { text: "Addiere alle " + I(n) + " Werte: $\\sum x_i = " + texSum(shown) + " = " + T(mi.sum, 4) + "$" },
          { text: "Teile durch $n = " + I(n) + "$: $\\bar{x} = \\frac{" + T(mi.sum, 4) + "}{" + I(n) + "} " + eq(mi.value) + " " + T(mi.value, 2) + "$" }
        ],
        why: "Das Mittel ist der Schwerpunkt der Daten: Die Abweichungen nach oben und nach unten gleichen sich genau aus."
      });
    }

    var PS = [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1 / 3, 2 / 3];
    function genQuantile(level, isQuartile) {
      var wantInt = level === "leicht" ? false : level === "mittel" ? chance(0.4) : chance(0.55);
      var p, ctx, n, step, xs, qi, shown, tries = 0;
      function okQ() {
        if (qi.integer !== wantInt && tries < 300) return false;
        var s = qi.sorted, k = qi.k;
        if (qi.integer ? s[k - 1] === s[k] : (k >= 2 && s[k - 2] === s[k - 1])) return false;   // Fehler sollen auffallen
        if (near(S.quantileType7(xs, p), qi.value) && chance(0.7)) return false;
        return !near(shown[k - 1], qi.value);
      }
      do {
        p = isQuartile ? pick([0.25, 0.75]) : pick(PS);
        ctx = pick(CTX);
        n = level === "leicht" ? ri(5, 8) : level === "mittel" ? ri(6, 10) : ri(8, 12);
        step = stepFor(ctx, level);
        xs = drawData(ctx, n, step);
        qi = S.quantileInfo(xs, p);
        shown = scramble(xs);
        tries++;
      } while (tries < 400 && !okQ());
      var low = p < 0.5;
      var sym = isQuartile ? (low ? "Q_1" : "Q_3") : "\\tilde{x}_{" + pSub(p) + "}";
      var label = isQuartile ? (low ? "erstes Quartil $Q_1$" : "drittes Quartil $Q_3$") : "Quantil $\\tilde{x}_{" + pSub(p) + "}$";
      var ask = isQuartile ? (low ? "Bestimme das erste Quartil $Q_1$, also das 0,25-Quantil." : "Bestimme das dritte Quartil $Q_3$, also das 0,75-Quantil.")
                           : "Bestimme das " + pWord(p) + "-Quantil $\\tilde{x}_{" + pSub(p) + "}$ nach der Regel von Folie 101.";
      var s = qi.sorted, below = s.filter(function (v) { return v <= qi.value + EPS; }).length;
      return finish(isQuartile ? "quart" : "pq", level, {
        text: ctx.say(I(n)), data: shown, dataLabel: ctx.label, ask: ask, given: { p: p },
        fields: [numField("q", label, qi.value, { tag: "q", traps: quantTraps(xs, shown, qi, p, isQuartile),
          generic: "Noch nicht. Sortiere, rechne $n \\cdot p$ und folge der Regel von Folie 101." })],
        steps: [sortStep(s, [{ pos: qi.positions, cls: "is-q" }])].concat(quantSteps(qi, sym)),
        why: "Kontrolle: " + I(below) + " von " + I(n) + " Werten liegen auf oder unter " + F(qi.value, 4) + ". Das sind mindestens " + pct(p) + ", so wie es beim " + pWord(p) + "-Quantil sein muss."
      });
    }

    function freqTable(ctx, counts, extra) {
      var rows = [["$a_j$"].concat(ctx.values.map(function (v) { return I(v); })),
        ["$h_j$"].concat(counts.map(function (h) { return I(h); }))];
      return { rowHead: true, label: ctx.name + " $a_j$ mit Anzahl $h_j$", rows: rows.concat(extra || []) };
    }

    function genTabMean(level) {
      var ctx, total, counts, t, tries = 0;
      do {
        ctx = pick(TAB_CTX);
        total = level === "leicht" ? pick([10, 20]) : level === "mittel" ? pick([16, 20, 24, 25]) : ri(18, 30);
        counts = genCounts(ctx.values.length, total);
        t = S.meanTable(ctx.values, counts);
        tries++;
      } while (tries < 80 && level !== "klausur" && !exactIn(t.value, 2));
      var m = ctx.values.length, xs = S.expand(ctx.values, counts), md = S.mode(xs);
      var traps = [
        { id: "distinct", values: [t.sum / m], hint: "Du hast durch die Zahl der Spalten geteilt (" + I(m) + "). Teile durch $n$, die Zahl aller Personen: $n = \\sum h_j$." },
        { id: "unweighted", values: [S.mean(ctx.values)], hint: "Du hast nur die Werte $a_j$ gemittelt. Jeder Wert zählt aber so oft, wie er vorkommt: $\\bar{x} = \\frac{1}{n} \\sum h_j \\cdot a_j$." },
        { id: "meanCounts", values: [S.mean(counts)], hint: "Das ist die mittlere Anzahl pro Spalte. Gesucht ist der mittlere Wert." },
        { id: "sum", values: [t.sum], hint: "Das ist die Summe $\\sum h_j \\cdot a_j$. Teile sie noch durch $n$." },
        { id: "median", values: [S.median(xs)], hint: "Das ist der Median. Für das Mittel rechnest du $\\frac{1}{n} \\sum h_j \\cdot a_j$." }
      ];
      if (md !== null) traps.push({ id: "mode", values: [md], hint: "Das ist der Modus, der häufigste Wert. Für das Mittel rechnest du $\\frac{1}{n} \\sum h_j \\cdot a_j$." });
      return finish("tabMean", level, {
        text: ctx.say(I(total)), table: freqTable(ctx, counts), tableRaw: { values: ctx.values, counts: counts },
        ask: "Berechne das arithmetische Mittel $\\bar{x}$.",
        fields: [numField("mean", "Mittel $\\bar{x}$", t.value, { tag: "mean", traps: traps, generic: "Noch nicht. Multipliziere jeden Wert mit seiner Anzahl, addiere alles und teile durch $n$." })],
        steps: [
          { text: "Zuerst $n$: $n = \\sum h_j = " + counts.map(function (h) { return I(h); }).join(" + ") + " = " + I(t.n) + "$" },
          { text: "Jeder Wert mal seine Anzahl, dann addieren: $\\sum h_j \\cdot a_j = " + counts.map(function (h, j) { return I(h) + " \\cdot " + I(ctx.values[j]); }).join(" + ") + " = " + T(t.sum, 4) + "$" },
          { text: "$\\bar{x} = \\frac{1}{n} \\sum h_j \\cdot a_j = \\frac{" + T(t.sum, 4) + "}{" + I(t.n) + "} " + eq(t.value) + " " + T(t.value, 2) + "$" }
        ],
        why: "Teile durch $n = " + I(t.n) + "$ (alle Personen), nicht durch die " + I(m) + " Spalten der Tabelle. Jeder Wert zählt so oft, wie er vorkommt."
      });
    }

    function genTabMed(level) {
      var wantSplit = level !== "leicht" && chance(0.45);
      var ctx, total, counts, xs, mi, tries = 0;
      function okTM() {
        var split = !mi.odd && mi.sorted[mi.positions[0] - 1] !== mi.sorted[mi.positions[1] - 1];
        if (split !== wantSplit && tries < 250) return false;
        return !near(S.median(ctx.values), mi.value) || chance(0.2);
      }
      do {
        ctx = pick(TAB_CTX);
        total = level === "leicht" ? ri(9, 15) : level === "mittel" ? ri(12, 22) : ri(18, 30);
        counts = genCounts(ctx.values.length, total);
        xs = S.expand(ctx.values, counts);
        mi = S.medianInfo(xs);
        tries++;
      } while (tries < 300 && !okTM());
      var fr = S.freq(xs), n = mi.n, p = mi.positions, s = mi.sorted, md = S.mode(xs), hit = [];
      fr.forEach(function (r, j) { if (p.some(function (q) { return q >= r.from && q <= r.to; })) hit.push(j + 1); });
      var traps = [
        { id: "middleValue", values: [S.median(ctx.values)], hint: "Das ist der Wert in der Mitte der Tabelle. Der Median hängt aber von den Anzahlen ab: Zähle die Plätze mit den kumulierten Häufigkeiten $H_j$." },
        { id: "countValue", values: [S.median(counts), Math.max.apply(null, counts)], hint: "Das ist eine Anzahl aus der Tabelle, kein Wert. Gesucht ist einer der Werte $a_j$ (oder das Mittel aus zweien)." },
        { id: "position", values: mi.odd ? [p[0]] : [p[0], p[1], (p[0] + p[1]) / 2], hint: "Das ist die Platznummer. Schau, welcher Wert auf diesem Platz steht." }
      ];
      if (!mi.odd) traps.splice(1, 0, { id: "evenOne", values: [s[p[0] - 1], s[p[1] - 1]], hint: "Bei $n = " + I(n) + "$ (gerade) brauchst du das Mittel aus $x_{(" + I(p[0]) + ")}$ und $x_{(" + I(p[1]) + ")}$." });
      if (md !== null) traps.push({ id: "mode", values: [md], hint: "Das ist der Modus, der häufigste Wert. Für den Median suchst du den mittleren Platz." });
      traps.push({ id: "mean", values: [S.mean(xs)], hint: "Das ist das Mittel. Für den Median suchst du den mittleren Platz." });
      // senkrecht, damit die Tabelle auch auf dem Handy ganz sichtbar ist
      var tbl = { head: ["Wert $a_j$", "$h_j$", "$H_j$", "Plätze"], numCols: [0, 1, 2, 3], hlCls: "med",
        hlRows: hit.map(function (c) { return c - 1; }),
        rows: fr.map(function (r) { return [I(r.value), I(r.h), I(r.H), r.from === r.to ? I(r.from) : I(r.from) + "–" + I(r.to)]; }) };
      var steps = [{ text: "Die kumulierten Häufigkeiten $H_j$ zeigen, bis zu welchem Platz jeder Wert reicht:", table: tbl }];
      if (mi.odd) {
        steps.push({ text: "$n = " + I(n) + "$ ist ungerade. Mittlerer Platz: $\\frac{n+1}{2} = " + I(p[0]) + "$." });
        steps.push({ text: "Platz " + I(p[0]) + " gehört zum Wert " + F(mi.value, 4) + ". Also $\\tilde{x} = " + T(mi.value, 4) + "$." });
      } else {
        steps.push({ text: "$n = " + I(n) + "$ ist gerade. Mittlere Plätze: $\\frac{n}{2} = " + I(p[0]) + "$ und $\\frac{n}{2} + 1 = " + I(p[1]) + "$." });
        if (s[p[0] - 1] === s[p[1] - 1]) steps.push({ text: "Beide Plätze gehören zum Wert " + F(mi.value, 4) + ". Also $\\tilde{x} = " + T(mi.value, 4) + "$." });
        else steps.push({ text: "Platz " + I(p[0]) + " hat den Wert " + F(s[p[0] - 1], 4) + ", Platz " + I(p[1]) + " den Wert " + F(s[p[1] - 1], 4) + ". Also $\\tilde{x} = \\tfrac12\\,(" + T(s[p[0] - 1], 4) + " + " + TP(s[p[1] - 1], 4) + ") = " + T(mi.value, 4) + "$." });
      }
      return finish("tabMed", level, {
        text: ctx.say(I(n)), table: freqTable(ctx, counts), tableRaw: { values: ctx.values, counts: counts },
        ask: "Bestimme den Median $\\tilde{x}$.",
        fields: [numField("med", "Median $\\tilde{x}$", mi.value, { tag: "med", traps: traps, generic: "Noch nicht. Bilde die kumulierten Häufigkeiten $H_j$ und such den mittleren Platz." })],
        steps: steps,
        why: "Der Median hängt von den Anzahlen ab, nicht davon, welcher Wert in der Tabelle in der Mitte steht."
      });
    }

    function genMissing(level) {
      var ctx, n, step, known, miss, cands, tries = 0;
      do {
        ctx = pick(CTX.filter(wide));
        n = level === "leicht" ? ri(4, 5) : level === "mittel" ? ri(5, 7) : ri(6, 9);
        step = stepFor(ctx, level);
        known = drawData(ctx, n - 1, step);
        cands = [];
        var cnt = Math.round((ctx.hi - ctx.lo) / step);
        for (var i = 0; i <= cnt; i++) {
          var v = snap(ctx.lo + i * step, step), mm = S.mean(known.concat([v]));
          if (level === "leicht" ? exactIn(mm, 0) : level === "mittel" ? exactIn(mm, 1) : exactIn(mm, 2)) cands.push(v);
        }
        miss = cands.length ? pick(cands) : NaN;
        tries++;
      } while (tries < 300 && (!cands.length || near(miss, S.mean(known))));
      var mi = S.meanInfo(known.concat([miss])), xbar = mi.value, sumK = S.sum(known), shown = scramble(known), total = n * xbar;
      var traps = [
        { id: "knownMean", values: [S.mean(known)], hint: "Das ist das Mittel der bekannten Werte. Rechne rückwärts: Alle $n$ Werte zusammen ergeben $n \\cdot \\bar{x}$." },
        { id: "total", values: [total], hint: "Das ist die Summe aller " + I(n) + " Werte. Ziehe noch die bekannten Werte ab." },
        { id: "wrongN", values: [(n - 1) * xbar - sumK, (n + 1) * xbar - sumK], hint: "Fast: Die Summe aller Werte ist $n \\cdot \\bar{x}$ mit $n = " + I(n) + "$. Der fehlende Wert zählt mit." },
        { id: "xbar", values: [xbar], hint: "Der fehlende Wert ist nicht automatisch das Mittel. Rechne $n \\cdot \\bar{x}$ minus die Summe der bekannten Werte." },
        { id: "sumKnown", values: [sumK], hint: "Das ist die Summe der bekannten Werte. Gesucht ist, was zur Summe $n \\cdot \\bar{x}$ noch fehlt." },
        { id: "sign", values: [sumK - total], hint: "Das Vorzeichen stimmt nicht. Rechne $n \\cdot \\bar{x}$ minus die bekannten Werte." }
      ];
      return finish("missing", level, {
        text: ctx.say(I(n)) + " Ein Wert ist verloren gegangen. Die anderen " + I(n - 1) + " Werte stehen unten. Das Mittel aller " + I(n) + " Werte war $\\bar{x} = " + T(xbar, 2) + "$.",
        data: shown, dataLabel: ctx.label + " (ohne den fehlenden Wert)", given: { xbar: xbar, n: n },
        ask: "Wie groß ist der fehlende Wert?",
        fields: [numField("x", "fehlender Wert", miss, { tag: "mean", traps: traps, generic: "Noch nicht. Rechne $n \\cdot \\bar{x}$ und ziehe die bekannten Werte ab." })],
        steps: [
          { text: "Alle " + I(n) + " Werte zusammen ergeben $n \\cdot \\bar{x} = " + I(n) + " \\cdot " + T(xbar, 2) + " = " + T(total, 4) + "$." },
          { text: "Die " + I(n - 1) + " bekannten Werte ergeben $" + texSum(shown) + " = " + T(sumK, 4) + "$." },
          { text: "Der fehlende Wert ist der Rest: $" + T(total, 4) + " - " + TP(sumK, 4) + " = " + T(miss, 4) + "$." }
        ],
        why: "Probe: $\\frac{" + T(sumK, 4) + " + " + TP(miss, 4) + "}{" + I(n) + "} = \\frac{" + T(mi.sum, 4) + "}{" + I(n) + "} = " + T(xbar, 2) + "$. Passt."
      });
    }

    function genBox(level) {
      var ctx, n, step, xs, b, tries = 0;
      do {
        ctx = pick(CTX.filter(wide));
        n = level === "leicht" ? pick([7, 9, 10, 11]) : level === "mittel" ? ri(8, 12) : ri(9, 12);
        step = stepFor(ctx, level);
        xs = drawData(ctx, n, step);
        b = S.boxplot(xs, 0);
        tries++;
      } while (tries < 300 && !(b.lo < b.q1 && b.q1 < b.med && b.med < b.q3 && b.q3 < b.hi));
      var shown = scramble(xs), mi = S.medianInfo(xs), q1 = S.quantileInfo(xs, 0.25), q3 = S.quantileInfo(xs, 0.75), s = mi.sorted;
      var fields = [
        numField("lo", "Minimum", b.lo, { traps: [
          { id: "unsortedFirst", values: [shown[0]], hint: "Das ist der erste Wert der Liste. Das Minimum ist der kleinste Wert." },
          { id: "swapMinMax", values: [b.hi], hint: "Das ist das Maximum. Das Minimum ist der kleinste Wert." }], generic: "Das Minimum ist der kleinste Wert, also $x_{(1)}$." }),
        numField("q1", "$Q_1$", b.q1, { tag: "q", traps: quantTraps(xs, shown, q1, 0.25, true), generic: "Noch nicht. $Q_1$ ist das 0,25-Quantil: $n \\cdot 0{,}25$ rechnen, dann aufrunden oder mitteln." }),
        numField("med", "Median $\\tilde{x}$", b.med, { tag: "med", traps: medianTraps(xs, shown, mi), generic: "Noch nicht. Der Median ist der mittlere Wert der sortierten Liste." }),
        numField("q3", "$Q_3$", b.q3, { tag: "q", traps: quantTraps(xs, shown, q3, 0.75, true), generic: "Noch nicht. $Q_3$ ist das 0,75-Quantil: $n \\cdot 0{,}75$ rechnen, dann aufrunden oder mitteln." }),
        numField("hi", "Maximum", b.hi, { traps: [
          { id: "unsortedLast", values: [shown[n - 1]], hint: "Das ist der letzte Wert der Liste. Das Maximum ist der größte Wert." },
          { id: "swapMinMax", values: [b.lo], hint: "Das ist das Minimum. Das Maximum ist der größte Wert." }], generic: "Das Maximum ist der größte Wert, also $x_{(n)}$." })
      ];
      return finish("box", level, {
        text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
        ask: "Bestimme die fünf Zahlen für den Boxplot (Folie 105): Minimum, $Q_1$, Median, $Q_3$ und Maximum.",
        fields: fields,
        steps: [
          sortStep(s, [{ pos: q1.positions.concat(q3.positions), cls: "is-q" }, { pos: mi.positions, cls: "is-med" }]),
          { text: "Minimum $x_{(1)} = " + T(b.lo, 4) + "$ und Maximum $x_{(" + I(n) + ")} = " + T(b.hi, 4) + "$." },
          { text: "$Q_1$: " + quantLine(q1, "Q_1") + "." },
          { text: "Median: " + medLine(mi) + "." },
          { text: "$Q_3$: " + quantLine(q3, "Q_3") + "." },
          { text: "So sieht der Boxplot aus:", chart: { lo: b.lo, q1: b.q1, med: b.med, q3: b.q3, hi: b.hi } }
        ],
        why: "In der Box liegt die mittlere Hälfte der Werte. Die Whisker reichen bis zum kleinsten und zum größten Wert."
      });
    }

    function genClassMean(level) {
      var ctx, m, w, u0, bounds, counts, total, g, tries = 0;
      do {
        ctx = pick(CLASS_CTX);
        m = pick(ctx.ms); w = pick(ctx.widths); u0 = pick(ctx.starts);
        bounds = range(0, m).map(function (j) { return u0 + j * w; });
        total = level === "leicht" ? pick([10, 20]) : level === "mittel" ? pick([20, 25, 30]) : ri(20, 30);
        counts = genCounts(m, total);
        g = S.groupedMean(bounds, counts);
        tries++;
      } while (tries < 80 && level === "leicht" && !exactIn(g.value, 2));
      var lower = S.meanTable(bounds.slice(0, m), counts).value, upper = S.meanTable(bounds.slice(1), counts).value;
      function cls(j) { return "(" + I(bounds[j]) + "; " + I(bounds[j + 1]) + "]"; }
      var traps = [
        { id: "lower", values: [lower], hint: "Du hast mit den unteren Klassengrenzen gerechnet. Nimm die Klassenmitten $x'_j = \\frac{u_{j-1} + u_j}{2}$." },
        { id: "upper", values: [upper], hint: "Du hast mit den oberen Klassengrenzen gerechnet. Nimm die Klassenmitten $x'_j = \\frac{u_{j-1} + u_j}{2}$." },
        { id: "unweighted", values: [S.mean(g.mids)], hint: "Du hast nur die Klassenmitten gemittelt. Jede Mitte zählt so oft, wie Werte in der Klasse liegen." },
        { id: "distinct", values: [g.sum / m], hint: "Du hast durch die Zahl der Klassen geteilt. Teile durch $n = \\sum h_j$." },
        { id: "sum", values: [g.sum], hint: "Das ist die Summe $\\sum h_j \\cdot x'_j$. Teile sie noch durch $n$." },
        { id: "meanCounts", values: [S.mean(counts)], hint: "Das ist die mittlere Anzahl pro Klasse. Gesucht ist der mittlere Wert." }
      ];
      return finish("classMean", level, {
        text: ctx.say(I(total)) + " Die einzelnen Werte kennst du nicht.",
        table: { head: ["Klasse (" + ctx.unit + ")", "Anzahl $h_j$"], rows: counts.map(function (h, j) { return [cls(j), I(h)]; }), numCols: [1] },
        tableRaw: { bounds: bounds, counts: counts },
        ask: "Berechne näherungsweise das arithmetische Mittel $\\bar{x}$.",
        fields: [numField("mean", "Mittel $\\bar{x}$", g.value, { tag: "mean", traps: traps, generic: "Noch nicht. Rechne mit den Klassenmitten: $\\bar{x} \\approx \\frac{1}{n} \\sum h_j \\cdot x'_j$." })],
        steps: [
          { text: "Jede Klasse bekommt ihre Mitte $x'_j = \\frac{u_{j-1} + u_j}{2}$, zum Beispiel $x'_1 = \\frac{" + I(bounds[0]) + " + " + I(bounds[1]) + "}{2} = " + T(g.mids[0], 2) + "$." },
          { text: "Mitte mal Anzahl, dann addieren:", table: { head: ["Klasse", "$h_j$", "$x'_j$", "$h_j \\cdot x'_j$"], numCols: [1, 2, 3],
            rows: counts.map(function (h, j) { return [cls(j), I(h), F(g.mids[j], 2), F(g.products[j], 2)]; }), foot: ["Summe", I(g.n), "", F(g.sum, 2)] } },
          { text: "$\\bar{x} \\approx \\frac{1}{n} \\sum h_j \\cdot x'_j = \\frac{" + T(g.sum, 2) + "}{" + I(g.n) + "} " + eq(g.value) + " " + T(g.value, 2) + "$" }
        ],
        why: "Die echten Werte kennst du nicht. Jede Klassenmitte steht für alle Werte ihrer Klasse. Darum ist das Ergebnis nur ungefähr."
      });
    }

    function genConcept(level) {
      var kind = pick(["null", "double", "abs", "sq"]), ctx, n, xs, mi, tries = 0, shown;
      if (kind === "null") {
        do { ctx = pick(CTX.filter(wide)); n = level === "leicht" ? ri(4, 5) : ri(5, 7); xs = drawData(ctx, n, 1); mi = S.meanInfo(xs); tries++; }
        while (tries < 300 && !exactIn(mi.value, level === "klausur" ? 1 : 0));
        shown = scramble(xs);
        var dev = Math.abs(mi.deviationSum) < 1e-7 ? 0 : mi.deviationSum;
        return finish("concept", level, {
          variant: "null", text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
          ask: "Berechne $\\sum (x_i - \\bar{x})$, die Summe der Abweichungen vom Mittel.",
          fields: [numField("dev", "$\\sum (x_i - \\bar{x})$", dev, { traps: [
            { id: "sum", values: [mi.sum], hint: "Das ist $\\sum x_i$. Gefragt sind die Abweichungen vom Mittel: erst $x_i - \\bar{x}$, dann addieren." },
            { id: "mean", values: [mi.value], hint: "Das ist $\\bar{x}$ selbst. Gefragt ist die Summe der Abweichungen $x_i - \\bar{x}$." },
            { id: "abs", values: [S.sumAbs(xs, mi.value)], hint: "Das ist die Summe der Beträge. Mit Vorzeichen heben sich die Abweichungen nach oben und unten auf." }
          ], generic: "Tipp: Die Abweichungen nach oben und nach unten gleichen sich immer genau aus (Folie 114)." })],
          steps: [
            { text: "Mittel: $\\bar{x} = \\frac{" + T(mi.sum, 4) + "}{" + I(n) + "} = " + T(mi.value, 2) + "$" },
            { text: "Abweichungen addieren: $" + shown.map(function (x) { return "(" + T(x, 4) + " - " + TP(mi.value, 2) + ")"; }).join(" + ") + " = " + shown.map(function (x, i) { return i ? TP(x - mi.value, 2) : T(x - mi.value, 2); }).join(" + ") + " = 0$" }
          ],
          why: "Das gilt für jede Datenreihe (Nulleigenschaft, Folie 114): Das Mittel ist der Schwerpunkt, die Abweichungen heben sich auf. Du musst also gar nicht rechnen."
        });
      }
      if (kind === "double") {
        var srt, ys, mx;
        do {
          ctx = pick(CTX.filter(wide));
          n = level === "leicht" ? 5 : level === "mittel" ? pick([5, 7]) : pick([6, 7, 8]);
          xs = drawData(ctx, n, 1);
          srt = S.sorted(xs);
          mx = srt[n - 1];
          ys = xs.map(function (x) { return x === mx ? 2 * x : x; });
          tries++;
        } while (tries < 300 && !(mx > srt[n - 2] && mx > 0 && (level === "klausur" || exactIn(S.mean(ys), 2))));
        shown = scramble(xs);
        var med0 = S.median(xs), m0 = S.meanInfo(xs), med1 = S.median(ys), m1 = S.meanInfo(ys);
        return finish("concept", level, {
          variant: "double", text: ctx.say(I(n)) + " Beim Abtippen wurde der größte Wert aus Versehen verdoppelt: Aus " + F(mx, 4) + " wurde " + F(2 * mx, 4) + ".",
          data: shown, dataLabel: ctx.label + " (richtig)",
          ask: "Wie groß sind Median und Mittel der falschen Liste?",
          fields: [
            numField("med", "neuer Median", med1, { tag: "med", traps: [
              { id: "doubledMed", values: [2 * med0], hint: "Nur der größte Wert wird verdoppelt, nicht alle. Was passiert dabei mit der Mitte der sortierten Liste?" },
              { id: "meanNew", values: [m1.value], hint: "Das ist das neue Mittel. Gefragt ist hier der Median." },
              { id: "shifted", values: [med0 + mx / n, med0 + mx], hint: "Der Median verschiebt sich nicht. Der größte Wert bleibt der größte, die Mitte bleibt, wo sie ist." }
            ], generic: "Tipp: Der größte Wert bleibt der größte. Ändert sich dadurch die Mitte der sortierten Liste?" }),
            numField("mean", "neues Mittel", m1.value, { tag: "mean", traps: [
              { id: "unchanged", values: [m0.value], hint: "Das Mittel ändert sich: Die Summe wird um " + F(mx, 4) + " größer." },
              { id: "doubledMean", values: [2 * m0.value], hint: "Nur ein Wert wird verdoppelt, nicht alle. Die Summe wächst nur um den alten Höchstwert." },
              { id: "noDiv", values: [m0.value + mx], hint: "Die Summe wächst um " + F(mx, 4) + ". Beim Mittel kommt davon nur $\\frac{" + T(mx, 4) + "}{n}$ an." },
              { id: "medNew", values: [med1], hint: "Das ist der Median. Gefragt ist hier das Mittel." }
            ], generic: "Rechne die neue Summe aus und teile durch $n = " + I(n) + "$." })
          ],
          steps: [
            { text: "Vorher: $\\tilde{x} = " + T(med0, 4) + "$ und $\\bar{x} = \\frac{" + T(m0.sum, 4) + "}{" + I(n) + "} " + eq(m0.value) + " " + T(m0.value, 2) + "$." },
            { text: "Median: Der größte Wert bleibt der größte, er rückt nur weiter nach rechts. Die Mitte der sortierten Liste ändert sich nicht: $\\tilde{x}_{\\text{neu}} = " + T(med1, 4) + "$." },
            { text: "Mittel: Die Summe wird um " + F(mx, 4) + " größer: $\\bar{x}_{\\text{neu}} = \\frac{" + T(m0.sum, 4) + " + " + TP(mx, 4) + "}{" + I(n) + "} = \\frac{" + T(m1.sum, 4) + "}{" + I(n) + "} " + eq(m1.value) + " " + T(m1.value, 2) + "$." }
          ],
          why: "Der Median ist robust gegen Ausreißer, das Mittel nicht (Folie 116)."
        });
      }
      if (kind === "abs") {
        do { ctx = pick(CTX.filter(wide)); n = pick(level === "leicht" ? [5] : [5, 7, 9]); xs = drawData(ctx, n, 1); tries++; }
        while (tries < 200 && near(S.mean(xs), S.median(xs)));
        shown = scramble(xs);
        var am = S.absMinimizer(xs), mdi = S.medianInfo(xs), ss = mdi.sorted;
        var right = ss.filter(function (v) { return v > am.from; }), left = ss.filter(function (v) { return v < am.from; });
        var alt = right.length ? right[0] : left[left.length - 1];
        return finish("concept", level, {
          variant: "abs", tag: "med", text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
          ask: "Für welche Zahl $a$ wird $\\sum |x_i - a|$ am kleinsten?",
          fields: [numField("a", "$a$", am.from, { tag: "med", traps: [
            { id: "mean", values: [S.mean(xs)], hint: "Das Mittel macht die Summe der quadrierten Abstände am kleinsten. Bei den Beträgen $|x_i - a|$ ist es der Median (Folie 97)." },
            { id: "unsorted", values: [shown[(n - 1) / 2]], hint: H_SORT }
          ], generic: "Tipp: Bei den Beträgen gewinnt das Lagemaß, das links und rechts gleich viele Werte hat (Folie 97)." })],
          steps: [
            { text: "Für die Summe der Beträge ist der Median am besten (Folie 97)." },
            sortStep(ss, [{ pos: mdi.positions, cls: "is-med" }]),
            { text: "$n = " + I(n) + "$ ist ungerade, also $a = \\tilde{x} = x_{(" + I(mdi.positions[0]) + ")} = " + T(mdi.value, 4) + "$." },
            { text: "Probe: Für $a = " + T(am.from, 4) + "$ ist $\\sum |x_i - a| = " + T(S.sumAbs(xs, am.from), 4) + "$. Für $a = " + T(alt, 4) + "$ wären es schon $" + T(S.sumAbs(xs, alt), 4) + "$." }
          ],
          why: "Schiebst du $a$ vom Median weg, entfernst du dich von mehr Werten, als du anderen näher kommst."
        });
      }
      // kind === "sq"
      var med;
      do {
        ctx = pick(CTX.filter(wide)); n = ri(4, level === "leicht" ? 5 : 7); xs = drawData(ctx, n, 1);
        mi = S.meanInfo(xs); med = S.median(xs); tries++;
      } while (tries < 300 && !(exactIn(mi.value, level === "klausur" ? 1 : 0) && !near(mi.value, med)));
      shown = scramble(xs);
      return finish("concept", level, {
        variant: "sq", tag: "mean", text: ctx.say(I(n)), data: shown, dataLabel: ctx.label,
        ask: "Für welche Zahl $a$ wird $\\sum (x_i - a)^2$ am kleinsten?",
        fields: [numField("a", "$a$", mi.value, { tag: "mean", traps: [
          { id: "median", values: [med], hint: "Der Median macht die Summe der Beträge am kleinsten. Bei den Quadraten $(x_i - a)^2$ ist es das Mittel (Folie 115)." },
          { id: "sum", values: [mi.sum], hint: "Das ist die Summe der Werte. Gesucht ist das Lagemaß, das $\\sum (x_i - a)^2$ am kleinsten macht." }
        ], generic: "Tipp: Für quadrierte Abstände gewinnt der Schwerpunkt der Daten (Folie 115)." })],
        steps: [
          { text: "Für die Summe der quadrierten Abstände ist das arithmetische Mittel am besten (Folie 115)." },
          { text: "$a = \\bar{x} = \\frac{" + texSum(shown) + "}{" + I(n) + "} = \\frac{" + T(mi.sum, 4) + "}{" + I(n) + "} = " + T(mi.value, 2) + "$" },
          { text: "Probe: Für $a = " + T(mi.value, 2) + "$ ist $\\sum (x_i - a)^2 = " + T(S.sumSq(xs, mi.value), 2) + "$. Mit dem Median $a = " + T(med, 4) + "$ wären es $" + T(S.sumSq(xs, med), 2) + "$." }
        ],
        why: "Große Abstände zählen im Quadrat besonders stark. Das Mittel gleicht sie am besten aus."
      });
    }

    /* ================= Weitere Mittel & Schiefe ================= */

    function genTrim(level) {
      var wantFrac = level !== "leicht" && chance(level === "mittel" ? 0.45 : 0.6);
      var ctx, n, t, step, xs, ti, tries = 0, outlier = null;
      function okTrim() {
        if (level !== "leicht" && S.isInt(n * t) === wantFrac && tries < 250) return false;
        if (level === "leicht" ? !exactIn(ti.value, 1) : level === "mittel" ? !exactIn(ti.value, 2) : false) return false;
        if (near(ti.value, S.mean(xs))) return false;
        var s = ti.sorted, k = ti.k;
        return !near(S.mean(s.slice(k)), ti.value) && !near(S.mean(s.slice(0, n - k)), ti.value);
      }
      do {
        ctx = pick(CTX.filter(function (c) { return wide(c) && c.out; }).concat(CTX.filter(wide)));
        t = level === "leicht" ? 0.1 : pick([0.1, 0.2]);
        n = level === "leicht" ? pick([10, 20]) : ri(10, 20);
        step = stepFor(ctx, level);
        xs = drawData(ctx, n, step);
        outlier = null;
        if (ctx.out && chance(0.7)) {
          outlier = snap(ctx.out[0] + rng() * (ctx.out[1] - ctx.out[0]), step);
          xs[ri(0, n - 1)] = outlier;
        }
        ti = S.trimInfo(xs, t);
        tries++;
      } while (tries < 400 && !okTrim());
      var shown = scramble(xs), s = ti.sorted, k = ti.k, m = ti.m, nt = n * t, tp = Math.round(t * 100);
      var tTex = T(t, 1), mean0 = S.meanInfo(xs);
      var kTraps = [
        { id: "kPair", values: [2 * k], hint: "$k$ zählt die Werte an <b>einem</b> Ende. Gestrichen werden $k$ unten und $k$ oben, zusammen $2k$." },
        { id: "kept", values: [m], hint: "Das ist die Zahl der Werte, die übrig bleiben. Gefragt ist $k$, die Zahl der gestrichenen Werte pro Seite." }
      ];
      if (!S.isInt(nt)) {
        kTraps.unshift({ id: "kUp", values: [Math.ceil(nt)], hint: "$n \\cdot t = " + T(nt, 2) + "$ ist keine ganze Zahl. Hier wird immer <b>abgerundet</b> (wie in R)." });
        kTraps.unshift({ id: "kRaw", values: [nt], hint: "$k$ muss eine ganze Zahl sein. Runde $n \\cdot t = " + T(nt, 2) + "$ ab." });
      }
      var vTraps = [
        { id: "oneSideLow", values: [S.mean(s.slice(k))], hint: "Du hast nur unten gestrichen. Getrimmt wird an <b>beiden</b> Enden: " + I(k) + " unten und " + I(k) + " oben." },
        { id: "oneSideHigh", values: [S.mean(s.slice(0, n - k))], hint: "Du hast nur oben gestrichen. Getrimmt wird an <b>beiden</b> Enden: " + I(k) + " unten und " + I(k) + " oben." }
      ];
      if (!S.isInt(nt)) {
        var up = Math.ceil(nt);
        vTraps.push({ id: "kUpValue", values: [S.mean(s.slice(up, n - up))], hint: "Du hast " + I(up) + " Werte pro Seite gestrichen. $n \\cdot t = " + T(nt, 2) + "$ wird aber abgerundet: $k = " + I(k) + "$." });
      }
      vTraps.push({ id: "halfTrim", values: [S.trimmedMean(xs, t / 2)], hint: tp + " % heißt: " + tp + " % unten <b>und</b> " + tp + " % oben weg, also $k = " + I(k) + "$ an jedem Ende." });
      vTraps.push({ id: "plainMean", values: [mean0.value], hint: "Das ist das normale Mittel aller " + I(n) + " Werte. Streiche zuerst die " + I(k) + " kleinsten und die " + I(k) + " größten Werte." });
      vTraps.push({ id: "keptSum", values: [ti.sum], hint: "Das ist die Summe der übrigen Werte. Teile sie noch durch $" + I(m) + "$." });
      vTraps.push({ id: "wrongDiv", values: [ti.sum / n], hint: "Teile durch die Zahl der <b>übrigen</b> Werte: $n - 2k = " + I(m) + "$, nicht durch $n = " + I(n) + "$." });
      vTraps.push({ id: "median", values: [S.median(xs)], hint: "Das ist der Median. Gesucht ist das Mittel der Werte, die nach dem Streichen übrig bleiben." });
      var kLine = S.isInt(nt) ? "$k = n \\cdot t = " + I(n) + " \\cdot " + tTex + " = " + I(k) + "$"
                              : "$n \\cdot t = " + I(n) + " \\cdot " + tTex + " = " + T(nt, 2) + "$. Abrunden: $k = " + I(k) + "$";
      return finish("trim", level, {
        text: ctx.say(I(n)) + (outlier !== null ? " Ein Wert fällt aus der Reihe." : ""), data: shown, dataLabel: ctx.label,
        given: { t: t },
        ask: "Berechne das " + tp + "-%-getrimmte Mittel (in R: `mean(x, trim = " + (t === 0.1 ? "0.1" : "0.2") + ")`). Wie viele Werte streichst du an jedem Ende, und was kommt heraus?",
        fields: [
          numField("k", "gestrichen pro Seite $k$", k, { decimals: 0, tol: 1e-9, traps: kTraps, generic: "Rechne $n \\cdot t$ und runde ab. Das ist die Zahl pro Seite." }),
          numField("tm", "getrimmtes Mittel $\\bar{x}_{\\text{tr}}$", ti.value, { tag: "mean", traps: vTraps, generic: "Sortiere, streiche $k$ Werte unten und $k$ oben und mittle den Rest." })
        ],
        steps: [
          { text: kLine + " Wert" + (k === 1 ? "" : "e") + " an jedem Ende." },
          sortStep(s, [{ pos: range(1, k).concat(range(n - k + 1, n)), cls: "is-dim" }]),
          { text: "Gestrichen: unten " + und(ti.low.map(function (v) { return F(v, 4); })) + ", oben " + und(ti.high.map(function (v) { return F(v, 4); })) + ". Übrig bleiben $n - 2k = " + I(m) + "$ Werte." },
          { text: "$\\bar{x}_{\\text{tr}} = \\frac{" + T(ti.sum, 4) + "}{" + I(m) + "} " + eq(ti.value) + " " + T(ti.value, 2) + "$" }
        ],
        why: "Zum Vergleich: Das normale Mittel ist " + F(mean0.value, 2) + ". Das getrimmte Mittel ignoriert die extremen Werte an beiden Enden. " + (outlier !== null ? "Darum stört der Ausreißer " + F(outlier, 4) + " es nicht." : "Darum stören einzelne extreme Werte es kaum.")
      });
    }

    /* Geometrisches Mittel: nur Aufgaben mit glattem Ergebnis (höchstens 2 Nachkommastellen). */
    var GEO_UP = [1.2, 1.25, 1.5, 1.6, 1.8, 2, 2.4, 2.5, 3, 3.2, 4, 4.5, 5, 6, 8, 9, 12, 16, 18];
    var GEO_DOWN = [0.4, 0.45, 0.5, 0.6, 0.64, 0.72, 0.75, 0.8, 0.9];
    var geoPools = {};
    function geoPool(set, m) {
      var key = set.join("|") + "#" + m;
      if (geoPools[key]) return geoPools[key];
      var out = [];
      (function rec(start, acc) {
        if (acc.length === m) {
          var g = S.geometricMean(acc), distinct = acc.some(function (v) { return v !== acc[0]; });
          if (distinct && exactIn(g, 2) && g !== 1) out.push(acc.slice());
          return;
        }
        for (var i = start; i < set.length; i++) { acc.push(set[i]); rec(i, acc); acc.pop(); }
      })(0, []);
      return (geoPools[key] = out);
    }
    var GEO_FACT = [
      { unit: "Stunde", down: false, say: function (fs) { return "Eine Bakterienkultur wächst " + fs.length + " Stunden lang. Pro Stunde vervielfacht sie sich um diese Faktoren:"; } },
      { unit: "Monat", down: false, say: function (fs) { return "Die Zahl der Follower eines Kanals wächst " + fs.length + " Monate lang. Pro Monat vervielfacht sie sich um diese Faktoren:"; } },
      { unit: "Woche", down: false, say: function (fs) { return "Die Downloads einer Lern-App wachsen " + fs.length + " Wochen lang. Pro Woche vervielfachen sie sich um diese Faktoren:"; } },
      { unit: "Durchgang", down: true, say: function (fs) { return "Beim Lernen einer Wortliste sinkt der Fehleranteil von Durchgang zu Durchgang. Er wird " + fs.length + "-mal mit diesen Faktoren multipliziert:"; } }
    ];
    var GEO_SERIES = [
      { what: "Nutzer", unit: "Jahr", word: "Jahren", starts: [100, 200, 400, 500, 800, 1000], up: true,
        say: function (vs) { return "Eine App hatte am Anfang " + I(vs[0]) + " Nutzer. Nach jedem Jahr wurde gezählt:"; } },
      { what: "Mitglieder", unit: "Jahr", word: "Jahren", starts: [50, 80, 100, 160, 200, 320], up: true,
        say: function (vs) { return "Ein Sportverein hatte am Anfang " + I(vs[0]) + " Mitglieder. Nach jedem Jahr wurde gezählt:"; } },
      { what: "Bakterien (in Tausend)", unit: "Stunde", word: "Stunden", starts: [10, 20, 40, 50, 100], up: true,
        say: function (vs) { return "In einer Probe waren am Anfang " + I(vs[0]) + " Tausend Bakterien. Nach jeder Stunde wurde gezählt:"; } },
      { what: "Fehler", unit: "Durchgang", word: "Durchgängen", starts: [100, 200, 250, 400, 500], up: false,
        say: function (vs) { return "In einem Lernexperiment machten die Teilnehmenden im ersten Durchgang zusammen " + I(vs[0]) + " Fehler. Danach:"; } }
    ];

    function genGeo(level) {
      var variant = level === "leicht" ? pick(["pair", "pair", "ends"]) : level === "mittel" ? pick(["pair", "series", "ends"]) : pick(["multi", "series", "ends"]);
      var g, fs, traps, steps, text, ask, table = null, given = {}, info, tries = 0;
      if (variant === "pair" || variant === "multi") {
        var ctx = pick(GEO_FACT), m = variant === "pair" ? 2 : pick([3, 3, 4]);
        var pool = geoPool(ctx.down ? GEO_DOWN : GEO_UP, m);
        if (!pool.length) pool = geoPool(GEO_UP, 2);
        if (level === "leicht") {
          var easy = pool.filter(function (p) { return p.every(function (v) { return exactIn(v, 0); }) || exactIn(S.geometricMean(p), 0); });
          if (easy.length) pool = easy;
        }
        fs = shuffle(pick(pool));
        info = S.geometricInfo(fs);
        g = info.value;
        var am = S.mean(fs);
        text = ctx.say(fs) + " " + und(fs.map(function (v) { return F(v, 4); })) + ".";
        ask = (ctx.down ? "Mit welchem Faktor wird der Fehleranteil im Mittel pro " : "Um welchen Faktor wächst der Wert im Mittel pro ") + ctx.unit + (ctx.down ? " multipliziert?" : "?");
        given = { factors: fs };
        traps = [
          { id: "arith", values: [am], hint: "Das ist das arithmetische Mittel. Faktoren werden aber multipliziert, nicht addiert. Nimm das geometrische Mittel: Produkt bilden, dann die " + I(fs.length) + ". Wurzel ziehen." },
          { id: "product", values: [info.product], hint: "Das ist das Produkt, also der Gesamtfaktor. Zieh noch die " + I(fs.length) + ". Wurzel." },
          { id: "prodDivN", values: [info.product / fs.length], hint: "Beim geometrischen Mittel teilst du nicht durch $n$, sondern ziehst die $n$-te Wurzel: $\\sqrt[" + I(fs.length) + "]{" + T(info.product, 4) + "}$." },
          { id: "percent", values: [(g - 1) * 100], hint: "Gefragt ist der Faktor (zum Beispiel " + F(g, 2) + "), nicht die Prozentzahl." }
        ];
        steps = [
          { text: "Faktoren werden multipliziert. Darum passt das geometrische Mittel (Folie 117)." },
          { text: "Produkt: $" + fs.map(function (v) { return T(v, 4); }).join(" \\cdot ") + " = " + T(info.product, 4) + "$" },
          { text: "$" + I(fs.length) + "$-te Wurzel: $\\text{GM} = \\sqrt" + (fs.length === 2 ? "" : "[" + I(fs.length) + "]") + "{" + T(info.product, 4) + "} = " + T(g, 2) + "$" },
          { text: "Probe: $" + T(g, 2) + "^{" + I(fs.length) + "} = " + T(info.product, 4) + "$. Passt." }
        ];
        return finish("geo", level, {
          variant: variant, text: text, ask: ask, given: given,
          fields: [numField("gm", "mittlerer Faktor", g, { tag: "mean", traps: traps, generic: "Multipliziere die Faktoren und zieh die " + I(fs.length) + ". Wurzel." })],
          steps: steps,
          why: "Das arithmetische Mittel wäre " + F(am, 2) + ". " + I(fs.length) + "-mal mit " + F(am, 2) + " multipliziert ergibt aber " + F(Math.pow(am, fs.length), 2) + ", nicht " + F(info.product, 4) + ". Nur das geometrische Mittel trifft den Gesamtfaktor genau."
        });
      }
      // Zeitreihe: series (alle Zwischenwerte sichtbar) oder ends (nur Anfang und Ende)
      var sc, tt, a0, vs, ok;
      do {
        sc = pick(GEO_SERIES);
        tt = variant === "ends" ? (level === "klausur" ? pick([2, 3, 4]) : pick([2, 2, 3])) : (level === "klausur" ? pick([3, 4]) : 2);
        g = pick(sc.up ? (level === "leicht" ? [2, 3, 1.5] : [1.2, 1.25, 1.5, 2, 3]) : [0.5, 0.6, 0.8, 0.9]);
        a0 = pick(sc.starts);
        vs = [a0];
        var target = a0 * Math.pow(g, tt), okInts = true;
        for (var j = 1; j <= tt; j++) {
          var ideal = a0 * Math.pow(g, j);
          if (j === tt) vs.push(Math.round(target));
          else {
            var wob = Math.round(ideal * (0.82 + 0.36 * rng()));
            vs.push(Math.max(1, wob));
          }
          if (!exactIn(ideal, 0) && j === tt) okInts = false;
        }
        fs = vs.slice(1).map(function (v, i) { return v / vs[i]; });
        info = S.geometricInfo(fs);
        ok = okInts && info.ok && exactIn(info.value, 2) && near(info.value, g) && vs[tt] <= 100000 &&
             fs.every(function (f) { return sc.up ? f > 1 : f < 1; }) &&
             (variant === "ends" || fs.some(function (f) { return !near(f, g); }));
        tries++;
      } while (tries < 400 && !ok);
      g = info.value;
      var A = vs[0], B = vs[tt], amF = S.mean(fs), tot = B / A;
      given = { start: A, end: B, steps: tt, series: variant === "series" ? vs : null };
      if (variant === "series") {
        text = sc.say(vs);
        table = { head: ["nach … " + sc.word, sc.what], numCols: [0, 1], rows: vs.map(function (v, i) { return [I(i), I(v)]; }) };
      } else {
        text = sc.say(vs).replace(/ Nach jede[mr] .*$| Danach:$/, "") + " Nach " + I(tt) + " " + sc.word + " sind es " + I(B) + ".";
      }
      ask = "Um welchen Faktor " + (sc.up ? "wächst" : "schrumpft") + " die Zahl im Mittel pro " + sc.unit + "?";
      traps = [
        { id: "total", values: [tot], hint: "Das ist der Gesamtfaktor $\\frac{" + I(B) + "}{" + I(A) + "} = " + T(tot, 4) + "$ für alle " + I(tt) + " Schritte. Gesucht ist der Faktor pro Schritt: Zieh die " + I(tt) + ". Wurzel." },
        { id: "totalDivT", values: [tot / tt], hint: "Durch " + I(tt) + " teilen passt nicht: Die Faktoren werden multipliziert. Zieh die " + I(tt) + ". Wurzel aus $" + T(tot, 4) + "$." },
        { id: "linear", values: [1 + (tot - 1) / tt], hint: "Du hast das Wachstum gleichmäßig verteilt, als würde jedes Mal gleich viel dazukommen. Bei Wachstum mit Faktoren nimmst du das geometrische Mittel." },
        { id: "percent", values: [(g - 1) * 100, (1 - g) * 100], hint: "Gefragt ist der Faktor (zum Beispiel " + F(g, 2) + "), nicht die Prozentzahl." }
      ];
      if (variant === "series") traps.unshift({ id: "arith", values: [amF], hint: "Das ist das arithmetische Mittel der Faktoren. Bei Faktoren wird aber multipliziert: Nimm das geometrische Mittel." });
      steps = [];
      if (variant === "series") {
        steps.push({ text: "Faktor pro " + sc.unit + " = neuer Wert ÷ alter Wert:", table: { head: [sc.unit, "Faktor $x_i$"], numCols: [0, 1],
          rows: fs.map(function (f, i) { return [I(i + 1), "$x_{" + I(i + 1) + "} = \\frac{" + I(vs[i + 1]) + "}{" + I(vs[i]) + "} " + (exactIn(f, 4) ? "=" : "\\approx") + " " + T(f, 4) + "$"]; }) } });
        steps.push({ text: "Das Produkt der Faktoren kürzt sich: $x_1 \\cdots x_{" + I(tt) + "} = \\frac{" + I(B) + "}{" + I(A) + "} = " + T(tot, 4) + "$ (wie bei Aufgabe 12)." });
      } else {
        steps.push({ text: "Alle " + I(tt) + " Faktoren zusammen ergeben den Gesamtfaktor: $x_1 \\cdots x_{" + I(tt) + "} = \\frac{" + I(B) + "}{" + I(A) + "} = " + T(tot, 4) + "$" });
      }
      steps.push({ text: "Geometrisches Mittel: $\\text{GM} = \\sqrt" + (tt === 2 ? "" : "[" + I(tt) + "]") + "{" + T(tot, 4) + "} = " + T(g, 2) + "$" });
      steps.push({ text: "Probe: $" + I(A) + " \\cdot " + TP(g, 2) + "^{" + I(tt) + "} = " + I(B) + "$. Passt." });
      return finish("geo", level, {
        variant: variant, text: text, ask: ask, given: given, table: table, tableRaw: table ? { series: vs } : null, hiddenFactors: fs,
        fields: [numField("gm", "mittlerer Faktor", g, { tag: "mean", traps: traps, generic: "Rechne den Gesamtfaktor Ende ÷ Anfang und zieh die " + I(tt) + ". Wurzel." })],
        steps: steps,
        why: "Bei Wachstum wird jedes Mal multipliziert. Das geometrische Mittel ist der eine Faktor, der " + I(tt) + "-mal hintereinander genau vom Anfang zum Ende führt" + (variant === "series" ? ". Das arithmetische Mittel der Faktoren (" + F(amF, 2) + ") schafft das nicht." : ".")
      });
    }

    /* Harmonisches Mittel: gleiche Strecke, verschiedene Geschwindigkeiten */
    var HARM_CTX = [
      { who: "Rad", vs: [8, 9, 10, 12, 15, 16, 18, 20, 24, 30], max: 40,
        two: function (seg, a, b) { return "Du fährst mit dem Rad " + I(seg) + " km zum Badesee und auf derselben Strecke zurück. Hin schaffst du " + F(a, 2) + " km/h, zurück (bergauf) nur " + F(b, 2) + " km/h."; },
        three: function (seg, vl) { return "Eine Radtour hat 3 gleich lange Abschnitte zu je " + I(seg) + " km. Deine Geschwindigkeiten: " + vl + "."; } },
      { who: "Auto", vs: [30, 40, 45, 50, 60, 75, 80, 90, 100, 120, 150], max: 400,
        two: function (seg, a, b) { return "Du fährst " + I(seg) + " km in den Urlaub und auf derselben Strecke zurück. Hin schaffst du im Schnitt " + F(a, 2) + " km/h, zurück wegen Stau nur " + F(b, 2) + " km/h."; },
        three: function (seg, vl) { return "Eine Autofahrt hat 3 gleich lange Abschnitte zu je " + I(seg) + " km. Die Geschwindigkeiten: " + vl + "."; } },
      { who: "Wandern", vs: [2, 3, 4, 5, 6], max: 12,
        two: function (seg, a, b) { return "Du wanderst " + I(seg) + " km auf einen Berg und auf demselben Weg wieder hinunter. Hoch schaffst du " + F(a, 2) + " km/h, runter " + F(b, 2) + " km/h."; },
        three: function (seg, vl) { return "Eine Wanderung hat 3 gleich lange Abschnitte zu je " + I(seg) + " km. Deine Geschwindigkeiten: " + vl + "."; } }
    ];
    function lcm(a, b) { var x = a, y = b; while (y) { var r = x % y; x = y; y = r; } return a / x * b; }
    function genHarm(level) {
      var n = level === "klausur" && chance(0.5) ? 3 : 2, ctx, vs, hi, ok, tries = 0, d;
      do {
        ctx = pick(HARM_CTX);
        vs = [];
        while (vs.length < n) { var v = pick(ctx.vs); if (vs.indexOf(v) < 0) vs.push(v); }
        hi = S.harmonicInfo(vs);
        var seg = vs.reduce(lcm);
        d = seg * n;
        ok = hi.ok && (level === "klausur" ? exactIn(hi.value, 2) : exactIn(hi.value, 0)) && !near(hi.value, S.mean(vs)) && seg <= ctx.max;
        tries++;
      } while (tries < 500 && !ok);
      var seg2 = d / n, times = vs.map(function (v) { return seg2 / v; }), tsum = S.sum(times), am = S.mean(vs), gm = S.geometricMean(vs);
      var vList = und(vs.map(function (v) { return F(v, 2) + " km/h"; }));
      var text = n === 2 ? ctx.two(seg2, vs[0], vs[1]) : ctx.three(seg2, vList);
      var traps = [
        { id: "arith", values: [am], hint: "Das ist das arithmetische Mittel. Aber bei der langsameren Geschwindigkeit bist du <b>länger</b> unterwegs, darum zählt sie stärker. Gleiche Strecke, verschiedene Tempos: harmonisches Mittel." },
        { id: "geo", values: [gm], hint: "Das ist das geometrische Mittel. Für Geschwindigkeiten auf gleich langen Strecken passt das harmonische Mittel: $n \\div \\sum \\frac{1}{x_i}$." },
        { id: "recSum", values: [hi.reciprocalSum], hint: "Das ist $\\sum \\frac{1}{x_i}$. Rechne noch $n$ geteilt durch diese Summe." },
        { id: "recMean", values: [hi.reciprocalSum / n], hint: "Das ist das Mittel der Kehrwerte. Nimm davon noch den Kehrwert: $\\text{HM} = n \\div \\sum \\frac{1}{x_i}$." },
        { id: "noN", values: [1 / hi.reciprocalSum], hint: "Fast! Du hast $1 \\div \\sum \\frac{1}{x_i}$ gerechnet. Oben steht aber $n = " + I(n) + "$." }
      ];
      return finish("harm", level, {
        variant: n === 2 ? "two" : "three", text: text, given: { speeds: vs, distance: d },
        ask: "Wie hoch ist die Durchschnittsgeschwindigkeit auf der ganzen Strecke (in km/h)?",
        fields: [numField("hm", "Durchschnitt in km/h", hi.value, { tag: "mean", traps: traps, generic: "Gleich lange Strecken mit verschiedenem Tempo: Nimm das harmonische Mittel $n \\div \\sum \\frac{1}{x_i}$." })],
        steps: [
          { text: "Gleiche Strecken, verschiedene Geschwindigkeiten: Das ist ein Fall für das harmonische Mittel (Folie 120)." },
          { text: "$\\text{HM} = \\frac{n}{\\sum \\frac{1}{x_i}} = \\frac{" + I(n) + "}{" + vs.map(function (v) { return "\\frac{1}{" + T(v, 2) + "}"; }).join(" + ") + "} " + eq(hi.value) + " " + T(hi.value, 2) + "$" },
          { text: "Probe mit der Zeit: " + vs.map(function (v, i) { return "$\\frac{" + T(seg2, 2) + "}{" + T(v, 2) + "} " + eq(times[i]) + " " + T(times[i], 2) + "$ h"; }).join(", ") + ". Zusammen " + F(tsum, 2) + " h für " + I(d) + " km: $\\frac{" + I(d) + "}{" + T(tsum, 4) + "} " + eq(hi.value) + " " + T(hi.value, 2) + "$ km/h." }
        ],
        why: "Das arithmetische Mittel wäre " + F(am, 2) + " km/h. Das ist zu hoch: Mit dem langsamen Tempo bist du länger unterwegs, also zählt es mehr. Das harmonische Mittel berücksichtigt genau das."
      });
    }

    /* Schiefe */
    var SKEW_CTX = [
      { dir: "rechtsschief", unit: "min", say: "Wartezeiten in einer Praxis", sym: ["x̄", "x̃"], base: [8, 20], step: 1 },
      { dir: "rechtsschief", unit: "ms", say: "Reaktionszeiten in einem Experiment", base: [220, 320], step: 1 },
      { dir: "rechtsschief", unit: "Büchern", say: "gelesenen Bücher pro Jahr", base: [3, 9], step: 0.5 },
      { dir: "rechtsschief", unit: "€", say: "Monatsmieten von Studierenden-WGs", base: [350, 520], step: 1 },
      { dir: "linksschief", unit: "Punkten", say: "Punkte in einer sehr leichten Klausur (höchstens 60)", base: [44, 54], step: 1 },
      { dir: "linksschief", unit: "Jahren", say: "Lebensalter beim Renteneintritt", base: [60, 65], step: 0.5 },
      { dir: "linksschief", unit: "Punkten", say: "Zufriedenheit mit einem beliebten Seminar (0 bis 100)", base: [70, 88], step: 1 },
      { dir: "symmetrisch", unit: "cm", say: "Körpergrößen in einer Stichprobe", base: [165, 178], step: 1 },
      { dir: "symmetrisch", unit: "Punkten", say: "Ergebnisse eines Intelligenztests", base: [96, 104], step: 1 }
    ];
    // Der Kontext passt immer zur gesuchten Form (wie in Kapitel 9, im Quiz und auf den Karteikarten):
    // rechtsschief = es gibt eine Untergrenze und wenige sehr große Werte, linksschief = Obergrenze und wenige sehr kleine Werte.
    var SKEW_DATA = [
      { dir: "rechtsschief", label: "Wartezeit in Minuten", lo: [2, 6], span: [16, 40], say: function (n) { return "In einer Praxis wurden " + n + " Wartezeiten notiert (in Minuten)."; } },
      { dir: "rechtsschief", label: "Reaktionszeit in ms", lo: [200, 240], span: [90, 240], say: function (n) { return "In einem Experiment wurden " + n + " Reaktionszeiten gemessen (in ms)."; } },
      { dir: "rechtsschief", label: "Fehler im Konzentrationstest", lo: [0, 2], span: [10, 16], say: function (n) { return "Bei einem Konzentrationstest wurden die Fehler von " + n + " Personen gezählt."; } },
      { dir: "rechtsschief", label: "Stundenlohn im Nebenjob in €", lo: [12, 13], span: [12, 20], say: function (n) { return n + " Studierende nennen ihren Stundenlohn im Nebenjob (in €)."; } },
      { dir: "linksschief", label: "Punkte in einer sehr leichten Klausur", lo: [6, 10], span: [18, 20], say: function (n) { return n + " Personen haben eine sehr leichte Klausur geschrieben (höchstens 30 Punkte)."; } },
      { dir: "linksschief", label: "Alter beim Renteneintritt in Jahren", lo: [54, 57], span: [9, 11], say: function (n) { return "Das ist das Alter von " + n + " Personen beim Renteneintritt (in Jahren)."; } },
      { dir: "linksschief", label: "Zufriedenheit mit einem beliebten Seminar", lo: [25, 45], span: [50, 55], say: function (n) { return n + " Studierende bewerten ein beliebtes Seminar (0 bis 100 Punkte)."; } },
      { dir: "symmetrisch", label: "Körpergröße in cm", lo: [155, 160], span: [30, 35] },
      { dir: "symmetrisch", label: "Ergebnis im Intelligenztest", lo: [80, 85], span: [30, 36] }
    ];
    function skewData(dir) { return pick(SKEW_DATA.filter(function (x) { return x.dir === dir; })); }
    function skewChoice(expected, why) {
      var traps = [];
      if (expected === "rechtsschief") traps.push({ choice: "linksschief", hint: "Genau andersherum. Ist $\\bar{x}$ größer als $\\tilde{x}$, ziehen ein paar große Werte das Mittel nach rechts. Der lange Ausläufer liegt rechts: rechtsschief (= linkssteil)." });
      if (expected === "linksschief") traps.push({ choice: "rechtsschief", hint: "Genau andersherum. Ist $\\bar{x}$ kleiner als $\\tilde{x}$, ziehen ein paar kleine Werte das Mittel nach links. Der lange Ausläufer liegt links: linksschief (= rechtssteil)." });
      if (expected !== "symmetrisch") traps.push({ choice: "symmetrisch", hint: "Symmetrisch wäre es nur, wenn beide Werte gleich sind (bzw. der Koeffizient 0 ist). Hier gibt es einen Unterschied. In welche Richtung?" });
      else traps.push({ choice: "*", hint: "Beide Werte sind gleich (bzw. der Koeffizient ist 0). Dann gibt es keinen Grund für eine Schiefe: symmetrisch." });
      return { key: "dir", kind: "choice", label: "Die Verteilung ist …", short: "Form:", expected: expected, options: SKEW_OPTS, traps: traps, round: false,
        generic: why, show: expected + (expected === "rechtsschief" ? " (= linkssteil)" : expected === "linksschief" ? " (= rechtssteil)" : "") };
    }
    function genSkew(level) {
      var variant = level === "leicht" ? pick(["given", "given", "quart"]) : level === "mittel" ? pick(["given", "data", "quart"]) : pick(["data", "quart", "quart"]);
      var tries = 0;
      if (variant === "given") {
        var dir = chance(0.2) ? "symmetrisch" : pick(["rechtsschief", "linksschief"]);
        var c = pick(SKEW_CTX.filter(function (x) { return x.dir === dir; }));
        var med = snap(c.base[0] + rng() * (c.base[1] - c.base[0]), c.step);
        var span = (c.base[1] - c.base[0]) || 1, delta = dir === "symmetrisch" ? 0 : snap(span * (0.12 + 0.3 * rng()), 0.1) || 0.5;
        var mean = dir === "rechtsschief" ? med + delta : dir === "linksschief" ? med - delta : med;
        mean = Math.round(mean * 10) / 10;
        var diff = mean - med, got = S.skewDirection(Math.abs(diff) < 1e-9 ? 0 : diff);
        return finish("skew", level, {
          variant: "given", text: "Für die " + c.say + " gilt: $\\bar{x} = " + T(mean, 1) + "$ und $\\tilde{x} = " + T(med, 1) + "$ (in " + c.unit + ").",
          given: { mean: mean, median: med },
          ask: "Wie ist die Verteilung tendenziell geformt?",
          fields: [skewChoice(got, "Vergleiche $\\bar{x}$ mit $\\tilde{x}$: Wer ist größer?")],
          steps: [
            { text: "Rechne $\\bar{x} - \\tilde{x} = " + T(mean, 1) + " - " + TP(med, 1) + " = " + T(diff, 2) + "$ (Folie 140)." },
            { text: got === "symmetrisch" ? "Der Unterschied ist 0. Also: symmetrisch." :
              got === "rechtsschief" ? "Der Unterschied ist positiv. Also: rechtsschief (= linkssteil). Ein paar große Werte ziehen das Mittel nach rechts." :
              "Der Unterschied ist negativ. Also: linksschief (= rechtssteil). Ein paar kleine Werte ziehen das Mittel nach links." }
          ],
          why: "Das Mittel reagiert auf extreme Werte, der Median nicht. Darum zeigt $\\bar{x}$ in Richtung des langen Ausläufers."
        });
      }
      if (variant === "data") {
        var dc, n, xs, si, wantDir = pick(["rechtsschief", "linksschief"]);
        do {
          dc = skewData(wantDir);
          n = level === "mittel" ? pick([5, 6, 7]) : ri(7, 10);
          var lo = ri(dc.lo[0], dc.lo[1]), hiV = lo + ri(dc.span[0], dc.span[1]);
          xs = [];
          for (var i = 0; i < n; i++) {
            var u = Math.pow(rng(), 1.9);
            xs.push(Math.round(wantDir === "rechtsschief" ? lo + u * (hiV - lo) : hiV - u * (hiV - lo)));
          }
          si = S.skewInfo(xs, 0.25);
          tries++;
        } while (tries < 400 && !(si.diffDirection === wantDir && Math.abs(si.diff) >= 0.5 && (level === "klausur" || exactIn(si.mean, 2))));
        var shown = scramble(xs), mi = S.medianInfo(xs), mn = S.meanInfo(xs);
        return finish("skew", level, {
          variant: "data", text: dc.say(I(n)), data: shown, dataLabel: dc.label,
          ask: "Berechne $\\bar{x}$ und $\\tilde{x}$. Wie ist die Verteilung tendenziell geformt?",
          fields: [
            numField("mean", "Mittel $\\bar{x}$", si.mean, { tag: "mean", traps: meanTraps(xs, mn), generic: "Addiere alle Werte und teile durch $n = " + I(n) + "$." }),
            numField("med", "Median $\\tilde{x}$", si.median, { tag: "med", traps: medianTraps(xs, shown, mi), generic: "Sortiere und nimm die Mitte." }),
            skewChoice(si.diffDirection, "Vergleiche deine beiden Werte: Ist $\\bar{x}$ größer oder kleiner als $\\tilde{x}$?")
          ],
          steps: [
            { text: "Mittel: $\\bar{x} = \\frac{" + T(mn.sum, 4) + "}{" + I(n) + "} " + eq(si.mean) + " " + T(si.mean, 2) + "$" },
            sortStep(mi.sorted, [{ pos: mi.positions, cls: "is-med" }]),
            { text: "Median: " + medLine(mi) },
            { text: "$\\bar{x} - \\tilde{x} = " + T(si.mean, 2) + " - " + TP(si.median, 4) + " " + eq(si.diff) + " " + T(si.diff, 2) + "$. " +
              (si.diff > 0 ? "Positiv, also rechtsschief (= linkssteil)." : "Negativ, also linksschief (= rechtssteil).") }
          ],
          why: si.diff > 0 ? "Ein paar große Werte ziehen das Mittel nach oben. Der Median bleibt in der Mitte. Der lange Ausläufer liegt rechts."
                           : "Ein paar kleine Werte ziehen das Mittel nach unten. Der Median bleibt in der Mitte. Der lange Ausläufer liegt links."
        });
      }
      // variant "quart": Q1, Median, Q3 gegeben → g_0,25
      var xs2, si2, want = chance(0.15) ? "symmetrisch" : pick(["rechtsschief", "linksschief"]), n2, dc2;
      do {
        dc2 = skewData(want);
        n2 = ri(8, 16);
        var lo3 = ri(dc2.lo[0], dc2.lo[1]), hi3 = lo3 + ri(dc2.span[0], dc2.span[1]);
        xs2 = [];
        for (var q = 0; q < n2; q++) {
          var w = want === "symmetrisch" ? rng() : Math.pow(rng(), 1.7);
          xs2.push(Math.round(want === "linksschief" ? hi3 - w * (hi3 - lo3) : lo3 + w * (hi3 - lo3)));
        }
        si2 = S.skewInfo(xs2, 0.25);
        tries++;
      } while (tries < 600 && !(si2.gpDirection === want && (level === "klausur" || exactIn(si2.gp, 2)) && isFinite(si2.gp) && (want === "symmetrisch" || Math.abs(si2.gp) >= 0.1)));
      var Q1 = si2.qLow, M = si2.median, Q3 = si2.qHigh, gp = si2.gp, up = si2.upper, lw = si2.lower, wd = Q3 - Q1;
      return finish("skew", level, {
        variant: "quart",
        text: "Für " + I(n2) + " Werte (" + dc2.label + ") hat jemand die Quartile ausgerechnet: $Q_1 = " + T(Q1, 2) + "$, $\\tilde{x} = " + T(M, 2) + "$ und $Q_3 = " + T(Q3, 2) + "$.",
        given: { q1: Q1, median: M, q3: Q3 }, hiddenData: xs2,
        ask: "Berechne den Quartilskoeffizienten $g_{0{,}25}$. Wie ist die Verteilung tendenziell geformt?",
        fields: [
          numField("gp", "$g_{0{,}25}$", gp, { traps: [
            { id: "sign", values: [-gp], hint: "Das Vorzeichen ist vertauscht. Oben steht $(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1)$: erst der obere Abstand, dann der untere." },
            { id: "noDiv", values: [up - lw], hint: "Das ist nur der Zähler. Teile noch durch $Q_3 - Q_1 = " + T(wd, 2) + "$." },
            { id: "ratio", values: [lw ? up / lw : NaN], hint: "Nicht teilen, sondern abziehen: $(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1)$. Erst danach durch $Q_3 - Q_1$ teilen." }
          ], generic: "Rechne $g_{0{,}25} = \\frac{(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1)}{Q_3 - Q_1}$." }),
          skewChoice(si2.gpDirection, "Schau auf das Vorzeichen von $g_{0{,}25}$: positiv, negativ oder 0?")
        ],
        steps: [
          { text: "Oberer Abstand: $Q_3 - \\tilde{x} = " + T(Q3, 2) + " - " + TP(M, 2) + " = " + T(up, 2) + "$. Unterer Abstand: $\\tilde{x} - Q_1 = " + T(M, 2) + " - " + TP(Q1, 2) + " = " + T(lw, 2) + "$." },
          { text: "$g_{0{,}25} = \\frac{" + T(up, 2) + " - " + TP(lw, 2) + "}{" + T(Q3, 2) + " - " + TP(Q1, 2) + "} = \\frac{" + T(up - lw, 2) + "}{" + T(wd, 2) + "} " + eq(gp) + " " + T(gp, 2) + "$ (Folie 142)" },
          { text: gp > 0 ? "Positiv: Die obere Hälfte der Box ist länger. Also rechtsschief (= linkssteil)." : gp < 0 ? "Negativ: Die untere Hälfte der Box ist länger. Also linksschief (= rechtssteil)." : "Genau 0: Beide Hälften der Box sind gleich lang. Also symmetrisch.",
            chart: { q1: Q1, med: M, q3: Q3, boxOnly: true } }
        ],
        why: "Der Koeffizient vergleicht die beiden Hälften der Box. Er liegt immer zwischen −1 und 1. Der lange Teil zeigt, wo die Werte weiter auseinanderliegen."
      });
    }

    /* Lineare Transformation (Folien 133–134) */
    var LIN_CTX = [
      { id: "fahrenheit", p: 1.8, q: 32, lo: 12, hi: 30, step: 1, kstep: 0.5, unit: "°C", unitY: "°F",
        say: function (m) { return "Die mittlere Tageshöchsttemperatur im Juni war $\\bar{x} = " + T(m, 2) + "$ °C. Für eine Freundin in den USA rechnest du in Grad Fahrenheit um: $y = 1{,}8 \\cdot x + 32$."; },
        ask: "Wie groß ist das Mittel in °F?" },
      { id: "bonus", p: 1, q: null, qs: [2, 3, 4, 5], lo: 12, hi: 24, step: 1, kstep: 0.5, unit: "Punkte",
        say: function (m, q) { return "In einem Test hatten die Studierenden im Mittel $\\bar{x} = " + T(m, 2) + "$ Punkte. Weil eine Aufgabe missverständlich war, bekommt jede Person " + I(q) + " Bonuspunkte."; },
        ask: "Wie groß ist das neue Mittel?" },
      { id: "double", p: 2, q: null, qs: [1, 2, 3, 4], lo: 8, hi: 18, step: 1, kstep: 0.5, unit: "Punkte",
        say: function (m, q) { return "Ein Zwischentest hatte im Mittel $\\bar{x} = " + T(m, 2) + "$ Punkte. Für die Endnote zählt er doppelt, dazu kommen " + I(q) + " Punkte für die Anwesenheit: $y = 2 \\cdot x + " + I(q) + "$."; },
        ask: "Wie groß ist das Mittel der umgerechneten Punkte?" },
      { id: "seconds", p: 60, q: 0, lo: 2, hi: 9, step: 0.5, kstep: 0.1, unit: "min", unitY: "s",
        say: function (m) { return "Für einen Rätseltest brauchten die Teilnehmenden im Mittel $\\bar{x} = " + T(m, 2) + "$ Minuten. Du rechnest alle Zeiten in Sekunden um: $y = 60 \\cdot x$."; },
        ask: "Wie groß ist das Mittel in Sekunden?" },
      { id: "reverse", p: -1, q: 8, lo: 2, hi: 6, step: 0.1, kstep: 0.1, unit: "Punkte",
        say: function (m) { return "Ein Fragebogen-Item (Skala 1 bis 7) ist negativ gepolt und hat das Mittel $\\bar{x} = " + T(m, 2) + "$. Du polst es um: $y = 8 - x$, also $p = -1$ und $q = 8$."; },
        ask: "Wie groß ist das Mittel nach dem Umpolen?" },
      { id: "center", p: 1, q: "center", lo: 10, hi: 40, step: 1, kstep: 0.5, unit: "Punkte",
        say: function (m) { return "Ein Stresswert hat das Mittel $\\bar{x} = " + T(m, 2) + "$. Du zentrierst die Daten: Von jedem Wert ziehst du das Mittel ab, $y_i = x_i - \\bar{x}$."; },
        ask: "Wie groß ist das Mittel $\\bar{y}$ der zentrierten Werte?" }
    ];
    function genLin(level) {
      var ctx = pick(LIN_CTX), step = level === "klausur" ? ctx.kstep : ctx.step, n = ri(5, 8), xs, mx, tries = 0;
      var dec = level === "leicht" ? 0 : 1;
      do {
        xs = [];
        for (var i = 0; i < n; i++) xs.push(snap(ctx.lo + rng() * (ctx.hi - ctx.lo), step));
        mx = S.mean(xs);
        tries++;
      } while (tries < 400 && !exactIn(mx, dec));
      var p = ctx.p, q = ctx.q === null ? pick(ctx.qs) : ctx.q === "center" ? -mx : ctx.q;
      var ys = S.linear(xs, p, q), ym = S.mean(ys);
      if (Math.abs(ym) < 1e-9) ym = 0;
      var qShow = ctx.q === "center" ? "-\\bar{x}" : T(q, 2);
      var traps = [];
      if (q !== 0) traps.push({ id: "noQ", values: [p * mx], hint: "Du hast nur mit $p$ multipliziert. Das $q = " + qShow + "$ musst du noch addieren: $\\bar{y} = p \\cdot \\bar{x} + q$." });
      if (p !== 1) traps.push({ id: "noP", values: [mx + q], hint: "Du hast nur $q$ addiert. Erst mal $p = " + T(p, 2) + "$ nehmen: $\\bar{y} = p \\cdot \\bar{x} + q$." });
      if (p !== 1 && q !== 0) traps.push({ id: "order", values: [p * (mx + q)], hint: "Die Reihenfolge stimmt nicht: erst mal $p$, dann $+\\,q$. Also $" + T(p, 2) + " \\cdot " + TP(mx, 2) + " + " + TP(q, 2) + "$." });
      traps.push({ id: "same", values: [mx], hint: "Das ist das alte Mittel. Wenn sich jeder Wert ändert, ändert sich das Mittel genauso mit." });
      if (ctx.id === "fahrenheit") traps.push({ id: "backwards", values: [(mx - 32) / 1.8], hint: "Das ist die Umrechnung in die andere Richtung. Hier geht es von °C nach °F: $y = 1{,}8 \\cdot x + 32$." });
      if (ctx.id === "reverse") traps.push({ id: "negq", values: [mx - 8], hint: "Achte auf die Reihenfolge: $y = 8 - x$, also $\\bar{y} = 8 - \\bar{x}$." });
      var line = ctx.q === "center"
        ? "$\\bar{y} = \\bar{x} - \\bar{x} = " + T(mx, 2) + " - " + TP(mx, 2) + " = 0$"
        : "$\\bar{y} = p \\cdot \\bar{x} + q = " + T(p, 2) + " \\cdot " + TP(mx, 2) + " + " + TP(q, 2) + " = " + T(ym, 2) + "$";
      return finish("lin", level, {
        variant: ctx.id, text: ctx.say(mx, q), given: { mean: mx, p: p, q: q }, hiddenData: xs,
        ask: ctx.ask + " Du brauchst dafür keine Einzelwerte.",
        fields: [numField("ym", "neues Mittel $\\bar{y}$" + (ctx.unitY ? " in " + ctx.unitY : ""), ym, { tag: "mean", traps: traps, generic: "Benutze die Regel: $y_i = p \\cdot x_i + q$ heißt $\\bar{y} = p \\cdot \\bar{x} + q$ (Folie 134)." })],
        steps: [
          { text: "Regel (Folie 134): Aus $y_i = p \\cdot x_i + q$ folgt $\\bar{y} = p \\cdot \\bar{x} + q$." + (ctx.q === "center" ? " Hier ist $p = 1$ und $q = -\\bar{x}$." : " Hier ist $p = " + T(p, 2) + "$ und $q = " + T(q, 2) + "$.") },
          { text: line }
        ],
        why: ctx.q === "center" ? "Zentrierte Daten haben immer das Mittel 0. Das ist die Nulleigenschaft: $\\sum (x_i - \\bar{x}) = 0$."
          : "Das Mittel macht jede lineare Umrechnung mit. Du musst die Werte nicht einzeln umrechnen."
      });
    }

    /* ---------- Auswahl und Bewertung ---------- */

    var GEN = {
      medOdd: function (l) { return genMedian(l, false); }, medEven: function (l) { return genMedian(l, true); },
      mode: genMode, mean: genMean, quart: function (l) { return genQuantile(l, true); }, pq: function (l) { return genQuantile(l, false); },
      tabMean: genTabMean, tabMed: genTabMed, missing: genMissing, box: genBox, classMean: genClassMean, concept: genConcept,
      trim: genTrim, geo: genGeo, harm: genHarm, skew: genSkew, lin: genLin
    };

    function generate(type, level) {
      if (!GEN[type]) throw new Error("Unbekannter Aufgabentyp: " + type);
      return GEN[type](level || "mittel");
    }
    // zufälliger Typ aus den eingeschalteten, möglichst nicht derselbe wie zuletzt
    function nextType(enabled, last) {
      var list = enabled && enabled.length ? enabled : TYPES.map(function (t) { return t.id; });
      var pool = list.length > 1 ? list.filter(function (t) { return t !== last; }) : list;
      return pick(pool);
    }

    function tolOf(f) { return f.tol !== undefined ? f.tol : 0.5 * Math.pow(10, -f.decimals) + 1e-9; }
    function matches(v, target, f) { return isFinite(v) && isFinite(target) && Math.abs(v - target) <= tolOf(f); }

    // Ein Feld bewerten. input: Text (num/mode) bzw. gewählte Option (choice); none: „kein Modus“ gedrückt.
    // Ergebnis: { state: "empty" | "ok" | "miss", hint, trap }
    function evaluate(f, input, none) {
      if (f.kind === "choice") {
        if (!input) return { state: "empty", hint: "Wähle eine Antwort." };
        if (input === f.expected) return { state: "ok", hint: "" };
        var tc = f.traps.filter(function (t) { return t.choice === input || t.choice === "*"; })[0];
        return { state: "miss", hint: tc ? tc.hint : f.generic, trap: tc ? "swap" : null };
      }
      if (f.kind === "mode" && none) {
        if (f.expected === null) return { state: "ok", hint: "" };
        return { state: "miss", hint: f.noneHint, trap: "none" };
      }
      var txt = String(input === undefined || input === null ? "" : input);
      if (!txt.trim()) return { state: "empty", hint: f.kind === "mode" ? "Gib einen Wert ein oder wähle „kein Modus“." : "Trag eine Zahl ein." };
      var v = deps.parseNum ? deps.parseNum(txt) : Number(txt.replace(",", "."));
      if (!isFinite(v)) return { state: "miss", hint: "Das ist keine Zahl. Schreib zum Beispiel " + F(8.5) + " (mit Komma)." };
      if (f.expected !== null) {
        var c = check(txt, f.expected, { decimals: f.decimals, tol: f.tol });
        if (c.ok) return { state: "ok", hint: "" };
      }
      for (var i = 0; i < f.traps.length; i++) {
        var t = f.traps[i];
        if (!t.values) continue;
        for (var j = 0; j < t.values.length; j++) {
          var tv = t.values[j];
          if (f.expected !== null && matches(tv, f.expected, f)) continue;   // Falle fällt mit der Lösung zusammen
          if (matches(v, tv, f)) return { state: "miss", hint: t.hint, trap: t.id };
        }
      }
      if (f.expected !== null && f.decimals > 0 && Math.abs(v - f.expected) <= 0.05 + 1e-9) {
        return { state: "miss", hint: "Ganz knapp! Rechne mit allen Stellen weiter und runde erst am Ende auf " + I(f.decimals) + " Nachkommastellen.", trap: "rounding" };
      }
      if (f.kind === "mode" && f.expected === null) return { state: "miss", hint: "Schau genau hin: Kommt ein Wert wirklich öfter vor als alle anderen? Zähle nach.", trap: null };
      return { state: "miss", hint: f.generic, trap: null };
    }

    return { TYPES: TYPES, GROUPS: GROUPS, LEVELS: LEVELS, generate: generate, nextType: nextType, evaluate: evaluate };
  }

  // Ziel für den Fortschritt oben auf der Seite: so viele Aufgaben beim ersten Prüfen richtig
  var GOAL = 10;
  // Kurze Zeile unter dem Punktestand: Was zählt zum Fortschritt, und wie viel fehlt noch?
  function goalText(first, done) {
    var base = "Zählt zum Fortschritt: " + GOAL + " Aufgaben auf Anhieb richtig";
    if (done) return base + ". Geschafft ✓";
    // Fortschritt wird beim nächsten gewerteten Versuch gesetzt, darum mindestens „noch 1“
    var left = Math.max(1, GOAL - (first > 0 ? Math.floor(first) : 0));
    return base + " (noch " + left + "). Auf Anhieb heißt: beim ersten Prüfen.";
  }

  var API = { makeTrainer: makeTrainer, TYPES: TYPES, GROUPS: GROUPS, LEVELS: LEVELS, SKEW_OPTS: SKEW_OPTS, GOAL: GOAL, goalText: goalText };
  LM.trainer = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ======================================================================
     Das Modul im Browser
     ====================================================================== */

  if (typeof LM.widget !== "function") return;

  var SUCCESS = ["Richtig!", "Stimmt genau.", "Super, alles richtig.", "Klasse, das sitzt."];

  LM.widget("trainer", function (el, LM) {
    var h = LM.h;
    var tr = makeTrainer({ stats: LM.stats, fmt: LM.fmt, check: LM.check, parseNum: LM.parseNum });
    var TYPE = {};
    TYPES.forEach(function (t) { TYPE[t.id] = t; });

    /* ---------- gespeicherter Stand ---------- */
    var DEF = { level: "mittel", off: [], total: 0, first: 0, streak: 0, best: 0, byType: {} };
    var st = Object.assign({}, DEF, LM.store.get("trainer", {}) || {});
    if (!LEVELS.some(function (l) { return l.id === st.level; })) st.level = "mittel";
    if (!Array.isArray(st.off)) st.off = [];
    st.off = st.off.filter(function (id) { return TYPE[id]; });
    if (st.off.length >= TYPES.length) st.off = [];
    if (!st.byType || typeof st.byType !== "object") st.byType = {};
    ["total", "first", "streak", "best"].forEach(function (k) { if (!(st[k] >= 0)) st[k] = 0; });
    function save() { LM.store.set("trainer", st); }
    function enabled() { return TYPES.map(function (t) { return t.id; }).filter(function (id) { return st.off.indexOf(id) < 0; }); }

    LM.progress.define("trainer", GOAL + " Trainer-Aufgaben auf Anhieb richtig");

    /* ---------- Text mit $TeX$, `Code` und <b> ---------- */
    function rich(s) {
      return String(s === undefined || s === null ? "" : s).split(/(\$[^$]+\$|`[^`]+`)/).map(function (p) {
        if (p.length > 1 && p.charAt(0) === "$" && p.charAt(p.length - 1) === "$") return LM.tex(p.slice(1, -1));
        if (p.length > 1 && p.charAt(0) === "`" && p.charAt(p.length - 1) === "`") return "<code>" + LM.esc(p.slice(1, -1)) + "</code>";
        return LM.esc(p).replace(/&lt;(\/?)b&gt;/g, "<$1b>");
      }).join("");
    }
    function richEl(tag, cls, s) { return h(tag, { class: cls, html: rich(s) }); }

    /* ---------- Gerüst ---------- */
    el.classList.add("widget", "tr");
    el.innerHTML = "";
    el.appendChild(h("div", { class: "w-head" }, [
      h("h3", {}, ["Aufgaben-Trainer", h("span", { class: "w-badge", text: "Klausurstil" })]),
      h("p", { class: "w-sub", text: "Rechne auf Papier und tipp dein Ergebnis ein. Bei Fehlern bekommst du einen gezielten Tipp und darfst es nochmal versuchen." })
    ]));

    // Punktestand
    var scFirst = h("span", { class: "tr-pill-val" }), scFirstSub = h("span", { class: "tr-pill-sub" });
    var scStreak = h("span", { class: "tr-pill-val" }), scStreakSub = h("span", { class: "tr-pill-sub" });
    var scGoal = h("span", { class: "tr-pill-val" }), scGoalBar = h("span", { class: "tr-goal-fill" });
    var score = h("div", { class: "tr-score" }, [
      h("div", { class: "tr-pill" }, [h("span", { class: "tr-pill-label", text: "Auf Anhieb richtig" }), scFirst, scFirstSub]),
      h("div", { class: "tr-pill tr-pill-streak" }, [h("span", { class: "tr-pill-label", text: "Serie" }), scStreak, scStreakSub]),
      h("div", { class: "tr-pill tr-pill-goal" }, [h("span", { class: "tr-pill-label", text: "Ziel: " + GOAL + " auf Anhieb" }), scGoal,
        h("span", { class: "tr-goal", attrs: { "aria-hidden": "true" } }, [scGoalBar])])
    ]);
    el.appendChild(score);
    // Was genau zum Fortschritt oben auf der Seite zählt
    var goalNote = h("p", { class: "tr-goal-note" });
    el.appendChild(goalNote);
    document.addEventListener("lm:progress", function (e) { if (e.detail && e.detail.id === "trainer") renderScore(); });

    // Niveau und Typen
    var levelSeg = h("div", { class: "seg", attrs: { role: "group", "aria-label": "Niveau" } });
    LEVELS.forEach(function (l) {
      levelSeg.appendChild(h("button", { text: l.label, attrs: { type: "button", "data-level": l.id, "aria-pressed": String(st.level === l.id) },
        on: { click: function () { setLevel(l.id); } } }));
    });
    var panelId = "tr-types-" + Math.random().toString(36).slice(2, 8);
    var typesBtn = h("button", { class: "btn btn-sm tr-types-btn", attrs: { type: "button", "aria-expanded": "false", "aria-controls": panelId } });
    var typesPanel = h("div", { class: "tr-types", attrs: { id: panelId, hidden: "" } });
    typesBtn.addEventListener("click", function () {
      var open = typesPanel.hasAttribute("hidden");
      if (open) typesPanel.removeAttribute("hidden"); else typesPanel.setAttribute("hidden", "");
      typesBtn.setAttribute("aria-expanded", String(open));
    });
    el.appendChild(h("div", { class: "w-controls tr-controls" }, [
      h("div", { class: "tr-ctl" }, [h("span", { class: "tr-ctl-label", text: "Niveau" }), levelSeg]),
      typesBtn
    ]));
    el.appendChild(typesPanel);

    var chips = {};
    GROUPS.forEach(function (g) {
      var ids = TYPES.filter(function (t) { return t.group === g.id; }).map(function (t) { return t.id; });
      var row = h("div", { class: "tr-chips", attrs: { role: "group", "aria-label": g.label } });
      ids.forEach(function (id) {
        var t = TYPE[id];
        var c = h("button", { class: "chip tr-chip", attrs: { type: "button", "aria-pressed": "true" }, on: { click: function () { toggleTypes([id]); } } },
          [t.tag ? h("span", { class: "tr-dot tr-dot-" + t.tag, attrs: { "aria-hidden": "true" } }) : null, t.label]);
        chips[id] = c;
        row.appendChild(c);
      });
      typesPanel.appendChild(h("div", { class: "tr-group" }, [
        h("div", { class: "tr-group-head" }, [
          h("h4", { text: g.label }),
          h("button", { class: "btn btn-ghost btn-sm", text: "alle an", attrs: { type: "button", "aria-label": g.label + ": alle an" }, on: { click: function () { setGroup(ids, true); } } }),
          h("button", { class: "btn btn-ghost btn-sm", text: "alle aus", attrs: { type: "button", "aria-label": g.label + ": alle aus" }, on: { click: function () { setGroup(ids, false); } } })
        ]),
        row
      ]));
    });

    // Aufgabenkarte
    var card = h("article", { class: "tr-card", attrs: { "aria-label": "Aktuelle Aufgabe" } });
    el.appendChild(card);
    var status = h("p", { class: "feedback tr-status", attrs: { role: "status", "aria-live": "polite" } });

    // Statistik pro Typ
    var statsBody = h("div", { class: "tr-stats-body" });
    var resetBtn = h("button", { class: "btn btn-sm btn-ghost tr-reset", text: "Statistik zurücksetzen", attrs: { type: "button" }, on: { click: resetStats } });
    var details = h("details", { class: "tr-stats" }, [
      h("summary", { text: "Deine Statistik pro Aufgabentyp" }),
      statsBody, resetBtn
    ]);
    details.addEventListener("toggle", function () { if (details.open) renderStats(); });
    el.appendChild(details);

    /* ---------- Zustand der aktuellen Aufgabe ---------- */
    var task = null, ui = null, lastType = null, chartRef = null;
    var S0 = { counted: false, solved: false, revealed: false, tries: 0 };
    var state = Object.assign({}, S0);

    function setLevel(id) {
      if (st.level === id) return;
      st.level = id; save();
      levelSeg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-level") === id)); });
      newTask();
    }
    function syncTypes() {
      var on = enabled();
      Object.keys(chips).forEach(function (id) { chips[id].setAttribute("aria-pressed", String(st.off.indexOf(id) < 0)); });
      typesBtn.innerHTML = "";
      typesBtn.appendChild(document.createTextNode("Aufgabentypen: " + on.length + " von " + TYPES.length));
      typesBtn.appendChild(h("span", { class: "tr-caret", attrs: { "aria-hidden": "true" }, text: "▾" }));
    }
    function applyOff(next) {
      if (next.length >= TYPES.length) { LM.toast("Mindestens ein Aufgabentyp muss an bleiben."); return false; }
      st.off = next; save(); syncTypes();
      if (task && st.off.indexOf(task.type) >= 0) newTask();
      return true;
    }
    function toggleTypes(ids) {
      var next = st.off.slice();
      ids.forEach(function (id) { var i = next.indexOf(id); if (i >= 0) next.splice(i, 1); else next.push(id); });
      applyOff(next);
    }
    function setGroup(ids, on) {
      var next = st.off.filter(function (id) { return ids.indexOf(id) < 0; });
      if (!on) next = next.concat(ids);
      applyOff(next);
    }

    /* ---------- Punktestand ---------- */
    function renderScore() {
      scFirst.textContent = String(st.first);
      scFirstSub.textContent = st.total ? "von " + st.total + (st.total === 1 ? " Aufgabe" : " Aufgaben") : "noch keine Aufgabe";
      scStreak.textContent = String(st.streak);
      scStreakSub.textContent = "Rekord " + st.best;
      var g = Math.min(st.first, GOAL);
      scGoal.textContent = g >= GOAL ? "geschafft ✓" : g + " / " + GOAL;
      scGoalBar.style.width = (g / GOAL * 100) + "%";
      score.classList.toggle("tr-goal-done", g >= GOAL);
      goalNote.textContent = goalText(st.first, LM.progress.has("trainer"));
      if (details.open) renderStats();
    }
    function renderStats() {
      statsBody.innerHTML = "";
      var rows = TYPES.filter(function (t) { return st.byType[t.id] && st.byType[t.id][0] > 0; });
      if (!rows.length) { statsBody.appendChild(h("p", { class: "muted small", text: "Noch keine Aufgaben bearbeitet. Los geht’s!" })); return; }
      var tb = h("tbody");
      rows.forEach(function (t) {
        var a = st.byType[t.id][0], ok = st.byType[t.id][1], q = ok / a;
        var bar = h("span", { class: "tr-acc", attrs: { "aria-hidden": "true" } }, [h("span", { class: "tr-acc-fill" + (q >= 0.8 ? " is-good" : q < 0.5 ? " is-low" : ""), style: { width: Math.round(q * 100) + "%" } })]);
        tb.appendChild(h("tr", {}, [
          h("th", { attrs: { scope: "row" }, text: t.label }),
          h("td", { class: "num", text: String(a) }),
          h("td", { class: "num", text: String(ok) }),
          h("td", { class: "num tr-acc-cell" }, [h("span", { text: LM.fmt(q * 100, 0) + " %" }), bar])
        ]));
      });
      statsBody.appendChild(h("div", { class: "table-wrap" }, [h("table", { class: "t tr-stats-table" }, [
        h("thead", {}, [h("tr", {}, [h("th", { text: "Typ" }), h("th", { class: "num", text: "Versuche" }), h("th", { class: "num", text: "Auf Anhieb" }), h("th", { class: "num", text: "Quote" })])]),
        tb
      ])]));
    }
    var resetArmed = false, resetT = 0;
    function disarm() { resetArmed = false; resetBtn.textContent = "Statistik zurücksetzen"; resetBtn.classList.remove("tr-reset-armed"); }
    function resetStats() {
      clearTimeout(resetT);
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = "Wirklich zurücksetzen? Nochmal klicken";
        resetBtn.classList.add("tr-reset-armed");
        resetT = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      st.total = 0; st.first = 0; st.streak = 0; st.best = 0; st.byType = {};
      save(); renderScore(); renderStats();
      LM.toast("Statistik zurückgesetzt.");
    }
    function record(firstOk) {
      var bt = st.byType[task.type] || [0, 0];
      bt[0]++;
      st.total++;
      if (firstOk) {
        bt[1]++; st.first++; st.streak++;
        if (st.streak > st.best) st.best = st.streak;
      } else st.streak = 0;
      st.byType[task.type] = bt;
      save();
      renderScore();
      var party = firstOk && (st.streak === 5 || st.streak === 10);
      if (party) {
        LM.celebrate(scStreak);
        LM.toast(st.streak + " richtig in Folge. Stark!");
      }
      if (st.first >= GOAL && !LM.progress.has("trainer")) {
        LM.progress.mark("trainer");
        LM.toast("Ziel erreicht: " + GOAL + " Aufgaben auf Anhieb richtig!");
        if (!party) LM.celebrate(scGoal);
      }
    }

    /* ---------- Bausteine ---------- */
    function tableEl(t) {
      var numCols = t.numCols || [], hl = t.hlCols || [];
      var hlCls = t.hlCls === "mod" ? "tr-hit-mod" : t.hlCls === "med" ? "hit" : "";
      var tbl = h("table", { class: "t tr-table" + (t.rowHead ? " tr-table-h" : "") });
      if (t.head) {
        tbl.appendChild(h("thead", {}, [h("tr", {}, t.head.map(function (c, i) {
          return h("th", { class: numCols.indexOf(i) >= 0 ? "num" : "", html: rich(c), attrs: { scope: "col" } });
        }))]));
      }
      var tb = h("tbody");
      var hlRows = t.hlRows || [];
      t.rows.forEach(function (r, ri) {
        tb.appendChild(h("tr", {}, r.map(function (c, i) {
          if (t.rowHead && i === 0) return h("th", { html: rich(c), attrs: { scope: "row" } });
          var cls = (t.rowHead || numCols.indexOf(i) >= 0) ? "num" : "";
          if (hlCls && ((t.rowHead && hl.indexOf(i) >= 0) || hlRows.indexOf(ri) >= 0)) cls += " " + hlCls;
          return h("td", { class: cls, html: rich(c) });
        })));
      });
      tbl.appendChild(tb);
      if (t.foot) tbl.appendChild(h("tfoot", {}, [h("tr", { class: "tr-foot" }, t.foot.map(function (c, i) {
        return h(i === 0 ? "th" : "td", { class: numCols.indexOf(i) >= 0 ? "num" : "", html: rich(c), attrs: i === 0 ? { scope: "row" } : {} });
      }))]));
      return h("div", { class: "table-wrap tr-tw" }, [tbl]);
    }

    // kleine Boxplot-Skizze im Rechenweg
    function drawBox(host, b) {
      var W = Math.max(200, Math.min(560, host.clientWidth || 320)), H = 96, pad = 24;
      var lo = b.boxOnly ? b.q1 : b.lo, hi = b.boxOnly ? b.q3 : b.hi, span = hi - lo || 1, ext = b.boxOnly ? span * 0.2 : 0;
      var x = LM.svg.scale(lo - ext, hi + ext, pad, W - pad);
      host.innerHTML = "";
      var svg = LM.svg.el("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img",
        "aria-label": "Boxplot: " + (b.boxOnly ? "" : "Minimum " + LM.fmt(b.lo, 4) + ", ") + "Q1 " + LM.fmt(b.q1, 4) + ", Median " + LM.fmt(b.med, 4) + ", Q3 " + LM.fmt(b.q3, 4) + (b.boxOnly ? "" : ", Maximum " + LM.fmt(b.hi, 4)) }, host);
      var y0 = 26, y1 = 58, ym = (y0 + y1) / 2;
      if (!b.boxOnly) {
        LM.svg.el("line", { x1: x(b.lo), x2: x(b.q1), y1: ym, y2: ym, class: "whisker" }, svg);
        LM.svg.el("line", { x1: x(b.q3), x2: x(b.hi), y1: ym, y2: ym, class: "whisker" }, svg);
        LM.svg.el("line", { x1: x(b.lo), x2: x(b.lo), y1: y0 + 7, y2: y1 - 7, class: "whisker" }, svg);
        LM.svg.el("line", { x1: x(b.hi), x2: x(b.hi), y1: y0 + 7, y2: y1 - 7, class: "whisker" }, svg);
      }
      LM.svg.el("rect", { x: x(b.q1), y: y0, width: Math.max(1, x(b.q3) - x(b.q1)), height: y1 - y0, rx: 4, class: "box-q" }, svg);
      LM.svg.el("line", { x1: x(b.med), x2: x(b.med), y1: y0 - 3, y2: y1 + 3, class: "mk-med tr-medline" }, svg);
      var mt = "Median " + LM.fmt(b.med, 2), mw = mt.length * 6.6;
      LM.svg.text(svg, Math.min(W - mw / 2 - 2, Math.max(mw / 2 + 2, x(b.med))), y0 - 9, mt, { class: "lbl lbl-med", "text-anchor": "middle" });
      var labs = [];
      if (!b.boxOnly) labs.push({ v: b.lo, t: "Min " + LM.fmt(b.lo, 2), c: "lbl tr-lbl-ink" });
      labs.push({ v: b.q1, t: "Q1 " + LM.fmt(b.q1, 2), c: "lbl lbl-q" });
      labs.push({ v: b.q3, t: "Q3 " + LM.fmt(b.q3, 2), c: "lbl lbl-q" });
      if (!b.boxOnly) labs.push({ v: b.hi, t: "Max " + LM.fmt(b.hi, 2), c: "lbl tr-lbl-ink" });
      // Beschriftungen nebeneinander, ohne Überlappung
      var pos = labs.map(function (l) { return { x: x(l.v), w: l.t.length * 6.8 + 8, l: l }; }), i;
      for (i = 1; i < pos.length; i++) {
        var minX = pos[i - 1].x + (pos[i - 1].w + pos[i].w) / 2;
        if (pos[i].x < minX) pos[i].x = minX;
      }
      var over = pos[pos.length - 1].x + pos[pos.length - 1].w / 2 - (W - 2);
      if (over > 0) pos.forEach(function (p) { p.x -= over; });
      var under = 2 - (pos[0].x - pos[0].w / 2);
      if (under > 0) pos.forEach(function (p) { p.x += under; });
      pos.forEach(function (p) { LM.svg.text(svg, p.x, y1 + 24, p.l.t, { class: p.l.c, "text-anchor": "middle" }); });
    }
    var rzT = 0;
    window.addEventListener("resize", function () {
      if (!chartRef || !chartRef.host.isConnected || !chartRef.host.offsetWidth) return;
      cancelAnimationFrame(rzT);
      rzT = requestAnimationFrame(function () { drawBox(chartRef.host, chartRef.data); });
    });

    /* ---------- Aufgabe aufbauen ---------- */
    function newTask() {
      task = tr.generate(tr.nextType(enabled(), lastType), st.level);
      lastType = task.type;
      state = Object.assign({}, S0);
      chartRef = null;
      renderTask();
      status.textContent = "";
      status.className = "feedback tr-status";
    }

    function renderTask() {
      card.innerHTML = "";
      card.classList.remove("tr-in");
      var t = TYPE[task.type], lv = LEVELS.filter(function (l) { return l.id === task.level; })[0];
      card.appendChild(h("div", { class: "tr-card-head" }, [
        h("span", { class: t.tag ? "tag tag-" + t.tag : "tag tr-tag-neutral", text: t.label }),
        h("span", { class: "tr-level", text: lv ? lv.label : "" })
      ]));
      card.appendChild(richEl("p", "tr-text", task.text));
      if (task.data) {
        var dw = h("div", { class: "tr-data" }, [h("div", { class: "tr-data-label", text: (task.dataLabel || "Werte") + " · n = " + task.data.length })]);
        LM.cards(dw, { values: task.data, small: true });
        card.appendChild(dw);
      }
      if (task.table) {
        card.appendChild(h("div", { class: "tr-data tr-tabbox" }, [
          task.table.label ? h("div", { class: "tr-data-label", html: rich(task.table.label) }) : null,
          tableEl(task.table)
        ]));
      }
      var ask = h("div", { class: "tr-ask" }, [richEl("p", "tr-ask-q", task.ask)]);
      if (task.round) ask.appendChild(h("p", { class: "tr-round", text: "Runde auf 2 Nachkommastellen." }));
      card.appendChild(ask);

      ui = { fields: [] };
      var fw = h("div", { class: "tr-fields" + (task.fields.length >= 4 ? " tr-fields-many" : "") });
      task.fields.forEach(function (f, idx) { fw.appendChild(fieldEl(f, idx)); });
      card.appendChild(fw);

      ui.checkBtn = h("button", { class: "btn btn-primary tr-check", text: "Prüfen", attrs: { type: "button" }, on: { click: checkAll } });
      ui.solBtn = h("button", { class: "btn tr-solbtn", text: "Lösung zeigen", attrs: { type: "button", "aria-expanded": "false" }, on: { click: toggleSolution } });
      ui.nextBtn = h("button", { class: "btn tr-next", attrs: { type: "button" }, on: { click: function () { newTask(); focusFirst(); } } },
        ["Nächste Aufgabe", h("span", { class: "arrow", attrs: { "aria-hidden": "true" }, text: "→" })]);
      card.appendChild(h("div", { class: "tr-actions" }, [ui.checkBtn, ui.solBtn, ui.nextBtn]));
      card.appendChild(status);
      ui.why = h("div", { class: "callout callout-tip tr-why", attrs: { hidden: "" } });
      card.appendChild(ui.why);
      ui.sol = h("div", { class: "solution tr-sol", attrs: { hidden: "" } });
      card.appendChild(ui.sol);
      if (!LM.reduceMotion) { void card.offsetWidth; card.classList.add("tr-in"); }
    }

    var fid = 0;
    function fieldEl(f, idx) {
      var id = "tr-f-" + (++fid);
      var fb = h("p", { class: "tr-fb", attrs: { id: id + "-fb" } });
      var box = h("div", { class: "tr-field tr-field-" + f.kind + (f.tag ? " tr-field-" + f.tag : "") });
      var rec = { f: f, box: box, fb: fb, none: false, choice: null };
      if (f.kind === "choice") {
        box.appendChild(h("span", { class: "tr-label", html: rich(f.label), attrs: { id: id + "-l" } }));
        var seg = h("div", { class: "seg tr-choice", attrs: { role: "group", "aria-labelledby": id + "-l" } });
        rec.btns = SKEW_OPTS.map(function (o) {
          var b = h("button", { attrs: { type: "button", "aria-pressed": "false", "data-value": o.value, "aria-describedby": id + "-fb" },
            on: { click: function () { pickChoice(rec, o.value); } } }, [
            h("span", { class: "tr-choice-main", text: o.label }),
            o.sub ? h("span", { class: "tr-choice-sub", text: o.sub }) : null
          ]);
          seg.appendChild(b);
          return b;
        });
        box.appendChild(seg);
      } else {
        box.appendChild(h("label", { class: "tr-label", html: rich(f.label), attrs: { for: id } }));
        var inp = h("input", { class: "num-input tr-input", attrs: { id: id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false",
          "aria-describedby": id + "-fb", placeholder: f.decimals === 0 ? "ganze Zahl" : "z. B. " + LM.fmt(8.5) } });
        inp.addEventListener("input", function () {
          inp.classList.remove("is-ok", "is-miss");
          if (rec.none) setNone(rec, false);
        });
        inp.addEventListener("keydown", function (e) {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (state.solved) { newTask(); focusFirst(); } else checkAll();
        });
        rec.input = inp;
        var row = h("div", { class: "tr-inrow" }, [inp]);
        if (f.kind === "mode") {
          rec.noneBtn = h("button", { class: "btn btn-sm tr-none", text: "kein Modus", attrs: { type: "button", "aria-pressed": "false" },
            on: { click: function () { setNone(rec, !rec.none); } } });
          row.appendChild(h("span", { class: "tr-or", text: "oder" }));
          row.appendChild(rec.noneBtn);
        }
        box.appendChild(row);
      }
      box.appendChild(fb);
      ui.fields[idx] = rec;
      return box;
    }
    function setNone(rec, on) {
      rec.none = on;
      rec.noneBtn.setAttribute("aria-pressed", String(on));
      rec.noneBtn.classList.remove("tr-c-ok", "tr-c-miss");
      rec.box.classList.toggle("tr-none-on", on);
      if (on) { rec.input.value = ""; rec.input.classList.remove("is-ok", "is-miss"); }
    }
    function pickChoice(rec, v) {
      rec.choice = v;
      rec.btns.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v));
        b.classList.remove("tr-c-ok", "tr-c-miss");
      });
    }
    function focusFirst() {
      var r = ui && ui.fields[0];
      if (!r) return;
      var target = r.input || r.btns[0];
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }

    /* ---------- Prüfen ---------- */
    function setFb(rec, cls, html) {
      rec.fb.className = "tr-fb" + (cls ? " " + cls : "");
      rec.fb.innerHTML = html || "";
    }
    function checkAll() {
      if (state.solved) return;
      var res = ui.fields.map(function (r) {
        return tr.evaluate(r.f, r.f.kind === "choice" ? r.choice : r.input.value, r.none);
      });
      var empty = res.filter(function (r) { return r.state === "empty"; }).length;
      if (empty) {
        ui.fields.forEach(function (r, i) { setFb(r, res[i].state === "empty" ? "is-empty" : "", res[i].state === "empty" ? rich(res[i].hint) : ""); });
        status.className = "feedback tr-status";
        status.textContent = empty === res.length ? "Trag zuerst deine Antwort ein." : "Füll noch " + (empty === 1 ? "das leere Feld" : "die " + empty + " leeren Felder") + " aus.";
        return;
      }
      state.tries++;
      var okN = 0;
      ui.fields.forEach(function (r, i) {
        var ok = res[i].state === "ok";
        if (ok) okN++;
        if (r.input) { r.input.classList.toggle("is-ok", ok && !r.none); r.input.classList.toggle("is-miss", !ok && !r.none); }
        if (r.btns) r.btns.forEach(function (b) {
          var mine = b.getAttribute("data-value") === r.choice;
          b.classList.toggle("tr-c-ok", mine && ok);
          b.classList.toggle("tr-c-miss", mine && !ok);
        });
        if (r.noneBtn) { r.noneBtn.classList.toggle("tr-c-ok", ok && r.none); r.noneBtn.classList.toggle("tr-c-miss", !ok && r.none); }
        setFb(r, ok ? "is-ok" : "is-miss", ok ? "✓ Richtig." : rich(String(res[i].hint).replace(/^Noch nicht\.\s*/, "")));
      });
      var allOk = okN === res.length;
      var first = !state.counted && !state.revealed;
      if (!state.counted) { state.counted = true; record(allOk && first); }
      if (allOk) {
        state.solved = true;
        status.className = "feedback ok tr-status";
        var msg = SUCCESS[Math.floor(Math.random() * SUCCESS.length)];
        status.textContent = msg + (first ? (st.streak > 1 ? " Serie: " + st.streak + " in Folge." : " Auf Anhieb gelöst.") : " Diesmal im " + state.tries + ". Versuch. Die nächste klappt auf Anhieb!");
        showWhy();
        ui.checkBtn.disabled = true;
        ui.nextBtn.classList.add("btn-primary");
        try { ui.nextBtn.focus({ preventScroll: true }); } catch (e) { ui.nextBtn.focus(); }
      } else {
        status.className = "feedback miss tr-status";
        status.textContent = (res.length > 1 ? okN + " von " + res.length + " richtig. " : "Noch nicht. ") + "Lies den Tipp und versuch es nochmal.";
        var r0 = ui.fields[res.map(function (r) { return r.state; }).indexOf("miss")];
        if (r0 && r0.input && !r0.none) { try { r0.input.focus({ preventScroll: true }); r0.input.select(); } catch (e) { /* egal */ } }
      }
    }
    function showWhy() {
      if (!task.why) return;
      ui.why.innerHTML = "";
      ui.why.appendChild(h("div", { class: "callout-title", text: "Warum?" }));
      ui.why.appendChild(richEl("p", "", task.why));
      ui.why.removeAttribute("hidden");
      var dup = ui.sol.querySelector(".tr-why-sol");
      if (dup) dup.remove();
    }

    /* ---------- Lösung ---------- */
    function buildSolution() {
      ui.sol.innerHTML = "";
      ui.sol.appendChild(h("h4", { text: "Rechenweg" }));
      var ol = h("ol", { class: "steps tr-steps" });
      task.steps.forEach(function (s) {
        var body = h("div", { class: "tr-step" }, [richEl("div", "tr-step-text", s.text)]);
        if (s.cards) {
          var cw = h("div", { class: "tr-step-cards" });
          var api = LM.cards(cw, { values: s.cards.values, sorted: true, small: true });
          (s.cards.marks || []).forEach(function (m) { api.mark(m.pos, m.cls); });
          body.appendChild(cw);
        }
        if (s.table) body.appendChild(tableEl(s.table));
        if (s.chart) {
          var host = h("div", { class: "chart tr-chart" });
          body.appendChild(host);
          chartRef = { host: host, data: s.chart };
        }
        ol.appendChild(h("li", {}, [body]));
      });
      ui.sol.appendChild(ol);
      var ans = h("div", { class: "tr-answers" }, [h("span", { class: "tr-answers-label", text: "Lösung" })]);
      task.fields.forEach(function (f) {
        ans.appendChild(h("span", { class: "tr-ans" + (f.tag ? " tr-ans-" + f.tag : "") }, [h("span", { class: "tr-ans-l", html: rich(f.short || f.label) }), h("b", { text: f.show })]));
      });
      ui.sol.appendChild(ans);
      if (task.why && ui.why.hasAttribute("hidden")) {
        ui.sol.appendChild(h("div", { class: "callout callout-tip tr-why-sol" }, [h("div", { class: "callout-title", text: "Warum?" }), richEl("p", "", task.why)]));
      }
    }
    function toggleSolution() {
      var open = ui.sol.hasAttribute("hidden");
      if (open) {
        if (!ui.sol.childNodes.length) buildSolution();
        ui.sol.removeAttribute("hidden");
        if (chartRef && chartRef.host.isConnected) drawBox(chartRef.host, chartRef.data);
        if (!state.revealed) {
          state.revealed = true;
          if (!state.counted && !state.solved) {
            state.counted = true;
            record(false);
            status.className = "feedback tr-status";
            status.textContent = "Kein Problem: Geh den Rechenweg in Ruhe durch. Die nächste Aufgabe schaffst du selbst.";
          }
        }
      } else ui.sol.setAttribute("hidden", "");
      ui.solBtn.textContent = open ? "Lösung ausblenden" : "Lösung zeigen";
      ui.solBtn.setAttribute("aria-expanded", String(open));
    }

    syncTypes();
    renderScore();
    newTask();
  });
})(typeof window !== "undefined" ? window : globalThis);
