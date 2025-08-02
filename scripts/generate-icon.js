const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Register the Poppins-ExtraBold font
registerFont(path.join(__dirname, '../assets/fonts/Poppins-ExtraBold.ttf'), { 
  family: 'Poppins-ExtraBold',
  weight: 'bold'
});

function createKorusIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#43e97b');
  gradient.addColorStop(1, '#38f9d7');
  
  // Draw rounded rectangle background
  const radius = size * 0.25; // 25% radius matching the welcome page
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw the K letter
  const fontSize = size * 0.833; // Same ratio as welcome page (100/120)
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${fontSize}px Poppins-ExtraBold`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw K with slight vertical adjustment
  ctx.fillText('K', size * 0.5, size * 0.52);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '../assets/images', filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Generated ${filename} (${size}x${size})`);
}

// Check if canvas is installed
try {
  require.resolve('canvas');
  
  // Generate all icon sizes
  createKorusIcon(1024, 'icon.png');
  createKorusIcon(1024, 'adaptive-icon.png');
  createKorusIcon(400, 'splash-icon.png');
  createKorusIcon(48, 'favicon.png');
  
  console.log('\n🎉 All icons generated successfully!');
  console.log('Icons saved to: assets/images/');
  
} catch (e) {
  console.log('Installing required dependencies...');
  const { execSync } = require('child_process');
  console.log('This may take a minute...\n');
  
  try {
    execSync('npm install canvas', { stdio: 'inherit' });
    console.log('\n✅ Dependencies installed! Please run this script again.');
  } catch (installError) {
    console.error('\n❌ Failed to install canvas. Please run: npm install canvas');
    console.error('You may need to install system dependencies first.');
    console.error('On macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg');
  }
}