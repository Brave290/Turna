export async function requestFcmPermission(): Promise<boolean> {
  return false;
}

export async function getFcmToken(): Promise<string | null> {
  return null;
}

export async function initFcm(): Promise<void> {}

export function onMessage(_handler: (payload: unknown) => void): () => void {
  return () => {};
}
