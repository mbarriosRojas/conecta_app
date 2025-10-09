#!/usr/bin/env node

/**
 * Script de prueba para verificar la funcionalidad de paginación
 * Ejecutar con: node test-pagination.js
 */

const https = require('https');
const http = require('http');

// Configuración
const API_BASE_URL = 'http://localhost:8080';
const TEST_COORDS = {
  lat: 8.552585714294404,
  lng: -71.23977354966065
};

// Función para hacer peticiones HTTP
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Error parsing JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Función para probar la paginación
async function testPagination() {
  console.log('🧪 Iniciando pruebas de paginación...\n');
  
  try {
    // Prueba 1: Primera página
    console.log('📄 Probando página 1...');
    const page1Url = `${API_BASE_URL}/api/provider/provider/filters/app?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radius=20000&page=1&limit=3`;
    const page1Response = await makeRequest(page1Url);
    
    console.log(`✅ Página 1: ${page1Response.data.length} proveedores encontrados`);
    console.log(`📊 Paginación: ${JSON.stringify(page1Response.pagination, null, 2)}\n`);
    
    // Prueba 2: Segunda página (si existe)
    if (page1Response.pagination.hasNextPage) {
      console.log('📄 Probando página 2...');
      const page2Url = `${API_BASE_URL}/api/provider/provider/filters/app?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radius=20000&page=2&limit=3`;
      const page2Response = await makeRequest(page2Url);
      
      console.log(`✅ Página 2: ${page2Response.data.length} proveedores encontrados`);
      console.log(`📊 Paginación: ${JSON.stringify(page2Response.pagination, null, 2)}\n`);
    } else {
      console.log('ℹ️  No hay página 2 disponible\n');
    }
    
    // Prueba 3: Búsqueda con paginación
    console.log('🔍 Probando búsqueda con paginación...');
    const searchUrl = `${API_BASE_URL}/api/provider/provider/filters/app?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radius=20000&search=zapa&page=1&limit=2`;
    const searchResponse = await makeRequest(searchUrl);
    
    console.log(`✅ Búsqueda "zapa": ${searchResponse.data.length} proveedores encontrados`);
    console.log(`📊 Paginación: ${JSON.stringify(searchResponse.pagination, null, 2)}\n`);
    
    // Prueba 4: Verificar estructura de respuesta
    console.log('🔍 Verificando estructura de respuesta...');
    const requiredFields = ['status', 'message', 'data', 'pagination'];
    const paginationFields = ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPrevPage'];
    
    const hasAllFields = requiredFields.every(field => searchResponse.hasOwnProperty(field));
    const hasAllPaginationFields = paginationFields.every(field => searchResponse.pagination.hasOwnProperty(field));
    
    if (hasAllFields && hasAllPaginationFields) {
      console.log('✅ Estructura de respuesta correcta');
    } else {
      console.log('❌ Estructura de respuesta incorrecta');
      console.log(`Campos requeridos: ${requiredFields.join(', ')}`);
      console.log(`Campos de paginación: ${paginationFields.join(', ')}`);
    }
    
    console.log('\n🎉 Pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testPagination();
