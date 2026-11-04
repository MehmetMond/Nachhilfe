/*
 * Spielplatz (Kapitel 12): eigene Daten eingeben und alle Lagemaße mit Rechenweg sehen.
 * Eingabe als Liste oder als Häufigkeitstabelle. Kacheln mit allen Kennwerten, dazu getrimmtes, geometrisches
 * und harmonisches Mittel und die Schiefe. Punktdiagramm mit Boxplot, sortierte Zahlenkarten, Häufigkeitstabelle,
 * Rechenweg wie in der Klausur und R-Code zum Nachprüfen samt „Was R antwortet“.
 * Gerechnet wird nur mit LM.stats, Zahlen zeigt LM.fmt, Formeln setzt LM.tex.
 * Die reinen Hilfsfunktionen liegen in LM._pg (in Node: module.exports) für tests/playground.test.js.
 */
(function (root) {
  "use strict";
  var LM = (root.LM = root.LM || {});
  var MAX = 500;
  var EPS = 1e-9;
  var TRIM = 0.1;

  // Aufgabe 8 (Übungsblatt 2): 60 Reaktionszeiten in ms, in der Reihenfolge der Urliste
  var RT_A8 = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];

  var PRESETS = [
    { id: "f95u", label: "Folie 95 ungerade", values: [3, 6, 8, 9, 11],
      note: "Folie 95: n = 5 ist ungerade. Es gibt genau einen mittleren Platz." },
    { id: "f95g", label: "Folie 95 gerade", values: [3, 6, 8, 9, 11, 15],
      note: "Folie 95 mit einem Wert mehr: n = 6 ist gerade. Der Median liegt zwischen zwei Plätzen." },
    { id: "noten", label: "Noten (Folie 46)", values: [3, 5, 4, 3, 2, 3, 4, 6, 1, 2, 3, 3, 4, 5, 2, 1, 3, 4, 2, 4, 3, 1, 2, 3, 4],
      note: "25 Noten einer Klassenarbeit (Folie 46). Viele Werte kommen mehrfach vor. Für solche Daten ist die Eingabe als Häufigkeitstabelle bequem: Wert und Anzahl." },
    { id: "puls", label: "Ruhepuls (Folie 106)", values: [62, 64, 68, 70, 70, 74, 74, 76, 76, 78, 78, 80],
      note: "Ruhepuls von 12 Studentinnen (Folie 106). 12 · 0,25 = 3 ist eine ganze Zahl. Darum wird bei den Quartilen gemittelt." },
    { id: "warte", label: "Wartezeiten", values: [12, 5, 20, 8, 4, 38, 10, 5, 15],
      note: "Wartezeiten beim Arzt in Minuten (ausgedachtes Beispiel). Stell beim Boxplot range = 1.5 ein: Dann wird die 38 zum Ausreißer." },
    { id: "rt", label: "Reaktionszeiten (Aufgabe 8)", values: RT_A8,
      note: "60 Reaktionszeiten in Millisekunden aus Aufgabe 8. Mit genau diesen Daten rechnest du Aufgabe 10 von Übungsblatt 3. Stell beim Boxplot range = 1.5 ein: Dann werden 519,6 und 794,5 zu Ausreißern." }
  ];
  var DEFAULT_PRESET = 4; // Wartezeiten

  /* =====================================================================
     Reine Hilfsfunktionen (ohne DOM, in Node testbar)
     ===================================================================== */

  var core = { MAX: MAX, TRIM: TRIM, PRESETS: PRESETS, RT_A8: RT_A8 };

  // LM.fmt mit Gedächtnis: toLocaleString ist langsam, und Tabelle und Diagramm zeigen dieselben Zahlen immer wieder.
  // Das Ergebnis ist genau das von LM.fmt.
  var fmtMemo = {}, fmtCount = 0;
  function fmtc(v, d) {
    var key = d + ":" + v, s = fmtMemo[key];
    if (s === undefined) {
      if (++fmtCount > 5000) { fmtMemo = {}; fmtCount = 1; }
      s = fmtMemo[key] = LM.fmt(v, d);
    }
    return s;
  }
  core.fmtc = fmtc;
  function I(v) { return fmtc(v, 0); }
  // Das Kommentar-Zeichen markiert das Ende der Formel: stepsHtml zieht ein direkt folgendes Satzzeichen mit in die Formel,
  // damit ein Punkt nach einer langen Formel nicht allein am Zeilenanfang steht.
  function fx(src) { return '<span class="pg-f">' + LM.tex(src) + "<!--f--></span>"; }
  core.glue = function (html) { return html.replace(/<!--f--><\/span>([.,:;!?])/g, "$1</span>"); };
  // Formel in eigener Zeile (für Brüche, die im Fließtext zu klein wären)
  function fb(src) { return '<div class="pg-fb">' + LM.tex(src, true) + "</div>"; }
  // Werte aufzählen. Hat ein Wert ein Dezimalkomma, trennt ein Semikolon (sonst liest man „8,5, 9“ falsch).
  function sepFor(list) { return list.some(function (s) { return String(s).indexOf(",") >= 0; }) ? "; " : ", "; }
  function joinVals(list) { return list.join(sepFor(list)); }
  function und(list) {
    if (list.length < 2) return list.join("");
    return list.slice(0, -1).join(sepFor(list)) + " und " + list[list.length - 1];
  }
  function places(pos) {
    return pos.length === 1 ? "Platz " + I(pos[0]) : "Plätze " + I(pos[0]) + " und " + I(pos[1]);
  }
  core.places = places;
  core.und = und;
  core.joinVals = joinVals;

  // Nachkommastellen einer Zahl (höchstens 6)
  core.decimalsOf = function (v) {
    var s = String(+Number(v).toPrecision(12));
    if (/e/i.test(s)) return 6;
    var i = s.indexOf(".");
    return i < 0 ? 0 : Math.min(6, s.length - i - 1);
  };

  // So viele Nachkommastellen zeigen wir an: eine mehr als in den Daten, mindestens 2 (wie in der Klausur).
  core.digits = function (xs) {
    var d = 0;
    for (var i = 0; i < xs.length; i++) d = Math.max(d, core.decimalsOf(xs[i]));
    return Math.min(6, Math.max(2, d + 1));
  };

  // Lässt sich v mit d Nachkommastellen genau schreiben?
  core.exact = function (v, d) {
    var f = Math.pow(10, d);
    return Math.abs(v * f - Math.round(v * f)) < 1e-6;
  };

  // Nachkommastellen, damit v mit k gültigen Ziffern erscheint (für Kehrwerte und Logarithmen)
  core.sigDec = function (v, k) {
    if (!isFinite(v) || v === 0) return 0;
    return Math.max(0, Math.min(12, k - 1 - Math.floor(Math.log10(Math.abs(v)) + 1e-12)));
  };

  // Zahl mit Vorzeichen: +17,01 / −3,5 / 0
  core.signed = function (v, d) {
    var s = LM.fmt(v, d);
    return v > 0 && s !== "0" ? "+" + s : s;
  };

  // So viele Stellen braucht x̄ − x̃, damit ein kleiner Unterschied nicht als 0 erscheint
  core.skewDigits = function (diff, D) {
    var d = D;
    while (diff !== 0 && LM.fmt(diff, d) === "0" && d < 8) d++;
    return d;
  };

  // Zahl für TeX: Dezimalkomma als {,}, Minus als -
  core.tn = function (v, d) { return LM.fmt(v, d).replace(",", "{,}").replace("−", "-"); };
  // dasselbe, negative Zahlen in Klammern (für Summen)
  core.tnp = function (v, d) { var s = core.tn(v, d); return s.charAt(0) === "-" ? "(" + s + ")" : s; };
  // Zehnerpotenz-Schreibweise aus dem Zehnerlogarithmus (klappt auch für riesige Produkte): 2{,}31 \cdot 10^{143}
  core.texSci = function (log10v, sig) {
    var e = Math.floor(log10v), m = Math.pow(10, log10v - e), d = (sig || 3) - 1;
    if (LM.fmt(m, d) === LM.fmt(10, d)) { m = 1; e += 1; }
    return core.tn(m, d) + " \\cdot 10^{" + e + "}";
  };
  // Produkt als TeX, lange Produkte gekürzt
  core.prodTex = function (terms, limit) {
    limit = limit || 10;
    if (terms.length > limit) terms = terms.slice(0, 3).concat(["\\ldots"], terms.slice(-1));
    return terms.join(" \\cdot ");
  };

  // Wörter zur Schiefe (Folien 140 und 142)
  core.skewWord = function (dir) {
    return dir === "rechtsschief" ? "rechtsschief = linkssteil" : dir === "linksschief" ? "linksschief = rechtssteil" :
      dir === "symmetrisch" ? "symmetrisch" : "nicht definiert";
  };
  // Folie 140 sagt bei x̄ − x̃ „tendenziell“, Folie 142 beim Quartilskoeffizienten nicht
  function skewPhrase(dir, tend) {
    var t = tend ? "tendenziell " : "";
    if (dir === "rechtsschief") return t + "<b>rechtsschief</b> bzw. <b>linkssteil</b> (positive Schiefe)";
    if (dir === "linksschief") return t + "<b>linksschief</b> bzw. <b>rechtssteil</b> (negative Schiefe)";
    return "<b>symmetrisch</b> (keine Schiefe)";
  }
  function relSign(dir) { return dir === "rechtsschief" ? ">" : dir === "linksschief" ? "<" : "="; }

  // p für das eigene Quantil: "0,8", "0.8", "80 %", "2/3"
  core.parseP = function (text) {
    var s = String(text === null || text === undefined ? "" : text).replace(/\s+/g, "");
    var m = /^(\d+)\/(\d+)$/.exec(s);
    if (m) {
      var a = Number(m[1]), b = Number(m[2]), q = b ? a / b : NaN;
      return { p: q, frac: [a, b], ok: q > 0 && q < 1 };
    }
    var pct = /%$/.test(s), v = LM.parseNum(pct ? s.slice(0, -1) : s);
    if (pct) v = v / 100;
    return { p: v, frac: null, ok: isFinite(v) && v > 0 && v < 1 };
  };
  core.texP = function (pp) { return pp.frac ? "\\tfrac{" + pp.frac[0] + "}{" + pp.frac[1] + "}" : core.tn(pp.p, 6); };
  core.texPsub = function (pp) { return pp.frac ? pp.frac[0] + "/" + pp.frac[1] : core.tn(pp.p, 6); };

  /* ---------- Eingabe lesen ---------- */

  core.readList = function (text) {
    var r = LM.parseList(text), values = r.values, cut = 0;
    if (values.length > MAX) { cut = values.length - MAX; values = values.slice(0, MAX); }
    return { values: values, bad: r.bad, total: r.values.length, cut: cut, problems: [], incomplete: 0 };
  };

  // Zeilen {v: "Wert", h: "Anzahl"} der Häufigkeitstabelle → Werte. Leere Felder zählen nicht als Fehler.
  core.readRows = function (rows) {
    var vals = [], counts = [], problems = [], total = 0, incomplete = 0;
    (rows || []).forEach(function (row, i) {
      var vs = String(row && row.v !== undefined && row.v !== null ? row.v : "").trim();
      var hs = String(row && row.h !== undefined && row.h !== null ? row.h : "").trim();
      if (!vs && !hs) return;
      var v = LM.parseNum(vs), c = LM.parseNum(hs);
      var vOk = isFinite(v), cOk = isFinite(c) && c >= 0 && Math.abs(c - Math.round(c)) < EPS;
      if (vs && !vOk) problems.push({ row: i, field: "v" });
      if (hs && !cOk) problems.push({ row: i, field: "h" });
      if (!vs || !hs) { incomplete++; return; }
      if (vOk && cOk && c > 0) { vals.push(v); counts.push(Math.round(c)); total += Math.round(c); }
    });
    var left = MAX;
    var capped = counts.map(function (c) { var t = Math.min(c, left); left -= t; return t; });
    return { values: LM.stats.expand(vals, capped), bad: [], total: total, cut: Math.max(0, total - MAX), problems: problems, incomplete: incomplete };
  };

  core.rowsFromValues = function (xs) {
    return LM.stats.freq(xs).map(function (r) { return { v: fmtc(r.value, 6), h: I(r.h) }; });
  };
  core.textFromValues = function (xs) {
    return xs.map(function (v) { return fmtc(v, 6); }).join("; ");
  };

  // Typische Tippfehler erklären
  core.badHint = function (bad) {
    if (bad.some(function (t) { return /^-?\d+(,\d+){2,}$/.test(t); })) {
      return "Ein Komma zwischen zwei Ziffern ist ein Dezimalkomma. Trenne die Zahlen mit Leerzeichen oder Semikolon, also 12; 5; 20.";
    }
    if (bad.some(function (t) { return /^-?\d+([.,]\d+)?[^\d\s.,;-]+$/.test(t); })) {
      return "Schreib die Zahlen ohne Einheit, also 12 statt 12min.";
    }
    return "";
  };

  // Zufallsdaten: n ganze Zahlen von 0 bis 50, meist um eine Mitte gehäuft, ab und zu ein Ausreißer
  core.random = function (n, rnd) {
    rnd = rnd || Math.random;
    var mid = 8 + rnd() * 34, spread = 3 + rnd() * 8, out = [];
    for (var i = 0; i < n; i++) {
      var v = rnd() < 0.12 ? rnd() * 50 : mid + (rnd() + rnd() + rnd() - 1.5) * 2 * spread;
      out.push(Math.max(0, Math.min(50, Math.round(v))));
    }
    return out;
  };

  /* ---------- R: Code mit Kommentaren und „Was R antwortet“ ---------- */

  core.rNum = function (v) { return String(+Number(v).toPrecision(12)); };
  core.rP = function (pp) { return pp.frac ? pp.frac[0] + "/" + pp.frac[1] : core.rNum(pp.p); };

  core.rVector = function (xs, width) {
    width = width || 66;
    var head = "x <- c(", ind = "       ", lines = [], line = head;
    for (var i = 0; i < xs.length; i++) {
      var tok = core.rNum(xs[i]) + (i < xs.length - 1 ? "," : "");
      var fresh = line === head || line === ind;
      if (!fresh && line.length + 1 + tok.length > width) { lines.push(line); line = ind; fresh = true; }
      line += (fresh ? "" : " ") + tok;
    }
    lines.push(line + ")");
    return lines.join("\n");
  };

  function padL(s, w) { s = String(s); while (s.length < w) s = " " + s; return s; }
  function halfEven(v) {
    var f = Math.floor(v), d = v - f;
    return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
  }

  // Wie R eine Zahl für `digits` gültige Ziffern zerlegt (scientific() in R, src/main/format.c)
  core.rSci = function (x, digits) {
    if (x === 0) return { neg: 0, kpower: 0, nsig: 1, rw: false };
    var neg = x < 0 ? 1 : 0, r = Math.abs(x);
    var kp = Math.floor(Math.log10(r)) - digits + 1;
    var rp = kp >= 0 ? r / Math.pow(10, kp) : r * Math.pow(10, -kp);
    if (rp < Math.pow(10, digits - 1)) { rp *= 10; kp--; }
    var alpha = halfEven(rp), nsig = digits;
    for (var j = 1; j <= digits; j++) {
      alpha /= 10;
      if (alpha === Math.floor(alpha)) nsig--; else break;
    }
    if (nsig === 0) { nsig = 1; kp += 1; }
    var kpower = kp + digits - 1;
    var rgt = Math.max(0, Math.min(22, digits - kpower));
    var rw = kpower > 0 && kpower <= 22 && r < Math.pow(10, kpower) - 0.5 / Math.pow(10, rgt);
    return { neg: neg, kpower: kpower, nsig: nsig, rw: rw };
  };

  // Gemeinsames Format aller Zahlen eines Vektors, wie print() in R (formatReal): fest oder wissenschaftlich
  core.rFormat = function (xs, digits) {
    digits = digits || 7;
    var neg = 0, rgt = -1e9, mxl = -1e9, mnl = 1e9, mxsl = -1e9, mxns = -1e9;
    xs.forEach(function (x) {
      var s = core.rSci(x, digits), left = s.kpower + 1;
      if (s.rw) left--;
      var sleft = s.neg + (left <= 0 ? 1 : left), right = s.nsig - left;
      if (s.neg) neg = 1;
      if (right > rgt) rgt = right;
      if (left > mxl) mxl = left;
      if (left < mnl) mnl = left;
      if (sleft > mxsl) mxsl = sleft;
      if (s.nsig > mxns) mxns = s.nsig;
    });
    if (mxl < 0) mxsl = 1 + neg;
    if (rgt < 0) rgt = 0;
    var wF = mxsl + rgt + (rgt ? 1 : 0);
    var e = mxl > 100 || mnl <= -99 ? 2 : 1, d = mxns - 1;
    var wE = neg + (d > 0 ? 1 : 0) + d + 4 + e;
    var fixed = wF <= wE, w = fixed ? wF : wE;
    var strs = xs.map(function (x) {
      var t = fixed ? x.toFixed(rgt) : x.toExponential(d).replace(/e([+-])(\d+)$/, function (m, sg, ex) {
        while (ex.length < e + 1) ex = "0" + ex;
        return "e" + sg + ex;
      });
      return padL(t, w);
    });
    return { w: w, fixed: fixed, d: fixed ? rgt : d, s: strs };
  };

  // print() eines Zahlenvektors ohne Namen: „[1] 4 5 …“, Umbruch nach 80 Zeichen mit neuer Platznummer
  core.rVec = function (xs, width) {
    width = width || 80;
    var n = xs.length;
    if (!n) return ["numeric(0)"];
    var F = core.rFormat(xs), w = F.w + 1, labw = String(n).length + 2;
    var lines = [], line = padL("[1]", labw), cur = labw;
    for (var i = 0; i < n; i++) {
      if (i > 0 && cur + w > width) { lines.push(line); line = padL("[" + (i + 1) + "]", labw); cur = labw; }
      line += padL(F.s[i], w);
      cur += w;
    }
    lines.push(line);
    return lines;
  };

  // print() eines Vektors mit Namen (quantile, table): Namen über den Werten, alles rechtsbündig gleich breit
  core.rNamed = function (names, vals, width) {
    width = width || 80;
    var w = 0, lines = [];
    names.concat(vals).forEach(function (s) { w = Math.max(w, String(s).trim().length); });
    var per = Math.max(1, Math.floor(width / (w + 1)));
    for (var i = 0; i < names.length; i += per) {
      lines.push(names.slice(i, i + per).map(function (s) { return padL(s, w) + " "; }).join(""));
      lines.push(vals.slice(i, i + per).map(function (s) { return padL(String(s).trim(), w) + " "; }).join(""));
    }
    return lines;
  };

  // as.character() einer Zahl (bis 15 gültige Ziffern): So heißen die Spalten von table(x)
  core.rChar = function (v) { return core.rFormat([v], 15).s[0].trim(); };

  core.rTable = function (xs) {
    var t = LM.stats.freq(xs);
    return ["x"].concat(core.rNamed(t.map(function (r) { return core.rChar(r.value); }), t.map(function (r) { return String(r.h); })));
  };

  // Name eines Quantils in R: 25%, 80%, 66.66667%
  core.rQName = function (p) { return String(+(100 * p).toPrecision(7)) + "%"; };

  // quantile(x, p, type = 2) genau wie R rechnet (mit Rundungsfehlern des Computers). Fast immer gleich der Regel
  // von Folie 101. Ausnahme: n · p liegt im Computer knapp neben einer ganzen Zahl (z. B. 90 · 0.7 = 62.99999999999999).
  core.rQuantile = function (xs, p) {
    var s = LM.stats.sorted(xs), n = s.length;
    var np = n * p, j = Math.floor(np + 4 * 2.220446049250313e-16), h = np > j ? 1 : 0.5;
    var a = s[Math.max(0, Math.min(n - 1, j - 1))], b = s[Math.max(0, Math.min(n - 1, j))];
    if (h === 1) return b;
    return a === b ? a : 0.5 * a + 0.5 * b;
  };

  // mean() wie in R: R addiert mit erhöhter Genauigkeit, heraus kommt (praktisch immer) der exakt gerundete Mittelwert.
  // Ein einfaches Aufsummieren kann in der 7. Stelle danebenliegen (z. B. 239.1187 statt 239.1188 bei Aufgabe 10).
  // Darum hier exakt mit ganzen Zahlen (BigInt), nur für „Was R antwortet“. Ohne BigInt: normales Mittel.
  function f64parts(d) {
    var B = BigInt, dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, d);
    var hi = dv.getUint32(0), lo = dv.getUint32(4), ex = (hi >>> 20) & 0x7ff;
    var m = (B(hi & 0xfffff) << B(32)) | B(lo);
    if (ex === 0) ex = 1; else m = m | (B(1) << B(52));
    return { m: hi >>> 31 ? -m : m, e: ex - 1075 };
  }
  function ldexp(x, e) {
    while (e > 1000) { x *= Math.pow(2, 1000); e -= 1000; }
    while (e < -1000) { x *= Math.pow(2, -1000); e += 1000; }
    return x * Math.pow(2, e);
  }
  core.rMean = function (xs) {
    var n = xs.length;
    if (!n) return NaN;
    if (typeof BigInt !== "function" || typeof DataView !== "function") return LM.stats.mean(xs);
    var B = BigInt, parts = xs.map(f64parts), emin = Infinity, sum = B(0), i;
    for (i = 0; i < n; i++) if (parts[i].m !== B(0) && parts[i].e < emin) emin = parts[i].e;
    if (emin === Infinity) return 0; // nur Nullen
    for (i = 0; i < n; i++) if (parts[i].m !== B(0)) sum += parts[i].m << B(parts[i].e - emin);
    if (sum === B(0)) return 0;
    var neg = sum < B(0);
    if (neg) sum = -sum;
    // Quotient auf etwa 70 Bit bringen: sum · 2^k / n, dann mal 2^(emin − k)
    var N = B(n), k = 70 - (sum.toString(2).length - N.toString(2).length);
    var num = k >= 0 ? sum << B(k) : sum, den = k >= 0 ? N : N << B(-k), q = num / den;
    if (num % den !== B(0)) { q = (q << B(1)) | B(1); k += 1; } // Rest merken, damit richtig gerundet wird
    var v = ldexp(Number(q), emin - k);
    return neg ? -v : v;
  };

  var TINY_NOTE = "Diese winzige Zahl ist ein Rundungsfehler im Computer. Gemeint ist 0.";

  // Bausteine des R-Codes: {cmt, code, out: [Zeilen], note, gap}
  core.rItems = function (xs, opts) {
    opts = opts || {};
    var S = LM.stats, s = S.sorted(xs), n = s.length, items = [];
    var scale = n ? Math.max(Math.abs(s[0]), Math.abs(s[n - 1]), 1) : 1;
    function num(v, snap) {
      var t = snap && v !== 0 && Math.abs(v) < 1e-9 * scale;
      return { out: core.rVec([v]), note: t ? TINY_NOTE : "" };
    }
    var rmean = core.rMean(xs);
    function add(o, extra) { var k; for (k in extra) o[k] = extra[k]; items.push(o); }
    var dec = xs.some(function (v) { return core.decimalsOf(v) > 0; });
    items.push({ gap: true, cmt: "# deine Zahlen als Vektor x" + (dec ? " (in R mit Punkt statt Komma)" : ""), code: core.rVector(xs), out: [] });
    items.push({ gap: true, cmt: "# der Größe nach sortiert", code: "sort(x)", out: core.rVec(s) });
    items.push({ cmt: "# Häufigkeiten: Wie oft kommt jeder Wert vor?", code: "table(x)", out: core.rTable(xs) });
    add({ cmt: "# Median", code: "median(x)" }, num(S.median(xs), true));
    add({ cmt: "# arithmetisches Mittel", code: "mean(x)" }, num(rmean, true));
    items.push({ cmt: "# Q1 und Q3 mit der Regel von Folie 101 (type = 2)", code: "quantile(x, probs = c(0.25, 0.75), type = 2)",
      out: core.rNamed(["25%", "75%"], core.rFormat([core.rQuantile(xs, 0.25), core.rQuantile(xs, 0.75)]).s) });
    if (opts.p && opts.p.ok) {
      var p = opts.p.p, rv = core.rQuantile(xs, p), sv = S.quantile(xs, p), note = "";
      if (!LM.near(rv, sv, 1e-12)) {
        note = "Achtung: n · p ist im Computer nicht ganz genau " + I(Math.round(n * p)) + ". Darum nimmt R hier nur einen Platz. " +
          "Nach Folie 101 ist das Ergebnis " + LM.fmt(sv, 6) + ".";
      }
      items.push({ cmt: "# dein eigenes p-Quantil", code: "quantile(x, probs = " + core.rP(opts.p) + ", type = 2)",
        out: core.rNamed([core.rQName(p)], core.rFormat([rv]).s), note: note });
    }
    items.push({ gap: true, cmt: "# Boxplot, liegend, Whisker bis Minimum und Maximum", code: "boxplot(x, horizontal = TRUE, range = 0)", out: [],
      note: "Keine Ausgabe in der Konsole. R zeichnet den Boxplot unten rechts bei „Plots“." });
    if (opts.range) {
      items.push({ cmt: "# so zeichnet R ohne range: Whisker höchstens 1,5 Quartilabstände lang", code: "boxplot(x, horizontal = TRUE)", out: [],
        note: "Wieder nur ein Bild. Werte außerhalb der Grenzen erscheinen als einzelne Punkte." });
    }
    add({ gap: true, cmt: "# getrimmtes Mittel (Folie 116): 10 % unten und 10 % oben weg (R-Befehl nicht auf den Folien)", code: "mean(x, trim = 0.1)" },
      num(core.rMean(S.trimInfo(xs, TRIM).kept), true));
    if (S.allPositive(xs)) {
      add({ cmt: "# geometrisches Mittel (Folie 118)", code: "exp(mean(log(x)))" }, num(Math.exp(core.rMean(xs.map(Math.log))), false));
      add({ cmt: "# harmonisches Mittel (Folie 120): n durch die Summe der Kehrwerte (R-Befehl nicht auf den Folien)", code: "1 / mean(1 / x)" },
        num(1 / core.rMean(xs.map(function (v) { return 1 / v; })), false));
    } else {
      items.push({ cmt: "# geometrisches und harmonisches Mittel gibt es nur, wenn alle Werte größer als 0 sind" });
    }
    add({ gap: true, cmt: "# Schiefe: Mittel minus Median (Folie 150). Größer als 0 heißt rechtsschief.", code: "mean(x) - median(x)" },
      num(rmean - S.median(xs), true));
    return items;
  };

  // Der Code als Text (so wird er kopiert)
  core.rCodeText = function (items) {
    var out = [];
    items.forEach(function (it, i) {
      if (it.gap && i) out.push("");
      if (it.cmt) out.push(it.cmt);
      if (it.code) out.push(it.code);
    });
    return out.join("\n");
  };

  // Die Konsole: Befehl mit „> “ (Folgezeilen „+ “), darunter die Ausgabe. {echo} | {out} | {note}
  core.rAnswer = function (items) {
    var out = [];
    items.forEach(function (it) {
      if (!it.code) return;
      it.code.split("\n").forEach(function (l, i) { out.push({ echo: (i ? "+ " : "> ") + l }); });
      (it.out || []).forEach(function (l) { out.push({ out: l }); });
      if (it.note) out.push({ note: "(" + it.note + ")" });
    });
    return out;
  };

  /* ---------- Diagramm-Helfer ---------- */

  // Beschriftungen ohne Überlappung in Zeilen verteilen.
  // items: [{x, w, anchor}] mit anchor "start" (rechts von x), "end" (links von x) oder "middle".
  core.layoutLabels = function (items, minX, maxX, gap, off) {
    gap = gap === undefined ? 6 : gap;
    off = off === undefined ? 4 : off;
    var placed = items.map(function (it) {
      var a = it.anchor || "middle", w = it.w;
      if (a === "end" && it.x - off - w < minX) a = "start";
      else if (a === "start" && it.x + off + w > maxX) a = "end";
      var left = a === "end" ? it.x - off - w : a === "start" ? it.x + off : it.x - w / 2;
      left = Math.max(minX, Math.min(maxX - w, left));
      return { left: left, right: left + w, anchor: a, row: 0 };
    });
    var order = placed.map(function (p, i) { return i; }).sort(function (a, b) { return placed[a].left - placed[b].left || a - b; });
    var ends = [];
    order.forEach(function (i) {
      var p = placed[i], row = 0;
      while (row < ends.length && ends[row] + gap > p.left) row++;
      ends[row] = p.right;
      p.row = row;
    });
    return { items: placed, rows: Math.max(1, ends.length) };
  };

  // Punkte stapeln: gleiche Werte übereinander. Liegen verschiedene Werte näher als ein Punktdurchmesser,
  // kommen sie in denselben Stapel (sonst überdecken sie sich).
  core.stacks = function (table, X, r) {
    var groups = [];
    table.forEach(function (row) {
      var px = X(row.value), g = groups[groups.length - 1];
      if (g && px - g.start < 2 * r - 0.01) { g.rows.push(row); g.count += row.h; g.wsum += px * row.h; }
      else groups.push({ start: px, rows: [row], count: row.h, wsum: px * row.h });
    });
    groups.forEach(function (g) { g.px = g.rows.length === 1 ? g.start : g.wsum / g.count; });
    return groups;
  };

  // Welche Plätze einer langen sortierten Liste zeigen? null steht für „…“.
  core.window = function (n, marks, limit) {
    limit = limit || 21;
    var out = [], i;
    if (n <= limit) { for (i = 1; i <= n; i++) out.push(i); return out; }
    var keep = {};
    [1, 2, n - 1, n].forEach(function (p) { keep[p] = true; });
    (marks || []).forEach(function (p) { for (var k = p - 2; k <= p + 2; k++) if (k >= 1 && k <= n) keep[k] = true; });
    var idx = Object.keys(keep).map(Number).sort(function (a, b) { return a - b; });
    idx.forEach(function (p, k) {
      if (k) {
        var gap = p - idx[k - 1];
        if (gap === 2) out.push(p - 1);
        else if (gap > 2) out.push(null);
      }
      out.push(p);
    });
    return out;
  };

  /* ---------- Bausteine für den Rechenweg ---------- */

  // Sortierte Liste als kleine Karten, markierte Plätze farbig. marks: [{positions, cls}].
  // anchors (optional): um diese Plätze herum wird die lange Liste gezeigt (sonst um alle markierten).
  core.seqHtml = function (sorted, marks, D, label, anchors) {
    var pos = anchors || [];
    if (!anchors) marks.forEach(function (m) { pos = pos.concat(m.positions); });
    var items = core.window(sorted.length, pos).map(function (p) {
      if (p === null) return '<span class="pg-si pg-gap" aria-hidden="true">…</span>';
      var cls = "", extra = "";
      marks.forEach(function (m) {
        if (m.positions.indexOf(p) >= 0) { cls = " is-" + m.cls; if (m.cls === "cut") extra = ", gestrichen"; }
      });
      var v = LM.esc(fmtc(sorted[p - 1], D));
      return '<span class="pg-si' + cls + '" role="listitem" aria-label="Platz ' + I(p) + ": " + v + extra + '"><span class="pg-sv">' + v +
        '</span><span class="pg-sp">x<sub>(' + I(p) + ")</sub></span></span>";
    });
    return '<div class="pg-seq" role="list" aria-label="' + LM.esc(label || "Sortierte Werte") + '">' + items.join("") + "</div>";
  };

  // Wie oft kommt jeder Wert vor? Bei vielen verschiedenen Werten nur die häufigsten.
  core.countsHtml = function (table, max, D) {
    var rows = table, rest = 0;
    if (table.length > 16) {
      rows = table.filter(function (r) { return r.h === max; }).slice(0, 12);
      rest = table.length - rows.length;
    }
    var html = rows.map(function (r) {
      var top = r.h === max && (max > 1 || table.length === 1);
      return '<span class="pg-cnt' + (top ? " is-top" : "") + '"><span class="pg-cnt-v">' + LM.esc(fmtc(r.value, D)) +
        '</span><span class="pg-cnt-h" aria-label="' + I(r.h) + '-mal">' + I(r.h) + "×</span></span>";
    }).join("");
    if (rest) html += '<span class="pg-cnt-more">und ' + I(rest) + " weitere Werte, die seltener vorkommen</span>";
    return '<div class="pg-counts">' + html + "</div>";
  };

  // Summe als TeX: "12 + 5 + (-3) + …", lange Summen gekürzt
  core.sumTex = function (terms, limit) {
    limit = limit || 12;
    if (terms.length > limit) terms = terms.slice(0, 4).concat(["\\dots"], terms.slice(-1));
    return terms.join(" + ");
  };

  // „(134,8; 147,2 und 148,1)“, viele Werte gekürzt
  function shortList(vals, f) {
    var t = vals.map(f);
    if (t.length > 6) return "(" + joinVals(t.slice(0, 3)) + " … " + joinVals(t.slice(-2)) + ")";
    return "(" + und(t) + ")";
  }

  // Alles, was die Bausteine brauchen
  core.ctx = function (xs) {
    var S = LM.stats, sum = S.summary(xs), D = core.digits(xs);
    return { xs: xs, s: sum.sorted, n: sum.n, D: D, f: function (v) { return fmtc(v, D); }, sum: sum, freq: S.freq(xs) };
  };

  core.stepsMode = function (c) {
    var mi = c.sum.mode, f = c.f, max = mi.maxCount, steps = [];
    steps.push("<b>Zählen.</b> Wie oft kommt jeder Wert vor?" + core.countsHtml(mi.table, max, c.D));
    if (mi.allEqual) steps.push("<b>Größte Anzahl suchen.</b> Jeder Wert kommt " + I(max) + "-mal vor.");
    else steps.push("<b>Größte Anzahl suchen.</b> Die größte Anzahl ist " + I(max) + ".");
    var result;
    if (mi.unique) {
      var v = mi.value;
      steps.push("<b>Wert ablesen.</b> " +
        (mi.table.length === 1 ? "Es gibt nur den Wert " + f(v) + "." : "Nur der Wert " + f(v) + " kommt " + I(max) + "-mal vor.") +
        " Also ist " + fx("x_{\\text{mod}} = " + core.tn(v, c.D)) + "." +
        (LM.near(v, max) ? "" : '<p class="pg-warnline"><b>Achtung:</b> Der Modus ist der Wert ' + f(v) + ", nicht die Anzahl " + I(max) + ".</p>"));
      result = { text: f(v), tex: "x_{\\text{mod}} = " + core.tn(v, c.D), unique: true };
    } else if (mi.allEqual) {
      steps.push("<b>Gibt es einen Gipfel?</b> Nein. Kein Wert kommt öfter vor als die anderen. Darum gibt es <b>keinen Modus</b> (Folie 92).");
      result = { text: "kein eindeutiger", tex: null, unique: false };
    } else {
      var vals = mi.values.map(f);
      steps.push("<b>Ist er eindeutig?</b> Nein. " + und(vals) + " kommen " + (vals.length === 2 ? "beide " : "alle ") + I(max) +
        "-mal vor. Der häufigste Wert ist nicht eindeutig, also gibt es <b>keinen Modus</b> (Folie 92).");
      result = { text: "kein eindeutiger", tex: null, unique: false };
    }
    return { steps: steps, result: result };
  };

  core.stepsMedian = function (c) {
    var mi = c.sum.median, n = c.n, D = c.D, s = c.s, tn = core.tn, steps = [];
    steps.push("<b>Sortieren.</b> Schreib die Werte der Größe nach auf." + core.seqHtml(s, [{ positions: mi.positions, cls: "med" }], D));
    steps.push("<b>Zählen.</b> " + fx("n = " + n) + " ist " + (mi.odd ? "ungerade." : "gerade."));
    if (mi.odd) {
      var k = mi.positions[0];
      steps.push("<b>Mittleren Platz finden.</b> " + fx("\\frac{n+1}{2} = \\frac{" + n + "+1}{2} = " + k));
      steps.push("<b>Ablesen.</b> " + fx("\\tilde{x} = x_{(" + k + ")} = " + tn(mi.value, D)));
    } else {
      var a = mi.positions[0], b = mi.positions[1];
      steps.push("<b>Die zwei mittleren Plätze.</b> " + fx("\\frac{n}{2} = \\frac{" + n + "}{2} = " + a) +
        " und der Platz danach, also " + places([a, b]) + ".");
      steps.push("<b>Mittel der beiden bilden.</b> " + fx("\\tilde{x} = \\tfrac{1}{2}\\left[x_{(" + a + ")} + x_{(" + b + ")}\\right] = \\tfrac{1}{2}(" +
        tn(s[a - 1], D) + " + " + core.tnp(s[b - 1], D) + ") = " + tn(mi.value, D)));
    }
    return { steps: steps, result: { text: c.f(mi.value), tex: "\\tilde{x} = " + tn(mi.value, D) } };
  };

  core.stepsMean = function (c) {
    var S = LM.stats, mi = c.sum.mean, n = c.n, D = c.D, f = c.f, tn = core.tn, tnp = core.tnp, t = c.freq, steps = [];
    var terms = c.xs.map(function (v, i) { return i ? tnp(v, D) : tn(v, D); });
    steps.push("<b>Alles addieren.</b> " + fx("\\sum x_i = " + core.sumTex(terms) + " = " + tn(mi.sum, D)));
    if (t.length < n) {
      var prods = t.map(function (r) { return I(r.h) + " \\cdot " + tnp(r.value, D); });
      steps.push("<b>Oder schneller mit Häufigkeiten</b> (Folie 111): Jeden Wert mal seine Anzahl, dann addieren. " +
        fx("\\sum h_j \\cdot a_j = " + core.sumTex(prods, 8) + " = " + tn(mi.sum, D)));
    }
    var exact = core.exact(mi.value, D);
    steps.push("<b>Durch n teilen.</b> " + fx("\\bar{x} = \\frac{1}{n}\\sum x_i = " + tn(mi.sum, D) + " \\div " + n + (exact ? " = " : " \\approx ") + tn(mi.value, D)) +
      (t.length < n ? " Teil durch alle " + I(n) + " Werte, nicht durch die " + I(t.length) + " verschiedenen." : ""));
    var dev = mi.deviations;
    var up = S.sum(dev.filter(function (d) { return d > 0; })), down = S.sum(dev.filter(function (d) { return d < 0; }));
    var probe = "<b>Probe mit der Nulleigenschaft</b> (Folie 114). Die Abstände zum Mittel heben sich immer auf.";
    if (n <= 10 && exact) {
      probe += '<div class="pg-fb">' + LM.tex(c.xs.map(function (x) { return "(" + tn(x, D) + " - " + tnp(mi.value, D) + ")"; }).join(" + ")) + "</div>";
      probe += '<div class="pg-fb">' + LM.tex("= " + dev.map(function (d, i) {
        var s = tn(Math.abs(d), D);
        if (!i) return d < 0 ? "-" + s : s;
        return (d < 0 ? "- " : "+ ") + s;
      }).join(" ") + " = 0") + "</div>";
    }
    probe += '<div class="pg-bal"><span class="pg-bal-part">über dem Mittel: zusammen +' + f(up) + '</span><span class="pg-bal-part">darunter: zusammen ' +
      f(down) + '</span><span class="pg-bal-sum">Summe 0</span></div>';
    steps.push(probe);
    return { steps: steps, result: { text: f(mi.value), tex: "\\bar{x} " + (exact ? "=" : "\\approx") + " " + tn(mi.value, D) } };
  };

  // p-Quantil nach Folie 101. name ist das TeX-Zeichen (Q_1, Q_3, \tilde{x}_{0{,}8}), pTex das p in TeX.
  core.stepsQuantile = function (c, p, name, pTex) {
    var qi = LM.stats.quantileInfo(c.xs, p), n = c.n, D = c.D, s = c.s, tn = core.tn, steps = [];
    steps.push("<b>Sortieren.</b>" + core.seqHtml(s, [{ positions: qi.positions, cls: "q" }], D));
    var npExact = core.exact(qi.np, 4);
    steps.push("<b>n · p rechnen.</b> " + fx("n \\cdot p = " + n + " \\cdot " + pTex + (npExact ? " = " : " \\approx ") + tn(qi.np, 4)));
    if (!qi.integer) {
      steps.push("<b>Keine ganze Zahl, also aufrunden.</b> Aus " + LM.fmt(qi.np, 4) + " wird " + fx("k = " + qi.k) + ".");
      steps.push("<b>Ablesen.</b> " + fx(name + " = x_{(" + qi.k + ")} = " + tn(qi.value, D)));
    } else {
      steps.push("<b>Ganze Zahl, also mitteln.</b> " + fx("k = " + qi.k) + ". Du nimmst das Mittel aus Platz " + I(qi.k) + " und Platz " + I(qi.k + 1) + ".");
      steps.push("<b>Ausrechnen.</b> " + fx(name + " = \\tfrac{1}{2}\\left[x_{(" + qi.k + ")} + x_{(" + (qi.k + 1) + ")}\\right] = \\tfrac{1}{2}(" +
        tn(s[qi.k - 1], D) + " + " + core.tnp(s[qi.k], D) + ") = " + tn(qi.value, D)));
    }
    return { steps: steps, info: qi, result: { text: c.f(qi.value), tex: name + " = " + tn(qi.value, D) } };
  };

  core.stepsIqr = function (c) {
    var q1 = c.sum.q1.value, q3 = c.sum.q3.value, iqr = c.sum.box0.iqr, D = c.D, f = c.f;
    return {
      steps: [
        "<b>Rechnen.</b> " + fx("Q_{\\text{dif}} = Q_3 - Q_1 = " + core.tn(q3, D) + " - " + core.tnp(q1, D) + " = " + core.tn(iqr, D)),
        "<b>Bedeutung.</b> Die mittlere Hälfte der Werte liegt zwischen " + f(q1) + " und " + f(q3) + ". Dieser Bereich ist " + f(iqr) +
          " breit. Je größer der Quartilabstand, desto weiter streuen die mittleren Werte."
      ],
      result: { text: f(iqr), tex: "Q_{\\text{dif}} = " + core.tn(iqr, D) }
    };
  };

  core.stepsBox = function (c) {
    var b0 = c.sum.box0, b15 = c.sum.box15, n = c.n, D = c.D, f = c.f, tn = core.tn, steps = [];
    steps.push("<b>Die fünf Zahlen.</b> " + fx("x_{(1)} = " + tn(b0.lo, D) + ",\\ Q_1 = " + tn(b0.q1, D) + ",\\ \\tilde{x} = " + tn(b0.med, D) +
      ",\\ Q_3 = " + tn(b0.q3, D) + ",\\ x_{(" + n + ")} = " + tn(b0.hi, D)));
    steps.push("<b>Box zeichnen.</b> Die Box geht von " + f(b0.q1) + " bis " + f(b0.q3) + ". Der Strich in der Box liegt beim Median " + f(b0.med) + ".");
    steps.push("<b>Whisker mit <code>range = 0</code>.</b> Sie reichen bis zum kleinsten Wert " + f(b0.lo) + " und bis zum größten Wert " + f(b0.hi) +
      ". So zeichnest du den Boxplot in der Klausur.");
    var outs = b15.out.map(f), shown = outs.length > 8 ? outs.slice(0, 8).concat(["…"]) : outs;
    steps.push("<b>Whisker mit <code>range = 1.5</code></b> (Regel von Folie 108). Grenzen: " +
      fx("Q_1 - 1{,}5 \\cdot " + core.tnp(b15.iqr, D) + " = " + tn(b15.fences[0], D)) + " und " +
      fx("Q_3 + 1{,}5 \\cdot " + core.tnp(b15.iqr, D) + " = " + tn(b15.fences[1], D)) +
      ". Die Whisker enden beim äußersten Wert innerhalb, also bei " + f(b15.lo) + " und " + f(b15.hi) + "." +
      (outs.length
        ? " Außerhalb liegt " + (outs.length === 1 ? "der Wert " : "") + joinVals(shown) + ". " +
          (outs.length === 1 ? "Er erscheint als einzelner Punkt, also als möglicher Ausreißer." : "Sie erscheinen als einzelne Punkte, also als mögliche Ausreißer.")
        : " Kein Wert liegt außerhalb. Darum gibt es keine Ausreißer-Punkte."));
    return { steps: steps, result: { text: f(b0.lo) + " · " + f(b0.q1) + " · " + f(b0.med) + " · " + f(b0.q3) + " · " + f(b0.hi) } };
  };

  /* ---------- Weitere Kennwerte (Folien 116–120, 140–142) ---------- */

  // Getrimmtes Mittel wie R mean(x, trim = 0.1): an jedem Ende k = abgerundet n · 0,1 Werte weg
  core.stepsTrim = function (c) {
    var ti = c.sum.trim10, n = c.n, k = ti.k, m = ti.m, D = c.D, f = c.f, tn = core.tn, steps = [], cut = [], i;
    for (i = 1; i <= k; i++) cut.push(i);
    for (i = n - k + 1; i <= n; i++) cut.push(i);
    steps.push("<b>Sortieren.</b> Nur so siehst du, welche Werte die extremsten sind." +
      core.seqHtml(c.s, [{ positions: cut, cls: "cut" }], D, k ? "Sortierte Werte, die gestrichenen sind durchgestrichen" : "Sortierte Werte",
        k ? [1, k, k + 1, n - k, n - k + 1, n] : null));
    var nt = n * TRIM;
    steps.push("<b>Abzählen, wie viele weg müssen.</b> " + fx("n \\cdot 0{,}1 = " + n + " \\cdot 0{,}1 = " + core.tn(nt, 1)) +
      (core.exact(nt, 0) ? ", also " : ", abgerundet ") + fx("k = " + k) + ". So viele Werte streichst du an <b>jedem</b> Ende, genau wie R mit <code>mean(x, trim = 0.1)</code>.");
    if (!k) {
      steps.push("<b>Nichts zu streichen.</b> Bei weniger als 10 Werten ist " + fx("n \\cdot 0{,}1") + " kleiner als 1, abgerundet also 0. " +
        "Das getrimmte Mittel ist dann das normale Mittel.");
    } else {
      steps.push("<b>Streichen.</b> Weg kommen " + (k === 1 ? "der kleinste Wert " : "die " + I(k) + " kleinsten Werte ") + shortList(ti.low, f) + " und " +
        (k === 1 ? "der größte " : "die " + I(k) + " größten ") + shortList(ti.high, f) + ". Übrig bleiben " + fx(n + " - 2 \\cdot " + k + " = " + m) + " Werte.");
    }
    var exact = core.exact(ti.value, D), name = "\\bar{x}_{\\text{getr}}";
    steps.push("<b>Mitteln.</b> " + (k ? "Die " + I(m) + " übrigen Werte" : "Alle " + I(n) + " Werte") + " ergeben zusammen " + f(ti.sum) + ". Also " +
      fx(name + " = \\frac{" + tn(ti.sum, D) + "}{" + m + "}" + (exact ? " = " : " \\approx ") + tn(ti.value, D)) + ".");
    var mean = c.sum.mean.value, med = c.sum.median.value;
    if (k && Math.abs(mean - med) > EPS) {
      var between = (ti.value - mean) * (ti.value - med) <= EPS;
      steps.push("<b>Vergleichen.</b> Das normale Mittel ist " + f(mean) + ", der Median " + f(med) + "." +
        (between ? " Das getrimmte Mittel liegt dazwischen: Ohne die extremsten Werte zieht kein Ausreißer mehr so stark am Mittel." : ""));
    }
    return { steps: steps, result: { text: f(ti.value), tex: name + (exact ? " = " : " \\approx ") + tn(ti.value, D) } };
  };

  // Geometrisches oder harmonisches Mittel geht nicht: Werte ≤ 0 dabei
  core.notPositive = function (c, which) {
    var geo = which === "geo", f = c.f, bad = [];
    c.s.forEach(function (v) { if (!(v > 0) && bad.indexOf(v) < 0) bad.push(v); });
    var shown = bad.slice(0, 4).map(f), zero = bad.indexOf(0) >= 0, neg = bad.some(function (v) { return v < 0; });
    var why = geo
      ? (zero ? " Schon eine einzige 0 macht das ganze Produkt zu 0." : "") +
        (neg ? " Negative Werte passen auch nicht: Das geometrische Mittel ist für Faktoren wie Wachstum gedacht, und die sind immer größer als 0." : "")
      : (zero ? " Den Kehrwert 1/0 gibt es nicht, denn durch 0 kann man nicht teilen." : "") +
        (neg ? " Negative Werte passen auch nicht: Das harmonische Mittel ist für Raten wie km/h gedacht, und die sind immer größer als 0." : "");
    var step = "<b>Geht hier nicht.</b> Das " + (geo ? "geometrische" : "harmonische") + " Mittel gibt es nur, wenn alle Werte größer als 0 sind (Folie " +
      (geo ? "117" : "120") + "). In deinen Daten " + (bad.length === 1 ? "ist " + shown[0] : "sind " + und(shown.concat(bad.length > 4 ? ["weitere"] : []))) +
      " dabei." + why;
    return { steps: [step], result: { text: "–", html: "<b>nicht berechenbar</b>: nur für positive Werte" } };
  };

  // Geometrisches Mittel (Folien 117–119): Produkt, n-te Wurzel; Probe mit dem Logarithmus wie R auf Folie 118
  core.stepsGeo = function (c) {
    var gi = c.sum.geometric;
    if (!gi.ok) return core.notPositive(c, "geo");
    var S = LM.stats, n = c.n, D = c.D, f = c.f, tn = core.tn, steps = [];
    var sumLog = S.sum(gi.logs), lg = sumLog / Math.LN10, decs = 0, prodTex, approx = false;
    c.xs.forEach(function (v) { decs += core.decimalsOf(v); });
    if (isFinite(gi.product) && gi.product >= 1e-4 && gi.product < 1e10 && decs <= 6) {
      prodTex = tn(gi.product, decs);
    } else if (isFinite(gi.product) && gi.product >= 1e-4 && gi.product < 1e7) {
      prodTex = tn(gi.product, core.sigDec(gi.product, 6));
      approx = true;
    } else {
      prodTex = core.texSci(lg, 4);
      approx = true;
    }
    steps.push("<b>Alle Werte multiplizieren.</b> " + fx("x_1 \\cdot x_2 \\cdot \\ldots \\cdot x_n = " +
      core.prodTex(c.xs.map(function (v) { return tn(v, D); })) + (approx ? " \\approx " : " = ") + prodTex) +
      (lg >= 15 ? " Eine riesige Zahl. Bei so vielen Werten geht es leichter mit dem Logarithmus (Schritt 3)."
        : lg <= -6 ? " Eine winzige Zahl. Bei so vielen Werten geht es leichter mit dem Logarithmus (Schritt 3)." : ""));
    var exact = !approx && core.exact(gi.value, D);
    var rootTex = n === 2 ? "\\sqrt{" + prodTex + "}" : "\\sqrt[" + n + "]{" + prodTex + "}";
    steps.push("<b>Die n-te Wurzel ziehen.</b> Hier ist " + fx("n = " + n) + ": " +
      fx("GM = " + rootTex + " = \\left(" + prodTex + "\\right)^{1/" + n + "}" + (exact ? " = " : " \\approx ") + tn(gi.value, D)));
    steps.push("<b>Oder mit dem Logarithmus</b> (Folie 117, so rechnet R auf Folie 118). Der Logarithmus des geometrischen Mittels ist das normale Mittel der Logarithmen: " +
      fx("\\log(GM) = \\frac{1}{n}\\sum \\log(x_i) = \\frac{" + tn(sumLog, 5) + "}{" + n + "} \\approx " + tn(gi.logMean, 5)) + ". Zurück geht es mit " +
      fx("GM = e^{" + tn(gi.logMean, 5) + "} \\approx " + tn(gi.value, D)) + ". Gemeint ist der natürliche Logarithmus, auf dem Taschenrechner die Taste ln.");
    steps.push("<b>Passt es zu deinen Daten?</b> Rechnen kannst du es, sobald alle Werte größer als 0 sind. Sinnvoll ist es aber nur bei Faktoren, " +
      "also bei Wachstum, Verhältnissen oder einer konstanten Lernrate (Folie 119). Die Daten brauchen mindestens eine Verhältnisskala. " +
      "Zum Vergleich: Das arithmetische Mittel ist " + f(c.sum.mean.value) + ".");
    return { steps: steps, result: { text: f(gi.value), tex: "GM " + (exact ? "= " : "\\approx ") + tn(gi.value, D) } };
  };

  // Harmonisches Mittel (Folie 120): n durch die Summe der Kehrwerte
  core.stepsHarm = function (c) {
    var hi = c.sum.harmonic;
    if (!hi.ok) return core.notPositive(c, "harm");
    var n = c.n, D = c.D, f = c.f, tn = core.tn, rec = hi.reciprocals, steps = [];
    function one(i) {
      var r = rec[i], d = core.sigDec(r, 4);
      return "\\tfrac{1}{" + tn(c.xs[i], D) + "}" + (core.exact(r, d) ? " = " : " \\approx ") + tn(r, d);
    }
    var idx = n <= 5 ? c.xs.map(function (v, i) { return i; }) : [0, 1, 2, -1, n - 1];
    steps.push("<b>Kehrwerte bilden.</b> Teil 1 durch jeden Wert: " + fx(idx.map(function (i) { return i < 0 ? "\\ldots" : one(i); }).join(",\\quad ")));
    var rs = hi.reciprocalSum, rd = core.sigDec(rs, 5), rsExact = core.exact(rs, rd);
    steps.push("<b>Kehrwerte addieren.</b> " + fx("\\sum \\tfrac{1}{x_i} = " + core.sumTex(c.xs.map(function (v) { return "\\tfrac{1}{" + tn(v, D) + "}"; }), 6) +
      (rsExact ? " = " : " \\approx ") + tn(rs, rd)));
    var exact = core.exact(hi.value, D);
    steps.push("<b>n durch diese Summe teilen.</b> " + fx("HM = \\dfrac{n}{\\sum 1/x_i} = \\dfrac{" + n + "}{" + tn(rs, rd) + "}" + (exact && rsExact ? " = " : " \\approx ") + tn(hi.value, D)));
    steps.push("<b>Passt es zu deinen Daten?</b> Sinnvoll ist das harmonische Mittel bei Raten mit festem Zähler, zum Beispiel km/h bei gleich langen Strecken " +
      "oder Preis pro Liter (Folie 120).");
    var gm = c.sum.geometric.value, am = c.sum.mean.value;
    steps.push("<b>Vergleich</b> (Extra, nicht auf den Folien). Für positive Werte gilt immer: harmonisches ≤ geometrisches ≤ arithmetisches Mittel. Hier: " +
      fx(tn(hi.value, D) + " \\le " + tn(gm, D) + " \\le " + tn(am, D)) + ".");
    return { steps: steps, result: { text: f(hi.value), tex: "HM " + (exact ? "= " : "\\approx ") + tn(hi.value, D) } };
  };

  // Schiefe (Folien 140–142, Beispiel Folie 146): x̄ − x̃ und Quartilskoeffizient g_0,25
  core.stepsSkew = function (c) {
    var sk = c.sum.skew, D = c.D, f = c.f, tn = core.tn, tnp = core.tnp, steps = [];
    var mean = sk.mean, med = sk.median, diff = sk.diff, dd = core.skewDigits(diff, D), dir = sk.diffDirection;
    var exactMean = core.exact(mean, dd);
    steps.push("<b>Mittel minus Median.</b> " + fx("\\bar{x} - \\tilde{x} " + (exactMean ? "= " : "\\approx ") + tn(mean, dd) + " - " + tnp(med, dd) + " = " + tn(diff, dd)) + ".");
    var why = dir === "rechtsschief" ? "Das Mittel liegt rechts vom Median. Ein paar große Werte ziehen es nach oben, der Median bleibt in der Mitte."
      : dir === "linksschief" ? "Das Mittel liegt links vom Median. Ein paar kleine Werte ziehen es nach unten, der Median bleibt in der Mitte."
        : "Mittel und Median sind gleich. Keine Seite zieht stärker.";
    steps.push("<b>Vorzeichen deuten</b> (Folie 140). " + fx("\\bar{x} - \\tilde{x} " + relSign(dir) + " 0") + ", also " + skewPhrase(dir, true) + ". " + why);
    var q1 = c.sum.q1, q3 = c.sum.q3;
    function qrow(qi, label) {
      return '<tr><td class="num">' + LM.fmt(qi.p, 2) + '</td><td class="num">' + LM.fmt(qi.np, 4) + "</td><td>" +
        (qi.integer ? I(qi.k) + " und " + I(qi.k + 1) + ' <span class="pg-qt-how">ganze Zahl: mitteln</span>' : I(qi.k) + ' <span class="pg-qt-how">aufgerundet</span>') +
        '</td><td class="num"><b>' + label + " = " + LM.esc(f(qi.value)) + "</b></td></tr>";
    }
    steps.push("<b>Quartile holen</b>, so wie auf Folie 146." +
      '<div class="table-wrap pg-qt-wrap"><table class="t pg-qt"><thead><tr><th scope="col" class="num">' + LM.tex("p") + '</th><th scope="col" class="num">' +
      LM.tex("n \\cdot p") + '</th><th scope="col">Platz</th><th scope="col" class="num">Quartil</th></tr></thead><tbody>' +
      qrow(q1, "Q<sub>1</sub>") + qrow(q3, "Q<sub>3</sub>") + "</tbody></table></div>");
    var Q1 = sk.qLow, Q3 = sk.qHigh, up = sk.upper, lo = sk.lower, gEx = isFinite(sk.gp) && core.exact(sk.gp, 3);
    if (isFinite(sk.gp)) {
      steps.push("<b>In die Formel einsetzen</b> (Folie 142)." +
        fb("g_{0{,}25} = \\frac{(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1)}{Q_3 - Q_1}") +
        fb("= \\frac{(" + tn(Q3, D) + " - " + tnp(med, D) + ") - (" + tn(med, D) + " - " + tnp(Q1, D) + ")}{" + tn(Q3, D) + " - " + tnp(Q1, D) + "} = \\frac{" +
          tn(up, D) + " - " + tnp(lo, D) + "}{" + tn(Q3 - Q1, D) + "}" + (gEx ? " = " : " \\approx ") + tn(sk.gp, 3)));
      var gd = sk.gpDirection;
      var boxWhy = gd === "rechtsschief" ? "In der Box ist die rechte Hälfte länger: Von " + fx("\\tilde{x}") + " bis " + fx("Q_3") + " sind es " + f(up) +
          ", von " + fx("Q_1") + " bis " + fx("\\tilde{x}") + " nur " + f(lo) + "."
        : gd === "linksschief" ? "In der Box ist die linke Hälfte länger: Von " + fx("Q_1") + " bis " + fx("\\tilde{x}") + " sind es " + f(lo) +
          ", von " + fx("\\tilde{x}") + " bis " + fx("Q_3") + " nur " + f(up) + "."
          : "Beide Hälften der Box sind gleich lang, nämlich " + f(up) + ".";
      steps.push("<b>Deuten.</b> " + fx("g_{0{,}25} " + relSign(gd) + " 0") + ", also " + skewPhrase(gd, false) + ". " + boxWhy);
      if (gd !== dir) {
        steps.push("<b>Nicht dieselbe Richtung?</b> Das kann passieren. Beide Werte sind nur Anhaltspunkte („tendenziell“, Folie 140). " +
          fx("\\bar{x} - \\tilde{x}") + " reagiert stark auf Ausreißer, " + fx("g_{0{,}25}") + " schaut nur auf die mittlere Hälfte der Werte.");
      }
    } else {
      steps.push("<b>Einsetzen geht hier nicht.</b> Der Nenner ist " + fx("Q_3 - Q_1 = " + tn(Q3, D) + " - " + tnp(Q1, D) + " = 0") +
        ". Durch 0 kann man nicht teilen. Darum ist " + fx("g_{0{,}25}") + " hier <b>nicht definiert</b>. Das passiert, wenn die mittlere Hälfte der Werte gleich groß ist.");
    }
    var resTex = "\\bar{x} - \\tilde{x} " + (exactMean ? "=" : "\\approx") + " " + tn(diff, dd) +
      (isFinite(sk.gp) ? ",\\quad g_{0{,}25} " + (gEx ? "=" : "\\approx") + " " + tn(sk.gp, 3) : ",\\quad g_{0{,}25} \\text{ nicht definiert}");
    return {
      steps: steps,
      result: {
        text: core.signed(diff, dd) + " · " + (dir === "undefiniert" ? "nicht definiert" : dir),
        tex: resTex,
        html: LM.tex(resTex) + ' <span class="pg-res-word">' + core.skewWord(dir) + "</span>"
      }
    };
  };

  // So zeichnet R boxplot() wirklich (boxplot.stats): Grenzen = Hinges ∓ range · (Hinge-Abstand),
  // Whisker bis zum äußersten Wert innerhalb, Werte außerhalb sind Punkte. Nur zum Vergleich mit der Regel von Folie 108.
  core.rBoxStats = function (xs, range) {
    var s = LM.stats.sorted(xs), n = s.length;
    if (!n) return null;
    var h = LM.stats.hinges(s);
    if (!range) return { lo: s[0], hi: s[n - 1], out: [], fences: null };
    var d = h[3] - h[1], lf = h[1] - range * d, uf = h[3] + range * d;
    var inside = s.filter(function (v) { return v >= lf - EPS && v <= uf + EPS; });
    return {
      lo: inside.length ? inside[0] : h[1], hi: inside.length ? inside[inside.length - 1] : h[3],
      out: s.filter(function (v) { return v < lf - EPS || v > uf + EPS; }), fences: [lf, uf]
    };
  };

  // Satz, falls R wegen der Hinges andere Whisker oder Ausreißer zeichnet als die Regel von Folie 108 ("" sonst)
  core.rWhiskerDiff = function (c, range) {
    if (!range) return "";
    var b = LM.stats.boxplot(c.xs, range), r = core.rBoxStats(c.xs, range), f = c.f;
    function has(list, v) { return list.some(function (u) { return Math.abs(u - v) < EPS; }); }
    function uniqVals(list) { return list.filter(function (v, i) { return i === 0 || Math.abs(v - list[i - 1]) > EPS; }); }
    var added = uniqVals(r.out.filter(function (v) { return !has(b.out, v); }));
    var loDiff = Math.abs(r.lo - b.lo) > EPS, hiDiff = Math.abs(r.hi - b.hi) > EPS;
    // Mit Hinges ist die Box nie breiter als mit Quartilen: R zeigt also höchstens mehr Ausreißer und kürzere Whisker.
    if (!added.length && !loDiff && !hiDiff) return "";
    var parts = [];
    if (added.length) parts.push("zusätzlich " + und(added.map(f)) + " als Ausreißer");
    function wh(which, v) { return "den " + which + " Whisker nur bis " + f(v); }
    if (loDiff) parts.push(wh("unteren", r.lo));
    if (hiDiff) parts.push(wh("oberen", r.hi));
    var txt = parts.length < 2 ? parts[0] : parts.slice(0, -1).join(", ") + " und " + parts[parts.length - 1];
    return "In R zeichnet <code>boxplot()</code> mit <code>range = " + (range === 1.5 ? "1.5" : String(range)) + "</code> hier " + txt +
      ", weil R die Grenzen mit den Hinges rechnet: " + f(r.fences[0]) + " und " + f(r.fences[1]) + ".";
  };

  // Hinweis zu R: boxplot() legt die Box mit Tukey-Hinges. Nur bei n = 3, 7, 11, … kann das von den Quartilen abweichen.
  // range (> 0): dann auch sagen, wenn R deshalb andere Whisker oder Ausreißer zeichnet.
  core.hingeNote = function (c, range) {
    if (c.n % 4 !== 3) return "";
    var hg = LM.stats.hinges(c.xs), q1 = c.sum.q1.value, q3 = c.sum.q3.value, f = c.f;
    var same = LM.near(hg[1], q1, 1e-9) && LM.near(hg[3], q3, 1e-9);
    if (same) {
      return "Bei n = " + I(c.n) + " nimmt <code>boxplot()</code> in R für die Box eigentlich die Tukey-Hinges statt der Quartile. Bei diesen Daten kommt zufällig dasselbe heraus.";
    }
    var wd = core.rWhiskerDiff(c, range);
    return "Bei n = " + I(c.n) + " zeichnet R die Box etwas anders. <code>boxplot()</code> nimmt die Tukey-Hinges statt der Quartile: Box von " +
      f(hg[1]) + " bis " + f(hg[3]) + " statt von " + f(q1) + " bis " + f(q3) + "." + (wd ? " " + wd : "") +
      " In der Klausur rechnest du mit den Quartilen nach Folie 101.";
  };

  // Hinweise zu Sonderfällen der eingegebenen Daten
  core.notes = function (c) {
    var out = [], mi = c.sum.mode, f = c.f, n = c.n;
    if (n === 1) {
      out.push({ title: "Nur ein Wert", html: "Mit einem einzigen Wert sind Modus, Median, Mittel und alle Quantile gleich, nämlich " + f(c.s[0]) + "." });
    } else if (n === 2) {
      out.push({ title: "Nur zwei Werte", html: "Der Median ist das Mittel der beiden Werte, also genauso groß wie das arithmetische Mittel (" + f(c.sum.median.value) +
        "). Q<sub>1</sub> ist der kleinere Wert, Q<sub>3</sub> der größere. Einen Modus gibt es nur, wenn beide Werte gleich sind." });
    }
    if (n > 2 && !mi.unique) {
      if (mi.allEqual) {
        out.push({ title: "Kein Modus", html: "Jeder Wert kommt " + I(mi.maxCount) + "-mal vor. Es gibt keinen Gipfel und damit keinen häufigsten Wert." });
      } else {
        var vals = mi.values.map(f), more = vals.length > 6;
        if (more) vals = vals.slice(0, 6).concat(["…"]);
        out.push({ title: "Kein eindeutiger Modus", html: und(vals) + " kommen " + (mi.values.length === 2 ? "beide " : "alle ") + I(mi.maxCount) +
          "-mal vor. Laut Folie 92 muss der häufigste Wert eindeutig sein. Darum gibt es hier keinen Modus." });
      }
    }
    var negs = c.s.filter(function (v) { return v < 0; });
    if (negs.length) {
      var a = negs[0], b = negs[negs.length - 1];
      out.push({ title: "Negative Zahlen", html: "Beim Sortieren kommt die Zahl mit dem größeren Minus zuerst: " +
        (b > a ? f(a) + " ist kleiner als " + f(b) + "." : f(a) + " ist kleiner als 0 und als jede positive Zahl.") });
    }
    var dec = null;
    for (var i = 0; i < c.xs.length; i++) if (core.decimalsOf(c.xs[i]) > 0) { dec = c.xs[i]; break; }
    if (dec !== null) {
      out.push({ title: "Kommazahlen", html: "Hier schreibst du " + LM.fmt(dec, 6) + " mit Komma. In R brauchst du einen Punkt: <code>" + core.rNum(dec) +
        "</code>. Der R-Code unten macht das schon richtig." });
    }
    return out;
  };

  LM._pg = core;
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (typeof LM.widget === "function") LM.widget("playground", mount);

  /* =====================================================================
     Das Modul
     ===================================================================== */

  function clampInt(v, lo, hi, def) {
    v = Number(v);
    if (!isFinite(v)) return def;
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }
  function cleanRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.slice(0, 200).filter(function (r) { return r && typeof r === "object"; }).map(function (r) {
      return {
        v: String(r.v === undefined || r.v === null ? "" : r.v).slice(0, 30),
        h: String(r.h === undefined || r.h === null ? "" : r.h).slice(0, 12)
      };
    });
  }
  function blankRows() { return [{ v: "", h: "" }, { v: "", h: "" }, { v: "", h: "" }]; }

  var ICON_DIE = '<svg class="pg-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<circle cx="8.5" cy="8.5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.7" fill="currentColor"/></svg>';
  var ICON_COPY = '<svg class="pg-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  function mount(el) {
    var S = LM.stats, h = LM.h;
    var uid = "pg-" + Math.random().toString(36).slice(2, 8);
    el.classList.add("widget", "pg");
    el.innerHTML = "";

    /* ---------- Zustand (zuletzt benutzte Eingabe aus LM.store) ---------- */

    var saved = LM.store.get("playground", null);
    var fresh = !saved || typeof saved !== "object";
    if (fresh) saved = {};
    var state = {
      mode: saved.mode === "table" ? "table" : "list",
      text: typeof saved.text === "string" ? saved.text.slice(0, 40000) : core.textFromValues(PRESETS[DEFAULT_PRESET].values),
      rows: cleanRows(saved.rows),
      range: saved.range === 1.5 ? 1.5 : 0,
      p: typeof saved.p === "string" ? saved.p.slice(0, 24) : "0,8",
      hl: { med: true, q: false, mod: false },
      randN: clampInt(saved.randN, 5, 30, 12),
      synced: fresh ? true : saved.synced === true
    };
    if (saved.hl && typeof saved.hl === "object") {
      Object.keys(state.hl).forEach(function (k) { if (typeof saved.hl[k] === "boolean") state.hl[k] = saved.hl[k]; });
    }
    if (fresh || (state.mode === "list" && !state.rows.length)) { state.rows = core.rowsFromValues(core.readList(state.text).values); state.synced = true; }
    if (!state.rows.length) state.rows = blankRows();
    var randomNote = "";

    /* ---------- Eingabe ---------- */

    var segList = h("button", { attrs: { type: "button" }, text: "Liste" });
    var segTable = h("button", { attrs: { type: "button" }, text: "Häufigkeitstabelle" });
    var modeSeg = h("div", { class: "seg", attrs: { role: "group", "aria-label": "Eingabe als" } }, [segList, segTable]);

    var ta = h("textarea", { class: "data-input pg-ta", attrs: {
      id: uid + "-ta", rows: "3", spellcheck: "false", autocomplete: "off", autocapitalize: "off",
      placeholder: "z. B. 12; 5; 20; 8,5 oder 12 5 20 8", "aria-describedby": uid + "-help"
    } });
    ta.value = state.text;
    var listBox = h("div", { class: "pg-list" }, [
      h("label", { class: "pg-label", attrs: { for: uid + "-ta" }, text: "Deine Zahlen" }),
      ta,
      h("p", { class: "pg-help", attrs: { id: uid + "-help" }, text: "Trenne die Zahlen mit Leerzeichen, Semikolon oder neuer Zeile. Kommazahlen mit Komma, z. B. 8,5." })
    ]);

    var rowsHost = h("div", { class: "pg-rows" });
    var rowEls = [];
    var addRowBtn = h("button", { class: "btn btn-sm", attrs: { type: "button" }, text: "+ Zeile" });
    var tabSum = h("span", { class: "pg-tab-sum" });
    var tableBox = h("div", { class: "pg-tabin", attrs: { role: "group", "aria-label": "Häufigkeitstabelle eingeben" } }, [
      h("div", { class: "pg-tab-head", attrs: { "aria-hidden": "true" }, html: "<span>Wert " + LM.tex("a_j") + "</span><span>Anzahl " + LM.tex("h_j") + "</span><span></span>" }),
      rowsHost,
      h("div", { class: "pg-tab-foot" }, [addRowBtn, tabSum]),
      h("p", { class: "pg-help", text: "Jede Zeile ist ein Wert und wie oft er vorkommt. Enter springt weiter." })
    ]);

    var parseLine = h("div", { class: "pg-parse", attrs: { role: "status", "aria-live": "polite" } });

    var presetBtns = PRESETS.map(function (p) {
      p.key = S.sorted(p.values).join(",");
      return h("button", { class: "chip", attrs: { type: "button", "aria-pressed": "false" }, text: p.label, on: { click: function () { loadValues(p.values); } } });
    });
    var nInput = h("input", { class: "num-input pg-n", attrs: {
      id: uid + "-n", type: "number", min: "5", max: "30", step: "1", inputmode: "numeric", value: String(state.randN)
    } });
    var randBtn = h("button", { class: "chip pg-rand-btn", attrs: { type: "button" }, html: ICON_DIE + "Zufall" });
    var presetRow = h("div", { class: "pg-presets", attrs: { role: "group", "aria-label": "Beispiele" } },
      [h("span", { class: "pg-presets-label", attrs: { "aria-hidden": "true" }, text: "Beispiele" })].concat(presetBtns, [
        h("span", { class: "pg-rand" }, [randBtn, h("label", { class: "pg-n-label", attrs: { for: uid + "-n" }, html: "mit <i>n</i> =" }), nInput])
      ]));
    var presetNote = h("p", { class: "pg-preset-note", attrs: { hidden: "" } });

    var calcBtn = h("button", { class: "btn btn-primary", attrs: { type: "button" }, text: "Berechnen" });
    var clearBtn = h("button", { class: "btn btn-ghost btn-sm", attrs: { type: "button" }, text: "Leeren" });
    var actions = h("div", { class: "pg-actions" }, [calcBtn, clearBtn, h("span", { class: "pg-live", text: "Rechnet beim Tippen automatisch mit." })]);

    var inPanel = h("div", { class: "pg-in" }, [
      h("div", { class: "pg-in-top" }, [h("span", { class: "pg-label", attrs: { "aria-hidden": "true" }, text: "Eingabe als" }), modeSeg]),
      listBox, tableBox, parseLine, presetRow, presetNote, actions
    ]);

    /* ---------- Ausgabe: Kacheln ---------- */

    var TILES = [
      { k: "mod", group: "main", label: "Modus " + LM.tex("x_{\\text{mod}}"), name: "Modus", cls: "s-mod", det: "mod", focus: "mod" },
      { k: "med", group: "main", label: "Median " + LM.tex("\\tilde{x}"), name: "Median", cls: "s-med", det: "med", focus: "med" },
      { k: "mean", group: "main", label: "Mittel " + LM.tex("\\bar{x}"), name: "Arithmetisches Mittel", cls: "s-mean", det: "mean", focus: "mean" },
      { k: "n", group: "more", label: "Anzahl " + LM.tex("n"), name: "Anzahl n", cls: "", det: "freq", focus: "" },
      { k: "min", group: "more", label: "Minimum", name: "Minimum", cls: "", det: "box", focus: "ext" },
      { k: "q1", group: "more", label: "Q<sub>1</sub>", name: "Unteres Quartil Q1", cls: "s-q", det: "q1", focus: "q" },
      { k: "q3", group: "more", label: "Q<sub>3</sub>", name: "Oberes Quartil Q3", cls: "s-q", det: "q3", focus: "q" },
      { k: "max", group: "more", label: "Maximum", name: "Maximum", cls: "", det: "box", focus: "ext" },
      { k: "iqr", group: "more", label: "Quartil&shy;abstand", name: "Quartilabstand", cls: "s-q", det: "iqr", focus: "q" },
      { k: "trim", group: "x", label: "Getrimmtes Mittel 10&nbsp;%", name: "Getrimmtes Mittel, 10 Prozent an jedem Ende weg", cls: "pg-s-rel", det: "trim", focus: "trim" },
      { k: "gm", group: "x", label: "Geo&shy;metrisches Mittel", name: "Geometrisches Mittel", cls: "pg-s-rel", det: "gm", focus: "" },
      { k: "hm", group: "x", label: "Har&shy;monisches Mittel", name: "Harmonisches Mittel", cls: "pg-s-rel", det: "hm", focus: "" },
      { k: "skew", group: "x", label: "Schiefe " + LM.tex("\\bar{x} - \\tilde{x}"), name: "Schiefe, Mittel minus Median", cls: "pg-s-skew", det: "skew", focus: "skew" },
      { k: "gp", group: "x", label: "Quartils&shy;koeffizient " + LM.tex("g_{0{,}25}"), name: "Quartilskoeffizient der Schiefe", cls: "pg-s-skew", det: "skew", focus: "box" }
    ];
    var tiles = {};
    var tilesMain = h("div", { class: "pg-tiles-main" }), tilesMore = h("div", { class: "pg-tiles-more" });
    var xCap = h("p", { class: "pg-tiles-cap", attrs: { id: uid + "-xcap" }, text: "Weitere Kennwerte" });
    var tilesX = h("div", { class: "pg-tiles-x", attrs: { role: "group", "aria-labelledby": uid + "-xcap" } });
    var groupHost = { main: tilesMain, more: tilesMore, x: tilesX };
    TILES.forEach(function (t) {
      var val = h("span", { class: "stat-value", text: "–" });
      var hint = h("span", { class: "pg-hint" });
      var btn = h("button", { class: "stat pg-stat pg-t-" + t.k + " " + t.cls, attrs: { type: "button" } }, [h("span", { class: "stat-label", html: t.label }), val, hint]);
      btn.addEventListener("click", function () { openDetails(t.det); });
      btn.addEventListener("mouseenter", function () { setFocus(t.focus); });
      btn.addEventListener("mouseleave", function () { setFocus(""); });
      btn.addEventListener("focus", function () { setFocus(t.focus); });
      btn.addEventListener("blur", function () { setFocus(""); });
      tiles[t.k] = { btn: btn, val: val, hint: hint, t: t };
      groupHost[t.group].appendChild(btn);
    });
    var tilesBox = h("div", { class: "pg-tiles" }, [tilesMain, tilesMore, xCap, tilesX,
      h("p", { class: "pg-tilehint", text: "Tipp auf eine Kachel, dann siehst du den Rechenweg dazu." })]);
    var notesBox = h("div", { class: "pg-notes" });

    /* ---------- Ausgabe: Diagramm ---------- */

    var rangeBtns = [0, 1.5].map(function (r) {
      return h("button", { attrs: { type: "button", "aria-pressed": String(state.range === r) }, html: "<code>range = " + (r ? "1.5" : "0") + "</code>",
        on: { click: function () { setRange(r); } } });
    });
    var chartHost = h("div", { class: "chart pg-chart" });
    var legend = h("div", { class: "pg-legend", attrs: { "aria-hidden": "true" }, html:
      '<span class="pg-lg"><svg viewBox="0 0 22 14"><line x1="11" y1="0" x2="11" y2="14" class="mk-med pg-line-med"/></svg>Median</span>' +
      '<span class="pg-lg"><svg viewBox="0 0 22 14"><line x1="11" y1="0" x2="11" y2="14" class="mk-q pg-line-q"/></svg>Quartile</span>' +
      '<span class="pg-lg"><svg viewBox="0 0 22 14"><path d="M11 1 L4 13 H18 Z" class="mk-mean"/></svg>Mittel, der Schwerpunkt</span>' +
      '<span class="pg-lg"><svg viewBox="0 0 22 14"><circle cx="11" cy="7" r="6" class="dot pg-dot-mod"/></svg>Modus</span>' });
    var boxNote = h("p", { class: "pg-box-note" });
    var hingeNote = h("div", { class: "callout callout-tip pg-note", attrs: { hidden: "" } });
    var vizSec = h("section", { class: "pg-sec pg-viz", attrs: { "aria-label": "Punktdiagramm und Boxplot" } }, [
      h("div", { class: "pg-sec-head" }, [
        h("h4", { class: "pg-h", text: "Punktdiagramm mit Boxplot" }),
        h("div", { class: "pg-range" }, [
          h("span", { class: "pg-range-label", attrs: { id: uid + "-rl" }, text: "Whisker:" }),
          h("div", { class: "seg pg-seg-code", attrs: { role: "group", "aria-labelledby": uid + "-rl" } }, rangeBtns)
        ])
      ]),
      chartHost, legend, boxNote, hingeNote
    ]);

    /* ---------- Ausgabe: sortierte Karten ---------- */

    var hlRow = h("div", { class: "pg-chips", attrs: { role: "group", "aria-label": "Plätze hervorheben" } },
      [["med", "Median-Plätze"], ["q", "Quartil-Plätze"], ["mod", "Modus"]].map(function (d) {
        var b = h("button", { class: "chip pg-hl pg-hl-" + d[0], attrs: { type: "button", "aria-pressed": String(state.hl[d[0]]) }, text: d[1] });
        b.addEventListener("click", function () {
          state.hl[d[0]] = !state.hl[d[0]];
          b.setAttribute("aria-pressed", String(state.hl[d[0]]));
          if (cur) renderCards(cur);
          persist();
        });
        return b;
      }));
    var cardsHost = h("div", { class: "pg-cards" });
    var cardsCap = h("p", { class: "pg-cap", attrs: { "aria-live": "polite" } });
    var cardsOpen = false;
    var cardsSec = h("section", { class: "pg-sec", attrs: { "aria-label": "Sortierte Werte" } }, [
      h("div", { class: "pg-sec-head" }, [h("h4", { class: "pg-h", text: "Sortiert" }), hlRow]),
      cardsHost, cardsCap
    ]);

    /* ---------- Ausgabe: Häufigkeitstabelle ---------- */

    var freqVal = h("span", { class: "pg-det-val pg-det-small" });
    var freqBody = h("div", { class: "pg-det-body" });
    var freqDet = h("details", { class: "pg-det pg-det-plain" }, [
      h("summary", {}, [h("span", { class: "pg-det-title", text: "Häufigkeitstabelle" }), freqVal]), freqBody
    ]);
    // Offen, solange die Tabelle kurz ist. Hat jemand selbst auf- oder zugeklappt, bleibt es so.
    // (toggle feuert verzögert, darum Vergleich mit dem gewünschten Zustand statt einer Sperre)
    var freqTouched = false, freqWant = false;
    freqDet.addEventListener("toggle", function () { if (freqDet.open !== freqWant) freqTouched = true; });

    /* ---------- Ausgabe: Rechenweg (Inhalt wird erst beim Aufklappen gebaut) ---------- */

    var WAY = [
      { group: "Lagemaße" },
      { k: "mod", tag: "tag-mod", det: "mod", title: "Modus" },
      { k: "med", tag: "tag-med", det: "med", title: "Median" },
      { k: "mean", tag: "tag-mean", det: "mean", title: "Mittel" },
      { k: "q1", tag: "tag-q", det: "q", title: "Unteres Quartil Q<sub>1</sub>" },
      { k: "q3", tag: "tag-q", det: "q", title: "Oberes Quartil Q<sub>3</sub>" },
      { k: "iqr", tag: "tag-q", det: "q", title: "Quartilabstand" },
      { k: "box", tag: "tag-q", det: "q", title: "Boxplot" },
      { k: "p", tag: "tag-q", det: "q", title: "Eigenes p-Quantil" },
      { group: "Weitere Kennwerte" },
      { k: "trim", tag: "tag-mean pg-tag-rel", det: "mean", title: "Getrimmtes Mittel (10 %)" },
      { k: "gm", tag: "tag-mean pg-tag-rel", det: "mean", title: "Geometrisches Mittel" },
      { k: "hm", tag: "tag-mean pg-tag-rel", det: "mean", title: "Harmonisches Mittel" },
      { k: "skew", tag: "pg-tag-n", det: "n", title: "Schiefe" }
    ];
    var way = {};
    var waySec = h("section", { class: "pg-sec pg-way", attrs: { "aria-label": "Rechenweg" } }, [
      h("div", { class: "pg-sec-head" }, [h("h4", { class: "pg-h", text: "Rechenweg wie in der Klausur" })])
    ]);
    var wayDone = {};
    WAY.forEach(function (d) {
      if (d.group) { waySec.appendChild(h("p", { class: "pg-way-group", text: d.group })); return; }
      var val = h("span", { class: "pg-det-val" });
      var body = h("div", { class: "pg-det-body" });
      var sum = h("summary", {}, [h("span", { class: "tag " + d.tag }, [h("span", { html: d.title })]), val]);
      var det = h("details", { class: "pg-det pg-det-" + d.det }, [sum, body]);
      det.addEventListener("toggle", function () { if (det.open) ensureWay(d.k); });
      way[d.k] = { det: det, val: val, body: body, sum: sum };
      waySec.appendChild(det);
    });

    // Eigenes p-Quantil: Eingabe bleibt stehen, nur die Schritte werden neu gebaut
    var pInput = h("input", { class: "num-input pg-p", attrs: { id: uid + "-p", type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false" } });
    pInput.value = state.p;
    var pChips = ["0,1", "0,25", "0,5", "2/3", "0,75", "0,8", "0,9"].map(function (txt) {
      return h("button", { class: "chip pg-pchip", attrs: { type: "button", "aria-pressed": "false", "data-p": txt }, text: txt,
        on: { click: function () { pInput.value = txt; state.p = txt; renderP(); renderR(); persist(); } } });
    });
    var pOut = h("div", { class: "pg-p-out", attrs: { "aria-live": "polite" } });
    way.p.body.appendChild(h("div", { class: "pg-p-row" }, [
      h("label", { class: "field", attrs: { for: uid + "-p" }, html: LM.tex("p") + " =" }), pInput,
      h("span", { class: "pg-p-hint", text: "zwischen 0 und 1, auch als Bruch wie 2/3" })
    ]));
    way.p.body.appendChild(h("div", { class: "pg-chips pg-pchips", attrs: { role: "group", "aria-label": "p schnell wählen" } }, pChips));
    way.p.body.appendChild(pOut);
    var WAY_KEYS = ["mod", "med", "mean", "q1", "q3", "iqr", "box", "trim", "gm", "hm", "skew"];
    var wayBodies = {};
    WAY_KEYS.forEach(function (k) {
      wayBodies[k] = h("div", { class: "pg-det-inner" });
      way[k].body.appendChild(wayBodies[k]);
    });

    /* ---------- Ausgabe: R-Code ---------- */

    var rCodeEl = h("code");
    var copyBtn = h("button", { class: "btn btn-sm", attrs: { type: "button" }, html: ICON_COPY + "Kopieren" });
    var copyMsg = h("p", { class: "pg-copy-msg", attrs: { role: "status", "aria-live": "polite" } });
    var rAnsEl = h("code");
    var rCodePre = h("pre", { class: "pg-pre", attrs: { tabindex: "0", "aria-label": "R-Code" } }, [rCodeEl]);
    var rAnsPre = h("pre", { class: "pg-pre pg-pre-out", attrs: { tabindex: "0", "aria-label": "Ausgabe von R" } }, [rAnsEl]);
    var rAnsDet = h("details", { class: "pg-rans" }, [h("summary", { text: "Was R antwortet" }), rAnsPre]);
    var rSec = h("section", { class: "pg-sec pg-r", attrs: { "aria-label": "R-Code zum Nachprüfen" } }, [
      h("div", { class: "pg-sec-head" }, [h("h4", { class: "pg-h", text: "R-Code zum Nachprüfen" }), copyBtn]),
      h("p", { class: "pg-help", html: "Kopier den Code nach RStudio und führ ihn aus. Dann siehst du dieselben Zahlen wie oben. " +
        "Alles hinter <code>#</code> ist ein Kommentar für dich, R überspringt ihn." }),
      rCodePre, copyMsg, rAnsDet
    ]);

    /* ---------- Zusammenbau ---------- */

    var emptyBox = h("div", { class: "pg-empty", attrs: { hidden: "" } }, [
      h("p", { html: "<b>Noch keine Zahlen.</b> Tipp oben welche ein, zum Beispiel 3 6 8 9 11. Oder nimm ein Beispiel." }),
      h("button", { class: "btn btn-sm", attrs: { type: "button" }, text: "Beispiel laden", on: { click: function () { loadValues(PRESETS[DEFAULT_PRESET].values); } } })
    ]);
    var srBox = h("p", { class: "pg-sr", attrs: { role: "status", "aria-live": "polite" } });
    var results = h("div", { class: "pg-results" }, [tilesBox, notesBox, vizSec, cardsSec,
      h("section", { class: "pg-sec", attrs: { "aria-label": "Häufigkeitstabelle" } }, [freqDet]), waySec, rSec]);
    var out = h("div", { class: "w-out pg-out" }, [emptyBox, results, srBox]);

    el.appendChild(h("div", { class: "w-head" }, [
      h("h3", { html: 'Alle Lagemaße auf einen Blick <span class="w-badge">Live</span>' }),
      h("p", { class: "w-sub", text: "Tipp Zahlen ein oder nimm ein Beispiel. Alles rechnet sich sofort neu, mit Rechenweg und R-Code." })
    ]));
    el.appendChild(inPanel);
    el.appendChild(out);

    /* ---------- Rechnen und Anzeigen ---------- */

    var cur = null, prevKey = null, animate = false, timer = 0, pTimer = 0;
    var chart = LM.svg.responsive(chartHost, draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cur) chart.redraw(); });

    function schedule() { clearTimeout(timer); timer = setTimeout(function () { compute(false); }, 280); }
    function computeNow(pop) { clearTimeout(timer); compute(!!pop); }

    function readInput() { return state.mode === "list" ? core.readList(state.text) : core.readRows(state.rows); }

    function compute(force) {
      var input = readInput();
      renderParse(input);
      markRowProblems(input);
      var values = input.values, key = values.join(",");
      var changed = key !== prevKey;
      prevKey = key;
      updatePresets(values);
      persist();
      if (!changed && !force) return;
      if (!values.length) {
        cur = null;
        emptyBox.hidden = false;
        results.hidden = true;
        srBox.textContent = "Noch keine Zahlen.";
        return;
      }
      emptyBox.hidden = true;
      results.hidden = false;
      cur = core.ctx(values);
      animate = changed && !LM.reduceMotion;
      renderTiles(cur, changed || force);
      renderNotes(cur);
      if (lastW) draw(lastW); else chart.redraw(); // Breite ist bekannt: kein erzwungenes Layout
      renderBoxNote(cur);
      renderCards(cur);
      renderFreq(cur);
      renderWay(cur);
      renderP();
      renderR();
      var sm = cur.sum;
      srBox.textContent = "n = " + I(cur.n) + ". Modus " + (sm.mode.unique ? cur.f(sm.mode.value) : "kein eindeutiger") +
        ". Median " + cur.f(sm.median.value) + ". Mittel " + cur.f(sm.mean.value) +
        ". Q1 " + cur.f(sm.q1.value) + ". Q3 " + cur.f(sm.q3.value) + ". Schiefe: " + core.skewWord(sm.skew.diffDirection) + ".";
    }

    function renderParse(input) {
      var parts = [];
      if (state.mode === "list") {
        if (!input.total && !input.bad.length) parts.push('<span class="pg-muted">Noch keine Zahlen erkannt.</span>');
        else parts.push('<span class="pg-ok">' + I(input.total) + (input.total === 1 ? " Zahl" : " Zahlen") + " erkannt</span>");
        if (input.bad.length) {
          parts.push('<span class="pg-bad">Weggelassen: ' + input.bad.slice(0, 8).map(function (t) { return "„" + LM.esc(t.slice(0, 24)) + "“"; }).join(", ") +
            (input.bad.length > 8 ? " und " + I(input.bad.length - 8) + " weitere" : "") + "</span>");
          var hint = core.badHint(input.bad);
          if (hint) parts.push('<span class="pg-bad">' + LM.esc(hint) + "</span>");
        }
      } else {
        parts.push(input.total ? '<span class="pg-ok">Zusammen n = ' + I(input.total) + " Werte</span>" : '<span class="pg-muted">Noch keine vollständige Zeile.</span>');
        if (input.problems.length) parts.push('<span class="pg-bad">Rot markiert: keine gültige Zahl. Anzahlen sind ganze Zahlen ab 0.</span>');
        if (input.incomplete) parts.push('<span class="pg-muted">' + (input.incomplete === 1 ? "Eine Zeile ist" : I(input.incomplete) + " Zeilen sind") + " noch unvollständig.</span>");
        tabSum.textContent = "n = " + I(input.total);
      }
      if (input.cut) parts.push('<span class="pg-bad">Das sind ' + I(input.total) + " Werte. Hier gehen höchstens " + I(MAX) + ", ich rechne mit den ersten " + I(MAX) + ".</span>");
      parseLine.innerHTML = parts.join("");
    }

    function markRowProblems(input) {
      rowEls.forEach(function (r) { r.v.classList.remove("is-miss"); r.h.classList.remove("is-miss"); });
      if (state.mode !== "table") return;
      input.problems.forEach(function (p) { var r = rowEls[p.row]; if (r) r[p.field].classList.add("is-miss"); });
    }

    function setTile(k, text, hintHtml, aria, pop) {
      var t = tiles[k];
      var isText = /[a-z]/i.test(text);
      // kurzes Aufploppen, wenn sich der Wert ändert (Web Animations: kein erzwungenes Neu-Layout)
      if (pop && t.val.textContent !== text && !LM.reduceMotion && t.val.animate) {
        t.val.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)", offset: 0.35 }, { transform: "scale(1)" }],
          { duration: 460, easing: "cubic-bezier(.2, .8, .2, 1)" });
      }
      t.val.textContent = text;
      t.val.classList.toggle("pg-txt", isText);
      t.val.classList.toggle("pg-long", !isText && text.length > 6);
      t.hint.innerHTML = hintHtml;
      t.btn.setAttribute("aria-label", t.t.name + ": " + aria + ". Rechenweg anzeigen.");
    }

    function renderTiles(c, pop) {
      var f = c.f, sm = c.sum, mi = sm.mode;
      if (mi.unique) setTile("mod", f(mi.value), I(mi.maxCount) + "-mal", f(mi.value), pop);
      else setTile("mod", "kein ein\u00addeutiger", mi.allEqual ? "alle gleich oft" : "Gleichstand", "kein eindeutiger Modus", pop);
      setTile("med", f(sm.median.value), places(sm.median.positions), f(sm.median.value), pop);
      setTile("mean", f(sm.mean.value), f(sm.mean.sum) + " ÷ " + I(c.n), f(sm.mean.value), pop);
      setTile("n", I(c.n), I(c.freq.length) + " verschiedene", I(c.n) + " Werte", pop);
      setTile("min", f(c.s[0]), "x<sub>(1)</sub>", f(c.s[0]), pop);
      setTile("q1", f(sm.q1.value), places(sm.q1.positions), f(sm.q1.value), pop);
      setTile("q3", f(sm.q3.value), places(sm.q3.positions), f(sm.q3.value), pop);
      setTile("max", f(c.s[c.n - 1]), "x<sub>(" + I(c.n) + ")</sub>", f(c.s[c.n - 1]), pop);
      setTile("iqr", f(sm.box0.iqr), f(sm.q3.value) + " − " + f(sm.q1.value), f(sm.box0.iqr), pop);
      // Weitere Kennwerte
      var tr = sm.trim10, gm = sm.geometric, hm = sm.harmonic, sk = sm.skew, dd = core.skewDigits(sk.diff, c.D);
      setTile("trim", f(tr.value), tr.k ? "k = " + I(tr.k) + " je Seite weg" : "k = 0: nichts weg",
        f(tr.value) + ", an jedem Ende " + I(tr.k) + (tr.k === 1 ? " Wert" : " Werte") + " gestrichen", pop);
      if (gm.ok) setTile("gm", f(gm.value), "Wurzel aus dem Produkt", f(gm.value), pop);
      else setTile("gm", "–", "nur für positive Werte", "nicht berechenbar, nur für positive Werte", pop);
      if (hm.ok) setTile("hm", f(hm.value), I(c.n) + " ÷ Summe der Kehrwerte", f(hm.value), pop);
      else setTile("hm", "–", "nur für positive Werte", "nicht berechenbar, nur für positive Werte", pop);
      setTile("skew", core.signed(sk.diff, dd), core.skewWord(sk.diffDirection), core.signed(sk.diff, dd) + ", " + core.skewWord(sk.diffDirection), pop);
      if (isFinite(sk.gp)) setTile("gp", core.signed(sk.gp, 3), core.skewWord(sk.gpDirection), core.signed(sk.gp, 3) + ", " + core.skewWord(sk.gpDirection), pop);
      else setTile("gp", "nicht definiert", "weil Q<sub>3</sub> = Q<sub>1</sub>", "nicht definiert, weil Q3 gleich Q1 ist", pop);
    }

    function renderNotes(c) {
      notesBox.innerHTML = core.notes(c).map(function (n) {
        return '<div class="callout callout-tip pg-note"><p><b>' + n.title + ".</b> " + n.html + "</p></div>";
      }).join("");
    }

    function renderBoxNote(c) {
      var f = c.f, b = c.sum.box15;
      if (!state.range) {
        boxNote.innerHTML = "<b><code>range = 0</code>:</b> Die Whisker reichen bis zum kleinsten Wert " + f(c.sum.box0.lo) + " und zum größten Wert " +
          f(c.sum.box0.hi) + ". So zeichnest du den Boxplot in der Klausur.";
      } else {
        var outs = b.out.map(f);
        boxNote.innerHTML = "<b><code>range = 1.5</code>:</b> Grenzen " + f(b.q1) + " − " + f(1.5) + " · " + f(b.iqr) + " = " + f(b.fences[0]) + " und " +
          f(b.q3) + " + " + f(1.5) + " · " + f(b.iqr) + " = " + f(b.fences[1]) + ". " +
          (outs.length ? "Außerhalb: " + (outs.length > 8 ? joinVals(outs.slice(0, 8)) + " …" : joinVals(outs)) + ". Diese Werte sind einzelne Punkte, also mögliche Ausreißer."
            : "Kein Wert liegt außerhalb. Darum gibt es keine Ausreißer-Punkte.");
      }
      var hn = core.hingeNote(c, state.range);
      hingeNote.hidden = !hn;
      hingeNote.innerHTML = hn ? "<p><b>Hinweis zu R.</b> " + hn + "</p>" : "";
    }

    function renderCards(c) {
      cardsHost.innerHTML = "";
      var sm = c.sum, mi = sm.mode, f = c.f, parts = [];
      function build(target) {
        var api = LM.cards(target, { values: c.s, sorted: true, small: true });
        if (state.hl.mod) {
          var mv = mi.unique ? [mi.value] : (mi.allEqual ? [] : mi.values);
          api.markWhere(function (v) { return mv.indexOf(v) >= 0; }, "is-mod");
        }
        if (state.hl.med) api.mark(sm.median.positions, "is-med");
        if (state.hl.q) api.mark(sm.q1.positions.concat(sm.q3.positions), "is-q");
      }
      if (c.n > 40) {
        // Viele Werte: Karten im Aufklapper, gebaut erst beim Aufklappen (spart Zeit beim Tippen)
        var det = h("details", { class: "pg-cards-det" }, [h("summary", { text: "Alle " + I(c.n) + " Werte sortiert anzeigen" })]);
        var built = false;
        det.addEventListener("toggle", function () {
          cardsOpen = det.open;
          if (det.open && !built) { built = true; build(det); }
        });
        cardsHost.appendChild(det);
        if (cardsOpen) { built = true; build(det); det.open = true; }
      } else {
        build(cardsHost);
      }
      if (state.hl.mod) {
        parts.push('<span class="t-mod"><b>Modus:</b> ' + (mi.unique ? f(mi.value) + " (" + I(mi.maxCount) + "-mal)"
          : mi.allEqual ? "keiner, alle gleich oft" : "keiner, Gleichstand bei " + und(mi.values.slice(0, 6).map(f))) + "</span>");
      }
      if (state.hl.med) parts.push('<span class="t-med"><b>Median:</b> ' + places(sm.median.positions) + ", also " + f(sm.median.value) + "</span>");
      if (state.hl.q) {
        parts.push('<span class="t-q"><b>Q<sub>1</sub>:</b> ' + places(sm.q1.positions) + " · <b>Q<sub>3</sub>:</b> " + places(sm.q3.positions) + "</span>");
      }
      cardsCap.innerHTML = parts.length ? parts.join('<span class="pg-sep" aria-hidden="true"> · </span>') : "Tipp oben auf einen Knopf, dann leuchten die passenden Plätze auf.";
    }

    function renderFreq(c) {
      var t = c.freq, f = c.f, mi = c.sum.mode;
      var marks = [
        { pos: c.sum.q1.positions, cls: "q", label: "Q<sub>1</sub>" },
        { pos: c.sum.median.positions, cls: "med", label: "Median" },
        { pos: c.sum.q3.positions, cls: "q", label: "Q<sub>3</sub>" }
      ];
      var body = t.map(function (r) {
        var pills = "";
        if (mi.unique && r.value === mi.value) pills += '<span class="pg-pill pg-pill-mod">Modus</span>';
        marks.forEach(function (m) {
          if (m.pos.some(function (p) { return p >= r.from && p <= r.to; })) pills += '<span class="pg-pill pg-pill-' + m.cls + '">' + m.label + "</span>";
        });
        var pl = r.from === r.to ? I(r.from) : I(r.from) + "–" + I(r.to);
        return '<tr><td class="num">' + LM.esc(f(r.value)) + '</td><td class="num">' + I(r.h) + '</td><td class="num">' + fmtc(r.f, 3) +
          '</td><td class="num">' + I(r.H) + '</td><td class="num">' + fmtc(r.F, 3) + '</td><td class="pg-pl"><span class="pg-pl-n">' + pl + "</span>" + pills + "</td></tr>";
      }).join("");
      function th(sym, word, num) { return '<th scope="col"' + (num ? ' class="num"' : "") + ">" + LM.tex(sym) + '<span class="pg-th-sub">' + word + "</span></th>"; }
      freqBody.innerHTML = '<p class="pg-help">Kumuliert heißt aufsummiert. An ' + LM.tex("H_j") +
        " siehst du, bis zu welchem Platz ein Wert reicht. So findest du Median und Quartile direkt in der Tabelle.</p>" +
        '<div class="table-wrap"><table class="t pg-ft"><thead><tr>' +
        th("a_j", "Wert", true) + th("h_j", "Anzahl", true) + th("f_j", "Anteil", true) + th("H_j", "kumuliert", true) + th("F_j", "kum. Anteil", true) +
        '<th scope="col">Plätze</th></tr></thead><tbody>' + body + '</tbody><tfoot><tr><th scope="row">Summe</th><td class="num">' + I(c.n) +
        '</td><td class="num">' + LM.fmt(1, 0) + "</td><td></td><td></td><td></td></tr></tfoot></table></div>";
      freqVal.textContent = I(t.length) + (t.length === 1 ? " verschiedener Wert" : " verschiedene Werte");
      if (!freqTouched) { freqWant = t.length <= 12; freqDet.open = freqWant; }
    }

    function resultHtml(cls, html) { return '<p class="pg-res pg-res-' + cls + '"><span class="pg-res-l">Ergebnis</span> ' + html + "</p>"; }
    function stepsHtml(steps) {
      return '<ol class="steps pg-steps">' + steps.map(function (s) { return '<li><div class="pg-st">' + core.glue(s) + "</div></li>"; }).join("") + "</ol>";
    }
    function fill(k, cls, res, extra) {
      wayBodies[k].innerHTML = stepsHtml(res.steps) + (extra || "") +
        resultHtml(cls, res.result.html || (res.result.tex ? LM.tex(res.result.tex) : "<b>kein eindeutiger Modus</b>"));
    }

    // Kurzwerte in den Überschriften (billig, ohne Formeln). Die Schritte baut ensureWay erst beim Aufklappen.
    function renderWay(c) {
      var f = c.f, sm = c.sum, b = sm.box0, sk = sm.skew, dd = core.skewDigits(sk.diff, c.D);
      wayDone = {};
      way.mod.val.textContent = sm.mode.unique ? f(sm.mode.value) : "kein eindeutiger";
      way.med.val.textContent = f(sm.median.value);
      way.mean.val.textContent = f(sm.mean.value);
      way.q1.val.textContent = f(sm.q1.value);
      way.q3.val.textContent = f(sm.q3.value);
      way.iqr.val.textContent = f(b.iqr);
      way.box.val.textContent = [b.lo, b.q1, b.med, b.q3, b.hi].map(f).join(" · ");
      way.trim.val.textContent = f(sm.trim10.value);
      way.gm.val.textContent = sm.geometric.ok ? f(sm.geometric.value) : "–";
      way.hm.val.textContent = sm.harmonic.ok ? f(sm.harmonic.value) : "–";
      way.skew.val.textContent = core.signed(sk.diff, dd) + " · " + (sk.diffDirection === "undefiniert" ? "nicht definiert" : sk.diffDirection);
      WAY_KEYS.forEach(function (k) { if (way[k].det.open) ensureWay(k); });
    }

    function ensureWay(k) {
      if (!cur) return;
      if (k === "p") { renderP(); return; }
      if (wayDone[k]) return;
      wayDone[k] = true;
      var c = cur;
      if (k === "mod") fill("mod", "mod", core.stepsMode(c));
      else if (k === "med") fill("med", "med", core.stepsMedian(c));
      else if (k === "mean") fill("mean", "mean", core.stepsMean(c));
      else if (k === "q1") fill("q1", "q", core.stepsQuantile(c, 0.25, "Q_1", "0{,}25"));
      else if (k === "q3") fill("q3", "q", core.stepsQuantile(c, 0.75, "Q_3", "0{,}75"));
      else if (k === "iqr") fill("iqr", "q", core.stepsIqr(c));
      else if (k === "box") {
        var b = core.stepsBox(c), hn = core.hingeNote(c, 1.5);
        wayBodies.box.innerHTML = stepsHtml(b.steps) + (hn ? '<div class="callout callout-tip pg-note"><p><b>Hinweis zu R.</b> ' + hn + "</p></div>" : "") +
          resultHtml("q", "Fünf Zahlen: " + LM.esc(b.result.text));
      }
      else if (k === "trim") fill("trim", "mean", core.stepsTrim(c));
      else if (k === "gm") fill("gm", "mean", core.stepsGeo(c));
      else if (k === "hm") fill("hm", "mean", core.stepsHarm(c));
      else if (k === "skew") fill("skew", "n", core.stepsSkew(c));
    }

    function renderP() {
      var txt = state.p.trim();
      pChips.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-p") === txt)); });
      if (!cur) return;
      var pp = core.parseP(txt);
      pInput.classList.toggle("is-miss", !pp.ok && txt !== "");
      way.p.val.textContent = pp.ok ? cur.f(S.quantile(cur.xs, pp.p)) : "";
      if (!way.p.det.open) return;
      if (!pp.ok) {
        pOut.innerHTML = '<p class="feedback miss">' + (txt ? "p muss zwischen 0 und 1 liegen, zum Beispiel 0,8 oder 2/3." : "Gib ein p ein, zum Beispiel 0,8.") + "</p>";
        return;
      }
      var name = "\\tilde{x}_{" + core.texPsub(pp) + "}";
      var st = core.stepsQuantile(cur, pp.p, name, core.texP(pp));
      pOut.innerHTML = stepsHtml(st.steps) + resultHtml("q", LM.tex(st.result.tex));
    }

    function renderR() {
      if (!cur) return;
      var pp = core.parseP(state.p);
      var items = core.rItems(cur.xs, { range: state.range, p: pp.ok ? pp : null });
      var codeLines = core.rCodeText(items).split("\n"), ans = core.rAnswer(items);
      rCodeEl.innerHTML = codeLines.map(function (line) {
        return line.charAt(0) === "#" ? '<span class="pg-com">' + LM.esc(line) + "</span>" : line ? '<span class="pg-cl">' + LM.esc(line) + "</span>" : "";
      }).join("\n");
      rAnsEl.innerHTML = ans.map(function (l) {
        if (l.echo !== undefined) return '<span class="pg-echo">' + LM.esc(l.echo) + "</span>";
        if (l.note !== undefined) return '<span class="pg-rnote">' + LM.esc(l.note) + "</span>";
        return LM.esc(l.out);
      }).join("\n");
      rCodePre.classList.toggle("pg-pre-long", codeLines.length > 48);
      rAnsPre.classList.toggle("pg-pre-long", ans.length > 48);
    }

    /* ---------- Diagramm ---------- */

    // Textbreite mit einem Canvas messen: Das erzwingt kein Layout der ganzen Seite (getComputedTextLength schon).
    // Schrift wie .lbl/.tick aus style.css (var(--font-display)). Ohne Canvas: Messen im SVG.
    var mctx = null, mfont = "";
    function textWidth(str, px, weight, el) {
      if (mctx === null) {
        try {
          mctx = document.createElement("canvas").getContext("2d") || false;
          mfont = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
        } catch (e) { mctx = false; }
      }
      if (mctx) { mctx.font = weight + " " + px + "px " + mfont; return mctx.measureText(str).width; }
      var w = 0;
      try { w = el.getComputedTextLength(); } catch (e) { w = 0; }
      return w || str.length * px * 0.6;
    }

    var lastW = 0;
    function draw(w) {
      chartHost.innerHTML = "";
      lastW = w || lastW;
      var c = cur;
      if (!c || !w) return;
      var E = LM.svg.el, n = c.n, s = c.s, f = c.f, sm = c.sum, mi = sm.mode;
      var narrow = w < 560, pad = narrow ? 12 : 20;
      var lo = s[0], hi = s[n - 1];
      if (hi - lo < EPS) { var dd = Math.max(1, Math.abs(lo) * 0.1); lo -= dd; hi += dd; }
      var span = hi - lo, d0 = lo - span * 0.05, d1 = hi + span * 0.05;
      var X = LM.svg.scale(d0, d1, pad, w - pad);

      // Punktgröße und Stapel
      var tab = c.freq, minGap = Infinity, j;
      for (j = 1; j < tab.length; j++) minGap = Math.min(minGap, X(tab[j].value) - X(tab[j - 1].value));
      var r = Math.max(3, Math.min(narrow ? 6 : 7, minGap / 2 - 0.5));
      var groups = core.stacks(tab, X, r), maxCount = 0;
      groups.forEach(function (g) { maxCount = Math.max(maxCount, g.count); });
      var maxH = narrow ? 118 : 150;
      var dy = maxCount > 1 ? Math.min(2 * r, (maxH - 2 * r) / (maxCount - 1)) : 2 * r;
      var dotsH = Math.max(2 * r + (maxCount - 1) * dy + 4, 56);

      var med = sm.median.value, q1 = sm.q1.value, q3 = sm.q3.value, mean = sm.mean.value;
      var box = state.range ? sm.box15 : sm.box0;
      var svg = E("svg", {
        width: w, height: 200, viewBox: "0 0 " + w + " 200", class: "pg-svg" + (animate ? " pg-anim" : ""), role: "img",
        "aria-label": "Punktdiagramm der " + I(n) + " Werte mit Boxplot darunter. " + (mi.unique ? "Modus " + f(mi.value) + ", " : "") +
          "Median " + f(med) + ", Mittel " + f(mean) + ", Q1 " + f(q1) + ", Q3 " + f(q3) + "."
      }, chartHost);
      animate = false;
      var gGrid = E("g", {}, svg), gLines = E("g", {}, svg), gBox = E("g", {}, svg), gDots = E("g", {}, svg), gMean = E("g", {}, svg), gLbl = E("g", {}, svg);

      // Beschriftungen oben: erst setzen und messen, dann ohne Überlappung verteilen
      var specs = [];
      if (mi.unique) specs.push({ key: "mod", x: X(mi.value), anchor: "middle", parts: [["Modus " + f(mi.value)]] });
      specs.push({ key: "q", x: X(q1), anchor: "end", parts: [["Q"], ["1", 1], [" " + f(q1)]] });
      specs.push({ key: "med", x: X(med), anchor: "middle", parts: [["Median " + f(med)]] });
      specs.push({ key: "q", x: X(q3), anchor: "start", parts: [["Q"], ["3", 1], [" " + f(q3)]] });
      specs.forEach(function (sp) {
        var t = E("text", { x: 0, y: -50, class: "lbl lbl-" + sp.key + " pg-halo pg-mk pg-mk-" + sp.key }, gLbl), sub = false, wsum = 0;
        sp.parts.forEach(function (pt) {
          var a = pt[1] ? { class: "pg-sub", dy: "3" } : sub ? { dy: "-3" } : {};
          var ts = E("tspan", a, t);
          ts.textContent = pt[0];
          sub = !!pt[1];
          wsum += textWidth(pt[0], pt[1] ? 9 : 12, 700, ts);
        });
        sp.el = t;
        sp.w = wsum;
      });
      var lay = core.layoutLabels(specs, 2, w - 2, 8, 5);
      var rowH = 17, R = lay.rows;
      function yRow(row) { return 13 + (R - 1 - row) * rowH; }
      var yTop = 13 + (R - 1) * rowH + 12;
      var yBase = yTop + dotsH, yMeanLbl = yBase + 31;
      var boxH = 26, yBox = yBase + 48 + boxH / 2, yBoxTop = yBox - boxH / 2;
      var yAxis = yBox + boxH / 2 + 16, H = yAxis + 24;
      svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "0 0 " + w + " " + H);

      // Gitter und Achsen
      var ticks = LM.svg.ticks(d0, d1, narrow ? 5 : 8).filter(function (t) { return t >= d0 - EPS && t <= d1 + EPS; });
      ticks.forEach(function (t) {
        var x = X(t);
        E("line", { x1: x, y1: yTop - 4, x2: x, y2: yAxis, class: "gridline" }, gGrid);
        E("line", { x1: x, y1: yAxis, x2: x, y2: yAxis + 5, class: "ax" }, gGrid);
        var tt = fmtc(t, 4), lab = LM.svg.text(gGrid, x, yAxis + 18, tt, { class: "tick", "text-anchor": "middle" });
        var lw = textWidth(tt, 12, 500, lab);
        if (x - lw / 2 < 1) { lab.setAttribute("text-anchor", "start"); lab.setAttribute("x", 1); }
        else if (x + lw / 2 > w - 1) { lab.setAttribute("text-anchor", "end"); lab.setAttribute("x", w - 1); }
      });
      E("line", { x1: pad - 6, y1: yBase, x2: w - pad + 6, y2: yBase, class: "ax" }, gGrid);
      E("line", { x1: pad - 6, y1: yAxis, x2: w - pad + 6, y2: yAxis, class: "ax" }, gGrid);

      // Punkte (in sortierter Reihenfolge; pg-cut = beim getrimmten Mittel gestrichen)
      var modeTop = yBase, tk = sm.trim10.k || 0, idx = 0;
      groups.forEach(function (g, gi) {
        var gEl = E("g", { class: "pg-stack" }, gDots), level = 0;
        E("title", {}, gEl).textContent = g.rows.map(function (row) { return f(row.value) + ": " + I(row.h) + "-mal"; }).join(", ");
        g.rows.forEach(function (row) {
          var cls = "dot pg-dot", isMod = mi.unique && row.value === mi.value;
          if (isMod) cls += " pg-dot-mod";
          else if (!mi.unique && !mi.allEqual && mi.values.indexOf(row.value) >= 0) cls += " pg-dot-tie";
          for (var k = 0; k < row.h; k++, level++, idx++) {
            E("circle", { cx: g.px, cy: yBase - r - 2 - level * dy, r: r, class: cls + (idx < tk || idx >= n - tk ? " pg-cut" : ""),
              style: "--d:" + Math.min(650, level * 32 + gi * 9) + "ms" }, gEl);
          }
        });
        // Die Linie zum Modus endet über dem ganzen Stapel
        if (mi.unique && g.rows.some(function (row) { return row.value === mi.value; })) modeTop = yBase - 2 - (g.count - 1) * dy - 2 * r;
      });

      // Linien von den Beschriftungen nach unten
      specs.forEach(function (sp, i) {
        var it = lay.items[i], yl = it.anchor === "middle" ? yRow(it.row) + 5 : yRow(it.row) - 10;
        if (sp.key === "mod") {
          E("line", { x1: sp.x, y1: yRow(it.row) + 5, x2: sp.x, y2: modeTop - 3, class: "pg-lead pg-mk pg-mk-mod" }, gLines);
        } else {
          E("line", { x1: sp.x, y1: yl, x2: sp.x, y2: yBoxTop, class: (sp.key === "med" ? "mk-med pg-line-med" : "mk-q pg-line-q") + " pg-mk pg-mk-" + sp.key }, gLines);
        }
        sp.el.setAttribute("x", it.left);
        sp.el.setAttribute("y", yRow(it.row));
      });

      // Boxplot auf derselben Skala
      var bx1 = X(box.q1), bx3 = X(box.q3);
      E("line", { x1: X(box.lo), y1: yBox, x2: bx1, y2: yBox, class: "whisker pg-mk pg-mk-ext" }, gBox);
      E("line", { x1: bx3, y1: yBox, x2: X(box.hi), y2: yBox, class: "whisker pg-mk pg-mk-ext" }, gBox);
      E("line", { x1: X(box.lo), y1: yBox - 8, x2: X(box.lo), y2: yBox + 8, class: "whisker pg-mk pg-mk-ext" }, gBox);
      E("line", { x1: X(box.hi), y1: yBox - 8, x2: X(box.hi), y2: yBox + 8, class: "whisker pg-mk pg-mk-ext" }, gBox);
      E("rect", { x: Math.min(bx1, bx3) - (bx3 - bx1 < 2 ? 1 : 0), y: yBoxTop, width: Math.max(2, bx3 - bx1), height: boxH, rx: 3, class: "box-q pg-mk pg-mk-q" }, gBox);
      E("line", { x1: X(box.med), y1: yBoxTop, x2: X(box.med), y2: yBoxTop + boxH, class: "mk-med pg-box-med pg-mk pg-mk-med" }, gBox);
      var lastLbl = -Infinity;
      box.out.forEach(function (v) {
        var x = X(v);
        E("circle", { cx: x, cy: yBox, r: 5, class: "dot-out pg-mk pg-mk-ext" }, gBox);
        if (box.out.length <= 8 && x - lastLbl > 26) {
          LM.svg.text(gBox, x, yBox - 11, f(v), { class: "tick pg-out-lbl pg-halo pg-mk pg-mk-ext", "text-anchor": "middle" });
          lastLbl = x;
        }
      });

      // Mittel: Dreieck unter der Achse, wie der Drehpunkt einer Wippe
      var mx = X(mean);
      E("path", { d: "M" + mx + " " + (yBase + 3) + " l-7 12 h14 z", class: "mk-mean pg-mk pg-mk-mean" }, gMean);
      var mtxt = "Mittel " + f(mean);
      var mt = LM.svg.text(gMean, mx, yMeanLbl, mtxt, { class: "lbl lbl-mean pg-halo pg-mk pg-mk-mean", "text-anchor": "middle" });
      var mw = textWidth(mtxt, 12, 700, mt);
      if (mx - mw / 2 < 2) { mt.setAttribute("text-anchor", "start"); mt.setAttribute("x", 2); }
      else if (mx + mw / 2 > w - 2) { mt.setAttribute("text-anchor", "end"); mt.setAttribute("x", w - 2); }
    }

    function setFocus(key) {
      if (key) chartHost.setAttribute("data-focus", key);
      else chartHost.removeAttribute("data-focus");
    }

    /* ---------- Aktionen ---------- */

    function setMode(m) {
      if (m === state.mode) return;
      if (!state.synced) {
        if (m === "table") {
          var vals = core.readList(state.text).values;
          state.rows = vals.length ? core.rowsFromValues(vals) : blankRows();
          renderRows();
        } else {
          state.text = core.textFromValues(core.readRows(state.rows).values);
          ta.value = state.text;
        }
        state.synced = true;
      }
      state.mode = m;
      syncMode();
      computeNow(false);
    }
    function syncMode() {
      segList.setAttribute("aria-pressed", String(state.mode === "list"));
      segTable.setAttribute("aria-pressed", String(state.mode === "table"));
      listBox.hidden = state.mode !== "list";
      tableBox.hidden = state.mode !== "table";
    }

    function renderRows() {
      rowsHost.innerHTML = "";
      rowEls = state.rows.map(function (row, i) {
        var vIn = h("input", { class: "num-input pg-cell", attrs: { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", "aria-label": "Wert in Zeile " + (i + 1) } });
        var cIn = h("input", { class: "num-input pg-cell", attrs: { type: "text", inputmode: "numeric", autocomplete: "off", spellcheck: "false", "aria-label": "Anzahl in Zeile " + (i + 1) } });
        vIn.value = row.v;
        cIn.value = row.h;
        vIn.addEventListener("input", function () { row.v = vIn.value; state.synced = false; randomNote = ""; schedule(); });
        cIn.addEventListener("input", function () { row.h = cIn.value; state.synced = false; randomNote = ""; schedule(); });
        vIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); cIn.focus(); } });
        cIn.addEventListener("keydown", function (e) {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (i === state.rows.length - 1) addRow(true);
          else rowEls[i + 1].v.focus();
        });
        var del = h("button", { class: "pg-del", attrs: { type: "button", "aria-label": "Zeile " + (i + 1) + " löschen", title: "Zeile löschen" }, html: "&times;" });
        del.addEventListener("click", function () {
          state.rows.splice(i, 1);
          if (!state.rows.length) state.rows.push({ v: "", h: "" });
          state.synced = false;
          renderRows();
          rowEls[Math.min(i, rowEls.length - 1)].v.focus();
          computeNow(false);
        });
        rowsHost.appendChild(h("div", { class: "pg-row" }, [vIn, cIn, del]));
        return { v: vIn, h: cIn };
      });
    }
    function addRow(focus) {
      if (state.rows.length >= 200) { LM.toast("Mehr als 200 Zeilen gehen hier nicht."); return; }
      state.rows.push({ v: "", h: "" });
      renderRows();
      if (focus) rowEls[rowEls.length - 1].v.focus();
    }

    function loadValues(values, note) {
      randomNote = note || "";
      state.text = core.textFromValues(values);
      state.rows = core.rowsFromValues(values);
      state.synced = true;
      ta.value = state.text;
      renderRows();
      computeNow(true);
    }

    function rollRandom() {
      var n = clampInt(LM.parseNum(nInput.value), 5, 30, 12);
      nInput.value = String(n);
      state.randN = n;
      loadValues(core.random(n), "Zufallsdaten: " + I(n) + " ganze Zahlen von " + I(0) + " bis " + I(50) + ". Klick nochmal auf „Zufall“ für neue Zahlen.");
    }

    function clearAll() {
      randomNote = "";
      state.text = "";
      ta.value = "";
      state.rows = blankRows();
      state.synced = true;
      renderRows();
      computeNow(false);
      if (state.mode === "list") ta.focus(); else rowEls[0].v.focus();
    }

    function setRange(r) {
      state.range = r;
      rangeBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", String((i ? 1.5 : 0) === r)); });
      if (cur) { if (lastW) draw(lastW); else chart.redraw(); renderBoxNote(cur); renderR(); }
      persist();
    }

    function updatePresets(values) {
      var key = S.sorted(values).join(","), active = null;
      PRESETS.forEach(function (p, i) {
        var on = values.length > 0 && p.key === key;
        presetBtns[i].setAttribute("aria-pressed", String(on));
        if (on) active = p;
      });
      var note = active ? active.note : values.length ? randomNote : "";
      presetNote.hidden = !note;
      presetNote.textContent = note;
    }

    function openDetails(k) {
      var target = k === "freq" ? freqDet : way[k].det;
      if (k === "freq") freqTouched = true;
      else ensureWay(k);
      target.open = true;
      try { target.scrollIntoView({ behavior: LM.reduceMotion ? "auto" : "smooth", block: "start" }); } catch (e) { target.scrollIntoView(); }
      var sum = target.querySelector("summary");
      if (sum) { try { sum.focus({ preventScroll: true }); } catch (e) { sum.focus(); } }
      if (!LM.reduceMotion) {
        target.classList.remove("pg-flash");
        void target.offsetWidth;
        target.classList.add("pg-flash");
      }
    }

    function persist() {
      LM.store.set("playground", { mode: state.mode, text: state.text, rows: state.rows, range: state.range, p: state.p, hl: state.hl, randN: state.randN, synced: state.synced });
    }

    /* ---------- Ereignisse ---------- */

    segList.addEventListener("click", function () { setMode("list"); });
    segTable.addEventListener("click", function () { setMode("table"); });
    ta.addEventListener("input", function () { state.text = ta.value; state.synced = false; randomNote = ""; schedule(); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); computeNow(true); } });
    addRowBtn.addEventListener("click", function () { addRow(true); });
    calcBtn.addEventListener("click", function () { computeNow(true); });
    clearBtn.addEventListener("click", clearAll);
    randBtn.addEventListener("click", rollRandom);
    nInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rollRandom(); } });
    nInput.addEventListener("change", function () { state.randN = clampInt(LM.parseNum(nInput.value), 5, 30, 12); nInput.value = String(state.randN); persist(); });
    pInput.addEventListener("input", function () {
      state.p = pInput.value;
      clearTimeout(pTimer);
      pTimer = setTimeout(function () { renderP(); renderR(); persist(); }, 200);
    });
    copyBtn.addEventListener("click", function () {
      var text = rCodeEl.textContent;
      function selectIt() {
        try {
          var sel = window.getSelection(), rg = document.createRange();
          rg.selectNodeContents(rCodeEl);
          sel.removeAllRanges();
          sel.addRange(rg);
        } catch (e) { /* nichts zu tun */ }
        copyMsg.className = "pg-copy-msg";
        copyMsg.textContent = "Der Code ist markiert. Drück jetzt Strg + C (am Mac: Cmd + C).";
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyMsg.className = "pg-copy-msg is-ok";
            copyMsg.textContent = "Kopiert. Jetzt in RStudio einfügen und ausführen.";
          }, selectIt);
        } else selectIt();
      } catch (e) { selectIt(); }
    });

    /* ---------- Start ---------- */

    syncMode();
    renderRows();
    computeNow(false);
  }
})(typeof window !== "undefined" ? window : globalThis);
