import type { NavItem } from '../types';

export const navigation: NavItem[] = [
  { id: 'home', label: 'ホーム', path: '/' },
  {
    id: 'create',
    label: '作成',
    path: '/create',
    children: [
      { id: 'pet-portraits', label: 'ペット肖像画', path: '/?tab=pets' },
      { id: 'family-portraits', label: 'ファミリー肖像画', path: '/?tab=family' },
      { id: 'children-portraits', label: 'キッズ肖像画', path: '/?tab=kids' },
      { id: 'couple-portraits', label: 'カップル肖像画', path: '/?tab=family' },
      { id: 'self-portraits', label: 'セルフポートレート', path: '/?tab=family' }
    ]
  },
  { id: 'pricing', label: '料金プラン', path: '/pricing' },
  { id: 'sign-in', label: 'ログイン', path: '/login' },
  { id: 'about', label: '会社概要', path: '/legal' },
  { id: 'support', label: 'お問い合わせ', path: '/contact' },
  { id: 'faq', label: 'よくある質問', path: '/faq' }
];
