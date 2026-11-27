import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeLesson, splitParts, partRange, speakText, quizOptions, seededRandom,
  emptyProgress, togglePin, isPinned, recordQuizAnswer, awardMedals, repairProgress, pickReward,
  toggleSelected, selectionRange,
} from '../src/logic.js';

const raw = JSON.parse(readFileSync(new URL('../public/lektion-1.json', import.meta.url)));
const lesson = normalizeLesson('lektion-1', raw);

test('Lektion 1 hat 32 Wörter in 4 Teilen', () => {
  assert.equal(lesson.words.length, 32);
  assert.equal(splitParts(lesson.words).length, 4);
  assert.equal(partRange(0, 32), '1–8');
  assert.equal(partRange(3, 32), '25–32');
  assert.equal(partRange(2, 20), '17–20');
});

test('Sprachausgabe nutzt nur die Grundform', () => {
  assert.equal(speakText('to speak, spoke'), 'to speak');
  assert.equal(speakText('to point (at)'), 'to point');
});

test('Quiz: 4 verschiedene Antworten, die richtige ist dabei', () => {
  const rand = seededRandom(1);
  for (const w of lesson.words) {
    const opts = quizOptions(w, lesson.words.slice(0, 8), lesson.words, rand);
    assert.equal(opts.length, 4);
    assert.equal(new Set(opts).size, 4);
    assert.ok(opts.includes(w.de));
  }
  // auch bei kleinen Runden (z. B. 2 Wörter auf „Nochmal üben“)
  const opts = quizOptions(lesson.words[0], lesson.words.slice(0, 2), lesson.words, rand);
  assert.equal(opts.length, 4);
});

test('Stern setzen und entfernen', () => {
  let p = emptyProgress();
  p = togglePin(p, lesson.words[0]);
  assert.ok(isPinned(p, lesson.words[0]));
  p = togglePin(p, lesson.words[0]);
  assert.ok(!isPinned(p, lesson.words[0]));
});

test('Kleine Orden pro Teil, großer Orden erst bei allen Wörtern', () => {
  let p = emptyProgress();
  for (const w of lesson.words.slice(0, 8)) p = recordQuizAnswer(p, w, true);
  let r = awardMedals(p, lesson.words);
  assert.deepEqual(r.newParts, [0]);
  assert.equal(r.newMedal, false);
  p = r.progress;
  // derselbe Teil gibt keinen zweiten Orden
  r = awardMedals(p, lesson.words);
  assert.deepEqual(r.newParts, []);
  // falsche Antworten zählen nicht
  p = recordQuizAnswer(p, lesson.words[8], false);
  assert.ok(!p.quizRight.includes(lesson.words[8].en));
  for (const w of lesson.words) p = recordQuizAnswer(p, w, true);
  r = awardMedals(p, lesson.words);
  assert.deepEqual(r.newParts, [1, 2, 3]);
  assert.equal(r.newMedal, true);
  assert.equal(awardMedals(r.progress, lesson.words).newMedal, false);
});

test('Kaputter Speicherstand wird repariert', () => {
  assert.deepEqual(repairProgress(null), emptyProgress());
  assert.deepEqual(repairProgress({ pins: ['x'] }).pins, ['x']);
});

test('Belohnungsliste', () => {
  const list = JSON.parse(readFileSync(new URL('../public/belohnungen.json', import.meta.url))).belohnungen;
  assert.equal(list.length, 15);
  assert.ok(pickReward(list, seededRandom(3)).text.length > 0);
  assert.equal(pickReward([]).bild, '🏆');
});

test('Mehrere Teile wählen', () => {
  let s = [0];
  s = toggleSelected(s, 2);
  assert.deepEqual(s, [0, 2]);
  s = toggleSelected(s, 1);
  assert.deepEqual(s, [0, 1, 2]);
  assert.equal(selectionRange(s, 32), '1–24');
  assert.equal(selectionRange([0, 2], 32), '1–8, 17–24');
  assert.equal(selectionRange([3], 30), '25–30');
  assert.deepEqual(toggleSelected([1], 1), [1]); // letzter Teil bleibt gewählt
  assert.deepEqual(repairProgress({}).selected, [0]);
});
