# 奶龙退休表情图集

- 工具：内置 ImageGen（未使用 API / CLI fallback）。
- 日期：2026-10-26。
- 产物：`dist/assets/nailong-life-atlas.png`，1619 × 971 PNG，透明背景。
- 布局：5 列 × 3 行；列由可持续月支出决定，行由退休年龄决定。浏览器按格显示；源码包包含完整图片。
- 年龄：青年 < 40 岁，中年 40–59 岁，大爷 ≥ 60 岁；显示的具体年龄仍由当前年龄 + 工作年数计算。
- 图片定位：非官方奶龙同人表情；相关说明见 `ASSETS.md`。

## 完整生成提示词

```text
Use case: stylized-concept.
Asset type: a production SPRITE ATLAS for a funny Chinese meme retirement web toy, not an infographic. One image containing EXACTLY FIFTEEN separate full-body figures arranged in a perfectly aligned 5-column by 3-row regular grid. Wide canvas aspect ratio 5:3, preferably 3000x1800. Every cell same size and every character has generous transparent padding inside its own cell. No character/prop crosses into another cell. The canvas background is genuinely transparent. No text, letters, numbers, captions, labels, dividers, UI or watermark.
Primary request: 奶龙 Nailong, the recognizable very fat bright yellow Chinese cartoon baby dinosaur/alien dragon with pear-shaped huge round pale-yellow belly, tiny short limbs, chunky brown little claws, broad rounded snout, huge emerald-green eyes, smooth yellow head (not a human, not wearing a humanoid wig, no long neck, no wings, no spiky dinosaur head). Strong expressive humorous Chinese internet reaction-meme energy. Glossy high-quality soft 3D cartoon rendering with gentle studio lighting. His expression is smug, ridiculous, lazy and adorable. Preserve the same recognizable face/body and relative character scale across all fifteen cells.
COLUMNS show five living-budget outfits and poses:
Column 1: cheap cozy living, worn oversized light blue tank top riding over huge belly, flip flops, holding one instant-noodle cup with chopsticks, bemused blissful open-mouthed grin.
Column 2: everyday comfortable living, coral T-shirt stretched over huge belly, white trainers, holding a giant bubble tea and giving a cheeky thumbs-up.
Column 3: pleasant freedom, short-sleeved green tropical shirt open over pale belly, bucket hat, leaning back lazily on a tiny folding camping chair with feet up, cartoonishly smug grin.
Column 4: fancy relaxed retirement, open silky purple patterned pajama shirt revealing huge belly, exaggerated chunky gold chain, black sunglasses tilted low to expose green eyes, one hand holding a tiny espresso, one arm on hip, gleeful boss swagger.
Column 5: cartoon dragon king of vacation, ridiculous plush red bathrobe and slippers, small gold crown, reclining against an inflatable swim ring with a fancy drink, broad very self-satisfied silly smile.
ROWS show ages independently from clothes:
Top row: young adult version, smooth face, excited bright emerald eyes, energetic goofy expressions, no gray facial hair.
Middle row: middle-aged version, very mild under-eye bags and little forehead creases, slightly tired but knowing smug grin, tiny short dark mustache for all five middle-aged figures.
Bottom row: elderly grandpa version, unmistakably comic old dragon with enormous fluffy white eyebrows and short white moustache/beard, round reading glasses where compatible, deep smiling laugh-lines, still plump, happy and relaxed, energetic rather than frail. Keep skin vivid yellow.
The result must be a clean consistent game sprite atlas, EXACTLY 5 equally spaced columns and 3 equally spaced rows, one figure per cell, front or 3/4 view, entire feet/props in frame, each cell center aligned and baseline aligned. No separate scene backgrounds or scenery; only transparent cutouts and very small soft grounding shadows. All fifteen poses distinctly readable when a single cell is shown at 300px wide. This is a humorous unofficial fan-art parody, no official logos.
```
