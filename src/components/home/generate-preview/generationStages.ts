import { Camera, ScanFace, Sparkles, Palette, Paintbrush, Wand2, Layers, Contrast, Frame } from 'lucide-react';

export const generationStages = [
  { icon: Camera, label: '写真を読み込んでいます', progress: 8 },
  { icon: ScanFace, label: '顔と表情を分析中', progress: 18 },
  { icon: Sparkles, label: 'スタイルを理解中', progress: 30 },
  { icon: Palette, label: '色彩を調和中', progress: 45 },
  { icon: Paintbrush, label: '筆致を再現中', progress: 58 },
  { icon: Wand2, label: 'ディテールを描き込み中', progress: 70 },
  { icon: Layers, label: 'テクスチャを重ねています', progress: 82 },
  { icon: Contrast, label: '明暗を調整中', progress: 92 },
  { icon: Frame, label: '最終仕上げ中', progress: 98 },
] as const;

/**
 * 経過時間（ms）から漸近的にプログレス（0〜98）を計算する。
 * 指数減衰カーブで最初は速く進み、徐々に減速する。
 * HALF_LIFE ms で約 62% に到達する。
 */
const PROGRESS_HALF_LIFE = 12_000;

export function computeProgress(elapsedMs: number): number {
  return 98 * (1 - Math.exp(-elapsedMs / PROGRESS_HALF_LIFE));
}

/** プログレス値から現在のステージ index を返す */
export function stageFromProgress(progress: number): number {
  let stage = 0;
  for (let i = 0; i < generationStages.length - 1; i++) {
    if (progress >= generationStages[i].progress) {
      stage = i + 1;
    }
  }
  return stage;
}

export function getEncouragingMessage(stage: number): string {
  if (stage < 3) return '素敵に仕上げています...';
  if (stage < 6) return '細部まで丁寧に...';
  if (stage < 8) return 'もうすぐ完成です！';
  return '完成間近です！';
}
