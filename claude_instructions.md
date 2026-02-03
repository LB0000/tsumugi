# Claude Code 実装指示書：スタイル選択セクションの実装

以下の手順に従って、ユーザーがトップページで和風スタイル（水彩、アニメ、和モダン等）を選択できるセクションを実装してください。

## 1. コンポーネントの作成

新規ファイル `src/components/home/StyleSection.tsx` を作成し、以下の仕様で実装します。

- `src/data/artStyles.ts` からスタイル定義を読み込む
- 横スクロール可能なリストとしてスタイルを表示する
- 各スタイルをクリックすると、そのスタイルが選択され、詳細モーダルが開く
- デザインは既存のサイト（黒背景、高級感）に合わせる

## 2. エクスポート設定

`src/components/home/index.ts` に以下を追加してエクスポートします。

```typescript
export * from './StyleSection';
```

## 3. HomePageへの配置

`src/pages/HomePage.tsx` を編集し、`StyleSection` コンポーネントを追加します。

- 配置場所: `ImageUploader`（アップロードエリア）の下、かつ `SampleGallery` の上
- インポート文を追加する

## 4. データ確認（必要であれば）

`src/data/artStyles.ts` が以下の新しいスタイルを含んでいるか確認し、なければ更新します。

- watercplor (水彩画)
- anime (アニメ・イラスト)
- japanese-modern (和モダン)
- ukiyo-e (浮世絵)
