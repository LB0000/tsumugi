import { Mail, Tag, FileText, RefreshCw } from 'lucide-react';
import type { GoalCategory, ActionType } from '../../types/strategy';

interface Props {
  category: GoalCategory;
  onAction: (actionType: ActionType, defaultTitle: string) => void;
}

const CATEGORY_QUICK_ACTIONS: Partial<Record<GoalCategory, Array<{ type: ActionType; label: string; icon: typeof Mail; title: string }>>> = {
  reviews: [
    { type: 'email', label: 'レビュー依頼メール', icon: Mail, title: 'レビュー依頼メールを送信' },
    { type: 'coupon', label: 'レビュー報酬クーポン', icon: Tag, title: 'レビュー報酬クーポンを作成' },
  ],
  email_list: [
    { type: 'sync', label: '顧客同期', icon: RefreshCw, title: '顧客データを同期' },
    { type: 'content', label: 'メルマガ作成', icon: FileText, title: 'メルマガコンテンツを生成' },
  ],
  revenue: [
    { type: 'email', label: 'プロモメール', icon: Mail, title: 'プロモーションメールを送信' },
    { type: 'coupon', label: '割引クーポン', icon: Tag, title: '割引クーポンを作成' },
  ],
  customers: [
    { type: 'sync', label: '顧客同期', icon: RefreshCw, title: '顧客データを同期' },
    { type: 'email', label: 'ウェルカムメール', icon: Mail, title: 'ウェルカムメールを送信' },
  ],
  sns: [
    { type: 'content', label: 'SNS投稿作成', icon: FileText, title: 'SNS投稿コンテンツを生成' },
  ],
  seo: [
    { type: 'content', label: 'ブログ記事作成', icon: FileText, title: 'SEO記事コンテンツを生成' },
  ],
};

export function QuickActions({ category, onAction }: Props) {
  const actions = CATEGORY_QUICK_ACTIONS[category];
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map(({ type, label, icon: Icon, title }) => (
        <button
          key={type + label}
          onClick={() => onAction(type, title)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-surface-secondary rounded-lg hover:bg-gray-200 transition-colors text-text-secondary hover:text-text"
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
