'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  distance: number;
  color: string;
  duration: number;
  delay: number;
}

type ParticleType = 'like' | 'tip' | 'reply';

const particleConfigs: Record<ParticleType, { emojis: string[]; count: number; colors: string[] }> = {
  like: {
    emojis: ['❤️', '✨', '💖', '💫'],
    count: 8,
    colors: ['#ff6b6b', '#ff8e8e', '#ffa8a8'],
  },
  tip: {
    emojis: ['💰', '⭐', '💎', '✨', '🪙'],
    count: 10,
    colors: ['#43e97b', '#38f9d7', '#FFD700'],
  },
  reply: {
    emojis: ['💬', '✨', '💭', '💫'],
    count: 5,
    colors: ['#43e97b', '#38f9d7', '#ffffff'],
  },
};

export const ParticleSystem = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const createExplosion = (type: ParticleType, x: number, y: number) => {
      const config = particleConfigs[type];
      const newParticles: Particle[] = [];

      for (let i = 0; i < config.count; i++) {
        const angle = (i * (360 / config.count)) + (Math.random() * 30 - 15);
        const distance = 60 + Math.random() * 80;
        const duration = 800 + Math.random() * 400;

        newParticles.push({
          id: `particle_${Date.now()}_${i}`,
          emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
          x,
          y,
          angle,
          distance,
          color: config.colors[Math.floor(Math.random() * config.colors.length)],
          duration,
          delay: i * 30,
        });
      }

      setParticles(newParticles);

      // Clean up particles after animation
      setTimeout(() => {
        setParticles([]);
      }, Math.max(...newParticles.map(p => p.duration + p.delay)) + 100);
    };

    (window as any).createParticleExplosion = createExplosion;

    return () => {
      delete (window as any).createParticleExplosion;
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {particles.map((particle) => {
        const radian = (particle.angle * Math.PI) / 180;
        const endX = Math.cos(radian) * particle.distance;
        const endY = Math.sin(radian) * particle.distance;

        return (
          <div
            key={particle.id}
            className="absolute text-xl font-bold"
            style={{
              left: particle.x,
              top: particle.y,
              color: particle.color,
              animation: `particle-explosion-${particle.id} ${particle.duration}ms ease-out forwards`,
              animationDelay: `${particle.delay}ms`,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
            }}
          >
            {particle.emoji}
            <style jsx>{`
              @keyframes particle-explosion-${particle.id} {
                0% {
                  transform: translate(0, 0) scale(0.3) rotate(0deg);
                  opacity: 1;
                }
                30% {
                  transform: translate(${endX * 0.3}px, ${endY * 0.3}px) scale(1.4) rotate(90deg);
                  opacity: 1;
                }
                100% {
                  transform: translate(${endX}px, ${endY}px) scale(0.1) rotate(180deg);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
};
