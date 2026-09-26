import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import { loadPrefs, subscribePrefs } from '../lib/prefs';
import { useAuth } from './AuthContext';

type MotionValue = { reduceMotion: boolean };

const MotionContext = createContext<MotionValue>({ reduceMotion: false });

/**
 * Reduce-motion flag: account `reduce_motion` preference wins, otherwise the
 * system accessibility setting is the default source.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pref, setPref] = useState<boolean | null>(null);
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (alive) setSystemReduce(!!enabled);
      })
      .catch(() => {
        /* device setting unavailable — assume off */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setSystemReduce(!!v)
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    void loadPrefs(user?.id);
    return subscribePrefs((p) =>
      setPref(typeof p.reduce_motion === 'boolean' ? p.reduce_motion : null)
    );
  }, [user?.id]);

  const value = useMemo<MotionValue>(
    () => ({ reduceMotion: pref === null ? systemReduce : pref }),
    [pref, systemReduce]
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionValue {
  return useContext(MotionContext);
}
