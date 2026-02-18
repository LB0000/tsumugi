import type { GenerateImageResponse, ArtStyle, PricingPlan, PrintSize } from '../types';
import { API_BASE, getFreshCsrfToken, fetchWithTimeout } from './common';
import { isErrorResponse, isGenerateImageResponse, isStylesResponse, isPricingResponse } from './typeGuards';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export interface StylesResponse {
  success: true;
  styles: ArtStyle[];
}

export interface PricingResponse {
  success: true;
  plans: PricingPlan[];
  printSizes: PrintSize[];
}

export interface GenerateImageParams {
  file: File;
  styleId: string;
  category: 'pets' | 'family' | 'kids';
  options?: {
    gender?: 'masculine' | 'feminine' | 'neutral';
    customPrompt?: string;
  };
}

export async function generateImage(
  params: GenerateImageParams,
  signal?: AbortSignal,
): Promise<GenerateImageResponse> {
  const csrfToken = await getFreshCsrfToken();

  const formData = new FormData();
  formData.append('image', params.file);
  formData.append('styleId', params.styleId);
  formData.append('category', params.category);
  if (params.options) {
    formData.append('options', JSON.stringify(params.options));
  }

  const response = await fetchWithTimeout(`${API_BASE}/generate-image`, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'include',
    body: formData,
    signal,
  }, 60000);

  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorCode = isErrorResponse(data) ? data.error.code : 'UNKNOWN_ERROR';
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : '画像の生成に失敗しました。しばらくしてから再度お試しください。';
    throw new ApiError(errorCode, errorMessage);
  }

  if (!isGenerateImageResponse(data)) {
    throw new Error('サーバーからの応答が正しくありません。しばらくしてから再度お試しください。');
  }

  return data;
}

export async function getStyles(): Promise<ArtStyle[]> {
  const response = await fetchWithTimeout(`${API_BASE}/styles`);
  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : 'スタイル一覧の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isStylesResponse(data)) {
    throw new Error('サーバーからの応答が正しくありません');
  }

  return data.styles;
}

export async function getPricing(): Promise<PricingResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/pricing`);
  const data: unknown = await response.json();

  if (!response.ok || isErrorResponse(data)) {
    const errorMessage = isErrorResponse(data)
      ? data.error.message
      : '価格情報の取得に失敗しました';
    throw new Error(errorMessage);
  }

  if (!isPricingResponse(data)) {
    throw new Error('サーバーからの応答が正しくありません');
  }

  return data;
}
