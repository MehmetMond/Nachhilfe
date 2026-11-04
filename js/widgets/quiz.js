/*
 * Bündel „quiz“ der Lagemaße-Seite:
 *   mini-quiz   Kurz-Check am Ende eines Kapitels (data-set = modus | median | quantile | boxplot | mittel | weitere | schiefe)
 *   scale-sort  Kapitel 10: Merkmale nach Skalenniveau sortieren, danach die erlaubten Lagemaße sehen
 *   flashcards  Kapitel 14: 31 Karteikarten mit Leitner-Stapeln (LM.store "cards"), Fortschrittsziel „karten“
 *   quiz        Kapitel 14: Abschlussquiz, 10 Fragen (eine aus jedem Kapitel 2–11), Bestwert, Fortschrittsziel „quiz“
 *
 * Rechnen nur über LM.stats, Zahlen nur über LM.fmt, Formeln über LM.tex. Stile: css/widgets/quiz.css (Präfix qz-).
 * Daten und reine Logik stehen oben ohne DOM. In Node werden sie exportiert; tests/quiz.test.js rechnet jede
 * Antwort mit js/stats.js nach und prüft, dass jede Auswahlfrage genau eine richtige Antwort hat.
 *
 * Formate:
 *   calc  = [funktion, [argumente], "pfad"]   z. B. ["boxplot", [PULS, 1.5], "fences.1"]
 *           Ein Argument { $: [funktion, [argumente], "pfad"] } wird vorher ausgerechnet (Verkettung).
 *           Zahlfrage: calc liefert die richtige Zahl. Auswahlfrage: calc muss den Wert v der richtigen Antwort ergeben.
 *   facts = [[funktion, [argumente], erwartet, "pfad", nachkommastellen], …]   Zahlen, die im Text stehen
 *   traps = [{ v: zahl, why: "…" }, …]   typische falsche Zahlen mit eigener Rückmeldung
 *   Text:  $…$ = Formel (KaTeX), `…` = R-Code, **…** = fett, {x} = die Daten der Frage.
 */
(function (root) {
  "use strict";

  /* =====================================================================
     Daten der Folien und Übungsblätter
     ===================================================================== */

  function seq(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }

  var SLIDE95 = [3, 6, 8, 9, 11, 15];                        // Folien 95 und 102
  var SLIDE95_OUT = [3, 6, 8, 9, 11, 150];                   // aus der 15 wird eine 150
  var SLIDE95_ODD = [3, 6, 8, 9, 11];                        // Folie 95, n = 5
  var PULS = [62, 64, 68, 70, 70, 74, 74, 76, 76, 78, 78, 80]; // Folie 106
  var PULS109 = [58, 62, 64, 68, 70, 70, 74, 74, 76, 76, 78, 78, 80, 89]; // Folie 109
  var U1 = [4, 5, 5, 8, 10, 12, 15, 20, 38];                 // Lernblatt Übung 1, sortiert
  var U2 = [9, 9, 12, 14, 15, 16, 17, 20];                   // Lernblatt Übung 2, sortiert
  var NOTEN_A = [1, 2, 3, 4, 5, 6], NOTEN_H = [3, 5, 8, 6, 2, 1]; // Folien 46 und 111
  var NOTEN = { $: ["expand", [NOTEN_A, NOTEN_H]] };
  var GEHALT = [900, 1000, 1100, 1200, 1300, 30000];
  var TEMP = [16, 4, 13, 9, 8];                              // Höchsttemperaturen, Folien 129 und 146
  var TRIM10 = [2, 4, 5, 6, 7, 8, 9, 10, 11, 40];

  // Übungsblatt 3
  var A9_A = [1, 2, 3, 4, 5], A9_H = [13, 25, 42, 16, 4];   // Aufgabe 9: 100 Noten
  var A9 = { $: ["expand", [A9_A, A9_H]] };
  var RT = [232.4, 198.3, 280.6, 326.9, 305.4, 213.3, 261.2, 175.0, 207.3, 210.0, 194.7,
    239.7, 519.6, 292.8, 270.9, 201.5, 147.2, 251.5, 215.4, 206.1, 201.9, 207.0,
    246.1, 148.1, 206.3, 211.3, 134.8, 794.5, 300.4, 371.1, 295.1, 278.8, 216.2,
    307.5, 321.3, 163.7, 188.5, 202.1, 299.3, 228.1, 255.8, 208.3, 279.2, 194.4,
    190.4, 212.4, 185.6, 237.3, 204.4, 246.8, 236.3, 275.9, 267.2, 336.6, 261.8,
    252.1, 218.7, 165.1, 273.6, 307.8];                    // Aufgabe 8/10: 60 Reaktionszeiten in ms
  var A11_U = [60, 63, 66, 69, 72, 75], A11_H = [5, 18, 42, 27, 8]; // Aufgabe 11: Körpergewicht in Klassen
  var A12_F = [0.55, 0.46, 0.35, 0.29, 0.25, 0.21];          // Aufgabe 12: Fehleranteile f_0 … f_5
  // Lernfortschritt x_i = f_i ÷ f_(i−1) für i = 1 … 5 (so steht es in der Aufgabe)
  var A12_X = A12_F.slice(1).map(function (f, i) { return f / A12_F[i]; });

  /* =====================================================================
     Kurz-Checks pro Kapitel (mini-quiz). Gezeigt werden höchstens 3 Fragen;
     hat ein Satz 4, wechselt „Nochmal“ die Auswahl durch.
     ===================================================================== */

  var MINI_SHOW = 3;

  var MINI = {
    modus: {
      title: "Modus", tag: "mod",
      items: [
        {
          id: "mo1", type: "mc", data: [2, 3, 3, 4, 4, 4, 5],
          q: "Werte: {x}. Was ist der Modus?",
          calc: ["mode", [[2, 3, 3, 4, 4, 4, 5]]],
          opts: [
            { v: 4, ok: true },
            { v: 3, why: "3 ist die Anzahl: So oft kommt die 4 vor. Gefragt ist aber der Wert." },
            { t: "kein eindeutiger Modus", v: null, why: "Die 4 kommt öfter vor als jeder andere Wert. Also gibt es einen eindeutigen Modus." }
          ],
          ex: "Die 4 kommt dreimal vor, öfter als jeder andere Wert. Also ist der Modus 4. Die 3 ist nur die Anzahl."
        },
        {
          id: "mo2", type: "mc", data: [1, 1, 2, 2, 3],
          q: "Werte: {x}. Was ist der Modus?",
          calc: ["mode", [[1, 1, 2, 2, 3]]],
          opts: [
            { v: 1, why: "Die 2 kommt genauso oft vor wie die 1." },
            { v: 2, why: "Die 1 kommt genauso oft vor wie die 2." },
            { v: 1.5, why: "Beim Modus wird nichts gemittelt. Er ist immer einer der Werte." },
            { t: "kein eindeutiger Modus", v: null, ok: true }
          ],
          ex: "1 und 2 kommen beide zweimal vor. Bei Gleichstand gibt es keinen eindeutigen Modus (Folie 92)."
        },
        {
          id: "mo3", type: "mc",
          q: "Sechs Leute nennen ihre Lieblingsfarbe: rot, blau, grün, blau, rot, blau. Was ist der Modus?",
          opts: [
            { t: "blau", ok: true },
            { t: "3", why: "3 ist die Anzahl der Nennungen. Der Modus ist die Farbe selbst." },
            { t: "Bei Farben gibt es keinen Modus.", why: "Doch! Der Modus geht auch mit Wörtern." }
          ],
          ex: "Blau kommt dreimal vor, öfter als jede andere Farbe. Bei nominalen Daten ist der Modus das einzige sinnvolle Lagemaß."
        }
      ]
    },

    median: {
      title: "Median", tag: "med",
      items: [
        {
          id: "me1", type: "num", data: [9, 3, 11, 6, 8],
          q: "Werte: {x}. Wie groß ist der Median $\\tilde{x}$?",
          calc: ["median", [[9, 3, 11, 6, 8]]], answer: 8,
          facts: [["medianInfo", [[9, 3, 11, 6, 8]], [3], "positions"]],
          traps: [{ v: 11, why: "11 steht in der Mitte der Liste, wie sie gemessen wurde. Du musst aber zuerst sortieren." }],
          ex: "Sortiert: 3, 6, 8, 9, 11. Bei n = 5 (ungerade) steht der Median auf Platz (5 + 1) ÷ 2 = 3, also 8."
        },
        {
          id: "me2", type: "mc", data: SLIDE95,
          q: "Werte: {x}. Was ist der Median?",
          calc: ["median", [SLIDE95]],
          facts: [["mean", [SLIDE95], 8.67, null, 2], ["medianInfo", [SLIDE95], [3, 4], "positions"]],
          opts: [
            { v: 8.5, ok: true },
            { v: 8, why: "8 steht auf Platz 3. Bei gerader Anzahl brauchst du aber das Mittel der beiden mittleren Werte." },
            { v: 9, why: "9 ist nur der zweite der beiden mittleren Werte." },
            { v: 52 / 6, why: "Das ist das arithmetische Mittel, nicht der Median." }
          ],
          ex: "n = 6 ist gerade. Die beiden mittleren Werte stehen auf Platz 3 und 4: ½(8 + 9) = 8,5."
        },
        {
          id: "me3", type: "mc", data: SLIDE95_OUT,
          q: "Aus der 15 wird eine 150: {x}. Was passiert mit dem Median?",
          calc: ["median", [SLIDE95_OUT]],
          facts: [["median", [SLIDE95], 8.5]],
          opts: [
            { t: "Er bleibt bei 8,5.", v: 8.5, ok: true },
            { t: "Er steigt stark.", why: "Das passiert dem Mittel. Der Median schaut nur auf die Mitte." },
            { t: "Er sinkt ein bisschen.", why: "Die beiden mittleren Werte 8 und 9 bleiben gleich. Also bleibt auch der Median gleich." }
          ],
          ex: "Die beiden mittleren Werte sind immer noch 8 und 9. Der Median ist robust gegen Ausreißer."
        }
      ]
    },

    quantile: {
      title: "Quantile", tag: "q",
      items: [
        {
          id: "qu1", type: "mc",
          q: "Du hast n = 9 sortierte Werte und suchst das 0,25-Quantil. Es ist $n \\cdot p = 9 \\cdot 0{,}25 = 2{,}25$. Welchen Platz nimmst du?",
          calc: ["quantileInfo", [seq(9), 0.25], "positions"],
          facts: [["quantileInfo", [seq(9), 0.25], 2.25, "np"]],
          opts: [
            { t: "Platz 3", v: [3], ok: true },
            { t: "Platz 2", v: [2], why: "Bei dieser Regel wird nie abgerundet. Eine Kommazahl rundest du immer auf." },
            { t: "das Mittel aus Platz 2 und 3", v: [2, 3], why: "Gemittelt wird nur, wenn n · p eine ganze Zahl ist." }
          ],
          ex: "2,25 ist keine ganze Zahl. Also aufrunden auf k = 3 und den Wert auf Platz 3 nehmen."
        },
        {
          id: "qu2", type: "mc",
          q: "Ruhepuls von 12 Studentinnen (Folie 106). Für $Q_1$ ist $n \\cdot p = 12 \\cdot 0{,}25 = 3$. Was nimmst du?",
          calc: ["quantileInfo", [PULS, 0.25], "positions"],
          facts: [["quantile", [PULS, 0.25], 69]],
          opts: [
            { t: "das Mittel aus Platz 3 und 4", v: [3, 4], ok: true },
            { t: "Platz 3", v: [3], why: "Bei einer ganzen Zahl nimmst du nicht nur diesen Platz. Du mittelst mit dem nächsten." },
            { t: "Platz 4", v: [4], why: "Aufrunden gilt nur für Kommazahlen. 3 ist schon ganz." }
          ],
          ex: "3 ist eine ganze Zahl. Dann nimmst du das Mittel aus Platz 3 und Platz 4: ½(68 + 70) = 69."
        },
        {
          id: "qu3", type: "mc",
          q: "Mit welcher Angabe rechnet `quantile()` in R genau wie die Folie?",
          facts: [["quantileType7", [SLIDE95, 0.25], 6.5], ["quantile", [SLIDE95, 0.25], 6]],
          opts: [
            { t: "`type = 2`", ok: true },
            { t: "`type = 7`", why: "type = 7 ist der Standard von R. Für 3, 6, 8, 9, 11, 15 kommt damit beim 0,25-Quantil 6,5 statt 6 heraus." },
            { t: "`range = 1.5`", why: "range gehört zu boxplot(), nicht zu quantile()." }
          ],
          ex: "Nur mit `type = 2` rechnet R nach der Regel von Folie 101. Ohne Angabe nimmt R `type = 7`."
        }
      ]
    },

    boxplot: {
      title: "Boxplot", tag: "q",
      items: [
        {
          id: "bo1", type: "mc",
          q: "Was liegt in der Box eines Boxplots?",
          opts: [
            { t: "die mittlere Hälfte der Werte, von $Q_1$ bis $Q_3$", ok: true },
            { t: "alle Werte außer den Ausreißern", why: "So weit reichen die Whisker, nicht die Box." },
            { t: "die Werte zwischen Median und Mittel", why: "Das Mittel kommt im Boxplot gar nicht vor." }
          ],
          ex: "Die Box reicht von $Q_1$ bis $Q_3$. Darin liegt die mittlere Hälfte der Werte. Der Strich in der Box ist der Median."
        },
        {
          id: "bo2", type: "num",
          q: "Ruhepuls: $Q_1 = 69$ und $Q_3 = 77$. Bei `range = 1.5`: Bis zu welchem Wert darf der rechte Whisker höchstens reichen?",
          calc: ["boxplot", [PULS, 1.5], "fences.1"], answer: 89,
          facts: [["quartiles", [PULS], 8, "iqr"], ["quantile", [PULS, 0.25], 69], ["quantile", [PULS, 0.75], 77]],
          traps: [
            { v: 80, why: "80 ist der größte Wert. Gefragt ist die Grenze, die sich aus 1,5 Quartilabständen ergibt." },
            { v: 85, why: "Du hast nur einen Quartilabstand addiert. Bei `range = 1.5` sind es 1,5 · 8 = 12." }
          ],
          ex: "Quartilabstand: 77 − 69 = 8. Dann 77 + 1,5 · 8 = 77 + 12 = 89."
        },
        {
          id: "bo3", type: "mc", data: U1,
          q: "Werte: {x}. Mit `range = 1.5` ist $Q_1 = 5$ und $Q_3 = 15$. Was passiert mit der 38?",
          calc: ["boxplot", [U1, 1.5], "out"],
          facts: [["quantile", [U1, 0.25], 5], ["quantile", [U1, 0.75], 15], ["boxplot", [U1, 1.5], 30, "fences.1"], ["boxplot", [U1, 1.5], 20, "hi"]],
          opts: [
            { t: "Sie wird als einzelner Punkt gezeichnet.", v: [38], ok: true },
            { t: "Der rechte Whisker reicht bis 38.", why: "Das wäre bei `range = 0` so. Hier endet der Whisker bei 20." },
            { t: "R lässt sie einfach weg.", why: "Weggelassen wird nichts. Werte außerhalb der Grenzen zeigt R als Punkte." }
          ],
          ex: "Quartilabstand 15 − 5 = 10. Grenze: 15 + 1,5 · 10 = 30. Die 38 liegt darüber, also wird sie ein Punkt. Der Whisker endet bei 20."
        }
      ]
    },

    mittel: {
      title: "Arithmetisches Mittel", tag: "mean",
      items: [
        {
          id: "mi1", type: "num", data: [3, 5, 10],
          q: "Werte: {x}. Das Mittel ist $\\bar{x} = 6$. Wie groß ist die Summe aller Abweichungen $\\sum (x_i - \\bar{x})$?",
          calc: ["meanInfo", [[3, 5, 10]], "deviationSum"], answer: 0,
          facts: [["mean", [[3, 5, 10]], 6]],
          traps: [{ v: 8, why: "Das sind nur die Beträge 3 + 1 + 4. Mit Vorzeichen heben sich die Abweichungen auf." }],
          ex: "(3 − 6) + (5 − 6) + (10 − 6) = −3 − 1 + 4 = 0. Das ist die Nulleigenschaft: Die Summe ist immer 0."
        },
        {
          id: "mi2", type: "mc",
          q: "Bei 3, 6, 8, 9, 11, 15 ist $\\bar{x} \\approx 8{,}67$. Jetzt wird aus der 15 eine 150. Was passiert mit dem Mittel?",
          calc: ["mean", [SLIDE95_OUT]],
          facts: [["mean", [SLIDE95], 8.67, null, 2], ["mean", [SLIDE95_OUT], 31.17, null, 2], ["median", [SLIDE95_OUT], 8.5]],
          opts: [
            { t: "Es springt auf etwa 31,17.", v: 187 / 6, ok: true },
            { t: "Es bleibt bei etwa 8,67.", v: 52 / 6, why: "Das gilt für den Median: Er bleibt bei 8,5. Das Mittel addiert alle Werte, also auch die 150." },
            { t: "Es steigt nur ein kleines bisschen.", why: "Die 150 ist 135 größer als die 15. Geteilt durch 6 sind das 22,5 mehr." }
          ],
          ex: "Das Mittel springt von 8,67 auf 31,17, der Median bleibt bei 8,5. Das Mittel ist empfindlich gegen Ausreißer."
        },
        {
          id: "mi3", type: "num",
          q: "Häufigkeitstabelle: Wie groß ist das Mittel $\\bar{x}$?",
          tab: [{ th: "Note $a_j$", vals: [1, 2, 3] }, { th: "Anzahl $h_j$", vals: [2, 3, 5] }],
          calc: ["meanTable", [[1, 2, 3], [2, 3, 5]], "value"], answer: 2.3,
          facts: [["meanTable", [[1, 2, 3], [2, 3, 5]], 10, "n"], ["meanTable", [[1, 2, 3], [2, 3, 5]], 23, "sum"]],
          traps: [{ v: 2, why: "2 ist das Mittel der Noten 1, 2 und 3. Jede Note zählt aber so oft, wie sie vorkommt." }],
          ex: "n = 2 + 3 + 5 = 10. Dann (2 · 1 + 3 · 2 + 5 · 3) ÷ 10 = 23 ÷ 10 = 2,3."
        },
        {
          id: "mi4", type: "num", unit: "°F",
          q: "Höchsttemperaturen 16, 4, 13, 9, 8 °C mit $\\bar{x} = 10$ °C. In Fahrenheit gilt $y_i = 1{,}8 \\cdot x_i + 32$. Wie groß ist das Mittel $\\bar{y}$ in °F?",
          calc: ["mean", [{ $: ["linear", [TEMP, 1.8, 32]] }]], answer: 50,
          facts: [["mean", [TEMP], 10]],
          traps: [
            { v: 18, why: "1,8 · 10 = 18 ist nur der erste Schritt. Dazu kommt noch + 32." },
            { v: 42, why: "Du hast nur 32 addiert. Erst mal 1,8, dann plus 32." }
          ],
          ex: "Du musst nicht jeden Wert umrechnen: $\\bar{y} = p \\cdot \\bar{x} + q = 1{,}8 \\cdot 10 + 32 = 50$ (Folie 134)."
        }
      ]
    },

    weitere: {
      title: "Weitere Mittelwerte", tag: "mean",
      items: [
        {
          id: "we1", type: "mc",
          q: "Ein Kurs steigt im ersten Jahr auf das 2-Fache und im zweiten auf das 8-Fache. Welches Mittel beschreibt den typischen Faktor pro Jahr?",
          facts: [["mean", [[2, 8]], 5], ["geometricMean", [[2, 8]], 4]],
          opts: [
            { t: "das geometrische Mittel", ok: true },
            { t: "das arithmetische Mittel", why: "Das gäbe (2 + 8) ÷ 2 = 5. Aber 5 · 5 = 25, nicht 2 · 8 = 16." },
            { t: "das harmonische Mittel", why: "Das passt zu Raten wie km/h bei fester Strecke, nicht zu Faktoren." }
          ],
          ex: "Faktoren werden multipliziert. Dafür ist das geometrische Mittel da: $\\sqrt{2 \\cdot 8} = 4$, und $4 \\cdot 4 = 16$ passt (Folie 119)."
        },
        {
          id: "we2", type: "num",
          q: "Wie groß ist das geometrische Mittel von 2 und 8?",
          calc: ["geometricMean", [[2, 8]]], answer: 4,
          facts: [["harmonicMean", [[2, 8]], 3.2]],
          traps: [
            { v: 5, why: "5 ist das arithmetische Mittel. Beim geometrischen multiplizierst du und ziehst dann die Wurzel." },
            { v: 16, why: "16 ist erst das Produkt. Jetzt noch die Wurzel ziehen: n = 2, also die Quadratwurzel." },
            { v: 3.2, why: "3,2 ist das harmonische Mittel." }
          ],
          ex: "$GM = \\sqrt{2 \\cdot 8} = \\sqrt{16} = 4$. Probe: $4 \\cdot 4 = 16 = 2 \\cdot 8$."
        },
        {
          id: "we3", type: "mc",
          q: "Du fährst 60 km mit 30 km/h hin und dieselben 60 km mit 90 km/h zurück. Welches Mittel liefert die Durchschnittsgeschwindigkeit?",
          calc: ["harmonicMean", [[30, 90]]],
          facts: [["geometricMean", [[30, 90]], 51.96, null, 2]],
          opts: [
            { t: "das harmonische Mittel: 45 km/h", v: 45, ok: true },
            { t: "das arithmetische Mittel: 60 km/h", v: 60, why: "Zurück bist du schneller, also kürzer unterwegs. Die langsame Fahrt dauert länger und zählt mehr. Darum liegt der Schnitt unter 60." },
            { t: "das geometrische Mittel: etwa 51,96 km/h", v: Math.sqrt(2700), why: "Das geometrische Mittel ist für Faktoren wie Wachstum. Bei km/h mit fester Strecke nimmst du das harmonische (Folie 120)." }
          ],
          ex: "Die Strecke ist fest, also passt das harmonische Mittel: $2 \\div \\left(\\tfrac{1}{30} + \\tfrac{1}{90}\\right) = 45$. Probe: 2 h hin, 40 min zurück, 120 km in 2 h 40 min sind 45 km/h."
        },
        {
          id: "we4", type: "mc",
          q: "In R steht `mean(x, trim = 0.1)`. Was wird dabei weggelassen?",
          facts: [["trimInfo", [seq(60), 0.1], 6, "k"], ["trimInfo", [seq(60), 0.1], 48, "m"]],
          opts: [
            { t: "die 10 % kleinsten **und** die 10 % größten Werte", ok: true },
            { t: "insgesamt 10 %, also 5 % an jedem Ende", why: "R streicht an **jedem** Ende 10 %. Zusammen fallen also 20 % weg." },
            { t: "nur die 10 % größten Werte", why: "Getrimmt wird an beiden Enden, nicht nur oben." }
          ],
          ex: "Bei 60 Werten heißt das: je 6 Werte unten und oben weg, 48 bleiben übrig. Vom Rest nimmst du das normale Mittel."
        }
      ]
    },

    schiefe: {
      title: "Schiefe", tag: null,
      items: [
        {
          id: "sc1", type: "mc",
          q: "Bei einer Verteilung ist $\\bar{x} = 12$ und $\\tilde{x} = 9$. Wie ist sie tendenziell geformt?",
          calc: ["skewDirection", [12 - 9]],
          opts: [
            { t: "rechtsschief, also linkssteil", v: "rechtsschief", ok: true },
            { t: "linksschief, also rechtssteil", v: "linksschief", why: "Dann müsste das Mittel kleiner als der Median sein. Hier ist es größer." },
            { t: "symmetrisch", v: "symmetrisch", why: "Symmetrisch hieße: Mittel und Median sind gleich." }
          ],
          ex: "$\\bar{x} - \\tilde{x} = 12 - 9 = 3 > 0$: tendenziell rechtsschief bzw. linkssteil (Folie 140). Ein langer Ausläufer nach rechts zieht das Mittel hoch."
        },
        {
          id: "sc2", type: "mc",
          q: "Reaktionszeiten haben links einen steilen Gipfel und nach rechts einen langen Ausläufer. Wie nennt man diese Form?",
          opts: [
            { t: "rechtsschief = linkssteil", ok: true },
            { t: "linksschief = rechtssteil", why: "Das ist das Spiegelbild: langer Ausläufer nach links." },
            { t: "rechtsschief = rechtssteil", why: "Rechtsschief und linkssteil gehören zusammen. Steil ist die Seite mit dem Gipfel, hier also links." }
          ],
          ex: "„Schief“ nennt die Seite mit dem langen Ausläufer (rechts), „steil“ die Seite mit dem Gipfel (links). Beide Namen meinen dasselbe."
        },
        {
          id: "sc3", type: "mc",
          q: "Positive Schiefe (rechtsschief): In welcher Reihenfolge liegen Modus, Median und Mittel von links nach rechts?",
          opts: [
            { t: "Modus, Median, Mittel", ok: true },
            { t: "Mittel, Median, Modus", why: "Das ist die Reihenfolge bei negativer Schiefe." },
            { t: "Median, Modus, Mittel", why: "Auf Folie 141 liegt der Median zwischen Modus und Mittel." }
          ],
          ex: "Der Modus sitzt auf dem Gipfel links. Das Mittel wird vom langen Ausläufer am weitesten nach rechts gezogen. Der Median liegt dazwischen (Folie 141)."
        },
        {
          id: "sc4", type: "num", data: TEMP,
          q: "Höchsttemperaturen {x} (Folie 146): $Q_1 = 8$, $\\tilde{x} = 9$, $Q_3 = 13$. Wie groß ist der Quartilskoeffizient $g_{0{,}25}$?",
          calc: ["skewInfo", [TEMP, 0.25], "gp"], answer: 0.6,
          facts: [["quantile", [TEMP, 0.25], 8], ["median", [TEMP], 9], ["quantile", [TEMP, 0.75], 13]],
          traps: [
            { v: 3, why: "3 ist nur der Zähler. Teile noch durch $Q_3 - Q_1 = 5$." },
            { v: -0.6, why: "Achte aufs Vorzeichen: Oben steht $(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1) = 4 - 1 = 3$." }
          ],
          ex: "$g_{0{,}25} = \\frac{(13 - 9) - (9 - 8)}{13 - 8} = \\frac{3}{5} = 0{,}6 > 0$, also rechtsschief."
        }
      ]
    }
  };

  /* =====================================================================
     Skalen-Sortierspiel (Kapitel 10)
     ===================================================================== */

  var MEASURES = [
    { id: "mod", name: "Modus" },
    { id: "med", name: "Median" },
    { id: "mean", name: "Mittel" },
    { id: "geo", name: "geom. Mittel" }
  ];

  var LEVELS = [
    { id: "nominal", name: "Nominal", hint: "nur Namen", allowed: ["mod"],
      rule: "Nur gleich oder verschieden: Es bleibt der häufigste Wert." },
    { id: "ordinal", name: "Ordinal", hint: "Reihenfolge", allowed: ["mod", "med"],
      rule: "Sortieren geht, darum auch der Median. Die Abstände sind nicht sicher gleich, darum kein Mittel." },
    { id: "intervall", name: "Intervall", hint: "gleiche Abstände", allowed: ["mod", "med", "mean"],
      rule: "Gleiche Abstände: Das Mittel geht. Kein echter Nullpunkt: kein geometrisches Mittel (Folie 119)." },
    { id: "verhaeltnis", name: "Verhältnis", hint: "echter Nullpunkt", allowed: ["mod", "med", "mean", "geo"],
      rule: "Echter Nullpunkt, „doppelt so viel“ ergibt Sinn: Auch das geometrische Mittel ist erlaubt (Folie 119)." }
  ];

  var SCALE = [
    { id: "farbe", name: "Lieblingsfarbe", ex: "rot, blau, grün", level: "nominal",
      why: "Farben kann man unterscheiden, aber nicht sortieren." },
    { id: "plz", name: "Postleitzahl", ex: "72074, 10115, 80331", level: "nominal",
      why: "Die Zahlen sind nur Namen. 80331 ist nicht „mehr“ als 10115 (Folie 18)." },
    { id: "fach", name: "Studienfach", ex: "Psychologie, Jura, Medizin", level: "nominal",
      why: "Verschiedene Fächer ohne Reihenfolge. Keins ist „größer“ als ein anderes." },
    { id: "note", name: "Schulnote", ex: "1, 2, 3, 4, 5, 6", level: "ordinal",
      why: "Noten haben eine Reihenfolge, aber keine sicher gleichen Abstände (Folie 19).",
      note: "Und der Notenschnitt? Den rechnet man im Alltag trotzdem, sogar auf Folie 111. Streng genommen tut man dabei so, als wären die Abstände gleich. In der Klausur heißt es für ordinale Daten: Median." },
    { id: "platz", name: "Platzierung im Rennen", ex: "1., 2., 3. Platz", level: "ordinal",
      why: "Nur die Reihenfolge zählt. Ob Platz 2 eine Sekunde oder eine Minute hinter Platz 1 war, sagt die Platzierung nicht." },
    { id: "zufrieden", name: "Zufriedenheit 1–5", ex: "1 = gar nicht … 5 = sehr", level: "ordinal",
      why: "„Sehr zufrieden“ ist mehr als „zufrieden“. Gleich große Abstände sind aber nicht garantiert." },
    { id: "temp", name: "Temperatur in °C", ex: "−3 °C, 12 °C, 25 °C", level: "intervall",
      why: "Von 10 auf 20 °C ist so weit wie von 20 auf 30 °C. Aber 0 °C ist kein echtes Nichts: 20 °C ist nicht doppelt so warm wie 10 °C." },
    { id: "jahr", name: "Kalenderjahr", ex: "1989, 2004, 2023", level: "intervall",
      why: "Abstände passen: Von 2004 bis 2023 sind es 19 Jahre. Das Jahr 0 ist aber willkürlich gesetzt." },
    { id: "rt", name: "Reaktionszeit in ms", ex: "283 ms, 412 ms, 508 ms", level: "verhaeltnis",
      why: "Gleiche Abstände und ein echter Nullpunkt: 400 ms ist doppelt so lang wie 200 ms (Folie 18)." },
    { id: "groesse", name: "Körpergröße in cm", ex: "158 cm, 172 cm, 185 cm", level: "verhaeltnis",
      why: "Echter Nullpunkt: 0 cm heißt „keine Länge“. Ob cm oder Zoll, das Verhältnis bleibt gleich (Folie 20)." },
    { id: "geschw", name: "Anzahl Geschwister", ex: "0, 1, 2, 3", level: "verhaeltnis",
      why: "Eine Anzahl hat einen echten Nullpunkt. Streng genommen ist sie sogar eine Absolutskala (Folie 18). Die darf alles, was die Verhältnisskala darf.",
      note: "Fürs geometrische Mittel müssen aber alle Werte größer als 0 sein. Wer keine Geschwister hat, macht es unmöglich." }
  ];

  /* =====================================================================
     Karteikarten (Kapitel 14): Auswendig-Karte und Fallen
     ===================================================================== */

  var CARDS = [
    { id: "k-modus", topic: "Modus", tag: "mod",
      f: "Was ist der Modus? Und wann gibt es keinen?",
      b: "Der häufigste **Wert**, nicht seine Anzahl. Kommen zwei Werte gleich oft am häufigsten vor, gibt es keinen eindeutigen Modus (Folie 92). Beispiel 1, 1, 2, 2, 3: kein Modus.",
      facts: [["mode", [[1, 1, 2, 2, 3]], null]] },
    { id: "k-med-odd", topic: "Median", tag: "med",
      f: "Median bei **ungeradem** n: Welcher Platz?",
      tex: "\\tilde{x} = x_{((n+1)/2)}",
      b: "Erst sortieren! Beispiel n = 5: Platz (5 + 1) ÷ 2 = 3.",
      facts: [["medianInfo", [seq(5)], [3], "positions"]] },
    { id: "k-med-even", topic: "Median", tag: "med",
      f: "Median bei **geradem** n: Wie rechnest du?",
      tex: "\\tilde{x} = \\tfrac{1}{2}\\left[x_{(n/2)} + x_{(n/2+1)}\\right]",
      b: "Das Mittel der beiden mittleren Werte. Bei 3, 6, 8, 9, 11, 15 (n = 6) also Platz 3 und 4: ½(8 + 9) = 8,5.",
      facts: [["medianInfo", [SLIDE95], [3, 4], "positions"], ["median", [SLIDE95], 8.5]] },
    { id: "k-messwert", topic: "Median", tag: "med",
      f: "Muss der Median einer der gemessenen Werte sein?",
      b: "Nein. Bei 3, 6, 8, 9, 11, 15 ist der Median 8,5, obwohl niemand 8,5 gemessen hat.",
      facts: [["median", [SLIDE95], 8.5]] },
    { id: "k-q-frac", topic: "Quantile", tag: "q",
      f: "p-Quantil: Was tust du, wenn $n \\cdot p$ **keine ganze Zahl** ist?",
      tex: "\\tilde{x}_p = x_{(k)}",
      b: "k ist die nächstgrößere ganze Zahl, also immer **aufrunden**. Beispiel: n · p = 2,25 → Platz 3.",
      facts: [["quantileInfo", [seq(9), 0.25], [3], "positions"]] },
    { id: "k-q-int", topic: "Quantile", tag: "q",
      f: "p-Quantil: Was tust du, wenn $n \\cdot p = k$ eine **ganze Zahl** ist?",
      tex: "\\tilde{x}_p = \\tfrac{1}{2}\\left[x_{(k)} + x_{(k+1)}\\right]",
      b: "Das Mittel aus diesem und dem nächsten Platz. Beispiel: n · p = 3 → Platz 3 und Platz 4.",
      facts: [["quantileInfo", [PULS, 0.25], [3, 4], "positions"]] },
    { id: "k-r-type", topic: "Quantile", tag: "q",
      f: "Welche Angabe braucht `quantile()` in R, damit es wie die Folie rechnet?",
      b: "`type = 2`, also `quantile(x, probs = 0.25, type = 2)` (Folie 103). Ohne Angabe rechnet R mit `type = 7`: Für 3, 6, 8, 9, 11, 15 käme beim 0,25-Quantil 6,5 statt 6 heraus.",
      facts: [["quantileType7", [SLIDE95, 0.25], 6.5], ["quantile", [SLIDE95, 0.25], 6]] },
    { id: "k-quartile", topic: "Quantile", tag: "q",
      f: "Was sind die drei Quartile?",
      tex: "\\begin{gathered} Q_1 = \\tilde{x}_{0{,}25} \\qquad Q_2 = \\tilde{x} \\\\ Q_3 = \\tilde{x}_{0{,}75} \\end{gathered}",
      b: "Sie teilen die sortierten Werte in vier Viertel (Folie 104)." },
    { id: "k-iqr", topic: "Quantile", tag: "q",
      f: "Was ist der Quartilabstand?",
      tex: "Q_{\\text{dif}} = Q_3 - Q_1",
      b: "So breit ist der Bereich mit der mittleren Hälfte der Werte. Ruhepuls von Folie 106: 77 − 69 = 8.",
      facts: [["quartiles", [PULS], 8, "iqr"]] },
    { id: "k-five", topic: "Boxplot", tag: "q",
      f: "Welche fünf Zahlen zeigt ein Boxplot?",
      tex: "x_{(1)},\\ Q_1,\\ \\tilde{x},\\ Q_3,\\ x_{(n)}",
      b: "Box von $Q_1$ bis $Q_3$, Strich beim Median, Whisker nach außen (Folie 105)." },
    { id: "k-range", topic: "Boxplot", tag: "q",
      f: "Boxplot in R: Was ist der Unterschied zwischen `range = 0` und `range = 1.5`?",
      b: "`range = 0`: Whisker bis zum kleinsten und größten Wert. `range = 1.5` (Standard): Whisker nur bis zum äußersten Wert, der höchstens 1,5 Quartilabstände von der Box weg ist. Werte weiter draußen werden Punkte." },
    { id: "k-mean", topic: "Mittel", tag: "mean",
      f: "Formel für das arithmetische Mittel aus einer Urliste?",
      tex: "\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i",
      b: "Alle Werte addieren und durch n teilen. Sortieren musst du dafür nicht." },
    { id: "k-mean-tab", topic: "Mittel", tag: "mean",
      f: "Mittel aus einer Häufigkeitstabelle?",
      tex: "\\bar{x} = \\frac{1}{n}\\sum_{j} h_j \\cdot a_j = \\sum_{j} f_j \\cdot a_j",
      b: "Jeden Wert mal seine Anzahl. Noten von Folie 111: 77 ÷ 25 = 3,08.",
      facts: [["meanTable", [NOTEN_A, NOTEN_H], 77, "sum"], ["meanTable", [NOTEN_A, NOTEN_H], 3.08, "value", 2]] },
    { id: "k-mean-class", topic: "Mittel", tag: "mean",
      f: "Mittel aus Klassen: Welche Formel, und was ist $x'_j$?",
      tex: "\\begin{gathered} \\bar{x} \\approx \\sum_{j} f_j \\cdot x'_j \\\\ x'_j = \\frac{u_{j-1} + u_j}{2} \\end{gathered}",
      b: "$x'_j$ ist die Klassenmitte. Das Ergebnis ist nur ungefähr, deshalb ≈ (Folie 113)." },
    { id: "k-null", topic: "Mittel", tag: "mean",
      f: "Was sagt die Nulleigenschaft?",
      tex: "\\sum_{i=1}^{n} (x_i - \\bar{x}) = 0",
      b: "Die Abweichungen vom Mittel heben sich auf. Gut als Probe für dein Ergebnis (Folie 114)." },
    { id: "k-lin", topic: "Mittel", tag: "mean",
      f: "Lineare Transformation $y_i = p \\cdot x_i + q$: Was passiert mit dem Mittel?",
      tex: "\\bar{y} = p \\cdot \\bar{x} + q",
      b: "Einfach das alte Mittel umrechnen (Folie 134). °C in °F: 1,8 · 10 + 32 = 50. Zentrierung $y_i = x_i - \\bar{x}$ gibt $\\bar{y} = 0$.",
      facts: [["mean", [{ $: ["linear", [TEMP, 1.8, 32]] }], 50], ["mean", [TEMP], 10]] },
    { id: "k-robust", topic: "Median und Mittel", tag: null,
      f: "Wer ist robust gegen Ausreißer: Median oder Mittel?",
      b: "Der **Median**. Wird in 3, 6, 8, 9, 11, 15 aus der 15 eine 150, bleibt er bei 8,5. Das Mittel springt von 8,67 auf 31,17.",
      facts: [["median", [SLIDE95_OUT], 8.5], ["mean", [SLIDE95], 8.67, null, 2], ["mean", [SLIDE95_OUT], 31.17, null, 2]] },
    { id: "k-min", topic: "Median und Mittel", tag: null,
      f: "Welche Summe macht der Median am kleinsten, welche das Mittel?",
      tex: "\\begin{gathered} \\tilde{x}\\text{ macht } \\textstyle\\sum |x_i - a| \\text{ klein} \\\\ \\bar{x}\\text{ macht } \\textstyle\\sum (x_i - a)^2 \\text{ klein} \\end{gathered}",
      b: "Median: die Summe der Abstände (Folie 97). Mittel: die Summe der quadrierten Abstände (Folie 115)." },
    { id: "k-trim", topic: "Weitere Mittel", tag: "mean",
      f: "Wie rechnest du ein getrimmtes Mittel?",
      b: "Sortieren, $k = n \\cdot t$ abrunden. Dabei ist t der Anteil je Seite, z. B. 0,1 für 10 %. Dann an **jedem** Ende k Werte streichen, vom Rest das Mittel. Beispiel n = 60, t = 0,1: k = 6 (Folie 116). In R heißt `mean(x, trim = 0.1)`: 10 % unten **und** 10 % oben weg.",
      facts: [["trimInfo", [seq(60), 0.1], 6, "k"]] },
    { id: "k-geo", topic: "Weitere Mittel", tag: "mean",
      f: "Formel des geometrischen Mittels? Was muss gelten?",
      tex: "GM = \\sqrt[n]{x_1 \\cdot \\ldots \\cdot x_n}",
      b: "Alle $x_i > 0$ und mindestens Verhältnisskala (Folien 117 und 119). Beispiel 2 und 8: $\\sqrt{16} = 4$.",
      facts: [["geometricMean", [[2, 8]], 4]] },
    { id: "k-geo-use", topic: "Weitere Mittel", tag: "mean",
      f: "Wofür nimmst du das geometrische Mittel, und wie geht es in R?",
      b: "Für Faktoren: Wachstum, Inflationsrate, **konstante Lernrate**, Größenschätzung (Folie 119). R hat keine fertige Funktion: `exp(mean(log(x)))` (Folie 118).",
      facts: [["geometricMean", [[2.2, 2.5, 3.0, 2.8, 3.2]], 2.716, null, 3]] },
    { id: "k-harm", topic: "Weitere Mittel", tag: "mean",
      f: "Formel des harmonischen Mittels? Rechne ein Beispiel.",
      tex: "HM = \\frac{n}{\\sum_{i=1}^{n} \\frac{1}{x_i}}",
      b: "n geteilt durch die Summe der Kehrwerte, alle $x_i > 0$ (Folie 120). 60 km mit 30 km/h und 60 km mit 90 km/h: Schnitt 45 km/h, nicht 60.",
      facts: [["harmonicMean", [[30, 90]], 45]] },
    { id: "k-harm-use", topic: "Weitere Mittel", tag: "mean",
      f: "Wofür nimmst du das harmonische Mittel? Und wo in der Psychologie?",
      b: "Psychologie: in der Psychophysik, um die **Exponenten** von Stevens' Potenzfunktion zu mitteln (Folie 120). Sonst für Indexzahlen mit **festem Zähler**: km/h bei fester Strecke, Preis pro Liter bei festem Betrag, Einwohner pro km² bei fester Einwohnerzahl. Achtung: Die Größenschätzungen selbst mittelst du geometrisch (Folie 119)." },
    { id: "k-skala", topic: "Skalenniveau", tag: null,
      f: "Welches Lagemaß ab welchem Skalenniveau?",
      b: "Modus ab nominal. Median und Quantile ab ordinal. Arithmetisches Mittel ab Intervallskala. Geometrisches Mittel ab Verhältnisskala." },
    { id: "k-bed-groups", topic: "Bedeutsamkeit", tag: null,
      f: "Zwei Gruppen, gleiche Skala: Wann ist ein Vergleich ihrer Mittelwerte bedeutsam?",
      b: "Bei Intervall- und Verhältnisskala ja, bei Ordinalskala nicht (Folie 122). Dort kann eine erlaubte Umnummerierung der Stufen das Ergebnis umdrehen." },
    { id: "k-bed-obs", topic: "Bedeutsamkeit", tag: null,
      f: "Mehrere Beobachter, jeder mit eigener Skala: Welches Mittel darfst du vergleichen?",
      b: "Nur das **geometrische** Mittel, wenn alle Skalen Verhältnisskalen sind (Folie 125). Das arithmetische ist hier nicht bedeutsam, weil jeder Beobachter seine eigene Einheit haben darf (Folie 124)." },
    { id: "k-skew", topic: "Schiefe", tag: null,
      f: "Schiefe: Was sagt dir $\\bar{x} - \\tilde{x}$?",
      b: "$> 0$: rechtsschief = linkssteil (positive Schiefe). $< 0$: linksschief = rechtssteil (negative Schiefe). $= 0$: symmetrisch (Folie 140)." },
    { id: "k-skew-names", topic: "Schiefe", tag: null,
      f: "Rechtsschief: Wo ist der lange Ausläufer, und wo ist es steil?",
      b: "Der lange Ausläufer geht nach **rechts**. Steil ist es links beim Gipfel, darum auch **linkssteil**. Typisch: Reaktionszeiten." },
    { id: "k-order", topic: "Schiefe", tag: null,
      f: "Wie liegen Modus, Median und Mittel bei positiver Schiefe?",
      tex: "x_{\\text{mod}} < \\tilde{x} < \\bar{x}",
      b: "Das Mittel läuft dem langen Ausläufer hinterher, ganz nach rechts. Bei negativer Schiefe ist es umgekehrt (Folie 141)." },
    { id: "k-gp", topic: "Schiefe", tag: null,
      f: "Formel des Quartilskoeffizienten der Schiefe?",
      tex: "g_{0{,}25} = \\frac{(Q_3 - \\tilde{x}) - (\\tilde{x} - Q_1)}{Q_3 - Q_1}",
      b: "Allgemein mit $\\tilde{x}_p$ und $\\tilde{x}_{1-p}$ (Folie 142). Deutung wie bei $\\bar{x} - \\tilde{x}$. Beispiel 16, 4, 13, 9, 8: (4 − 1) ÷ 5 = 0,6.",
      facts: [["skewInfo", [TEMP, 0.25], 0.6, "gp"]] },
    { id: "k-klammer", topic: "Schreibweise", tag: null,
      f: "Was ist der Unterschied zwischen $x_3$ und $x_{(3)}$?",
      b: "$x_3$ ist der 3. Wert so, wie er gemessen wurde. $x_{(3)}$ ist der 3. Wert nach dem Sortieren, also der drittkleinste." }
  ];

  /* =====================================================================
     Abschlussquiz (Kapitel 14): eine Frage aus jedem Kapitel 2–11
     ===================================================================== */

  var TOPICS = [
    { id: "modus", name: "Modus", ch: 2, href: "#modus", tag: "mod" },
    { id: "median", name: "Median", ch: 3, href: "#median", tag: "med" },
    { id: "quantil", name: "Quantile", ch: 4, href: "#quantile", tag: "q" },
    { id: "boxplot", name: "Boxplot", ch: 5, href: "#boxplot", tag: "q" },
    { id: "mittel", name: "Arithmetisches Mittel", ch: 6, href: "#mittel", tag: "mean" },
    { id: "weitere", name: "Weitere Mittelwerte", ch: 7, href: "#weitere", tag: "mean" },
    { id: "minimum", name: "Minimumeigenschaften", ch: 8, href: "#minimum", tag: null },
    { id: "schiefe", name: "Schiefe", ch: 9, href: "#schiefe", tag: null },
    { id: "skala", name: "Skalenniveau", ch: 10, href: "#wahl", tag: null },
    { id: "uebung", name: "Übungsblatt 3", ch: 11, href: "#uebung3", tag: null }
  ];

  var QUIZ = [
    /* ---------- Kapitel 2: Modus ---------- */
    { id: "q-mo1", topic: "modus", type: "num", data: [5, 7, 7, 2, 9, 7, 5],
      q: "Werte: {x}. Was ist der Modus?",
      calc: ["mode", [[5, 7, 7, 2, 9, 7, 5]]], answer: 7,
      traps: [{ v: 3, why: "3 ist die Anzahl: So oft kommt die 7 vor. Gefragt ist der Wert." }],
      ex: "Die 7 kommt dreimal vor, die 5 zweimal, der Rest einmal. Also ist der Modus 7." },
    { id: "q-mo2", topic: "modus", type: "mc",
      q: "25 Noten (Folie 46): Die 3 kommt 8-mal vor, öfter als jede andere Note. Was ist der Modus?",
      calc: ["mode", [NOTEN]], facts: [["mean", [NOTEN], 3.08, null, 2], ["modeInfo", [NOTEN], 8, "maxCount"]],
      opts: [
        { v: 3, ok: true },
        { v: 8, why: "8 ist die Anzahl. Der Modus ist der Wert, der so oft vorkommt." },
        { v: 3.08, why: "3,08 ist das Mittel der Noten, nicht der Modus." }
      ],
      ex: "Der Modus ist der häufigste Wert, also die Note 3. Die 8 sagt nur, wie oft sie vorkommt." },
    { id: "q-mo3", topic: "modus", type: "mc", data: [4, 4, 6, 6, 9],
      q: "Werte: {x}. Was ist der Modus?",
      calc: ["mode", [[4, 4, 6, 6, 9]]],
      opts: [
        { t: "kein eindeutiger Modus", v: null, ok: true },
        { v: 4, why: "Die 6 kommt genauso oft vor wie die 4." },
        { v: 5, why: "Beim Modus wird nichts gemittelt." },
        { v: 6, why: "Die 4 kommt genauso oft vor wie die 6." }
      ],
      ex: "4 und 6 kommen beide zweimal vor. Bei Gleichstand gibt es keinen eindeutigen Modus (Folie 92)." },
    { id: "q-mo4", topic: "modus", type: "mc",
      q: "Bei welchen Daten ist der Modus das einzige sinnvolle Lagemaß?",
      opts: [
        { t: "bei nominalen Daten, z. B. Partei oder Lieblingsfarbe", ok: true },
        { t: "bei ordinalen Daten, z. B. Schulnoten", why: "Ordinale Daten kann man sortieren. Dann geht auch der Median." },
        { t: "bei metrischen Daten, z. B. Reaktionszeiten", why: "Bei metrischen Daten gehen Modus, Median und Mittel." }
      ],
      ex: "Nominale Daten kann man weder sortieren noch addieren. Es bleibt nur der häufigste Wert (Folie 92)." },

    /* ---------- Kapitel 3: Median ---------- */
    { id: "q-me1", topic: "median", type: "num", data: [7, 2, 9, 4, 12],
      q: "Werte: {x}. Wie groß ist der Median?",
      calc: ["median", [[7, 2, 9, 4, 12]]], answer: 7,
      traps: [{ v: 9, why: "9 steht in der Mitte der unsortierten Liste. Du musst zuerst sortieren." }],
      ex: "Sortiert: 2, 4, 7, 9, 12. n = 5 ist ungerade, also Platz 3: 7." },
    { id: "q-me2", topic: "median", type: "num", data: [14, 9, 17, 12, 20, 9, 15, 16],
      q: "Werte: {x}. Wie groß ist der Median?",
      calc: ["median", [[14, 9, 17, 12, 20, 9, 15, 16]]], answer: 14.5,
      facts: [["mean", [[14, 9, 17, 12, 20, 9, 15, 16]], 14]],
      traps: [
        { v: 16, why: "Das ist die Mitte der unsortierten Liste, ½(12 + 20). Erst sortieren!" },
        { v: 14, why: "14 ist nur der erste der beiden mittleren Werte (und zufällig das Mittel). Du brauchst ½(14 + 15)." },
        { v: 15, why: "15 ist nur der zweite der beiden mittleren Werte. Du brauchst ½(14 + 15)." }
      ],
      ex: "Sortiert: 9, 9, 12, 14, 15, 16, 17, 20. n = 8 ist gerade: ½(14 + 15) = 14,5." },
    { id: "q-me3", topic: "median", type: "mc",
      q: "Du hast n = 25 sortierte Noten. Auf welchem Platz steht der Median?",
      calc: ["medianInfo", [seq(25)], "positions"],
      opts: [
        { t: "Platz 13", v: [13], ok: true },
        { t: "Platz 12,5", v: [12.5], why: "Plätze sind ganze Zahlen. Rechne (n + 1) ÷ 2, nicht n ÷ 2." },
        { t: "das Mittel aus Platz 12 und 13", v: [12, 13], why: "Zwei Plätze mittelst du nur bei gerader Anzahl." }
      ],
      ex: "n = 25 ist ungerade. Der Median steht auf Platz (25 + 1) ÷ 2 = 13." },
    { id: "q-me4", topic: "median", type: "mc",
      q: "Welche Aussage über den Median stimmt?",
      facts: [["median", [SLIDE95], 8.5]],
      opts: [
        { t: "Er muss kein gemessener Wert sein.", ok: true },
        { t: "Er ist immer einer der gemessenen Werte.", why: "Bei 3, 6, 8, 9, 11, 15 ist der Median 8,5. Diesen Wert hat niemand gemessen." },
        { t: "Ein einziger Ausreißer verschiebt ihn stark.", why: "Das passiert dem Mittel. Der Median ist robust." }
      ],
      ex: "Bei gerader Anzahl ist der Median das Mittel der beiden mittleren Werte. Bei 3, 6, 8, 9, 11, 15 ist das 8,5." },

    /* ---------- Kapitel 4: Quantile ---------- */
    { id: "q-qu1", topic: "quantil", type: "num", data: SLIDE95,
      q: "Werte: {x}. Wie groß ist das 0,25-Quantil?",
      calc: ["quantile", [SLIDE95, 0.25]], answer: 6,
      facts: [["quantileInfo", [SLIDE95, 0.25], 1.5, "np"], ["quantileType7", [SLIDE95, 0.25], 6.5]],
      traps: [
        { v: 3, why: "Du hast abgerundet. Bei 1,5 rundest du auf, also Platz 2." },
        { v: 4.5, why: "Gemittelt wird nur, wenn n · p eine ganze Zahl ist. 1,5 ist keine." },
        { v: 6.5, why: "6,5 rechnet R ohne `type = 2`. Die Folie nimmt Platz 2." }
      ],
      ex: "n · p = 6 · 0,25 = 1,5. Aufrunden auf 2, also Platz 2: 6 (Folie 102)." },
    { id: "q-qu2", topic: "quantil", type: "num", data: SLIDE95,
      q: "Werte: {x}. Wie groß ist das $\\tfrac{2}{3}$-Quantil?",
      calc: ["quantile", [SLIDE95, 2 / 3]], answer: 10,
      facts: [["quantileInfo", [SLIDE95, 2 / 3], [4, 5], "positions"]],
      traps: [
        { v: 9, why: "n · p = 4 ist eine ganze Zahl. Dann mittelst du Platz 4 und Platz 5." },
        { v: 11, why: "n · p = 4 ist eine ganze Zahl. Dann mittelst du Platz 4 und Platz 5." }
      ],
      ex: "n · p = 6 · ⅔ = 4 ist eine ganze Zahl. Also das Mittel aus Platz 4 und 5: ½(9 + 11) = 10." },
    { id: "q-qu3", topic: "quantil", type: "num", data: U2,
      q: "Werte: {x}. Wie groß ist das 0,8-Quantil?",
      calc: ["quantile", [U2, 0.8]], answer: 17,
      facts: [["quantileInfo", [U2, 0.8], 6.4, "np"]],
      traps: [{ v: 16, why: "Du hast abgerundet. 6,4 wird aufgerundet, also Platz 7." }],
      ex: "n · p = 8 · 0,8 = 6,4. Aufrunden auf 7, also Platz 7: 17." },
    { id: "q-qu4", topic: "quantil", type: "num", data: U2,
      q: "Werte: {x}. Wie groß ist das erste Quartil $Q_1$?",
      calc: ["quantile", [U2, 0.25]], answer: 10.5,
      facts: [["quantileInfo", [U2, 0.25], [2, 3], "positions"]],
      traps: [
        { v: 9, why: "n · p = 2 ist eine ganze Zahl. Dann mittelst du Platz 2 und Platz 3." },
        { v: 12, why: "n · p = 2 ist eine ganze Zahl. Dann mittelst du Platz 2 und Platz 3." }
      ],
      ex: "n · p = 8 · 0,25 = 2 ist eine ganze Zahl. Also ½(9 + 12) = 10,5." },
    { id: "q-qu5", topic: "quantil", type: "mc",
      q: "Du hast n = 20 Werte und suchst das 0,9-Quantil. Was nimmst du?",
      calc: ["quantileInfo", [seq(20), 0.9], "positions"],
      opts: [
        { t: "das Mittel aus Platz 18 und 19", v: [18, 19], ok: true },
        { t: "Platz 18", v: [18], why: "n · p = 18 ist ganz. Dann mittelst du mit dem nächsten Platz." },
        { t: "Platz 19", v: [19], why: "Aufrunden gilt nur für Kommazahlen." }
      ],
      ex: "n · p = 20 · 0,9 = 18 ist eine ganze Zahl. Also das Mittel aus Platz 18 und Platz 19." },
    { id: "q-qu6", topic: "quantil", type: "mc",
      q: "Bei einem Quantil kommt $n \\cdot p = 4{,}1$ heraus. Welchen Platz nimmst du?",
      calc: ["quantileInfo", [seq(10), 0.41], "positions"],
      facts: [["quantileInfo", [seq(10), 0.41], 4.1, "np"]],
      opts: [
        { t: "Platz 5", v: [5], ok: true },
        { t: "Platz 4", v: [4], why: "Bei dieser Regel wird nie abgerundet, auch nicht bei 4,1." },
        { t: "das Mittel aus Platz 4 und 5", v: [4, 5], why: "Gemittelt wird nur bei ganzen Zahlen." }
      ],
      ex: "4,1 ist keine ganze Zahl. Du rundest immer auf, also auf Platz 5." },
    { id: "q-qu7", topic: "quantil", type: "mc",
      q: "Was ist der Quartilabstand?",
      opts: [
        { t: "$Q_3 - Q_1$", ok: true },
        { t: "größter minus kleinster Wert", why: "Das ist die Spannweite, ein anderes Streuungsmaß." },
        { t: "$\\tfrac{1}{2}(Q_1 + Q_3)$", why: "Das wäre die Mitte der Box, kein Abstand." }
      ],
      ex: "$Q_{\\text{dif}} = Q_3 - Q_1$. So breit ist der Bereich mit der mittleren Hälfte der Werte (Folie 104)." },
    { id: "q-qu8", topic: "quantil", type: "num", data: PULS,
      q: "Ruhepuls, sortiert: {x}. Wie groß ist der Quartilabstand?",
      calc: ["quartiles", [PULS], "iqr"], answer: 8,
      facts: [["quantile", [PULS, 0.25], 69], ["quantile", [PULS, 0.75], 77]],
      traps: [{ v: 18, why: "18 ist die Spannweite 80 − 62. Gesucht ist $Q_3 - Q_1$." }],
      ex: "$Q_1 = \\tfrac12(68 + 70) = 69$ und $Q_3 = \\tfrac12(76 + 78) = 77$. Quartilabstand: 77 − 69 = 8." },

    /* ---------- Kapitel 5: Boxplot ---------- */
    { id: "q-bo1", topic: "boxplot", type: "mc",
      q: "Wofür steht der Strich in der Box eines Boxplots?",
      opts: [
        { t: "für den Median", ok: true },
        { t: "für das Mittel", why: "Das Mittel zeigt der Boxplot gar nicht." },
        { t: "für den häufigsten Wert", why: "Den Modus zeigt der Boxplot nicht." }
      ],
      ex: "Der Boxplot zeigt fünf Zahlen: $x_{(1)}, Q_1, \\tilde{x}, Q_3, x_{(n)}$. Der Strich in der Box ist der Median." },
    { id: "q-bo2", topic: "boxplot", type: "num",
      q: "Ruhepuls: $Q_1 = 69$ und $Q_3 = 77$. Bei `range = 1.5`: Wo liegt die untere Grenze für den linken Whisker?",
      calc: ["boxplot", [PULS, 1.5], "fences.0"], answer: 57,
      facts: [["quartiles", [PULS], 8, "iqr"]],
      traps: [{ v: 62, why: "62 ist der kleinste Wert. Gefragt ist die Grenze $Q_1 - 1{,}5 \\cdot$ Quartilabstand." }],
      ex: "Quartilabstand 77 − 69 = 8. Untere Grenze: 69 − 1,5 · 8 = 69 − 12 = 57." },
    { id: "q-bo3", topic: "boxplot", type: "mc", data: PULS109,
      q: "Folie 109: {x}. Mit `range = 1` ist $Q_1 = 68$ und $Q_3 = 78$. Welcher Wert wird als einzelner Punkt gezeichnet?",
      calc: ["boxplot", [PULS109, 1], "out"],
      facts: [["quantile", [PULS109, 0.25], 68], ["quantile", [PULS109, 0.75], 78], ["boxplot", [PULS109, 1], [58, 88], "fences"]],
      opts: [
        { t: "nur die 89", v: [89], ok: true },
        { t: "nur die 58", v: [58], why: "Die untere Grenze ist 68 − 10 = 58. Die 58 liegt genau darauf, also noch drin." },
        { t: "die 58 und die 89", v: [58, 89], why: "Die 58 liegt genau auf der unteren Grenze 58 und gehört noch dazu." }
      ],
      ex: "Quartilabstand 78 − 68 = 10. Grenzen: 68 − 10 = 58 und 78 + 10 = 88. Nur die 89 liegt draußen." },
    { id: "q-bo4", topic: "boxplot", type: "mc",
      q: "Was bewirkt `range = 0` in `boxplot()`?",
      opts: [
        { t: "Die Whisker reichen bis zum kleinsten und größten Wert.", ok: true },
        { t: "Es werden gar keine Whisker gezeichnet.", why: "Doch, und zwar bis ganz nach außen." },
        { t: "Alle Werte erscheinen als einzelne Punkte.", why: "Mit range = 0 gibt es gar keine Ausreißer-Punkte." }
      ],
      ex: "Mit `range = 0` gehen die Whisker bis $x_{(1)}$ und $x_{(n)}$ (Folie 107). Ohne Angabe nimmt R `range = 1.5`." },
    { id: "q-bo5", topic: "boxplot", type: "num", data: U1,
      q: "Werte: {x}. Mit `range = 1.5` ist $Q_1 = 5$ und $Q_3 = 15$. Bis zu welchem Wert reicht der rechte Whisker?",
      calc: ["boxplot", [U1, 1.5], "hi"], answer: 20,
      facts: [["boxplot", [U1, 1.5], 30, "fences.1"], ["quantile", [U1, 0.25], 5], ["quantile", [U1, 0.75], 15]],
      traps: [
        { v: 30, why: "30 ist nur die Grenze. Der Whisker endet beim größten Wert, der noch drinliegt." },
        { v: 38, why: "Die 38 liegt über der Grenze 30. Sie wird ein einzelner Punkt." }
      ],
      ex: "Quartilabstand 10, Grenze $15 + 1{,}5 \\cdot 10 = 30$. Der größte Wert bis 30 ist die 20. Dort endet der Whisker." },

    /* ---------- Kapitel 6: Arithmetisches Mittel (mit linearer Transformation) ---------- */
    { id: "q-mi1", topic: "mittel", type: "num", data: [12, 5, 20, 8, 4, 38, 10, 5, 15],
      q: "Werte: {x}. Wie groß ist das arithmetische Mittel?",
      calc: ["mean", [[12, 5, 20, 8, 4, 38, 10, 5, 15]]], answer: 13,
      facts: [["meanInfo", [[12, 5, 20, 8, 4, 38, 10, 5, 15]], 117, "sum"], ["median", [[12, 5, 20, 8, 4, 38, 10, 5, 15]], 10]],
      traps: [{ v: 10, why: "10 ist der Median. Fürs Mittel addierst du alle Werte und teilst durch 9." }],
      ex: "Die Summe ist 117. Geteilt durch n = 9 ergibt das 13." },
    { id: "q-mi2", topic: "mittel", type: "num",
      q: "Noten von Folie 111. Wie groß ist der Notenschnitt $\\bar{x}$? Runde auf zwei Nachkommastellen.",
      tab: [{ th: "Note $a_j$", vals: NOTEN_A }, { th: "Anzahl $h_j$", vals: NOTEN_H }],
      calc: ["meanTable", [NOTEN_A, NOTEN_H], "value"], answer: 3.08,
      facts: [["meanTable", [NOTEN_A, NOTEN_H], 77, "sum"], ["meanTable", [NOTEN_A, NOTEN_H], 25, "n"]],
      traps: [{ v: 3.5, why: "3,5 ist das Mittel der Noten 1 bis 6. Jede Note zählt aber so oft, wie sie vorkommt." }],
      ex: "(3 · 1 + 5 · 2 + 8 · 3 + 6 · 4 + 2 · 5 + 1 · 6) ÷ 25 = 77 ÷ 25 = 3,08." },
    { id: "q-mi3", topic: "mittel", type: "num",
      q: "Klassierte Daten. Wie groß ist das Mittel ungefähr?",
      tab: [{ th: "Klasse", vals: ["0 bis 10", "10 bis 20", "20 bis 40"] }, { th: "Anzahl $h_j$", vals: [2, 5, 3] }],
      calc: ["groupedMean", [[0, 10, 20, 40], [2, 5, 3]], "value"], answer: 17.5,
      facts: [["groupedMean", [[0, 10, 20, 40], [2, 5, 3]], [5, 15, 30], "mids"], ["groupedMean", [[0, 10, 20, 40], [2, 5, 3]], 175, "sum"]],
      ex: "Klassenmitten: 5, 15 und 30. Dann (2 · 5 + 5 · 15 + 3 · 30) ÷ 10 = 175 ÷ 10 = 17,5." },
    { id: "q-mi4", topic: "mittel", type: "mc",
      q: "Was gilt immer für $\\sum (x_i - \\bar{x})$?",
      calc: ["meanInfo", [[3, 5, 10]], "deviationSum"],
      opts: [
        { t: "Die Summe ist 0.", v: 0, ok: true },
        { t: "Die Summe ist so klein wie möglich.", why: "Am kleinsten wird beim Mittel die Summe der quadrierten Abweichungen." },
        { t: "Die Summe ist gleich n.", v: 3, why: "Die Abweichungen nach oben und unten heben sich genau auf." }
      ],
      ex: "Das ist die Nulleigenschaft (Folie 114): Die Abweichungen vom Mittel heben sich auf. Gut als Probe!" },
    { id: "q-mi5", topic: "mittel", type: "mc", data: GEHALT,
      q: "Monatsgehälter in Euro: {x}. Was beschreibt das typische Gehalt besser?",
      calc: ["median", [GEHALT]], facts: [["mean", [GEHALT], 5916.67, null, 2], ["mode", [GEHALT], null]],
      opts: [
        { t: "der Median, 1150 Euro", v: 1150, ok: true },
        { t: "das Mittel, etwa 5916,67 Euro", v: 35500 / 6, why: "Das eine hohe Gehalt zieht das Mittel weit nach oben. Fünf von sechs Leuten verdienen viel weniger." },
        { t: "der Modus", why: "Jedes Gehalt kommt nur einmal vor. Es gibt keinen Modus." }
      ],
      ex: "Ein Ausreißer (30000) zieht das Mittel nach oben. Der Median bleibt bei den typischen Gehältern." },
    { id: "q-lt1", topic: "mittel", type: "num", unit: "ms",
      q: "Reaktionszeiten in Sekunden haben das Mittel $\\bar{x} = 0{,}25$ s. Du rechnest in Millisekunden um: $y_i = 1000 \\cdot x_i$. Wie groß ist $\\bar{y}$?",
      calc: ["mean", [{ $: ["linear", [[0.2, 0.25, 0.3], 1000, 0]] }]], answer: 250,
      facts: [["mean", [[0.2, 0.25, 0.3]], 0.25]],
      ex: "Lineare Transformation mit $p = 1000$ und $q = 0$: $\\bar{y} = 1000 \\cdot 0{,}25 = 250$ ms (Folie 134)." },
    { id: "q-lt2", topic: "mittel", type: "mc",
      q: "Alle Werte werden verdoppelt und dann um 3 erhöht: $y_i = 2 \\cdot x_i + 3$. Das alte Mittel ist $\\bar{x} = 7$. Wie groß ist das neue Mittel?",
      calc: ["mean", [{ $: ["linear", [[5, 7, 9], 2, 3]] }]], facts: [["mean", [[5, 7, 9]], 7]],
      opts: [
        { v: 17, ok: true },
        { v: 14, why: "Du hast nur verdoppelt. Das + 3 fehlt noch." },
        { v: 10, why: "Du hast nur 3 addiert. Erst mal 2, dann + 3." },
        { v: 20, why: "Erst mal 2, dann plus 3. Also 2 · 7 + 3, nicht 2 · (7 + 3)." }
      ],
      ex: "$\\bar{y} = p \\cdot \\bar{x} + q = 2 \\cdot 7 + 3 = 17$ (Folie 134)." },
    { id: "q-lt3", topic: "mittel", type: "mc",
      q: "Du ziehst von jedem Wert das Mittel ab: $y_i = x_i - \\bar{x}$. Wie groß ist danach das Mittel $\\bar{y}$?",
      calc: ["mean", [{ $: ["linear", [[3, 5, 10], 1, -6]] }]], facts: [["mean", [[3, 5, 10]], 6]],
      opts: [
        { t: "immer 0", v: 0, ok: true },
        { t: "wieder $\\bar{x}$", why: "Das alte Mittel wird ja von jedem Wert abgezogen: $\\bar{y} = \\bar{x} - \\bar{x}$." },
        { t: "Das hängt von den Daten ab.", why: "Nein, es kommt immer 0 heraus. Das ist die Nulleigenschaft." }
      ],
      ex: "Das heißt Zentrierung (Folie 136). Mit $p = 1$ und $q = -\\bar{x}$ gilt $\\bar{y} = \\bar{x} - \\bar{x} = 0$." },

    /* ---------- Kapitel 7: Weitere Mittelwerte ---------- */
    { id: "q-we1", topic: "weitere", type: "mc",
      q: "Ein Kurs steigt erst um 100 % (mal 2) und fällt dann um 50 % (mal 0,5). Welches Mittel gibt den richtigen durchschnittlichen Faktor?",
      calc: ["geometricMean", [[2, 0.5]]], facts: [["mean", [[2, 0.5]], 1.25], ["harmonicMean", [[2, 0.5]], 0.8]],
      opts: [
        { t: "das geometrische Mittel: 1", v: 1, ok: true },
        { t: "das arithmetische Mittel: 1,25", v: 1.25, why: "1,25 hieße 25 % Wachstum pro Schritt. Am Ende steht der Kurs aber wieder am Anfang." },
        { t: "das harmonische Mittel: 0,8", v: 0.8, why: "Das harmonische Mittel ist für Raten wie km/h bei fester Strecke." }
      ],
      ex: "$\\sqrt{2 \\cdot 0{,}5} = \\sqrt{1} = 1$: im Schnitt kein Wachstum. Das stimmt, denn der Kurs endet dort, wo er angefangen hat." },
    { id: "q-we2", topic: "weitere", type: "num", data: [1, 3, 9],
      q: "Wie groß ist das geometrische Mittel von {x}?",
      calc: ["geometricMean", [[1, 3, 9]]], answer: 3,
      facts: [["mean", [[1, 3, 9]], 4.33, null, 2]],
      traps: [
        { v: 13 / 3, why: "Das ist das arithmetische Mittel. Beim geometrischen multiplizierst du." },
        { v: 27, why: "27 ist erst das Produkt. Jetzt noch die 3. Wurzel ziehen, denn n = 3." }
      ],
      ex: "$\\sqrt[3]{1 \\cdot 3 \\cdot 9} = \\sqrt[3]{27} = 3$, denn $3 \\cdot 3 \\cdot 3 = 27$." },
    { id: "q-we3", topic: "weitere", type: "num", unit: "km/h",
      q: "Eine Läuferin läuft 10 km mit 12 km/h und danach noch einmal 10 km mit 8 km/h. Wie groß ist ihre Durchschnittsgeschwindigkeit?",
      calc: ["harmonicMean", [[12, 8]]], answer: 9.6,
      traps: [{ v: 10, why: "10 ist das arithmetische Mittel. Die langsame Hälfte dauert aber länger und zählt mehr." }],
      ex: "Gleiche Strecken, also harmonisches Mittel: $2 \\div \\left(\\tfrac{1}{12} + \\tfrac{1}{8}\\right) = 9{,}6$. Probe: 50 min plus 75 min für 20 km, das sind 9,6 km/h." },
    { id: "q-we4", topic: "weitere", type: "num", data: TRIM10,
      q: "Werte: {x}. Wie groß ist das getrimmte Mittel mit `trim = 0.1` (wie in R)?",
      calc: ["trimmedMean", [TRIM10, 0.1]], answer: 7.5,
      facts: [["trimInfo", [TRIM10, 0.1], 1, "k"], ["trimInfo", [TRIM10, 0.1], 60, "sum"], ["mean", [TRIM10], 10.2]],
      traps: [
        { v: 10.2, why: "10,2 ist das normale Mittel. Erst streichst du die extremen Werte." },
        { v: 62 / 9, why: "Du hast nur oben gestrichen. Gestrichen wird an jedem Ende: die 2 und die 40." },
        { v: 100 / 9, why: "Du hast nur unten gestrichen. Gestrichen wird an jedem Ende: die 2 und die 40." }
      ],
      ex: "n = 10, also $k = 10 \\cdot 0{,}1 = 1$ Wert an jedem Ende. Die 2 und die 40 fallen weg. Es bleiben 8 Werte mit der Summe 60, also 60 ÷ 8 = 7,5." },
    { id: "q-we5", topic: "weitere", type: "num",
      q: "Du hast n = 20 Werte und rechnest `mean(x, trim = 0.2)`. Wie viele Werte fallen an **jedem** Ende weg?",
      calc: ["trimInfo", [seq(20), 0.2], "k"], answer: 4,
      facts: [["trimInfo", [seq(20), 0.2], 12, "m"]],
      traps: [
        { v: 8, why: "8 sind es an beiden Enden zusammen. Gefragt ist pro Ende." },
        { v: 2, why: "Das wäre `trim = 0.1`." }
      ],
      ex: "$k = 20 \\cdot 0{,}2 = 4$ Werte unten und 4 oben, zusammen 8. Es bleiben 12 Werte übrig." },
    { id: "q-we6", topic: "weitere", type: "mc",
      q: "Bei welchen Daten darfst du das geometrische Mittel **nicht** nehmen?",
      calc: ["allPositive", [[-3, 5, 12]]],
      opts: [
        { t: "Temperaturen in °C, z. B. −3, 5 und 12", v: false, ok: true },
        { t: "Reaktionszeiten in ms, z. B. 230, 250 und 310", v: true, why: "Zeiten sind positiv und verhältnisskaliert. Das geometrische Mittel geht." },
        { t: "Wachstumsfaktoren, z. B. 1,1 und 0,9", v: true, why: "Faktoren sind genau der Fall für das geometrische Mittel." }
      ],
      ex: "Das geometrische Mittel braucht $x_i > 0$ und eine Verhältnisskala (Folien 117 und 119). Grad Celsius hat keinen echten Nullpunkt, und −3 ist sogar negativ." },
    { id: "q-we7", topic: "weitere", type: "mc",
      q: "Wie berechnest du in R das geometrische Mittel eines Vektors x?",
      facts: [["geometricMean", [[2.2, 2.5, 3.0, 2.8, 3.2]], 2.716, null, 3]],
      opts: [
        { t: "`exp(mean(log(x)))`", ok: true },
        { t: "`mean(log(x))`", why: "Das ist erst der Logarithmus des geometrischen Mittels. Es fehlt noch `exp()`." },
        { t: "`prod(x) / length(x)`", why: "Das teilt das Produkt durch n. Du brauchst aber die n-te Wurzel." }
      ],
      ex: "R hat keine fertige Funktion. Der Logarithmus des geometrischen Mittels ist das Mittel der Logarithmen, also `exp(mean(log(x)))`. Folie 118: 2,2; 2,5; 3,0; 2,8; 3,2 ergibt 2,716." },
    { id: "q-we8", topic: "weitere", type: "mc",
      q: "Wofür ist das harmonische Mittel laut Folie 120 gedacht?",
      opts: [
        { t: "für Raten wie km/h, wenn die Strecke fest ist", ok: true },
        { t: "für Faktoren wie eine konstante Lernrate", why: "Das ist das geometrische Mittel (Folie 119)." },
        { t: "für Daten mit Ausreißern", why: "Gegen Ausreißer helfen der Median oder das getrimmte Mittel." }
      ],
      ex: "Harmonisch passt zu Indexzahlen wie km/h, Preis pro Liter oder Einwohner pro km², wenn die Zahl oben im Bruch fest ist (Folie 120)." },
    { id: "q-we9", topic: "weitere", type: "mc",
      q: "Wo nimmt man in der Psychologie das **harmonische** Mittel (Folie 120)?",
      opts: [
        { t: "um die Exponenten von Stevens' Potenzfunktion zu mitteln", ok: true },
        { t: "um die Größenschätzungen mehrerer Personen zu mitteln", why: "Größenschätzungen mittelst du mit dem geometrischen Mittel (Folie 119). Das harmonische mittelt die Exponenten." },
        { t: "um Schulnoten zu mitteln", why: "Noten sind ordinal. Da nimmst du den Median oder den Modus." }
      ],
      ex: "Folie 120: In der Psychophysik mittelt man mit dem harmonischen Mittel die Exponenten von Stevens' Potenzfunktion. Dazu kommen Indexzahlen mit festem Zähler wie km/h bei fester Strecke." },

    /* ---------- Kapitel 8: Minimumeigenschaften ---------- */
    { id: "q-mn1", topic: "minimum", type: "mc",
      q: "Welche Summe macht das arithmetische Mittel am kleinsten?",
      opts: [
        { t: "$\\sum (x_i - a)^2$", ok: true },
        { t: "$\\sum |x_i - a|$", why: "Diese Summe macht der Median am kleinsten (Folie 97)." },
        { t: "$\\sum (x_i - a)$", why: "Diese Summe hat kein Minimum. Beim Mittel ist sie genau 0." }
      ],
      ex: "Das Mittel macht die Summe der quadrierten Abstände am kleinsten (Folie 115), der Median die Summe der Abstände." },
    { id: "q-mn2", topic: "minimum", type: "mc",
      q: "Welcher Wert macht die Summe der Abstände $\\sum |x_i - a|$ am kleinsten?",
      opts: [
        { t: "der Median", ok: true },
        { t: "das arithmetische Mittel", why: "Das Mittel macht die Summe der **quadrierten** Abstände am kleinsten." },
        { t: "der Modus", why: "Der Modus hat keine solche Minimumeigenschaft." }
      ],
      ex: "Folie 97: $\\sum |x_i - a|$ ist minimal für $a = \\tilde{x}$. Links und rechts vom Median liegen gleich viele Werte." },
    { id: "q-mn3", topic: "minimum", type: "num", data: SLIDE95_ODD,
      q: "Werte: {x}. Für welches a wird $\\sum |x_i - a|$ am kleinsten?",
      calc: ["median", [SLIDE95_ODD]], answer: 8,
      facts: [["sumAbs", [SLIDE95_ODD, 8], 11], ["mean", [SLIDE95_ODD], 7.4]],
      traps: [{ v: 7.4, why: "7,4 ist das Mittel. Es macht die Summe der **quadrierten** Abstände am kleinsten." }],
      ex: "Beim Median 8 ist die Summe 5 + 2 + 0 + 1 + 3 = 11. Jedes andere a gibt mehr (Folie 97)." },
    { id: "q-mn4", topic: "minimum", type: "num", data: SLIDE95_ODD,
      q: "Werte: {x}. Für welches a wird $\\sum (x_i - a)^2$ am kleinsten?",
      calc: ["mean", [SLIDE95_ODD]], answer: 7.4,
      facts: [["sumSq", [SLIDE95_ODD, 7.4], 37.2], ["meanInfo", [SLIDE95_ODD], 37, "sum"]],
      traps: [{ v: 8, why: "8 ist der Median. Er macht die Summe der Abstände klein, nicht die der Quadrate." }],
      ex: "Das Mittel: 37 ÷ 5 = 7,4 (Folie 115). Dort ist die Summe der Quadrate 37,2, kleiner geht es nicht." },
    { id: "q-mn5", topic: "minimum", type: "mc", data: SLIDE95,
      q: "Werte: {x} (n = 6). Für welche a ist $\\sum |x_i - a|$ am kleinsten?",
      calc: ["absMinimizer", [SLIDE95]], facts: [["median", [SLIDE95], 8.5], ["mean", [SLIDE95], 8.67, null, 2]],
      opts: [
        { t: "für jedes a von 8 bis 9", v: { from: 8, to: 9 }, ok: true },
        { t: "nur für a = 8,5", v: 8.5, why: "8,5 ist der Median und liegt im Minimum. Bei geradem n ist aber das ganze Stück zwischen den beiden mittleren Werten minimal." },
        { t: "nur für a = 8,67", v: 52 / 6, why: "8,67 ist das Mittel. Es gehört zur Summe der Quadrate." }
      ],
      ex: "Bei geradem n ist die Summe auf dem ganzen Stück zwischen den beiden mittleren Werten gleich klein. Der Median 8,5 liegt genau in der Mitte davon." },

    /* ---------- Kapitel 9: Schiefe ---------- */
    { id: "q-sc1", topic: "schiefe", type: "mc",
      q: "Klausurpunkte: $\\bar{x} = 42$ und $\\tilde{x} = 47$. Wie ist die Verteilung tendenziell geformt?",
      calc: ["skewDirection", [42 - 47]],
      opts: [
        { t: "linksschief, also rechtssteil", v: "linksschief", ok: true },
        { t: "rechtsschief, also linkssteil", v: "rechtsschief", why: "Dann müsste das Mittel größer als der Median sein. Hier ist es kleiner." },
        { t: "symmetrisch", v: "symmetrisch", why: "Dafür müssten Mittel und Median gleich sein." }
      ],
      ex: "$\\bar{x} - \\tilde{x} = 42 - 47 = -5 < 0$: tendenziell linksschief bzw. rechtssteil (Folie 140). Ein paar sehr schlechte Klausuren ziehen das Mittel nach unten." },
    { id: "q-sc2", topic: "schiefe", type: "mc",
      q: "Eine Verteilung heißt **linkssteil**. Was ist damit gemeint?",
      opts: [
        { t: "dasselbe wie rechtsschief: Gipfel links, langer Ausläufer nach rechts", ok: true },
        { t: "dasselbe wie linksschief: langer Ausläufer nach links", why: "Linksschief heißt rechtssteil. Linkssteil ist das Gegenteil." },
        { t: "Die Verteilung hat links einen zweiten Gipfel.", why: "Mit „steil“ ist die Seite gemeint, auf der die Kurve steil ansteigt." }
      ],
      ex: "Linkssteil und rechtsschief meinen dasselbe (Folie 140). Steil ist die Seite mit dem Gipfel, schief die Seite mit dem langen Ausläufer." },
    { id: "q-sc3", topic: "schiefe", type: "mc",
      q: "Negative Schiefe: Wie liegen Modus, Median und Mittel von links nach rechts?",
      opts: [
        { t: "Mittel, Median, Modus", ok: true },
        { t: "Modus, Median, Mittel", why: "Das ist die Reihenfolge bei positiver Schiefe." },
        { t: "Modus, Mittel, Median", why: "Auf Folie 141 liegt der Median zwischen Modus und Mittel." }
      ],
      ex: "Bei negativer Schiefe liegt der lange Ausläufer links. Er zieht das Mittel ganz nach links. Der Modus sitzt rechts auf dem Gipfel, der Median dazwischen (Folie 141)." },
    { id: "q-sc4", topic: "schiefe", type: "num", data: TEMP,
      q: "Höchsttemperaturen {x} (Folie 146): $Q_1 = 8$, $\\tilde{x} = 9$, $Q_3 = 13$. Wie groß ist $g_{0{,}25}$?",
      calc: ["skewInfo", [TEMP, 0.25], "gp"], answer: 0.6,
      facts: [["quantile", [TEMP, 0.25], 8], ["median", [TEMP], 9], ["quantile", [TEMP, 0.75], 13]],
      traps: [
        { v: 3, why: "3 ist nur der Zähler. Teile noch durch $Q_3 - Q_1 = 5$." },
        { v: -0.6, why: "Achte aufs Vorzeichen: Oben steht $(13 - 9) - (9 - 8) = 3$." }
      ],
      ex: "$g_{0{,}25} = \\frac{(13 - 9) - (9 - 8)}{13 - 8} = \\frac{3}{5} = 0{,}6 > 0$, also rechtsschief." },
    { id: "q-sc5", topic: "schiefe", type: "num",
      q: "Für einen Datensatz gilt $Q_1 = 10$, $\\tilde{x} = 14$ und $Q_3 = 16$. Wie groß ist $g_{0{,}25}$? Runde auf zwei Nachkommastellen.",
      calc: ["skewInfo", [[10, 10, 14, 14, 16, 16], 0.25], "gp"], answer: -1 / 3,
      facts: [["quantile", [[10, 10, 14, 14, 16, 16], 0.25], 10], ["median", [[10, 10, 14, 14, 16, 16]], 14], ["quantile", [[10, 10, 14, 14, 16, 16], 0.75], 16]],
      traps: [
        { v: 1 / 3, why: "Achte aufs Vorzeichen: Oben steht $(16 - 14) - (14 - 10) = 2 - 4 = -2$." },
        { v: -2, why: "−2 ist nur der Zähler. Teile noch durch $Q_3 - Q_1 = 6$." }
      ],
      ex: "$g_{0{,}25} = \\frac{(16 - 14) - (14 - 10)}{16 - 10} = \\frac{-2}{6} \\approx -0{,}33 < 0$: linksschief." },
    { id: "q-sc6", topic: "schiefe", type: "num", data: TEMP,
      q: "Werte: {x} (Folie 146). Wie groß ist $\\bar{x} - \\tilde{x}$?",
      calc: ["skewInfo", [TEMP, 0.25], "diff"], answer: 1,
      facts: [["mean", [TEMP], 10], ["median", [TEMP], 9]],
      traps: [{ v: -1, why: "Andersherum: Mittel minus Median, also 10 − 9." }],
      ex: "$\\bar{x} = 50 \\div 5 = 10$. Sortiert 4, 8, 9, 13, 16, also $\\tilde{x} = 9$. $10 - 9 = 1 > 0$: tendenziell rechtsschief." },
    { id: "q-sc7", topic: "schiefe", type: "mc",
      q: "Warum liegt bei Reaktionszeiten das Mittel meistens über dem Median?",
      opts: [
        { t: "Ein paar sehr lange Zeiten ziehen das Mittel nach oben. Der Median bleibt in der Mitte.", ok: true },
        { t: "Weil der Median immer kleiner ist als das Mittel.", why: "Nein. Bei linksschiefen Daten ist es umgekehrt." },
        { t: "Weil man für den Median sortieren muss.", why: "Sortieren ändert keinen Wert. Es geht um die langen Zeiten im Ausläufer." }
      ],
      ex: "Reaktionszeiten sind rechtsschief: Schneller als eine Untergrenze geht es nicht, aber ab und zu dauert es sehr lange. Das Mittel läuft diesem Ausläufer hinterher." },

    /* ---------- Kapitel 10: Skalenniveau und Bedeutsamkeit ---------- */
    { id: "q-sk1", topic: "skala", type: "mc",
      q: "Postleitzahlen: Welche Lagemaße darfst du berechnen?",
      opts: [
        { t: "nur den Modus", ok: true },
        { t: "Modus und Median", why: "Postleitzahlen haben keine sinnvolle Reihenfolge. 72074 ist nicht „mehr“ als 10115." },
        { t: "Modus, Median und Mittel", why: "Eine mittlere Postleitzahl ergibt keinen Sinn." }
      ],
      ex: "Postleitzahlen sind Namen in Zahlenform, also nominal (Folie 18). Dann geht nur der Modus." },
    { id: "q-sk2", topic: "skala", type: "mc",
      q: "Zufriedenheit von 1 bis 5 ist ordinal. Welches Lagemaß passt am besten?",
      opts: [
        { t: "der Median", ok: true },
        { t: "das arithmetische Mittel", why: "Das Mittel braucht gleich große Abstände. Die sind bei ordinalen Daten nicht garantiert." },
        { t: "gar keins", why: "Bei ordinalen Daten gehen Modus und Median." }
      ],
      ex: "Ordinale Daten kann man sortieren, darum gehen Modus und Median. In der Klausur ist für ordinale Daten der Median die Antwort." },
    { id: "q-sk3", topic: "skala", type: "mc",
      q: "Ab welchem Skalenniveau darfst du das arithmetische Mittel berechnen?",
      opts: [
        { t: "ab der Intervallskala", ok: true },
        { t: "ab der Ordinalskala", why: "Dort darfst du sortieren, aber nicht addieren." },
        { t: "ab der Nominalskala", why: "Bei nominalen Daten geht nur der Modus." }
      ],
      ex: "Für das Mittel addierst du Werte. Das ist nur sinnvoll, wenn die Abstände gleich groß sind, also ab der Intervallskala." },
    { id: "q-sk4", topic: "skala", type: "mc",
      q: "Ab welchem Skalenniveau ist das geometrische Mittel erlaubt?",
      opts: [
        { t: "ab der Verhältnisskala", ok: true },
        { t: "ab der Intervallskala", why: "Dort ist der Nullpunkt willkürlich. „Doppelt so viel“ ergibt keinen Sinn." },
        { t: "ab der Ordinalskala", why: "Ordinale Werte darfst du nicht einmal addieren, erst recht nicht multiplizieren." }
      ],
      ex: "Folie 119: Die Daten müssen mindestens verhältnisskaliert sein. Das geometrische Mittel multipliziert, und Produkte sind nur mit einem echten Nullpunkt sinnvoll." },
    { id: "q-sk5", topic: "skala", type: "mc",
      q: "Zwei Patientengruppen bewerten ihre Symptome auf einer Ratingskala von 1 bis 5 (Ordinalskala). Ist „Gruppe A hat im Mittel stärkere Symptome als Gruppe B“ bedeutsam?",
      facts: [["mean", [[2, 2]], 2], ["mean", [[1, 4]], 2.5], ["mean", [[4, 4]], 4], ["mean", [[1, 6]], 3.5]],
      opts: [
        { t: "Nein, bei einer Ordinalskala ist dieser Vergleich nicht bedeutsam.", ok: true },
        { t: "Ja, Mittelwerte darf man immer vergleichen.", why: "Bei einer Ordinalskala kann eine erlaubte Umnummerierung der Stufen das Ergebnis umdrehen." },
        { t: "Ja, wenn beide Gruppen gleich groß sind.", why: "Die Gruppengröße ändert nichts. Entscheidend ist das Skalenniveau." }
      ],
      ex: "Folie 122: bedeutsam bei Intervall- und Verhältnisskala, nicht bei Ordinalskala. Beispiel: A hat 2, 2 und B hat 1, 4, also 2 gegen 2,5. Nummerierst du 2 → 4 und 4 → 6 um, steht es 4 gegen 3,5." },
    { id: "q-sk6", topic: "skala", type: "mc",
      q: "Mehrere Beobachter schätzen Patienten ein, jeder auf seiner eigenen Verhältnisskala. Welcher Vergleich zweier Patienten ist bedeutsam?",
      opts: [
        { t: "der Vergleich der geometrischen Mittel", ok: true },
        { t: "der Vergleich der arithmetischen Mittel", why: "Jeder Beobachter darf seine Skala mit einer eigenen Konstante umrechnen. Dann kann sich das Ergebnis umdrehen (Folie 124)." },
        { t: "gar keiner", why: "Doch: Das geometrische Mittel bleibt bedeutsam, wenn alle Skalen Verhältnisskalen sind (Folie 125)." }
      ],
      ex: "Beim geometrischen Mittel kürzen sich die Konstanten der Beobachter heraus. Darum ist der Vergleich bedeutsam (Folie 125)." },
    { id: "q-sk7", topic: "skala", type: "mc",
      q: "Kalenderjahre wie 1989, 2004 und 2023: Welches Skalenniveau haben sie?",
      opts: [
        { t: "Intervallskala", ok: true },
        { t: "Verhältnisskala", why: "Das Jahr 0 ist willkürlich gesetzt. Das Jahr 2000 ist nicht „doppelt so viel“ wie das Jahr 1000." },
        { t: "Ordinalskala", why: "Die Abstände ergeben Sinn: Von 2004 bis 2023 sind es 19 Jahre." }
      ],
      ex: "Gleiche Abstände, aber kein natürlicher Nullpunkt: Intervallskala. Ein mittleres Jahr darfst du ausrechnen, ein geometrisches Mittel nicht." },
    { id: "q-sk8", topic: "skala", type: "mc",
      q: "Gruppe A hat eine mittlere Reaktionszeit von 250 ms, Gruppe B von 300 ms. Ist „B ist im Mittel langsamer“ bedeutsam?",
      opts: [
        { t: "Ja, Reaktionszeiten sind verhältnisskaliert.", ok: true },
        { t: "Nein, Mittelwerte darf man nie vergleichen.", why: "Bei Intervall- und Verhältnisskalen ist der Vergleich bedeutsam (Folie 122)." },
        { t: "Nur, wenn man vorher in Sekunden umrechnet.", why: "Die Einheit ist egal: In Sekunden steht es 0,25 gegen 0,3, B bleibt langsamer." }
      ],
      ex: "Rechnest du in eine andere Einheit um, ändern sich beide Mittel gleich ($\\bar{y} = p \\cdot \\bar{x}$). Die Reihenfolge bleibt. Darum ist der Vergleich bedeutsam (Folie 122)." },

    /* ---------- Kapitel 11: Übungsblatt 3 ---------- */
    { id: "q-ue1", topic: "uebung", href: "#ue-9", type: "num",
      q: "Aufgabe 9: 100 Klausurnoten mit diesen Häufigkeiten. Wie groß ist das arithmetische Mittel?",
      tab: [{ th: "Note $a_j$", vals: A9_A }, { th: "Anzahl $h_j$", vals: A9_H }],
      calc: ["meanTable", [A9_A, A9_H], "value"], answer: 2.73,
      facts: [["meanTable", [A9_A, A9_H], 273, "sum"], ["meanTable", [A9_A, A9_H], 100, "n"], ["mode", [A9], 3]],
      traps: [{ v: 3, why: "3 ist der Modus (und der Median). Gefragt ist das Mittel." }],
      ex: "$(13 \\cdot 1 + 25 \\cdot 2 + 42 \\cdot 3 + 16 \\cdot 4 + 4 \\cdot 5) \\div 100 = 273 \\div 100 = 2{,}73$." },
    { id: "q-ue2", topic: "uebung", href: "#ue-9", type: "num",
      q: "Aufgabe 9d: Wie groß ist das 0,25-Quantil der 100 Noten?",
      tab: [{ th: "Note $a_j$", vals: A9_A }, { th: "Anzahl $h_j$", vals: A9_H }, { th: "kumuliert $H_j$", vals: [13, 38, 80, 96, 100] }],
      calc: ["quantile", [A9, 0.25]], answer: 2,
      facts: [["quantileInfo", [A9, 0.25], [25, 26], "positions"], ["freq", [A9], 38, "1.H"], ["freq", [A9], 80, "2.H"]],
      traps: [{ v: 1.5, why: "Platz 25 und Platz 26 sind beide eine 2, denn die Zweien stehen auf den Plätzen 14 bis 38." }],
      ex: "$n \\cdot p = 100 \\cdot 0{,}25 = 25$ ist ganzzahlig, also $\\tfrac{1}{2}[x_{(25)} + x_{(26)}]$. Die Plätze 14 bis 38 sind Zweien, also $\\tfrac{1}{2}(2 + 2) = 2$." },
    { id: "q-ue3", topic: "uebung", href: "#ue-9", type: "mc",
      q: "Aufgabe 9c: Welche Plätze brauchst du für den Median der 100 Noten?",
      calc: ["medianInfo", [seq(100)], "positions"], facts: [["median", [A9], 3]],
      opts: [
        { t: "Platz 50 und Platz 51", v: [50, 51], ok: true },
        { t: "Platz 50", v: [50], why: "Bei geradem n gibt es keinen einzelnen mittleren Platz." },
        { t: "Platz 50,5", v: [50.5], why: "Plätze sind ganze Zahlen. Du mittelst die Werte auf Platz 50 und Platz 51." }
      ],
      ex: "n = 100 ist gerade: $\\tilde{x} = \\tfrac{1}{2}[x_{(50)} + x_{(51)}]$. Beide Plätze liegen bei den Dreien (Plätze 39 bis 80), also ist der Median 3." },
    { id: "q-ue4", topic: "uebung", href: "#ue-11", type: "num", unit: "kg",
      q: "Aufgabe 11: Körpergewicht von 100 Studenten in Klassen. Wie groß ist das Mittel ungefähr?",
      tab: [{ th: "Gewicht (kg)", vals: ["(60, 63]", "(63, 66]", "(66, 69]", "(69, 72]", "(72, 75]"] }, { th: "Anzahl", vals: A11_H }],
      calc: ["groupedMean", [A11_U, A11_H], "value"], answer: 67.95,
      facts: [["groupedMean", [A11_U, A11_H], [61.5, 64.5, 67.5, 70.5, 73.5], "mids"], ["groupedMean", [A11_U, A11_H], 6795, "sum"]],
      traps: [{ v: 67.5, why: "67,5 ist nur die Mitte der häufigsten Klasse. Du brauchst alle Klassenmitten mal ihre Anzahl." }],
      ex: "Klassenmitten 61,5; 64,5; 67,5; 70,5; 73,5. Jede mal ihre Anzahl, zusammen 6795. Geteilt durch 100 ergibt das etwa 67,95 kg (Folie 113)." },
    { id: "q-ue5", topic: "uebung", href: "#ue-12", type: "mc",
      q: "Aufgabe 12: Der Lernfortschritt ist das Verhältnis $x_i = f_i \\div f_{i-1}$. Welches Mittel passt dafür?",
      opts: [
        { t: "das geometrische Mittel", ok: true },
        { t: "das arithmetische Mittel", why: "Die $x_i$ sind Faktoren, die nacheinander malgenommen werden. Dafür ist das arithmetische Mittel nicht gedacht." },
        { t: "das harmonische Mittel", why: "Das passt zu Raten wie km/h bei fester Strecke, nicht zu Faktoren." }
      ],
      ex: "Konstanter Lernfortschritt heißt: Der Fehleranteil wird jedes Mal mit demselben Faktor malgenommen. Für Faktoren nimmst du das geometrische Mittel (Folie 119)." },
    { id: "q-ue6", topic: "uebung", href: "#ue-12", type: "num", dec: 3, data: A12_X,
      q: "Aufgabe 12a: Die Faktoren sind {x}. Wie groß ist ihr geometrisches Mittel? Runde auf drei Nachkommastellen.",
      calc: ["geometricMean", [A12_X]], answer: 0.825,
      facts: [["geometricInfo", [A12_X], 0.3818, "product", 4], ["mean", [A12_X], 0.8256, null, 4]],
      traps: [
        { v: 0.826, why: "Das ist das arithmetische Mittel der Faktoren. Gesucht ist das geometrische." },
        { v: 0.382, why: "0,382 ist erst das Produkt. Jetzt noch die 5. Wurzel ziehen." }
      ],
      ex: "Das Produkt kürzt sich: $x_1 \\cdot \\ldots \\cdot x_5 = f_5 \\div f_0 = 0{,}21 \\div 0{,}55 \\approx 0{,}3818$. Dann $0{,}3818^{1/5} \\approx 0{,}825$: Der Fehleranteil sinkt pro Durchgang auf etwa 82,5 %." },
    { id: "q-ue7", topic: "uebung", href: "#ue-10", type: "mc",
      q: "Aufgabe 10b: Bei den 60 Reaktionszeiten ist $\\bar{x} \\approx 251{,}36$ ms und $\\tilde{x} = 234{,}35$ ms. Woher kommt der Unterschied?",
      calc: ["boxplot", [RT, 1.5], "out"],
      facts: [["mean", [RT], 251.36, null, 2], ["median", [RT], 234.35, null, 2], ["skewInfo", [RT, 0.25], 17.01, "diff", 2]],
      opts: [
        { t: "Ein paar sehr lange Zeiten wie 519,6 ms und 794,5 ms ziehen das Mittel nach oben.", v: [519.6, 794.5], ok: true },
        { t: "Ein paar sehr kurze Zeiten ziehen das Mittel nach unten.", why: "Dann wäre das Mittel kleiner als der Median. Hier ist es größer." },
        { t: "Das Mittel ist falsch berechnet. Mittel und Median müssen gleich sein.", why: "Gleich sind sie nur bei symmetrischen Daten." }
      ],
      ex: "$\\bar{x} - \\tilde{x} \\approx 17{,}01 > 0$: rechtsschief. Die zwei Ausreißer und der lange Ausläufer nach rechts ziehen das Mittel hoch. Der Median ist robust." },
    { id: "q-ue8", topic: "uebung", href: "#ue-10", type: "num",
      q: "Aufgabe 10c: R rechnet `mean(x, trim = 0.1)` mit den 60 Reaktionszeiten. Wie viele Werte streicht es an **jedem** Ende?",
      calc: ["trimInfo", [RT, 0.1], "k"], answer: 6,
      facts: [["trimInfo", [RT, 0.1], 48, "m"], ["trimInfo", [RT, 0.1], 239.12, "value", 2]],
      traps: [
        { v: 12, why: "12 sind es an beiden Enden zusammen. Gefragt ist pro Ende." },
        { v: 3, why: "Das wäre `trim = 0.05`." }
      ],
      ex: "$k = 60 \\cdot 0{,}1 = 6$: sechs Werte unten und sechs oben fallen weg, 48 bleiben. Das getrimmte Mittel ist dann etwa 239,12 ms, viel näher am Median." }
  ];

  /* =====================================================================
     Reine Logik (kein DOM)
     ===================================================================== */

  function getPath(obj, path) {
    if (path === undefined || path === null || path === "") return obj;
    return String(path).split(".").reduce(function (o, k) { return o === null || o === undefined ? o : o[k]; }, obj);
  }
  function isCalc(a) { return a !== null && typeof a === "object" && !Array.isArray(a) && Array.isArray(a.$); }

  // Rechnet [funktion, [argumente], "pfad"] mit dem Rechenkern S (LM.stats bzw. require("js/stats.js")) aus.
  function evalCalc(S, c) {
    var fn = S[c[0]];
    if (typeof fn !== "function") throw new Error("Unbekannte Funktion im Rechenkern: " + c[0]);
    var args = (c[1] || []).map(function (a) { return isCalc(a) ? evalCalc(S, a.$) : a; });
    return getPath(fn.apply(null, args), c[2]);
  }

  // Fisher-Yates, gibt eine neue Liste zurück
  function shuffle(list, rng) {
    rng = rng || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Welche Fragen eines Kurz-Checks werden in Runde `round` gezeigt? Bei 4 Fragen fällt jede Runde eine andere weg.
  function pickRound(n, show, round) {
    var all = [];
    for (var i = 0; i < n; i++) all.push(i);
    if (n <= show) return all;
    var drop = {}, skip = n - show;
    for (var j = 0; j < skip; j++) drop[(((n - 1 - round * skip - j) % n) + n) % n] = true;
    return all.filter(function (k) { return !drop[k]; });
  }

  // Toleranz wie LM.check: halbe Einheit der letzten verlangten Nachkommastelle
  function tolerance(dec) { return 0.5 * Math.pow(10, -(dec === undefined ? 2 : dec)) + 1e-9; }
  function decOf(item) { return item.dec === undefined ? 2 : item.dec; }

  // Passt eine eingegebene Zahl zu einer typischen falschen Antwort?
  function matchTrap(item, value) {
    var tol = tolerance(decOf(item));
    var list = item.traps || [];
    for (var i = 0; i < list.length; i++) if (Math.abs(value - list[i].v) <= tol) return list[i];
    return null;
  }

  // Abschlussquiz: eine Frage pro Kapitel. Möglichst keine Frage aus dem letzten Durchgang (avoid),
  // und eine gesunde Mischung aus Zahl- und Auswahlfragen (minNum … maxNum Zahlfragen).
  function sampleQuiz(pool, topics, rng, opts) {
    rng = rng || Math.random;
    opts = opts || {};
    var minNum = opts.minNum === undefined ? 3 : opts.minNum, maxNum = opts.maxNum === undefined ? 6 : opts.maxNum;
    var avoid = opts.avoid || [];
    var byTopic = {};
    pool.forEach(function (q) { (byTopic[q.topic] = byTopic[q.topic] || []).push(q); });
    var first = null;
    for (var attempt = 0; attempt < 80; attempt++) {
      var pick = [];
      topics.forEach(function (t) {
        var list = byTopic[t.id] || [];
        if (!list.length) return;
        var fresh = list.filter(function (q) { return avoid.indexOf(q.id) < 0; });
        var from = fresh.length ? fresh : list;
        pick.push(from[Math.floor(rng() * from.length)]);
      });
      var nNum = pick.filter(function (q) { return q.type === "num"; }).length;
      if (nNum >= minNum && nNum <= maxNum) return pick;
      if (!first) first = pick;
    }
    return first;
  }

  function quizMessage(score, total) {
    if (score === total) return "Perfekt! Alles richtig.";
    if (score >= 8) return "Geschafft! Du hast das Abschlussquiz bestanden.";
    if (score >= 5) return "Schon ordentlich. Schau dir die Fehler unten an, dann klappt es beim nächsten Mal.";
    return "Noch nicht. Lies die verlinkten Kapitel nochmal und probier es dann erneut.";
  }

  /* ---------- Skalen-Sortierspiel ---------- */

  function levelById(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null; }
  function allowedMeasures(levelId) {
    var lv = levelById(levelId);
    return MEASURES.map(function (m) { return { id: m.id, name: m.name, ok: !!lv && lv.allowed.indexOf(m.id) >= 0 }; });
  }
  function scaleCheck(card, levelId) { return { ok: card.level === levelId, level: levelById(card.level), measures: allowedMeasures(card.level) }; }
  function scaleMessage(score, total) {
    if (score === total) return "Alles richtig sortiert. Stark!";
    if (score >= total - 2) return "Fast alles richtig. Schau dir die Karten mit ✗ nochmal an.";
    return "Die Karten mit ✗ lohnen sich: Frag dich jeweils, ob man sortieren kann, ob die Abstände gleich sind und ob es einen echten Nullpunkt gibt.";
  }

  /* ---------- Karteikarten: Leitner-Stapel ----------
     Box 0 = neu, 1 = wackelig (zuletzt nicht gewusst), 2 = gewusst, 3 = sicher (zweimal in Folge gewusst).
     k[id] merkt sich, ob die Karte schon einmal gewusst wurde. q ist die Warteschlange des Durchgangs. */

  var REQUEUE = 3; // „Nochmal“: die Karte kommt nach 3 anderen Karten wieder

  function freshCardState() { return { v: 1, b: {}, k: {}, q: [], pass: 1 }; }
  function cardState(raw, ids) {
    var st = freshCardState();
    if (!raw || typeof raw !== "object") return st;
    ids.forEach(function (id) {
      var b = raw.b && raw.b[id];
      if (b === 1 || b === 2 || b === 3) st.b[id] = b;
      if (raw.k && raw.k[id]) st.k[id] = 1;
    });
    if (Array.isArray(raw.q)) st.q = raw.q.filter(function (id, i, a) { return ids.indexOf(id) >= 0 && a.indexOf(id) === i; });
    if (raw.pass > 0) st.pass = Math.floor(raw.pass);
    return st;
  }
  function boxOf(st, id) { return st.b[id] || 0; }
  // Neuer Durchgang: erst die wackeligen, dann die neuen, dann die gewussten Karten (jeweils gemischt).
  // Sichere Karten nur, wenn sonst nichts übrig ist.
  function buildPass(st, ids, rng) {
    var g = [[], [], [], []];
    ids.forEach(function (id) { g[boxOf(st, id)].push(id); });
    var order = shuffle(g[1], rng).concat(shuffle(g[0], rng), shuffle(g[2], rng));
    return order.length ? order : shuffle(g[3], rng);
  }
  function rateCard(st, id, known) {
    var b = boxOf(st, id);
    if (known) { st.b[id] = b >= 2 ? 3 : 2; st.k[id] = 1; } else st.b[id] = 1;
    var q = st.q.filter(function (x) { return x !== id; });
    if (!known) q.splice(Math.min(REQUEUE, q.length), 0, id);
    st.q = q;
    return st;
  }
  function knownCount(st, ids) { return ids.filter(function (id) { return !!st.k[id]; }).length; }
  function sureCount(st, ids) { return ids.filter(function (id) { return boxOf(st, id) === 3; }).length; }
  function shakyCount(st, ids) { return ids.filter(function (id) { return boxOf(st, id) === 1; }).length; }

  /* ---------- Text mit Formeln, R-Code und Fettdruck ---------- */

  var TOKEN = /\{x\}|\$([^$]+)\$|`([^`]+)`|\*\*(.+?)\*\*/g;

  // Ganze Zahlen mit Komma trennen, Kommazahlen mit Semikolon (sonst wäre „8,5, 9“ mehrdeutig)
  function fmtList(data, fmt) {
    var anyFrac = data.some(function (v) { return Math.abs(v - Math.round(v)) > 1e-9; });
    return data.map(function (v) { return fmt(v, 4); }).join(anyFrac ? "; " : ", ");
  }

  // env = { esc, tex, fmt, glue } (im Browser LM.esc, LM.tex, LM.fmt; glue = Satzzeichen an Formeln kleben, nur mit KaTeX)
  // Fließtext: das Ergebnis bleibt am Gleichheitszeichen („… ÷ 5 = 0,6“ bricht höchstens vor dem „=“ um)
  function plainText(seg, env) { return env.esc(seg).replace(/ ([=≈]) /g, " $1\u00a0"); }
  // R-Code: „range = 1.5“ bleibt zusammen, umbrochen wird höchstens nach einem Komma
  function codeText(seg, env) { return env.esc(seg).replace(/ = /g, "\u00a0=\u00a0"); }

  function rich(text, data, env) {
    var s = String(text === undefined || text === null ? "" : text), out = "", last = 0, m;
    var re = new RegExp(TOKEN.source, "g");
    while ((m = re.exec(s))) {
      out += plainText(s.slice(last, m.index), env);
      if (m[0] === "{x}") out += '<span class="qz-data">' + env.esc(data ? fmtList(data, env.fmt) : "") + "</span>";
      else if (m[1] !== undefined) {
        // Satzzeichen direkt nach einer Formel kommen mit in die Formel, damit davor kein Zeilenumbruch entsteht
        var src = m[1], nxt = s.charAt(re.lastIndex);
        if (env.glue && nxt && ".,;:!?".indexOf(nxt) >= 0) { src += "\\text{" + nxt + "}"; re.lastIndex += 1; }
        out += env.tex(src);
      }
      else if (m[2] !== undefined) out += "<code>" + codeText(m[2], env) + "</code>";
      else out += "<strong>" + rich(m[3], data, env) + "</strong>";
      last = re.lastIndex;
    }
    return out + plainText(s.slice(last), env);
  }
  // ungefähre Länge des sichtbaren Texts (für die Wahl: Antworten nebeneinander oder untereinander)
  function plainLength(text) { return String(text).replace(/\$[^$]*\$/g, "xxxx").replace(/[`*]/g, "").length; }

  var api = {
    MINI: MINI, MINI_SHOW: MINI_SHOW, SCALE: SCALE, LEVELS: LEVELS, MEASURES: MEASURES, CARDS: CARDS, QUIZ: QUIZ, TOPICS: TOPICS,
    getPath: getPath, evalCalc: evalCalc, shuffle: shuffle, pickRound: pickRound, tolerance: tolerance, decOf: decOf,
    matchTrap: matchTrap, sampleQuiz: sampleQuiz, quizMessage: quizMessage,
    levelById: levelById, allowedMeasures: allowedMeasures, scaleCheck: scaleCheck, scaleMessage: scaleMessage,
    REQUEUE: REQUEUE, freshCardState: freshCardState, cardState: cardState, boxOf: boxOf, buildPass: buildPass,
    rateCard: rateCard, knownCount: knownCount, sureCount: sureCount, shakyCount: shakyCount,
    fmtList: fmtList, rich: rich, plainLength: plainLength
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  var LM = root.LM;
  if (!LM || typeof LM.widget !== "function" || !LM.stats) return;

  /* =====================================================================
     Gemeinsame UI-Helfer
     ===================================================================== */

  var h = LM.h, S = LM.stats;
  var ENV = { esc: LM.esc, tex: function (src) { return LM.tex(src); }, fmt: LM.fmt, glue: !!root.katex };
  function R(text, data) { return rich(text, data, ENV); }
  var uidN = 0;
  function uid(p) { uidN += 1; return "qz-" + p + "-" + uidN; }

  // kurze CSS-Animation neu starten (nur ohne „weniger Bewegung“)
  function animate(el, cls) {
    if (LM.reduceMotion || !el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  // „1–5“ nicht am Strich umbrechen (Wortverbinder um den Halbgeviertstrich)
  function keepRange(s) { return String(s).replace(/(\d)–(\d)/g, "$1⁠–⁠$2").replace(/ in (\S+)$/, " in $1"); }
  function tagClass(tag) { return tag ? "tag tag-" + tag : "tag qz-tag-n"; }

  // Element sanft ins Bild holen, falls es unten aus dem Fenster ragt (z. B. der Weiter-Knopf)
  function ensureVisible(node) {
    if (!node || !node.getBoundingClientRect) return;
    var r = node.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8) {
      try { node.scrollIntoView({ block: "nearest", behavior: LM.reduceMotion ? "auto" : "smooth" }); } catch (e) { node.scrollIntoView(false); }
    }
  }

  function widgetHead(el, title, badgeHTML, sub) {
    var h3 = h("h3", { html: LM.esc(title) + (badgeHTML ? " " + badgeHTML : "") });
    var head = h("div", { class: "w-head" }, [h3, sub ? h("p", { class: "w-sub", text: sub }) : null]);
    el.appendChild(head);
    return head;
  }

  // Sichtbare Zeile „Zählt zum Fortschritt: …“ mit Haken, sobald das Ziel erreicht ist
  function goalLine(id, text) {
    var p = h("p", { class: "qz-goal" });
    function render() {
      var done = LM.progress.has(id);
      p.classList.toggle("is-done", done);
      p.innerHTML = '<span class="qz-goal-k">Zählt zum Fortschritt:</span> ' + LM.esc(text) +
        (done ? ' <span class="qz-goal-ok"><span aria-hidden="true">✓</span> geschafft</span>' : "");
    }
    render();
    document.addEventListener("lm:progress", render);
    return p;
  }

  function tableEl(rows) {
    var tbody = h("tbody");
    rows.forEach(function (r) {
      var tr = h("tr", {}, [h("th", { attrs: { scope: "row" }, html: R(r.th) })]);
      r.vals.forEach(function (v) {
        tr.appendChild(h("td", { class: "num", text: typeof v === "number" ? LM.fmt(v, 4) : String(v) }));
      });
      tbody.appendChild(tr);
    });
    return h("div", { class: "table-wrap qz-table" }, [h("table", { class: "t" }, [tbody])]);
  }

  function optHTML(o) { return o.t !== undefined ? R(o.t) : LM.esc(LM.fmt(o.v, o.d === undefined ? 2 : o.d)); }
  function expectedOf(item) { return item.calc ? evalCalc(S, item.calc) : item.answer; }
  function numText(item, v) { return LM.fmt(v, decOf(item)) + (item.unit ? " " + item.unit : ""); }

  /*
   * Eine Frage (Auswahl oder Zahl) mit sofortiger Rückmeldung. Die erste gültige Antwort zählt.
   * o = { num: Nummer für die Blase (optional), onDone: function (ergebnis) }
   * Ergebnis: { item, ok, your: HTML der eigenen Antwort, right: HTML der richtigen Antwort }
   */
  function renderQuestion(item, o) {
    o = o || {};
    var dec = decOf(item);
    var rootEl = h("div", { class: "qz-q", attrs: { "data-id": item.id } });
    var bubble = o.num ? h("span", { class: "qz-num", text: String(o.num), attrs: { "aria-hidden": "true" } }) : null;
    var textId = uid("qt");
    var qhead = h("div", { class: "qz-qhead" }, [bubble, h("div", { class: "qz-text", html: R(item.q, item.data), attrs: { id: textId } })]);
    rootEl.appendChild(qhead);
    if (item.tab) rootEl.appendChild(tableEl(item.tab));
    var body = h("div", { class: "qz-body" });
    rootEl.appendChild(body);
    var fb = h("div", { class: "qz-fb", attrs: { role: "status", "aria-live": "polite" } });
    rootEl.appendChild(fb);
    var done = false;

    function finish(ok, yourHTML, rightHTML, why) {
      done = true;
      rootEl.classList.add(ok ? "is-ok" : "is-miss");
      if (bubble) {
        bubble.textContent = ok ? "✓" : "✗";
        bubble.classList.add(ok ? "is-ok" : "is-miss");
        animate(bubble, "qz-pop");
      }
      var html = '<p class="qz-fb-lead"><span class="qz-fb-icon" aria-hidden="true">' + (ok ? "✓" : "✗") + "</span>" +
        (ok ? "Richtig!" : "Nicht ganz.") + "</p>";
      if (!ok) html += '<p class="qz-fb-right">Richtig: <span class="qz-right">' + rightHTML + "</span></p>";
      if (!ok && why) html += '<p class="qz-fb-why">' + R(why) + "</p>";
      html += '<p class="qz-fb-ex">' + R(item.ex) + "</p>";
      fb.className = "qz-fb " + (ok ? "is-ok" : "is-miss");
      fb.innerHTML = html;
      animate(fb, "qz-in");
      if (o.onDone) o.onDone({ item: item, ok: ok, your: yourHTML, right: rightHTML });
    }

    var view = { el: rootEl, isDone: function () { return done; }, focusFirst: null };

    if (item.type === "mc") {
      var lens = item.opts.map(function (op) { return plainLength(op.t !== undefined ? op.t : LM.fmt(op.v, 2)); });
      var stack = lens.some(function (n) { return n > 24; }), short = lens.every(function (n) { return n <= 8; });
      var group = h("div", { class: "qz-opts" + (stack ? " is-stack" : short ? " is-short" : ""), attrs: { role: "group", "aria-labelledby": textId } });
      var order = shuffle(item.opts.map(function (op, i) { return i; }));
      var rightIdx = -1;
      item.opts.forEach(function (op, i) { if (op.ok) rightIdx = i; });
      var btns = order.map(function (i) {
        var b = h("button", { class: "qz-opt" + (item.opts[i].t === undefined ? " is-num" : ""),
          html: '<span class="qz-opt-mark" aria-hidden="true"></span><span class="qz-opt-text">' + optHTML(item.opts[i]) + "</span>",
          attrs: { type: "button", "data-key": String(i) } });
        b.addEventListener("click", function () { choose(i, b); });
        group.appendChild(b);
        return b;
      });
      body.appendChild(group);
      view.focusFirst = function () { if (btns[0]) btns[0].focus(); };
      var choose = function (i, btn) {
        if (done) return;
        var op = item.opts[i], ok = !!op.ok;
        btns.forEach(function (b) {
          var k = Number(b.getAttribute("data-key"));
          b.setAttribute("aria-disabled", "true");
          b.classList.add("is-locked");
          var mark = b.querySelector(".qz-opt-mark");
          if (k === rightIdx) { b.classList.add("is-right"); mark.textContent = "✓"; }
          else if (k === i) { b.classList.add("is-wrong"); mark.textContent = "✗"; }
          else b.classList.add("is-dim");
          if (k === i) b.setAttribute("aria-pressed", "true");
        });
        animate(btn, "qz-pop");
        finish(ok, optHTML(op), optHTML(item.opts[rightIdx]), ok ? null : op.why);
      };
    } else {
      var inputId = uid("in");
      var input = h("input", { class: "num-input qz-input", attrs: { id: inputId, type: "text", inputmode: "decimal", autocomplete: "off",
        spellcheck: "false", "aria-label": "Deine Antwort" + (item.unit ? " in " + item.unit : "") } });
      var checkBtn = h("button", { class: "btn btn-primary qz-check", text: "Prüfen", attrs: { type: "button" } });
      var hint = h("p", { class: "qz-hint", attrs: { "aria-live": "polite" } });
      var row = h("div", { class: "qz-numrow" }, [
        h("span", { class: "qz-inwrap" }, [input, item.unit ? h("span", { class: "qz-unit", text: item.unit }) : null]),
        checkBtn
      ]);
      body.appendChild(row);
      body.appendChild(hint);
      view.focusFirst = function () { input.focus(); };
      var submit = function () {
        if (done) return;
        var expected = expectedOf(item);
        var r = LM.check(input.value, expected, { decimals: dec });
        if (r.empty) { hint.textContent = "Tipp zuerst eine Zahl ein."; animate(input, "qz-shake"); input.focus(); return; }
        if (!isFinite(r.value)) { hint.textContent = "Das ist keine Zahl. Schreib zum Beispiel 8,5."; animate(input, "qz-shake"); input.focus(); return; }
        hint.textContent = "";
        input.readOnly = true;
        input.classList.add(r.ok ? "is-ok" : "is-miss");
        if (!r.ok) input.setAttribute("aria-invalid", "true");
        checkBtn.setAttribute("aria-disabled", "true");
        checkBtn.classList.add("is-locked", r.ok ? "is-ok" : "is-miss");
        checkBtn.textContent = r.ok ? "✓ Richtig" : "✗ Nicht ganz";
        var trap = r.ok ? null : matchTrap(item, r.value);
        finish(r.ok, LM.esc(numText(item, r.value)), LM.esc(numText(item, expected)), trap ? trap.why : null);
      };
      checkBtn.addEventListener("click", submit);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submit(); } });
      input.addEventListener("input", function () { if (!done) hint.textContent = ""; });
    }
    return view;
  }

  /* =====================================================================
     1. mini-quiz: Kurz-Check am Kapitelende
     ===================================================================== */

  LM.widget("mini-quiz", function (el) {
    var key = el.getAttribute("data-set"), set = MINI[key];
    el.classList.add("widget", "qz-mini");
    if (!set) {
      el.appendChild(h("p", { class: "w-missing", text: "Diesen Kurz-Check gibt es nicht (" + key + ")." }));
      return;
    }
    el.setAttribute("data-tone", set.tag || "n");
    var nShow = Math.min(MINI_SHOW, set.items.length);
    widgetHead(el, "Kurz-Check", '<span class="' + tagClass(set.tag) + '">' + LM.esc(set.title) + "</span>",
      nShow + " schnelle Fragen. Die erste Antwort zählt, danach siehst du sofort, warum.");
    var list = h("ol", { class: "qz-list" });
    var score = h("p", { class: "qz-score", attrs: { role: "status", "aria-live": "polite" } });
    var again = h("button", { class: "btn btn-sm qz-again", attrs: { type: "button" },
      html: '<span aria-hidden="true">↻</span> Nochmal' });
    var foot = h("div", { class: "qz-foot" }, [score, again]);
    el.appendChild(list);
    el.appendChild(foot);

    var round = 0, results = [], views = [], celebrated = false;

    function update(justDone) {
      var n = views.length, answered = results.filter(Boolean).length;
      var right = results.filter(function (r) { return r && r.ok; }).length;
      score.classList.remove("is-all", "is-some");
      if (answered < n) {
        score.textContent = answered ? answered + " von " + n + " beantwortet, " + right + " richtig." : "Noch keine Frage beantwortet.";
        return;
      }
      if (right === n) {
        score.textContent = "Alle " + n + " richtig. Stark!";
        score.classList.add("is-all");
        if (justDone && !celebrated) { celebrated = true; LM.celebrate(score); }
      } else {
        score.textContent = right + " von " + n + " richtig. Lies die Erklärungen und versuch es dann nochmal.";
        score.classList.add("is-some");
      }
      if (justDone) animate(score, "qz-pop");
    }

    function build() {
      list.innerHTML = "";
      results = [];
      celebrated = false;
      views = pickRound(set.items.length, MINI_SHOW, round).map(function (i, n) {
        var li = h("li", { class: "qz-li" });
        var view = renderQuestion(set.items[i], {
          num: n + 1,
          onDone: function (r) { results[n] = r; update(true); }
        });
        li.appendChild(view.el);
        list.appendChild(li);
        return view;
      });
      update(false);
    }

    again.addEventListener("click", function () {
      round += 1;
      build();
      animate(list, "qz-in");
      if (views[0] && views[0].focusFirst) views[0].focusFirst();
    });
    build();
  });

  /* =====================================================================
     2. scale-sort: Skalenniveau zuordnen (Kapitel 10)
     ===================================================================== */

  LM.widget("scale-sort", function (el) {
    el.classList.add("widget", "qz-ss");
    widgetHead(el, "Sortier die Merkmale", '<span class="w-badge">Spiel</span>',
      "Welches Skalenniveau hat das Merkmal? Tipp auf eine der vier Stufen. Danach siehst du, welche Lagemaße erlaubt sind und warum.");

    var counter = h("p", { class: "qz-ss-count" });
    var scoreEl = h("p", { class: "qz-ss-score" });
    var restart = h("button", { class: "btn btn-sm btn-ghost", attrs: { type: "button" }, html: '<span aria-hidden="true">↻</span> Neu mischen' });
    var bar = h("div", { class: "qz-ss-bar" }, [counter, scoreEl, restart]);
    var stage = h("div", { class: "qz-ss-stage" });
    var live = h("p", { class: "qz-sr", attrs: { role: "status", "aria-live": "polite" } });
    var bins = h("div", { class: "qz-bins", attrs: { "aria-label": "Bisher sortiert" } });
    el.appendChild(bar);
    el.appendChild(stage);
    el.appendChild(live);
    el.appendChild(bins);

    var binLists = {};
    LEVELS.forEach(function (lv) {
      var listEl = h("ul", { class: "qz-bin-list" }, [h("li", { class: "qz-bin-empty", text: "noch leer" })]);
      binLists[lv.id] = listEl;
      var allowed = lv.allowed.map(function (id) { return MEASURES.filter(function (m) { return m.id === id; })[0].name; }).join(", ");
      bins.appendChild(h("section", { class: "qz-bin", attrs: { "data-level": lv.id } }, [
        h("h4", { class: "qz-bin-head", text: lv.name }),
        h("p", { class: "qz-bin-allowed", text: allowed }),
        listEl
      ]));
    });

    var order = [], pos = 0, results = [];

    function updateBar() {
      var right = results.filter(function (r) { return r.ok; }).length;
      counter.textContent = pos < order.length ? "Karte " + (pos + 1) + " von " + order.length : "Alle " + order.length + " Karten sortiert";
      scoreEl.textContent = right + " richtig";
    }

    function measureRow(card) {
      var row = h("ul", { class: "qz-ms", attrs: { "aria-label": "Erlaubte Lagemaße" } });
      allowedMeasures(card.level).forEach(function (m) {
        var cls = m.ok ? (m.id === "geo" ? "tag tag-mean qz-tag-geo" : "tag tag-" + m.id) : "qz-ms-no";
        row.appendChild(h("li", { class: cls, html: (m.ok ? "" : '<span class="qz-ms-x" aria-hidden="true">✗</span>') + LM.esc(m.name) +
          '<span class="qz-sr">' + (m.ok ? ": erlaubt" : ": nicht erlaubt") + "</span>" }));
      });
      return row;
    }

    function show() {
      updateBar();
      stage.innerHTML = "";
      if (pos >= order.length) return finish();
      var card = SCALE[order[pos]];
      var nameId = uid("ssn");
      var cardEl = h("div", { class: "qz-ss-card", attrs: { "data-id": card.id } });
      cardEl.appendChild(h("p", { class: "qz-ss-eyebrow", text: "Merkmal" }));
      cardEl.appendChild(h("p", { class: "qz-ss-name", text: keepRange(card.name), attrs: { id: nameId } }));
      cardEl.appendChild(h("p", { class: "qz-ss-ex", text: "zum Beispiel: " + card.ex }));
      var group = h("div", { class: "qz-ss-levels", attrs: { role: "group", "aria-labelledby": nameId } });
      var btns = LEVELS.map(function (lv) {
        var b = h("button", { class: "qz-ss-lv", attrs: { type: "button", "data-level": lv.id },
          html: '<span class="qz-ss-lv-name">' + LM.esc(lv.name) + '</span><span class="qz-ss-lv-hint">' + LM.esc(lv.hint) + "</span>" });
        b.addEventListener("click", function () { answer(card, lv.id, btns, cardEl); });
        group.appendChild(b);
        return b;
      });
      cardEl.appendChild(group);
      stage.appendChild(cardEl);
      animate(cardEl, "qz-in");
      return btns;
    }

    function answer(card, levelId, btns, cardEl) {
      if (cardEl.classList.contains("is-answered")) return;
      cardEl.classList.add("is-answered");
      var res = scaleCheck(card, levelId);
      results.push({ id: card.id, ok: res.ok, chosen: levelId });
      btns.forEach(function (b) {
        var id = b.getAttribute("data-level");
        b.setAttribute("aria-disabled", "true");
        b.classList.add("is-locked");
        if (id === card.level) b.classList.add("is-right");
        else if (id === levelId) b.classList.add("is-wrong");
        else b.classList.add("is-dim");
        if (id === levelId) b.setAttribute("aria-pressed", "true");
      });
      var lv = res.level;
      var out = h("div", { class: "qz-ss-result " + (res.ok ? "is-ok" : "is-miss") });
      out.appendChild(h("p", { class: "qz-fb-lead", html: '<span class="qz-fb-icon" aria-hidden="true">' + (res.ok ? "✓" : "✗") + "</span>" +
        (res.ok ? "Richtig: " + LM.esc(lv.name) + "." : "Nicht ganz: " + LM.esc(keepRange(card.name)) + " ist " + LM.esc(lv.name.toLowerCase()) + "skaliert.") }));
      out.appendChild(h("p", { class: "qz-ss-why", text: card.why }));
      out.appendChild(h("p", { class: "qz-ss-mlabel", text: "Erlaubte Lagemaße:" }));
      out.appendChild(measureRow(card));
      out.appendChild(h("p", { class: "qz-ss-rule", text: lv.rule }));
      if (card.note) out.appendChild(h("p", { class: "qz-ss-note", text: card.note }));
      var last = pos === order.length - 1;
      var next = h("button", { class: "btn btn-primary qz-ss-next", attrs: { type: "button" },
        html: last ? "Ergebnis ansehen" : 'Nächste Karte <span class="arrow" aria-hidden="true">→</span>' });
      next.addEventListener("click", function () { pos += 1; show(); focusStage(); });
      out.appendChild(h("div", { class: "qz-ss-nav" }, [next]));
      cardEl.appendChild(out);
      animate(out, "qz-in");
      live.textContent = (res.ok ? "Richtig. " : "Nicht ganz. ") + card.name + " ist " + lv.name + "skala. Erlaubt: " +
        lv.allowed.map(function (id) { return MEASURES.filter(function (m) { return m.id === id; })[0].name; }).join(", ") + ".";
      addChip(card, res.ok, levelId);
      updateBar();
      next.focus({ preventScroll: true });
      ensureVisible(next);
    }

    function addChip(card, ok, chosen) {
      var listEl = binLists[card.level];
      var empty = listEl.querySelector(".qz-bin-empty");
      if (empty) empty.remove();
      var chosenName = levelById(chosen).name;
      var chip = h("li", { class: "qz-chip " + (ok ? "is-ok" : "is-miss"),
        html: '<span class="qz-chip-mark" aria-hidden="true">' + (ok ? "✓" : "✗") + '</span><span class="qz-chip-name">' + LM.esc(keepRange(card.name)) +
          (ok ? '<span class="qz-sr"> (richtig)</span>' : '<span class="qz-sr"> (falsch)</span>') + "</span>" +
          (ok ? "" : '<span class="qz-chip-was">du: ' + LM.esc(chosenName) + "</span>") });
      listEl.appendChild(chip);
      animate(chip, "qz-pop");
    }

    function finish() {
      var right = results.filter(function (r) { return r.ok; }).length, n = order.length;
      var done = h("div", { class: "qz-ss-done" });
      done.appendChild(h("p", { class: "qz-ss-big", html: "<strong>" + right + "</strong> von " + n + " richtig" }));
      done.appendChild(h("p", { text: scaleMessage(right, n) }));
      var again = h("button", { class: "btn btn-primary", attrs: { type: "button" }, html: '<span aria-hidden="true">↻</span> Nochmal' });
      again.addEventListener("click", function () { start(); focusStage(); });
      done.appendChild(h("div", { class: "qz-ss-nav" }, [again]));
      stage.appendChild(done);
      animate(done, "qz-in");
      live.textContent = "Fertig: " + right + " von " + n + " richtig.";
      if (right === n) LM.celebrate(done);
      again.focus({ preventScroll: true });
    }

    function focusStage() {
      var first = stage.querySelector("button");
      if (first) first.focus({ preventScroll: true });
      var r = stage.getBoundingClientRect();
      if (r.top < 70 || r.top > window.innerHeight - 120) {
        try { stage.scrollIntoView({ block: "start", behavior: LM.reduceMotion ? "auto" : "smooth" }); } catch (e) { stage.scrollIntoView(); }
      }
    }

    function start() {
      order = shuffle(SCALE.map(function (c, i) { return i; }));
      pos = 0;
      results = [];
      Object.keys(binLists).forEach(function (id) {
        binLists[id].innerHTML = "";
        binLists[id].appendChild(h("li", { class: "qz-bin-empty", text: "noch leer" }));
      });
      live.textContent = "";
      show();
    }

    restart.addEventListener("click", function () { start(); focusStage(); });
    start();
  });

  /* =====================================================================
     3. flashcards: Karteikarten mit Leitner-Stapeln (Kapitel 14)
     ===================================================================== */

  LM.widget("flashcards", function (el) {
    LM.progress.define("karten", "Alle Karteikarten einmal gewusst");
    el.classList.add("widget", "qz-fc");
    var ids = CARDS.map(function (c) { return c.id; });
    var byId = {};
    CARDS.forEach(function (c) { byId[c.id] = c; });
    var fcHead = widgetHead(el, "Karteikarten", '<span class="w-badge">' + CARDS.length + " Karten</span>",
      "Lies die Frage und antworte im Kopf. Dann dreh die Karte um und sag ehrlich, ob du es wusstest. Was du nicht wusstest, kommt bald wieder.");
    fcHead.appendChild(goalLine("karten", "alle " + CARDS.length + " Karten mindestens einmal gewusst."));

    // Fortschritt
    var countEl = h("p", { class: "qz-fc-count" });
    var barSure = h("span", { class: "qz-bar-sure" });
    var barKnown = h("span", { class: "qz-bar-known" });
    var barEl = h("div", { class: "qz-bar", attrs: { role: "progressbar", "aria-label": "Karten gewusst", "aria-valuemin": "0", "aria-valuemax": String(ids.length) } }, [barSure, barKnown]);
    var legend = h("p", { class: "qz-fc-legend" });
    el.appendChild(h("div", { class: "qz-fc-progress" }, [countEl, barEl, legend]));

    // Karte
    var stage = h("div", { class: "qz-fc-stage" });
    var rate = h("div", { class: "qz-fc-rate" });
    var status = h("p", { class: "qz-fc-status", attrs: { role: "status", "aria-live": "polite" } });
    el.appendChild(stage);
    el.appendChild(rate);
    el.appendChild(status);

    // Zurücksetzen mit Rückfrage
    var resetBtn = h("button", { class: "btn btn-sm btn-ghost qz-fc-reset", attrs: { type: "button" }, text: "Stapel zurücksetzen" });
    var confirmBox = h("div", { class: "qz-fc-confirm", attrs: { hidden: "" } }, [
      h("span", { text: "Alle Karten wieder auf „neu“?" }),
      h("button", { class: "btn btn-sm qz-fc-yes", attrs: { type: "button" }, text: "Ja, zurücksetzen" }),
      h("button", { class: "btn btn-sm btn-ghost qz-fc-no", attrs: { type: "button" }, text: "Abbrechen" })
    ]);
    el.appendChild(h("div", { class: "qz-fc-foot" }, [resetBtn, confirmBox]));

    var st = cardState(LM.store.get("cards", null), ids);
    if (!st.q.length) {
      if (Object.keys(st.b).length) st.pass += 1;
      st.q = buildPass(st, ids);
    }
    var flipped = false, cardBtn = null, current = null;

    function save() { LM.store.set("cards", st); }

    function renderProgress() {
      var known = knownCount(st, ids), sure = sureCount(st, ids), shaky = shakyCount(st, ids), n = ids.length;
      countEl.innerHTML = "<strong>" + known + "</strong> von " + n + " gewusst";
      barSure.style.width = (100 * sure / n) + "%";
      barKnown.style.width = (100 * Math.max(0, known - sure) / n) + "%";
      barEl.setAttribute("aria-valuenow", String(known));
      barEl.setAttribute("aria-valuetext", known + " von " + n + " gewusst, davon " + sure + " sicher");
      legend.innerHTML = '<span class="qz-key qz-key-sure" aria-hidden="true"></span>sicher ' + sure +
        '<span class="qz-key qz-key-known" aria-hidden="true"></span>gewusst ' + Math.max(0, known - sure) +
        '<span class="qz-key qz-key-open" aria-hidden="true"></span>offen ' + (n - known) +
        (shaky ? '<span class="qz-fc-shaky">· ' + shaky + " wackelig</span>" : "");
    }

    function face(card, back) {
      var tagHTML = '<span class="' + tagClass(card.tag) + '">' + LM.esc(card.topic) + "</span>";
      var html = '<span class="qz-fc-top">' + tagHTML + '<span class="qz-fc-side">' + (back ? "Antwort" : "Frage") + "</span></span>";
      if (!back) {
        html += '<span class="qz-fc-q">' + R(card.f) + "</span>" +
          '<span class="qz-fc-hint"><span aria-hidden="true">↻</span> Tippen oder Leertaste zum Umdrehen</span>';
      } else {
        html += '<span class="qz-fc-a">' + (card.tex ? '<span class="qz-fc-tex">' + LM.tex(card.tex, true) + "</span>" : "") +
          '<span class="qz-fc-b">' + R(card.b) + "</span></span>";
      }
      return html;
    }

    function setFlip(on, instant) {
      flipped = on;
      if (!cardBtn) return;
      if (instant) cardBtn.classList.add("is-instant");
      cardBtn.classList.toggle("is-flipped", on);
      cardBtn.setAttribute("aria-pressed", String(on));
      cardBtn.querySelector(".qz-fc-front").setAttribute("aria-hidden", String(on));
      cardBtn.querySelector(".qz-fc-back").setAttribute("aria-hidden", String(!on));
      if (instant) { void cardBtn.offsetWidth; cardBtn.classList.remove("is-instant"); }
      renderRate();
    }

    function renderRate() {
      rate.innerHTML = "";
      if (!current) return;
      if (!flipped) {
        var turn = h("button", { class: "btn btn-primary qz-fc-turn", attrs: { type: "button" }, html: '<span aria-hidden="true">↻</span> Umdrehen' });
        turn.addEventListener("click", function () { setFlip(true); });
        rate.appendChild(turn);
      } else {
        var no = h("button", { class: "btn qz-fc-no-btn", attrs: { type: "button" }, html: '<span aria-hidden="true">↺</span> Nochmal' });
        var yes = h("button", { class: "btn btn-primary qz-fc-yes-btn", attrs: { type: "button" }, html: '<span aria-hidden="true">✓</span> Gewusst' });
        no.addEventListener("click", function () { answer(false); });
        yes.addEventListener("click", function () { answer(true); });
        rate.appendChild(no);
        rate.appendChild(yes);
      }
    }

    function renderCard(animateIn) {
      stage.innerHTML = "";
      current = st.q.length ? byId[st.q[0]] : null;
      flipped = false;
      cardBtn = null;
      renderProgress();
      if (!current) return renderPassDone();
      cardBtn = h("button", { class: "qz-fc-card", attrs: { type: "button", "aria-pressed": "false", "data-id": current.id,
        "aria-roledescription": "Karteikarte" } }, [
        h("span", { class: "qz-fc-inner" }, [
          h("span", { class: "qz-fc-face qz-fc-front", html: face(current, false) }),
          h("span", { class: "qz-fc-face qz-fc-back", html: face(current, true), attrs: { "aria-hidden": "true" } })
        ])
      ]);
      cardBtn.addEventListener("click", function () { setFlip(!flipped); });
      stage.appendChild(cardBtn);
      if (animateIn) animate(cardBtn, "qz-card-in");
      var left = st.q.length;
      status.textContent = "Noch " + left + (left === 1 ? " Karte" : " Karten") + " in diesem Durchgang.";
      renderRate();
    }

    function renderPassDone() {
      rate.innerHTML = "";
      var n = ids.length, sure = sureCount(st, ids), allSure = sure === n;
      var box = h("div", { class: "qz-fc-done" });
      box.appendChild(h("p", { class: "qz-fc-done-title", text: "Durchgang geschafft!" }));
      box.appendChild(h("p", { text: allSure
        ? "Alle " + n + " Karten sitzen sicher. Im nächsten Durchgang wiederholst du alle, damit es so bleibt."
        : "Du hast alle Karten dieses Durchgangs gewusst. Im nächsten Durchgang kommen die Karten, die noch nicht sicher sitzen." }));
      var next = h("button", { class: "btn btn-primary", attrs: { type: "button" }, html: 'Nächster Durchgang <span class="arrow" aria-hidden="true">→</span>' });
      next.addEventListener("click", function () {
        st.pass += 1;
        st.q = buildPass(st, ids);
        save();
        renderCard(true);
        if (cardBtn) cardBtn.focus({ preventScroll: true });
      });
      box.appendChild(next);
      stage.appendChild(box);
      animate(box, "qz-in");
      status.textContent = "Durchgang geschafft.";
    }

    function answer(known) {
      if (!current) return;
      var hadFocus = el.contains(document.activeElement);
      var wasComplete = knownCount(st, ids) === ids.length;
      rateCard(st, current.id, known);
      save();
      var nowComplete = knownCount(st, ids) === ids.length;
      if (nowComplete && !wasComplete) {
        if (!LM.progress.has("karten")) LM.progress.mark("karten");
        LM.toast("Alle Karteikarten mindestens einmal gewusst!");
        LM.celebrate(countEl);
      }
      renderCard(true);
      if (hadFocus) {
        if (cardBtn) cardBtn.focus({ preventScroll: true });
        else { var b = stage.querySelector("button"); if (b) b.focus({ preventScroll: true }); }
      }
    }

    resetBtn.addEventListener("click", function () {
      confirmBox.hidden = false;
      resetBtn.hidden = true;
      confirmBox.querySelector(".qz-fc-yes").focus();
    });
    confirmBox.querySelector(".qz-fc-no").addEventListener("click", function () {
      confirmBox.hidden = true;
      resetBtn.hidden = false;
      resetBtn.focus();
    });
    confirmBox.querySelector(".qz-fc-yes").addEventListener("click", function () {
      st = freshCardState();
      st.q = buildPass(st, ids);
      save();
      confirmBox.hidden = true;
      resetBtn.hidden = false;
      renderCard(true);
      LM.toast("Stapel zurückgesetzt. Alle Karten sind wieder neu.");
      if (cardBtn) cardBtn.focus({ preventScroll: true });
    });

    save();
    renderCard(false);
  });

  /* =====================================================================
     4. quiz: Abschlussquiz (Kapitel 14)
     ===================================================================== */

  LM.widget("quiz", function (el) {
    var N = TOPICS.length, PASS = 8;
    LM.progress.define("quiz", "Abschlussquiz: mindestens " + PASS + " von " + N + " richtig");
    el.classList.add("widget", "qz-quiz");
    var quizHead = widgetHead(el, "Abschlussquiz", '<span class="w-badge">' + N + " Fragen</span>",
      "Eine Frage aus jedem Kapitel von 2 bis 11.");
    quizHead.appendChild(goalLine("quiz", "mindestens " + PASS + " von " + N + " richtig in einem Durchgang."));
    var stage = h("div", { class: "qz-stage" });
    el.appendChild(stage);
    var topicById = {};
    TOPICS.forEach(function (t) { topicById[t.id] = t; });

    var questions = [], idx = 0, results = [], lastIds = [];

    function bestScore() { var b = LM.store.get("quizBest", null); return typeof b === "number" ? b : null; }

    function scrollToStage() {
      var r = stage.getBoundingClientRect();
      if (r.top < 70) {
        try { stage.scrollIntoView({ block: "start", behavior: LM.reduceMotion ? "auto" : "smooth" }); } catch (e) { stage.scrollIntoView(); }
      }
    }

    function intro() {
      stage.innerHTML = "";
      var best = bestScore();
      var box = h("div", { class: "qz-intro" });
      var dots = h("ol", { class: "qz-dots", attrs: { "aria-hidden": "true" } });
      TOPICS.forEach(function () { dots.appendChild(h("li", { class: "qz-dot" })); });
      box.appendChild(dots);
      box.appendChild(h("p", { class: "qz-intro-text", text: "Zehn Fragen, gemischt aus Auswahl- und Rechenfragen. Nimm Papier und Stift dazu. Nach jeder Frage siehst du sofort, ob es stimmt." }));
      if (best !== null) box.appendChild(h("p", { class: "qz-best", html: "Dein Bestwert: <strong>" + best + "/" + N + "</strong>" +
        (best >= PASS ? ' <span class="qz-best-ok">Ziel erreicht</span>' : "") }));
      var go = h("button", { class: "btn btn-primary qz-start", attrs: { type: "button" }, html: 'Quiz starten <span class="arrow" aria-hidden="true">→</span>' });
      go.addEventListener("click", function () { start(); });
      box.appendChild(go);
      stage.appendChild(box);
    }

    function start() {
      questions = sampleQuiz(QUIZ, TOPICS, Math.random, { avoid: lastIds });
      lastIds = questions.map(function (q) { return q.id; });
      idx = 0;
      results = [];
      step(true);
    }

    function dotsEl() {
      var ol = h("ol", { class: "qz-dots", attrs: { "aria-hidden": "true" } });
      questions.forEach(function (q, i) {
        var r = results[i];
        var cls = "qz-dot" + (r ? (r.ok ? " is-ok" : " is-miss") : "") + (i === idx && !r ? " is-cur" : "");
        ol.appendChild(h("li", { class: cls, text: r ? (r.ok ? "✓" : "✗") : "" }));
      });
      return ol;
    }

    function step(focus) {
      stage.innerHTML = "";
      var q = questions[idx], t = topicById[q.topic];
      var dots = dotsEl();
      stage.appendChild(dots);
      var title = h("h4", { class: "qz-qmeta", attrs: { tabindex: "-1" }, html: "Frage " + (idx + 1) + " von " + questions.length +
        ' <span class="' + tagClass(t.tag) + '">Kapitel ' + t.ch + " · " + LM.esc(t.name) + "</span>" });
      stage.appendChild(title);
      var nav = h("div", { class: "qz-nav" });
      var view = renderQuestion(q, {
        onDone: function (r) {
          results[idx] = r;
          var fresh = dotsEl();
          stage.replaceChild(fresh, dots);
          dots = fresh;
          var last = idx === questions.length - 1;
          var next = h("button", { class: "btn btn-primary qz-next", attrs: { type: "button" },
            html: last ? "Ergebnis ansehen" : 'Weiter <span class="arrow" aria-hidden="true">→</span>' });
          next.addEventListener("click", function () {
            idx += 1;
            if (idx < questions.length) step(true); else result();
          });
          nav.appendChild(next);
          next.focus({ preventScroll: true });
          ensureVisible(next);
        }
      });
      stage.appendChild(view.el);
      stage.appendChild(nav);
      animate(view.el, "qz-in");
      if (focus) {
        title.focus({ preventScroll: true });
        scrollToStage();
      }
    }

    function result() {
      stage.innerHTML = "";
      var score = results.filter(function (r) { return r && r.ok; }).length, n = questions.length;
      var best = bestScore(), isNewBest = best === null || score > best;
      if (isNewBest) LM.store.set("quizBest", score);
      var passed = score >= PASS;

      var box = h("div", { class: "qz-result " + (passed ? "is-pass" : "is-fail") });
      var ring = h("div", { class: "qz-ring", attrs: { "aria-hidden": "true" } }, [
        h("span", { class: "qz-ring-num", html: "<span><strong>" + score + "</strong>/" + n + "</span>" })
      ]);
      ring.style.setProperty("--p", String(score / n));
      var heading = h("h4", { class: "qz-result-title", attrs: { tabindex: "-1" }, text: score + " von " + n + " richtig" });
      var textCol = h("div", { class: "qz-result-text" }, [
        heading,
        h("p", { text: quizMessage(score, n) }),
        h("p", { class: "qz-best", html: isNewBest && best !== null ? "Neuer Bestwert! Vorher: " + best + "/" + n
          : "Dein Bestwert: <strong>" + Math.max(score, best === null ? 0 : best) + "/" + n + "</strong>" })
      ]);
      box.appendChild(h("div", { class: "qz-result-top" }, [ring, textCol]));
      var again = h("button", { class: "btn btn-primary", attrs: { type: "button" }, html: '<span aria-hidden="true">↻</span> Neues Quiz' });
      again.addEventListener("click", function () { start(); });
      box.appendChild(h("div", { class: "qz-nav" }, [again]));
      stage.appendChild(box);
      stage.appendChild(dotsEl());

      // Rückblick auf jede Frage
      stage.appendChild(h("h4", { class: "qz-review-title", text: "Alle Fragen im Rückblick" }));
      var list = h("ol", { class: "qz-review" });
      questions.forEach(function (q, i) {
        var r = results[i], t = topicById[q.topic];
        var li = h("li", { class: "qz-rev " + (r.ok ? "is-ok" : "is-miss") });
        li.appendChild(h("p", { class: "qz-rev-head", html: '<span class="qz-rev-mark" aria-hidden="true">' + (r.ok ? "✓" : "✗") + "</span>" +
          '<span class="qz-sr">' + (r.ok ? "Richtig. " : "Falsch. ") + "</span>" +
          '<span class="' + tagClass(t.tag) + '">Kapitel ' + t.ch + " · " + LM.esc(t.name) + "</span>" }));
        li.appendChild(h("p", { class: "qz-rev-q", html: R(q.q, q.data) }));
        var ans = '<span class="qz-rev-k">Deine Antwort:</span> <span class="qz-rev-v' + (r.ok ? " is-ok" : " is-miss") + '">' + r.your + "</span>";
        if (!r.ok) ans += ' <span class="qz-rev-k">Richtig:</span> <span class="qz-rev-v is-ok">' + r.right + "</span>";
        li.appendChild(h("p", { class: "qz-rev-ans", html: ans }));
        li.appendChild(h("p", { class: "qz-rev-ex", html: R(q.ex) }));
        if (!r.ok) li.appendChild(h("p", { class: "qz-rev-link" }, [h("a", { attrs: { href: q.href || t.href },
          html: "Kapitel " + t.ch + " nochmal lesen <span aria-hidden=\"true\">→</span>" })]));
        list.appendChild(li);
      });
      stage.appendChild(list);

      heading.focus({ preventScroll: true });
      scrollToStage();
      if (passed) {
        if (!LM.progress.has("quiz")) LM.progress.mark("quiz");
        LM.celebrate(ring);
      }
    }

    intro();
  });
})(typeof window !== "undefined" ? window : globalThis);
