import { useEffect, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';

/** First 6-digit group in the clipboard text, or null. */
export async function clipboardOtp(): Promise<string | null> {
  try {
    const match = (await Clipboard.getString()).match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Poll the clipboard while `active` and emit each *new* 6-digit code once —
 * used to auto-verify email codes the moment the mail app copies them.
 */
export function useClipboardOtp(active: boolean, onCode: (code: string) => void) {
  const cb = useRef(onCode);
  cb.current = onCode;
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const tick = async () => {
      const code = await clipboardOtp();
      if (code && code !== last.current) {
        last.current = code;
        cb.current(code);
      }
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, [active]);
}
