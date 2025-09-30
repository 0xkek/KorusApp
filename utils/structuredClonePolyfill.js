// Polyfill for structuredClone which is not available in React Native
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}