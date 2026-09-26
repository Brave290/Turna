import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography, type Palette } from '../theme';
import { Button } from './Button';
import { usePaletteStyles } from '../context/ThemeContext';

/** Branded popup shell — the app's one way to open a dialog. */
export function Popup({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { p, styles } = usePaletteStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.card} onPress={() => undefined}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Branded confirm dialog (replaces the native alert) — mirrors the web useConfirm.
 * const { confirm, node } = useConfirm(); … if (await confirm({...})) …; render {node}
 */
export function useConfirm() {
  const { p, styles } = usePaletteStyles(makeStyles);
  const [state, setState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    resolve?: (ok: boolean) => void;
  } | null>(null);

  function confirm(
    title: string,
    message: string,
    opts?: { confirmLabel?: string; danger?: boolean }
  ) {
    return new Promise<boolean>((resolve) => {
      setState({
        title,
        message,
        confirmLabel: opts?.confirmLabel ?? 'Confirm',
        danger: opts?.danger ?? false,
        resolve,
      });
    });
  }

  function settle(ok: boolean) {
    state?.resolve?.(ok);
    setState(null);
  }

  const node = state ? (
    <Popup
      visible
      onClose={() => settle(false)}
      title={state.title}
      subtitle={state.message}
      footer={
        <View style={styles.actions}>
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => settle(false)}
            style={{ flex: 1 }}
          />
          <Button
            label={state.confirmLabel}
            variant={state.danger ? 'danger' : 'primary'}
            onPress={() => settle(true)}
            style={{ flex: 1 }}
          />
        </View>
      }
    />
  ) : null;

  return { confirm, node };
}

const makeStyles = (p: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: p.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: p.border,
    padding: spacing.xl,
    shadowColor: '#0A1628',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: p.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.caption + 1,
    lineHeight: 20,
    color: p.textMuted,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
