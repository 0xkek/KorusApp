import * as Haptics from 'expo-haptics';
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type ParticleType = 'like' | 'tip' | 'bump' | 'reply';

interface ParticleConfig {
  emojis: string[];
  count: number;
  colors: string[];
  hapticType: any;
}

const particleConfigs: Record<ParticleType, ParticleConfig> = {
  like: {
    emojis: ['❤️', '✨', '💖', '💫'],
    count: 8,
    colors: ['#ff6b6b', '#ff8e8e', '#ffa8a8'],
    hapticType: 'Medium',
  },
  tip: {
    emojis: ['💰', '⭐', '💎', '✨', '🪙'],
    count: 10,
    colors: ['#43e97b', '#38f9d7', '#FFD700'],
    hapticType: 'Heavy',
  },
  bump: {
    emojis: ['⬆️', '✨', '🚀', '💫'],
    count: 6,
    colors: ['#43e97b', '#38f9d7', '#00ff88'],
    hapticType: 'Heavy',
  },
  reply: {
    emojis: ['💬', '✨', '💭', '💫'],
    count: 5,
    colors: ['#43e97b', '#38f9d7', '#ffffff'],
    hapticType: 'Light',
  },
};

export interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  endX: number;
  endY: number;
  rotation: number;
  scale: number;
  opacity: number;
  color: string;
  duration: number;
  delay: number;
}

export const createParticleExplosion = (
  type: ParticleType,
  centerX: number,
  centerY: number,
  onParticleCreate: (particle: Particle) => void
): void => {
  const config = particleConfigs[type];
  
  // Trigger haptic feedback
  const hapticStyle = Haptics.ImpactFeedbackStyle[config.hapticType as keyof typeof Haptics.ImpactFeedbackStyle];
  Haptics.impactAsync(hapticStyle);

  // Create particles
  for (let i = 0; i < config.count; i++) {
    const particle = createParticle(config, centerX, centerY, i);
    onParticleCreate(particle);
  }
};

const createParticle = (
  config: ParticleConfig,
  centerX: number,
  centerY: number,
  index: number
): Particle => {
  // Dynamic explosion pattern
  const angle = (index * (360 / config.count)) + (Math.random() * 30 - 15);
  const distance = 60 + Math.random() * 80; // Increased distance for mobile
  const duration = 800 + Math.random() * 400; // Variable duration
  
  // Calculate end position
  const radian = (angle * Math.PI) / 180;
  const endX = centerX + Math.cos(radian) * distance;
  const endY = centerY + Math.sin(radian) * distance;
  
  // Keep particles within screen bounds
  const boundedEndX = Math.max(20, Math.min(screenWidth - 20, endX));
  const boundedEndY = Math.max(100, Math.min(screenHeight - 100, endY));
  
  return {
    id: `particle_${Date.now()}_${index}`,
    emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
    x: centerX,
    y: centerY,
    endX: boundedEndX,
    endY: boundedEndY,
    rotation: Math.random() * 360,
    scale: 0.3 + Math.random() * 0.7, // Random scale
    opacity: 1,
    color: config.colors[Math.floor(Math.random() * config.colors.length)],
    duration,
    delay: index * 30, // Stagger the particles
  };
};

// Enhanced haptic patterns for different actions
export const triggerHapticPattern = (type: ParticleType): void => {
  switch (type) {
    case 'like':
      // Heart beat pattern
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100);
      break;
      
    case 'tip':
      // Money drop pattern
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 80);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 160);
      break;
      
    case 'bump':
      // Bump up pattern
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 150);
      break;
      
    case 'reply':
      // Simple feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
  }
};