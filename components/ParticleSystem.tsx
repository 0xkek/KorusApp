import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Particle, ParticleType, createParticleExplosion, triggerHapticPattern } from '../utils/particleAnimations';

interface ParticleSystemProps {
  children: React.ReactNode;
}

interface ActiveParticle extends Particle {
  animatedX: Animated.Value;
  animatedY: Animated.Value;
  animatedScale: Animated.Value;
  animatedOpacity: Animated.Value;
  animatedRotation: Animated.Value;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ children }) => {
  const [particles, setParticles] = useState<ActiveParticle[]>([]);

  const createExplosion = (
    type: ParticleType,
    x: number,
    y: number
  ) => {
    // Clear existing particles to prevent performance issues
    setParticles([]);
    
    // Enhanced haptic pattern
    triggerHapticPattern(type);

    const newParticles: ActiveParticle[] = [];

    createParticleExplosion(type, x, y, (particle) => {
      const activeParticle: ActiveParticle = {
        ...particle,
        animatedX: new Animated.Value(particle.x),
        animatedY: new Animated.Value(particle.y),
        animatedScale: new Animated.Value(0.3),
        animatedOpacity: new Animated.Value(1),
        animatedRotation: new Animated.Value(0),
      };

      newParticles.push(activeParticle);
    });

    setParticles(newParticles);

    // Animate particles
    newParticles.forEach((particle, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.animatedX, {
            toValue: particle.endX,
            duration: particle.duration,
            useNativeDriver: false,
          }),
          Animated.timing(particle.animatedY, {
            toValue: particle.endY,
            duration: particle.duration,
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(particle.animatedScale, {
              toValue: 1.4,
              duration: particle.duration * 0.3,
              useNativeDriver: false,
            }),
            Animated.timing(particle.animatedScale, {
              toValue: 0.1,
              duration: particle.duration * 0.7,
              useNativeDriver: false,
            }),
          ]),
          Animated.timing(particle.animatedOpacity, {
            toValue: 0,
            duration: particle.duration,
            useNativeDriver: false,
          }),
          Animated.timing(particle.animatedRotation, {
            toValue: particle.rotation + 180,
            duration: particle.duration,
            useNativeDriver: false,
          }),
        ]).start();
      }, particle.delay);
    });

    // Clean up particles after animation
    setTimeout(() => {
      setParticles([]);
    }, Math.max(...newParticles.map(p => p.duration + p.delay)) + 100);
  };

  // Attach explosion function to global scope for easy access
  useEffect(() => {
    (global as any).createParticleExplosion = createExplosion;
    return () => {
      delete (global as any).createParticleExplosion;
    };
  }, []);

  return (
    <View style={styles.container}>
      {children}
      
      {/* Particle Layer */}
      <View style={styles.particleLayer} pointerEvents="none">
        {particles.map((particle) => (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.animatedX,
                top: particle.animatedY,
                transform: [
                  { scale: particle.animatedScale },
                  {
                    rotate: particle.animatedRotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
                opacity: particle.animatedOpacity,
              },
            ]}
          >
            <Text style={[styles.particleEmoji, { color: particle.color }]}>
              {particle.emoji}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    zIndex: 10000,
  },
  particleEmoji: {
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default ParticleSystem;

// Global type declaration
declare global {
  var createParticleExplosion: ((type: ParticleType, x: number, y: number) => void) | undefined;
}