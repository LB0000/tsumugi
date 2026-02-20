import { useEffect } from 'react';
import { updateMetaTags } from '../lib/seo';

export interface UseResultMetaTagsOptions {
  /** 生成された画像URL */
  generatedImage: string | null;
  /** 選択されたスタイル名 */
  styleName: string;
}

/**
 * ResultPage の OGP meta tags を自動更新するフック
 *
 * 機能:
 * - 生成画像を OGP 画像として設定
 * - スタイル名を含む動的なタイトル・説明文を生成
 * - コンポーネントアンマウント時に元のタグに復元
 *
 * 使用例:
 * ```tsx
 * function ResultPage() {
 *   const { generatedImage, selectedStyle } = useAppStore();
 *   useResultMetaTags({
 *     generatedImage,
 *     styleName: selectedStyle?.name || '',
 *   });
 * }
 * ```
 */
export function useResultMetaTags(options: UseResultMetaTagsOptions): void {
  const { generatedImage, styleName } = options;

  useEffect(() => {
    if (!generatedImage || !styleName) return;

    return updateMetaTags({
      title: `${styleName}スタイルの肖像画 | TSUMUGI`,
      description: `AIが生成した${styleName}スタイルの肖像画。TSUMUGIで世界に一つだけのアートを。`,
      ogUrl: 'https://tsumugi-art.com/result',
      ogImage: generatedImage,
    });
  }, [generatedImage, styleName]);
}
