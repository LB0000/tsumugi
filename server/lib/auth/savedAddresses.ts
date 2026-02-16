import type { SavedAddress } from '../auth.js';

interface UserWithAddresses {
  savedAddresses?: SavedAddress[];
  updatedAt: string;
}

const MAX_SAVED_ADDRESSES = 3;

function notInitialized(): never {
  throw new Error('Address manager not initialized. Call initAddressManager() first.');
}

/** Dependency injection: auth.ts provides the user lookup, ID creation, and persist function */
let getUserById: (id: string) => UserWithAddresses | undefined = notInitialized as never;
let createId: (prefix: string) => string = notInitialized as never;
let persistAuthState: () => void = notInitialized;

export function initAddressManager(deps: {
  getUserById: (id: string) => UserWithAddresses | undefined;
  createId: (prefix: string) => string;
  persistAuthState: () => void;
}): void {
  getUserById = deps.getUserById;
  createId = deps.createId;
  persistAuthState = deps.persistAuthState;
}

export function getSavedAddresses(userId: string): SavedAddress[] {
  const user = getUserById(userId);
  return user?.savedAddresses ?? [];
}

export function addSavedAddress(userId: string, address: Omit<SavedAddress, 'id' | 'createdAt'>): SavedAddress {
  const user = getUserById(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  if (!user.savedAddresses) user.savedAddresses = [];

  if (user.savedAddresses.length >= MAX_SAVED_ADDRESSES) {
    throw new Error('MAX_ADDRESSES_REACHED');
  }

  // If this is set as default, unset others (immutable update)
  if (address.isDefault) {
    user.savedAddresses = user.savedAddresses.map(addr =>
      addr.isDefault ? { ...addr, isDefault: false } : addr
    );
  }

  const saved: SavedAddress = {
    ...address,
    id: createId('addr'),
    createdAt: new Date().toISOString(),
  };

  user.savedAddresses.push(saved);
  user.updatedAt = new Date().toISOString();
  persistAuthState();
  return saved;
}

export function deleteSavedAddress(userId: string, addressId: string): boolean {
  const user = getUserById(userId);
  if (!user || !user.savedAddresses) return false;

  const idx = user.savedAddresses.findIndex((a) => a.id === addressId);
  if (idx === -1) return false;

  user.savedAddresses.splice(idx, 1);
  user.updatedAt = new Date().toISOString();
  persistAuthState();
  return true;
}
