export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080', // Backend local (usando 127.0.0.1 en lugar de localhost para evitar problemas de DNS)
  appName: 'Providers',
  version: '1.0.0',
  defaultRadius: 20000, // 20km en metros
  itemsPerPage: 20,
  cacheTimeout: 300000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000
};