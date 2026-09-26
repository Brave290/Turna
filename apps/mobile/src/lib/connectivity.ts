import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { drainQueue } from './offline';

/**
 * Online/offline state for the offline banner — NetInfo reachability, with a
 * queue drain whenever connectivity returns.
 */
export function useConnectivity(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const reachable = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setOnline((prev) => {
        if (reachable && !prev) void drainQueue();
        return reachable;
      });
    });
    NetInfo.fetch()
      .then((state) => {
        const reachable = Boolean(state.isConnected) && state.isInternetReachable !== false;
        setOnline(reachable);
        if (reachable) void drainQueue();
      })
      .catch(() => undefined);
    return unsub;
  }, []);

  return online;
}
