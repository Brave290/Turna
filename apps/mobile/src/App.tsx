import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {APP_NAME} from '@turna/config';

const COLORS = {
  forest: '#03251B',
  primary: '#00A878',
  cream: '#F7F7F0',
  muted: '#8D9B95',
} as const;

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.forest} />
      <View style={styles.container}>
        <View style={styles.mark}>
          <Text style={styles.markLetter}>T</Text>
        </View>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Save together. Grow together.</Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Dashboard coming next</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.forest,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.forest,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  markLetter: {
    color: COLORS.forest,
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    color: COLORS.cream,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 13,
  },
});
