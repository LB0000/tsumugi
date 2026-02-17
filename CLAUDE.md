# TSUMUGI - 顧客向けサービス

AIでペット/人物写真をルネサンス風肖像画に変換するサービス。

> **注意:** マーケティング管理ツールは別プロジェクト `tsumugi-admin/` です。このプロジェクトとはランタイム依存がありません。

## 技術スタック

- **フロントエンド:** React 19 (Vite) + TypeScript + Tailwind CSS v4
- **バックエンド:** Express + TypeScript
- **AI:** Gemini API（画像生成）
- **決済:** Square API
- **デプロイ:** Vercel (frontend) + Railway (backend)

## ポート

| サービス | ポート |
|---------|--------|
| フロントエンド | 5173（Vite デフォルト） |
| バックエンド | 3001 |

## コマンド

```bash
npm run dev      # フロントエンド開発
npm run server   # バックエンド開発
npm run dev:all  # 両方同時起動
npm run build    # ビルド
npm run lint     # ESLint
```

## 価格戦略

### シンプルなチャージ方式

**基本方針:** 商品（AI肖像画）にフォーカス。価格表示は最小限に。

```
無料お試し: 3回
チャージ: ¥980（10回分）
単価: ¥98/回
```

**実装ファイル:**
- `src/data/pricing.ts` - 価格定義（シンプル版）
- `src/types/credits.ts` - クレジット管理の型定義
- `src/components/charge/ChargeModal.tsx` - チャージモーダル
- `src/components/generate/GenerateButton.tsx` - 生成ボタン

**UX設計原則:**
- 生成ボタンに価格表示なし（「生成する」のみ）
- 残高表示なし（残高不足時のみ「チャージして続ける」）
- チャージは¥980/10回の1択のみ
- 複雑な選択肢を排除し、商品体験に集中

**コスト構造:**
```
API（Gemini 3 Pro Image）: ¥20/枚
決済手数料（3.25%）: ¥3/枚
運用コスト: ¥3/枚
合計原価: ¥26/枚

販売価格: ¥98/枚
粗利: ¥72/枚（73.5%）
```

## 制約事項

### Gemini モデル（変更禁止）

**重要**: APIエラーが発生しても、ユーザーに確認せずにモデルを変更してはいけない。

- モデル: `gemini-3-pro-image-preview`
- 設定: `responseModalities: ['image', 'text']`
- エラー時はログを確認し原因を調査すること
