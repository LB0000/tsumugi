import { applyDiscount } from '../../lib/coupon.js';

describe('applyDiscount', () => {
  describe('percentage discount', () => {
    it('applies a 10% discount', () => {
      expect(applyDiscount(10000, 'percentage', 10)).toBe(9000);
    });

    it('applies a 50% discount', () => {
      expect(applyDiscount(10000, 'percentage', 50)).toBe(5000);
    });

    it('clamps 0% to no discount', () => {
      expect(applyDiscount(10000, 'percentage', 0)).toBe(10000);
    });

    it('clamps 100% to full discount', () => {
      expect(applyDiscount(10000, 'percentage', 100)).toBe(0);
    });

    it('clamps negative values to 0%', () => {
      expect(applyDiscount(10000, 'percentage', -20)).toBe(10000);
    });

    it('clamps values above 100 to 100%', () => {
      expect(applyDiscount(10000, 'percentage', 150)).toBe(0);
    });
  });

  describe('fixed discount', () => {
    it('subtracts a fixed amount', () => {
      expect(applyDiscount(10000, 'fixed', 1000)).toBe(9000);
    });

    it('returns 0 when discount exceeds subtotal', () => {
      expect(applyDiscount(1000, 'fixed', 5000)).toBe(0);
    });

    it('returns 0 when discount equals subtotal', () => {
      expect(applyDiscount(3000, 'fixed', 3000)).toBe(0);
    });
  });
});
