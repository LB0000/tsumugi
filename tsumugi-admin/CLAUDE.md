# TSUMUGI Admin - マーケティング管理ツール

TSUMUGI サービスの運営者専用マーケティング管理ツール。コンテンツ生成・分析ダッシュボード・キャンペーン管理。

> **注意:** 顧客向けサービスはルートディレクトリ（`src/`, `server/`）です。このプロジェクトとはランタイム依存がありません。

## 技術スタック

- **フロントエンド:** React 19 (Vite) + TypeScript + Tailwind CSS v4
- **バックエンド:** Express 5 + TypeScript
- **DB:** SQLite (better-sqlite3) + Drizzle ORM
- **AI:** Gemini API (`gemini-2.0-flash` テキスト生成)
- **分析:** Square API（売上データ取得）
- **デプロイ:** Vercel (frontend) + Railway (backend)

## ポート

| サービス | ポート |
|---------|--------|
| フロントエンド | 5174 |
| バックエンド | 3002 |

## コマンド

```bash
npm run dev         # フロントエンド開発 (port 5174)
npm run server      # バックエンド開発 (port 3002)
npm run dev:all     # 両方同時起動
npm run build       # フロントエンドビルド
npm run build:server # サーバーのみビルド（型チェック）
```

## 認証

- 環境変数 `ADMIN_PASSWORD` で設定（最低12文字）
- セッションベース（Bearer トークン、24時間有効）

## DB

- パス: `data/tsumugi-admin.db`（SQLite、WAL モード）
- テーブル自動作成済み（`db/index.ts`）
- スキーマ定義: `server/db/schema.ts`

## 制約事項

### Gemini モデル

- テキスト生成: `gemini-2.0-flash`（`server/lib/gemini-text.ts`）
- 画像モデル（`gemini-3-pro-image-preview`）は顧客向けサービス側のみ。このプロジェクトでは使用しない

### Square API

- `SQUARE_ACCESS_TOKEN` 未設定時はモックデータで動作
- レスポンスの `source` フィールドで `'live'` / `'mock'` を区別可能
