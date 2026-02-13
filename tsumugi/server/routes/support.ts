import { Router } from 'express';

export const supportRouter = Router();

interface SupportChatRequestBody {
  message?: string;
  actionId?: string;
}

const quickReplies: Record<string, string> = {
  download: 'デジタル商品は決済完了後すぐにダウンロードできます。マイページの「購入履歴」からも再ダウンロード可能です。',
  track: 'プリント商品は通常7〜14営業日でお届けします。発送後は追跡番号をメールでご案内します。',
  edit: '生成結果がイメージと異なる場合は、同じ写真で別スタイルを試すか、再生成をお試しください。',
  upscale: 'より高品質な結果には、顔が明るく鮮明な写真（1024px以上）を推奨しています。',
  payment: 'お支払いは主要クレジットカードに対応しています。決済に失敗する場合はカード情報と利用限度額をご確認ください。',
  trial: 'トライアル制限に達した場合は、プランアップグレードで追加生成が可能です。',
  order: '注文状況の確認には注文番号をご用意ください。必要に応じて問い合わせフォームからご連絡ください。',
};

const fallbackReply = 'お問い合わせありがとうございます。ご質問内容を確認し、必要に応じて担当者が2営業日以内にご連絡します。';

const keywordReplies: Array<{ keywords: string[]; reply: string }> = [
  {
    keywords: ['配送', '発送', '届', '納期'],
    reply: 'プリント商品は通常7〜14営業日で発送します。発送完了後に追跡情報をメールでお送りします。',
  },
  {
    keywords: ['支払い', '決済', 'カード', 'payment'],
    reply: '決済エラー時はカード番号・有効期限・CVC を再確認してください。改善しない場合は別カードもお試しください。',
  },
  {
    keywords: ['ダウンロード', '保存', 'download'],
    reply: 'デジタル商品は決済完了後すぐにダウンロード可能です。受信メールと注文完了ページから取得できます。',
  },
  {
    keywords: ['返品', '返金', 'キャンセル'],
    reply: 'デジタル商品は性質上、ダウンロード後の返品はできません。プリント不良は到着後7日以内に交換対応します。',
  },
];

function normalizeText(value: string): string {
  return value.toLowerCase();
}

supportRouter.post('/chat', (req, res) => {
  const body = req.body as SupportChatRequestBody;

  const actionId = typeof body.actionId === 'string' ? body.actionId.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!actionId && !message) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'メッセージまたはアクションを指定してください' },
    });
    return;
  }

  if (message.length > 1000) {
    res.status(400).json({
      success: false,
      error: { code: 'MESSAGE_TOO_LONG', message: 'メッセージは1000文字以内で入力してください' },
    });
    return;
  }

  let reply = fallbackReply;

  if (actionId && quickReplies[actionId]) {
    reply = quickReplies[actionId];
  } else if (message) {
    const normalized = normalizeText(message);
    const matched = keywordReplies.find((item) => item.keywords.some((keyword) => normalized.includes(normalizeText(keyword))));
    if (matched) {
      reply = matched.reply;
    }
  }

  res.json({
    success: true,
    reply,
    suggestedNextActions: ['faq', 'contact'],
  });
});
