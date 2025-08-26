import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { EventEmitter } from 'events'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface QueuedRequest {
  id: string
  method: 'POST' | 'PUT' | 'DELETE'
  url: string
  data: any
  timestamp: number
  retries: number
}

// Twitter-style offline support
export class OfflineManager extends EventEmitter {
  private static instance: OfflineManager
  private isOnline: boolean = true
  private requestQueue: QueuedRequest[] = []
  private cache = new Map<string, CacheEntry<any>>()
  
  // Cache configuration similar to Twitter
  private readonly CACHE_PREFIX = '@korus_cache:'
  private readonly QUEUE_PREFIX = '@korus_queue:'
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
  private readonly DEFAULT_CACHE_TIME = 5 * 60 * 1000 // 5 minutes
  
  private constructor() {
    super()
    this.initializeNetworkListener()
    this.loadQueueFromStorage()
  }

  static getInstance(): OfflineManager {
    if (!this.instance) {
      this.instance = new OfflineManager()
    }
    return this.instance
  }

  private async initializeNetworkListener() {
    const state = await NetInfo.fetch()
    this.isOnline = state.isConnected ?? false
    
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected ?? false
      
      if (wasOffline && this.isOnline) {
        this.emit('online')
        this.processQueue()
      } else if (!this.isOnline) {
        this.emit('offline')
      }
    })
  }

  // Cache management
  async getCached<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memCached = this.cache.get(key)
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.data
    }
    
    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(this.CACHE_PREFIX + key)
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored)
        if (entry.expiresAt > Date.now()) {
          // Restore to memory cache
          this.cache.set(key, entry)
          return entry.data
        } else {
          // Clean expired
          await AsyncStorage.removeItem(this.CACHE_PREFIX + key)
        }
      }
    } catch (error) {
      console.error('Cache read error:', error)
    }
    
    return null
  }

  async setCached<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttl || this.DEFAULT_CACHE_TIME)
    }
    
    // Set in memory
    this.cache.set(key, entry)
    
    // Persist to storage
    try {
      await AsyncStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(entry)
      )
      
      // Check cache size and cleanup if needed
      await this.checkCacheSize()
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  private async checkCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX))
      
      // Simple LRU: remove oldest entries if over limit
      if (cacheKeys.length > 100) {
        const entries = await Promise.all(
          cacheKeys.map(async key => {
            const data = await AsyncStorage.getItem(key)
            return { key, data: data ? JSON.parse(data) : null }
          })
        )
        
        entries
          .filter(e => e.data)
          .sort((a, b) => a.data.timestamp - b.data.timestamp)
          .slice(0, 20) // Remove oldest 20
          .forEach(e => AsyncStorage.removeItem(e.key))
      }
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX))
      await AsyncStorage.multiRemove(cacheKeys)
      this.cache.clear()
    } catch (error) {
      console.error('Clear cache error:', error)
    }
  }

  // Invalidate cache entries matching pattern
  invalidateCache(pattern: string) {
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Request queue for offline actions
  async queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    }
    
    this.requestQueue.push(queuedRequest)
    await this.saveQueueToStorage()
    
    if (this.isOnline) {
      this.processQueue()
    }
    
    return queuedRequest.id
  }

  private async processQueue() {
    if (this.requestQueue.length === 0) return
    
    const queue = [...this.requestQueue]
    
    for (const request of queue) {
      try {
        // Execute the request
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            // Add auth headers
          },
          body: JSON.stringify(request.data)
        })
        
        if (response.ok) {
          // Remove from queue
          this.requestQueue = this.requestQueue.filter(r => r.id !== request.id)
          this.emit('requestCompleted', request.id)
        } else if (response.status >= 400 && response.status < 500) {
          // Client error, remove from queue
          this.requestQueue = this.requestQueue.filter(r => r.id !== request.id)
          this.emit('requestFailed', request.id, 'Client error')
        } else {
          // Server error, retry
          request.retries++
          if (request.retries >= 3) {
            this.requestQueue = this.requestQueue.filter(r => r.id !== request.id)
            this.emit('requestFailed', request.id, 'Max retries exceeded')
          }
        }
      } catch (error) {
        // Network error, keep in queue
        console.error('Queue processing error:', error)
      }
    }
    
    await this.saveQueueToStorage()
  }

  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem(
        this.QUEUE_PREFIX + 'requests',
        JSON.stringify(this.requestQueue)
      )
    } catch (error) {
      console.error('Queue save error:', error)
    }
  }

  private async loadQueueFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_PREFIX + 'requests')
      if (stored) {
        this.requestQueue = JSON.parse(stored)
        if (this.isOnline) {
          this.processQueue()
        }
      }
    } catch (error) {
      console.error('Queue load error:', error)
    }
  }

  // Optimistic updates
  optimisticUpdate<T>(key: string, updater: (current: T | null) => T): void {
    this.getCached<T>(key).then(current => {
      const updated = updater(current)
      this.setCached(key, updated)
      this.emit('optimisticUpdate', key, updated)
    })
  }

  // Check if online
  getIsOnline(): boolean {
    return this.isOnline
  }
}

export const offlineManager = OfflineManager.getInstance()