declare module 'tweetnacl' {
  export namespace sign {
    namespace detached {
      function verify(
        message: Uint8Array,
        signature: Uint8Array,
        publicKey: Uint8Array
      ): boolean
    }
  }
}