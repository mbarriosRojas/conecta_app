const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Función para crear un ícono PNG usando Sharp
async function createIconPNG(size, outputPath) {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background Circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.45}" fill="url(#primaryGradient)" stroke="white" stroke-width="${size * 0.04}"/>
  
  <!-- AKI Text -->
  <text x="${size/2}" y="${size/2 + size * 0.05}" font-family="Arial, sans-serif" font-size="${size * 0.25}" font-weight="bold" 
        text-anchor="middle" fill="white">AKI</text>
  
  <!-- Decorative Elements -->
  <circle cx="${size * 0.33}" cy="${size * 0.33}" r="${size * 0.03}" fill="url(#accentGradient)" opacity="0.8"/>
  <circle cx="${size * 0.67}" cy="${size * 0.33}" r="${size * 0.03}" fill="url(#accentGradient)" opacity="0.8"/>
  <circle cx="${size * 0.33}" cy="${size * 0.67}" r="${size * 0.03}" fill="url(#accentGradient)" opacity="0.8"/>
  <circle cx="${size * 0.67}" cy="${size * 0.67}" r="${size * 0.03}" fill="url(#accentGradient)" opacity="0.8"/>
  
  <!-- Central Dot -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.015}" fill="white" opacity="0.9"/>
</svg>`;

    try {
        await sharp(Buffer.from(svgContent))
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`✅ Creado ícono ${size}x${size} en ${outputPath}`);
    } catch (error) {
        console.error(`❌ Error creando ícono ${size}x${size}:`, error.message);
    }
}

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
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:0.9" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Decorative Background Elements -->
  <circle cx="${width * 0.15}" cy="${height * 0.18}" r="${width * 0.12}" fill="white" opacity="0.1"/>
  <circle cx="${width * 0.85}" cy="${height * 0.25}" r="${width * 0.15}" fill="white" opacity="0.08"/>
  <circle cx="${width * 0.25}" cy="${height * 0.82}" r="${width * 0.14}" fill="white" opacity="0.06"/>
  <circle cx="${width * 0.75}" cy="${height * 0.75}" r="${width * 0.10}" fill="white" opacity="0.1"/>
  
  <!-- Main Logo Container -->
  <circle cx="${width/2}" cy="${height/2 - height * 0.1}" r="${Math.min(width, height) * 0.125}" fill="url(#logoGradient)" stroke="white" stroke-width="${Math.min(width, height) * 0.006}"/>
  
  <!-- AKI Text -->
  <text x="${width/2}" y="${height/2 - height * 0.05}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.07}" font-weight="bold" 
        text-anchor="middle" fill="url(#bgGradient)">AKI</text>
  
  <!-- Subtitle -->
  <text x="${width/2}" y="${height/2 + height * 0.05}" font-family="Arial, sans-serif" font-size="${width * 0.025}" font-weight="300" 
        text-anchor="middle" fill="white" opacity="0.9">Conecta Personal</text>
  
  <!-- Decorative Elements Around Logo -->
  <circle cx="${width/2 - Math.min(width, height) * 0.075}" cy="${height/2 - height * 0.175}" r="${Math.min(width, height) * 0.008}" fill="white" opacity="0.6"/>
  <circle cx="${width/2 + Math.min(width, height) * 0.075}" cy="${height/2 - height * 0.175}" r="${Math.min(width, height) * 0.008}" fill="white" opacity="0.6"/>
  <circle cx="${width/2 - Math.min(width, height) * 0.075}" cy="${height/2 - height * 0.025}" r="${Math.min(width, height) * 0.008}" fill="white" opacity="0.6"/>
  <circle cx="${width/2 + Math.min(width, height) * 0.075}" cy="${height/2 - height * 0.025}" r="${Math.min(width, height) * 0.008}" fill="white" opacity="0.6"/>
  
  <!-- Central Dot -->
  <circle cx="${width/2}" cy="${height/2 - height * 0.1}" r="${Math.min(width, height) * 0.008}" fill="url(#bgGradient)" opacity="0.8"/>
  
  <!-- Loading Indicator -->
  <circle cx="${width/2}" cy="${height * 0.85}" r="${width * 0.008}" fill="white" opacity="0.7"/>
  <circle cx="${width/2 + width * 0.03}" cy="${height * 0.85}" r="${width * 0.006}" fill="white" opacity="0.5"/>
  <circle cx="${width/2 + width * 0.06}" cy="${height * 0.85}" r="${width * 0.004}" fill="white" opacity="0.3"/>
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
async function generateAllIcons() {
    console.log('🎨 Generando iconos PNG para AKI...');

    // Crear directorios si no existen
    const iconSizes = [
        { size: 48, folder: 'mipmap-mdpi' },
        { size: 72, folder: 'mipmap-hdpi' },
        { size: 96, folder: 'mipmap-xhdpi' },
        { size: 144, folder: 'mipmap-xxhdpi' },
        { size: 192, folder: 'mipmap-xxxhdpi' }
    ];

    // Generar iconos
    for (const { size, folder } of iconSizes) {
        const dir = path.join(__dirname, 'android/app/src/main/res', folder);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const outputPath = path.join(dir, 'ic_launcher.png');
        await createIconPNG(size, outputPath);
    }

    // Generar splash screen
    const splashDir = path.join(__dirname, 'android/app/src/main/res', 'drawable-port-xxxhdpi');
    if (!fs.existsSync(splashDir)) {
        fs.mkdirSync(splashDir, { recursive: true });
    }
    
    const splashPath = path.join(splashDir, 'splash.png');
    await createSplashPNG(1242, 2208, splashPath);

    console.log('🎯 ¡Todos los iconos PNG generados correctamente!');
    console.log('📱 Ahora puedes ejecutar: npx cap sync android && npx cap run android');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generateAllIcons().catch(console.error);
}

module.exports = { generateAllIcons, createIconPNG, createSplashPNG };
