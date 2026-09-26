import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import { palettes, type Palette } from '../theme';
import { getPrefs, loadPrefs, savePrefs, subscribePrefs } from '../lib/prefs';
import { useAuth } from './AuthContext';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeValue>({
  mode: 'system',
  resolved: 'light',
  palette: palettes.light,
  setMode: () => undefined,
});

function readMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function systemScheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * Light/dark theme: account `theme` preference (system|light|dark) wins, with
 * the device color scheme as the fallback for `system` — mirrors web settings.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => readMode(getPrefs().theme));
  const [system, setSystem] = useState<'light' | 'dark'>(systemScheme);

  useEffect(() => {
    void loadPrefs(user?.id);
    const unsub = subscribePrefs((p) => setModeState(readMode(p.theme)));
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystem(colorScheme === 'dark' ? 'dark' : 'light')
    );
    return () => {
      unsub();
      sub.remove();
    };
  }, [user?.id]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      void savePrefs(user?.id, { theme: next });
    },
    [user?.id]
  );

  const value = useMemo<ThemeValue>(() => {
    const resolved = mode === 'system' ? system : mode;
    return { mode, resolved, palette: palettes[resolved], setMode };
  }, [mode, system, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

export function usePalette(): Palette {
  return useContext(ThemeContext).palette;
}

/**
 * Builds a stylesheet from the active palette and hands back the palette too:
 * `const { p, styles } = usePaletteStyles(makeStyles);`
 */
export function usePaletteStyles<T extends object>(
  make: (p: Palette) => T
): { styles: T; p: Palette } {
  const palette = usePalette();
  const styles = useMemo(() => make(palette), [make, palette]);
  return { styles, p: palette };
}
