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

    it('caps discount at 90% when discount exceeds subtotal', () => {
      // 5000 capped to floor(1000*0.9)=900, result=1000-900=100
      expect(applyDiscount(1000, 'fixed', 5000)).toBe(100);
    });

    it('caps discount at 90% when discount equals subtotal', () => {
      // 3000 capped to floor(3000*0.9)=2700, result=3000-2700=300
      expect(applyDiscount(3000, 'fixed', 3000)).toBe(300);
    });

    it('does not cap when discount is less than 90% of subtotal', () => {
      expect(applyDiscount(10000, 'fixed', 1000)).toBe(9000);
    });
  });
});
