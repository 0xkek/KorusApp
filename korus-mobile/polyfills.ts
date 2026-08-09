/**
 * Polyfills required before any Solana library is imported.
 *
 * React Native has no Node globals. @solana/web3.js needs crypto.getRandomValues
 * for keypair and nonce generation, and Buffer for transaction serialisation.
 * Without these you get opaque runtime errors deep inside web3.js rather than a
 * clear "missing global".
 *
 * Imported first in index.ts so it runs before anything else.
 */

import 'react-native-get-random-values';
import { Buffer as NodeBuffer } from 'buffer';

// `global` is the React Native runtime global; typed loosely here because the
// DOM/Node lib types are not both available in this tsconfig.
const g = globalThis as unknown as {
  Buffer?: typeof NodeBuffer;
  structuredClone?: <T>(value: T) => T;
};

if (typeof g.Buffer === 'undefined') {
  g.Buffer = NodeBuffer;
}

// Some Solana dependencies check for structuredClone, which older RN runtimes
// do not provide.
if (typeof g.structuredClone === 'undefined') {
  g.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
}
