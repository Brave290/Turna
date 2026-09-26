import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
/**
 * Structural slice of `@react-native-voice/voice` — declared locally so a
 * guarded `require` type-checks without depending on the package's class shape.
 */
export type VoiceApi = {
  start(locale: string): Promise<unknown>;
  stop(): Promise<unknown>;
  cancel(): Promise<unknown>;
  onSpeechResults?: (e: { value?: string[] }) => void;
  onSpeechPartialResults?: (e: { value?: string[] }) => void;
  onSpeechError?: (e: { error?: { message?: string } }) => void;
};

/**
 * Voice typing — thin wrapper over `@react-native-voice/voice`.
 *
 * The native module is loaded with a guarded `require` so a missing/unsupported
 * build degrades to "unavailable" instead of crashing (and a bundler that cannot
 * resolve the package fails loudly at build time, not at runtime).
 */

let cached: VoiceApi | null | undefined;

function getVoice(): VoiceApi | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-voice/voice') as
      | { default?: VoiceApi }
      | VoiceApi;
    const resolved = (mod as { default?: VoiceApi })?.default ?? (mod as VoiceApi);
    cached = resolved && typeof resolved.start === 'function' ? resolved : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isVoiceAvailable(): boolean {
  return getVoice() !== null;
}

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone access',
        message: 'Turna uses your microphone for voice typing.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export type VoiceTypingState = {
  listening: boolean;
  supported: boolean;
  toggle: () => void;
};

/**
 * Press-to-dictate: start → partial/final results are appended through
 * `onTranscript`, press again → stop. Any failure marks the feature
 * unavailable so callers can hide/disable their mic button.
 */
export function useVoiceTyping(opts: {
  onTranscript: (text: string) => void;
  onUnavailable?: (reason: string) => void;
}): VoiceTypingState {
  const { onTranscript, onUnavailable } = opts;
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const alive = useRef(true);
  const transcript = useRef(onTranscript);
  transcript.current = onTranscript;
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;

  const fail = useCallback((reason: string) => {
    if (!alive.current) return;
    setListening(false);
    setSupported(false);
    unavailable.current?.(reason);
  }, []);

  const stop = useCallback(async () => {
    const voice = getVoice();
    if (!voice) return;
    try {
      await voice.stop();
    } catch {
      /* already stopped */
    }
    if (alive.current) setListening(false);
  }, []);

  const toggle = useCallback(async () => {
    const voice = getVoice();
    if (!voice) {
      fail('Voice typing unavailable');
      return;
    }
    if (listening) {
      await stop();
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      fail('Microphone access denied');
      return;
    }
    try {
      voice.onSpeechResults = (e: { value?: string[] }) => {
        const text = (e.value ?? []).filter(Boolean).join(' ').trim();
        if (text) transcript.current(text);
      };
      voice.onSpeechPartialResults = (e: { value?: string[] }) => {
        const text = (e.value ?? []).filter(Boolean)[0]?.trim();
        if (text) transcript.current(text);
      };
      voice.onSpeechError = (e: { error?: { message?: string } }) => {
        const msg = e?.error?.message ?? '';
        if (/not allowed|permission|denied/i.test(msg)) fail('Microphone access denied');
        else if (listening) setListening(false);
      };
      await voice.start('en-US');
      setListening(true);
    } catch {
      fail('Voice typing unavailable');
    }
  }, [fail, listening, stop]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const voice = getVoice();
      if (voice) {
        try {
          void voice.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { listening, supported, toggle };
}
