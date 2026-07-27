/**
 * 🎵 SHARED AUDIO CONTEXT & SOURCE NODE MANAGER
 * Ensures createMediaElementSource is called ONLY ONCE per HTMLMediaElement
 * preventing InvalidStateError in Web Audio API / React Strict Mode across EQ & Visualizers.
 */

interface SharedAudioEntry {
  source: MediaElementAudioSourceNode;
  context: AudioContext;
}

const sharedAudioSourceMap = new WeakMap<HTMLAudioElement, SharedAudioEntry>();

export function getOrCreateSharedAudioSource(audioEl: HTMLAudioElement): SharedAudioEntry | null {
  if (!audioEl) return null;

  if (sharedAudioSourceMap.has(audioEl)) {
    const existing = sharedAudioSourceMap.get(audioEl)!;
    if (existing.context.state !== 'closed') {
      if (existing.context.state === 'suspended') {
        existing.context.resume().catch(() => {});
      }
      return existing;
    }
    sharedAudioSourceMap.delete(audioEl);
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }

    const source = context.createMediaElementSource(audioEl);
    const entry: SharedAudioEntry = { source, context };
    sharedAudioSourceMap.set(audioEl, entry);
    return entry;
  } catch (err) {
    // If it was already connected or unavailable, catch safely without throwing unhandled errors
    return null;
  }
}
