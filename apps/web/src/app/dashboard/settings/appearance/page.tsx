'use client';

import { useEffect, useState } from 'react';
import { SettingsGroup, SettingsPanel } from '@/components/dashboard/settings/shell';
import { PrefRadio, PrefToggle } from '@/components/dashboard/settings/pref-controls';

const STORAGE_KEY = 'turna-theme';

type ThemeChoice = 'system' | 'light' | 'dark';

function readTheme(): ThemeChoice {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(value: ThemeChoice) {
  if (value === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = value;
  }
  window.localStorage.setItem(STORAGE_KEY, value);
}

/**
 * Appearance — theme (system/light/dark) + reduce motion.
 * Theme applied immediately; preferences saved to user_preferences.
 */
export default function AppearancePage() {
  const [current, setCurrent] = useState<ThemeChoice>('system');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setCurrent(readTheme());
    const storedMotion = window.localStorage.getItem('turna-reduce-motion');
    setReduceMotion(storedMotion === 'true');
  }, []);

  function pick(value: ThemeChoice) {
    setCurrent(value);
    applyTheme(value);
  }

  return (
    <div>
      <SettingsPanel
        title="Theme"
        description="Turna keeps its identity in light and dark."
      >
        <SettingsGroup>
          <PrefRadio
            name="theme"
            value="system"
            label="System"
            description="Match your device"
            checked={current === 'system'}
          />
          <PrefRadio
            name="theme"
            value="light"
            label="Light"
            description="Bright and clear"
            checked={current === 'light'}
          />
          <PrefRadio
            name="theme"
            value="dark"
            label="Dark"
            description="Easy on the eyes"
            checked={current === 'dark'}
          />
        </SettingsGroup>
        {/* Client-side apply when PrefRadio saves via server action */}
        <ThemeWatcher onChange={pick} />
      </SettingsPanel>

      <SettingsPanel title="Motion">
        <SettingsGroup>
          <div onClickCapture={() => {
            const next = !reduceMotion;
            setReduceMotion(next);
            window.localStorage.setItem('turna-reduce-motion', String(next));
            document.documentElement.dataset.reduceMotion = String(next);
          }}>
            <PrefToggle
              name="reduce_motion"
              label="Reduce motion"
              description="Minimise page and navigation animations"
              defaultChecked={reduceMotion}
            />
          </div>
        </SettingsGroup>
      </SettingsPanel>
    </div>
  );
}

/** Applies theme when localStorage theme key changes (after PrefRadio save). */
function ThemeWatcher({ onChange }: { onChange: (v: ThemeChoice) => void }) {
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = readTheme();
      applyTheme(v);
      onChange(v);
    }, 400);
    return () => window.clearInterval(id);
  }, [onChange]);
  return null;
}
