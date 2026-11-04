/*
 * UI-Kern der Lagemaße-Seite: Zahlformat, Eingaben, DOM- und SVG-Helfer, Zahlenkarten,
 * Speicher, Fortschritt, Theme, Navigation und das Laden der Module (data-widget).
 * Module melden sich mit LM.widget("name", function (el, LM) { … }) an.
 */
(function () {
  "use strict";
  var LM = (window.LM = window.LM || {});
  var registry = {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  LM.reduceMotion = reduceMotion;

  /* ---------- Zahlen ---------- */

  // Deutsche Schreibweise mit Komma, höchstens `digits` Nachkommastellen, ohne Tausenderpunkte.
  LM.fmt = function (v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return "–";
    digits = digits === undefined ? 2 : digits;
    var f = Math.pow(10, digits), r = Math.round(v * f) / f;
    if (Object.is(r, -0)) r = 0;
    return r.toLocaleString("de-DE", { maximumFractionDigits: digits, useGrouping: false }).replace("-", "−");
  };

  // "1,5", "1.5", "−2", " 3 " → Zahl. Ungültig → NaN.
  LM.parseNum = function (s) {
    s = String(s === null || s === undefined ? "" : s).trim().replace(/[−–]/g, "-").replace(/\s+/g, "");
    if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  };

  // Liste von Zahlen. Trennzeichen: Semikolon, Zeilenumbruch, Leerzeichen oder "Komma plus Leerzeichen".
  // Ein Komma ohne Leerzeichen zwischen Ziffern ist ein Dezimalkomma: "8,5; 9" → [8.5, 9].
  LM.parseList = function (s) {
    s = String(s || "").replace(/[−–]/g, "-");
    var parts;
    if (/[;\n]/.test(s)) parts = s.split(/[;\n]+/);
    else if (/,\s/.test(s)) parts = s.split(/,\s+/);
    else parts = s.split(/\s+/);
    var out = [], bad = [];
    parts.map(function (p) { return p.trim(); }).filter(Boolean).forEach(function (p) {
      p.split(/\s+/).forEach(function (q) {
        var v = LM.parseNum(q);
        if (isFinite(v)) out.push(v); else bad.push(q);
      });
    });
    return { values: out, bad: bad };
  };

  LM.near = function (a, b, tol) { return isFinite(a) && isFinite(b) && Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); };

  // Antwort prüfen: akzeptiert Rundung auf `decimals` Nachkommastellen (Standard 2).
  LM.check = function (text, expected, opts) {
    opts = opts || {};
    var v = LM.parseNum(text);
    if (!isFinite(v)) return { ok: false, empty: String(text || "").trim() === "", value: v };
    var tol = opts.tol !== undefined ? opts.tol : 0.5 * Math.pow(10, -(opts.decimals === undefined ? 2 : opts.decimals)) + 1e-9;
    return { ok: Math.abs(v - expected) <= tol, empty: false, value: v };
  };

  /* ---------- DOM ---------- */

  LM.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };

  // LM.h("button", { class: "btn", text: "Los", on: { click: fn }, attrs: { "aria-label": "…" } }, [kinder])
  LM.h = function (tag, o, kids) {
    var el = document.createElement(tag);
    o = o || {};
    if (o.class) el.className = o.class;
    if (o.text !== undefined) el.textContent = o.text;
    if (o.html !== undefined) el.innerHTML = o.html;
    if (o.attrs) Object.keys(o.attrs).forEach(function (k) { if (o.attrs[k] !== null && o.attrs[k] !== undefined) el.setAttribute(k, o.attrs[k]); });
    if (o.style) Object.keys(o.style).forEach(function (k) { el.style[k] = o.style[k]; });
    if (o.on) Object.keys(o.on).forEach(function (k) { el.addEventListener(k, o.on[k]); });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  };

  // Formel mit KaTeX setzen. Ohne KaTeX (offline) erscheint der Quelltext.
  LM.tex = function (src, display) {
    if (window.katex) {
      try { return window.katex.renderToString(src, { displayMode: !!display, throwOnError: false, output: "htmlAndMathml" }); } catch (e) { /* unten */ }
    }
    return '<code class="tex-fallback">' + LM.esc(src) + "</code>";
  };
  LM.renderTex = function (root) {
    (root || document).querySelectorAll("[data-tex]").forEach(function (el) {
      el.innerHTML = LM.tex(el.getAttribute("data-tex"), el.hasAttribute("data-display"));
    });
  };

  // Kurze Meldung unten auf der Seite
  LM.toast = function (msg) {
    var box = document.getElementById("toast");
    if (!box) return;
    box.textContent = msg;
    box.classList.add("show");
    clearTimeout(LM._toastT);
    LM._toastT = setTimeout(function () { box.classList.remove("show"); }, 2600);
  };

  // Kleines Konfetti, z. B. bei einer Serie richtiger Antworten. Respektiert "weniger Bewegung".
  LM.celebrate = function (originEl) {
    if (reduceMotion) return;
    var r = originEl ? originEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var cs = getComputedStyle(document.documentElement);
    var colors = ["--c-mod", "--c-med", "--c-mean", "--c-q", "--accent"].map(function (v) { return cs.getPropertyValue(v).trim() || "#888"; });
    var c = document.createElement("canvas");
    c.className = "confetti";
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    var ctx = c.getContext("2d"), parts = [];
    for (var i = 0; i < 70; i++) {
      var a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, w: 4 + Math.random() * 5, h: 6 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: colors[i % colors.length], life: 1 });
    }
    var t0 = performance.now();
    (function frame(t) {
      var dt = Math.min(32, t - (frame.last || t)) / 16; frame.last = t;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.vy += 0.25 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= 0.012 * dt;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 1600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  };

  /* ---------- SVG ---------- */

  var SVGNS = "http://www.w3.org/2000/svg";
  LM.svg = {
    el: function (tag, attrs, parent) {
      var e = document.createElementNS(SVGNS, tag);
      Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(e);
      return e;
    },
    text: function (parent, x, y, str, attrs) {
      var t = LM.svg.el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
      t.textContent = str;
      return t;
    },
    // lineare Skala: Datenbereich [d0, d1] → Pixel [r0, r1]
    scale: function (d0, d1, r0, r1) {
      var f = function (v) { return d1 === d0 ? (r0 + r1) / 2 : r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
      f.invert = function (px) { return d0 + (px - r0) / (r1 - r0) * (d1 - d0); };
      return f;
    },
    // „schöne“ Achsenstriche zwischen lo und hi, ungefähr `count` Stück
    ticks: function (lo, hi, count) {
      var span = hi - lo || 1, raw = span / (count || 6), p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
      var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p, out = [];
      for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toPrecision(12));
      return out;
    },
    // Ruft draw(breite) sofort und bei jeder Größenänderung des Containers erneut auf.
    responsive: function (container, draw) {
      var last = 0;
      function go() {
        var w = container.clientWidth;
        if (w && Math.abs(w - last) > 1) { last = w; draw(w); }
      }
      if (window.ResizeObserver) new ResizeObserver(go).observe(container);
      else window.addEventListener("resize", go);
      go();
      return { redraw: function () { var w = container.clientWidth; if (w) { last = w; draw(w); } } };
    }
  };

  /* ---------- Zahlenkarten (gemeinsames Bauteil) ---------- */

  // Zeigt Werte als Karten mit Platznummer. Unsortiert heißen die Plätze x₁, x₂, …, nach dem Sortieren x₍₁₎, x₍₂₎, …
  // api.sort() sortiert mit Animation, api.mark([plätze], "is-med") hebt Plätze (1-basiert, sortierte Reihenfolge) hervor.
  LM.cards = function (parent, opts) {
    opts = opts || {};
    var wrap = LM.h("div", { class: "ncards" + (opts.small ? " ncards-sm" : ""), attrs: { role: "list" } });
    parent.appendChild(wrap);
    var items = [], isSorted = false;

    function label(i) { return isSorted ? "x<sub>(" + i + ")</sub>" : "x<sub>" + i + "</sub>"; }
    function relabel() {
      items.forEach(function (it, idx) {
        it.pos.innerHTML = label(idx + 1);
        it.el.setAttribute("aria-label", (isSorted ? "Platz " : "Wert Nummer ") + (idx + 1) + ": " + LM.fmt(it.v, 4));
      });
    }
    var api = {
      el: wrap,
      set: function (values, sortedAlready) {
        wrap.innerHTML = "";
        items = values.map(function (v) {
          var val = LM.h("span", { class: "ncard-val", text: LM.fmt(v, 4) });
          var pos = LM.h("span", { class: "ncard-pos" });
          var el = LM.h("div", { class: "ncard", attrs: { role: "listitem" } }, [val, pos]);
          wrap.appendChild(el);
          return { v: v, el: el, pos: pos };
        });
        isSorted = !!sortedAlready;
        relabel();
        return api;
      },
      values: function () { return items.map(function (it) { return it.v; }); },
      isSorted: function () { return isSorted; },
      sort: function (done) {
        var first = items.map(function (it) { return it.el.getBoundingClientRect(); });
        var order = items.map(function (it, i) { return { it: it, i: i }; }).sort(function (a, b) { return a.it.v - b.it.v || a.i - b.i; });
        var firstById = new Map(order.map(function (o) { return [o.it, first[o.i]]; }));
        items = order.map(function (o) { return o.it; });
        items.forEach(function (it) { wrap.appendChild(it.el); });
        isSorted = true;
        relabel();
        if (reduceMotion) { if (done) done(); return api; }
        items.forEach(function (it) {
          var a = firstById.get(it), b = it.el.getBoundingClientRect();
          var dx = a.left - b.left, dy = a.top - b.top;
          if (!dx && !dy) return;
          it.el.style.transition = "none";
          it.el.style.transform = "translate(" + dx + "px," + dy + "px)";
        });
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            items.forEach(function (it) {
              it.el.style.transition = "transform 650ms cubic-bezier(.2,.8,.2,1)";
              it.el.style.transform = "";
            });
            setTimeout(function () { if (done) done(); }, 680);
          });
        });
        return api;
      },
      // Plätze (1-basiert) mit einer Klasse markieren: is-med, is-q, is-mod, is-mean, is-hl, is-dim
      mark: function (positions, cls) {
        positions.forEach(function (p) { var it = items[p - 1]; if (it) it.el.classList.add(cls); });
        return api;
      },
      markWhere: function (pred, cls) {
        items.forEach(function (it, idx) { if (pred(it.v, idx + 1)) it.el.classList.add(cls); });
        return api;
      },
      clear: function () {
        items.forEach(function (it) { it.el.className = "ncard"; });
        return api;
      },
      item: function (pos) { return items[pos - 1] ? items[pos - 1].el : null; }
    };
    if (opts.values) api.set(opts.values, opts.sorted);
    return api;
  };

  /* ---------- Speicher und Fortschritt ---------- */

  LM.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem("lagemasse:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("lagemasse:" + k, JSON.stringify(v)); } catch (e) { /* privat / gesperrt */ }
    }
  };

  // Fortschritt = Liste erledigter Ziele (Abschnitte „verstanden“, Meilensteine der Module).
  // Gespeicherte Liste lesen; kaputte Werte (kein Array) zählen als „nichts erledigt“.
  function doneList() {
    var d = LM.store.get("done", []);
    return Array.isArray(d) ? d.filter(function (x) { return typeof x === "string"; }) : [];
  }
  LM.progress = {
    goals: {},
    define: function (id, label) { LM.progress.goals[id] = label; LM.progress.render(); },
    has: function (id) { return doneList().indexOf(id) >= 0; },
    mark: function (id, on) {
      var done = doneList(), i = done.indexOf(id);
      if (on === false) { if (i >= 0) done.splice(i, 1); }
      else if (i < 0) done.push(id);
      LM.store.set("done", done);
      LM.progress.render();
      document.dispatchEvent(new CustomEvent("lm:progress", { detail: { id: id, on: on !== false } }));
    },
    render: function () {
      var ids = Object.keys(LM.progress.goals), done = doneList();
      var n = ids.filter(function (id) { return done.indexOf(id) >= 0; }).length;
      document.querySelectorAll("[data-progress-count]").forEach(function (el) { el.textContent = n + "/" + ids.length; });
      document.querySelectorAll("[data-progress-ring]").forEach(function (el) {
        el.style.setProperty("--p", ids.length ? n / ids.length : 0);
      });
      document.querySelectorAll("[data-done]").forEach(function (btn) {
        var on = done.indexOf(btn.getAttribute("data-done")) >= 0;
        btn.setAttribute("aria-pressed", String(on));
        btn.classList.toggle("is-done", on);
      });
      document.querySelectorAll(".toc a[href^='#']").forEach(function (a) {
        a.classList.toggle("is-done", done.indexOf(a.getAttribute("href").slice(1)) >= 0);
      });
    }
  };

  /* ---------- Module ---------- */

  LM.widget = function (name, mount) { registry[name] = mount; };

  function mountOne(el) {
    var name = el.getAttribute("data-widget"), mount = registry[name];
    if (!mount) {
      el.innerHTML = '<p class="w-missing">Dieses Modul (' + LM.esc(name) + ") wird noch gebaut.</p>";
      return;
    }
    try { mount(el, LM); } catch (e) {
      console.error("Modul " + name + ":", e);
      el.innerHTML = '<p class="w-missing">Dieses Modul konnte nicht geladen werden.</p>';
    }
  }

  // Formeln im Text und Module aufbauen. Was im Bild ist (oder gleich kommt), sofort;
  // den Rest in kleinen Häppchen, damit die Seite beim Laden nicht einfriert.
  function buildPage(done) {
    var vh = window.innerHeight || 800, now = [], later = [];
    document.querySelectorAll("[data-tex], [data-widget]").forEach(function (el) {
      var task = el.hasAttribute("data-widget") ? function () { mountOne(el); } : function () { el.innerHTML = LM.tex(el.getAttribute("data-tex"), el.hasAttribute("data-display")); };
      var r = el.getBoundingClientRect();
      (r.bottom > -vh && r.top < 2 * vh ? now : later).push(task);
    });
    now.forEach(function (t) { t(); });
    var i = 0;
    (function step() {
      var t0 = performance.now();
      while (i < later.length && performance.now() - t0 < 25) later[i++]();
      if (i < later.length) setTimeout(step, 0); else if (done) done();
    })();
  }

  /* ---------- Theme ---------- */

  function setupTheme() {
    var btn = document.getElementById("theme-btn");
    var saved = LM.store.get("theme", null);
    if (saved !== "light" && saved !== "dark") saved = null;
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    function current() {
      var t = document.documentElement.getAttribute("data-theme");
      if (t) return t;
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    function sync() {
      if (!btn) return;
      var dark = current() === "dark";
      btn.setAttribute("aria-label", dark ? "Helles Design einschalten" : "Dunkles Design einschalten");
      btn.setAttribute("aria-pressed", String(dark));
    }
    if (btn) btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      LM.store.set("theme", next);
      sync();
      document.dispatchEvent(new CustomEvent("lm:theme", { detail: next }));
    });
    sync();
  }

  /* ---------- Navigation ---------- */

  function setupNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
    var menuBtn = document.getElementById("menu-btn"), toc = document.getElementById("toc");
    if (menuBtn && toc) {
      menuBtn.addEventListener("click", function () {
        var open = toc.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
      });
      var closeMenu = function (focusBtn) {
        if (!toc.classList.contains("open")) return;
        toc.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        if (focusBtn) menuBtn.focus();
      };
      links.forEach(function (a) { a.addEventListener("click", function () { closeMenu(false); }); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(toc.contains(document.activeElement)); });
      toc.addEventListener("focusout", function (e) {
        var to = e.relatedTarget;
        if (to && !toc.contains(to) && to !== menuBtn) closeMenu(false);
      });
    }
    if (!window.IntersectionObserver) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && byId[e.target.id]) {
          links.forEach(function (a) { a.classList.remove("is-current"); a.removeAttribute("aria-current"); });
          byId[e.target.id].classList.add("is-current");
          byId[e.target.id].setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
  }

  /* ---------- „Verstanden“-Knöpfe ---------- */

  function setupDone() {
    document.querySelectorAll("[data-done]").forEach(function (btn) {
      var id = btn.getAttribute("data-done");
      LM.progress.goals[id] = btn.getAttribute("data-label") || id;
      btn.addEventListener("click", function () {
        var on = !LM.progress.has(id);
        LM.progress.mark(id, on);
        if (on) { LM.toast("Abschnitt abgehakt. Weiter so!"); LM.celebrate(btn); }
      });
    });
  }

  /* ---------- Druck ---------- */

  function setupPrint() {
    document.querySelectorAll("[data-print]").forEach(function (b) {
      b.addEventListener("click", function () { try { window.print(); } catch (e) { LM.toast("Drucken geht hier nicht. Nutz Strg+P."); } });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupTheme();
    setupDone();
    setupNav();
    setupPrint();
    buildPage(function () { LM.progress.render(); document.dispatchEvent(new CustomEvent("lm:ready")); });
    LM.progress.render();
    document.documentElement.classList.add("js-ready");
  });
})();
