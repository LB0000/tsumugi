import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { ContentGenerator } from '../components/content/ContentGenerator';
import { ContentList } from '../components/content/ContentList';
import { ContentEditor } from '../components/content/ContentEditor';
import { getContents } from '../api';
import type { Content, ContentStatus } from '../types';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'published', label: '公開済み' },
  { value: 'archived', label: 'アーカイブ' },
];

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'sns_post', label: 'SNS投稿' },
  { value: 'ad_copy', label: '広告コピー' },
  { value: 'blog_article', label: 'ブログ記事' },
];

export function ContentPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editItem, setEditItem] = useState<Content | null>(null);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContents({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コンテンツの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const statusCounts = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<ContentStatus, number>,
  );

  return (
    <div>
      <Header title="コンテンツ生成" />
      <div className="p-6 space-y-6">
        {/* Generator */}
        <ContentGenerator onSaved={fetchContents} />

        {/* Filters + List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              保存済みコンテンツ
              <span className="text-text-secondary font-normal ml-2">
                {items.length}件
                {statusCounts.draft ? ` (下書き ${statusCounts.draft})` : ''}
              </span>
            </h3>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    statusFilter === f.value
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border text-text-secondary hover:bg-surface-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    typeFilter === f.value
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border text-text-secondary hover:bg-surface-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={fetchContents}
                className="mt-2 text-xs text-primary hover:underline"
              >
                再試行
              </button>
            </div>
          ) : (
            <ContentList items={items} onRefresh={fetchContents} onEdit={setEditItem} />
          )}
        </div>
      </div>

      {editItem && (
        <ContentEditor
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={fetchContents}
        />
      )}
    </div>
  );
}
