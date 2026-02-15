import { useAppStore } from '../../stores/appStore';
import type { CartItem, AuthUser } from '../../types';

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    cartItems: [],
    authUser: null,
    uploadState: {
      status: 'idle',
      progress: 0,
      previewUrl: null,
      errorMessage: null,
    },
    generatedImage: null,
    currentStep: 'upload',
  });
});

const makeCartItem = (overrides?: Partial<Omit<CartItem, 'id'>>): Omit<CartItem, 'id'> => ({
  productId: 'prod-1',
  name: 'Portrait',
  artStyleId: 'style-1',
  artStyleName: 'Renaissance',
  imageUrl: 'https://example.com/img.png',
  quantity: 1,
  price: 3000,
  ...overrides,
});

describe('addToCart', () => {
  it('adds a new item to the cart', () => {
    useAppStore.getState().addToCart(makeCartItem());
    const { cartItems } = useAppStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('prod-1');
    expect(cartItems[0].id).toBeDefined();
  });

  it('increments quantity for same product+style+imageUrl', () => {
    const item = makeCartItem({ quantity: 2 });
    useAppStore.getState().addToCart(item);
    useAppStore.getState().addToCart(makeCartItem({ quantity: 3 }));
    const { cartItems } = useAppStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(5);
  });

  it('adds separate items for different productId', () => {
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    expect(useAppStore.getState().cartItems).toHaveLength(2);
  });

  it('adds separate items for different imageUrl', () => {
    useAppStore.getState().addToCart(makeCartItem({ imageUrl: 'img1.png' }));
    useAppStore.getState().addToCart(makeCartItem({ imageUrl: 'img2.png' }));
    expect(useAppStore.getState().cartItems).toHaveLength(2);
  });
});

describe('removeFromCart', () => {
  it('removes the item with the specified id', () => {
    useAppStore.getState().addToCart(makeCartItem());
    const { cartItems } = useAppStore.getState();
    const itemId = cartItems[0].id;

    useAppStore.getState().removeFromCart(itemId);
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });

  it('does not affect other items', () => {
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    const firstId = useAppStore.getState().cartItems[0].id;

    useAppStore.getState().removeFromCart(firstId);
    const { cartItems } = useAppStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe('prod-2');
  });
});

describe('updateCartItemQuantity', () => {
  it('updates the quantity of the specified item', () => {
    useAppStore.getState().addToCart(makeCartItem({ quantity: 1 }));
    const itemId = useAppStore.getState().cartItems[0].id;

    useAppStore.getState().updateCartItemQuantity(itemId, 5);
    expect(useAppStore.getState().cartItems[0].quantity).toBe(5);
  });

  it('removes item when quantity is set to 0', () => {
    useAppStore.getState().addToCart(makeCartItem());
    const itemId = useAppStore.getState().cartItems[0].id;

    useAppStore.getState().updateCartItemQuantity(itemId, 0);
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });

  it('removes item when quantity is negative', () => {
    useAppStore.getState().addToCart(makeCartItem());
    const itemId = useAppStore.getState().cartItems[0].id;

    useAppStore.getState().updateCartItemQuantity(itemId, -1);
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });
});

describe('clearCart', () => {
  it('empties the cart', () => {
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-1' }));
    useAppStore.getState().addToCart(makeCartItem({ productId: 'prod-2' }));
    expect(useAppStore.getState().cartItems).toHaveLength(2);

    useAppStore.getState().clearCart();
    expect(useAppStore.getState().cartItems).toHaveLength(0);
  });
});

describe('setAuthSession / clearAuthSession', () => {
  const mockUser: AuthUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    authProvider: 'email',
    emailVerified: true,
  };

  it('sets the auth user', () => {
    useAppStore.getState().setAuthSession(mockUser);
    expect(useAppStore.getState().authUser).toEqual(mockUser);
  });

  it('clears the auth user', () => {
    useAppStore.getState().setAuthSession(mockUser);
    useAppStore.getState().clearAuthSession();
    expect(useAppStore.getState().authUser).toBeNull();
  });
});

describe('resetUpload', () => {
  it('resets upload state, generatedImage, and currentStep', () => {
    useAppStore.setState({
      uploadState: {
        status: 'complete',
        progress: 100,
        previewUrl: 'preview.png',
        errorMessage: null,
      },
      generatedImage: 'generated.png',
      currentStep: 'download',
    });

    useAppStore.getState().resetUpload();

    const state = useAppStore.getState();
    expect(state.uploadState).toEqual({
      status: 'idle',
      progress: 0,
      previewUrl: null,
      errorMessage: null,
    });
    expect(state.generatedImage).toBeNull();
    expect(state.currentStep).toBe('upload');
  });
});
