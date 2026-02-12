import type { StyleCategory } from '../types';

export const styleCategories: StyleCategory[] = [
  {
    id: 'all',
    name: 'すべて',
    description: '全てのスタイルを表示',
    icon: 'Grid3X3'
  },
  {
    id: 'narikiri',
    name: 'なりきり',
    description: 'コスチューム変身スタイル',
    icon: 'Wand2'
  },
  {
    id: 'western',
    name: '西洋絵画',
    description: 'ルネサンス〜印象派の名画スタイル',
    icon: 'Crown'
  },
  {
    id: 'japanese',
    name: '和風・東洋',
    description: '日本の伝統美術スタイル',
    icon: 'Leaf'
  },
  {
    id: 'pop',
    name: 'ポップ・イラスト',
    description: 'アニメ・現代イラスト系',
    icon: 'Sparkles'
  },
  {
    id: 'digital',
    name: 'モダン・デジタル',
    description: 'ピクセルアートや3Dなどデジタルアート系',
    icon: 'Monitor'
  }
];
