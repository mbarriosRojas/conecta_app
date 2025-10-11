const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Función para crear splash screen PNG
async function createSplashPNG(width, height, outputPath) {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Main Logo Container -->
  <circle cx="${width/2}" cy="${height/2 - height * 0.1}" r="${Math.min(width, height) * 0.125}" fill="rgba(255, 255, 255, 0.95)" stroke="white" stroke-width="${Math.min(width, height) * 0.006}"/>
  
  <!-- AKI Text -->
  <text x="${width/2}" y="${height/2 - height * 0.05}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.07}" font-weight="bold" 
        text-anchor="middle" fill="url(#bgGradient)">AKI</text>
  
  <!-- Subtitle -->
  <text x="${width/2}" y="${height/2 + height * 0.05}" font-family="Arial, sans-serif" font-size="${width * 0.025}" font-weight="300" 
        text-anchor="middle" fill="white" opacity="0.9">Conecta Personal</text>
</svg>`;

    try {
        await sharp(Buffer.from(svgContent))
            .resize(width, height)
            .png()
            .toFile(outputPath);
        console.log(`✅ Creado splash ${width}x${height} en ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error creando splash ${width}x${height}:`, error.message);
    }
}

// Función principal
async function updateAllSplashScreens() {
    console.log('🎨 Actualizando todos los splash screens para AKI...');

    const splashConfigs = [
        // Portrait
        { width: 720, height: 1280, folder: 'drawable-port-hdpi' },
        { width: 480, height: 800, folder: 'drawable-port-mdpi' },
        { width: 960, height: 1600, folder: 'drawable-port-xhdpi' },
        { width: 1440, height: 2400, folder: 'drawable-port-xxhdpi' },
        { width: 1242, height: 2208, folder: 'drawable-port-xxxhdpi' },
        // Landscape
        { width: 1280, height: 720, folder: 'drawable-land-hdpi' },
        { width: 800, height: 480, folder: 'drawable-land-mdpi' },
        { width: 1600, height: 960, folder: 'drawable-land-xhdpi' },
        { width: 2400, height: 1440, folder: 'drawable-land-xxhdpi' },
        { width: 2208, height: 1242, folder: 'drawable-land-xxxhdpi' }
    ];

    for (const { width, height, folder } of splashConfigs) {
        const dir = path.join(__dirname, 'android/app/src/main/res', folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const outputPath = path.join(dir, 'splash.png');
        await createSplashPNG(width, height, outputPath);
    }

    console.log('🎯 ¡Todos los splash screens actualizados para AKI!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    updateAllSplashScreens().catch(console.error);
}

module.exports = { updateAllSplashScreens, createSplashPNG };
