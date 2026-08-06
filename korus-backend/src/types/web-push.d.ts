/**
 * Fallback declaration for `web-push`.
 *
 * @types/web-push is a devDependency, but Render reuses a cached node_modules
 * between builds and does not always install newly added devDependencies —
 * which failed the build with TS7016 even though the package was in
 * package.json and the lockfile. Declaring the module here means compilation
 * never depends on those types resolving.
 *
 * When @types/web-push IS present its real declarations win, since a types
 * package takes precedence over an ambient module declaration.
 */
declare module 'web-push' {
  export interface RequestOptions {
    TTL?: number
    headers?: Record<string, string>
    urgency?: string
    topic?: string
  }

  export interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  export interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string }

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>

  const webpush: {
    setVapidDetails: typeof setVapidDetails
    generateVAPIDKeys: typeof generateVAPIDKeys
    sendNotification: typeof sendNotification
  }

  export default webpush
}
