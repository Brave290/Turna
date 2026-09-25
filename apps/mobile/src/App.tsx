import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CirclesScreen } from './screens/CirclesScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SoloLedgersScreen } from './screens/SoloLedgersScreen';
import { SoloLedgerDetailScreen } from './screens/SoloLedgerDetailScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';
import { AuditLogScreen } from './screens/AuditLogScreen';
import { ContributionsScreen, PayoutsScreen, AdminScreen } from './screens/ExtrasScreens';
import { CircleDetailScreen, CircleMembersScreen, NewCircleScreen, HelpScreen } from './screens/CircleExtrasScreens';
import { JoinCircleScreen } from './screens/JoinCircleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SettingsSubScreen } from './screens/SettingsSubScreen';
import { TabBar } from './navigation/TabBar';
import { UpdatePopup } from './components/UpdatePopup';
import { Logo } from './components/Logo';
import { colors, spacing, typography } from './theme';

type TabKey = 'home' | 'circles' | 'ledger' | 'solo' | 'profile';

type StackScreen =
  | { name: 'home' }
  | { name: 'circles' }
  | { name: 'circle-detail'; circleId: string }
  | { name: 'circle-members'; circleId: string }
  | { name: 'new-circle' }
  | { name: 'join-circle' }
  | { name: 'ledger' }
  | { name: 'solo' }
  | { name: 'solo-detail'; ledgerId: string }
  | { name: 'profile' }
  | { name: 'notifications' }
  | { name: 'insights' }
  | { name: 'payments' }
  | { name: 'audit-log' }
  | { name: 'contributions' }
  | { name: 'payouts' }
  | { name: 'admin' }
  | { name: 'settings' }
  | { name: 'settings-sub'; route: string }
  | { name: 'help' };

function Gate() {
  const { status } = useAuth();
  const [tab, setTab] = useState<TabKey>('home');
  const [guest, setGuest] = useState(false);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [stack, setStack] = useState<StackScreen[]>([{ name: 'home' }]);

  useEffect(() => {
    if (status !== 'signedIn') {
      setTab('home');
      setStack([{ name: 'home' }]);
    }
  }, [status]);

  const current = stack[stack.length - 1];

  const goTab = (k: string) => {
    if (k !== 'solo') setSoloId(null);
    setTab(k as TabKey);
    setStack([{ name: k as TabKey }]);
  };

  const push = (screen: StackScreen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const replace = (screen: StackScreen) => setStack((s) => [...s.slice(0, -1), screen]);

  const renderCurrent = () => {
    switch (current.name) {
      case 'home':
        return <HomeScreen onNavigate={goTab} onPush={push} />;
      case 'circles':
        return <CirclesScreen onPush={push} onNewCircle={() => push({ name: 'new-circle' })} />;
      case 'circle-detail':
        return <CircleDetailScreen circleId={current.circleId} onBack={pop} onOpenMembers={() => push({ name: 'circle-members', circleId: current.circleId })} />;
      case 'circle-members':
        return <CircleMembersScreen circleId={current.circleId} onBack={pop} />;
      case 'new-circle':
        return <NewCircleScreen onDone={() => { pop(); goTab('circles'); }} />;
      case 'join-circle':
        return (
          <JoinCircleScreen
            onBack={pop}
            onJoined={(circleId) => {
              pop();
              push({ name: 'circle-detail', circleId });
            }}
          />
        );
      case 'ledger':
        return <LedgerScreen onPush={push} />;
      case 'solo':
        if (soloId) {
          return <SoloLedgerDetailScreen ledgerId={soloId} onBack={() => { setSoloId(null); pop(); }} />;
        }
        return <SoloLedgersScreen onOpen={(id) => { setSoloId(id); push({ name: 'solo-detail', ledgerId: id }); }} />;
      case 'solo-detail':
        return <SoloLedgerDetailScreen ledgerId={current.ledgerId} onBack={pop} />;
      case 'profile':
        return <ProfileScreen onNavigate={goTab} onPush={push} />;
      case 'notifications':
        return <NotificationsScreen onBack={pop} />;
      case 'insights':
        return <InsightsScreen onBack={pop} />;
      case 'payments':
        return <PaymentsScreen onBack={pop} />;
      case 'audit-log':
        return <AuditLogScreen onBack={pop} />;
      case 'contributions':
        return <ContributionsScreen onBack={pop} />;
      case 'payouts':
        return <PayoutsScreen onBack={pop} />;
      case 'admin':
        return <AdminScreen onBack={pop} />;
      case 'settings':
        return <SettingsScreen onNavigate={(r) => push({ name: 'settings-sub', route: r })} onBack={pop} />;
      case 'settings-sub':
        return <SettingsSubScreen route={current.route as any} onBack={pop} />;
      case 'help':
        return <HelpScreen onBack={pop} />;
    }
  };

  const body = useMemo(() => {
    if (status === 'loading') {
      return (
        <View style={styles.loading}>
          <Logo variant="on-dark" size={72} />
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
    return renderCurrent();
  }, [status, current, soloId]);

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
            setStack([{ name: k as TabKey }]);
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
