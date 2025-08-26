import React, { useState, useEffect, useRef } from 'react'
import {
  Image,
  ImageProps,
  Animated,
  View,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import { BlurView } from 'expo-blur'

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string }
  blurhash?: string
  aspectRatio?: number
  priority?: 'high' | 'low'
  onLoad?: () => void
  onError?: () => void
}

// Twitter-style progressive image loading
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  blurhash,
  aspectRatio = 16 / 9,
  priority = 'low',
  onLoad,
  onError,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Generate optimized URL based on screen size (like Twitter's image proxy)
  const getOptimizedUrl = (url: string): string => {
    // Twitter uses format=jpg&name=small/medium/large
    const width = style?.width || 300
    const quality = priority === 'high' ? 90 : 70
    
    // If using a CDN that supports transforms
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/w_${width},q_${quality},f_auto/`)
    }
    
    return url
  }

  const handleLoad = () => {
    if (!mountedRef.current) return
    
    setLoading(false)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start()
    
    onLoad?.()
  }

  const handleError = () => {
    if (!mountedRef.current) return
    
    setLoading(false)
    setError(true)
    onError?.()
  }

  const imageUrl = getOptimizedUrl(source.uri)

  return (
    <View style={[styles.container, { aspectRatio }, style]}>
      {/* Blurhash placeholder like Twitter */}
      {loading && blurhash && (
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
          <View style={[styles.placeholder, { backgroundColor: '#1a1a1a' }]} />
        </BlurView>
      )}
      
      {/* Loading indicator */}
      {loading && !blurhash && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      
      {/* Main image with fade-in */}
      <Animated.Image
        {...props}
        source={{ 
          uri: imageUrl,
          priority: priority === 'high' ? 'high' : 'normal',
          cache: 'force-cache' // Aggressive caching like Twitter
        }}
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: fadeAnim }
        ]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode="cover"
      />
      
      {/* Error fallback */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  )
}

// Image preloader for critical images
export class ImagePreloader {
  private static cache = new Map<string, boolean>()
  
  static async preload(urls: string[]): Promise<void> {
    const promises = urls.map(url => {
      if (this.cache.has(url)) return Promise.resolve()
      
      return Image.prefetch(url)
        .then(() => {
          this.cache.set(url, true)
        })
        .catch(() => {
          // Silent fail
        })
    })
    
    await Promise.all(promises)
  }
  
  static isPreloaded(url: string): boolean {
    return this.cache.has(url)
  }
  
  static clearCache(): void {
    this.cache.clear()
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a'
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a'
  },
  errorText: {
    color: '#666',
    fontSize: 12
  }
})