import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConfig, mockGenerateContent, mockRecordApiCall } = vi.hoisted(() => ({
  mockConfig: {
    GEMINI_API_KEY: '',
  },
  mockGenerateContent: vi.fn(),
  mockRecordApiCall: vi.fn(),
}));

vi.mock('../../config.js', () => ({ config: mockConfig }));
vi.mock('../../lib/api-monitor.js', () => ({ recordApiCall: mockRecordApiCall }));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import { generateEmailContent, generateContent } from '../../lib/gemini-text.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConfig.GEMINI_API_KEY = '';
});

describe('generateEmailContent', () => {
  it('returns mock content when GEMINI_API_KEY is not set', async () => {
    const result = await generateEmailContent('new', 'welcome', '');
    expect(result.subject).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(result.body).toContain('<p>');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('returns mock content for each purpose', async () => {
    const purposes = ['welcome', 'promotion', 'reactivation', 'newsletter'] as const;
    for (const purpose of purposes) {
      const result = await generateEmailContent('all', purpose, '');
      expect(result.subject).toBeTruthy();
      expect(result.body).toBeTruthy();
    }
  });

  it('calls Gemini API when key is configured', async () => {
    mockConfig.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '【件名】\nテスト件名\n\n【本文】\n<p>テスト本文</p>',
      },
    });

    const result = await generateEmailContent('active', 'promotion', 'セール');
    expect(result.subject).toBe('テスト件名');
    expect(result.body).toBe('<p>テスト本文</p>');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'gemini', 'generateEmailContent', 'success', expect.any(Number),
    );
  });

  it('throws and records error when Gemini API fails', async () => {
    mockConfig.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    await expect(generateEmailContent('new', 'welcome', '')).rejects.toThrow('メールの生成に失敗しました');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'gemini', 'generateEmailContent', 'error', expect.any(Number), 'API quota exceeded',
    );
  });

  it('parses response with missing subject', async () => {
    mockConfig.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '本文のみのレスポンス',
      },
    });

    const result = await generateEmailContent('new', 'welcome', '');
    expect(result.subject).toBe('TSUMUGIからのお知らせ');
    expect(result.body).toBe('本文のみのレスポンス');
  });
});

describe('generateContent', () => {
  it('returns mock content when GEMINI_API_KEY is not set', async () => {
    const result = await generateContent('sns_post', 'instagram', 'テスト');
    expect(result).toContain('#TSUMUGI');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('returns mock content for each content type', async () => {
    const types = ['sns_post', 'ad_copy', 'blog_article'] as const;
    for (const type of types) {
      const result = await generateContent(type, 'twitter', 'テスト');
      expect(result).toBeTruthy();
    }
  });

  it('calls Gemini API when key is configured', async () => {
    mockConfig.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '生成されたコンテンツ',
      },
    });

    const result = await generateContent('sns_post', 'twitter', 'テスト投稿');
    expect(result).toBe('生成されたコンテンツ');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'gemini', 'generateContent', 'success', expect.any(Number),
    );
  });

  it('throws and records error when Gemini API fails', async () => {
    mockConfig.GEMINI_API_KEY = 'test-key';
    mockGenerateContent.mockRejectedValue(new Error('rate limit'));

    await expect(generateContent('ad_copy', 'instagram', '')).rejects.toThrow('コンテンツの生成に失敗しました');
    expect(mockRecordApiCall).toHaveBeenCalledWith(
      'gemini', 'generateContent', 'error', expect.any(Number), 'rate limit',
    );
  });
});
