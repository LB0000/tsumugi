import { Camera, ScanFace, Sparkles, Palette, Paintbrush, Wand2, Layers, Contrast, Frame } from 'lucide-react';

export const generationStages = [
  { icon: Camera, label: '写真を読み込んでいます', duration: 1000, progress: 8 },
  { icon: ScanFace, label: '顔と表情を分析中', duration: 1200, progress: 18 },
  { icon: Sparkles, label: 'スタイルを理解中', duration: 1500, progress: 30 },
  { icon: Palette, label: '色彩を調和中', duration: 1800, progress: 45 },
  { icon: Paintbrush, label: '筆致を再現中', duration: 1600, progress: 58 },
  { icon: Wand2, label: 'ディテールを描き込み中', duration: 1400, progress: 70 },
  { icon: Layers, label: 'テクスチャを重ねています', duration: 1200, progress: 82 },
  { icon: Contrast, label: '明暗を調整中', duration: 1000, progress: 92 },
  { icon: Frame, label: '最終仕上げ中', duration: 2300, progress: 98 },
] as const;

export function getEncouragingMessage(stage: number): string {
  if (stage < 3) return '素敵に仕上げています...';
  if (stage < 6) return '細部まで丁寧に...';
  if (stage < 8) return 'もうすぐ完成です！';
  return '完成間近です！';
}
