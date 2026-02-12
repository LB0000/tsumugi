import type { ArtStyle } from '../../types';

const categoryNames: Record<string, string> = {
  western: '西洋絵画',
  japanese: '日本画',
  pop: 'ポップアート',
  narikiri: 'なりきり',
  digital: 'デジタル'
};

const styleCategoryFacts: Record<string, string[]> = {
  western: [
    'バロック絵画は光と影のドラマで感情を表現しました',
    'ルネサンスの肖像画は数ヶ月かけて描かれました',
    '印象派は屋外の光を直接キャンバスに描きました',
    'ミュシャは花と曲線で女性の美を表現しました'
  ],
  japanese: [
    '浮世絵は最大20色の重ね刷りで表現されました',
    '水墨画は「余白の美」を大切にする日本の美意識です',
    '水彩画は繊細な筆遣いと淡い色彩が特徴です',
    '武将の肖像画は威厳と力を象徴しました'
  ],
  pop: [
    'アニメのセル画は透明シートに手描きされました',
    'ポップアートは大量生産時代の文化を反映しました',
    'ジブリは一枚一枚手描きで温かみを表現します',
    'スケッチは鉛筆や木炭の濃淡で立体感を出します'
  ],
  narikiri: [
    '王族の肖像画は権威と格式を示すために描かれました',
    '武将の鎧は戦での功績を象徴する意匠でした',
    'おとぎ話の妖精は人々の夢と希望の象徴です'
  ],
  digital: [
    'ドット絵は限られた色数で表現する芸術です',
    'フラットデザインはシンプルさと視認性を重視します',
    'ベクターイラストは拡大しても美しさを保ちます',
    'ピクセルアートは8bitゲーム時代の美学です'
  ]
};

const technicalInsights = [
  { label: '顔の特徴を高精度で解析', color: 'bg-primary' },
  { label: 'スタイル固有の筆致パターンを適用', color: 'bg-secondary' },
  { label: '色彩バランスを自動最適化', color: 'bg-accent-sage' }
];

interface StyleInfoPanelProps {
  panelIndex: number;
  style: ArtStyle;
  factIndex: number;
}

export function StyleInfoPanel({ panelIndex, style, factIndex }: StyleInfoPanelProps) {
  const type = panelIndex % 4;

  // colorPalette が空の場合はパレットパネルをスキップ
  const effectiveType = (type === 1 && style.colorPalette.length === 0) ? 2 : type;

  return (
    <div className="glass-card p-5 rounded-2xl min-h-[100px] animate-fadeIn">
      {effectiveType === 0 && (
        <>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2 font-medium">
            Selected Style
          </p>
          <div className="flex items-center gap-4">
            {style.thumbnailUrl && (
              <img
                src={style.thumbnailUrl}
                alt={style.name}
                className="w-14 h-14 rounded-xl object-cover border border-border/50 shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-serif font-semibold text-foreground text-base">{style.name}</h4>
              <p className="text-xs text-muted leading-relaxed mt-0.5 line-clamp-2">{style.description}</p>
            </div>
          </div>
        </>
      )}

      {effectiveType === 1 && (
        <>
          <p className="text-xs text-secondary uppercase tracking-wider mb-3 font-medium">
            Color Palette
          </p>
          <div className="flex gap-3">
            {style.colorPalette.map((color, i) => (
              <div key={i} className="flex-1 animate-morphIn" style={{ animationDelay: `${i * 80}ms` }}>
                <div
                  className="aspect-square rounded-xl shadow-sm border border-white/50"
                  style={{ backgroundColor: color }}
                />
                <p className="text-[10px] text-muted mt-1.5 text-center font-mono">{color}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {effectiveType === 2 && (
        <>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2 font-medium">
            {categoryNames[style.category] || style.category}
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {(styleCategoryFacts[style.category] || styleCategoryFacts.western)[
              factIndex % (styleCategoryFacts[style.category]?.length || 1)
            ]}
          </p>
        </>
      )}

      {effectiveType === 3 && (
        <>
          <p className="text-xs text-secondary uppercase tracking-wider mb-3 font-medium">
            AI Processing
          </p>
          <div className="space-y-2.5">
            {technicalInsights.map((insight, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${insight.color} animate-pulse`} />
                <p className="text-xs text-muted">{insight.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
