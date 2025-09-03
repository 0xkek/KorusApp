declare global {
  var createParticleExplosion: (type: 'like' | 'tip' | 'bump', x: number, y: number) => void;
}

export {};