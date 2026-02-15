export const config = {
  apiBase: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  squareAppId: import.meta.env.VITE_SQUARE_APPLICATION_ID || '',
  squareLocationId: import.meta.env.VITE_SQUARE_LOCATION_ID || '',
  squareEnvironment: (import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox') as 'production' | 'sandbox',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
} as const;
