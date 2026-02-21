import { GoogleGenerativeAI } from '@google/generative-ai';
import { recordApiCall } from './api-monitor.js';
import { config } from '../config.js';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!config.GEMINI_API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAI;
}

export type ContentType = 'sns_post' | 'ad_copy' | 'blog_article';
export type Platform = 'instagram' | 'twitter' | 'tiktok' | 'blog';

export type EmailSegment = 'new' | 'active' | 'lapsed' | 'all';
export type EmailPurpose = 'welcome' | 'promotion' | 'reactivation' | 'newsletter';

const SERVICE_CONTEXT = `
あなたはTSUMUGIのマーケティング担当です。
TSUMUGIは、AIでペットや人物の写真をルネサンス風の肖像画に変換するサービスです。
商品: 高解像度画像データ(¥2,900)、アクリルスタンド(¥3,900)、キャンバスアート(¥4,900)、オリジナルスマホケース(¥3,500)、特製ポストカード5枚組(¥1,500)
ブランドトーン: 温かみがあり、遊び心がありつつも上品。ペットへの愛情を大切にする。
`.trim();

const PROMPT_TEMPLATES: Record<ContentType, (platform: Platform, topic: string) => string> = {
  sns_post: (platform, topic) => {
    const charLimits: Record<Platform, string> = {
      twitter: '140文字以内',
      instagram: '2200文字以内（最初の150文字が重要）',
      tiktok: '150文字以内',
      blog: '300文字程度',
    };
    return `${SERVICE_CONTEXT}

以下の条件でSNS投稿を作成してください:
- プラットフォーム: ${platform}
- 文字数: ${charLimits[platform]}
- テーマ: ${topic}
- ハッシュタグを適切に含める
- 絵文字を効果的に使用
- CTA（行動喚起）を含める

投稿文のみを出力してください。`;
  },

  ad_copy: (_platform, topic) => {
    return `${SERVICE_CONTEXT}

以下の条件で広告コピーを作成してください:
- テーマ: ${topic}
- 以下の3つを出力:
  1. ヘッドライン（30文字以内）
  2. サブヘッドライン（50文字以内）
  3. ボディコピー（200文字以内）

形式:
【ヘッドライン】
（内容）

【サブヘッドライン】
（内容）

【ボディコピー】
（内容）`;
  },

  blog_article: (_platform, topic) => {
    return `${SERVICE_CONTEXT}

以下の条件でブログ記事を作成してください:
- テーマ: ${topic}
- 構成: タイトル + リード文 + 本文（3〜4セクション）+ まとめ
- 文字数: 1500〜2000文字程度
- SEOを意識したキーワードの自然な配置
- 読者に価値を提供する内容

Markdown形式で出力してください。`;
  },
};

const SEGMENT_CONTEXTS: Record<EmailSegment, string> = {
  new: 'ターゲット: 新規登録したばかりの顧客。まだ購入経験がないか、初回購入直後。ウェルカム感を重視し、サービスの魅力を伝える。',
  active: 'ターゲット: アクティブな既存顧客。リピート購入や新商品への興味を促進。感謝の気持ちと特別感を演出。',
  lapsed: 'ターゲット: しばらく購入していない休眠顧客。再訪を促すインセンティブや新しい機能・商品の紹介。押し付けがましくならないよう注意。',
  all: 'ターゲット: 全顧客。幅広い層に響く一般的な内容。',
};

const PURPOSE_CONTEXTS: Record<EmailPurpose, string> = {
  welcome: '目的: ウェルカムメール。サービス紹介、使い方ガイド、初回特典の案内。',
  promotion: '目的: プロモーション。セール、新商品、期間限定オファーの告知。',
  reactivation: '目的: 再活性化。久しぶりの顧客への呼びかけ、新機能紹介、特別クーポン提供。',
  newsletter: '目的: ニュースレター。最新情報、ユーザー事例、季節の挨拶。',
};

export async function generateEmailContent(
  segment: EmailSegment,
  purpose: EmailPurpose,
  topic: string,
): Promise<{ subject: string; body: string }> {
  const client = getClient();
  if (!client) {
    return generateMockEmailContent(segment, purpose, topic);
  }

  const prompt = `${SERVICE_CONTEXT}

${SEGMENT_CONTEXTS[segment]}
${PURPOSE_CONTEXTS[purpose]}

以下の条件でマーケティングメールを作成してください:
- 追加の指示/テーマ: ${topic || '（なし — 上記の目的とターゲットに基づいて自動生成）'}
- 出力形式: 件名と本文を分けて出力
- 本文はHTMLメールとして使えるようにシンプルなHTMLタグ（p, strong, br, a, ul, li）を使用
- 文字数: 本文200〜400文字程度
- 温かみのある丁寧な敬語
- 明確なCTA（行動喚起）を1つ含める

必ず以下の形式で出力してください:
【件名】
（件名テキスト1行のみ）

【本文】
（HTML形式の本文）`;

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const start = Date.now();
  try {
    const result = await model.generateContent(prompt);
    recordApiCall('gemini', 'generateEmailContent', 'success', Date.now() - start);
    const text = result.response.text();
    return parseEmailResponse(text);
  } catch (error) {
    recordApiCall('gemini', 'generateEmailContent', 'error', Date.now() - start, error instanceof Error ? error.message : undefined);
    console.error('Gemini email generation error:', error);
    throw new Error('メールの生成に失敗しました');
  }
}

function parseEmailResponse(text: string): { subject: string; body: string } {
  const subjectMatch = text.match(/【件名】\s*\n?(.+)/);
  const bodyMatch = text.match(/【本文】\s*\n?([\s\S]+)$/);

  let subject = subjectMatch?.[1]?.trim() || 'TSUMUGIからのお知らせ';
  subject = subject
    .replace(/<[^>]*>/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .substring(0, 200);

  const body = bodyMatch?.[1]?.trim() || text;

  return { subject, body };
}

function generateMockEmailContent(
  segment: EmailSegment,
  purpose: EmailPurpose,
  topic: string,
): { subject: string; body: string } {
  const templates: Record<EmailPurpose, { subject: string; body: string }> = {
    welcome: {
      subject: 'TSUMUGIへようこそ！あなただけの肖像画を作りませんか？',
      body: '<p>TSUMUGIへのご登録ありがとうございます。</p><p>TSUMUGIは、お気に入りの写真をAIでルネサンス風の美しい肖像画に変換するサービスです。</p><p><strong>かんたん3ステップ：</strong></p><ul><li>写真をアップロード</li><li>AIが肖像画を生成</li><li>お好みの形でお届け</li></ul><p>まずは一枚、大切な写真で試してみませんか？</p>',
    },
    promotion: {
      subject: '【期間限定】キャンバスアートが20%OFF！',
      body: '<p>いつもTSUMUGIをご利用いただきありがとうございます。</p><p>今だけの特別キャンペーンのお知らせです。</p><p><strong>キャンバスアート 20%OFF</strong><br>通常¥4,900 → <strong>¥3,920</strong></p><p>お気に入りの写真を、本格的なキャンバスアートに。お部屋のインテリアにもぴったりです。</p><p>この機会をお見逃しなく！</p>',
    },
    reactivation: {
      subject: 'お久しぶりです！TSUMUGIに新機能が追加されました',
      body: '<p>お久しぶりです。TSUMUGIをご利用いただきありがとうございました。</p><p>最近、新しい機能が追加されました：</p><ul><li>スマホケースへの印刷に対応</li><li>ポストカード5枚組セットが新登場</li><li>画質がさらに向上</li></ul><p>以前よりもさらに美しい肖像画をお届けできるようになりました。</p><p>ぜひまたお試しください。</p>',
    },
    newsletter: {
      subject: '【TSUMUGI通信】今月のおすすめ＆ユーザー作品紹介',
      body: '<p>TSUMUGIをご利用いただきありがとうございます。</p><p>今月のニュースレターをお届けします。</p><p><strong>今月のおすすめ</strong></p><p>季節の変わり目、新しい家族写真で肖像画を作ってみませんか？お子様やペットの成長記録にもぴったりです。</p><p><strong>ユーザー様の声</strong></p><p>「愛犬の肖像画をキャンバスアートにしました。毎日眺めて癒されています」</p><p>素敵な作品をお待ちしています！</p>',
    },
  };

  const template = templates[purpose];
  const segmentLabel = segment === 'all' ? '全顧客' : segment;
  const topicNote = topic.trim()
    ? `<p><strong>配信対象:</strong> ${segmentLabel}</p><p><strong>追加トピック:</strong> ${topic.trim()}</p>`
    : '';
  return {
    subject: template.subject,
    body: `${template.body}${topicNote}`,
  };
}

export async function generateContent(
  type: ContentType,
  platform: Platform,
  topic: string,
): Promise<string> {
  const client = getClient();
  if (!client) {
    return generateMockContent(type, platform, topic);
  }

  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = PROMPT_TEMPLATES[type](platform, topic);

  const start = Date.now();
  try {
    const result = await model.generateContent(prompt);
    recordApiCall('gemini', 'generateContent', 'success', Date.now() - start);
    const response = result.response;
    return response.text();
  } catch (error) {
    recordApiCall('gemini', 'generateContent', 'error', Date.now() - start, error instanceof Error ? error.message : undefined);
    console.error('Gemini text generation error:', error);
    throw new Error('コンテンツの生成に失敗しました');
  }
}

function generateMockContent(type: ContentType, platform: Platform, topic: string): string {
  const mocks: Record<ContentType, string> = {
    sns_post: `🎨 ${topic}\n\nあなたの大切な家族を、ルネサンスの名画のように。\nTSUMUGIで、世界に一つだけの肖像画を作りませんか？\n\n📸 写真をアップロードするだけ\n🖼️ AIが美しい肖像画に変換\n🎁 キャンバスアートやスマホケースに\n\n▶️ プロフィールのリンクから\n\n#TSUMUGI #ペット肖像画 #AI肖像画 #${platform}`,
    ad_copy: `【ヘッドライン】\n愛するペットを、永遠の名画に。\n\n【サブヘッドライン】\nAIが写真をルネサンス風肖像画に変換。世界に一つだけの作品をお届け。\n\n【ボディコピー】\n${topic}\nTSUMUGIは、お気に入りの写真をアップロードするだけで、AIがルネサンス風の美しい肖像画を作成します。高解像度データはもちろん、キャンバスアートやアクリルスタンドなど、お好みの形でお届け。大切な家族の思い出を、アートとして残しませんか？`,
    blog_article: `# ${topic}\n\n## はじめに\n\n愛するペットや家族の写真を、ルネサンス時代の名画のように美しい肖像画に変換できるサービス「TSUMUGI」をご存知ですか？\n\n## AIが実現する新しいアートの形\n\n最新のAI技術により、誰でも簡単に美しい肖像画を作成できるようになりました。\n\n## TSUMUGIの使い方\n\n1. 写真をアップロード\n2. お好みのスタイルを選択\n3. AIが肖像画を生成\n\n## まとめ\n\n大切な思い出を、世界に一つだけのアートとして残してみませんか？`,
  };
  return mocks[type];
}
