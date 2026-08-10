import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { theme } from '../theme';

/**
 * Shown when the device has no usable connection.
 *
 * Every screen here loads from the network, so without this an offline user
 * just sees empty lists and failed actions with no explanation.
 *
 * `isInternetReachable` is deliberately preferred over `isConnected`: being
 * attached to a wifi network that has no working internet is common and looks
 * identical to being online otherwise.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown — do not shout during that.
      const reachable =
        state.isInternetReachable === null ? state.isConnected : state.isInternetReachable;
      setOffline(!reachable);
    });
    return () => unsubscribe();
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.text}>No connection — showing what was already loaded</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: { color: '#fecaca', fontSize: 12.5, textAlign: 'center' },
});
