import type { StyleCategory } from '../types';

export const styleCategories: StyleCategory[] = [
  {
    id: 'all',
    name: 'すべて',
    description: '全てのスタイルを表示',
    icon: 'Grid3X3'
  },
  {
    id: 'western-classic',
    name: '西洋古典',
    description: 'ルネサンス・バロック様式',
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
