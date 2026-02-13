import { SquareClient, SquareEnvironment } from 'square';

const environment = process.env.SQUARE_ENVIRONMENT === 'production'
  ? SquareEnvironment.Production
  : SquareEnvironment.Sandbox;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SQUARE_ACCESS_TOKEN) {
  throw new Error('SQUARE_ACCESS_TOKEN is required in production');
}

if (isProduction && !process.env.SQUARE_LOCATION_ID) {
  throw new Error('SQUARE_LOCATION_ID is required in production');
}

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment,
});

export const locationId = process.env.SQUARE_LOCATION_ID || '';
