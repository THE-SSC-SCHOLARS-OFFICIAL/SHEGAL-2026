/* ===== SSC CGL 2026 mock settings ===== */
window.HUB_CONFIG = {
  brand: "THE SSC SCHOLARS OFFICIAL",
  year: "2026",

  /* data/index.js (manifest) and data/tests/<set id>.js are made by:  python tools/build_data.py <source.json>
     Change dataVersion (1 -> 2 -> 3) whenever you rebuild the data, so browsers do not keep an old cached copy. */
  dataDir: "data",
  dataVersion: "3",

  /* Timing, marking and section order come from the JSON itself.
     These are only the fall-backs when the JSON does not say. */
  defaults: { correct: 2, negative: 0.5, sectionSeconds: 900 },

  /* Section names. Key = section key used inside the JSON. */
  sections: {
    REASONING: { name: "Reasoning",             short: "Reasoning", sub: "Verbal and analytical reasoning, coding-decoding, series" },
    GK:        { name: "General Awareness",     short: "GK",        sub: "GK, current affairs, static awareness and science" },
    MATH:      { name: "Quantitative Aptitude", short: "Maths",     sub: "Arithmetic, algebra, geometry and data interpretation" },
    ENGLISH:   { name: "English",               short: "English",   sub: "Comprehension, grammar, vocabulary and error spotting" }
  },

  /* "subjects" = storage / saved-question groups. Full = full mock, the others = sectionals. */
  subjects: [
    { key: "Full",      label: "Full Mocks" },
    { key: "MATH",      label: "Maths Sectional" },
    { key: "ENGLISH",   label: "English Sectional" },
    { key: "REASONING", label: "Reasoning Sectional" },
    { key: "GK",        label: "GK Sectional" }
  ],
  years: ["2026"]
};
