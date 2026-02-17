#!/bin/bash

# WebP 変換スクリプト
# 既存の JPG/PNG を WebP に変換（元ファイルは保持）

set -e

QUALITY=85  # WebP 品質（85 = 高品質、ファイルサイズとのバランス）
PUBLIC_DIR="public/images"

echo "🖼️  WebP 変換を開始します..."
echo "対象ディレクトリ: $PUBLIC_DIR"
echo "品質設定: $QUALITY"
echo ""

# 変換前のサイズを計算
BEFORE_SIZE=$(du -sh "$PUBLIC_DIR" | cut -f1)
echo "📊 変換前のサイズ: $BEFORE_SIZE"
echo ""

# 変換カウンター
CONVERTED=0
SKIPPED=0

# JPG/JPEG/PNG ファイルを検索して変換
find "$PUBLIC_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read -r file; do
  # WebP ファイル名を生成
  webp_file="${file%.*}.webp"

  # すでに WebP が存在する場合はスキップ
  if [ -f "$webp_file" ]; then
    echo "⏭️  スキップ: $webp_file (既に存在)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # WebP に変換
  echo "🔄 変換中: $file"
  cwebp -q "$QUALITY" "$file" -o "$webp_file" 2>&1 | grep -v "^Saving" || true

  # サイズ比較
  ORIGINAL_SIZE=$(du -h "$file" | cut -f1)
  WEBP_SIZE=$(du -h "$webp_file" | cut -f1)
  echo "   ✅ 完了: $ORIGINAL_SIZE → $WEBP_SIZE"
  echo ""

  CONVERTED=$((CONVERTED + 1))
done

# 変換後のサイズを計算
AFTER_SIZE=$(du -sh "$PUBLIC_DIR" | cut -f1)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 変換完了"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 変換前: $BEFORE_SIZE"
echo "📊 変換後: $AFTER_SIZE"
echo "🎉 変換済み: $CONVERTED ファイル"
echo ""
echo "⚠️  注意: 元のファイル (JPG/PNG) は保持されています"
echo "   コードで WebP を参照するように変更してください"
echo ""
