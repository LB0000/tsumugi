import { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { NameInputField } from './NameInputField';
import { PortraitPreview } from './PortraitPreview';

export interface NameEngravingSectionProps {
  /** ベース画像のdata URL */
  baseImageUrl: string;
  /** アートスタイルID */
  styleId: string;
  /** 現在の名前 */
  portraitName: string;
  /** 名前変更時のコールバック */
  onNameChange: (name: string) => void;
}

export function NameEngravingSection({
  baseImageUrl,
  styleId,
  portraitName,
  onNameChange,
}: NameEngravingSectionProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 space-y-6 border border-purple-100">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900">
              名前を入れて特別な1枚に
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              無料で名前を追加できます
            </p>
          </div>
        </div>

        {/* 新機能バッジ */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          NEW
        </span>
      </div>

      {/* 説明 */}
      <div className="flex items-start gap-2 bg-white rounded-lg p-4 border border-purple-100">
        <Info className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p>
            ペットや大切な人の名前を無料で追加できます。
            肖像画の下部に美しいフォントで名前が表示されます。
          </p>
        </div>
      </div>

      {/* 名前入力フィールド */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <NameInputField
          value={portraitName}
          onChange={onNameChange}
          label="名前を入力（任意・無料）"
          placeholder="例: ポチ、太郎、花子"
        />

        {/* プレビュートグル */}
        {portraitName && portraitName.trim() !== '' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              {showPreview ? 'プレビューを閉じる' : '名前入りプレビューを見る'}
            </button>
          </div>
        )}
      </div>

      {/* プレビュー */}
      {showPreview && portraitName && portraitName.trim() !== '' && (
        <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            名前入りプレビュー
          </h4>
          <PortraitPreview
            baseImageUrl={baseImageUrl}
            styleId={styleId}
            portraitName={portraitName}
            alt="名前入り肖像画プレビュー"
            className="max-w-md mx-auto"
          />
          <p className="text-xs text-gray-500 text-center">
            実際の商品もこのように名前が表示されます
          </p>
        </div>
      )}

      {/* 注意事項 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• 名前は最大20文字まで入力できます</p>
        <p>• 日本語・英語の文字、数字、スペース、ハイフンが使用できます</p>
        <p>• 名前は無料で追加できます（料金は変わりません）</p>
      </div>
    </div>
  );
}
