import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CirclesScreen } from './screens/CirclesScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SoloLedgersScreen } from './screens/SoloLedgersScreen';
import { SoloLedgerDetailScreen } from './screens/SoloLedgerDetailScreen';
import { TabBar } from './navigation/TabBar';
import { UpdatePopup } from './components/UpdatePopup';
import { colors, spacing, typography } from './theme';

type TabKey = 'home' | 'circles' | 'ledger' | 'solo' | 'profile';

function Gate() {
  const { status } = useAuth();
  const [tab, setTab] = useState<TabKey>('home');
  const [guest, setGuest] = useState(false);
  const [soloId, setSoloId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn') setTab('home');
  }, [status]);

  const body = useMemo(() => {
    if (status === 'loading') {
      return (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Turna</Text>
        </View>
      );
    }
    if (status === 'needsVerify' || status === 'signedOut') {
      if (guest) {
        return <AuthScreen onSwitch={() => setGuest(false)} />;
      }
      return <AuthScreen onSwitch={() => setGuest(true)} />;
    }
    if (status === 'onboarding') {
      return <OnboardingScreen />;
    }
    switch (tab) {
      case 'circles':
        return <CirclesScreen />;
      case 'ledger':
        return <LedgerScreen />;
      case 'solo':
        if (soloId) {
          return (
            <SoloLedgerDetailScreen ledgerId={soloId} onBack={() => setSoloId(null)} />
          );
        }
        return <SoloLedgersScreen onOpen={setSoloId} />;
      case 'profile':
        return <ProfileScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  }, [status, tab, guest, soloId]);

  const showTabs = status === 'signedIn';

  return (
    <View style={styles.root}>
      <View style={styles.body}>{body}</View>
      {showTabs && (
        <TabBar
          active={tab}
          onChange={(k) => {
            if (k !== 'solo') setSoloId(null);
            setTab(k);
          }}
        />
      )}
      <UpdatePopup />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.forest,
  },
  body: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.forest,
  },
  loadingText: {
    color: colors.white,
    fontSize: typography.title,
    fontWeight: '700',
    marginTop: spacing.md,
  },
});
