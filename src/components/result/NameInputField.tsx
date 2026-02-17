import { useState, useEffect } from 'react';
import { Type, AlertCircle } from 'lucide-react';
import { validatePortraitName, getNameInputWarning, sanitizePortraitName } from '../../lib/validation/nameValidation';

export interface NameInputFieldProps {
  /** 現在の名前 */
  value: string;
  /** 値変更時のコールバック */
  onChange: (value: string) => void;
  /** ラベルテキスト */
  label?: string;
  /** プレースホルダー */
  placeholder?: string;
  /** 無効化 */
  disabled?: boolean;
}

export function NameInputField({
  value,
  onChange,
  label = '名前を入力（任意）',
  placeholder = '例: ポチ、太郎',
  disabled = false,
}: NameInputFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 親コンポーネントからの値変更を反映
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // 自動サニタイズ（禁止文字を削除）
    const sanitized = sanitizePortraitName(newValue);
    setLocalValue(sanitized);

    // リアルタイム警告
    const currentWarning = getNameInputWarning(sanitized);
    setWarning(currentWarning);

    // 最終バリデーション
    const validation = validatePortraitName(sanitized);
    if (validation.isValid) {
      setError(null);
      onChange(validation.cleanedText || '');
    } else {
      setError(validation.error || null);
    }
  };

  const handleBlur = () => {
    // フォーカス離脱時に最終バリデーション
    const validation = validatePortraitName(localValue);
    if (!validation.isValid) {
      setError(validation.error || null);
    } else {
      setError(null);
    }
  };

  const charCount = localValue.length;
  const showCharCount = charCount > 0;
  const isNearLimit = charCount >= 15;
  const isOverLimit = charCount > 20;

  return (
    <div className="space-y-2">
      {/* ラベル */}
      <label htmlFor="portrait-name-input" className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Type className="h-4 w-4 text-gray-400" />
        {label}
      </label>

      {/* 入力フィールド */}
      <div className="relative">
        <input
          id="portrait-name-input"
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={20}
          className={`
            w-full rounded-lg border px-4 py-3 text-base transition-all
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
        />

        {/* 文字数カウント */}
        {showCharCount && !error && (
          <div
            className={`
              absolute right-3 top-3 text-xs
              ${isNearLimit ? 'text-orange-600 font-medium' : 'text-gray-400'}
              ${isOverLimit ? 'text-red-600 font-bold' : ''}
            `}
          >
            {charCount}/20
          </div>
        )}
      </div>

      {/* 警告メッセージ */}
      {warning && !error && (
        <p className="flex items-center gap-1.5 text-sm text-orange-600">
          <AlertCircle className="h-4 w-4" />
          {warning}
        </p>
      )}

      {/* エラーメッセージ */}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* ヒントテキスト */}
      {!error && !warning && charCount === 0 && (
        <p className="text-xs text-gray-500">
          日本語・英語の文字、数字、スペース、ハイフンが使用できます
        </p>
      )}
    </div>
  );
}
