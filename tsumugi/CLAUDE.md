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

## 制約事項

### Gemini モデル（変更禁止）

**重要**: APIエラーが発生しても、ユーザーに確認せずにモデルを変更してはいけない。

- モデル: `gemini-3-pro-image-preview`
- 設定: `responseModalities: ['image', 'text']`
- エラー時はログを確認し原因を調査すること
