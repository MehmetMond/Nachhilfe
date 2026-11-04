/*
 * Bündel „basics“ der Lagemaße-Seite (Startseite und Kapitel 1–3).
 *   hero-demo       Startseite: 9 Zufallszahlen sortieren sich, Median und Modus leuchten auf.
 *   sorter          Kapitel 1: Urliste x_i gegen sortierte Liste x_(i), zwei Schnellchecks, eigene Zahlen.
 *   mode-bars       Kapitel 2: Häufigkeiten als Balken mit +/−, Modus oder Gleichstand.
 *   median-stepper  Kapitel 3: Median in vier Schritten, danach ein Ausreißer zum Ausprobieren.
 * Rechnen nur über LM.stats, Zahlen nur über LM.fmt, Formeln über LM.tex. Stile: css/widgets/basics.css (Präfix bs-).
 * Die reine Logik steht oben ohne DOM. In Node wird sie exportiert und in tests/basics.test.js geprüft.
 */
(function (root) {
  "use strict";
  var LM = (root.LM = root.LM || {});

  /* =====================================================================
     Reine Logik (kein DOM)
     ===================================================================== */

  function rng(r) { return typeof r === "function" ? r : Math.random; }
  function fmt(v, d) { return LM.fmt(v, d); }
  function num(v) { return LM.fmt(v, 4); }

  // ["a"] → "a", ["a", "b"] → "a und b", ["a", "b", "c"] → "a, b und c"
  function joinDe(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " und " + items[items.length - 1];
  }

  function timesDe(h) { return h === 1 ? "einmal" : h + "-mal"; }

  // Text als HTML, wobei „8-mal“ nie am Bindestrich umbricht
  function keepTimes(text) {
    return LM.esc(text).replace(/(\d+)-mal/g, '<span class="bs-nw">$1-mal</span>');
  }

  // Zahl für KaTeX: Dezimalkomma als {,} und ein normales Minus
  function texNum(v, d) {
    return fmt(v, d === undefined ? 4 : d).replace("−", "-").replace(",", "{,}");
  }

  // Gerundet anzeigen, mit „≈“ davor, wenn dabei wirklich gerundet wurde
  function approx(v, d) {
    var t = fmt(v, d);
    return (LM.near(LM.parseNum(t), v, 1e-9) ? "" : "≈ ") + t;
  }

  function randInt(lo, hi, r) { return lo + Math.floor(rng(r)() * (hi - lo + 1)); }

  function shuffle(arr, r) {
    r = rng(r);
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function isAscending(a) {
    for (var i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false;
    return true;
  }

  // Mischen, aber nie schon fertig sortiert (sonst gäbe es beim Sortieren nichts zu sehen)
  function scramble(arr, r) {
    var a = shuffle(arr, r), tries = 0, distinct = LM.stats.freq(arr).length > 1;
    while (distinct && isAscending(a) && tries++ < 60) a = shuffle(arr, r);
    return a;
  }

  // Dieselbe Reihenfolge wie LM.cards.sort: nach Wert, bei gleichen Werten nach Position.
  // order[p] = Index in der Urliste, der nach dem Sortieren auf Platz p + 1 steht.
  function stableOrder(values) {
    return values.map(function (v, i) { return { v: v, i: i }; })
      .sort(function (a, b) { return a.v - b.v || a.i - b.i; })
      .map(function (o) { return o.i; });
  }

  /* ---------- hero-demo ---------- */

  // 9 ganze Zahlen von 1 bis 20 mit eindeutigem Modus: 8 verschiedene Zahlen, eine davon doppelt.
  // Bevorzugt werden Sätze, bei denen Modus, Median und Mittel sichtbar verschieden sind.
  function heroData(r) {
    r = rng(r);
    var st = LM.stats, pick = null;
    for (var t = 0; t < 80; t++) {
      var pool = [];
      for (var v = 1; v <= 20; v++) pool.push(v);
      pick = shuffle(pool, r).slice(0, 8);
      pick.push(pick[Math.floor(r() * 8)]);
      var md = st.median(pick), mo = st.mode(pick), me = st.mean(pick);
      if (mo !== md && Math.abs(me - md) >= 0.5) break;
    }
    return scramble(pick, r);
  }

  function heroSummary(values) {
    var st = LM.stats, md = st.medianInfo(values), mo = st.modeInfo(values), me = st.meanInfo(values);
    var row = null;
    if (mo.unique) mo.table.forEach(function (rw) { if (rw.value === mo.value) row = rw; });
    var meanTxt = fmt(me.value, 1), meanExact = LM.near(LM.parseNum(meanTxt), me.value, 1e-9);
    var modePart = mo.unique
      ? ", nur die " + num(mo.value) + " kommt " + (mo.maxCount === 2 ? "doppelt" : timesDe(mo.maxCount)) + " vor (Modus)"
      : ", einen eindeutigen Modus gibt es nicht";
    var caption = "Sortiert: In der Mitte (Platz " + md.positions.join(" und ") + ") steht der Median " + num(md.value) +
      modePart + ", und der Durchschnitt aller " + md.n + " Zahlen ist " + (meanExact ? "" : "rund ") + meanTxt + " (Mittel).";
    return {
      median: md.value, medianPos: md.positions,
      mode: mo.value, modeCount: mo.maxCount, modeFrom: row ? row.from : null, modeTo: row ? row.to : null,
      mean: me.value, meanText: approx(me.value, 1), caption: caption
    };
  }

  /* ---------- sorter ---------- */

  // Rückmeldung zu „Was ist x_k?“ (bracket = false) bzw. „Was ist x_(k)?“ (bracket = true).
  // opts.attempt: wievielter Versuch (ab dem 2. Fehlversuch steht die Lösung da),
  // opts.sortedShown: sind die Karten gerade sortiert zu sehen?
  function sorterCheck(values, k, bracket, text, opts) {
    opts = opts || {};
    var raw = values[k - 1], srt = LM.stats.sorted(values)[k - 1];
    var want = bracket ? srt : raw, other = bracket ? raw : srt;
    var symOther = LM.tex(bracket ? "x_{" + k + "}" : "x_{(" + k + ")}");
    var c = LM.check(text, want, { tol: 1e-6 });
    if (c.empty) return { state: "empty", want: want, html: "Tipp zuerst eine Zahl ein." };
    if (!isFinite(c.value)) return { state: "nan", want: want, html: "Das ist keine Zahl. Schreib nur die Zahl hin, ohne Buchstaben." };
    if (c.ok) {
      return {
        state: "ok", want: want,
        html: bracket
          ? "<strong>Richtig!</strong> Die Klammer heißt: erst sortieren. Auf Platz " + k + " der sortierten Liste steht die " + num(want) + "."
          : "<strong>Richtig!</strong> Ohne Klammer zählst du in der Urliste, so wie gemessen. Der " + k + ". Wert ist " + num(want) + "."
      };
    }
    if (LM.near(c.value, other, 1e-6)) {
      return {
        state: "swap", want: want,
        html: bracket
          ? "<strong>Fast!</strong> Die " + num(other) + " ist " + symOther + ", also der " + k + ". Wert der Urliste. Mit Klammer musst du erst sortieren. Dann steht auf Platz " + k + " die " + num(want) + "."
          : "<strong>Fast!</strong> Die " + num(other) + " ist " + symOther + ", also der " + k + ". Wert nach dem Sortieren. Ohne Klammer zählst du in der Urliste. Dort ist der " + k + ". Wert " + num(want) + "."
      };
    }
    if (LM.near(c.value, k, 1e-6)) {
      return { state: "place", want: want, html: "<strong>Noch nicht.</strong> " + k + " ist die Platznummer. Gesucht ist die Zahl, die auf diesem Platz steht." };
    }
    if ((opts.attempt || 1) >= 2) {
      return {
        state: "reveal", want: want,
        html: "<strong>Die Lösung ist " + num(want) + ".</strong> " + (bracket
          ? "Sortiert lauten die Werte " + LM.stats.sorted(values).map(num).join(", ") + ". Auf Platz " + k + " steht die " + num(want) + "."
          : "In der Urliste " + values.map(num).join(", ") + " ist der " + k + ". Wert die " + num(want) + ".")
      };
    }
    var hint;
    if (bracket) {
      hint = opts.sortedShown
        ? "Die Karten sind schon sortiert. Zähl von links bis Platz " + k + "."
        : "Die Klammer heißt: erst sortieren. Klick auf „Sortieren“ und zähl dann von links bis Platz " + k + ".";
    } else {
      hint = opts.sortedShown
        ? "Ohne Klammer zählst du in der Urliste. Klick auf „Zurück zur Urliste“ und zähl von links bis zum " + k + ". Wert."
        : "Zähl in der Urliste von links bis zum " + k + ". Wert.";
    }
    return { state: "miss", want: want, html: "<strong>Noch nicht.</strong> " + hint };
  }

  // Eigene Zahlen einlesen (LM.parseList). Höchstens maxN Werte, mindestens minN.
  function parseCustom(text, minN, maxN) {
    var p = LM.parseList(text), vals = p.values, cut = vals.length > maxN;
    if (cut) vals = vals.slice(0, maxN);
    var notes = [];
    if (p.bad.length) {
      notes.push("Ignoriert, weil keine Zahl: " + p.bad.slice(0, 5).map(function (b) { return "„" + b + "“"; }).join(", ") +
        (p.bad.length > 5 ? " und " + (p.bad.length - 5) + " weitere" : "") + ".");
      if (p.bad.some(function (b) { return /,.*,/.test(b) || /^,|,$/.test(b); })) {
        notes.push("Tipp: Trenn die Zahlen mit Leerzeichen oder Semikolon. Ein Komma zwischen Ziffern ist ein Dezimalkomma.");
      }
    }
    if (cut) notes.push("Du hattest mehr als " + maxN + " Zahlen, darum zählen nur die ersten " + maxN + ".");
    var ok = vals.length >= minN;
    var head = ok ? "Übernommen: " + vals.length + " Zahlen." : "Bitte gib mindestens " + minN + " Zahlen ein.";
    return { ok: ok, values: vals, bad: p.bad, cut: cut, message: [head].concat(notes).join(" ") };
  }

  /* ---------- mode-bars ---------- */

  var MODE_PRESETS = [
    {
      id: "noten", label: "Noten (Folie 46)", names: ["1", "2", "3", "4", "5", "6"], counts: [3, 5, 8, 6, 2, 1],
      noun: "Note", one: "Note", plural: "Noten", axis: "Note", nominal: false,
      cat: function (n) { return "Note " + n; }
    },
    {
      id: "tie", label: "Gleichstand", names: ["1", "2", "3", "4", "5"], counts: [2, 5, 3, 5, 1],
      noun: "Bewertung", one: "Bewertung", plural: "Bewertungen", axis: "Sterne für die Mensa", nominal: false,
      cat: function (n) { return n + (n === "1" ? " Stern" : " Sterne"); }
    },
    {
      id: "farben", label: "Lieblingsfarben", names: ["Blau", "Rot", "Grün", "Gelb"], counts: [9, 6, 4, 2],
      noun: "Farbe", one: "Antwort", plural: "Antworten", axis: "Lieblingsfarbe", nominal: true,
      cat: function (n) { return n; }
    }
  ];

  // Modus für Kategorien mit Anzahlen. Gerechnet wird mit LM.stats.modeInfo auf den Kategorie-Nummern 0 … k−1.
  function modeBarsInfo(preset, counts) {
    var st = LM.stats, idx = st.expand(counts.map(function (_, j) { return j; }), counts), n = idx.length;
    if (!n) {
      return { n: 0, state: "empty", top: [], maxCount: 0, value: null,
        text: "Noch keine Werte da.", hint: "Klick bei einem Balken auf +." };
    }
    var mi = st.modeInfo(idx), max = mi.maxCount;
    var names = mi.values.map(function (j) { return preset.names[j]; });
    var total = "Insgesamt " + n + " " + (n === 1 ? preset.one : preset.plural) + ".";
    if (mi.unique) {
      var subj = preset.nominal ? names[0] : "die " + names[0];
      var trap = names[0] === String(max)
        ? " Merk dir: Gefragt ist immer der Wert, nicht die Anzahl."
        : " Der Modus ist " + subj + ", nicht die Anzahl " + max + ".";
      return {
        n: n, state: "unique", top: mi.values, maxCount: max, value: mi.values[0],
        text: "Modus = " + names[0] + ", denn " + subj + " kommt " + timesDe(max) + " vor – öfter als jede andere " + preset.noun + ".",
        hint: total + trap
      };
    }
    return {
      n: n, state: "tie", top: mi.values, maxCount: max, value: null,
      text: "Kein eindeutiger Modus: " + joinDe(names) + " kommen " + (names.length === 2 ? "beide " : "alle ") + timesDe(max) + " vor.",
      hint: total + " Bei Gleichstand gibt es laut Folie 92 keinen Modus. Mach einen der Balken mit + höher."
    };
  }

  // Obergrenze und Schrittweite der Anzahl-Achse (ganze Zahlen, etwas Luft über dem höchsten Balken)
  function countAxis(maxCount) {
    var top = Math.max(8, Math.ceil(maxCount * 1.25));
    var step = top <= 10 ? 2 : top <= 25 ? 5 : 10;
    return { max: Math.ceil(top / step) * step, step: step };
  }

  /* ---------- median-stepper ---------- */

  function medianPlan(values) {
    var st = LM.stats, mi = st.medianInfo(values), n = mi.n, p = mi.positions, s = mi.sorted;
    if (!n) return null;
    var plan = { n: n, odd: mi.odd, sorted: s, positions: p, value: mi.value, alreadySorted: isAscending(values) };
    plan.countText = "n = " + n + ", also " + (mi.odd ? "ungerade" : "gerade") + ".";
    // resultParts: die Ergebnisformel in Stücken, damit sie auf schmalen Bildschirmen nur vor einem „=“ umbricht
    if (mi.odd) {
      plan.placeTex = ["\\dfrac{n+1}{2} = \\dfrac{" + n + "+1}{2} = " + p[0]];
      plan.placeText = "Der mittlere Platz ist " + p[0] + ".";
      plan.resultParts = ["\\tilde{x} = x_{(" + p[0] + ")}", "= " + texNum(mi.value)];
      plan.readText = "Auf Platz " + p[0] + " steht die " + num(mi.value) + ". Das ist der Median:";
      plan.resultText = "Der Median ist der Wert auf Platz " + p[0] + ": " + num(mi.value) + ".";
    } else {
      var a = s[p[0] - 1], b = s[p[1] - 1];
      plan.placeTex = ["\\dfrac{n}{2} = \\dfrac{" + n + "}{2} = " + p[0], "\\dfrac{n}{2} + 1 = " + p[1]];
      plan.placeText = "Die mittleren Plätze sind " + p[0] + " und " + p[1] + ".";
      plan.resultParts = [
        "\\tilde{x} = \\tfrac{1}{2}\\left[x_{(" + p[0] + ")} + x_{(" + p[1] + ")}\\right]",
        "= \\tfrac{1}{2}\\left(" + texNum(a) + " + " + (b < 0 ? "(" + texNum(b) + ")" : texNum(b)) + "\\right)",
        "= " + texNum(mi.value)
      ];
      plan.readText = "Auf den Plätzen " + p[0] + " und " + p[1] + " stehen " + num(a) + " und " + num(b) +
        ". Ihr Mittelwert ist der Median:";
      plan.resultText = "Der Median ist der Mittelwert von " + num(a) + " und " + num(b) + ": " + num(mi.value) + ".";
    }
    plan.resultTex = plan.resultParts.join(" ");
    plan.inData = s.some(function (v) { return LM.near(v, mi.value, 1e-9); });
    return plan;
  }

  // Zufallsdaten für den Median: 5 bis 9 ganze Zahlen von 1 bis 30, nicht schon sortiert
  function randomData(r) {
    var n = randInt(5, 9, r), out = [];
    for (var i = 0; i < n; i++) out.push(randInt(1, 30, r));
    return scramble(out, r);
  }

  // Der größte Wert wird zum Ausreißer: 10-mal so groß (bei Werten ≤ 0: plus 100).
  function withOutlier(values) {
    var st = LM.stats, s = st.sorted(values), n = s.length, from = s[n - 1];
    var to = from > 0 ? Math.round(from * 10 * 1e6) / 1e6 : from + 100;
    var out = s.slice();
    out[n - 1] = to;
    return {
      sorted: s, values: out, from: from, to: to,
      medBefore: st.median(s), medAfter: st.median(out),
      meanBefore: st.mean(s), meanAfter: st.mean(out)
    };
  }

  function outlierText(o, positions) {
    var where = positions.length === 1 ? "auf Platz " + positions[0] : "auf die Plätze " + positions[0] + " und " + positions[1];
    return "Aus " + num(o.from) + " wird " + num(o.to) + ". Der Median bleibt " + num(o.medAfter) + ", denn er schaut nur " + where +
      " in der Mitte. Das Mittel springt von " + fmt(o.meanBefore, 2) + " auf " + fmt(o.meanAfter, 2) +
      ", weil die " + num(o.to) + " voll in die Summe eingeht.";
  }

  var logic = {
    joinDe: joinDe, timesDe: timesDe, keepTimes: keepTimes, texNum: texNum, approx: approx, shuffle: shuffle, isAscending: isAscending,
    scramble: scramble, stableOrder: stableOrder, heroData: heroData, heroSummary: heroSummary,
    sorterCheck: sorterCheck, parseCustom: parseCustom, MODE_PRESETS: MODE_PRESETS, modeBarsInfo: modeBarsInfo,
    countAxis: countAxis, medianPlan: medianPlan, randomData: randomData, withOutlier: withOutlier, outlierText: outlierText
  };
  if (typeof module !== "undefined" && module.exports) module.exports = logic;
  if (typeof document === "undefined" || typeof LM.widget !== "function") return;

  /* =====================================================================
     Gemeinsame UI-Helfer
     ===================================================================== */

  var uidN = 0;
  function uid(p) { uidN += 1; return p + "-" + uidN; }

  function button(html, cls, onClick, attrs) {
    return LM.h("button", {
      class: "btn" + (cls ? " " + cls : ""), html: html,
      attrs: Object.assign({ type: "button" }, attrs || {}), on: { click: onClick }
    });
  }

  function head(title, badge, subHtml) {
    var kids = [LM.h("h3", {}, [title, badge ? LM.h("span", { class: "w-badge", text: badge }) : null])];
    if (subHtml) kids.push(LM.h("p", { class: "w-sub", html: subHtml }));
    return LM.h("div", { class: "w-head" }, kids);
  }

  // CSS-Animation (neu) abspielen, z. B. "pop" auf einer Karte. Respektiert „weniger Bewegung“.
  function replay(el, cls, delay) {
    if (!el || LM.reduceMotion) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.style.animationDelay = delay ? delay + "ms" : "";
    el.classList.add(cls);
  }

  // Nach einer Gleit-Animation die Inline-Übergänge entfernen, damit die normalen CSS-Übergänge wieder greifen
  function settle(cards, n) {
    for (var p = 1; p <= n; p++) {
      var e = cards.item(p);
      if (e) { e.style.transition = ""; e.style.transform = ""; }
    }
  }

  // Karten nach Index in der Urliste (egal ob gerade sortiert oder nicht)
  function elsByOrig(cards, order, n) {
    var out = new Array(n), sorted = cards.isSorted();
    for (var p = 0; p < n; p++) out[sorted ? order[p] : p] = cards.item(p + 1);
    return out;
  }

  // Karten zurück in die Urliste legen, mit derselben Gleit-Animation wie LM.cards.sort, nur rückwärts.
  // oldEls[i] ist die Karte, die in der Urliste auf Platz i + 1 stand. decorate() läuft direkt nach dem Neuaufbau.
  function unsortCards(cards, values, oldEls, decorate, done) {
    var first = oldEls.map(function (e) { return e ? e.getBoundingClientRect() : null; });
    cards.set(values, false);
    if (decorate) decorate();
    var els = values.map(function (_, i) { return cards.item(i + 1); });
    if (LM.reduceMotion) { if (done) done(); return; }
    els.forEach(function (e, i) {
      var a = first[i];
      if (!a || !e) return;
      var b = e.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      e.style.transition = "none";
      e.style.transform = "translate(" + dx + "px," + dy + "px)";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.forEach(function (e) {
          if (!e) return;
          e.style.transition = "transform 650ms cubic-bezier(.2,.8,.2,1)";
          e.style.transform = "";
        });
        setTimeout(function () {
          els.forEach(function (e) { if (e) e.style.transition = ""; });
          if (done) done();
        }, 680);
      });
    });
  }

  // Fokus merken (nur wenn er im Modul liegt) …
  function focusSnapshot(container) {
    var f = document.activeElement;
    return f && f !== document.body && container.contains(f) ? f : null;
  }
  // … und wenn der fokussierte Knopf danach deaktiviert, versteckt oder ersetzt ist: Fokus auf einen sinnvollen Ersatz.
  function restoreFocus(f, candidates) {
    if (!f) return;
    if (document.activeElement === f && f.isConnected && !f.disabled && !f.closest("[hidden]")) return;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c && c.isConnected && !c.disabled && !c.closest("[hidden]")) { c.focus({ preventScroll: true }); return; }
    }
  }

  // Kennzahl-Kachel (.stat) mit optionaler Unterzeile
  function tile(label, cls, withSub) {
    var val = LM.h("span", { class: "stat-value", text: "?" });
    var sub = withSub ? LM.h("span", { class: "bs-tile-sub" }) : null;
    var el = LM.h("div", { class: "stat bs-tile" }, [LM.h("span", { class: "stat-label", text: label }), val, sub]);
    return {
      el: el, val: val,
      show: function (txt, subTxt, animate) {
        val.textContent = txt;
        if (sub) sub.textContent = subTxt || "";
        if (!el.classList.contains("is-on")) {
          el.classList.add(cls, "is-on");
          if (animate !== false) replay(el, "bs-pop");
        }
      },
      reset: function () {
        val.textContent = "?";
        if (sub) sub.textContent = "";
        el.classList.remove(cls, "is-on", "bs-pop");
      }
    };
  }

  /* =====================================================================
     1. hero-demo
     ===================================================================== */

  LM.widget("hero-demo", function (el) {
    var gen = 0, timers = [], values = [];
    el.classList.add("widget", "bs-hero");
    el.innerHTML = "";

    var headEl = LM.h("div", { class: "w-head" }, [
      LM.h("p", { class: "bs-hero-eyebrow" }, [LM.h("span", { class: "bs-live", attrs: { "aria-hidden": "true" } }), "Live-Demo"]),
      LM.h("h3", { text: "Drei Wege zur Mitte" })
    ]);
    var above = LM.h("div", { class: "bs-hero-row bs-hero-above", attrs: { "aria-hidden": "true" } });
    var below = LM.h("div", { class: "bs-hero-row bs-hero-below", attrs: { "aria-hidden": "true" } });
    var stage = LM.h("div", { class: "bs-hero-stage" }, [above]);
    var cards = LM.cards(stage, { small: true });
    cards.el.setAttribute("aria-label", "9 Zufallszahlen");
    stage.appendChild(below);

    var tiles = { mod: tile("Modus", "s-mod"), med: tile("Median", "s-med"), mean: tile("Mittel", "s-mean") };
    var stats = LM.h("div", { class: "stats-row bs-hero-stats" }, [tiles.mod.el, tiles.med.el, tiles.mean.el]);
    var cap = LM.h("p", { class: "bs-hero-cap", attrs: { role: "status", "aria-live": "polite" } });
    var bSort = button("Sortieren", "btn-primary", function () { clearTimers(); sortNow(); });
    var bNew = button("<span aria-hidden=\"true\">↻</span> Neue Zahlen", "", function () { play(); });

    [headEl, stage, stats, cap, LM.h("div", { class: "w-controls bs-hero-btns" }, [bSort, bNew])].forEach(function (c) { el.appendChild(c); });

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function play() {
      gen += 1;
      clearTimers();
      // Der Live-Punkt pulsiert nur ein paar Mal pro Durchgang (keine Dauer-Animation)
      if (!LM.reduceMotion) { el.classList.remove("is-playing"); void el.offsetWidth; el.classList.add("is-playing"); }
      values = logic.heroData();
      cards.set(values, false);
      above.innerHTML = "";
      below.innerHTML = "";
      tiles.mod.reset(); tiles.med.reset(); tiles.mean.reset();
      bSort.hidden = false;
      cap.textContent = LM.reduceMotion
        ? "9 Zufallszahlen von 1 bis 20, bunt gemischt – klick auf „Sortieren“, dann zeigen dir Modus, Median und Mittel drei Arten von Mitte."
        : "9 Zufallszahlen von 1 bis 20, bunt gemischt – gleich wird sortiert, dann zeigen dir Modus, Median und Mittel drei Arten von Mitte.";
      if (!LM.reduceMotion) later(sortNow, 900);
    }

    function sortNow() {
      if (cards.isSorted()) return;
      var g = gen, f = focusSnapshot(el);
      bSort.hidden = true;
      restoreFocus(f, [bNew]);
      if (!LM.reduceMotion) cap.textContent = "Es wird sortiert, vom kleinsten zum größten Wert …";
      cards.sort(function () {
        if (g !== gen) return;
        settle(cards, values.length);
        reveal(g);
      });
    }

    function reveal(g) {
      var s = logic.heroSummary(values), gap = LM.reduceMotion ? 0 : 420;
      var steps = [
        function () {
          cards.mark(s.medianPos, "is-med");
          replay(cards.item(s.medianPos[0]), "pop");
          var p = s.medianPos[0];
          below.appendChild(LM.h("span", { class: "bs-pointer", style: { gridColumn: p + " / " + (p + 1) } },
            [LM.h("span", { class: "bs-pointer-in", text: "Median" })]));
          tiles.med.show(num(s.median));
        },
        function () {
          if (s.modeFrom === null) return;
          var pos = [];
          for (var p = s.modeFrom; p <= s.modeTo; p++) pos.push(p);
          cards.mark(pos, "is-mod");
          pos.forEach(function (q, i) { replay(cards.item(q), "pop", i * 60); });
          above.appendChild(LM.h("span", { class: "bs-brace", style: { gridColumn: s.modeFrom + " / " + (s.modeTo + 1) } },
            [LM.h("span", { class: "bs-brace-txt", text: "Modus" })]));
          tiles.mod.show(num(s.mode));
        },
        function () {
          tiles.mean.show(s.meanText);
          cap.textContent = s.caption;
        }
      ];
      steps.forEach(function (fn, i) {
        if (!gap) fn();
        else later(function () { if (g === gen) fn(); }, i * gap);
      });
    }

    play();
  });

  /* =====================================================================
     2. sorter
     ===================================================================== */

  LM.widget("sorter", function (el) {
    var DEFAULT = [9, 3, 15, 8, 11, 6], K = 3, MIN = 3, MAX = 20;
    var base = [], order = [], busy = false, gen = 0, hlOrig = -1, tries = [0, 0], solved = [false, false];
    el.classList.add("widget", "bs-sorter");
    el.innerHTML = "";

    el.appendChild(head("Urliste oder sortiert?", "Schreibweise",
      "Klick auf „Sortieren“ und achte auf die kleinen Platznummern unter den Zahlen."));

    var status = LM.h("p", { class: "bs-status", attrs: { role: "status", "aria-live": "polite" } });
    var stage = LM.h("div", { class: "bs-sorter-stage" });
    var cards = LM.cards(stage, {});
    var bToggle = button("Sortieren", "btn-primary", toggle);
    var ownId = uid("bs-own");
    var bOwn = button("Eigene Zahlen", "btn-ghost", toggleOwn, { "aria-expanded": "false", "aria-controls": ownId + "-panel" });

    var ta = LM.h("textarea", { class: "data-input", attrs: { id: ownId, rows: "2", spellcheck: "false", placeholder: "z. B. 12 4 9 4 7 oder 2,5; 8; 1" } });
    var ownMsg = LM.h("p", { class: "bs-msg", attrs: { role: "status", "aria-live": "polite" } });
    var panel = LM.h("div", { class: "bs-own", attrs: { id: ownId + "-panel", hidden: "" } }, [
      LM.h("label", { class: "bs-own-label", attrs: { for: ownId }, text: "Deine Zahlen, 3 bis 20 Stück. Trenn sie mit Leerzeichen oder Semikolon:" }),
      ta,
      LM.h("div", { class: "bs-own-row" }, [
        button("Übernehmen", "btn-primary btn-sm", applyOwn),
        button("Zurück zum Beispiel", "btn-ghost btn-sm", function () {
          load(DEFAULT);
          ownMsg.className = "bs-msg";
          ownMsg.textContent = "Wieder das Beispiel 9, 3, 15, 8, 11, 6.";
        })
      ]),
      ownMsg
    ]);
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyOwn(); } });

    var checks = [makeCheck(0, false), makeCheck(1, true)];
    var checkWrap = LM.h("div", { class: "bs-checks" }, [checks[0].box, checks[1].box]);

    [stage, LM.h("div", { class: "w-controls" }, [bToggle, bOwn]), status, panel,
      LM.h("p", { class: "bs-checks-title", text: "Kurzer Check:" }), checkWrap].forEach(function (c) { el.appendChild(c); });

    function renderStatus(sorted) {
      var n = base.length, s = LM.stats.sorted(base);
      status.innerHTML = sorted
        ? "<strong>Sortiert:</strong> von klein nach groß. " + LM.tex("x_{(1)} = " + texNum(s[0])) + " ist der kleinste Wert, " +
          LM.tex("x_{(" + n + ")} = " + texNum(s[n - 1])) + " der größte. Unter jeder Karte steht, wie sie vorher hieß."
        : "<strong>Urliste:</strong> So wurden die Werte gemessen. " + LM.tex("x_1") + " ist der erste Wert, " +
          LM.tex("x_2") + " der zweite und so weiter.";
    }

    function addWas() {
      for (var i = 0; i < base.length; i++) {
        var e = cards.item(i + 1);
        if (e) e.appendChild(LM.h("span", { class: "bs-was", html: "war x<sub>" + (i + 1) + "</sub>", attrs: { "aria-hidden": "true" } }));
      }
    }

    function ariaSorted() {
      for (var p = 0; p < base.length; p++) {
        var e = cards.item(p + 1);
        if (e) e.setAttribute("aria-label", "Platz " + (p + 1) + ": " + num(base[order[p]]) + ", vorher Wert Nummer " + (order[p] + 1));
      }
    }

    function applyHighlight(popIt) {
      var els = elsByOrig(cards, order, base.length);
      els.forEach(function (e) { if (e) e.classList.remove("is-hl"); });
      if (hlOrig >= 0 && els[hlOrig]) {
        els[hlOrig].classList.add("is-hl");
        if (popIt) replay(els[hlOrig], "pop");
      }
    }

    function load(values) {
      gen += 1;
      busy = false;
      base = values.slice();
      order = logic.stableOrder(base);
      hlOrig = -1;
      var longest = 0;
      base.forEach(function (v) { longest = Math.max(longest, num(v).length); });
      stage.classList.toggle("bs-fit", base.length <= 8 && longest <= 3);
      // Viele Karten: gleich breite Spalten statt ausgefranster Reihen
      stage.classList.toggle("bs-many", base.length > 8);
      stage.style.setProperty("--bs-cw", Math.max(3.4, 1.3 + 0.62 * longest).toFixed(2) + "rem");
      cards.set(base, false);
      addWas();
      el.classList.remove("is-sorted");
      bToggle.textContent = "Sortieren";
      renderStatus(false);
      tries = [0, 0];
      solved = [false, false];
      checks.forEach(function (c) { c.reset(); });
    }

    function toggle() {
      if (busy) return;
      busy = true;
      var g = gen;
      if (!cards.isSorted()) {
        bToggle.textContent = "Zurück zur Urliste";
        renderStatus(true);
        cards.sort(function () {
          if (g !== gen) return;
          settle(cards, base.length);
          busy = false;
          el.classList.add("is-sorted");
          ariaSorted();
        });
      } else {
        var oldEls = elsByOrig(cards, order, base.length);
        el.classList.remove("is-sorted");
        bToggle.textContent = "Sortieren";
        renderStatus(false);
        unsortCards(cards, base, oldEls, function () { addWas(); applyHighlight(false); }, function () {
          if (g === gen) busy = false;
        });
      }
    }

    function toggleOwn() {
      var open = panel.hidden;
      panel.hidden = !open;
      bOwn.setAttribute("aria-expanded", String(open));
      if (open) {
        if (!ta.value.trim()) ta.value = base.map(num).join(" ");
        ta.focus();
      }
    }

    function applyOwn() {
      var r = logic.parseCustom(ta.value, MIN, MAX);
      ownMsg.className = "bs-msg " + (r.ok ? "is-ok" : "is-miss");
      ownMsg.textContent = r.message;
      if (r.ok) load(r.values);
    }

    function makeCheck(i, bracket) {
      var id = uid("bs-q");
      var input = LM.h("input", { class: "num-input", attrs: { id: id, type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false" } });
      var fb = LM.h("p", { class: "feedback", attrs: { role: "status", "aria-live": "polite" } });
      var go = function () {
        var r = logic.sorterCheck(base, K, bracket, input.value, { attempt: tries[i] + 1, sortedShown: cards.isSorted() });
        input.classList.remove("is-ok", "is-miss");
        if (r.state === "empty" || r.state === "nan") {
          fb.className = "feedback";
          fb.innerHTML = r.html;
          input.focus();
          return;
        }
        tries[i] += 1;
        var ok = r.state === "ok";
        fb.className = "feedback " + (ok ? "ok" : "miss");
        fb.innerHTML = r.html;
        input.classList.add(ok ? "is-ok" : "is-miss");
        if (ok || r.state === "reveal") {
          hlOrig = bracket ? order[K - 1] : K - 1;
          applyHighlight(true);
        }
        if (ok) {
          tries[i] = 0;
          if (!solved[i]) {
            solved[i] = true;
            if (solved[0] && solved[1]) { LM.celebrate(box); LM.toast("Beide richtig! Du kannst die Schreibweise."); }
          }
        }
      };
      var box = LM.h("div", { class: "bs-check" }, [
        LM.h("label", { class: "bs-check-q", attrs: { for: id }, html: "Was ist " + LM.tex(bracket ? "x_{(" + K + ")}" : "x_{" + K + "}") + "?" }),
        LM.h("div", { class: "bs-check-row" }, [input, button("Prüfen", "btn-sm", go)]),
        fb
      ]);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
      input.addEventListener("input", function () { input.classList.remove("is-ok", "is-miss"); });
      return {
        box: box,
        reset: function () {
          input.value = "";
          input.classList.remove("is-ok", "is-miss");
          fb.className = "feedback";
          fb.textContent = "";
        }
      };
    }

    load(DEFAULT);
  });

  /* =====================================================================
     3. mode-bars
     ===================================================================== */

  LM.widget("mode-bars", function (el) {
    var MAXC = 20, preset = MODE_PRESETS[0], counts = preset.counts.slice(), info = null, parts = null, cells = [], lastState = "";
    el.classList.add("widget", "bs-mb");
    el.innerHTML = "";

    el.appendChild(head("Welcher Wert kommt am häufigsten vor?", "Ausprobieren",
      "Mach die Balken mit + und − höher oder niedriger. Der Modus ist der Wert mit dem höchsten Balken, aber nur, wenn dieser Balken allein ganz oben steht."));

    var seg = LM.h("div", { class: "seg", attrs: { role: "group", "aria-label": "Beispiel wählen" } });
    var segBtns = MODE_PRESETS.map(function (p) {
      var b = LM.h("button", { text: p.label, attrs: { type: "button", "aria-pressed": String(p === preset) }, on: { click: function () { choose(p); } } });
      seg.appendChild(b);
      return b;
    });
    var bReset = button("Zurücksetzen", "btn-ghost btn-sm", function () { choose(preset); });
    el.appendChild(LM.h("div", { class: "w-controls" }, [seg, bReset]));

    var stMain = LM.h("p", { class: "bs-mb-main" });
    var stHint = LM.h("p", { class: "bs-mb-hint" });
    var status = LM.h("div", { class: "bs-mb-status", attrs: { role: "status", "aria-live": "polite" } }, [stMain, stHint]);
    var chart = LM.h("div", { class: "chart bs-mb-chart" });
    var ctrl = LM.h("div", { class: "bs-mb-ctrl" });
    var note = LM.h("div", { class: "callout callout-tip bs-mb-note", attrs: { hidden: "" } }, [
      LM.h("p", { class: "callout-title", text: "Hier geht nur der Modus" }),
      LM.h("p", { text: "Farben kann man nicht der Größe nach ordnen, also gibt es keinen Median. Man kann sie auch nicht zusammenzählen, also gibt es kein Mittel. Bei nominalen Daten bleibt nur der Modus." })
    ]);
    el.appendChild(LM.h("div", { class: "w-out" }, [status, LM.h("div", { class: "bs-mb-plot" }, [chart, ctrl]), note]));

    function buildCtrl() {
      ctrl.innerHTML = "";
      ctrl.style.gridTemplateColumns = "repeat(" + preset.names.length + ", minmax(0, 1fr))";
      cells = preset.names.map(function (nm, j) {
        var label = preset.cat(nm);
        var minus = LM.h("button", { class: "btn btn-sm bs-mb-pm", html: "<span aria-hidden=\"true\">−</span>",
          attrs: { type: "button", "aria-label": label + ": einmal weniger" }, on: { click: function () { change(j, -1); } } });
        var plus = LM.h("button", { class: "btn btn-sm bs-mb-pm", html: "<span aria-hidden=\"true\">+</span>",
          attrs: { type: "button", "aria-label": label + ": einmal mehr" }, on: { click: function () { change(j, 1); } } });
        ctrl.appendChild(LM.h("div", { class: "bs-mb-cell", attrs: { role: "group", "aria-label": label } }, [minus, plus]));
        return { minus: minus, plus: plus };
      });
    }

    function draw(w) {
      chart.innerHTML = "";
      var k = preset.names.length, H = w < 520 ? 236 : 262;
      var m = { l: 34, r: 8, t: 40, b: 48 };
      var pw = w - m.l - m.r, ph = H - m.t - m.b, band = pw / k, bw = Math.min(band * 0.62, 68);
      var svg = LM.svg.el("svg", { width: w, height: H, viewBox: "0 0 " + w + " " + H, role: "img", class: "bs-mb-svg" }, chart);
      var gGrid = LM.svg.el("g", {}, svg);
      LM.svg.text(svg, 0, 12, "Anzahl", { class: "axis-label" });
      var bars = [], cnts = [];
      for (var j = 0; j < k; j++) {
        var cx = m.l + band * (j + 0.5);
        bars.push(LM.svg.el("rect", { class: "bar bs-mb-bar", x: cx - bw / 2, y: m.t + ph, width: bw, height: 0, rx: 3 }, svg));
        cnts.push(LM.svg.text(svg, 0, 0, "", { class: "bs-mb-count bs-mb-move", "text-anchor": "middle" }));
        LM.svg.text(svg, cx, m.t + ph + 19, preset.names[j], { class: "bs-mb-name", "text-anchor": "middle" });
      }
      LM.svg.el("line", { class: "ax", x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph }, svg);
      LM.svg.text(svg, m.l + pw / 2, H - 6, preset.axis, { class: "axis-label", "text-anchor": "middle" });
      var modLbl = LM.svg.text(svg, 0, 0, "Modus", { class: "lbl lbl-mod bs-mb-modlbl bs-mb-move", "text-anchor": "middle" });
      parts = { svg: svg, gGrid: gGrid, bars: bars, cnts: cnts, modLbl: modLbl, m: m, pw: pw, ph: ph, band: band };
      ctrl.style.paddingLeft = m.l + "px";
      ctrl.style.paddingRight = m.r + "px";
      ctrl.classList.toggle("is-stacked", band < 86);
      chart.classList.remove("bs-anim");
      update(false);
    }

    function update(anim) {
      info = logic.modeBarsInfo(preset, counts);
      var P = parts;
      if (P) {
        var ax = logic.countAxis(info.maxCount), base = P.m.t + P.ph;
        var y = LM.svg.scale(0, ax.max, base, P.m.t);
        while (P.gGrid.firstChild) P.gGrid.removeChild(P.gGrid.firstChild);
        for (var t = 0; t <= ax.max; t += ax.step) {
          if (t > 0) LM.svg.el("line", { class: "gridline", x1: P.m.l, x2: P.m.l + P.pw, y1: y(t), y2: y(t) }, P.gGrid);
          LM.svg.text(P.gGrid, P.m.l - 8, y(t) + 4, LM.fmt(t, 0), { class: "tick", "text-anchor": "end" });
        }
        chart.classList.toggle("bs-anim", !!anim && !LM.reduceMotion);
        counts.forEach(function (c, j) {
          var top = y(c), cx = P.m.l + P.band * (j + 0.5), isTop = c > 0 && info.top.indexOf(j) >= 0;
          var r = P.bars[j];
          r.setAttribute("y", top);
          r.setAttribute("height", Math.max(0, base - top));
          r.setAttribute("class", "bar bs-mb-bar" + (isTop ? " is-mod" : "") + (isTop && info.state === "tie" ? " bs-tie" : ""));
          P.cnts[j].textContent = LM.fmt(c, 0);
          P.cnts[j].style.transform = "translate(" + cx + "px," + (top - 7) + "px)";
        });
        if (info.state === "unique") {
          var jm = info.value, cxm = P.m.l + P.band * (jm + 0.5);
          P.modLbl.style.transform = "translate(" + cxm + "px," + (y(counts[jm]) - 25) + "px)";
          P.modLbl.style.opacity = "1";
        } else {
          P.modLbl.style.opacity = "0";
        }
        P.svg.setAttribute("aria-label", "Balkendiagramm. " + preset.names.map(function (nm, j) {
          return preset.cat(nm) + ": " + timesDe(counts[j]);
        }).join(", ") + ".");
      }
      stMain.innerHTML = logic.keepTimes(info.text);
      stHint.innerHTML = logic.keepTimes(info.hint);
      status.className = "bs-mb-status is-" + info.state;
      var key = info.state + ":" + info.top.join(",");
      if (anim && key !== lastState) replay(status, "bs-flash");
      lastState = key;
      cells.forEach(function (c, j) {
        c.minus.disabled = counts[j] <= 0;
        c.plus.disabled = counts[j] >= MAXC;
      });
    }

    function change(j, d) {
      var c = counts[j] + d;
      if (c < 0 || c > MAXC) return;
      counts[j] = c;
      var f = focusSnapshot(el);
      update(true);
      restoreFocus(f, [d > 0 ? cells[j].minus : cells[j].plus]);
    }

    var resp = null;
    function choose(p) {
      preset = p;
      counts = p.counts.slice();
      lastState = "";
      parts = null;
      segBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", String(MODE_PRESETS[i] === p)); });
      note.hidden = !p.nominal;
      buildCtrl();
      if (resp) resp.redraw(); else update(false);
    }

    buildCtrl();
    resp = LM.svg.responsive(chart, draw);
    if (!parts) update(false);
  });

  /* =====================================================================
     4. median-stepper
     ===================================================================== */

  LM.widget("median-stepper", function (el) {
    var PRE = { odd: [3, 6, 8, 9, 11], even: [3, 6, 8, 9, 11, 15] };
    var MIN = 3, MAX = 20;
    var src = "odd", base = [], order = [], plan = null, k = 0, busy = false, busyMsg = "", outlier = false, gen = 0, countT = 0;
    var fitWanted = false;
    el.classList.add("widget", "bs-ms");
    el.innerHTML = "";

    el.appendChild(head("Median in 4 Schritten", "Schritt für Schritt",
      "Wähl eine Zahlenreihe und klick dich mit „Weiter“ durch. Die Karten zeigen dir bei jedem Schritt, was passiert."));

    var seg = LM.h("div", { class: "seg", attrs: { role: "group", "aria-label": "Zahlen wählen" } });
    var segBtns = {};
    [["odd", "Ungerade (Folie 95)"], ["even", "Gerade (Folie 95)"], ["rand", "Zufällig"], ["own", "Eigene Zahlen"]].forEach(function (d) {
      segBtns[d[0]] = LM.h("button", { text: d[1], attrs: { type: "button", "aria-pressed": String(d[0] === src) }, on: { click: function () { pick(d[0]); } } });
      seg.appendChild(segBtns[d[0]]);
    });
    el.appendChild(LM.h("div", { class: "w-controls" }, [seg]));

    var ownId = uid("bs-ms-own");
    var ta = LM.h("textarea", { class: "data-input", attrs: { id: ownId, rows: "2", spellcheck: "false", placeholder: "z. B. 12 4 9 4 7 oder 2,5; 8; 1" } });
    var ownMsg = LM.h("p", { class: "bs-msg", attrs: { role: "status", "aria-live": "polite" } });
    var ownPanel = LM.h("div", { class: "bs-own", attrs: { hidden: "" } }, [
      LM.h("label", { class: "bs-own-label", attrs: { for: ownId }, text: "Deine Zahlen, 3 bis 20 Stück. Trenn sie mit Leerzeichen oder Semikolon:" }),
      ta,
      LM.h("div", { class: "bs-own-row" }, [button("Übernehmen", "btn-primary btn-sm", applyOwn)]),
      ownMsg
    ]);
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); applyOwn(); } });
    el.appendChild(ownPanel);

    var stage = LM.h("div", { class: "bs-ms-stage" });
    var stateChip = LM.h("span", { class: "bs-ms-state", attrs: { "aria-hidden": "true" } });
    stage.appendChild(stateChip);
    var cards = LM.cards(stage, { small: true });
    // axis hält unter der letzten Reihe Platz frei, mk ist die Ebene für Dreieck und Beschriftung
    var axis = LM.h("div", { class: "bs-ms-axis", attrs: { "aria-hidden": "true" } });
    var mk = LM.h("div", { class: "bs-ms-mk", attrs: { "aria-hidden": "true" } });
    stage.appendChild(axis);
    stage.appendChild(mk);

    var TITLES = ["Sortieren.", "Zählen.", "Plätze finden.", "Ablesen."];
    var TODO = [
      "Bring die Werte in eine Reihe, vom kleinsten zum größten.",
      "Wie viele Werte sind es? Ist die Anzahl gerade oder ungerade?",
      "Welche Plätze liegen genau in der Mitte?",
      "Welcher Wert steht dort? Das ist der Median."
    ];
    var ol = LM.h("ol", { class: "steps bs-ms-steps" }), lis = [], details = [];
    TITLES.forEach(function (t) {
      var d = LM.h("span", { class: "bs-ms-detail" });
      var li = LM.h("li", {}, [LM.h("div", { class: "bs-ms-step" }, [LM.h("strong", { text: t }), " ", d])]);
      ol.appendChild(li);
      lis.push(li);
      details.push(d);
    });

    var bBack = button("<span aria-hidden=\"true\">←</span> Zurück", "", back);
    var bNext = button("Weiter <span class=\"arrow\" aria-hidden=\"true\">→</span>", "btn-primary bs-ms-next", next);
    var bReset = button("Neu starten", "btn-ghost", restart);
    var status = LM.h("p", { class: "bs-sr", attrs: { role: "status", "aria-live": "polite" } });

    var tMed = tile("Median", "s-med", true), tMean = tile("Mittel", "s-mean", true);
    var bOut = button("Ausreißer einbauen", "btn-primary", function () { setOutlier(!outlier); });
    var outText = LM.h("p", { class: "bs-ms-outtext", attrs: { role: "status", "aria-live": "polite" } });
    var result = LM.h("div", { class: "bs-ms-result", attrs: { hidden: "" } }, [
      LM.h("div", { class: "stats-row bs-ms-tiles" }, [tMed.el, tMean.el]),
      outText,
      LM.h("div", { class: "w-controls" }, [bOut])
    ]);

    el.appendChild(LM.h("div", { class: "bs-ms-main" }, [
      LM.h("div", { class: "bs-ms-left" }, [stage]),
      LM.h("div", { class: "bs-ms-right" }, [ol, LM.h("div", { class: "w-controls bs-ms-nav" }, [bBack, bNext, bReset]), status])
    ]));
    el.appendChild(result);

    function relayout() {
      if (busy) return;
      layoutRows();
      if (k >= 4) placeMarker(false);
    }
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);
    // Webschriften ändern die Kartenbreiten, ohne dass sich die Bühne in der Größe ändern muss
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    function curValues() { return outlier ? logic.withOutlier(base).values : LM.stats.sorted(base); }

    // Formel als Zeile aus Stücken: Umbruch nur zwischen den Stücken, nie mitten in einem Bruch
    function fline(parts) {
      return '<span class="bs-ms-f">' + parts.map(function (p) {
        return p === "und" ? '<span class="bs-ms-und">und</span>' : '<span class="bs-ms-fp">' + LM.tex(p) + "</span>";
      }).join("") + "</span>";
    }

    function doneHtml(i) {
      var n = plan.n;
      if (i === 0) {
        return (plan.alreadySorted ? "Die Werte waren schon sortiert. " : "Erledigt: von klein nach groß. ") +
          "Jetzt heißen die Plätze " + LM.tex("x_{(1)}") + " bis " + LM.tex("x_{(" + n + ")}") + ".";
      }
      if (i === 1) {
        return LM.tex("n = " + n) + ", also <strong>" + (plan.odd ? "ungerade" : "gerade") + "</strong>. " +
          (plan.odd ? "Dann gibt es genau einen mittleren Platz." : "Dann gibt es zwei mittlere Plätze.");
      }
      if (i === 2) {
        return plan.odd
          ? "So findest du den mittleren Platz:" + fline([plan.placeTex[0]])
          : "So findest du die beiden mittleren Plätze:" + fline([plan.placeTex[0], "und", plan.placeTex[1]]);
      }
      return plan.readText + fline(plan.resultParts) +
        (plan.inData ? "" : "<span class=\"bs-ms-aside\">Kein Messwert? Ist okay, der Median muss keiner sein.</span>");
    }

    function statusText() {
      if (busy) return busyMsg;
      if (k === 0) return "Klick auf „Weiter“, dann werden die Karten sortiert.";
      if (k === 1) return "Schritt 1 erledigt: Die Werte sind sortiert.";
      if (k === 2) return "Schritt 2 erledigt: " + plan.countText;
      if (k === 3) return "Schritt 3 erledigt: " + plan.placeText;
      return "Fertig! " + plan.resultText;
    }

    // Liegen die Karten in mehreren Reihen? Dann bekommt jede Reihe darunter Platz für die Median-Markierung.
    // offsetTop statt getBoundingClientRect, damit laufende Animationen (scale, translate) nicht stören.
    function layoutRows() {
      // Eine Reihe nur, wenn jede Zahl wirklich in ihre Karte passt (sehr schmale Bildschirme), sonst umbrechen
      stage.classList.toggle("bs-fit", fitWanted);
      if (fitWanted && !cardsFit()) stage.classList.remove("bs-fit");
      var first = cards.item(1), last = cards.item(base.length);
      stage.classList.toggle("bs-rows", !!(first && last && Math.abs(first.offsetTop - last.offsetTop) > 4));
    }
    function cardsFit() {
      for (var p = 1; p <= base.length; p++) {
        var c = cards.item(p);
        if (!c) continue;
        for (var i = 0; i < 2 && i < c.children.length; i++) if (c.children[i].offsetWidth > c.clientWidth) return false;
      }
      return true;
    }

    // Dreieck und „Median …“ direkt unter die Median-Karte(n), in Koordinaten der Bühne
    function placeMarker(animate) {
      mk.innerHTML = "";
      if (k < 4) return;
      var p = plan.positions, a = cards.item(p[0]), b = cards.item(p[p.length - 1]);
      if (!a || !b) return;
      var split = Math.abs(a.offsetTop - b.offsetTop) > 4;
      var x = split ? a.offsetLeft + a.offsetWidth / 2 : (a.offsetLeft + b.offsetLeft + b.offsetWidth) / 2;
      var y = a.offsetTop + a.offsetHeight;
      var med = LM.stats.median(curValues());
      var tri = LM.h("span", { class: "bs-ms-tri", style: { left: x + "px", top: (y + 5) + "px" } });
      var lab = LM.h("span", { class: "bs-ms-lab", text: "Median " + num(med), style: { top: (y + 14) + "px" } });
      mk.appendChild(tri);
      mk.appendChild(lab);
      var lw = lab.offsetWidth, W = mk.clientWidth;
      lab.style.left = Math.max(4, Math.min(W - lw - 4, x - lw / 2)) + "px";
      if (animate) { replay(tri, "bs-drop"); replay(lab, "bs-drop"); }
    }

    function render(anim) {
      var n = base.length, f = focusSnapshot(el);
      lis.forEach(function (li, i) {
        li.classList.toggle("is-done", i < k);
        li.classList.toggle("is-active", i === k);
        li.classList.toggle("is-todo", i > k);
        details[i].innerHTML = i < k ? doneHtml(i) : TODO[i];
      });
      cards.clear();
      for (var p = 1; p <= n; p++) {
        var c = cards.item(p);
        if (c) {
          c.style.animationDelay = "";
          var flag = c.querySelector(".bs-outflag");
          if (flag) flag.remove();
        }
      }
      if (k === 3) cards.mark(plan.positions, "is-hl");
      if (k >= 4) cards.mark(plan.positions, "is-med");
      if (outlier && k >= 4) {
        var oc = cards.item(n);
        if (oc) {
          oc.classList.add("bs-outcard");
          oc.appendChild(LM.h("span", { class: "bs-outflag", text: "Ausreißer", attrs: { "aria-hidden": "true" } }));
        }
      }
      stateChip.textContent = k >= 1 ? "Sortiert" : "Urliste";
      stateChip.classList.toggle("is-sorted", k >= 1);
      if (!busy) layoutRows();
      placeMarker(anim);
      bBack.disabled = k === 0;
      bNext.disabled = k >= 4;
      bNext.classList.toggle("is-fin", k >= 4);
      bNext.innerHTML = k >= 4 ? "Fertig <span aria-hidden=\"true\">✓</span>" : "Weiter <span class=\"arrow\" aria-hidden=\"true\">→</span>";
      bReset.disabled = k === 0 && !cards.isSorted() && !busy;
      el.classList.toggle("is-busy", busy);
      result.hidden = k < 4;
      if (k >= 4) renderResult();
      status.textContent = statusText();
      restoreFocus(f, k >= 4 ? [bOut, bBack] : [bNext, bBack]);
      if (anim) animateStep();
    }

    function animateStep() {
      if (LM.reduceMotion) return;
      var p;
      if (k === 2) {
        for (p = 1; p <= base.length; p++) replay(cards.item(p), "pop", (p - 1) * 70);
      } else if (k === 3 || k === 4) {
        plan.positions.forEach(function (q) { replay(cards.item(q), "pop"); });
      }
      if (k === 4) replay(result, "bs-rise");
    }

    function renderResult() {
      var o = logic.withOutlier(base);
      var med = outlier ? o.medAfter : o.medBefore, mean = outlier ? o.meanAfter : o.meanBefore;
      tMed.show(num(med), outlier ? "vorher " + num(o.medBefore) + " · bleibt gleich" : "der Wert in der Mitte", false);
      tMean.show(approx(mean, 2), outlier ? "vorher " + approx(o.meanBefore, 2) + " · springt hoch" : "zum Vergleich", false);
      outText.textContent = outlier
        ? logic.outlierText(o, plan.positions)
        : "Was passiert, wenn der größte Wert plötzlich riesig wird? Probier es aus: Aus " + num(o.from) + " wird " + num(o.to) + ".";
      bOut.textContent = outlier ? "Ausreißer wieder raus" : "Ausreißer einbauen";
      result.classList.toggle("is-out", outlier);
    }

    // Mittel-Kachel von alt nach neu hochzählen lassen
    function countUp(from, to) {
      cancelAnimationFrame(countT);
      if (LM.reduceMotion) return;
      var t0 = performance.now(), dur = 700, finalTxt = tMean.val.textContent;
      (function frame(t) {
        var q = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - q, 3);
        tMean.val.textContent = q < 1 ? fmt(from + (to - from) * e, 2) : finalTxt;
        if (q < 1) countT = requestAnimationFrame(frame);
      })(t0);
    }

    function setOutlier(on) {
      if (k < 4 || busy) return;
      var o = logic.withOutlier(base), from = outlier ? o.meanAfter : o.meanBefore;
      outlier = on;
      cards.set(on ? o.values : o.sorted, true);
      render(false);
      replay(cards.item(base.length), "pop");
      replay(tMean.el, "bs-bump");
      countUp(from, on ? o.meanAfter : o.meanBefore);
    }

    // Bis 9 kurze Werte (auch mit Ausreißer) sollen in eine Reihe passen; ab 8 Karten etwas enger
    function fit() {
      var longest = 0;
      logic.withOutlier(base).values.concat(base).forEach(function (v) { longest = Math.max(longest, num(v).length); });
      fitWanted = base.length <= 9 && longest <= 3;
      stage.classList.toggle("bs-dense", fitWanted && base.length >= 8);
    }

    function load(values) {
      gen += 1;
      busy = false;
      outlier = false;
      k = 0;
      cancelAnimationFrame(countT);
      base = values.slice();
      order = logic.stableOrder(base);
      plan = logic.medianPlan(base);
      cards.set(base, false);
      fit();
      render(false);
    }

    function unsort(g) {
      busy = true;
      busyMsg = "Die Karten gehen zurück in die Urliste.";
      var oldEls = elsByOrig(cards, order, base.length);
      unsortCards(cards, base, oldEls, null, function () {
        if (g !== gen) return;
        busy = false;
        render(false);
      });
      render(false);
    }

    function next() {
      if (busy || k >= 4) return;
      if (k === 0) {
        busy = true;
        busyMsg = "Die Karten werden sortiert.";
        var g = gen;
        render(false);
        cards.sort(function () {
          if (g !== gen) return;
          settle(cards, base.length);
          busy = false;
          k = 1;
          render(true);
        });
        return;
      }
      k += 1;
      render(true);
    }

    function back() {
      if (busy || k === 0) return;
      if (outlier) {
        outlier = false;
        cancelAnimationFrame(countT);
        cards.set(LM.stats.sorted(base), true);
      }
      if (k === 1) {
        k = 0;
        gen += 1;
        unsort(gen);
        return;
      }
      k -= 1;
      render(false);
    }

    function restart() {
      if (busy) return;
      gen += 1;
      cancelAnimationFrame(countT);
      if (outlier) { outlier = false; cards.set(LM.stats.sorted(base), true); }
      k = 0;
      if (cards.isSorted()) unsort(gen);
      else render(false);
    }

    function pick(id) {
      src = id;
      Object.keys(segBtns).forEach(function (key) { segBtns[key].setAttribute("aria-pressed", String(key === id)); });
      ownPanel.hidden = id !== "own";
      if (id === "odd") load(logic.scramble(PRE.odd));
      else if (id === "even") load(logic.scramble(PRE.even));
      else if (id === "rand") load(logic.randomData());
      else {
        if (!ta.value.trim()) ta.value = base.map(num).join(" ");
        ownMsg.className = "bs-msg";
        ownMsg.textContent = "";
        ta.focus();
      }
    }

    function applyOwn() {
      var r = logic.parseCustom(ta.value, MIN, MAX);
      ownMsg.className = "bs-msg " + (r.ok ? "is-ok" : "is-miss");
      ownMsg.textContent = r.message;
      if (r.ok) load(r.values);
    }

    load(logic.scramble(PRE.odd));
  });
})(typeof window !== "undefined" ? window : globalThis);
