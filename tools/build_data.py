#!/usr/bin/env python3
"""
SSC CGL 2026 - data builder
Reads the big source JSON (all sets in one file) and writes:
  data/index.js            -> small manifest the hub (index.html) reads
  data/tests/<id>.js       -> one file per set (loaded only when that set is opened)
Usage:  python tools/build_data.py  path/to/cgl__53tests__*.json
Run it again whenever you replace / extend the source JSON (new sets appear automatically).
"""
import json, re, sys, os, datetime

MONTHS = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def parse_id(tid, title):
    m = re.search(r"(\d{1,2})-([A-Z]{3})-(\d{4})(?:-SHIFT-(\d+))?", tid.upper())
    if not m:
        return "", 0, title
    d, mon, y, sh = int(m.group(1)), m.group(2), int(m.group(3)), int(m.group(4) or 0)
    date = datetime.date(y, MONTHS[mon], d)
    return date.isoformat(), sh, f"{d:02d} {mon} {y}" + (f" \u2022 SHIFT {sh:02d}" if sh else "")

def main(src):
    data = json.load(open(src, encoding="utf-8"))
    out_tests = os.path.join(ROOT, "data", "tests")
    os.makedirs(out_tests, exist_ok=True)
    for f in os.listdir(out_tests):
        if f.endswith(".js"):
            os.remove(os.path.join(out_tests, f))
    items, problems = [], []
    for t in data["tests"]:
        tid = t["id"]
        order = t["meta"].get("section_order") or list(t["sections"].keys())
        secs = {}
        for key in order:
            s = t["sections"][key]
            qs = s["questions"]
            for q in qs:
                opts = q.get("options") or {}
                if str(q.get("answer")) not in opts:
                    problems.append(f"{tid} {key} Q{q.get('no')}: answer {q.get('answer')!r} not in options")
                if not (q.get("question") or {}).get("en"):
                    problems.append(f"{tid} {key} Q{q.get('no')}: empty question")
            secs[key] = {"seconds": s.get("time_seconds") or t["timing"]["sectional_seconds"].get(key, 900),
                         "questions": qs}
        body = {
            "id": tid, "title": t["title"], "order": order,
            "marking": t["marking"], "qualifying": t.get("qualifying_sections", []),
            "sections": secs,
        }
        js = "window.CGL_DATA=window.CGL_DATA||{};window.CGL_DATA[%s]=%s;" % (
            json.dumps(tid), json.dumps(body, ensure_ascii=False, separators=(",", ":")))
        open(os.path.join(out_tests, tid + ".js"), "w", encoding="utf-8").write(js)
        date, shift, meta = parse_id(tid, t["title"])
        items.append({"id": tid, "title": t["title"], "date": date, "shift": shift, "meta": meta,
                      "order": order, "counts": {k: len(v["questions"]) for k, v in secs.items()},
                      "seconds": {k: v["seconds"] for k, v in secs.items()},
                      "marking": t["marking"], "qualifying": t.get("qualifying_sections", [])})
    items.sort(key=lambda x: (x["date"], x["shift"], x["id"]))
    idx = {"exam": data.get("category", {}).get("title", "SSC CGL"), "built": datetime.datetime.now().isoformat(timespec="seconds"),
           "tests": items}
    open(os.path.join(ROOT, "data", "index.js"), "w", encoding="utf-8").write(
        "window.CGL_INDEX=" + json.dumps(idx, ensure_ascii=False, separators=(",", ":")) + ";")
    print(f"{len(items)} sets written to data/tests, manifest data/index.js")
    print("data problems:", len(problems))
    for p in problems[:30]:
        print("  -", p)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
