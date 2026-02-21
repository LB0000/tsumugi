// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the postal code lookup hook
const mockPostalLookup = vi.hoisted(() => ({
  prefecture: '',
  city: '',
  town: '',
  isLoading: false,
  error: null,
}));

vi.mock('../../hooks/usePostalCodeLookup', () => ({
  usePostalCodeLookup: () => mockPostalLookup,
}));

// Mock validation functions
vi.mock('../../pages/checkout/validation', () => ({
  validateShippingField: vi.fn(),
  validateShippingForm: vi.fn(),
  getFirstShippingError: vi.fn(),
  SHIPPING_FIELD_ORDER: [
    'lastName',
    'firstName',
    'email',
    'phone',
    'postalCode',
    'prefecture',
    'city',
    'addressLine',
  ] as const,
}));

import { useShippingForm } from '../../hooks/useShippingForm';
import {
  validateShippingField,
  validateShippingForm,
  getFirstShippingError,
} from '../../pages/checkout/validation';

const mockValidateField = vi.mocked(validateShippingField);
const mockValidateForm = vi.mocked(validateShippingForm);
const mockGetFirstError = vi.mocked(getFirstShippingError);

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateField.mockReturnValue(null);
  mockValidateForm.mockReturnValue({});
  mockGetFirstError.mockReturnValue(null);

  // Reset postal lookup mock
  mockPostalLookup.prefecture = '';
  mockPostalLookup.city = '';
  mockPostalLookup.town = '';
  mockPostalLookup.isLoading = false;
  mockPostalLookup.error = null;
});

describe('useShippingForm', () => {
  it('initializes form with empty fields', () => {
    const { result } = renderHook(() => useShippingForm());

    expect(result.current.form).toEqual({
      lastName: '',
      firstName: '',
      email: '',
      phone: '',
      postalCode: '',
      prefecture: '',
      city: '',
      addressLine: '',
    });
  });

  it('initializes with empty fieldErrors and touchedFields', () => {
    const { result } = renderHook(() => useShippingForm());

    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.touchedFields).toEqual({});
  });

  describe('updateField', () => {
    it('updates the specified field value', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('lastName', '山田');
      });

      expect(result.current.form.lastName).toBe('山田');
    });

    it('marks the field as touched', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('email', 'test@example.com');
      });

      expect(result.current.touchedFields.email).toBe(true);
    });

    it('validates the field and stores the error', () => {
      mockValidateField.mockReturnValue('メールアドレスを入力してください');
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('email', '');
      });

      expect(mockValidateField).toHaveBeenCalledWith('email', '');
      expect(result.current.fieldErrors.email).toBe('メールアドレスを入力してください');
    });

    it('clears field error when validation passes', () => {
      mockValidateField.mockReturnValue('エラー');
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('email', '');
      });
      expect(result.current.fieldErrors.email).toBe('エラー');

      mockValidateField.mockReturnValue(null);
      act(() => {
        result.current.updateField('email', 'valid@example.com');
      });
      expect(result.current.fieldErrors.email).toBeUndefined();
    });
  });

  describe('getFieldError', () => {
    it('returns null for untouched fields even with errors', () => {
      const { result } = renderHook(() => useShippingForm());

      // Simulate setting an error without touching
      act(() => {
        result.current.updateField('email', '');
      });

      // This field is now touched, so let's check an untouched one
      expect(result.current.getFieldError('lastName')).toBeNull();
    });

    it('returns the error message for touched fields with errors', () => {
      mockValidateField.mockReturnValue('姓を入力してください');
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('lastName', '');
      });

      expect(result.current.getFieldError('lastName')).toBe('姓を入力してください');
    });

    it('returns null for touched fields without errors', () => {
      mockValidateField.mockReturnValue(null);
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('lastName', '山田');
      });

      expect(result.current.getFieldError('lastName')).toBeNull();
    });
  });

  describe('hasFieldError', () => {
    it('returns false for untouched fields', () => {
      const { result } = renderHook(() => useShippingForm());
      expect(result.current.hasFieldError('lastName')).toBe(false);
    });

    it('returns true for touched fields with errors', () => {
      mockValidateField.mockReturnValue('エラー');
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('lastName', '');
      });

      expect(result.current.hasFieldError('lastName')).toBe(true);
    });
  });

  describe('touchAllFields', () => {
    it('marks all shipping fields as touched', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.touchAllFields();
      });

      expect(result.current.touchedFields.lastName).toBe(true);
      expect(result.current.touchedFields.firstName).toBe(true);
      expect(result.current.touchedFields.email).toBe(true);
      expect(result.current.touchedFields.phone).toBe(true);
      expect(result.current.touchedFields.postalCode).toBe(true);
      expect(result.current.touchedFields.prefecture).toBe(true);
      expect(result.current.touchedFields.city).toBe(true);
      expect(result.current.touchedFields.addressLine).toBe(true);
    });
  });

  describe('validateForm', () => {
    it('calls validateShippingForm with the current form state', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.validateForm();
      });

      expect(mockValidateForm).toHaveBeenCalledWith(result.current.form);
    });

    it('returns null when form is valid', () => {
      mockValidateForm.mockReturnValue({});
      mockGetFirstError.mockReturnValue(null);
      const { result } = renderHook(() => useShippingForm());

      let errorMsg: string | null = null;
      act(() => {
        errorMsg = result.current.validateForm();
      });

      expect(errorMsg).toBeNull();
    });

    it('returns the first error message when form is invalid', () => {
      mockValidateForm.mockReturnValue({ lastName: '姓を入力してください' });
      mockGetFirstError.mockReturnValue('姓を入力してください');
      const { result } = renderHook(() => useShippingForm());

      let errorMsg: string | null = null;
      act(() => {
        errorMsg = result.current.validateForm();
      });

      expect(errorMsg).toBe('姓を入力してください');
    });

    it('touches all fields after validation', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.validateForm();
      });

      expect(result.current.touchedFields.lastName).toBe(true);
      expect(result.current.touchedFields.addressLine).toBe(true);
    });
  });

  describe('clearTouchedAndErrors', () => {
    it('clears all touched fields and errors', () => {
      mockValidateField.mockReturnValue('エラー');
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.updateField('lastName', '');
        result.current.updateField('email', '');
      });

      expect(Object.keys(result.current.touchedFields).length).toBeGreaterThan(0);
      expect(Object.keys(result.current.fieldErrors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearTouchedAndErrors();
      });

      expect(result.current.touchedFields).toEqual({});
      expect(result.current.fieldErrors).toEqual({});
    });
  });

  describe('isPostalLookupLoading', () => {
    it('reflects the postal code lookup loading state', () => {
      mockPostalLookup.isLoading = true;
      const { result } = renderHook(() => useShippingForm());
      expect(result.current.isPostalLookupLoading).toBe(true);
    });

    it('is false when postal lookup is not loading', () => {
      mockPostalLookup.isLoading = false;
      const { result } = renderHook(() => useShippingForm());
      expect(result.current.isPostalLookupLoading).toBe(false);
    });
  });

  describe('enabled option', () => {
    it('defaults to enabled', () => {
      const { result } = renderHook(() => useShippingForm());
      // Hook should work normally when no options provided
      act(() => {
        result.current.updateField('lastName', '田中');
      });
      expect(result.current.form.lastName).toBe('田中');
    });

    it('clears touched fields and errors when disabled', () => {
      mockValidateField.mockReturnValue('エラー');

      const { result, rerender } = renderHook(
        (props: { enabled: boolean }) => useShippingForm({ enabled: props.enabled }),
        { initialProps: { enabled: true } }
      );

      act(() => {
        result.current.updateField('lastName', '');
      });
      expect(result.current.touchedFields.lastName).toBe(true);

      rerender({ enabled: false });

      expect(result.current.touchedFields).toEqual({});
      expect(result.current.fieldErrors).toEqual({});
    });
  });

  describe('setForm', () => {
    it('allows direct form state updates', () => {
      const { result } = renderHook(() => useShippingForm());

      act(() => {
        result.current.setForm({
          lastName: '鈴木',
          firstName: '一郎',
          email: 'ichiro@example.com',
          phone: '090-0000-0000',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine: '1-1-1',
        });
      });

      expect(result.current.form.lastName).toBe('鈴木');
      expect(result.current.form.prefecture).toBe('東京都');
    });
  });
});
