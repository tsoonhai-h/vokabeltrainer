// Reine Lernlogik ohne DOM und ohne Alpine – damit sie sich mit `npm test` prüfen lässt.

export const PART_SIZE = 8;

/** Lektionsdatei (deutsche Schlüssel) in das interne Format bringen. */
export function normalizeLesson(id, raw) {
  const words = (raw.woerter || []).map((w, i) => ({
    id: `${id}-${i}`,
    en: String(w.en || '').trim(),
    de: String(w.de || '').trim(),
    img: w.bild || '',
    imgFile: w.bildDatei || '',
    move: w.bewegung || '',
    esel: w.eselsbruecke || '',
    spell: w.schreibweise || '',
  })).filter((w) => w.en && w.de);
  return {
    id,
    name: raw.name || id,
    emoji: raw.emoji || '📘',
    reward: typeof raw.belohnung === 'string' ? { bild: '🏆', text: raw.belohnung } : (raw.belohnung || null),
    words,
  };
}

/** Wörter in Teile zu je PART_SIZE aufteilen. */
export function splitParts(words, size = PART_SIZE) {
  const parts = [];
  for (let i = 0; i < words.length; i += size) parts.push(words.slice(i, i + size));
  return parts;
}

/** „1–8“ für Teil 0 usw. */
export function partRange(partIndex, total, size = PART_SIZE) {
  const from = partIndex * size + 1;
  const to = Math.min(total, (partIndex + 1) * size);
  return `${from}–${to}`;
}

/** Text für die Sprachausgabe: nur die Grundform, ohne Klammern und Vergangenheitsform. */
export function speakText(en) {
  return String(en).split(',')[0].replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Kleiner deterministischer Zufallsgenerator (für reproduzierbare Tests). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rand = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Vier Antwortmöglichkeiten (deutsche Bedeutungen) für ein Quizwort.
 * Falsche Antworten kommen bevorzugt aus der aktuellen Übungsrunde, sonst aus der ganzen Lektion.
 */
export function quizOptions(word, sessionWords, allWords, rand = Math.random) {
  const seen = new Set([word.de]);
  const pick = (pool) => shuffle(pool, rand).filter((w) => {
    if (seen.has(w.de)) return false;
    seen.add(w.de);
    return true;
  });
  let wrong = pick(sessionWords.filter((w) => w.id !== word.id));
  if (wrong.length < 3) wrong = wrong.concat(pick(allWords.filter((w) => w.id !== word.id)));
  return shuffle([word.de, ...wrong.slice(0, 3).map((w) => w.de)], rand);
}

/** Leerer Lernstand für eine Lektion. */
export function emptyProgress() {
  return { pins: [], quizRight: [], partMedals: [], medal: false, selected: [0] };
}

/** Fehlende Felder ergänzen (z. B. nach einem Update der App). */
export function repairProgress(p) {
  const base = emptyProgress();
  if (!p || typeof p !== 'object') return base;
  return {
    pins: Array.isArray(p.pins) ? p.pins : base.pins,
    quizRight: Array.isArray(p.quizRight) ? p.quizRight : base.quizRight,
    partMedals: Array.isArray(p.partMedals) ? p.partMedals : base.partMedals,
    medal: !!p.medal,
    selected: Array.isArray(p.selected) && p.selected.length ? p.selected : base.selected,
  };
}

export function isPinned(progress, word) {
  return progress.pins.includes(word.en);
}

/** Stern setzen oder entfernen. Gibt einen neuen Lernstand zurück. */
export function togglePin(progress, word) {
  const pins = isPinned(progress, word)
    ? progress.pins.filter((en) => en !== word.en)
    : [...progress.pins, word.en];
  return { ...progress, pins };
}

/** Richtige Quizantwort merken (nur das Quiz zählt für Orden). */
export function recordQuizAnswer(progress, word, correct) {
  if (!correct || progress.quizRight.includes(word.en)) return progress;
  return { ...progress, quizRight: [...progress.quizRight, word.en] };
}

/**
 * Nach einer Quizrunde: neue kleine Orden und ggf. den großen Orden vergeben.
 * Gibt { progress, newParts, newMedal } zurück.
 */
export function awardMedals(progress, words) {
  const parts = splitParts(words);
  const right = new Set(progress.quizRight);
  const newParts = [];
  const partMedals = progress.partMedals.slice();
  parts.forEach((part, i) => {
    if (!partMedals.includes(i) && part.every((w) => right.has(w.en))) {
      partMedals.push(i);
      newParts.push(i);
    }
  });
  const mastered = words.length > 0 && words.every((w) => right.has(w.en));
  const newMedal = mastered && !progress.medal;
  return {
    progress: { ...progress, partMedals, medal: progress.medal || mastered },
    newParts,
    newMedal,
  };
}

export function pickReward(list, rand = Math.random) {
  if (!list || list.length === 0) return { bild: '🏆', text: 'Zeig Mama deinen Orden!' };
  return list[Math.floor(rand() * list.length)];
}

/** Teil an- oder abwählen. Mindestens ein Teil bleibt immer gewählt. */
export function toggleSelected(selected, i) {
  if (selected.includes(i)) {
    return selected.length > 1 ? selected.filter((x) => x !== i) : selected;
  }
  return [...selected, i].sort((a, b) => a - b);
}

/** Gewählte Teile als Wortbereich, z. B. „1–16“ oder „1–8, 17–24“. */
export function selectionRange(selected, total, size = PART_SIZE) {
  const sorted = [...selected].sort((a, b) => a - b);
  const groups = [];
  for (const i of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else groups.push([i, i]);
  }
  return groups.map(([a, b]) => `${a * size + 1}–${Math.min(total, (b + 1) * size)}`).join(', ');
}
