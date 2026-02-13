import { useState, type FormEvent } from 'react';
import { X, Save } from 'lucide-react';
import { updateContent } from '../../api';
import type { Content } from '../../types';

interface ContentEditorProps {
  item: Content;
  onClose: () => void;
  onSaved: () => void;
}

export function ContentEditor({ item, onClose, onSaved }: ContentEditorProps) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateContent(item.id, { title: title.trim(), body: body.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold">コンテンツ編集</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-secondary">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-64 font-mono"
              required
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-text rounded-lg text-sm hover:bg-surface-secondary transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              <Save size={14} />
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
