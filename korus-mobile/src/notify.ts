import { Alert, Platform, ToastAndroid } from 'react-native';

/**
 * A brief, non-blocking message.
 *
 * Android's native toast is the right weight for "why did nothing happen" —
 * it needs no dismissal and does not interrupt. iOS has no equivalent, so it
 * falls back to an alert there rather than pulling in a toast library.
 */
export function notify(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
}
