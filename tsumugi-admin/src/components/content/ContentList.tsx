import { useState } from 'react';
import { Trash2, Send, Archive, Edit3, Copy, Eye } from 'lucide-react';
import { deleteContent, publishContent, archiveContent } from '../../api';
import type { Content } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  sns_post: 'SNS投稿',
  ad_copy: '広告コピー',
  blog_article: 'ブログ記事',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'X',
  tiktok: 'TikTok',
  blog: 'ブログ',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  published: '公開済み',
  archived: 'アーカイブ',
};

interface ContentListProps {
  items: Content[];
  onRefresh: () => void;
  onEdit: (item: Content) => void;
}

export function ContentList({ items, onRefresh, onEdit }: ContentListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionError, setActionError] = useState('');

  const handleDelete = async (id: string) => {
    if (!confirm('このコンテンツを削除しますか？')) return;
    setActionError('');
    try {
      await deleteContent(id);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handlePublish = async (id: string) => {
    setActionError('');
    try {
      await publishContent(id);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '公開に失敗しました');
    }
  };

  const handleArchive = async (id: string) => {
    setActionError('');
    try {
      await archiveContent(id);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'アーカイブに失敗しました');
    }
  };

  const handleCopy = (body: string) => {
    navigator.clipboard.writeText(body);
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <p className="text-text-secondary text-sm">コンテンツがありません</p>
        <p className="text-text-secondary text-xs mt-1">上のフォームからAIで生成してみましょう</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {actionError}
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-xl border border-border">
          <div className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                {item.platform && (
                  <span className="text-[10px] text-text-secondary">
                    {PLATFORM_LABELS[item.platform] || item.platform}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium truncate">{item.title}</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {new Date(item.updatedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
                title="プレビュー"
              >
                <Eye size={14} className="text-text-secondary" />
              </button>
              <button
                onClick={() => onEdit(item)}
                className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
                title="編集"
              >
                <Edit3 size={14} className="text-text-secondary" />
              </button>
              <button
                onClick={() => handleCopy(item.body)}
                className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
                title="コピー"
              >
                <Copy size={14} className="text-text-secondary" />
              </button>
              {item.status === 'draft' && (
                <button
                  onClick={() => handlePublish(item.id)}
                  className="p-1.5 rounded hover:bg-green-50 transition-colors"
                  title="公開"
                >
                  <Send size={14} className="text-success" />
                </button>
              )}
              {item.status === 'published' && (
                <button
                  onClick={() => handleArchive(item.id)}
                  className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
                  title="アーカイブ"
                >
                  <Archive size={14} className="text-text-secondary" />
                </button>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded hover:bg-red-50 transition-colors"
                title="削除"
              >
                <Trash2 size={14} className="text-danger" />
              </button>
            </div>
          </div>

          {expandedId === item.id && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                {item.body}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
