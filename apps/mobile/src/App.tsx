import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Linking, StatusBar, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { drainQueue } from './lib/offline';
import { ensureNotificationPermission } from './lib/notifications-perm';
import { notifyScreenFocus } from './lib/useFastRefresh';
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
import { AuditLogScreen } from './screens/AuditLogScreen';
import { ContributionsScreen, PayoutsScreen } from './screens/ExtrasScreens';
import { CircleDetailScreen, CircleMembersScreen, NewCircleScreen, HelpScreen } from './screens/CircleExtrasScreens';
import { JoinCircleScreen } from './screens/JoinCircleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SettingsSubScreen } from './screens/SettingsSubScreen';
import { DebtsScreen } from './screens/DebtsScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { TabBar } from './navigation/TabBar';
import { UpdatePopup } from './components/UpdatePopup';
import { SplashAnimated } from './components/SplashAnimated';
import { spacing, type Palette } from './theme';
import { usePaletteStyles, useTheme, ThemeProvider } from './context/ThemeContext';
import { MotionProvider } from './context/MotionContext';

type TabKey = 'home' | 'circles' | 'ledger' | 'debts' | 'solo' | 'profile';

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
  | { name: 'audit-log' }
  | { name: 'contributions' }
  | { name: 'payouts' }
  | { name: 'settings' }
  | { name: 'settings-sub'; route: string }
  | { name: 'help' }
  | { name: 'debts' }
  | { name: 'admin' };

function Gate() {
  const { p, styles } = usePaletteStyles(makeStyles);
  const { status, isAdmin } = useAuth();
  const { resolved } = useTheme();
  const [tab, setTab] = useState<TabKey>('home');
  const [soloId, setSoloId] = useState<string | null>(null);
  const [stack, setStack] = useState<StackScreen[]>([{ name: 'home' }]);

  useEffect(() => {
    if (status !== 'signedIn') {
      setTab('home');
      setStack([{ name: 'home' }]);
      return;
    }
    if (!isAdmin) {
      void drainQueue();
      void ensureNotificationPermission();
    }
    return undefined;
  }, [status, isAdmin]);

  // Android back: step backwards through the stack; only exit at the root.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        setStack((s) => s.slice(0, -1));
        return true;
      }
      if (tab !== 'home') {
        setSoloId(null);
        setTab('home');
        setStack([{ name: 'home' }]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack, tab]);

  // Deep links: handle turnaapp:// URLs (e.g. reset-password).
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.startsWith('turnaapp://auth/reset-password')) {
        const match = url.match(/[?&]token=([^&]+)/);
        const token = match ? decodeURIComponent(match[1]) : null;
        const webUrl = token
          ? `https://turnaapp.com/auth/reset-password?token=${encodeURIComponent(token)}`
          : 'https://turnaapp.com/auth/reset-password';
        Linking.openURL(webUrl).catch(() => {});
      }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const current = stack[stack.length - 1];

  // Hand-rolled navigation has no focus events — announce them ourselves so
  // useFastRefresh() screens refetch when they become the top screen.
  useEffect(() => {
    notifyScreenFocus();
  }, [current, tab]);

  const goTab = (k: string) => {
    if (k !== 'solo') setSoloId(null);
    setTab(k as TabKey);
    setStack([{ name: k as TabKey }]);
  };

  const push = (screen: StackScreen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const replace = (screen: StackScreen) => setStack((s) => [...s.slice(0, -1), screen]);

  const renderCurrent = () => {
    if (!current) return <HomeScreen onNavigate={goTab} onPush={push} />;
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
      case 'audit-log':
        return <AuditLogScreen onBack={pop} />;
      case 'contributions':
        return <ContributionsScreen onBack={pop} onPush={push} />;
      case 'payouts':
        return <PayoutsScreen onBack={pop} />;
      case 'settings':
        return <SettingsScreen onNavigate={(r) => push({ name: 'settings-sub', route: r })} onBack={pop} />;
      case 'settings-sub':
        return <SettingsSubScreen route={current.route as any} onBack={pop} />;
      case 'help':
        return <HelpScreen onBack={pop} />;
      case 'debts':
        // Tab root (stack length 1) → back goes Home; pushed on top → pop back.
        return <DebtsScreen onBack={stack.length > 1 ? pop : () => goTab('home')} />;
      case 'admin':
        return <AdminDashboardScreen onBack={stack.length > 1 ? pop : () => goTab('home')} />;
    }
  };

  const body = useMemo(() => {
    if (status === 'loading') {
      return <SplashAnimated />;
    }
    if (status === 'needsVerify' || status === 'signedOut') {
      return <AuthScreen />;
    }
    if (status === 'onboarding') {
      return <OnboardingScreen />;
    }
    if (isAdmin) {
      return <AdminDashboardScreen onBack={() => {}} />;
    }
    return renderCurrent();
  }, [status, current, soloId, isAdmin, styles]);

  const showTabs = status === 'signedIn' && !isAdmin;

  // Baseline status bar for screens that do not render their own: only the
  // splash paints the brand colour (auth/onboarding use the theme background).
  const splash = status === 'loading';

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={splash || resolved === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={splash ? p.brand : p.bg}
      />
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
      <ThemeProvider>
        <MotionProvider>
          <Gate />
        </MotionProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const makeStyles = (p: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: p.brand,
  },
  body: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: p.brand,
  },
});
