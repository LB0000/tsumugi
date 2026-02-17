import { CheckCircle, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PRICING } from '@/data/pricing';

interface FreeTrialCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharge: () => void;
}

export const FreeTrialCompleteModal = ({
  isOpen,
  onClose,
  onCharge,
}: FreeTrialCompleteModalProps) => {
  const { credits, price } = PRICING.CHARGE_PACK;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            無料お試し完了！
          </DialogTitle>
          <DialogDescription>
            3回のお試し生成が完了しました。<br />
            気に入っていただけましたか？
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center bg-muted/50 rounded-lg">
          <div className="text-4xl font-bold mb-2">
            ¥{price.toLocaleString()}
          </div>
          <p className="text-muted-foreground">
            {credits}回分の生成
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            1回 ¥{PRICING.PRICE_PER_GENERATION}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button className="w-full" onClick={onCharge}>
            <Zap className="w-4 h-4 mr-2" />
            チャージして続ける
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            後で
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
