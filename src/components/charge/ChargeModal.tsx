import { useState } from 'react';
import { Lock, CheckCircle, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PRICING } from '@/data/pricing';

interface ChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharge: () => Promise<void>;
}

export const ChargeModal = ({ isOpen, onClose, onCharge }: ChargeModalProps) => {
  const [isCharging, setIsCharging] = useState(false);
  const { credits, price } = PRICING.CHARGE_PACK;

  const handleCharge = async () => {
    setIsCharging(true);
    try {
      await onCharge();
      onClose();
    } catch (error) {
      console.error('Charge failed:', error);
    } finally {
      setIsCharging(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>残高をチャージ</DialogTitle>
        </DialogHeader>

        {/* メイン価格表示 */}
        <div className="py-8 text-center">
          <div className="text-5xl font-bold mb-3">
            ¥{price.toLocaleString()}
          </div>
          <p className="text-lg text-muted-foreground mb-1">
            {credits}回分の生成
          </p>
          <p className="text-sm text-muted-foreground">
            1回あたり ¥{PRICING.PRICE_PER_GENERATION}
          </p>
        </div>

        {/* Trust signals（控えめに） */}
        <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>残高は無期限有効</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>全19スタイル利用可能</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>商用利用OK</span>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handleCharge}
            disabled={isCharging}
          >
            {isCharging ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                チャージする
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
