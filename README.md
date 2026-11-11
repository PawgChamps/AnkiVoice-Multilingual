# AnkiVoice

[![CI](https://github.com/PawgChamps/Ankivoice/actions/workflows/ci.yml/badge.svg)](https://github.com/PawgChamps/Ankivoice/actions/workflows/ci.yml)

Hands-free plugin for **AnkiDroid**. It reads each card aloud, listens for
your voice, and lets you drive a whole review session without touching the phone:

1. The **question** is read aloud. (On the first card of a session it greets you
   first: *"AnkiVoice is on. Say help, to list the voice commands available."*)
2. You say **"answer"** → the answer is read aloud.
3. A short **chime** tells you the card can be graded.
4. You say a grade: **again / hard / good / easy** and it schedules the card, announces the next interval, and moves on.

Plus **skip**, **repeat**, **pause** (a timed think-break), **help**, and **off**.
It also keeps the screen awake while you're actively reviewing and lets it sleep
when you stop.

**Made for language decks.** The front and back of a card can be read in
different languages — a Spanish question, an English answer — and you keep talking
to it in your own language, whatever the cards are in. See
[Languages](#languages).

> **This is a fork** of [tylerecouture/Ankivoice](https://github.com/tylerecouture/Ankivoice).
> It adds per-side card languages (v39), commands and prompts in the phone's
> language (v39) and the grading chime (v40). Those are only in the releases
> of this fork.

It's a single JavaScript file loaded from your card templates — **no add-on, no
separate app**. It runs entirely inside AnkiDroid's built-in JavaScript API.

> **AnkiDroid only.** The voice engine is AnkiDroid's JS API (TTS + speech
> recognition). On Anki Desktop / AnkiWeb the script detects that the API is
> absent and hides itself — it does nothing there. See the [FAQ](#faq--why-is-it-like-this).

---

## How it works

AnkiVoice is not an app. It is one script that rides along with your cards.

1. **The script lives in your collection.** `_ankivoice.js` sits in the media
   folder next to your images and audio, so it syncs to every device like any
   other media file.
2. **A few lines in the card template start it.** Each note type you want
   voiced gets a small *loader* at the bottom of its Front and Back templates.
   Whenever AnkiDroid shows a card of that type, the loader runs the script.
3. **The script reads the card and talks to AnkiDroid.** It takes the text on
   screen and asks AnkiDroid to speak it with the phone's text-to-speech voice,
   then asks AnkiDroid to listen with the phone's speech recognition.
4. **Your words become actions.** "Answer" shows the back of the card, a grade
   word presses the matching answer button, "skip" buries the card, and so on.
   AnkiDroid does the scheduling exactly as if you had tapped.
5. **It repeats for every card** until you say "off" or tap the bar.

A review, start to finish:

| Step | You hear | You say |
|---|---|---|
| Question side | the question | **answer** |
| Answer side | the answer, then a chime | **again**, **hard**, **good** or **easy** |
| | "Marked good, next review in 4 days" | *(next card starts)* |

Things that follow from this design:

- **Nothing is installed on the phone besides AnkiDroid.** The voices and the
  speech recognition are the ones Android already has.
- **Only the note types you add the loader to are voiced.** Everything else
  behaves as before.
- **Three languages are involved, and they are independent:** the language each
  card side is *read* in (set per note type), the language *you speak* to it,
  and the language the microphone listens for. See [Languages](#languages).
- **Settings stay on the phone.** Tap the ⚙ on the bar to change them.
- **On a computer it does nothing.** Anki Desktop and AnkiWeb do not have
  AnkiDroid's voice features, so the script hides itself there.

---

## Download

Every version is published as a [GitHub release](https://github.com/PawgChamps/Ankivoice/releases/latest),
with two files attached:

| File | For |
|---|---|
| `_ankivoice.js` | the plugin itself — what you put in `collection.media` |
| `AnkiVoice-test.apkg` | a 4-card test deck with the script bundled, to try it on the phone. One card has a Japanese front and an English back. |

Releases are built automatically whenever the version changes, so the assets
always match the source at that tag.

---

## Requirements

- **AnkiDroid 2.18 or newer.**
- **Microphone permission** for AnkiDroid: Android *Settings → Apps → AnkiDroid →
  Permissions → Microphone → Allow*.
- **Next review times switched on** in AnkiDroid, so the next interval can be
  announced: *Settings → Appearance →* section *Study Screen → **Show button
  time*** ("Show next review time on answer buttons"). In older AnkiDroid
  versions the same option is under *Settings → Reviewing → Show next review
  time above answer buttons*.
- **A text-to-speech voice for every language your cards use:** Android
  *Settings → Accessibility → Text-to-speech output*, then the engine's own
  settings to install or choose voices.

## Install

There are two ways. Both end in the same place: the script in your collection,
and the loader in the templates of the note types you want voiced.

- [On the phone only](#install-on-the-phone-no-computer) — no computer needed.
- [With Anki Desktop](#install-with-anki-desktop) — easier to paste into
  templates, and the simplest way to update later.

### The snippet

Both ways use this snippet. It goes at the very bottom of **both** the Front
and the Back template of a note type.

```html
<script>window.ANKIVOICE_LANG = { front: "es-ES", back: "en-US" };</script>
<script>
(function(){
  function boot(){
    fetch("_ankivoice.js")
      .then(function(r){return r.text();})
      .then(function(code){ (0,eval)(code); })
      .catch(function(e){
        var d=document.createElement("div");
        d.style.cssText="position:fixed;bottom:0;left:0;right:0;padding:6px;background:#a00;color:#fff;z-index:9999";
        d.textContent="AV loader failed: "+e;
        document.body.appendChild(d);
      });
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot);}else{boot();}
})();
</script>
```

- The **first line** says which language each side is read in. Replace the two
  codes with yours (`front` is the question, `back` is the answer; codes are
  listed under [Language codes](#language-codes)). If all your cards are in one
  language, you can delete that line and choose the language in ⚙ instead.
- The **rest** is the loader. Copy it exactly; it never needs changing.

### Install on the phone (no computer)

1. **Get the test deck.** On the phone, open the
   [latest release](https://github.com/PawgChamps/Ankivoice/releases/latest) and
   download `AnkiVoice-test.apkg`.
2. **Import it.** Open the downloaded file and choose AnkiDroid, or in AnkiDroid
   use *⋮ → Import*. This puts the script into your collection, together with a
   few demo cards in a deck called **AnkiVoice Test**.
3. **Try it.** Study the AnkiVoice Test deck. A bar appears at the bottom and
   the card is read aloud. Say **answer**, then a grade.
4. **Add it to your own cards.** In AnkiDroid's deck list tap *⋮ → Manage note
   types*, open the note type your cards use, and choose **Edit cards**. (The
   same editor opens from the **Cards** button at the bottom of any note's edit
   screen.)
   - On the **Front** template, scroll to the end and paste
     [the snippet](#the-snippet).
   - Do the same on the **Back** template.
   - Change the two language codes in the first line, then save.
5. **Repeat step 4** for every other note type you want voiced.

You can delete the AnkiVoice Test deck afterwards. The script stays in your
collection.

Tip: copying the snippet is easiest from this page in the phone's browser —
press and hold inside the grey box, choose *Select all* within it, then *Copy*.

### Install with Anki Desktop

1. **Put the script in your media folder.** Download `_ankivoice.js` from the
   [latest release](https://github.com/PawgChamps/Ankivoice/releases/latest) and
   copy it into your profile's `collection.media` folder. Keep the leading
   underscore in the name.

   | System | Usual location |
   |---|---|
   | Windows | `%APPDATA%\Anki2\<profile>\collection.media\` |
   | macOS | `~/Library/Application Support/Anki2/<profile>/collection.media/` |
   | Linux | `~/.local/share/Anki2/<profile>/collection.media/` |
   | Linux (Flatpak) | `~/.var/app/net.ankiweb.Anki/data/Anki2/<profile>/collection.media/` |

2. **Add the snippet to your note types.** *Tools → Manage Note Types*, select
   the note type, *Cards…*. Paste [the snippet](#the-snippet) at the very bottom
   of the **Front Template** and again at the bottom of the **Back Template**.
   Change the two language codes in the first line.
3. **Sync** Anki Desktop, then sync AnkiDroid.
4. **Study on the phone.** The bar appears at the bottom and the card is read.

### Check that it works

- The bar at the bottom shows the version before a card starts, e.g.
  `AnkiVoice v40`.
- Tap **⚙** on the bar. The box at the top lists the language each side is
  read in and where that came from. A ⚠ line means the phone has no voice for
  that language.

### Updating

The templates only refer to the file by name, so **you never edit templates
again**. Updating means replacing the one file.

- **With Anki Desktop:** overwrite `_ankivoice.js` in `collection.media` with
  the new one, sync the desktop, then sync AnkiDroid.
- **On the phone only:** importing a newer test deck does **not** update the
  script. Anki keeps the copy you already have and stores the new one under
  another name, so the old version keeps running. You have to replace the file
  itself: it is in the `collection.media` folder inside the folder shown at
  AnkiDroid *Settings → Advanced → AnkiDroid directory*. A file manager can do
  that when the folder is in shared storage; on recent Android versions it is
  often inside app-private storage that file managers cannot open, and then a
  computer is needed for the update.

Either way, check the version on the bar afterwards.

## Languages

**In short:** set the language you speak once, in the settings. Set the
languages of the cards per note type, in its templates. The two are independent.

An example — a phone set to Spanish, three note types:

| Note type | First line of the snippet | Front read in | Back read in | You say |
|---|---|---|---|---|
| French vocabulary | `{ front: "fr-FR", back: "es-ES" }` | French | Spanish | "respuesta", "bien" |
| English phrases | `{ front: "en-US", back: "es-ES" }` | English | Spanish | "respuesta", "bien" |
| Anything else | *(line left out)* | ⚙ *Speech language* | ⚙ *Speech language* | "respuesta", "bien" |

All three can come up in one review session. Each card is read in its own
languages, and the commands stay in Spanish throughout.

There are three separate languages, and they do not have to match:

| | What it is | Where it comes from |
|---|---|---|
| **Card language** | the voice each chunk of card text is read in | `lang` attribute → template → ⚙ *Speech language* |
| **Command language** | AnkiVoice's own prompts, and the words it listens for | ⚙ *Command language* (default: the phone's language) |
| **Recognition language** | what the microphone expects to hear | ⚙ *Recognition language* (default: same as commands) |

### Card language: per side, per note type

This is the first line of [the snippet](#the-snippet). It goes just above the
loader, in **both** the Front and Back template, with the same content in each:

```html
<script>window.ANKIVOICE_LANG = { front: "LANGUAGE-OF-THE-QUESTION", back: "LANGUAGE-OF-THE-ANSWER" };</script>
```

`front` is the language of the question side. `back` is the language of the
answer — the text that was not already on the question side. For example:

```html
<!-- Question in Spanish, answer in English -->
<script>window.ANKIVOICE_LANG = { front: "es-ES", back: "en-US" };</script>

<!-- The reverse card: question in English, answer in Spanish -->
<script>window.ANKIVOICE_LANG = { front: "en-US", back: "es-ES" };</script>

<!-- Both sides in the same language -->
<script>window.ANKIVOICE_LANG = "fr-FR";</script>
```

Notes:

- A note type with two card types in opposite directions needs the line in each
  card type's templates, with `front` and `back` swapped.
- Leave a side out and it uses ⚙ *Speech language*.
- A third, optional entry sets the microphone language for this note type only:
  `{ front: "fr-FR", back: "en-US", stt: "es-ES" }`. It is rarely needed;
  without it recognition follows ⚙.

### Language codes

A code is a language plus a region, such as `en-US`. Common ones:

| | | | |
|---|---|---|---|
| `en-US` English (US) | `en-GB` English (UK) | `es-ES` Spanish | `fr-FR` French |
| `de-DE` German | `it-IT` Italian | `pt-BR` Portuguese (Brazil) | `nl-NL` Dutch |
| `pl-PL` Polish | `ru-RU` Russian | `sv-SE` Swedish | `tr-TR` Turkish |
| `ja-JP` Japanese | `ko-KR` Korean | `zh-CN` Chinese | `ar-SA` Arabic |
| `hi-IN` Hindi | `he-IL` Hebrew | `cs-CZ` Czech | `el-GR` Greek |
| `id-ID` Indonesian | `vi-VN` Vietnamese | `fil-PH` Filipino | `th-TH` Thai |

Any other code your text-to-speech engine supports works too. Codes are
forgiving: `es`, `es_ES` and `es-ES` all work. A bare language gets its usual
region (`en` → `en-US`, `pt` → `pt-BR`); write the region if you want another,
such as `es-MX` or `pt-PT`. Something that is not a language code is ignored.

### Card language: one chunk at a time

Standard HTML `lang` attributes are honoured anywhere inside the card, and win
over the template line. Use them in a template around a field:

```html
{{Meaning}}
<div lang="fr">{{Example}}</div>
```

or inside a field's own HTML for a single word: `It means <span lang="de">Hund</span>.`
Everything inside the element, nested elements included, is read in that
language; the text around it stays in the side's language.

### Card language: different for each note

The template line applies to every card of a note type. If one note type holds
cards in several languages — a generic "Basic" used for both French and
German, say — give it a field for the language (call it `Lang`, containing `fr`
or `de` on each note) and use it in the template:

```html
<div lang="{{Lang}}">{{Front}}</div>
```

A note whose `Lang` field is empty falls back to the template line, then to ⚙.

> These are HTML `lang` attributes, not Anki **tags**. The tags you see in the
> browser sidebar have no effect on the language.

### Command language

⚙ → *Command language*. **auto** uses the phone's language if there is a pack
for it — English, Portuguese, Spanish, French, German, Italian — and English
otherwise. Pick one explicitly to override. Changing it swaps the built-in
trigger words (the chips below it) to that language; lists you have edited
yourself are left alone. Only speech is translated: the bar and the settings
panel stay in English.

The main word for each command (each has more; they are all listed, and
editable, as chips in ⚙):

| | English | Português | Español | Français | Deutsch | Italiano |
|---|---|---|---|---|---|---|
| reveal | answer | resposta | respuesta | réponse | Antwort | risposta |
| Again | again | de novo | otra vez | encore | nochmal | di nuovo |
| Hard | hard | difícil | difícil | difficile | schwer | difficile |
| Good | good | bom | bien | bien | gut | bene |
| Easy | easy | fácil | fácil | facile | einfach | facile |
| bury | skip | pular | saltar | passer | überspringen | salta |
| re-read | repeat | repetir | repetir | répéter | wiederholen | ripeti |
| think-break | pause | pausa | pausa | pause | Pause | pausa |
| commands | help | ajuda | ayuda | aide | Hilfe | aiuto |
| voice off | off | desligar | apagar | éteindre | ausschalten | spegni |
| stop listening | stop | parar | parar | stop | stopp | stop |

Say **help** (in your language) at any time to hear them. If the phone's
recognizer keeps mishearing a word, turn on *Voice test*, say it, and add what
it heard with one tap — see [Self-tuning recognition](#self-tuning-recognition).

**Updating from v38 or earlier on a non-English phone:** if the phone is set to
Portuguese, Spanish, French, German or Italian, the prompts and command words
switch to that language after the update. To keep English, set
⚙ → *Command language* → `en-US`.

There is no pack for Japanese, Chinese or Thai: commands are matched as whole
words, and those recognizers do not put spaces between words.

### Checking it on the phone

Open ⚙. The box at the top shows, for the side you are on, the language of the
front and back and where each came from (*template* or *global setting*), the
command and recognition languages, and each chunk that was read with its
language and source (*lang attribute* / *template* / *global setting*). If the
phone's text-to-speech engine has no voice for a language, a ⚠ line says so —
the text is then read in whatever language came before.

### Anki's own `{{tts}}` tags

A `{{tts ja_JP:Field}}` tag is **not** picked up. AnkiDroid replaces it with a
play button before the card's JavaScript runs, so neither the language nor the
text is in the page. Use the template line or a `lang` attribute instead. Such a
tag also makes AnkiDroid speak the field itself, on top of AnkiVoice; remove it
from note types you voice with AnkiVoice.

## Voice commands

The words below are the English ones. On a phone set to Portuguese, Spanish,
French, German or Italian they are in that language — see the table under
[Command language](#command-language).

| Say | Does |
|---|---|
| **answer** (or show / reveal / flip) | reveal the answer |
| **again** (or wrong / no) | grade Again |
| **hard** | grade Hard |
| **good** (or yes / correct) | grade Good |
| **easy** | grade Easy |
| **skip** (or bury / pass) | bury the card (returns later) |
| **repeat** | re-read the current side |
| **pause** | mute the mic for a few seconds to think, then resume |
| **help** | re-read the available commands |
| **off** | turn the voice off until you tap the bar |
| **stop** (or quit / cancel) | pause listening until you tap the bar |

Every trigger word above is **editable in Settings** (see below).

## The bar and the settings

- The bottom **status bar** is also the on/off button — tap it to toggle the
  voice. It shows the current state ("Reading…", "Listening…", countdowns, the
  grade result, etc.).
- The **⚙ gear** on the far right opens the settings panel:
  - Timing (wait before the mic, "pause" length, retries before it auto-pauses),
    "keep screen awake", and other toggles.
  - **Editable trigger words per command**, as tappable chips. Tap a word to
    remove it; tap a **+ word** chip under *heard recently* to add something the
    recognizer just misheard. No typing required — the on-screen keyboard does
    not reliably open inside AnkiDroid's reviewer WebView. There is still a text
    field for where it does, and **Reset defaults** restores the built-in lists.
  - **Voice test** — shows the recognizer's raw guesses for whatever you say,
    while still reviewing normally.
  - **Speech / command / recognition language** — see [Languages](#languages).
    The box at the top of the panel shows which language is in force and why.
  - **Chime instead of "Mark it"** — after the answer, a short chime tells you
    the card can be graded. Turn it off to hear "Mark it." instead (which is
    also what you get if the phone will not let the page play the chime).
  - **Announce next interval** — turn it off to grade faster (it skips
    "next review in four days" after each card).
  - **Unknown replies before pausing** — how much unrecognized speech to tolerate
    before the mic parks itself, so background noise can't loop it forever.
  - **Accept partial answers** — how much of the answer a partial reply must
    cover to count (default 60%; 0 requires the whole answer). Filler words are
    always ignored, so "it's Bamako" matches "Bamako" regardless.
- Settings are **persistent** across app restarts (stored in a cookie — see the
  FAQ for why not `localStorage`).

### Self-tuning recognition

AnkiDroid's speech engine sometimes mishears short words (see FAQ). You can fix
this yourself without editing the script:

1. Settings → turn on **Voice test**.
2. Say the stubborn word (e.g. "hard"). Read the yellow readout — it lists what
   the engine actually heard (e.g. `heart | art | harv`).
3. Settings → find **Extra words → Hard**. The words it just heard are waiting
   there as **+ chips** — tap `+ harv` to add it. (Tap an existing word to
   remove it.)
4. Turn Voice test off. That word now works for your voice.

### What counts as a right answer

Only relevant when **Detect spoken answers** is on. Two rules decide it:

1. **Say at least the whole answer and you are always right.** Filler words are
   ignored, so articles, "it's", "the answer is" and so on make no difference.
   This never depends on any setting.
2. **Say only part of the answer** and it depends on how much of it you covered,
   against the **Accept partial answers** percentage (default 60%). A partial
   answer must also contain *no* words that aren't in the answer - so a wrong
   guess can't sneak through on coverage alone ("Pierre Curie" is rejected for
   "Marie Curie" even though it covers half of it).

Filler words don't count toward any of this. "The United States of America" is
three *content* words: united, states, america.

**Spelling differences are forgiven, but only some.** The recognizer has to write
what you said using *one* spelling — American, for the default en-US — and it
often won't match your card. So these count as the same word:

- doubled letters: *Elliott / Elliot*, *Phillip / Philip*, *Matthew / Mathew*
- British and American spellings: *colour / color*, *theatre / theater*,
  *realise / realize*, *catalogue / catalog*, *programme / program*, *grey / gray*

What is **not** forgiven is one letter swapped for another — on purpose. The
classic wrong answers in a geography deck are exactly that close to the right
ones: *Gambia / Zambia*, *Iceland / Ireland*, *Iran / Iraq*, *Mali / Bali*. A
general "close enough" rule would mark those Correct. The price of the doubled-
letter rule is that a few different-sounding words now match (*diner / dinner*,
*later / latter*) — an unlikely thing to say by mistake.

<!-- ANSWER-CASES:START (generated from the matcher; test/test.js checks these rows) -->
| The card's answer | You say | Content words you covered | Accepted at 60% (default) | at 50% |
|---|---|---|---|---|
| **Bamako**<br>(1 content word) | Bamako | all 1 (+ extra) | yes | yes |
|  | bamako | all 1 (+ extra) | yes | yes |
|  | it's Bamako | all 1 (+ extra) | yes | yes |
|  | the capital is Bamako | all 1 (+ extra) | yes | yes |
|  | Mali | 0 of 1 | no | no |
| **Marie Curie**<br>(2 content words) | Marie Curie | all 2 (+ extra) | yes | yes |
|  | it was Marie Curie | all 2 (+ extra) | yes | yes |
|  | Curie | 1 of 2 | no | yes |
|  | Marie | 1 of 2 | no | yes |
|  | Pierre Curie | 1 of 2 | no | no |
| **The United States of America**<br>(3 content words) | the United States of America | all 3 (+ extra) | yes | yes |
|  | United States of America | all 3 (+ extra) | yes | yes |
|  | United States | 2 of 3 | yes | yes |
|  | America | 1 of 3 | no | no |
|  | United | 1 of 3 | no | no |
| **Harry Potter and the Goblet of Fire**<br>(4 content words) | Harry Potter and the Goblet of Fire | all 4 (+ extra) | yes | yes |
|  | the Goblet of Fire | 2 of 4 | no | yes |
|  | Goblet of Fire | 2 of 4 | no | yes |
|  | Harry Potter | 2 of 4 | no | yes |
|  | Goblet | 1 of 4 | no | no |
|  | the Half Blood Prince | 0 of 4 | no | no |
| **Flag similar to Guinea and red flipped darker**<br>(6 content words) | flag similar to Guinea and red flipped darker | all 6 (+ extra) | yes | yes |
|  | Guinea red flipped darker | 4 of 6 | yes | yes |
|  | Guinea red | 2 of 6 | no | no |
|  | Guinea | 1 of 6 | no | no |
<!-- ANSWER-CASES:END -->

How much you have to say, by answer length:

<!-- ANSWER-QUICK:START -->
| Content words in the answer | Must say at 60% (default) | at 50% | at 80% |
|---|---|---|---|
| 1 | all 1 | all 1 | all 1 |
| 2 | all 2 | 1 of 2 | all 2 |
| 3 | 2 of 3 | 2 of 3 | all 3 |
| 4 | 3 of 4 | 2 of 4 | all 4 |
| 5 | 3 of 5 | 3 of 5 | 4 of 5 |
| 6 | 4 of 6 | 3 of 6 | 5 of 6 |
| 7 | 5 of 7 | 4 of 7 | 6 of 7 |
| 8 | 5 of 8 | 4 of 8 | 7 of 8 |
<!-- ANSWER-QUICK:END -->

Two things fall out of that worth knowing:

- **A one- or two-word answer effectively has to be said in full** at the default
  60%, because half of two words is 50%. If you want "Curie" to pass for "Marie
  Curie", set the percentage to 50.
- **50% is not simply "more forgiving"** - it is the point where half an answer
  counts, and half of "Harry Potter and the Goblet of Fire" is "Harry Potter"
  just as much as it is "Goblet of Fire". The card doesn't say which half is the
  point, so neither can the plugin. Set it knowing that a wrong half will be
  marked Good.

### Teaching it an answer

**Off by default.** Turn on **Remember answers (adds tags)** in settings to use it.

When you say something the plugin doesn't accept, it reads the answer out as
usual. What happens next depends on how you grade — and it **never** asks about
an answer you mark wrong:

- **Grading by voice:** say **Hard, Good or Easy** and it asks
  > "Should I remember, *the goblet of fire*, as a right answer for this card?"

  Say **yes** and that phrase counts for this card from then on. Say no, say
  nothing, or say something it can't make out, and it just grades the card. Say
  **Again** and it doesn't ask at all.
- **Grading with the buttons:** a green **"✓ I was right — remember “the
  goblet of fire”"** button appears above the bar. If you were right, tap it,
  then tap Good (or Hard/Easy) as usual. If you were wrong, ignore it. It never
  speaks and never asks, so wrong answers cost you nothing.

Why a separate button for button users: AnkiDroid's grade buttons are native
Android UI outside the card's page, and its JavaScript API has no callback for
them — the plugin genuinely cannot see that you tapped Good. So it can't wait for
your grade and then ask. (v36 tried asking *before* grading instead, which meant
being asked about every wrong answer. It was reverted.)

**Where it is stored, and what that means for you:**

- The phrase is saved as a **tag on the note**, like
  `AnkiVoice::ok::the-goblet-of-fire`. Tags are the only writable, durable store
  the AnkiDroid JS API offers — there is no way to edit a note's fields from card
  JavaScript, so this can't be tucked away invisibly inside the card.
- **These tags are visible** in the card browser and the tag sidebar, on every
  device, and they **sync**. That is the price of it working across your devices
  and surviving a reinstall, and it's why the feature is off until you ask for it.
- To undo, delete the tag in the browser like any other tag. Searching
  `tag:AnkiVoice::ok::*` finds every phrase it has learned.
- Existing tags are never disturbed. The plugin adds a tag; it never rewrites the
  note's tag list unless AnkiDroid offers no additive call, and even then it
  refuses to write at all unless it first read the existing tags cleanly.

Remembered phrases are matched with exactly the same rules as the card's own
answer, including **Accept partial answers**.

## Development

- The deployable artifact is the single file `_ankivoice.js`. The version lives
  in its header comment and in [`CHANGELOG.md`](CHANGELOG.md).
- **Tests:** two suites, no build step.
  - `node test/test.js` — pure functions (interval speech, line-break handling,
    answer extraction, command matching, normalization), run against the real
    source, plus a check that the version in the file header matches
    `CHANGELOG.md`. No dependencies.
  - `node test/smoke.js` — loads the *whole* plugin into a fake DOM with a fake
    AnkiDroid JS API and drives a review: reads a question, hears a mis-heard
    grade, reveals, grades, parks the mic on noise, edits settings by tapping
    chips. Needs jsdom (`npm install`), and skips cleanly if it isn't there.
  - `npm test` runs both plus `node --check`. CI runs both on every push, along
    with a demo-deck build.

  None of this can stand in for a device: the speech engine, the WebView quirks
  and the keyboard behaviour only exist on the phone. It catches regressions in
  the parts that *can* be reasoned about off-device.
- Coding style is intentionally conservative ES5-ish — it runs inside whatever
  Android System WebView the user has.
- See [`CLAUDE.md`](CLAUDE.md) for an architecture + context handoff (useful for
  an AI coding session), and [`docs/DECISIONS.md`](docs/DECISIONS.md) for the
  technical decision log.

## Repository layout

```
_ankivoice.js        the plugin (the file you deploy)
loader.html          the one-time <script> snippet for card templates
README.md            this file
CHANGELOG.md         version history (mirrors the file header)
CLAUDE.md            architecture + context handoff
docs/DECISIONS.md    why the code is shaped the way it is (technical)
demo/build_apkg.py   builds a test .apkg with the script bundled as media
test/test.js         pure-function test suite (no dependencies)
test/smoke.js        whole-plugin test against a fake DOM + fake JS API (jsdom)
package.json         dev tooling only - nothing is bundled or shipped
tools/               release-notes helper used by the release workflow
.github/workflows/   CI (checks + both suites + demo build) and Release
                     (publishes _ankivoice.js + the test deck on a version bump)
LICENSE              MIT
```

---

## FAQ — why is it like this?

This plugin looks the way it does because of hard constraints in how AnkiDroid
exposes speech to card JavaScript. If something feels like a workaround, it
probably is — here's the reasoning.

**A card is read in the wrong language or by the wrong voice.**
Open ⚙ and read the box at the top. It shows, for the side you are on, the
language of every chunk that was read and where it came from.

- *global setting* next to the card text means the template line is missing or
  misspelled on that note type — check the first line of the snippet is in
  **both** the Front and Back template, above the loader.
- A ⚠ line means the phone's text-to-speech engine has no voice for that
  language, so it carried on in the previous one. Install the voice in Android's
  text-to-speech settings.
- If the box shows the right language and the voice is still wrong, the
  text-to-speech engine is ignoring the request; try another engine.

**Which voice reads the cards?**
Whatever Android text-to-speech engine the phone is set to use (Google's, the
maker's, or one you installed). AnkiVoice only asks for a language, such as
`fr-FR`; the engine picks the voice. To change the voice for a language, change
it in that engine's settings.

**I still hear "Mark it." instead of the chime.**
The first answer of a session always speaks the grade words once. After that,
"Mark it." means the chime could not play — the WebView did not let the page
make sound — and AnkiVoice fell back to speech rather than leave you without a
cue. ⚙ → *Chime instead of "Mark it"* chooses between the two.

**It speaks to me in my phone's language, and I want English.**
⚙ → *Command language* → `en-US`.

**No bar appears at the bottom of the card.**
The script is not running. Check, in this order: the card's note type has the
snippet in both templates; `_ankivoice.js` is in the collection (on a phone-only
install, the test deck was imported); AnkiDroid is version 2.18 or newer. If a
red "AV loader failed" bar appears instead, the snippet is there but the script
file is missing. AnkiVoice has only been used with AnkiDroid's standard study
screen; if you have switched on the experimental *New study screen*, try with
it off.

**The next interval is not announced after grading.**
Turn on *Settings → Appearance → Study Screen → Show button time* in AnkiDroid.

**Can it use Anki's own `{{tts}}` tags?**
No — see [Anki's own `{{tts}}` tags](#ankis-own-tts-tags).

**Why does the microphone beep on and off while I review?**
The beeps are Google's. AnkiDroid's speech recognition is Android's stock
`SpeechRecognizer`, which is strictly *session-based*: it plays a start tone,
listens for one utterance, plays an end tone, returns one result. There is no
flag to disable those tones, and the mute-around-the-beep trick lives in native
app code we can't reach from a card. To listen "continuously," the only option
is to restart the recognizer over and over — and each restart is a beep. We
minimized the gap and added think-delays so it beeps less, but it can't be
silent with this engine.

**Then why not capture the raw microphone and do recognition in JavaScript
(which would be beep-free)?**
We tried. Raw capture needs `getUserMedia`, and in AnkiDroid's WebView it fails
with `NotReadableError: Could not start audio source` — even on a clean card with
nothing else using the mic. The cause is app-level: AnkiDroid's manifest doesn't
request `MODIFY_AUDIO_SETTINGS` and it never sets the `AudioManager` capture
mode, so Android refuses to hand the mic to the WebView even though it grants the
permission. Card JavaScript cannot change an app's manifest or audio mode, so
this path is closed without a change to AnkiDroid itself. (It's a known issue —
AnkiDroid #16319.)

**Why does the plugin sometimes re-read things, and why is state stored so
carefully?**
AnkiDroid renders every card side by fully reloading the WebView page
(`loadDataWithBaseURL`). Showing the answer is a *new page* with a *fresh
JavaScript context* — nothing in memory survives from the question side. So
anything that must persist across sides (which lines were on the question, your
settings) is written to storage and re-read, and the recognizer is re-initialized
each side. It's also why we're careful to stop the previous side's microphone
when a new one starts.

**Why does it mishear short words like "hard" or "answer" when my keyboard's
voice typing gets them instantly?**
AnkiDroid uses the generic recognizer in *free-form dictation* mode with no
tuning. Dictation models lean on sentence context to disambiguate, and a lone
one-syllable word gives them none — so "hard" often comes back as "heart"/"art"
and "answer" as "answers"/"anser". Your keyboard (Gboard) and other apps use
better, purpose-built models. We can't switch AnkiDroid's model from a card, so
instead every command has an **editable list of trigger words** plus a **Voice
test** mode: you can see exactly what your device hears and add those spellings.

**Why can't I type in the settings panel?**
The on-screen keyboard often doesn't open for text fields inside AnkiDroid's
reviewer WebView — the reviewer's own stylesheet disables text selection on the
card body so that swipes don't select text, and that appears to take the caret
with it. v29 overrides that on its own inputs, but rather than depend on a fix
that can't be verified off-device, the word lists are fully editable by tapping:
each word is a chip you tap to delete, and words the recognizer recently heard
show up as **+ chips** to add. That's the intended way to tune vocabulary; the
text field is a bonus where the keyboard cooperates.

**Why do settings live in a cookie instead of `localStorage`?**
AnkiDroid's internal media server binds a **random port each launch**, so the
card's origin is `http://127.0.0.1:<random>`. `localStorage` is keyed to that
origin, so it's effectively wiped on the next app start (different port).
Cookies are keyed to the **host** (`127.0.0.1`), not the port, and AnkiDroid
flushes them to disk — so cookie-stored settings survive restarts. We mirror to
`localStorage` too, but the cookie is what makes them persistent.

**Why is it one big file with a fixed name, instead of something modular?**
The card templates reference the file by name (`_ankivoice.js`). Keeping the name
fixed means the templates **never** need editing again — updates are just a file
swap. Keeping it a single file means "install" is "drop one file into
`collection.media`." The version is tracked in comments and `CHANGELOG.md`
instead of in the filename.

**Why the desktop + sync workflow instead of hosting the script on the web?**
Updating a *used* media file directly on the phone is awkward — AnkiDroid's
importer renames a colliding media file rather than overwriting it, and the media
folder is hard to reach on modern Android. On desktop, `collection.media` is a
normal folder you can overwrite freely, and **sync** correctly propagates the
changed file to the phone. (Fetching the script from a raw GitHub URL is
technically possible — the CORS headers allow it — and would enable
auto-deploy-on-commit; it just wasn't needed.)

**Why does the answer read "everything that wasn't on the question" instead of
just the text after `<hr id="answer">`?**
Note types disagree on layout. The standard one puts the answer after the
separator, but others (e.g. Ultimate Geography) put the key answer *above* it.
Reading "the card minus the question side" gets the right text for all of them,
with the after-`<hr>` text as a fallback.

**Why is "detect the spoken answer and auto-grade" turned off by default?**
Partly caution — stray sounds can trigger a false reveal — but mostly it was
broken. The recognizer returns several competing guesses, and until v29 they were
mashed into one string before being compared to the answer, which matched nothing
and also blew past the "max words" limit. It was switched off in v24 because it
"didn't work"; v29 fixed the underlying bug and v31 fixed the limit that was
still swallowing normal-length answers. Worth a try if the idea appeals — still
off by default until it has real mileage on it.

**I said the answer, the app clearly heard it, and nothing happened.**
Fixed in v31. *Max words for answer match* caps how long a phrase can be and
still count as an answer attempt; it used to default to **3**, so a four-word
answer like "the Half Blood Prince" was dropped — and dropped *silently*, which
looked exactly like being ignored. The default is now 8 (adjustable up to 20),
and a phrase rejected only for length now says so on screen. If you still hit the
cap, raise it in ⚙.

**Could this be fixed properly?**
Two upstream changes to AnkiDroid would help a lot: (1) add silence-length extras
to the recognition intent so each listening window is longer (far fewer beeps),
and (2) request `MODIFY_AUDIO_SETTINGS` / set the audio mode so `getUserMedia`
works (which would unlock a fully beep-free in-browser recognizer). Both are
small, well-scoped patches to `JavaScriptSTT` / the manifest. See
[`docs/DECISIONS.md`](docs/DECISIONS.md).
