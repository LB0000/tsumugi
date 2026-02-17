import { Sparkles, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserCredits } from '@/types/credits';
import { canGenerate, needsCharge } from '@/types/credits';

interface GenerateButtonProps {
  credits: UserCredits;
  onGenerate: () => void;
  onNeedsCharge: () => void;
  isGenerating?: boolean;
}

export const GenerateButton = ({
  credits,
  onGenerate,
  onNeedsCharge,
  isGenerating = false,
}: GenerateButtonProps) => {
  const canGen = canGenerate(credits);
  const needsChg = needsCharge(credits);

  const handleClick = () => {
    if (needsChg) {
      onNeedsCharge();
    } else {
      onGenerate();
    }
  };

  // 残高不足時
  if (needsChg) {
    return (
      <Button className="w-full" size="lg" onClick={handleClick}>
        <CreditCard className="w-5 h-5 mr-2" />
        チャージして続ける
      </Button>
    );
  }

  // 生成可能時
  return (
    <Button
      className="w-full"
      size="lg"
      onClick={handleClick}
      disabled={!canGen || isGenerating}
    >
      <Sparkles className="w-5 h-5 mr-2" />
      {isGenerating ? '生成中...' : '生成する'}
    </Button>
  );
};
