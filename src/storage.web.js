// Browser preview storage. The native Android app continues to use src/storage.js
// (expo-sqlite/kv-store); this adapter is selected only on web by Metro.
const KEY = 'cfa1000_progress_v1';

export const EMPTY_PROGRESS = {
  answers: {},
  wrong: {},
  mastered: {},
  favorites: {},
};

export async function loadProgress() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return EMPTY_PROGRESS;
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY_PROGRESS, ...JSON.parse(raw) } : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(progress) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KEY, JSON.stringify(progress));
    }
  } catch {
    // Private browsing or restricted storage may reject writes.
  }
}

export async function clearProgress() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // Keep this a no-op if the browser blocks persistence.
  }
}
