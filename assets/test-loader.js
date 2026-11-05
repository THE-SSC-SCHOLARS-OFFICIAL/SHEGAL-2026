/* test.html?y=2026&s=Full&id=<set id>   -> full mock (4 locked sections)
   test.html?y=2026&s=MATH&id=<set id>   -> sectional (MATH / ENGLISH / REASONING / GK)
   Loads data/tests/<id>.js, builds the questions, then starts the engine. */
(function () {
  var H = window.HubCommon, C = window.HUB_CONFIG;
  var P = new URLSearchParams(location.search);
  var year = P.get("y") || C.year, subject = P.get("s"), id = P.get("id");
  function $(i) { return document.getElementById(i); }

  function fail(msg, sub) {
    $("loadingScreen").classList.add("err");
    $("loadMsg").textContent = msg;
    $("loadSub").textContent = sub || "";
    $("loadBack").style.display = "inline-block";
  }

  var valid = subject === "Full" || (C.sections && C.sections[subject]);
  if (!id || !subject || !valid) {
    fail("This test link is incomplete.", "Open the Mock Hub, choose a test and press Start.");
    return;
  }
  $("loadSub").textContent = subject === "Full" ? "Full mock" : H.secDef(subject).short + " sectional";

  H.loadData(year, subject, id).then(function (json) {
    var found = H.findSet(json, id);
    if (!found) { fail("Test not found.", "\"" + id + "\" is not present in the data. Choose the test again from the Mock Hub."); return; }
    var t = H.buildTest(json, found, year, subject);
    if (!t.questions.length) { fail("This test has no questions.", id); return; }
    window.MOCK_CFG = t.cfg;
    window.MOCK_QUESTIONS = t.questions;
    var sc = document.createElement("script");
    sc.src = "assets/engine.js";
    sc.onload = function () { $("loadingScreen").style.display = "none"; };
    sc.onerror = function () { fail("The test engine could not be loaded.", "assets/engine.js is missing or unreachable."); };
    document.body.appendChild(sc);
  }).catch(function (e) {
    var d = H.describeError(e);
    fail(d.msg, d.sub);
  });
})();
