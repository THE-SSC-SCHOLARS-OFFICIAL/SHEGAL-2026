/* ===== HOTLINK FIX =====
   Question images are hotlinked from sscexams.cbexams.com. That server refuses requests that carry this site's
   address as Referer. 1) every page sends no Referer (<meta name="referrer" content="no-referrer">).
   2) If an image still fails, it is retried once through public image proxies, which fetch it server-side. */
(function () {
  function proxies(u) {
    var e = encodeURIComponent(u);
    return [
      "https://wsrv.nl/?url=" + e,
      "https://images.weserv.nl/?url=" + e
    ];
  }
  document.addEventListener("error", function (ev) {
    var img = ev.target;
    if (!img || img.tagName !== "IMG") return;
    var orig = img.getAttribute("data-orig-src");
    if (!orig) {
      orig = img.getAttribute("src") || "";
      if (!/^https?:\/\/sscexams\.cbexams\.com\//i.test(orig)) return;
      img.setAttribute("data-orig-src", orig);
      img.setAttribute("data-fb", "0");
    }
    var n = parseInt(img.getAttribute("data-fb") || "0", 10);
    var list = proxies(orig);
    if (n >= list.length) return;
    img.setAttribute("data-fb", String(n + 1));
    img.referrerPolicy = "no-referrer";
    img.src = list[n];
  }, true);
})();

/* Shared helpers used by the hub (index.html), the test page (test.html) and the saved page (saved.html).
   SSC CGL 2026: every set lives in data/tests/<set id>.js (made by tools/build_data.py), loaded with a plain <script> tag,
   so the site also works when index.html is simply double-clicked (file://), not only on GitHub Pages. */
(function () {
  var C = window.HUB_CONFIG;
  var SEC = C.sections || {};
  var DEF = C.defaults || { correct: 2, negative: 0.5, sectionSeconds: 900 };

  /* ---------- data loading (script tags) ---------- */
  function ver() { return C.dataVersion ? "?v=" + encodeURIComponent(C.dataVersion) : ""; }
  function loadScript(url, ok) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = function () { var v = ok(); if (v) resolve(v); else { var e = new Error("Bad data file"); e.url = url; reject(e); } };
      s.onerror = function () { var e = new Error("Not found"); e.status = 404; e.url = url; reject(e); };
      document.head.appendChild(s);
    });
  }
  /* manifest: { tests:[{id,title,date,shift,meta,order,counts,seconds,marking}] } */
  function loadIndex() {
    if (window.CGL_INDEX) return Promise.resolve(window.CGL_INDEX);
    return loadScript(C.dataDir + "/index.js" + ver(), function () { return window.CGL_INDEX; });
  }
  /* one set: the engine data of a single mock (all four sections) */
  function loadData(year, subject, setId) {
    var id = String(setId || "");
    window.CGL_DATA = window.CGL_DATA || {};
    if (window.CGL_DATA[id]) return Promise.resolve(window.CGL_DATA[id]);
    return loadScript(C.dataDir + "/tests/" + encodeURIComponent(id) + ".js" + ver(), function () { return window.CGL_DATA[id]; });
  }
  function describeError(e) {
    if (e && e.status === 404) {
      return { msg: "This test file was not found.",
               sub: "Run \"python tools/build_data.py <your json>\" and upload the data folder (missing: " + (e.url || "") + ")." };
    }
    return { msg: "The data could not be loaded.", sub: String((e && e.message) || e) };
  }

  /* ---- progress (saved test state in localStorage) ---- */
  function storageKey(year, subject, setId) { return "sscscholars_hub_" + year + "_" + subject + "_" + setId; }

  function readStatus(year, subject, setId) {
    try {
      var raw = localStorage.getItem(storageKey(year, subject, setId));
      if (!raw) return null;
      var s = JSON.parse(raw).s;
      if (!s) return null;
      if (s.phase === "submitted" && s.result) return { kind: "done", score: s.result.score, max: s.result.maxMarks };
      if (s.phase === "testing" || s.phase === "paused") return { kind: "progress", left: s.timeLeft, sec: s.secIdx || 0 };
      return null;
    } catch (e) { return null; }
  }


  function findSet(json, setId) { return json && json.id === setId ? { test: json } : null; }

  function secDef(key) {
    var d = SEC[key] || {};
    return { name: d.name || key, short: d.short || key };
  }

  function fmtScore(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return "";
    return String(Math.round(n * 100) / 100);
  }

  function minutesFromLabel(label) {
    var m = String(label || "").match(/(\d+)/);
    return m ? parseInt(m[1], 10) * 60 : 0;
  }

  /* Relative image paths (when images were downloaded locally) are resolved against the data folder */
  var IMG_RE = /(<img\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi;
  /* Some questions arrive with their HTML tags escaped (&lt;span class=&quot;math-tex&quot;&gt;) and would
     show up as visible text. This turns only genuine HTML tags back into tags and leaves math symbols
     such as "x &lt; y" untouched. */
  /* Text in the data is sometimes escaped twice (&amp;#39; &amp;nbsp; &amp;quot; &amp;times; ...), so the
     browser shows "&#39;" or "&nbsp;" literally. Turn every double-escaped entity back into a normal one;
     the browser then decodes it. A plain "&amp;" followed by a space or letter (e.g. "Profit &amp; Loss") is untouched. */
  var DBL_ENT = /&amp;(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;
  function undouble(html) {
    for (var i = 0; i < 3 && html.indexOf("&amp;") !== -1; i++) {
      var n = html.replace(DBL_ENT, "&$1;");
      if (n === html) break;
      html = n;
    }
    return html;
  }
  /* Plain-text fields (chapter names, titles, topics): decode all entities to real characters */
  var _ta = null;
  function decodeText(s) {
    if (s == null) return "";
    s = String(s);
    if (s.indexOf("&") === -1) return s;
    s = undouble(s);
    if (!_ta) _ta = document.createElement("textarea");
    _ta.innerHTML = s;
    return _ta.value;
  }

  var ESC_TAG = /&lt;(\/?)(span|p|br|b|i|u|em|strong|sub|sup|img|div|font|table|thead|tbody|tr|td|th|ul|ol|li|h[1-6])((?:\s[^<>]*?)?)(\/?)&gt;/gi;
  function unescapeTags(html) {
    if (!html) return "";
    html = undouble(html);
    if (html.indexOf("&lt;") === -1) return html;
    return html.replace(ESC_TAG, function (m, slash, tag, attrs, selfc) {
      attrs = attrs.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&");
      return "<" + slash + tag + attrs + selfc + ">";
    });
  }

  function fixSrc(html) {
    html = unescapeTags(html);
    if (!html || html.toLowerCase().indexOf("<img") === -1) return html || "";
    var base = (C.imagesBase || (C.dataDir + "/"));
    return html.replace(IMG_RE, function (m, head, q, u) {
      if (/^(https?:|data:|\/\/|\/)/i.test(u)) return m;
      return head + q + base + u.replace(/^\.\//, "") + q;
    });
  }
  function fixUrl(u) {
    if (!u || /^(https?:|data:|\/\/|\/)/i.test(u)) return u || "";
    return (C.imagesBase || (C.dataDir + "/")) + u.replace(/^\.\//, "");
  }
  function withImg(html, url) {
    html = html || "";
    if (!url || html.indexOf(url) !== -1) return html;
    return html + '<br><img src="' + url + '" alt="">';
  }


  /* one question of the CGL JSON -> the shape the engine understands */
  function normQ(q, i, cs, ns) {
    var raw = q.options || {}, opts = {};
    for (var n = 1; n <= 5; n++) {
      var v = raw[String(n)];
      if (!v) continue;
      if (typeof v === "string") v = { en: v, hi: "" };
      opts["option_" + n] = { en: fixSrc(v.en || ""), hi: v.hi ? fixSrc(v.hi) : "", image: "" };
    }
    var qq = q.question || {}, sol = q.solution || {}, mk = q.marks || {};
    var ans = String(q.answer == null ? "" : q.answer).trim().replace(/^option[_\s]?(\d+)$/i, "$1");
    return {
      q_no: i + 1,
      id: String(q.quid || q.local_id || ""),
      topic: decodeText(q.topic),
      question: { en: fixSrc(qq.en || ""), hi: qq.hi ? fixSrc(qq.hi) : "" },
      question_image: "",
      options: opts,
      answer: ans,
      correct_score: mk.correct != null ? mk.correct : cs,
      negative_score: mk.negative != null ? mk.negative : ns,
      solution_text: { en: fixSrc(sol.en || ""), hi: sol.hi ? fixSrc(sol.hi) : "" },
      solution_image: ""
    };
  }

  /* subject = "Full"  -> full mock: all sections of the JSON, in JSON order, locked one after the other
     subject = "MATH" (or ENGLISH / REASONING / GK) -> sectional: only that section */
  function buildTest(json, found, year, subject) {
    var t = found.test, mk = t.marking || {};
    var cs = mk.correct != null ? mk.correct : DEF.correct, ns = mk.negative != null ? mk.negative : DEF.negative;
    var keys = subject === "Full" ? (t.order || Object.keys(t.sections)) : [subject];
    var questions = [], sections = [], start = 0, total = 0;
    keys.forEach(function (key) {
      var s = t.sections[key];
      if (!s) return;
      var def = secDef(key), secs = parseInt(s.seconds, 10) || DEF.sectionSeconds, n = s.questions.length;
      s.questions.forEach(function (q) { questions.push(normQ(q, questions.length, cs, ns)); });
      sections.push({ key: key, name: def.name, short: def.short, part: 1,
        qualifying: (t.qualifying || []).indexOf(key) !== -1,
        start: start, end: start + n, count: n, seconds: secs, minutes: Math.round(secs / 60 * 100) / 100 });
      start += n; total += secs;
    });
    var isFull = subject === "Full";
    var sectionName = isFull ? "" : secDef(subject).short;
    var title = String(t.title || t.id).toUpperCase().replace(/^CGL\b/, "SSC CGL");
    return {
      cfg: {
        examTitle: title + (isFull ? " - FULL MOCK" : " - " + sectionName.toUpperCase() + " SECTIONAL"),
        sectionLabel: isFull ? "Full Mock" : sectionName + " Sectional",
        storageKey: storageKey(year, subject, t.id),
        year: String(year), subject: subject, setId: t.id,
        chapterName: isFull ? "" : sectionName,
        setTitle: String(t.title || t.id) + (isFull ? "" : " - " + sectionName),
        flat: true,                       /* no Part 1/2/3 structure in the tables */
        single: !isFull,                  /* sectional = one section, one timer */
        sections: sections, totalTimeSeconds: total,
        correctScoreDisplay: fmtScore(cs), negativeScoreDisplay: fmtScore(ns),
        defaultCorrectScore: cs, defaultNegativeScore: ns
      },
      questions: questions
    };
  }

  /* numbers for the hub cards: how long / how many / how many marks */
  function summaryOf(entry, subject) {
    var mk = entry.marking || {}, cs = mk.correct != null ? mk.correct : DEF.correct;
    var keys = subject === "Full" ? entry.order : [subject], q = 0, sec = 0;
    keys.forEach(function (k) { q += (entry.counts || {})[k] || 0; sec += (entry.seconds || {})[k] || DEF.sectionSeconds; });
    return { questions: q, seconds: sec, marks: q * cs };
  }

  /* ---- Saved (bookmarked) questions: kept in this browser only ---- */
  var SAVED_KEY = "sscscholars_saved_v1";
  function readSaved() {
    try { var a = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeSaved(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function savedId(year, subject, setId, idx) { return year + "|" + subject + "|" + setId + "|" + idx; }
  function addSaved(entry) {
    var list = readSaved().filter(function (x) { return x.id !== entry.id; });
    list.push(entry);
    return writeSaved(list);
  }
  function removeSaved(id) {
    return writeSaved(readSaved().filter(function (x) { return x.id !== id; }));
  }
  function countSaved() { return readSaved().length; }

  /* ---- Attempt history: every submitted attempt of a test is kept (no limit), reviewable from the hub ---- */
  function attemptsKey(year, subject, setId) { return "sscscholars_hub_attempts_" + year + "_" + subject + "_" + setId; }
  function readAttemptsRaw(key) {
    try { var a = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function getAttempts(year, subject, setId) {
    var key = attemptsKey(year, subject, setId), list = readAttemptsRaw(key);
    /* attempts submitted before this feature existed: pick up the saved result as an attempt */
    try {
      var cur = JSON.parse(localStorage.getItem(storageKey(year, subject, setId)) || "null");
      if (cur && cur.s && cur.s.phase === "submitted" && cur.s.finishedAt) {
        var id = String(cur.s.finishedAt);
        if (!list.some(function (a) { return a.id === id; })) {
          list.push({ id: id, at: cur.s.finishedAt, n: cur.n, s: cur.s });
          try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
        }
      }
    } catch (e) {}
    return list.slice().sort(function (a, b) { return a.at - b.at; });
  }
  function addAttempt(year, subject, setId, n, snapshot) {
    var key = attemptsKey(year, subject, setId), list = readAttemptsRaw(key);
    var at = snapshot.finishedAt || Date.now(), id = String(at);
    list = list.filter(function (a) { return a.id !== id; });
    list.push({ id: id, at: at, n: n, s: snapshot });
    try { localStorage.setItem(key, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function getAttempt(year, subject, setId, attemptId) {
    var list = getAttempts(year, subject, setId);
    for (var i = 0; i < list.length; i++) if (list[i].id === String(attemptId)) return { attempt: list[i], number: i + 1 };
    return null;
  }
  function fmtAttemptDate(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " +
      d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }


  window.HubCommon = {
    loadIndex: loadIndex, loadData: loadData, describeError: describeError,
    storageKey: storageKey, readStatus: readStatus, findSet: findSet, buildTest: buildTest, summaryOf: summaryOf, secDef: secDef,
    getAttempts: getAttempts, addAttempt: addAttempt, getAttempt: getAttempt, fmtAttemptDate: fmtAttemptDate,
    readSaved: readSaved, addSaved: addSaved, removeSaved: removeSaved, savedId: savedId, countSaved: countSaved,
    unescapeTags: unescapeTags, decodeText: decodeText, fmtScore: fmtScore
  };
})();
