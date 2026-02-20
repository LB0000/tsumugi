import { useState } from 'react';
import { CHANNEL_LABELS, type AdChannel } from '../../types/strategy';

export function AdSpendForm({ isOpen, onClose, onSubmit }: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: { channel: string; amount: number; period: string; impressions?: number; clicks?: number; conversions?: number; revenue?: number; note?: string }) => void;
}) {
  const [channel, setChannel] = useState<AdChannel>('meta');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');
  const [revenue, setRevenue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      channel, amount: Number(amount), period,
      impressions: impressions ? Number(impressions) : undefined,
      clicks: clicks ? Number(clicks) : undefined,
      conversions: conversions ? Number(conversions) : undefined,
      revenue: revenue ? Number(revenue) : undefined,
    });
    setAmount(''); setImpressions(''); setClicks(''); setConversions(''); setRevenue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">広告費を追加</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select className="w-full border border-border rounded-lg px-3 py-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value as AdChannel)}>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-2">
            <input className="flex-1 border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="金額（円）" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <input className="w-36 border border-border rounded-lg px-3 py-2 text-sm" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="インプレッション" value={impressions} onChange={(e) => setImpressions(e.target.value)} />
            <input className="border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="クリック" value={clicks} onChange={(e) => setClicks(e.target.value)} />
            <input className="border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="コンバージョン" value={conversions} onChange={(e) => setConversions(e.target.value)} />
            <input className="border border-border rounded-lg px-3 py-2 text-sm" type="number" placeholder="売上（円）" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface-secondary">キャンセル</button>
            <button type="submit" className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90">追加</button>
          </div>
        </form>
      </div>
    </div>
  );
}
