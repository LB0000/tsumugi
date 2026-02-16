export const styleNameMap: Record<string, string> = {
  'baroque': 'バロック',
  'renaissance': 'ルネサンス',
  'impressionist': '印象派',
  'stained-glass': 'ステンドグラス',
  'art-nouveau': 'アール・ヌーヴォー',
  'watercolor': '水彩画',
  'ukiyo-e': '浮世絵',
  'sumi-e': '墨絵',
  'anime': 'アニメ',
  'ghibli': 'ジブリ風',
  'pop-art': 'ポップアート',
  'hand-drawn': '手描きスケッチ',
  'pixel-art': 'ピクセルアート',
  'vector': 'ベクターアート',
  'pet-royalty': 'ロイヤル',
  'pet-samurai': 'サムライ',
  'pet-fairy': 'フェアリー',
  'kids-princess': 'プリンセス',
};

// Style prompts for each art style (improved with technique-specific details and negative instructions)
const stylePrompts: Record<string, string> = {
  // 西洋絵画
  'baroque': 'Transform this photo into a dramatic 17th-century Baroque masterpiece in the style of Peter Paul Rubens or Rembrandt. Apply multiple glazing layers of rich oil paint with visible impasto brushwork in highlights. Use a warm, dark brown background with subtle hints of umber and sienna — like the rich tonal backgrounds of Old Master paintings. Create chiaroscuro lighting — warm golden highlights illuminating the face against softer shadows. Render skin with luminous warmth using layered translucent oils. The background may include subtle atmospheric elements like a distant warm-toned landscape or soft amber light, but should remain simple and painterly. AVOID: flat or digital-looking colors; the paint texture must feel thick and physical. AVOID: velvet drapes, thrones, crowns, columns, or royal palace elements — this is about oil painting technique, not royalty.',
  'renaissance': 'Transform this photo into a Florentine High Renaissance painting in the tradition of Leonardo da Vinci\'s sfumato or Raphael\'s classical harmony. Apply the sfumato technique: soft, smoky transitions between tones with no harsh edges, especially around eyes and mouth. Use warm earthy palette — raw sienna, burnt umber, yellow ochre — with a warm amber color temperature reminiscent of Uffizi Gallery masterpieces. Place subtle classical architecture (columns, arches) in the background with atmospheric perspective. AVOID: bright saturated colors; maintain the muted, aged warmth of genuine Renaissance oils.',
  'impressionist': 'Transform this photo into a French Impressionist painting capturing the essence of Claude Monet\'s light or Pierre-Auguste Renoir\'s warmth. Apply broken brushstrokes (touches of pure color placed side by side, not blended — the technique of divisionism). Create an en plein air atmosphere with dappled sunlight filtering through foliage. Use a luminous pastel palette: soft lavender, pale gold, rose pink, sky blue. Suggest texture through palette knife strokes in thicker areas. The light should feel fleeting and alive. AVOID: dark shadows or sharp outlines; everything should dissolve into soft color.',
  'stained-glass': 'Transform this photo into a medieval Gothic stained glass window artwork. Use bold black lead came lines (2-3mm thick appearance) to separate distinct areas of vibrant translucent color. Apply rich jewel tones: deep ruby red, sapphire blue, emerald green, amber gold. Each color section should appear to glow as if backlit by sunlight streaming through colored glass. Add subtle geometric and floral patterns within the glass sections. Include decorative borders reminiscent of cathedral rosette windows. AVOID: photorealistic shading; keep the flat, luminous quality of real stained glass.',
  'art-nouveau': 'Transform this photo into an Art Nouveau poster in the style of Alphonse Mucha\'s lithographic masterpieces. Frame the subject within a circular halo or decorative arch. Surround with elegant organic curves and flowing botanical motifs: lilies, irises, wisteria, and stylized leaves. Use muted gold, warm earth tones, and soft pastels with flat lithographic color areas. Apply sinuous, whiplash-curve outlines characteristic of the movement. The composition should feel like a vintage Parisian poster with decorative ornamental borders. AVOID: photorealistic depth; maintain the flat, decorative poster quality.',

  // 和風・東洋
  'watercolor': 'Transform this photo into a delicate Japanese watercolor painting (suisaiga). Apply wet-on-wet technique with soft bleeding edges where colors gently diffuse into each other. Use transparent washes that reveal the texture of Japanese washi paper beneath. Embrace the beauty of "ma" (negative space) — leave areas of white to create breathing room. Layer colors from light to dark with subtle gradations. Use muted pastels — soft indigo, pale peach, sage green — with occasional vibrant accents. AVOID: harsh edges, opaque fills, or heavy saturation; the feeling should be ethereal and airy.',
  'ukiyo-e': 'Transform this photo into a traditional Japanese Ukiyo-e woodblock print (mokuhanga) in the style of Katsushika Hokusai or Utagawa Hiroshige. Apply bold sumi ink outlines with confident, varied line weight. Use flat areas of color applied in the layered printing technique — each color a distinct, separate impression (like successive woodblock passes). Include subtle baren printing texture (faint wood grain patterns). Use the classic ukiyo-e palette: Prussian blue (imported ai), vermillion red, ochre yellow, and soft gray-green. AVOID: smooth gradients or photorealistic shading; colors should be flat with crisp boundaries.',
  'sumi-e': 'Transform this photo into a traditional East Asian ink wash painting (sumi-e / suibokuga). Use ONLY black sumi ink in three tonal values: rich dark (nō), medium gray (chū), and pale dry-brush (katsu). Apply bold, expressive single-stroke brushwork — some strokes fast and energetic, others slow and deliberate. Leave abundant white space (yohaku) that is as important as the painted areas. Capture the essence (ki) of the subject with elegant minimalist simplicity. Add a small red seal-like accent (rakkan) in one corner for authenticity. STRICTLY AVOID: any color whatsoever. This must be purely monochromatic black ink on white.',

  // ポップ・イラスト
  'anime': 'Transform this photo into a vibrant Japanese anime illustration in modern cel-shading style. Apply clean, bold outlines with consistent line weight. Render with flat base colors and sharp two-tone cel-shading (light and shadow with crisp edges). Create large, expressive eyes with detailed iris highlights (multiple white reflection points). Add glossy hair with flowing strands and bright specular highlights. Use vibrant saturated colors: vivid pinks, electric blues, warm oranges. The background should have a soft bokeh or speed-line effect. AVOID: painterly textures or soft blending; keep the clean, digital anime aesthetic.',
  'ghibli': 'Transform this photo into a hand-painted cel animation portrait in the tradition of late-1980s/1990s Japanese animated feature films. KEY TECHNIQUE — DUAL RENDERING: Paint the BACKGROUND as a richly detailed gouache/watercolor landscape with extraordinary naturalistic detail (individually rendered leaves, textured bark, blades of grass, moss on stones). Render the SUBJECT with cleaner, simpler cel-animation shading — flat color areas with soft shadow edges, thin warm-toned outlines. SKY: Fill the upper background with towering, billowing cumulus clouds against a deep cerulean-to-azure sky. Clouds should be volumetric with warm sunlit edges and cool blue-gray shadows. NATURE & SETTING: Surround the subject with lush, deeply detailed greenery — deep forest greens, bright leaf greens, golden-green sunlit foliage. Include natural details: wildflowers, drifting petals, or gentle grass. LIGHT: Warm golden-hour sunlight. Render dappled light filtering through a tree canopy, soft volumetric rays, and a warm atmospheric glow. Foreground tones warm (amber, gold), distant elements cooler (soft blue haze). COLOR PALETTE: Deep forest greens, warm amber/gold, cerulean sky blue, soft earth browns, muted cream highlights, and touches of sunset orange. CHARACTER RENDERING: Keep the subject\'s proportions NATURAL and realistic — not exaggerated. Soft rounded face, expressive but REALISTICALLY-SIZED eyes (not large anime eyes), gentle natural expression. Preserve the subject\'s recognizable identity and features. MOOD: Cozy, hopeful, and quietly magical — as if a gentle breeze is softly moving hair and clothing. AVOID: Large anime eyes, glossy CGI shading, harsh shadows, photoreal skin texture, rigid vector linework, flat/boring backgrounds, and generic anime aesthetic.',
  'pop-art': 'Transform this photo into bold Pop Art in the style of Andy Warhol\'s screen prints or Roy Lichtenstein\'s comic panels. Apply high contrast with dramatically flattened tones. Use loud, saturated colors: hot pink (#FF1493), electric cyan (#00CED1), vivid yellow (#FFD700), and bright orange (#FF4500). Add visible Ben-Day dot patterns (halftone dots) in mid-tone areas as a key visual element. Apply thick black outlines and flat graphic color areas. The result should look like a screen-printed poster or newspaper comic panel with slight CMYK registration offset. AVOID: muted, pastel, or earthy colors; everything must be loud and vibrant.',
  'hand-drawn': 'Transform this photo into a hand-drawn pencil and charcoal sketch on textured cream paper. Use soft graphite pencils (2B-6B range) with varying pressure — light sketchy construction lines visible beneath darker finished strokes. Apply cross-hatching and stippling for shading, with visible directional pencil strokes following the form. Include subtle artistic imperfections: slightly uneven lines, faint eraser marks, and smudged charcoal areas. Keep the palette monochromatic (graphite grays) or with minimal sepia/sanguine tinting. The paper texture should be visible throughout. AVOID: digital perfection, clean vector lines, or photorealistic smoothness.',

  // モダン・デジタル
  'pixel-art': 'Transform this photo into retro pixel art in the style of classic 16-bit era video games (SNES/Mega Drive). Render at an equivalent resolution of approximately 128x160 pixels, then scale up — every element must be constructed from visible, distinct square pixels. Use a limited palette of no more than 32 colors. Apply ordered dithering patterns to create gradients and mid-tones between pixel colors. Keep crisp pixel edges with no anti-aliasing or sub-pixel smoothing. The result should evoke nostalgic 90s gaming charm while keeping the subject clearly recognizable. AVOID: smooth gradients, anti-aliased edges, or high-resolution detail.',
  'vector': 'Transform this photo into a clean, modern flat vector illustration. Use bold solid color fills with minimal (or no) gradients — limit the palette to 6-8 harmonious colors maximum. Simplify features into clean geometric shapes with smooth Bézier-curve edges. Remove all texture and photographic detail, replacing them with flat, graphic shapes. Apply a contemporary, professional graphic-design aesthetic with clear visual hierarchy. AVOID: complex textures, photorealistic detail, or more than 2-3 tonal values per color area.',
};

// Dynamic prompts for pet-specific styles (adapts based on subject category)
const petStylePrompts: Record<string, (isPet: boolean) => string> = {
  'pet-royalty': (isPet) => isPet
    ? 'Transform this pet photo into a majestic royal portrait painting. Dress the pet in regal attire: a golden royal crown, velvet ermine-trimmed cape, and ornate golden jewelry befitting royalty. Seat them on an ornate throne or pose against a grand palace backdrop with rich crimson velvet drapes and gilded Baroque columns. Use classical oil painting technique with visible impasto brushstrokes, dramatic Rembrandt-style side lighting, and a rich, saturated color palette of deep burgundy, gold, and royal purple. The pet should exude dignity and noble grandeur. AVOID: cartoonish treatment; this should look like a genuine 17th-century royal court painting.'
    : 'Transform this portrait into a majestic royal court painting. Dress the subject in regal Renaissance attire: a golden crown, velvet ermine-trimmed cape, and ornate royal jewelry. Place them before a grand palace backdrop with rich crimson drapes and gilded columns. Use classical oil painting technique with dramatic chiaroscuro lighting and rich saturated colors. The subject should look dignified and noble, like European royalty. AVOID: cartoonish treatment; this should feel like a genuine historical royal portrait.',
  'pet-samurai': (isPet) => isPet
    ? 'Transform this pet photo into a dramatic Japanese samurai warrior portrait. Dress the pet in full samurai armor (yoroi) with an elaborate kabuto helmet featuring a bold maedate crest and layered shoulder guards (sode). Place them before a backdrop of a Japanese castle (tenshu) at sunset, with falling cherry blossom petals and fluttering war banners (nobori). Blend traditional Japanese painting techniques (bold outlines, gold leaf accents) with dramatic cinematic lighting. The pet should look fierce, honorable, and legendary. AVOID: cute or comedic treatment; this is a serious warrior portrait. Do NOT add any face mask, face guard, or menpo — the subject\'s face must be fully visible.'
    : 'Transform this portrait into a dramatic Japanese samurai warrior painting. Dress the subject in full samurai armor (yoroi) with an elaborate kabuto helmet and bold maedate crest. Place them before a Japanese castle at sunset with cherry blossoms and war banners. Blend traditional Japanese painting with dramatic cinematic lighting. The subject should look fierce and honorable. AVOID: cute or comedic treatment; this is a serious warrior portrait. Do NOT add any face mask, face guard, or menpo — the subject\'s face must be fully visible.',
  'kids-princess': () => 'Transform this child\'s portrait into a magical princess illustration. Dress the child in an elegant ball gown with layers of soft tulle and delicate lace in pastel pink, lavender, or sky blue. Add a sparkling tiara or small crown adorned with jewels on their head. Place them in a grand fairy-tale ballroom or enchanted castle garden with marble pillars, rose archways, and twinkling lights. Surround with soft sparkles, floating rose petals, and warm golden candlelight. Use a dreamy, painterly illustration style with soft lighting and warm pastel tones. The child should look enchanted and joyful, like a storybook princess. AVOID: overly mature or sexualized styling; keep the look innocent, age-appropriate, and magical.',
  'pet-fairy': (isPet) => isPet
    ? 'Transform this pet photo into an enchanting fairy tale illustration. Give the pet delicate, translucent iridescent fairy wings that shimmer with rainbow light. Crown them with a dainty flower wreath of tiny roses and baby\'s breath. Surround them with magical sparkles, floating petals, luminous butterflies, and soft bokeh light orbs. Place them in a dreamy enchanted meadow or forest glade bathed in golden hour light with soft pastel colors: lavender, blush pink, mint green, and warm gold. Use a soft, whimsical watercolor illustration style. The pet should look magical and utterly adorable. AVOID: dark or realistic tones; keep everything light, dreamy, and magical.'
    : 'Transform this portrait into an enchanting fairy tale illustration. Give the subject delicate translucent fairy wings shimmering with iridescent light. Crown them with a flower wreath of tiny roses and baby\'s breath. Surround with magical sparkles, floating petals, and luminous butterflies in a dreamy meadow bathed in golden hour light. Use soft pastel colors and whimsical watercolor style. AVOID: dark or realistic tones; keep everything light, dreamy, and magical.',
};

// Style-specific guidance to reinforce transformations that are often under-stylized
const styleFocusPrompts: Record<string, string> = {
  'ghibli': `STYLE LOCK (HAND-PAINTED ANIMATED FEATURE FILM):
- BACKGROUND vs CHARACTER DUALITY: The background MUST be a richly detailed gouache painting with visible brushwork, textured foliage, and atmospheric depth. The character MUST be rendered in cleaner cel-animation style with flat color fills and soft shadow transitions. This contrast is the defining visual signature.
- EYES & PROPORTIONS: Keep eyes natural human/animal size with warm, expressive detail — NOT oversized anime eyes. Body proportions should be realistic, not stylized or chibi.
- LIGHT & ATMOSPHERE: Use warm directional golden-hour sunlight, NOT flat ambient light. Add dappled light patterns, soft volumetric rays, and atmospheric perspective (warm foreground, cool distant elements with soft blue haze).
- SKY TREATMENT: Paint large, detailed cumulus clouds with sunlit warm edges and cool shadows against deep blue sky — this is essential, not optional.
- LINEWORK: Thin, warm-colored outlines (brown or dark amber, not black) with subtle hand-drawn irregularity. Lines should define forms gently, not dominate.
- MOVEMENT: Suggest a gentle breeze — hair, fur, clothing, and grass should show soft, natural movement.
- Do not reference copyrighted characters, logos, or specific film titles.`,
};

// Category-specific prompt additions (enhanced with preservation details)
export const categoryPrompts: Record<string, string> = {
  'pets': 'SUBJECT: The subject is a beloved pet animal. Preserve the animal\'s unique markings, fur color and pattern, breed characteristics, and individual personality. Treat the pet with the same dignity and artistry as a human portrait subject.',
  'family': 'SUBJECT: The subject is a family portrait or couple. Preserve each person\'s facial features, skin tone, hair color and style, and the emotional connection between family members. Render with warmth and timeless elegance.',
  'kids': 'SUBJECT: The subject is a child. Preserve their innocent expression, youthful features, and natural energy. Use gentle, warm treatment appropriate for a child\'s portrait. Do not make the child look older or significantly different.',
};

/** Set of all valid style IDs */
export const validStyleIds = new Set([...Object.keys(stylePrompts), ...Object.keys(petStylePrompts)]);

/** Get the appropriate style prompt based on styleId and category */
export function getStylePrompt(styleId: string, category: string): string {
  if (petStylePrompts[styleId]) {
    const isPet = category === 'pets';
    return petStylePrompts[styleId](isPet);
  }
  return stylePrompts[styleId] || stylePrompts['baroque'];
}

/** Get style-specific focus prompt for reinforcement */
export function getStyleFocusPrompt(styleId: string): string {
  return styleFocusPrompts[styleId] || '';
}
