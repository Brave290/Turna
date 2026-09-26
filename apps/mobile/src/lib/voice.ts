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
  onSpeechError?: (e: { error?: { code?: string; message?: string } }) => void;
};

/**
 * Voice typing — thin wrapper over `@react-native-voice/voice`.
 *
 * Only FINAL results are committed (partials are ignored) so a single
 * utterance can never be appended twice. Transient recognition errors surface
 * as a toast but keep the mic usable; only missing-module / permission
 * failures mark the feature unavailable.
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

/** Errors that mean "try again", not "never works". */
function isTransientError(code?: string, message?: string): boolean {
  const m = `${code ?? ''} ${message ?? ''}`;
  // Android SpeechRecognizer codes: 6 busy, 7 no match, 8 retry, 9 timeout,
  // 12 language not supported — all recoverable by pressing again.
  if (/\b(6|7|8|9|12)\b/.test(m)) return true;
  return /no match|timeout|busy|retry|too many requests/i.test(m);
}

export type VoiceTypingState = {
  listening: boolean;
  supported: boolean;
  toggle: () => void;
};

const LISTEN_TIMEOUT_MS = 60_000;

/**
 * Press-to-dictate: start → on stop/silence the FINAL transcript commits
 * through `onResult` exactly once. Press again → stop. Unrecoverable
 * problems call `onUnavailable` (feature disabled); recoverable ones call
 * `onError` (toast) so the mic stays usable.
 */
export function useVoiceTyping(opts: {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  onUnavailable?: (reason: string) => void;
}): VoiceTypingState {
  const { onResult, onError, onUnavailable } = opts;
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const alive = useRef(true);
  const startedRef = useRef(false);
  const resultRef = useRef(onResult);
  resultRef.current = onResult;
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const fail = useCallback((reason: string) => {
    if (!alive.current) return;
    clearTimer();
    startedRef.current = false;
    setListening(false);
    setSupported(false);
    unavailableRef.current?.(reason);
  }, []);

  const stop = useCallback(async () => {
    const voice = getVoice();
    if (!voice) return;
    try {
      await voice.stop();
    } catch {
      /* already stopped */
    }
    clearTimer();
    if (alive.current) {
      startedRef.current = false;
      setListening(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    const voice = getVoice();
    if (!voice) {
      fail('Voice typing unavailable');
      return;
    }
    if (listening || startedRef.current) {
      await stop();
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) {
      fail('Microphone access denied');
      return;
    }
    try {
      // Final results only — committed once, never duplicated.
      voice.onSpeechResults = (e: { value?: string[] }) => {
        const text = (e.value ?? []).filter(Boolean).join(' ').trim();
        clearTimer();
        startedRef.current = false;
        if (alive.current) setListening(false);
        if (text) resultRef.current(text);
      };
      voice.onSpeechPartialResults = () => {
        /* live feedback only — partials must never be committed */
      };
      voice.onSpeechError = (e: { error?: { code?: string; message?: string } }) => {
        const code = e?.error?.code;
        const msg = e?.error?.message ?? '';
        clearTimer();
        startedRef.current = false;
        if (!alive.current) return;
        setListening(false);
        if (/not allowed|permission|denied/i.test(msg)) {
          fail('Microphone access denied');
        } else if (isTransientError(code, msg)) {
          errorRef.current?.('Didn’t catch that — try again');
        } else {
          errorRef.current?.('Voice typing hit a snag — try again');
        }
      };
      await voice.start('en-US');
      if (!alive.current) return;
      startedRef.current = true;
      setListening(true);
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        void stop();
      }, LISTEN_TIMEOUT_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not allowed|permission/i.test(msg)) fail('Microphone access denied');
      else fail('Voice typing unavailable on this device');
    }
  }, [fail, listening, stop]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimer();
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
