import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: 'video' | 'article' | 'website';
}

interface LinkPreviewProps {
  url: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const { colors, gradients } = useTheme();
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPreviewData();
  }, [url]);

  const fetchPreviewData = async () => {
    try {
      // For demo purposes, we'll create mock data based on URL patterns
      // In production, you'd use a service like:
      // - Open Graph API
      // - Link preview services (linkpreview.net, etc.)
      // - Your own backend endpoint that fetches meta tags
      
      let mockData: LinkPreviewData = {
        url: url,
        type: 'website'
      };

      // YouTube detection
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        const videoId = extractYouTubeId(url);
        mockData = {
          url: url,
          title: 'YouTube Video',
          description: 'Watch this video on YouTube',
          image: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined,
          siteName: 'YouTube',
          type: 'video'
        };
      }
      // GitHub detection
      else if (url.includes('github.com')) {
        mockData = {
          url: url,
          title: 'GitHub Repository',
          description: 'View this repository on GitHub',
          image: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
          siteName: 'GitHub',
          type: 'article'
        };
      }
      // Twitter/X detection
      else if (url.includes('twitter.com') || url.includes('x.com')) {
        mockData = {
          url: url,
          title: 'Post on X',
          description: 'View this post on X (formerly Twitter)',
          siteName: 'X',
          type: 'article'
        };
      }
      // Solana detection
      else if (url.includes('solana.com')) {
        mockData = {
          url: url,
          title: 'Solana Documentation',
          description: 'Build on the fastest blockchain',
          image: 'https://solana.com/src/img/branding/solanaLogoMark.png',
          siteName: 'Solana',
          type: 'article'
        };
      }

      setPreviewData(mockData);
      setLoading(false);
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface + '50', borderColor: colors.borderLight }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error || !previewData) {
    // Fallback to simple link
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Text style={[styles.fallbackLink, { color: colors.primary }]}>
          {url}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface + '20', borderColor: colors.borderLight }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.surface + '40', colors.surface + '20']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {previewData.image && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: previewData.image }} 
              style={styles.image}
              resizeMode="cover"
            />
            {previewData.type === 'video' && (
              <View style={styles.playButton}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
                  style={styles.playButtonGradient}
                >
                  <Ionicons name="play" size={24} color="#fff" />
                </LinearGradient>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.content}>
          {previewData.siteName && (
            <View style={styles.siteNameContainer}>
              <Ionicons 
                name={previewData.type === 'video' ? 'videocam-outline' : 'link-outline'} 
                size={12} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.siteName, { color: colors.textTertiary }]}>
                {previewData.siteName}
              </Text>
            </View>
          )}
          
          {previewData.title && (
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {previewData.title}
            </Text>
          )}
          
          {previewData.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {previewData.description}
            </Text>
          )}
          
          <View style={styles.urlContainer}>
            <Text style={[styles.url, { color: colors.primary }]} numberOfLines={1}>
              {url}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradient: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  playButtonGradient: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  siteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  siteName: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.semiBold,
    marginBottom: 6,
    lineHeight: 20,
  },
  description: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 10,
    lineHeight: 18,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  url: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  fallbackLink: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    textDecorationLine: 'underline',
  },
});