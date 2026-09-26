import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';

const ASKED_KEY = 'turna:notifications-perm-asked';

/**
 * One-time POST_NOTIFICATIONS prompt (Android 13+ / API 33+).
 * Runs once after sign-in; denial is remembered and never re-prompted —
 * in-app notifications keep working either way.
 */
export async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Number(Platform.Version) < 33) return;
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) return;
    await PermissionsAndroid.request(permission);
  } catch {
    /* permission prompts are best-effort */
  }
}
