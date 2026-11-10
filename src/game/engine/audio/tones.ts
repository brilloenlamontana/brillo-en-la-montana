// Tiny synthesized sound effects (Web Audio): the game ships no audio files. Browsers only allow sound after the
// player has interacted with the page, which is always the case while playing.
let context: AudioContext | null = null;

// A tone that glides from one pitch to another and fades out (a wail, a thud, a chime).
export function playGlide(fromHz: number, toHz: number, seconds: number, volume = 0.08, type: OscillatorType = 'sine') {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(fromHz, now);
    oscillator.frequency.exponentialRampToValueAtTime(toHz, now + seconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.05);
  } catch {
    // No audio device or blocked by the browser: the game goes on silent.
  }
}
