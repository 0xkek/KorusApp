import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { FlatList, ViewToken } from 'react-native'
import { InfiniteScrollManager } from '../korus-backend/src/utils/pagination'

interface UseOptimizedListOptions<T> {
  fetchFunction: (cursor?: string) => Promise<{ data: T[]; nextCursor?: string }>
  cacheKey: string
  prefetchThreshold?: number
  staleTime?: number
}

// Twitter-style optimized list with virtualization
export function useOptimizedList<T extends { id: string | number }>({
  fetchFunction,
  cacheKey,
  prefetchThreshold = 5,
  staleTime = 5 * 60 * 1000 // 5 minutes like Twitter
}: UseOptimizedListOptions<T>) {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  
  const scrollManager = useRef(new InfiniteScrollManager())
  const lastFetchTime = useRef<number>(0)
  const nextCursor = useRef<string | undefined>()
  const isFetching = useRef(false)
  
  // Viewability config like Twitter
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 250,
    waitForInteraction: true
  }).current

  // Load cached data on mount
  useEffect(() => {
    const cached = scrollManager.current.getCached(cacheKey)
    if (cached.length > 0) {
      setData(cached)
    } else {
      loadInitial()
    }
  }, [])

  const loadInitial = useCallback(async () => {
    if (isFetching.current) return
    
    isFetching.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchFunction()
      
      setData(result.data)
      nextCursor.current = result.nextCursor
      setHasMore(!!result.nextCursor)
      
      scrollManager.current.clear(cacheKey)
      scrollManager.current.addPage(cacheKey, result.data, result.nextCursor)
      
      lastFetchTime.current = Date.now()
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
      isFetching.current = false
    }
  }, [fetchFunction, cacheKey])

  const loadMore = useCallback(async () => {
    if (isFetching.current || !hasMore || !nextCursor.current) return
    
    isFetching.current = true
    
    try {
      const result = await fetchFunction(nextCursor.current)
      
      setData(prev => [...prev, ...result.data])
      nextCursor.current = result.nextCursor
      setHasMore(!!result.nextCursor)
      
      scrollManager.current.addPage(cacheKey, result.data, result.nextCursor)
    } catch (err) {
      setError(err as Error)
    } finally {
      isFetching.current = false
    }
  }, [fetchFunction, hasMore, cacheKey])

  const refresh = useCallback(async () => {
    if (isFetching.current) return
    
    const now = Date.now()
    if (now - lastFetchTime.current < 1000) return // Debounce 1 second
    
    setIsRefreshing(true)
    isFetching.current = true
    
    try {
      const result = await fetchFunction()
      
      setData(result.data)
      nextCursor.current = result.nextCursor
      setHasMore(!!result.nextCursor)
      
      scrollManager.current.clear(cacheKey)
      scrollManager.current.addPage(cacheKey, result.data, result.nextCursor)
      
      lastFetchTime.current = now
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsRefreshing(false)
      isFetching.current = false
    }
  }, [fetchFunction, cacheKey])

  // Prefetch when approaching end
  const onEndReached = useCallback(() => {
    loadMore()
  }, [loadMore])

  // Track viewable items for analytics
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Could send analytics here like Twitter does
      if (viewableItems.length > 0) {
        const visibleIds = viewableItems.map(item => item.item?.id).filter(Boolean)
        // Analytics.trackImpression(visibleIds)
      }
    },
    []
  )

  // Optimized item layout calculation
  const getItemLayout = useCallback(
    (data: T[] | null | undefined, index: number) => ({
      length: 100, // Estimated item height
      offset: 100 * index,
      index
    }),
    []
  )

  // Memoized list props
  const listProps = useMemo(() => ({
    data,
    onEndReached,
    onEndReachedThreshold: prefetchThreshold / 10,
    onRefresh: refresh,
    refreshing: isRefreshing,
    viewabilityConfig,
    onViewableItemsChanged,
    getItemLayout,
    removeClippedSubviews: true, // Performance optimization
    maxToRenderPerBatch: 10, // Like Twitter
    updateCellsBatchingPeriod: 50,
    windowSize: 21, // Default Twitter uses
    initialNumToRender: 10,
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10
    }
  }), [
    data,
    onEndReached,
    refresh,
    isRefreshing,
    onViewableItemsChanged,
    getItemLayout,
    prefetchThreshold
  ])

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    refresh,
    loadMore,
    listProps
  }
}