import type { Customer } from '../types';

type CustomerSegment = Customer['segment'];

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new: '新規',
  active: 'アクティブ',
  lapsed: '休眠',
};

export const SEGMENT_BADGE_COLORS: Record<CustomerSegment, string> = {
  new: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  lapsed: 'bg-amber-100 text-amber-700',
};

export const SEGMENT_BAR_COLORS: Record<CustomerSegment, string> = {
  new: 'bg-blue-500',
  active: 'bg-green-500',
  lapsed: 'bg-amber-500',
};
