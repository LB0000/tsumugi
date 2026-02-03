import type { StyleCategory } from '../types';

export const styleCategories: StyleCategory[] = [
  {
    id: 'all',
    name: 'すべて',
    description: '全てのスタイルを表示',
    icon: 'Grid3X3'
  },
  {
    id: 'renaissance',
    name: 'ルネサンス',
    description: '15-16世紀イタリアの古典様式',
    icon: 'Palette'
  },
  {
    id: 'baroque',
    name: 'バロック',
    description: '17世紀の劇的で壮麗な様式',
    icon: 'Crown'
  },
  {
    id: 'modern',
    name: 'モダン',
    description: '19-20世紀の現代的表現',
    icon: 'Sparkles'
  },
  {
    id: 'japanese',
    name: '和風',
    description: '日本の伝統美術スタイル',
    icon: 'Leaf'
  },
  {
    id: 'other',
    name: 'その他',
    description: 'その他のユニークなスタイル',
    icon: 'Layers'
  }
];
