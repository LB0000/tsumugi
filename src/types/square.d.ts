interface SquarePayments {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>;
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenResult>;
  destroy: () => Promise<void>;
}

interface SquareTokenResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{ message: string }>;
}

interface SquareSDK {
  payments: (appId: string, locationId: string) => Promise<SquarePayments>;
}

interface Window {
  Square?: SquareSDK;
}
