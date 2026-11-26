import { isDevUser, useAuthStore } from '@/store/authStore';

// Which narrations this player already heard to the end, kept in this browser (not in the saved progress: it is only a
// convenience). A narration heard once can be skipped the next time it is told (ParchmentDialog).

const storageKey = () => `brillo.narracionesOidas.${useAuthStore.getState().user?.uid ?? 'anon'}`;

// Short fingerprint of what is said (its voices and its text).
function fingerprint(said: string): string {
  let hash = 5381;
  for (let i = 0; i < said.length; i++) hash = (Math.imul(hash, 33) ^ said.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

// The test player of the ?dev= presets starts a new game on every load: what it heard is kept for that visit only,
// or a first talk with a character would offer "Saltar" because of an earlier test in the same browser.
const devHeard: string[] = [];
const isDev = () => isDevUser(useAuthStore.getState().user?.uid);

function read(): string[] {
  if (isDev()) return devHeard;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
    return Array.isArray(saved) ? saved.filter((each): each is string => typeof each === 'string') : [];
  } catch {
    return [];
  }
}

export const wasHeard = (said: string) => read().includes(fingerprint(said));

export function markHeard(said: string) {
  const id = fingerprint(said);
  const heard = read();
  if (heard.includes(id)) return;
  if (isDev()) return void devHeard.push(id);
  try {
    localStorage.setItem(storageKey(), JSON.stringify([...heard, id]));
  } catch {
    // Private window or storage full: it will just not be skippable.
  }
}
