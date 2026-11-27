import {
  normalizeLesson, splitParts, partRange, speakText, quizOptions, shuffle,
  emptyProgress, repairProgress, isPinned, togglePin, recordQuizAnswer, awardMedals, pickReward,
  toggleSelected, selectionRange,
} from './logic.js';

const STORAGE_KEY = 'vokabeltrainer:v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Speicher voll oder gesperrt – die App läuft trotzdem weiter */
  }
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export function vokabeltrainer() {
  return {
    // ---------- Zustand
    screen: 'start', // start | lesson | cards | quiz | done | medal | list | pins
    loading: true,
    error: '',
    lessons: [],
    rewards: [],
    store: {},
    lesson: null,

    session: [],
    sessionKind: 'part', // part | pins
    sessionLabel: '',
    index: 0,
    flipped: false,
    revealed: false, // Rückseite schon einmal gesehen → Antwort-Knöpfe zeigen
    dir: 'en', // en = Englisch → Deutsch, de = Deutsch → Englisch
    options: [],
    picked: null,
    score: 0,
    total: 0,
    newParts: [],
    reward: null,

    // ---------- Start
    async init() {
      this.store = loadStore();
      try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      } catch { /* egal */ }
      try {
        const [index, rewards] = await Promise.all([
          fetchJson('lektionen.json'),
          fetchJson('belohnungen.json').catch(() => ({ belohnungen: [] })),
        ]);
        this.rewards = rewards.belohnungen || [];
        const entries = index.lektionen || [];
        const loaded = await Promise.all(entries.map(async (e) => {
          try {
            return normalizeLesson(e.id, await fetchJson(e.datei));
          } catch {
            return null;
          }
        }));
        this.lessons = loaded.filter(Boolean);
        if (this.lessons.length === 0) this.error = 'Noch keine Lektion gefunden.';
      } catch (err) {
        this.error = 'Die Lektionen konnten nicht geladen werden. Bitte Seite neu laden.';
      }
      this.loading = false;
    },

    // ---------- Lernstand
    progressOf(lesson) {
      return repairProgress(this.store[lesson.id]);
    },
    get progress() {
      return this.lesson ? this.progressOf(this.lesson) : emptyProgress();
    },
    setProgress(p) {
      this.store = { ...this.store, [this.lesson.id]: p };
      saveStore(this.store);
    },

    // ---------- Navigation
    go(screen) {
      this.screen = screen;
      window.scrollTo(0, 0);
    },
    back() {
      if (['lesson'].includes(this.screen)) this.go('start');
      else this.go('lesson');
    },
    openLesson(lesson) {
      this.lesson = lesson;
      this.go('lesson');
    },
    get subtitle() {
      if (!this.lesson) return '';
      if (this.screen === 'cards' || this.screen === 'quiz') return `${this.lesson.name} · ${this.sessionLabel}`;
      if (['done', 'medal', 'list', 'pins'].includes(this.screen)) return this.lesson.name;
      return '';
    },
    get counter() {
      if ((this.screen === 'cards' || this.screen === 'quiz') && this.session.length) return `${this.index + 1} / ${this.session.length}`;
      return '';
    },
    get title() {
      const t = { cards: 'Karteikarten', quiz: 'Quiz', done: 'Fertig', medal: 'Orden', list: `Alle ${this.lesson?.words.length || ''} Wörter`, pins: 'Nochmal üben' };
      return this.screen === 'lesson' ? this.lesson?.name : t[this.screen] || '';
    },

    // ---------- Lektionsseite
    get parts() {
      return this.lesson ? splitParts(this.lesson.words) : [];
    },
    get selected() {
      const max = this.parts.length;
      const sel = this.progress.selected.filter((i) => i < max);
      return sel.length ? sel : [0];
    },
    isSelected(i) {
      return this.selected.includes(i);
    },
    toggleSelected(i) {
      this.setProgress({ ...this.progress, selected: toggleSelected(this.selected, i) });
    },
    selectAll() {
      this.setProgress({ ...this.progress, selected: this.parts.map((_, i) => i) });
    },
    get allSelected() {
      return this.selected.length === this.parts.length;
    },
    get partWords() {
      return this.selected.flatMap((i) => this.parts[i] || []);
    },
    get selectionLabel() {
      return `Wörter ${selectionRange(this.selected, this.lesson.words.length)}`;
    },
    get selectionTitle() {
      if (this.selected.length === 1) return `Teil ${this.selected[0] + 1} von ${this.parts.length}`;
      return this.allSelected ? 'Alle Teile' : `${this.selected.length} von ${this.parts.length} Teilen`;
    },
    partLabel(i) {
      return partRange(i, this.lesson.words.length);
    },
    hasPartMedal(i) {
      return this.progress.partMedals.includes(i);
    },
    get pinnedWords() {
      const p = this.progress;
      return this.lesson ? this.lesson.words.filter((w) => isPinned(p, w)) : [];
    },
    pinCountOf(lesson) {
      return this.progressOf(lesson).pins.length;
    },

    // ---------- Stern („Nochmal üben“)
    pinned(word) {
      return !!word && isPinned(this.progress, word);
    },
    togglePin(word) {
      this.setProgress(togglePin(this.progress, word));
    },

    // ---------- Sprachausgabe
    speak(word) {
      if (!word) return;
      try {
        const u = new SpeechSynthesisUtterance(speakText(word.en));
        u.lang = 'en-GB';
        u.rate = 0.85;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch { /* kein Ton verfügbar */ }
    },

    // ---------- Übungsrunden
    startSession(kind, words) {
      this.sessionKind = kind;
      this.sessionLabel = kind === 'pins' ? 'Nochmal üben' : this.selectionLabel;
      this.session = shuffle(words);
      this.index = 0;
      this.flipped = false;
      this.revealed = false;
      this.picked = null;
      this.score = 0;
      this.total = 0;
      this.newParts = [];
    },
    startCards() {
      this.startSession('part', this.partWords);
      this.go('cards');
    },
    startPinCards() {
      this.startSession('pins', this.pinnedWords);
      this.go('cards');
    },
    startQuiz() {
      this.startSession('part', this.partWords);
      this.prepareQuestion();
      this.go('quiz');
    },
    get current() {
      return this.session[this.index] || null;
    },
    get progressPercent() {
      if (!this.session.length) return '0%';
      const done = this.index + (this.screen === 'quiz' && this.picked !== null ? 1 : 0);
      return `${Math.round((done / this.session.length) * 100)}%`;
    },

    // Karteikarten
    get cardFront() {
      const w = this.current;
      if (!w) return '';
      const showEnglish = (this.dir === 'en') !== this.flipped;
      return showEnglish ? w.en : w.de;
    },
    get showSpell() {
      const w = this.current;
      return !!(w && w.spell) && ((this.dir === 'en' && !this.flipped) || (this.dir === 'de' && this.flipped));
    },
    setDir(dir) {
      this.dir = dir;
      this.flipped = false;
      this.revealed = false;
    },
    flip() {
      // beliebig oft hin- und herdrehen
      this.flipped = !this.flipped;
      if (this.flipped) this.revealed = true;
      if ((this.dir === 'en') !== this.flipped) this.speak(this.current);
    },
    answerCard(knew) {
      if (knew && this.pinned(this.current)) return; // mit Stern gilt das Wort als „noch nicht gewusst“
      this.total += 1;
      if (knew) this.score += 1;
      if (this.index < this.session.length - 1) {
        this.index += 1;
        this.flipped = false;
        this.revealed = false;
      } else {
        this.go('done');
      }
    },

    // Quiz (nur hier gibt es Orden)
    prepareQuestion() {
      this.picked = null;
      this.options = quizOptions(this.current, this.session, this.lesson.words);
      this.$nextTick?.(() => this.speak(this.current));
    },
    pick(option) {
      if (this.picked !== null) return;
      const word = this.current;
      const correct = option === word.de;
      this.picked = option;
      this.total += 1;
      if (correct) this.score += 1;
      this.setProgress(recordQuizAnswer(this.progress, word, correct));
    },
    optionState(option) {
      if (this.picked === null) return 'idle';
      if (option === this.current.de) return 'right';
      if (option === this.picked) return 'wrong';
      return 'idle';
    },
    get pickedRight() {
      return this.picked !== null && this.picked === this.current?.de;
    },
    nextQuestion() {
      if (this.index < this.session.length - 1) {
        this.index += 1;
        this.prepareQuestion();
        return;
      }
      const result = awardMedals(this.progress, this.lesson.words);
      this.setProgress(result.progress);
      this.newParts = result.newParts;
      if (result.newMedal) {
        this.reward = this.lesson.reward || pickReward(this.rewards);
        this.go('medal');
      } else {
        this.go('done');
      }
    },
    get newPartLabel() {
      if (!this.newParts.length) return '';
      return this.newParts.map((i) => `Wörter ${this.partLabel(i)}`).join(' und ');
    },
  };
}
