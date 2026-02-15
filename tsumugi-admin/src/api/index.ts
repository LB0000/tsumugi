import type { AnalyticsSummary, Content, ContentType, ContentPlatform, Customer, CustomerStats, Campaign, Coupon } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function login(password: string): Promise<string> {
  const data = await apiFetch<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  localStorage.setItem('admin_token', data.token);
  return data.token;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('admin_token');
  }
}

export async function checkAuth(): Promise<boolean> {
  try {
    await apiFetch('/auth/check');
    return true;
  } catch {
    return false;
  }
}

export async function getAnalyticsSummary(startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiFetch<AnalyticsSummary>(`/analytics/summary${qs ? `?${qs}` : ''}`);
}

// Content API
export async function generateContentAI(type: ContentType, platform: ContentPlatform, topic: string): Promise<string> {
  const data = await apiFetch<{ body: string }>('/content/generate', {
    method: 'POST',
    body: JSON.stringify({ type, platform, topic }),
  });
  return data.body;
}

export type EmailSegment = 'new' | 'active' | 'lapsed' | 'all';
export type EmailPurpose = 'welcome' | 'promotion' | 'reactivation' | 'newsletter';

export async function generateEmailAI(
  segment: EmailSegment,
  purpose: EmailPurpose,
  topic?: string,
): Promise<{ subject: string; body: string }> {
  return apiFetch<{ subject: string; body: string }>('/content/generate-email', {
    method: 'POST',
    body: JSON.stringify({ segment, purpose, topic: topic || '' }),
  });
}

export async function getContents(filters?: { status?: string; type?: string; search?: string }): Promise<Content[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiFetch<Content[]>(`/content${qs ? `?${qs}` : ''}`);
}

export async function getContent(id: string): Promise<Content> {
  return apiFetch<Content>(`/content/${id}`);
}

export async function createContent(data: {
  type: string;
  platform?: string;
  title: string;
  body: string;
  aiPrompt?: string;
  tags?: string[];
}): Promise<Content> {
  return apiFetch<Content>('/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateContent(id: string, data: {
  title?: string;
  body?: string;
  platform?: string;
  tags?: string[];
}): Promise<Content> {
  return apiFetch<Content>(`/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteContent(id: string): Promise<void> {
  await apiFetch(`/content/${id}`, { method: 'DELETE' });
}

export async function publishContent(id: string): Promise<Content> {
  return apiFetch<Content>(`/content/${id}/publish`, { method: 'POST' });
}

export async function archiveContent(id: string): Promise<Content> {
  return apiFetch<Content>(`/content/${id}/archive`, { method: 'POST' });
}

// Customer API
export interface CustomersListResult {
  customers: Customer[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}

export async function getCustomers(filters?: {
  segment?: string;
  marketing?: 'subscribed' | 'opted_out' | 'all';
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<CustomersListResult> {
  const params = new URLSearchParams();
  if (filters?.segment) params.set('segment', filters.segment);
  if (filters?.marketing && filters.marketing !== 'all') params.set('marketing', filters.marketing);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  return apiFetch<CustomersListResult>(`/customers${qs ? `?${qs}` : ''}`);
}

export async function setCustomerMarketingOptOut(id: string, optOut: boolean): Promise<Customer> {
  const data = await apiFetch<{ success: boolean; customer: Customer }>(`/customers/${encodeURIComponent(id)}/marketing-opt-out`, {
    method: 'PATCH',
    body: JSON.stringify({ optOut }),
  });
  return data.customer;
}

export async function getCustomerStats(): Promise<CustomerStats> {
  return apiFetch<CustomerStats>('/customers/stats');
}

export async function syncCustomers(): Promise<{ success: boolean; synced: number; created: number; updated: number }> {
  return apiFetch('/customers/sync', { method: 'POST' });
}

// Campaign API
export interface CampaignsListResult {
  campaigns: Campaign[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}

export async function getCampaigns(params?: {
  limit?: number;
  offset?: number;
}): Promise<CampaignsListResult> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiFetch<CampaignsListResult>(`/campaigns${suffix ? `?${suffix}` : ''}`);
}

export async function createCampaign(data: {
  name: string;
  type: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Campaign> {
  return apiFetch<Campaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCampaign(id: string, data: {
  name?: string;
  status?: string;
  description?: string;
}): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiFetch(`/campaigns/${id}`, { method: 'DELETE' });
}

export async function sendCampaignEmail(campaignId: string, data: {
  subject: string;
  htmlBody: string;
  segment?: string;
}): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
  return apiFetch(`/campaigns/${campaignId}/send-email`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Coupon API
export interface CouponsListResult {
  coupons: Coupon[];
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export async function getCoupons(params?: { limit?: number; offset?: number }): Promise<CouponsListResult> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiFetch<CouponsListResult>(`/campaigns/coupons/list${suffix ? `?${suffix}` : ''}`);
}

export async function createCoupon(data: {
  code?: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  campaignId?: string;
  expiresAt?: string;
}): Promise<Coupon> {
  return apiFetch<Coupon>('/campaigns/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleCoupon(id: string, isActive: boolean): Promise<Coupon> {
  return apiFetch<Coupon>(`/campaigns/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ isActive }),
  });
}
