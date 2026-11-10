/*
 * Pure-function tests for _ankivoice.js.
 *
 * The bulk of the plugin depends on AnkiDroid's WebView JS API and can only be
 * verified on a device. But the text/interval/vocab logic is pure and testable.
 * This harness extracts those functions from ../_ankivoice.js (so tests always
 * run against the real source) and exercises them with a tiny DOM shim.
 *
 *   node test/test.js
 *
 * Exits non-zero on any failure.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "_ankivoice.js"), "utf8");
const changelog = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

// --- pull a top-level `function NAME(...) { ... }` out of the source ---
// Brace-matched rather than regex-terminated, so one-line helpers and nested
// blocks both come out whole. (Assumes no braces inside string/regex literals
// in the extracted functions; if that ever changes, eval below fails loudly.)
function grab(name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("could not find function " + name);
  const open = src.indexOf("{", start);
  if (open < 0) throw new Error("could not find body of " + name);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { i++; break; }
  }
  if (depth !== 0) throw new Error("unbalanced braces in " + name);
  return src.slice(start, i);
}
function grabVar(name) {
  const m = src.match(new RegExp("var " + name + " = [\\s\\S]*?;\\n"));
  if (!m) throw new Error("could not extract var " + name);
  return m[0];
}

// Evaluate the extracted pieces in this scope. `CFG` is provided per-test.
let CFG = {};
eval(grabVar("AV_BLOCK"));
eval(grabVar("AV_UNITS"));
eval(grabVar("AV_PUNCT"));
eval(grabVar("AV_STOPWORDS"));
eval(grabVar("AV_LANGS"));
eval(grabVar("AV_LANG_ALIAS"));
eval(grabVar("AV_L10N"));
eval(grab("langAttr"));
eval(grab("isReplayButton"));
eval(grab("textPieces"));
eval(grab("lineTidy"));
eval(grab("extractLangLines"));
eval(grab("normLang"));
eval(grab("templateLangs"));
eval(grab("sideLang"));
eval(grab("speechSegments"));
eval(grab("resolveCmdLang"));
eval(grab("textWithBreaks"));
eval(grab("extractLines"));
eval(grab("speechJoin"));
eval(grab("subtractLines"));
eval(grab("normalize"));
eval(grab("spellKey"));
eval(grab("contentWords"));
eval(grab("hasAll"));
eval(grab("answerMatches"));
eval(grab("anyAnswerMatches"));
eval(grab("answerAttempts"));
eval(grab("expandIvl"));
eval(grab("unwrapValue"));
eval(grab("said"));

// --- tiny DOM node shim (nodeType 1 = element, 3 = text) ---
const E = (tag, kids, id) => ({ nodeType: 1, tagName: tag.toUpperCase(), id: id || "", childNodes: kids || [] });
const T = (text) => ({ nodeType: 3, nodeValue: text });
const heardOf = (t) => " " + t.toLowerCase() + " ";

let passed = 0;
function ok(label, cond) {
  assert.ok(cond, "FAILED: " + label);
  passed++;
}
function eq(label, a, b) {
  assert.deepStrictEqual(a, b, "FAILED: " + label + "\n  got:      " + JSON.stringify(a) + "\n  expected: " + JSON.stringify(b));
  passed++;
}

// ---------------- interval -> speech ----------------
eq("expandIvl 16m", expandIvl("16m"), "16 minutes");
eq("expandIvl 1d", expandIvl("1d"), "1 day");
eq("expandIvl <4m", expandIvl("<4m"), "less than 4 minutes");
eq("expandIvl 1.6mo", expandIvl("1.6mo"), "1.6 months");
eq("expandIvl 1y", expandIvl("1y"), "1 year");
eq("expandIvl zero-width", expandIvl("16​m"), "16 minutes");
eq("unwrapValue raw json", unwrapValue('{"success":true,"value":"10m"}'), "10m");
eq("unwrapValue bare", unwrapValue("10m"), "10m");
eq("unwrapValue object", unwrapValue({ success: true, value: "true" }), "true");
eq("unwrapValue false-ish", unwrapValue({ success: true, value: false }), "");

// ---------------- line-break -> pause ----------------
eq("br makes pause", speechJoin(extractLines(E("div", [T("Red"), E("br"), T("Blue")]))), "Red. Blue.");
eq("paragraphs pause", speechJoin(extractLines(E("div", [E("p", [T("A")]), E("p", [T("B")])]))), "A. B.");
eq("no phantom pause on inline whitespace",
   speechJoin(extractLines(E("div", [E("span", [T("foo")]), T("\n     "), E("span", [T("bar")])]))), "foo bar.");
eq("existing punctuation kept", speechJoin(extractLines(E("div", [T("apples,"), E("br"), T("oranges")]))), "apples, oranges.");
// table cells are separate spoken lines, not one run-on phrase
eq("table cells pause",
   speechJoin(extractLines(E("table", [E("tr", [E("td", [T("Paris")]), E("td", [T("France")])])]))),
   "Paris. France.");

// <small> and our own av-* UI are excluded from spoken text
eq("small + av-* excluded",
   extractLines(E("body", [
     E("div", [T("Q text")]),
     E("small", [T("hidden hint")]),
     E("div", [T("⚙")], "av-gear"),
     E("div", [T("AnkiVoice")], "av-root"),
   ])),
   ["Q text"]);

// ---------------- answer = card minus question ----------------
(() => {
  const front = E("div", [E("div", [T("FLAG")]), E("div", [T("hint.")])]);
  const back = E("div", [E("div", [T("Mali")]), E("hr", [], "answer"), E("div", [T("FLAG")]), E("div", [T("hint.")])]);
  eq("answer above hr (Ultimate Geography)",
     subtractLines(extractLines(back), extractLines(front)), ["Mali"]);
})();
(() => {
  const front = E("div", [T("Capital of BC?")]);
  const back = E("div", [T("Capital of BC?"), E("hr", [], "answer"), T("Victoria")]);
  eq("standard FrontSide layout",
     subtractLines(extractLines(back), extractLines(front)), ["Victoria"]);
})();

// ---------------- normalization ----------------
eq("normalize folds accents", normalize("Café"), "cafe");
eq("normalize strips punctuation", normalize("OK, yes!"), "ok yes");
eq("normalize keeps other scripts", normalize("Привет"), "привет");
eq("normalize keeps digits", normalize("Room 101."), "room 101");

// ---------------- spoken-answer matching (conservative) ----------------
ok("answerMatches exact", answerMatches("bamako", ["Bamako"]) === true);
ok("answerMatches wrong", answerMatches("mali", ["Bamako"]) === false);
ok("answerMatches not-in-long-sentence", answerMatches("guinea", ["Flag similar to Guinea and red flipped darker"]) === false);
ok("answerMatches accent-insensitive", answerMatches("cafe", ["Café"]) === true);

// Filler words are ignored, so an adequate answer need not be word-perfect.
eq("contentWords drops filler", contentWords("the capital is Bamako"), ["capital", "bamako"]);
eq("contentWords survives an all-filler answer", contentWords("the"), ["the"]);
ok("hasAll is a subset test", hasAll(["a", "b", "c"], ["c", "a"]) === true);
ok("hasAll rejects a missing word", hasAll(["a", "b"], ["a", "z"]) === false);

// Tier 1: you said at least every content word of the answer. Always accepted,
// at any coverage setting, because nothing is missing.
ok("filler added around the answer", answerMatches("it's Bamako", ["Bamako"]) === true);
ok("a whole sentence containing the answer", answerMatches("the capital is Bamako", ["Bamako"]) === true);
ok("leading article on the card", answerMatches("mitochondria", ["The mitochondria"]) === true);
ok("tier 1 ignores the coverage setting", answerMatches("it's Bamako", ["Bamako"], 0) === true);

// Tier 2: only PART of the answer, gated on how much of it you covered.
(() => {
  const book = ["Harry Potter and the Goblet of Fire"];   // 4 content words
  ok("half the title is rejected at the cautious default", answerMatches("goblet of fire", book, 60) === false);
  ok("...and accepted when lowered to 50", answerMatches("goblet of fire", book, 50) === true);
  // the reason the default is cautious: nothing distinguishes these two halves
  ok("the WRONG half is equally accepted at 50", answerMatches("harry potter", book, 50) === true);
  ok("...and equally rejected at 60", answerMatches("harry potter", book, 60) === false);
  ok("partial matching off entirely", answerMatches("goblet of fire", book, 0) === false);
})();
eq("two of three content words clears 60%",
   answerMatches("united states", ["The United States of America"], 60), true);

// Coverage alone keeps a lone word out of a long descriptive answer: 1 of 6
// content words is 17%, below any sane threshold, so no extra minimum-length
// rule is needed. Set the threshold below 17 and it does match - which is
// exactly what the number is for.
(() => {
  const flag = ["Flag similar to Guinea and red flipped darker"];
  ok("a lone word in a long answer is rejected at the default", answerMatches("guinea", flag, 60) === false);
  ok("...and at a lenient 50", answerMatches("guinea", flag, 50) === false);
  ok("...and at 20, just above its 17%", answerMatches("guinea", flag, 20) === false);
  ok("...but 10 lets it through, as the setting promises", answerMatches("guinea", flag, 10) === true);
})();

// ---------------- spelling variants of the same spoken word (v38) ----------------
// The recognizer has to pick one spelling; the card may use another. Reported
// case: "billy elliott" was rejected for "Billy Elliot".
[
  ["billy elliott", "Billy Elliot"],            // the reported case: doubled letter
  ["phillip", "Philip"], ["mathew", "Matthew"], ["alan", "Allan"],
  ["the color purple", "The Colour Purple"],    // -our / -or
  ["national theater", "National Theatre"],     // -re / -er
  ["realize", "Realise"], ["organization", "Organisation"],   // -ise / -ize
  ["catalog", "Catalogue"], ["program", "Programme"], ["gray", "Grey"],
].forEach(([said, card]) =>
  ok("spelling variant accepted: \"" + said + "\" for \"" + card + "\"", answerMatches(said, [card]) === true));

// ...but NOT by edit distance. In a geography deck the classic wrong answers are
// exactly as close to the right ones as Elliott is to Elliot, and a false match
// silently grades a wrong answer Good. These must stay rejected.
[
  ["gambia", "Zambia"], ["iceland", "Ireland"], ["iran", "Iraq"], ["mali", "Bali"],
  ["slovakia", "Slovenia"], ["austria", "Australia"], ["niger", "Nigeria"],
  ["sweden", "Swedes"], ["four", "Tour"],
].forEach(([said, card]) =>
  ok("one-letter-different WRONG answer rejected: \"" + said + "\" for \"" + card + "\"",
     answerMatches(said, [card]) === false));

// The known, accepted cost: different words that differ only by a doubled letter
// now match too. They SOUND different, so answering one for the other is an
// unlikely quiz mistake - unlike Gambia/Zambia. Pinned here so it stays a
// conscious choice rather than a surprise.
ok("known cost: diner matches Dinner", answerMatches("diner", ["Dinner"]) === true);
eq("spellKey leaves short words alone", [spellKey("four"), spellKey("acre"), spellKey("rise")], ["four", "acre", "rise"]);

// The recognizer returns competing hypotheses. Each must be tested on its own:
// concatenating them (pre-v29) produced a phrase that matched nothing.
(() => {
  const hyps = ["bamboo", "bamako", "bam ako"];
  ok("anyAnswerMatches picks the right hypothesis", anyAnswerMatches(hyps, ["Bamako"]) === true);
})();
// Joining the hypotheses is still wrong, though the v31 matcher changed HOW.
// It used to make a phrase that matched nothing; now it pools every guess's
// words together, so the pool can satisfy an answer that no single guess does.
(() => {
  const answer = ["Red Flag"];
  const hyps = ["red", "flag balloon"];
  ok("no single hypothesis is good enough", anyAnswerMatches(hyps, answer, 60) === false);
  ok("...but their pooled words would falsely match", answerMatches(hyps.join(" "), answer, 60) === true);
  ok("anyAnswerMatches stays wrong when it should", anyAnswerMatches(["mali", "molly"], ["Bamako"]) === false);
})();

// ---------------- the spoken-answer length gate ----------------
// The v31 report: "the Half Blood Prince" is four words, the limit defaulted to
// three, so it was dropped with no feedback at all.
(() => {
  const heard = ["the Half Blood Prince"];
  const tight = answerAttempts(heard, 3);
  eq("a 4-word answer fails a limit of 3", tight.attempts, []);
  eq("...and is reported as too long", tight.tooLongWords, 4);
  eq("...with the text, so the UI can show it", tight.tooLongText, "the half blood prince");

  const roomy = answerAttempts(heard, 8);
  eq("the same answer passes the v31 default of 8", roomy.attempts, ["the half blood prince"]);
  eq("nothing is reported as too long", roomy.tooLongWords, 0);
})();
(() => {
  // per hypothesis, so a long alternative never suppresses a short one
  const mixed = answerAttempts(["bamako", "bam ako well now then please"], 3);
  eq("short hypotheses survive a long sibling", mixed.attempts, ["bamako"]);
  eq("the long sibling is still reported", mixed.tooLongWords, 6);
})();
eq("empty hypotheses are ignored", answerAttempts(["", "   "], 8).attempts, []);
eq("punctuation does not inflate the word count",
   answerAttempts(["The Goblet of Fire!"], 4).attempts, ["the goblet of fire"]);
(() => {
  // the shipped default must actually clear a realistic long answer
  const def = /maxAnswerWords:\s*(\d+)/.exec(src);
  ok("maxAnswerWords has a default", !!def);
  const title = "Harry Potter and the Goblet of Fire";   // 7 words
  ok("the default clears a 7-word title",
     answerAttempts([title], Number(def[1])).attempts.length === 1);
})();

// ---------------- editable command vocab ----------------
CFG = { words_hard: "hard, harder, heart", words_answer: "answer, reveal", words_good: "good, yes" };
ok("said built-in hard", said(heardOf("hard"), "hard") === true);
ok("said homophone heart", said(heardOf("heart"), "hard") === true);
ok("said reveal->answer", said(heardOf("reveal"), "answer") === true);
ok("said no false match", said(heardOf("banana"), "hard") === false);
ok("said accepts a hypothesis array", said(["art", "heart"], "hard") === true);
ok("said array with no match", said(["banana", "bandana"], "hard") === false);
ok("said tolerates punctuation", said(["Hard."], "hard") === true);
ok("said tolerates case", said(["HARD"], "hard") === true);
CFG = { words_hard: "hard, harv, hard one" };
ok("said user-added word", said(heardOf("harv"), "hard") === true);
ok("said user-added phrase", said(heardOf("hard one"), "hard") === true);
// a multi-word trigger must live inside ONE hypothesis, not be stitched across two
CFG = { words_hard: "hard one" };
ok("said matches a phrase within one hypothesis", said(["hard one"], "hard") === true);
ok("said does not stitch hypotheses", said(["hard", "one"], "hard") === false);
CFG = { words_hard: "  hard , , heart  " };
ok("said ignores blank vocab entries", said(heardOf("heart"), "hard") === true);
ok("said blank entry matches nothing", said(heardOf("banana"), "hard") === false);

// ---------------- the README's documented behaviour is the real behaviour ----
// Both tables are generated by tools/gen_answer_tables.js; every row is
// re-derived here, so changing the matcher without regenerating fails the suite.
function tableBetween(startMarker, endMarker) {
  const a = readme.indexOf(startMarker);
  const b = readme.indexOf(endMarker);
  ok("README contains " + startMarker, a >= 0 && b > a);
  return readme.slice(a, b).split("\n")
    .filter((l) => l.trim().startsWith("|") && !/^\|[\s-]*\|[\s-]*\|/.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
}
(() => {
  const rows = tableBetween("<!-- ANSWER-CASES:START", "<!-- ANSWER-CASES:END");
  let answer = null, checked = 0;
  for (const cells of rows) {
    if (cells[0] === "The card's answer") continue;           // header
    const m = /\*\*(.+?)\*\*/.exec(cells[0]);
    if (m) answer = m[1];
    if (!answer || cells.length < 5) continue;
    const [, attempt, , at60, at50] = cells;
    assert.strictEqual(answerMatches(attempt, [answer], 60), at60 === "yes",
      "README row wrong at 60%: \"" + attempt + "\" vs \"" + answer + "\"");
    assert.strictEqual(answerMatches(attempt, [answer], 50), at50 === "yes",
      "README row wrong at 50%: \"" + attempt + "\" vs \"" + answer + "\"");
    checked++;
  }
  ok("every documented example row matches the matcher (" + checked + " rows)", checked >= 20);
})();
(() => {
  // the "how much must I say" table, re-derived with synthetic content words
  const WORDS = "alpha bravo charlie delta echo foxtrot golf hotel".split(" ");
  const need = (cell) => (/^all (\d+)$/.exec(cell) ? Number(/^all (\d+)$/.exec(cell)[1])
                                                   : Number(/^(\d+) of \d+$/.exec(cell)[1]));
  const rows = tableBetween("<!-- ANSWER-QUICK:START", "<!-- ANSWER-QUICK:END");
  let checked = 0;
  for (const cells of rows) {
    if (!/^\d+$/.test(cells[0])) continue;                   // skip the header
    const n = Number(cells[0]);
    const answer = WORDS.slice(0, n).join(" ");
    [[60, cells[1]], [50, cells[2]], [80, cells[3]]].forEach(([pct, cell]) => {
      const k = need(cell);
      ok("n=" + n + " at " + pct + "%: saying " + k + " is enough",
         answerMatches(WORDS.slice(0, k).join(" "), [answer], pct) === true);
      if (k > 1) {
        ok("n=" + n + " at " + pct + "%: saying " + (k - 1) + " is not",
           answerMatches(WORDS.slice(0, k - 1).join(" "), [answer], pct) === false);
      }
      checked++;
    });
  }
  ok("the quick-reference table was checked (" + checked + " cells)", checked >= 20);
})();

// ---------------- languages: locale normalization ----------------
// An element with attributes, for the lang-aware walker.
const EL = (tag, kids, attrs) => ({
  nodeType: 1, tagName: tag.toUpperCase(), id: (attrs && attrs.id) || "", childNodes: kids || [],
  getAttribute: (n) => (attrs && n in attrs ? attrs[n] : null),
});
eq("normLang keeps a full tag", normLang("ja-JP"), "ja-JP");
eq("normLang accepts Anki's underscore form", normLang("ja_JP"), "ja-JP");
eq("normLang fixes case", normLang("JA-jp"), "ja-JP");
eq("normLang gives a bare language its usual region", normLang("ja"), "ja-JP");
eq("normLang: bare en is en-US, not en-GB", normLang("en"), "en-US");
eq("normLang: bare de is de-DE", normLang("de"), "de-DE");
eq("normLang: bare pt is pt-BR", normLang("pt"), "pt-BR");
eq("normLang keeps an explicit region", normLang("pt_PT"), "pt-PT");
eq("normLang trims", normLang("  fr-CA "), "fr-CA");
eq("normLang keeps a script subtag", normLang("zh_hant_tw"), "zh-Hant-TW");
eq("normLang: script only", normLang("zh-Hans"), "zh-Hans");
eq("normLang: numeric region", normLang("es-419"), "es-419");
eq("normLang: unknown language passes through bare", normLang("th"), "th");
eq("normLang: three-letter language", normLang("fil_PH"), "fil-PH");
eq("normLang: tl is listed by engines as fil", normLang("tl"), "fil-PH");
eq("normLang: legacy iw is he", normLang("iw-IL"), "he-IL");
eq("normLang drops variants and extensions", normLang("en-US-x-private"), "en-US");
eq("normLang rejects junk", normLang("japanese"), "");
eq("normLang rejects auto", normLang("auto"), "");
eq("normLang rejects empty", normLang(""), "");
eq("normLang rejects null", normLang(null), "");
eq("normLang rejects undefined", normLang(undefined), "");

// ---------------- languages: template declaration ----------------
eq("templateLangs: object form", templateLangs({ front: "ja", back: "en_US" }), { front: "ja-JP", back: "en-US", stt: "" });
eq("templateLangs: string form covers both sides", templateLangs("de"), { front: "de-DE", back: "de-DE", stt: "" });
eq("templateLangs: recognition override", templateLangs({ stt: "pt_BR" }), { front: "", back: "", stt: "pt-BR" });
eq("templateLangs: nothing declared", templateLangs(undefined), { front: "", back: "", stt: "" });
eq("templateLangs: a typo is ignored, not passed on", templateLangs({ front: "japanese", back: "en-US" }), { front: "", back: "en-US", stt: "" });

// ---------------- languages: precedence ----------------
(() => {
  const tpl = templateLangs({ front: "ja-JP", back: "en-US" });
  eq("template beats global (front)", sideLang(tpl, "front", "fr-FR"), { lang: "ja-JP", src: "template" });
  eq("template beats global (back)", sideLang(tpl, "back", "fr-FR"), { lang: "en-US", src: "template" });
  eq("global is the fallback", sideLang(templateLangs(null), "front", "fr-FR"), { lang: "fr-FR", src: "global" });
  eq("a side the template leaves out falls back to global, not to the other side",
     sideLang(templateLangs({ front: "ja-JP" }), "back", "fr-FR"), { lang: "fr-FR", src: "global" });
  eq("a broken global falls back to en-US", sideLang(templateLangs(null), "front", "???"), { lang: "en-US", src: "global" });

  const front = sideLang(tpl, "front", "fr-FR");
  // attribute > template
  const card = EL("div", [EL("div", [T("neko "), EL("span", [T("\u732B")], { lang: "zh" }), T(" desu")])]);
  eq("a lang attribute beats the template for its chunk only",
     speechSegments(extractLangLines(card), front),
     [{ lang: "ja-JP", src: "template", text: "neko" },
      { lang: "zh-CN", src: "attribute", text: "\u732B" },
      { lang: "ja-JP", src: "template", text: "desu." }]);
  // attribute > global
  eq("a lang attribute beats the global setting",
     speechSegments(extractLangLines(EL("div", [EL("p", [T("hola")], { lang: "es" })])), sideLang(templateLangs(null), "front", "en-US")),
     [{ lang: "es-ES", src: "attribute", text: "hola." }]);
  eq("an unusable lang attribute is ignored",
     speechSegments(extractLangLines(EL("div", [EL("p", [T("hello")], { lang: "klingon" })])), front),
     [{ lang: "ja-JP", src: "template", text: "hello." }]);
})();

// ---------------- languages: chunk splitting by lang ----------------
(() => {
  const def = { lang: "en-US", src: "global" };
  const lines = (root) => extractLangLines(root);
  eq("no lang attributes: one run per line",
     lines(EL("div", [EL("div", [T("one")]), EL("div", [T("two")])])),
     [{ text: "one", runs: [{ t: "one", lang: "" }] }, { text: "two", runs: [{ t: "two", lang: "" }] }]);
  eq("no lang attributes: the whole side is ONE utterance, as before",
     speechSegments(lines(EL("div", [EL("div", [T("one")]), EL("div", [T("two")])])), def),
     [{ lang: "en-US", src: "global", text: "one. two." }]);
  eq("lang is inherited by nested elements",
     lines(EL("div", [EL("div", [EL("b", [T("ichi")]), T(" ni")], { lang: "ja" })])),
     [{ text: "ichi ni", runs: [{ t: "ichi ni", lang: "ja" }] }]);
  eq("an inner lang overrides an outer one",
     lines(EL("div", [EL("div", [T("a "), EL("i", [T("b")], { lang: "de" }), T(" c")], { lang: "ja" })]))[0].runs,
     [{ t: "a", lang: "ja" }, { t: "b", lang: "de" }, { t: "c", lang: "ja" }]);
  eq("lang=\"\" switches back to the side's language",
     lines(EL("div", [EL("div", [T("a "), EL("i", [T("b")], { lang: "" })], { lang: "ja" })]))[0].runs,
     [{ t: "a", lang: "ja" }, { t: "b", lang: "" }]);
  eq("same-language neighbours join without gaining a space",
     lines(EL("div", [EL("b", [T("foo")]), T("bar")]))[0].runs, [{ t: "foobar", lang: "" }]);
  eq("line text is what extractLines reports",
     extractLines(EL("div", [T("neko "), EL("span", [T("cat")], { lang: "en" }), EL("br"), T("inu")])), ["neko cat", "inu"]);
  eq("neighbouring lines in the same language merge across the line break",
     speechSegments(lines(EL("div", [
       EL("div", [T("neko")], { lang: "ja" }), EL("div", [T("inu")], { lang: "ja" }), EL("div", [T("cat")]),
     ])), def),
     [{ lang: "ja-JP", src: "attribute", text: "neko. inu." }, { lang: "en-US", src: "global", text: "cat." }]);
  eq("each line still ends with a pause, mid-line chunks do not",
     speechSegments(lines(EL("div", [T("say "), EL("span", [T("neko")], { lang: "ja" })])), def),
     [{ lang: "en-US", src: "global", text: "say" }, { lang: "ja-JP", src: "attribute", text: "neko." }]);
  eq("<small> and av-* stay unspoken", extractLines(EL("div", [T("a"), EL("small", [T("hint")]), EL("div", [T("ui")], { id: "av-root" })])), ["a"]);
  eq("AnkiDroid's replay button is not read out",
     extractLines(EL("div", [T("word"), EL("a", [EL("span", [T("Replay")])], { class: "replay-button soundLink" })])), ["word"]);
  eq("subtractLines works on lang lines",
     subtractLines(lines(EL("div", [EL("div", [T("Q")]), EL("div", [T("A")])])), ["Q"]).map((l) => l.text), ["A"]);
})();

// ---------------- command language ----------------
eq("the phone's language is used when there is a pack", resolveCmdLang("auto", "pt-BR"), { lang: "pt-BR", src: "system" });
eq("the phone's region is kept", resolveCmdLang("auto", "pt-PT"), { lang: "pt-PT", src: "system" });
eq("no pack for the phone's language: English", resolveCmdLang("auto", "th-TH"), { lang: "en-US", src: "fallback" });
eq("an explicit setting beats the phone", resolveCmdLang("de-DE", "pt-BR"), { lang: "de-DE", src: "global" });
eq("a setting with no pack falls back to the phone", resolveCmdLang("ja-JP", "fr-FR"), { lang: "fr-FR", src: "system" });
eq("English phone: unchanged", resolveCmdLang("auto", "en-GB"), { lang: "en-GB", src: "system" });
(() => {
  const en = AV_L10N.en.s;
  for (const code of Object.keys(AV_L10N)) {
    if (code === "en") continue;
    const pk = AV_L10N[code];
    eq(code + " pack translates every spoken string", Object.keys(pk.s).sort(), Object.keys(en).sort());
    for (const k of Object.keys(en)) {
      const ph = (str) => (str.match(/\{\w+\}/g) || []).sort();
      eq(code + "." + k + " keeps its placeholders", ph(pk.s[k]), ph(en[k]));
    }
    eq(code + " pack has all thirteen command lists", Object.keys(pk.words).sort(),
       ["again", "answer", "easy", "good", "hard", "help", "no", "off", "pause", "repeat", "skip", "stop", "yes"]);
    // one word must never mean two grades, or two commands on the same side
    const grades = ["again", "hard", "good", "easy"], cmds = ["stop", "off", "help", "pause", "repeat", "skip"];
    const seen = {};
    for (const g of grades.concat(cmds)) for (const w of pk.words[g].split(",")) {
      const n = normalize(w);
      ok(code + ": \"" + n + "\" belongs to one command only (" + g + " vs " + seen[n] + ")", !seen[n]);
      seen[n] = g;
    }
    // the help text must name a word that actually triggers the command
    CFG = { words_help: pk.words.help, words_answer: pk.words.answer };
    ok(code + " greeting names a working help word", said(pk.s.greeting, "help"));
    ok(code + " help names a working answer word", said(pk.s.helpIntro, "answer"));
    for (const u of ["second", "minute", "hour", "day", "week", "month", "year"]) {
      ok(code + " has singular+plural for " + u, pk.units[u] && pk.units[u].length === 2);
    }
  }
  CFG = {};
})();
eq("expandIvl localized plural", expandIvl("4d", AV_L10N.pt), "4 dias");
eq("expandIvl localized singular", expandIvl("1mo", AV_L10N.pt), "1 m\u00EAs");
eq("expandIvl localized less-than", expandIvl("<10m", AV_L10N.de), "weniger als 10 Minuten");
eq("expandIvl without a pack is English", expandIvl("4d"), "4 days");

// ---------------- version consistency ----------------
(() => {
  const header = src.match(/^\s*VERSION:\s*(\d+)\s*$/m);
  ok("header declares a VERSION", !!header);
  const v = header[1];
  // the constant the UI displays must not drift from the header
  const inCode = src.match(/^\s*var AV_VERSION = (\d+);/m);
  ok("the script exposes AV_VERSION", !!inCode);
  eq("AV_VERSION matches the header", inCode[1], v);
  ok("header changelog leads with v" + v, new RegExp("CHANGELOG:\\s*\\n\\s*v" + v + " -").test(src));
  const cur = changelog.match(/^Current:\s*\*\*v(\d+)\*\*\s*$/m);
  ok("CHANGELOG.md declares a current version", !!cur);
  eq("CHANGELOG.md current matches the header", cur[1], v);
  const first = changelog.match(/^## v(\d+)\s*$/m);
  eq("CHANGELOG.md's newest entry matches the header", first[1], v);
})();

console.log("\nAll " + passed + " assertions passed.");
