import {
  isGenerateImageResponse,
  isErrorResponse,
  isArtStyle,
  isStylesResponse,
  isPricingResponse,
  isCreateOrderResponse,
  isProcessPaymentResponse,
  isContactResponse,
  isSupportChatResponse,
  isAuthResponse,
  isForgotPasswordResponse,
  isCurrentUserResponse,
  isCsrfResponse,
  isOrdersResponse,
  isOrderDetailResponse,
  isAddressesResponse,
  isAddressSaveResponse,
  isGalleryResponse,
} from '../../api/index';

describe('isGenerateImageResponse', () => {
  it('returns true for valid response', () => {
    expect(isGenerateImageResponse({
      success: true,
      projectId: 'p1',
      generatedImage: 'img',
      thumbnailImage: 'thumb',
      watermarked: false,
      creditsUsed: 1,
      creditsRemaining: 9,
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isGenerateImageResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isGenerateImageResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isGenerateImageResponse({})).toBe(false);
  });

  it('returns false when projectId is missing', () => {
    expect(isGenerateImageResponse({
      success: true,
      generatedImage: 'img',
      thumbnailImage: 'thumb',
      watermarked: false,
      creditsUsed: 1,
      creditsRemaining: 9,
    })).toBe(false);
  });

  it('returns false when watermarked is wrong type', () => {
    expect(isGenerateImageResponse({
      success: true,
      projectId: 'p1',
      generatedImage: 'img',
      thumbnailImage: 'thumb',
      watermarked: 'no',
      creditsUsed: 1,
      creditsRemaining: 9,
    })).toBe(false);
  });

  it('returns false when success is false', () => {
    expect(isGenerateImageResponse({
      success: false,
      projectId: 'p1',
      generatedImage: 'img',
      thumbnailImage: 'thumb',
      watermarked: false,
      creditsUsed: 1,
      creditsRemaining: 9,
    })).toBe(false);
  });
});

describe('isErrorResponse', () => {
  it('returns true for valid error response', () => {
    expect(isErrorResponse({
      success: false,
      error: { code: 'ERR', message: 'Something went wrong' },
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isErrorResponse({})).toBe(false);
  });

  it('returns false when success is true', () => {
    expect(isErrorResponse({
      success: true,
      error: { code: 'ERR', message: 'msg' },
    })).toBe(false);
  });

  it('returns false when error.message is not a string', () => {
    expect(isErrorResponse({
      success: false,
      error: { code: 'ERR', message: 123 },
    })).toBe(false);
  });

  it('returns false when error is null', () => {
    expect(isErrorResponse({
      success: false,
      error: null,
    })).toBe(false);
  });
});

describe('isArtStyle', () => {
  const validStyle = {
    id: 's1',
    name: 'Renaissance',
    description: 'Classic style',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    colorPalette: ['#fff', '#000'],
    tier: 'free' as const,
  };

  it('returns true for valid art style', () => {
    expect(isArtStyle(validStyle)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isArtStyle(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isArtStyle(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isArtStyle({})).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id, ...rest } = validStyle;
    expect(id).toBe('s1');
    expect(isArtStyle(rest)).toBe(false);
  });

  it('returns false when colorPalette is not an array', () => {
    expect(isArtStyle({ ...validStyle, colorPalette: 'red' })).toBe(false);
  });

  it('returns false when tier is invalid', () => {
    expect(isArtStyle({ ...validStyle, tier: 'premium' })).toBe(false);
  });
});

describe('isStylesResponse', () => {
  const validStyle = {
    id: 's1',
    name: 'Renaissance',
    description: 'Classic',
    thumbnailUrl: 'url',
    colorPalette: ['#fff'],
    tier: 'free',
  };

  it('returns true for valid styles response', () => {
    expect(isStylesResponse({ success: true, styles: [validStyle] })).toBe(true);
  });

  it('returns true for empty styles array', () => {
    expect(isStylesResponse({ success: true, styles: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isStylesResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isStylesResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isStylesResponse({})).toBe(false);
  });

  it('returns false when styles contains invalid items', () => {
    expect(isStylesResponse({ success: true, styles: [{ bad: true }] })).toBe(false);
  });

  it('returns false when styles is not an array', () => {
    expect(isStylesResponse({ success: true, styles: 'not-array' })).toBe(false);
  });
});

describe('isPricingResponse', () => {
  it('returns true for valid pricing response', () => {
    expect(isPricingResponse({ success: true, plans: [], printSizes: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPricingResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPricingResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isPricingResponse({})).toBe(false);
  });

  it('returns false when plans is missing', () => {
    expect(isPricingResponse({ success: true, printSizes: [] })).toBe(false);
  });

  it('returns false when printSizes is not an array', () => {
    expect(isPricingResponse({ success: true, plans: [], printSizes: 'no' })).toBe(false);
  });
});

describe('isCreateOrderResponse', () => {
  it('returns true for valid response', () => {
    expect(isCreateOrderResponse({ success: true, orderId: 'o1', totalAmount: 1000 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isCreateOrderResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCreateOrderResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isCreateOrderResponse({})).toBe(false);
  });

  it('returns false when orderId is missing', () => {
    expect(isCreateOrderResponse({ success: true, totalAmount: 1000 })).toBe(false);
  });

  it('returns false when totalAmount is a string', () => {
    expect(isCreateOrderResponse({ success: true, orderId: 'o1', totalAmount: '1000' })).toBe(false);
  });
});

describe('isProcessPaymentResponse', () => {
  it('returns true for valid response', () => {
    expect(isProcessPaymentResponse({
      success: true,
      paymentId: 'pay1',
      orderId: 'o1',
      status: 'completed',
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isProcessPaymentResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isProcessPaymentResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isProcessPaymentResponse({})).toBe(false);
  });

  it('returns false when paymentId is missing', () => {
    expect(isProcessPaymentResponse({
      success: true,
      orderId: 'o1',
      status: 'completed',
    })).toBe(false);
  });

  it('returns false when status is a number', () => {
    expect(isProcessPaymentResponse({
      success: true,
      paymentId: 'pay1',
      orderId: 'o1',
      status: 200,
    })).toBe(false);
  });
});

describe('isContactResponse', () => {
  it('returns true for valid response', () => {
    expect(isContactResponse({
      success: true,
      inquiryId: 'inq1',
      estimatedReplyBusinessDays: 3,
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isContactResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isContactResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isContactResponse({})).toBe(false);
  });

  it('returns false when inquiryId is missing', () => {
    expect(isContactResponse({ success: true, estimatedReplyBusinessDays: 3 })).toBe(false);
  });

  it('returns false when estimatedReplyBusinessDays is a string', () => {
    expect(isContactResponse({
      success: true,
      inquiryId: 'inq1',
      estimatedReplyBusinessDays: 'three',
    })).toBe(false);
  });
});

describe('isSupportChatResponse', () => {
  it('returns true for valid response', () => {
    expect(isSupportChatResponse({
      success: true,
      reply: 'Hello!',
      suggestedNextActions: ['action1'],
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isSupportChatResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSupportChatResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isSupportChatResponse({})).toBe(false);
  });

  it('returns false when reply is missing', () => {
    expect(isSupportChatResponse({
      success: true,
      suggestedNextActions: [],
    })).toBe(false);
  });

  it('returns false when suggestedNextActions is not an array', () => {
    expect(isSupportChatResponse({
      success: true,
      reply: 'Hello!',
      suggestedNextActions: 'action1',
    })).toBe(false);
  });
});

describe('isAuthResponse', () => {
  const validUser = { id: 'u1', name: 'Test', email: 'test@example.com' };

  it('returns true for valid response', () => {
    expect(isAuthResponse({ success: true, user: validUser })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isAuthResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAuthResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isAuthResponse({})).toBe(false);
  });

  it('returns false when user is missing', () => {
    expect(isAuthResponse({ success: true })).toBe(false);
  });

  it('returns false when user.email is a number', () => {
    expect(isAuthResponse({
      success: true,
      user: { id: 'u1', name: 'Test', email: 123 },
    })).toBe(false);
  });

  it('returns false when user.name is missing', () => {
    expect(isAuthResponse({
      success: true,
      user: { id: 'u1', email: 'test@example.com' },
    })).toBe(false);
  });
});

describe('isForgotPasswordResponse', () => {
  it('returns true for valid response', () => {
    expect(isForgotPasswordResponse({ success: true, message: 'Email sent' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isForgotPasswordResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isForgotPasswordResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isForgotPasswordResponse({})).toBe(false);
  });

  it('returns false when message is a number', () => {
    expect(isForgotPasswordResponse({ success: true, message: 42 })).toBe(false);
  });
});

describe('isCurrentUserResponse', () => {
  const validUser = { id: 'u1', name: 'Test', email: 'test@example.com' };

  it('returns true for valid response', () => {
    expect(isCurrentUserResponse({ success: true, user: validUser })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isCurrentUserResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCurrentUserResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isCurrentUserResponse({})).toBe(false);
  });

  it('returns false when user is missing', () => {
    expect(isCurrentUserResponse({ success: true })).toBe(false);
  });

  it('returns false when user.id is a number', () => {
    expect(isCurrentUserResponse({
      success: true,
      user: { id: 123, name: 'Test', email: 'test@example.com' },
    })).toBe(false);
  });
});

describe('isCsrfResponse', () => {
  it('returns true for valid response', () => {
    expect(isCsrfResponse({ success: true, csrfToken: 'abc123' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isCsrfResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCsrfResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isCsrfResponse({})).toBe(false);
  });

  it('returns false when csrfToken is a number', () => {
    expect(isCsrfResponse({ success: true, csrfToken: 123 })).toBe(false);
  });
});

describe('isOrdersResponse', () => {
  it('returns true for valid response', () => {
    expect(isOrdersResponse({ success: true, orders: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isOrdersResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOrdersResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isOrdersResponse({})).toBe(false);
  });

  it('returns false when orders is not an array', () => {
    expect(isOrdersResponse({ success: true, orders: 'none' })).toBe(false);
  });
});

describe('isOrderDetailResponse', () => {
  it('returns true for valid response', () => {
    expect(isOrderDetailResponse({
      success: true,
      order: { orderId: 'o1', status: 'complete' },
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isOrderDetailResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOrderDetailResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isOrderDetailResponse({})).toBe(false);
  });

  it('returns false when order is null', () => {
    expect(isOrderDetailResponse({ success: true, order: null })).toBe(false);
  });

  it('returns false when order is a string', () => {
    expect(isOrderDetailResponse({ success: true, order: 'not-obj' })).toBe(false);
  });
});

describe('isAddressesResponse', () => {
  it('returns true for valid response', () => {
    expect(isAddressesResponse({ success: true, addresses: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isAddressesResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAddressesResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isAddressesResponse({})).toBe(false);
  });

  it('returns false when addresses is not an array', () => {
    expect(isAddressesResponse({ success: true, addresses: {} })).toBe(false);
  });
});

describe('isAddressSaveResponse', () => {
  it('returns true for valid response', () => {
    expect(isAddressSaveResponse({
      success: true,
      address: { id: 'a1', label: 'Home' },
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isAddressSaveResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAddressSaveResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isAddressSaveResponse({})).toBe(false);
  });

  it('returns false when address is null', () => {
    expect(isAddressSaveResponse({ success: true, address: null })).toBe(false);
  });

  it('returns false when address is a string', () => {
    expect(isAddressSaveResponse({ success: true, address: 'addr' })).toBe(false);
  });
});

describe('isGalleryResponse', () => {
  it('returns true for valid response', () => {
    expect(isGalleryResponse({ success: true, items: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isGalleryResponse(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isGalleryResponse(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isGalleryResponse({})).toBe(false);
  });

  it('returns false when items is not an array', () => {
    expect(isGalleryResponse({ success: true, items: 'none' })).toBe(false);
  });
});
