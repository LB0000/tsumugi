import { useState } from 'react';

export function FunnelForm({ isOpen, onClose, onSubmit }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: { date: string; visitors: number; freeGenerations: number; charges: number; physicalPurchases: number; revenue: number }) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [visitors, setVisitors] = useState('');
  const [freeGen, setFreeGen] = useState('');
  const [charges, setCharges] = useState('');
  const [purchases, setPurchases] = useState('');
  const [revenue, setRevenue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ date, visitors: Number(visitors), freeGenerations: Number(freeGen), charges: Number(charges), physicalPurchases: Number(purchases), revenue: Number(revenue) });
    setVisitors(''); setFreeGen(''); setCharges(''); setPurchases(''); setRevenue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">ファネルデータ入力</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="訪問者数" value={visitors} onChange={(e) => setVisitors(e.target.value)} required />
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="無料生成数" value={freeGen} onChange={(e) => setFreeGen(e.target.value)} required />
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="チャージ数" value={charges} onChange={(e) => setCharges(e.target.value)} required />
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="物理商品購入数" value={purchases} onChange={(e) => setPurchases(e.target.value)} required />
          <input className="w-full border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="売上（円）" value={revenue} onChange={(e) => setRevenue(e.target.value)} required />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary">キャンセル</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
