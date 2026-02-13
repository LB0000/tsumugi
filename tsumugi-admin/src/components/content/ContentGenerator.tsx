import { useState, type FormEvent } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateContentAI, createContent } from '../../api';
import type { ContentType, ContentPlatform } from '../../types';

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'sns_post', label: 'SNS投稿' },
  { value: 'ad_copy', label: '広告コピー' },
  { value: 'blog_article', label: 'ブログ記事' },
];

const PLATFORMS: { value: ContentPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'blog', label: 'ブログ' },
];

interface ContentGeneratorProps {
  onSaved: () => void;
}

export function ContentGenerator({ onSaved }: ContentGeneratorProps) {
  const [type, setType] = useState<ContentType>('sns_post');
  const [platform, setPlatform] = useState<ContentPlatform>('instagram');
  const [topic, setTopic] = useState('');
  const [generated, setGenerated] = useState('');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError('');
    setGenerating(true);
    try {
      const body = await generateContentAI(type, platform, topic);
      setGenerated(body);
      // Auto-set title from topic
      if (!title) setTitle(topic.slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generated || !title.trim()) return;
    setSaving(true);
    try {
      await createContent({
        type,
        platform,
        title: title.trim(),
        body: generated,
        aiPrompt: topic,
      });
      setGenerated('');
      setTitle('');
      setTopic('');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
  };

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          AIコンテンツ生成
        </h3>
      </div>

      <form onSubmit={handleGenerate} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">コンテンツタイプ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContentType)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">プラットフォーム</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">テーマ・トピック</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例: バレンタインギフトとしてのペット肖像画をPR"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-20"
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={generating || !topic.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              AIで生成
            </>
          )}
        </button>
      </form>

      {generated && (
        <div className="p-5 border-t border-border space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="コンテンツのタイトル"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">生成結果</label>
            <textarea
              value={generated}
              onChange={(e) => setGenerated(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-48 font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '下書き保存'}
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white border border-border text-text rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors"
            >
              コピー
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
