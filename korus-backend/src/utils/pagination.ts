// Twitter-style cursor-based pagination
import { Prisma } from '@prisma/client'

export interface PaginationParams {
  limit?: number
  cursor?: string
  maxId?: string
  sinceId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    resultCount: number
    nextCursor?: string
    previousCursor?: string
    hasMore: boolean
  }
}

export class CursorPagination {
  static readonly DEFAULT_LIMIT = 20
  static readonly MAX_LIMIT = 100

  static parseParams(params: PaginationParams): {
    take: number
    cursor?: { id: number }
    where?: Prisma.PostWhereInput
  } {
    const limit = Math.min(
      Math.max(1, params.limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT
    )

    const result: any = { take: limit + 1 } // Take one extra to check hasMore

    if (params.cursor) {
      result.cursor = { id: parseInt(params.cursor) }
      result.skip = 1 // Skip the cursor item itself
    }

    if (params.maxId) {
      result.where = { id: { lt: parseInt(params.maxId) } }
    }

    if (params.sinceId) {
      result.where = {
        ...result.where,
        id: { gt: parseInt(params.sinceId) }
      }
    }

    return result
  }

  static formatResponse<T extends { id: number }>(
    items: T[],
    limit: number
  ): PaginatedResponse<T> {
    const hasMore = items.length > limit
    const data = hasMore ? items.slice(0, -1) : items

    return {
      data,
      meta: {
        resultCount: data.length,
        nextCursor: hasMore ? data[data.length - 1].id.toString() : undefined,
        previousCursor: data.length > 0 ? data[0].id.toString() : undefined,
        hasMore
      }
    }
  }

  // Optimized query with proper indexes
  static async paginateQuery<T extends { id: number }>(
    model: any,
    params: PaginationParams,
    options: {
      where?: any
      include?: any
      orderBy?: any
    } = {}
  ): Promise<PaginatedResponse<T>> {
    const paginationOptions = this.parseParams(params)
    
    const items = await model.findMany({
      ...paginationOptions,
      where: {
        ...options.where,
        ...paginationOptions.where
      },
      include: options.include,
      orderBy: options.orderBy || { id: 'desc' }
    })

    return this.formatResponse<T>(items, paginationOptions.take - 1)
  }
}

// Infinite scroll helper for frontend
export class InfiniteScrollManager {
  private cache = new Map<string, any[]>()
  private cursors = new Map<string, string>()

  getCached(key: string): any[] {
    return this.cache.get(key) || []
  }

  addPage(key: string, items: any[], cursor?: string) {
    const existing = this.cache.get(key) || []
    this.cache.set(key, [...existing, ...items])
    if (cursor) {
      this.cursors.set(key, cursor)
    }
  }

  getNextCursor(key: string): string | undefined {
    return this.cursors.get(key)
  }

  clear(key: string) {
    this.cache.delete(key)
    this.cursors.delete(key)
  }
}