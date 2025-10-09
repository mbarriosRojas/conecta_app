export const environment = {
  production: false,
  //apiUrl: 'https://conecta-backend-b5yg.onrender.com', // Backend en Render
  apiUrl: 'http://localhost:8080', // Backend en Render
  appName: 'Providers',
  version: '1.0.0',
  defaultRadius: 20000, // 20km en metros
  itemsPerPage: 20,
  cacheTimeout: 300000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000
};