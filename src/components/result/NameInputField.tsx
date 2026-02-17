import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Type, AlertCircle, Loader2 } from 'lucide-react';
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
  /** 処理中フラグ */
  isProcessing?: boolean;
  /** 処理ステージ（Labor Illusion用） */
  processingStage?: string | null;
}

export function NameInputField({
  value,
  onChange,
  label = '名前を入力（任意）',
  placeholder = '例: ポチ、太郎',
  disabled = false,
  isProcessing = false,
  processingStage = null,
}: NameInputFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
    <div className="space-y-3">
      {/* ラベル */}
      <label htmlFor="portrait-name-input" className="flex items-center gap-2 text-sm md:text-base font-medium text-[#18181B]" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
        <Type className="h-4 w-4 md:h-5 md:w-5 text-[#71717A]" aria-hidden="true" />
        {label}
      </label>

      {/* 入力フィールド */}
      <div className="relative">
        <motion.input
          id="portrait-name-input"
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={() => {
            setIsFocused(false);
            handleBlur();
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={20}
          aria-describedby={error ? 'name-error' : warning ? 'name-warning' : 'name-hint'}
          aria-invalid={!!error}
          whileFocus={shouldReduceMotion ? {} : { scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className={`
            w-full rounded-lg border-2 px-4 py-3.5 text-base
            transition-all duration-200
            focus:outline-none focus:ring-4
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : isFocused
                ? 'border-[#EC4899] focus:border-[#EC4899] focus:ring-[#EC4899]/20'
                : 'border-zinc-300 focus:border-[#EC4899] focus:ring-[#EC4899]/20'
            }
            ${disabled ? 'bg-zinc-100 cursor-not-allowed' : 'bg-white'}
          `}
          style={{ fontFamily: 'Didact Gothic, sans-serif' }}
        />

        {/* 文字数カウント */}
        {showCharCount && !error && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
            className={`
              absolute right-3 top-3.5 text-xs font-medium
              ${isNearLimit ? 'text-orange-600' : 'text-[#71717A]'}
              ${isOverLimit ? 'text-red-600 font-bold' : ''}
            `}
            style={{ fontFamily: 'Didact Gothic, sans-serif' }}
          >
            {charCount}/20
          </motion.div>
        )}
      </div>

      {/* 警告メッセージ */}
      {warning && !error && (
        <motion.p
          initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          id="name-warning"
          className="flex items-center gap-1.5 text-sm text-orange-600"
          style={{ fontFamily: 'Didact Gothic, sans-serif' }}
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {warning}
        </motion.p>
      )}

      {/* エラーメッセージ */}
      {error && (
        <motion.p
          initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          id="name-error"
          role="alert"
          className="flex items-center gap-1.5 text-sm text-red-600"
          style={{ fontFamily: 'Didact Gothic, sans-serif' }}
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </motion.p>
      )}

      {/* ヒントテキスト */}
      {!error && !warning && charCount === 0 && !isProcessing && (
        <p id="name-hint" className="text-xs md:text-sm text-[#71717A]" style={{ fontFamily: 'Didact Gothic, sans-serif' }}>
          日本語・英語の文字、数字、スペース、ハイフンが使用できます
        </p>
      )}

      {/* ローディングステージ（Labor Illusion） */}
      {isProcessing && processingStage && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-[#18181B] bg-[#EC4899]/10 px-3 py-2 rounded-lg"
          style={{ fontFamily: 'Didact Gothic, sans-serif' }}
        >
          <Loader2 className="h-4 w-4 animate-spin text-[#EC4899]" />
          <span className="animate-pulse">{processingStage}</span>
        </motion.div>
      )}
    </div>
  );
}
