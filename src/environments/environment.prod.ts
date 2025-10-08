export const environment = {
  production: true,
  apiUrl: 'https://conecta-backend-b5yg.onrender.com/', // Backend local (usando 127.0.0.1 en lugar de localhost para evitar problemas de DNS)
  appName: 'Providers',
  version: '1.0.0',
  defaultRadius: 10000, // 10km en metros
  itemsPerPage: 20,
  cacheTimeout: 300000, // 5 minutos
  maxRetries: 3,
  retryDelay: 1000
};