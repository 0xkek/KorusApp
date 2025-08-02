const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a canvas-based approach for the K logo
async function createKorusIcon() {
  const size = 1024;
  const padding = 224; // For rounded corners effect
  
  // Create SVG content
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with rounded corners -->
      <rect width="${size}" height="${size}" rx="${padding}" fill="#1a1a1a"/>
      
      <!-- Gradient definition -->
      <defs>
        <linearGradient id="korusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#43e97b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#38f9d7;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- K Letter with better proportions -->
      <path d="M 320 256 L 320 768 L 440 768 L 440 540 L 580 768 L 720 768 L 540 512 L 700 256 L 560 256 L 440 440 L 440 256 Z" 
            fill="url(#korusGradient)" 
            stroke="url(#korusGradient)" 
            stroke-width="8"/>
    </svg>
  `;

  const buffer = Buffer.from(svg);
  
  // Generate different sizes
  const sizes = [
    { name: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'splash-icon.png', size: 400 },
    { name: 'favicon.png', size: 48 }
  ];

  for (const { name, size: targetSize } of sizes) {
    await sharp(buffer)
      .resize(targetSize, targetSize)
      .png()
      .toFile(path.join(__dirname, '..', 'assets', 'images', name));
    
    console.log(`✅ Generated ${name} (${targetSize}x${targetSize})`);
  }
}

// Check if sharp is installed
try {
  createKorusIcon().catch(console.error);
} catch (error) {
  console.log('Installing sharp...');
  const { execSync } = require('child_process');
  execSync('npm install sharp', { stdio: 'inherit' });
  createKorusIcon().catch(console.error);
}