const fs = require('fs');
const path = require('path');

// Función para crear un ícono SVG
function createIconSVG(size) {
    return `<?xml version="1.0" encoding="UTF-8"?>
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
}

// Función para crear splash screen SVG
function createSplashSVG(width, height) {
    return `<?xml version="1.0" encoding="UTF-8"?>
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
}

// Crear directorios si no existen
const iconSizes = [
    { size: 48, folder: 'mipmap-mdpi' },
    { size: 72, folder: 'mipmap-hdpi' },
    { size: 96, folder: 'mipmap-xhdpi' },
    { size: 144, folder: 'mipmap-xxhdpi' },
    { size: 192, folder: 'mipmap-xxxhdpi' }
];

const splashSizes = [
    { width: 1242, height: 2208, folder: 'drawable-port-xxxhdpi' }
];

console.log('🎨 Generando iconos AKI...');

// Crear iconos
iconSizes.forEach(({ size, folder }) => {
    const dir = path.join(__dirname, 'android/app/src/main/res', folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const svgContent = createIconSVG(size);
    const svgPath = path.join(dir, 'ic_launcher.svg');
    fs.writeFileSync(svgPath, svgContent);
    
    console.log(`✅ Creado ícono ${size}x${size} en ${folder}`);
});

// Crear splash screens
splashSizes.forEach(({ width, height, folder }) => {
    const dir = path.join(__dirname, 'android/app/src/main/res', folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const svgContent = createSplashSVG(width, height);
    const svgPath = path.join(dir, 'splash.svg');
    fs.writeFileSync(svgPath, svgContent);
    
    console.log(`✅ Creado splash ${width}x${height} en ${folder}`);
});

console.log('🎯 Archivos SVG creados. Ahora necesitas convertirlos a PNG usando un convertidor online o herramientas como Inkscape.');
console.log('📱 Una vez convertidos, coloca los archivos PNG en las carpetas correspondientes y ejecuta: npx cap sync android');
