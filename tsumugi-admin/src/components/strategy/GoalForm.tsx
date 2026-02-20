import { useState } from 'react';
import { CATEGORY_LABELS, type GoalCategory } from '../../types/strategy';

export function GoalForm({ isOpen, onClose, onSubmit }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: { name: string; category: string; targetValue: number; unit: string; deadline: string }) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('reviews');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('件');
  const [deadline, setDeadline] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, category, targetValue: Number(targetValue), unit, deadline });
    setName(''); setTargetValue(''); setDeadline('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">目標を追加</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="目標名（例: レビュー200件獲得）" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="flex-1 border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="目標値" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
            <input className="w-20 border border-border rounded-lg px-3 py-2 text-sm" placeholder="単位" value={unit} onChange={(e) => setUnit(e.target.value)} required />
          </div>
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary">キャンセル</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90">追加</button>
          </div>
        </form>
      </div>
    </div>
  );
}
