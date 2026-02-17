# 価格設定実装ガイド

## 概要

シンプルなチャージ方式の価格設定を実装しました。

**基本方針:**
- 商品（AI生成肖像画）にフォーカス
- 価格表示は最小限に
- ユーザーは残高を意識せず、生成体験に集中

---

## 価格構造

```
無料お試し: 3回
チャージ: ¥980（10回分）
単価: ¥98/回
```

### コスト構造

```
API（Gemini 3 Pro Image）: ¥20/枚
決済手数料（3.25%）: ¥3/枚
運用コスト: ¥3/枚
──────────────────────
合計原価: ¥26/枚

販売価格: ¥98/枚
粗利: ¥72/枚（73.5%）
```

---

## 実装ファイル

### 1. 価格定義

**`src/data/pricing.ts`**
```typescript
export const PRICING = {
  FREE_CREDITS: 3,
  PRICE_PER_GENERATION: 98,
  CHARGE_PACK: {
    credits: 10,
    price: 980,
    pricePerCredit: 98,
  },
} as const;
```

### 2. 型定義

**`src/types/credits.ts`**
```typescript
export interface UserCredits {
  freeUsed: number;
  freeRemaining: number;
  paidBalance: number;
  paidTotalPurchased: number;
  paidTotalUsed: number;
  totalGenerated: number;
  lastChargeAt?: Date;
}
```

### 3. コンポーネント

**主要コンポーネント:**
- `ChargeModal.tsx` - チャージモーダル
- `FreeTrialCompleteModal.tsx` - 無料お試し完了モーダル
- `GenerateButton.tsx` - 生成ボタン

---

## ユーザーフロー

```
1. 初回訪問
   「無料で3回お試し」
   ↓
2. 生成ページ
   [写真アップロード]
   [生成する] ← シンプル
   ↓
3. 生成を繰り返す
   [生成する]
   [生成する]
   [生成する]
   ↓
4. 3回使い切り
   [チャージして続ける] ← ボタンが変わる
   ↓
5. チャージモーダル
   「¥980で10回分」
   [チャージする]
   ↓
6. チャージ完了
   [生成する] ← 元に戻る
```

---

## UI設計原則

### ❌ 表示しないもの

- 生成ボタンの価格表示
- 残高表示（通常時）
- 残高警告
- 複数の価格プラン
- 推奨バッジ
- ポイント還元

### ✅ 表示するもの

- シンプルな生成ボタン「生成する」
- 残高不足時のみ「チャージして続ける」
- チャージモーダルの価格「¥980」
- 無料お試しの案内（初回のみ）

---

## バックエンド実装（TODO）

### 必要なAPI

```typescript
// クレジット残高取得
GET /api/credits
Response: UserCredits

// 生成実行（クレジット消費）
POST /api/generate
Request: { image, styleId }
Response: { success, generatedImage, creditsRemaining }

// チャージ（Square決済）
POST /api/charge
Request: { amount, credits }
Response: { success, paymentId, newBalance }
```

### データベーススキーマ

```sql
-- ユーザークレジットテーブル
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY,
  free_used INT DEFAULT 0,
  paid_balance INT DEFAULT 0,
  paid_total_purchased INT DEFAULT 0,
  paid_total_used INT DEFAULT 0,
  total_generated INT DEFAULT 0,
  last_charge_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- チャージ履歴
CREATE TABLE charge_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  credits INT NOT NULL,
  amount_paid INT NOT NULL,
  payment_id VARCHAR(255),
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 生成履歴
CREATE TABLE generation_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  cost_type VARCHAR(10), -- 'free' or 'paid'
  style_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## テスト項目

### 機能テスト

- [ ] 初回訪問時に無料3回が付与される
- [ ] 無料枠を使い切ると「チャージして続ける」が表示される
- [ ] チャージ後に残高が正しく増加する
- [ ] 生成時に正しくクレジットが消費される（無料→有料の順）
- [ ] 残高不足時にモーダルが表示される

### UXテスト

- [ ] 生成ボタンに価格表示がない
- [ ] 残高表示がない（通常時）
- [ ] チャージモーダルがシンプル（1択）
- [ ] ローディング状態が適切に表示される

### エッジケース

- [ ] 同時生成リクエストでのクレジット消費
- [ ] チャージ中の生成リクエスト
- [ ] 決済失敗時のロールバック

---

## デプロイ前チェックリスト

- [ ] 価格定義が正しい（¥980/10回）
- [ ] Square決済が本番環境で動作する
- [ ] クレジット消費ロジックが正確
- [ ] トランザクション処理が安全
- [ ] エラーハンドリングが適切
- [ ] ログが適切に記録される
- [ ] CLAUDE.mdが最新の価格戦略を反映している

---

## 今後の拡張案（低優先度）

- カスタム枚数購入（上級者向け）
- まとめ買い割引（30枚、50枚オプション）
- サブスクリプションプラン
- ギフトコード機能
- 設定画面での残高確認
