import { useAudioStore } from './audioStore';
import { ambienceUrl, musicUrl, SFX, sfxUrl, voiceUrl, type AmbienceId, type MusicId, type SfxId } from './catalog';

// The sound of the game (Web Audio): one-shot effects, looping beds (music, ambience, loops placed in the world) and
// the voices of the dialogs. Browsers only let a page sound after the player has interacted with it, so everything
// here fails silently until then and the game simply goes on without sound.

type Bus = 'sfx' | 'music' | 'ambience';
const BUS_VOLUME: Record<Bus, number> = { sfx: 0.85, music: 0.3, ambience: 0.45 };
// While a voice speaks, music and ambience step back.
const DUCKED = 0.4;
const DUCK_SECONDS = 0.4;
const CROSSFADE_SECONDS = 1.6;
// MP3 files carry a few milliseconds of silence at both ends: loops skip them so they do not click.
const LOOP_TRIM = 0.05;

type Graph = { context: AudioContext; master: GainNode; buses: Record<Bus, GainNode> };
let graph: Graph | null = null;
let failed = false;

function getGraph(): Graph | null {
  if (graph || failed) return graph;
  try {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = useAudioStore.getState().muted ? 0 : 1;
    master.connect(context.destination);
    const bus = (volume: number) => {
      const gain = context.createGain();
      gain.gain.value = volume;
      gain.connect(master);
      return gain;
    };
    graph = { context, master, buses: { sfx: bus(BUS_VOLUME.sfx), music: bus(BUS_VOLUME.music), ambience: bus(BUS_VOLUME.ambience) } };
  } catch {
    failed = true;
  }
  return graph;
}

const ramp = (gain: GainNode, value: number, seconds: number, context: AudioContext) => {
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(value, now + seconds);
};

useAudioStore.subscribe((state) => {
  if (graph) ramp(graph.master, state.muted ? 0 : 1, 0.15, graph.context);
  if (voice) voice.element.muted = state.muted;
});

// Called on the first key or tap: from then on the browser lets the game sound.
const waitingForGesture = new Set<() => void>();
export function unlockAudio() {
  const g = getGraph();
  if (g && g.context.state === 'suspended') void g.context.resume();
  for (const retry of [...waitingForGesture]) retry();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

// ---------------------------------------------------------------- Buffers

const buffers = new Map<string, Promise<AudioBuffer | null>>();

function decode(url: string): Promise<AudioBuffer | null> {
  const g = getGraph();
  if (!g) return Promise.resolve(null);
  return fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
    .then((data) => g.context.decodeAudioData(data))
    .catch(() => null);
}

// Effects are short: decoded once and kept.
function loadEffect(url: string) {
  let buffer = buffers.get(url);
  if (!buffer) {
    buffer = decode(url);
    buffers.set(url, buffer);
  }
  return buffer;
}

// ---------------------------------------------------------------- One-shot effects

const lastTake = new Map<SfxId, number>();

function pickTake(id: SfxId) {
  const takes = SFX[id];
  if (takes === 1) return 1;
  // Never the same take twice in a row.
  let take = 1 + Math.floor(Math.random() * takes);
  if (take === lastTake.get(id)) take = (take % takes) + 1;
  lastTake.set(id, take);
  return take;
}

// Downloads and decodes effects ahead of time, so the first time they play there is no delay.
export function preloadSfx(ids: readonly SfxId[]) {
  for (const id of ids) for (let take = 1; take <= SFX[id]; take++) void loadEffect(sfxUrl(id, take));
}

type SfxOptions = { volume?: number; rate?: number };

export function playSfx(id: SfxId, { volume = 1, rate = 1 }: SfxOptions = {}) {
  const g = getGraph();
  if (!g || g.context.state !== 'running') return;
  void loadEffect(sfxUrl(id, pickTake(id))).then((buffer) => {
    if (!buffer) return;
    const source = g.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = g.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(g.buses.sfx);
    source.start();
  });
}

// A recorded line called out in the world (a character shouting from a distance): it plays like an effect, at the
// volume given, and does not interrupt whoever is speaking in a dialog.
export function shout(clip: string, { volume = 1, rate = 1 }: SfxOptions = {}) {
  const g = getGraph();
  if (!g || g.context.state !== 'running') return;
  void loadEffect(voiceUrl(clip)).then((buffer) => {
    if (!buffer) return;
    const source = g.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = g.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(g.buses.sfx);
    source.start();
  });
}

// ---------------------------------------------------------------- Loops

export type Loop = {
  // 0 to 1, reached over `seconds`.
  setVolume: (volume: number, seconds?: number) => void;
  stop: (seconds?: number) => void;
};

const SILENT_LOOP: Loop = { setVolume: () => undefined, stop: () => undefined };

// A sound that repeats until stopped. `keep` holds its decoded buffer for the next time (short loops of the world);
// music and ambience are long and are let go when they stop.
function startLoop(url: string, bus: Bus, volume: number, keep: boolean): Loop {
  const g = getGraph();
  if (!g) return SILENT_LOOP;
  const gain = g.context.createGain();
  gain.gain.value = 0;
  gain.connect(g.buses[bus]);
  let source: AudioBufferSourceNode | null = null;
  let stopped = false;
  let target = volume;

  const begin = (buffer: AudioBuffer | null) => {
    if (!buffer || stopped) return;
    source = g.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    if (buffer.duration > LOOP_TRIM * 4) {
      source.loopStart = LOOP_TRIM;
      source.loopEnd = buffer.duration - LOOP_TRIM;
    }
    source.connect(gain);
    source.start(0, LOOP_TRIM);
    ramp(gain, target, bus === 'sfx' ? 0.3 : CROSSFADE_SECONDS, g.context);
  };
  void (keep ? loadEffect(url) : decode(url)).then(begin);

  return {
    setVolume: (next, seconds = 0.25) => {
      target = next;
      if (source) ramp(gain, next, seconds, g.context);
    },
    stop: (seconds = 0.4) => {
      if (stopped) return;
      stopped = true;
      ramp(gain, 0, seconds, g.context);
      const playing = source;
      setTimeout(
        () => {
          try {
            playing?.stop();
          } catch {
            // Already stopped.
          }
          gain.disconnect();
        },
        seconds * 1000 + 80,
      );
    },
  };
}

// A looping effect of the world (a campfire, a buzzing insect); its volume usually follows the distance to the player.
export const loopSfx = (id: SfxId, volume = 1) => startLoop(sfxUrl(id, 1), 'sfx', volume, true);

// Music and ambience: one track each, crossfaded when it changes. They wait for the first key or tap if needed.
type Channel = { url: string | null; loop: Loop | null };
const channels: Record<'music' | 'ambience', Channel> = { music: { url: null, loop: null }, ambience: { url: null, loop: null } };

function setChannel(name: 'music' | 'ambience', url: string | null) {
  const channel = channels[name];
  if (channel.url === url) return;
  channel.url = url;
  channel.loop?.stop(CROSSFADE_SECONDS);
  channel.loop = null;
  if (!url) return;
  const start = () => {
    waitingForGesture.delete(start);
    if (channel.url !== url || channel.loop) return;
    const g = getGraph();
    if (!g) return;
    if (g.context.state !== 'running') {
      waitingForGesture.add(start);
      void g.context.resume().then(start, () => undefined);
      return;
    }
    channel.loop = startLoop(url, name, 1, false);
  };
  start();
}

export const setMusic = (id: MusicId | null) => setChannel('music', id && musicUrl(id));
export const setAmbience = (id: AmbienceId | null) => setChannel('ambience', id && ambienceUrl(id));

// ---------------------------------------------------------------- Voices

// What is being said: a queue of clips played one after another through one <audio> element (they are long, so they
// stream instead of being decoded whole).
let voice: { element: HTMLAudioElement; token: number } | null = null;
let voiceToken = 0;

function duck(on: boolean) {
  const g = graph;
  if (!g) return;
  ramp(g.buses.music, BUS_VOLUME.music * (on ? DUCKED : 1), DUCK_SECONDS, g.context);
  ramp(g.buses.ambience, BUS_VOLUME.ambience * (on ? DUCKED : 1), DUCK_SECONDS, g.context);
}

export function stopVoice() {
  voiceToken++;
  if (!voice) return;
  voice.element.pause();
  voice.element.removeAttribute('src');
  voice = null;
  duck(false);
}

// Says the clips in order (ids of docs/sonido/guion_voces.csv), replacing whatever was being said. Returns how to
// silence them; that does nothing if something else took over meanwhile.
export function playVoice(clips: readonly string[]): () => void {
  stopVoice();
  if (!clips.length) return () => undefined;
  const token = voiceToken;
  const element = new Audio();
  element.preload = 'auto';
  element.muted = useAudioStore.getState().muted;
  voice = { element, token };
  let index = 0;

  const finish = () => {
    if (voiceToken === token) stopVoice();
  };
  const next = () => {
    if (voiceToken !== token) return;
    if (index >= clips.length) return finish();
    element.src = voiceUrl(clips[index++]);
    element.play().then(
      () => duck(true),
      () => {
        // Not allowed to sound yet (no key or tap so far): try again on the first one.
        const retry = () => {
          waitingForGesture.delete(retry);
          if (voiceToken === token) element.play().then(() => duck(true), finish);
        };
        waitingForGesture.add(retry);
      },
    );
  };
  element.addEventListener('ended', next);
  // A missing file is skipped: the rest is still said.
  element.addEventListener('error', next);
  next();

  return () => {
    if (voiceToken === token) stopVoice();
  };
}
