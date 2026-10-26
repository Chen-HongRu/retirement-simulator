# 退休以后 · 奶龙退休变身器

班可以不上，账还是要算。拖动奶龙或滑杆，看看退休后的自己是泡面自由、公园常驻，还是龙王退休。

这是一个无第三方运行库依赖的中文静态网页，代码采用 MIT 许可证。奶龙同人图片由 ImageGen 生成，素材说明见 [ASSETS.md](ASSETS.md)。计算和表情卡导出均在浏览器本地完成；分享链接把方案参数放在 URL 的 hash 中，拿到链接的人可以看到这些参数。

[在线体验](https://retirement-playground-20261026.abloomegret517.chatgpt.site) · [GitHub 源码](https://github.com/Chen-HongRu/retirement-simulator) · [下载源码包](https://retirement-playground-20261026.abloomegret517.chatgpt.site/source-code.zip)

![退休以后桌面预览](docs/preview.png)

## 本地运行

需要 Node.js 20 或更新版本，无需安装依赖。

```sh
npm run dev
```

打开 [http://localhost:4173](http://localhost:4173)。

```sh
npm test
npm run build
```

测试使用 Node.js 内置测试工具。构建会生成 `dist/source-code.zip`，网页中的源码下载入口提供这个开源项目压缩包。

## 可以探索什么

- 直接左右拖动奶龙，或拖动工作年限滑杆，即时查看退休年龄、月预算与龙生状态。奶龙也支持方向键、Home、End，Shift + 方向键一次调 5 年。
- 展开更多设置，调整当前年龄、初始资产、工作期实际年化收益和退休期实际年化收益。
- 退休年龄等于当前年龄加工作年限；奶龙在 < 40 岁、40–59 岁、≥ 60 岁时分别显示青年、中年、大爷形态。
- 每月预算对应五套穿搭：泡面自由、奶茶自由、公园常驻、躺平大户、龙王退休。五列预算与三行年龄组成 15 个 ImageGen 图像状态；年龄与预算独立映射。
- 抽一个「龙生盲盒」，随机生成一组有明确数值的假设；保存当前龙生为 PNG 表情卡。
- 固定一份方案，与继续调整后的方案比较；通过链接分享当前参数。

## 计算口径

所有金额以人民币、今天的购买力表示；收入与收益率均为实际值，即已考虑通胀影响。这里没有额外叠加通胀率。恒定购买力金额的概念可参考 [美国劳工统计局关于购买力与不变价金额的说明](https://www.bls.gov/cpi/factsheets/purchasing-power-constant-dollars.htm)；该资料支持金额口径，不为本项目的收益假设背书。

设：

| 符号 | 含义 |
| --- | --- |
| `S` | 恒定实际税后月收入 |
| `X` | 工作期与退休期保持相同的实际每月预算 |
| `T` | 工作年数 |
| `A₀` | 初始可投资资产 |
| `w` | 工作期实际有效年化收益率，小数表示 |
| `r` | 退休期恒定实际年化收益率，小数表示 |
| `n = 12T` | 工作月数 |

工作期每月末投入 `S − X`，月收益率与积累因子为：

```text
q = expm1(log1p(w) / 12)
G = exp(n × log1p(q))
F = (G − 1) / q          当 q ≠ 0
F = n                    当 q = 0
A = A₀G + (S − X)F
```

退休期采用每年末提取全年预算、恒定收益、保持实际本金的简化约定：`rA = 12X`。联立得到：

```text
X = r(A₀G + SF) / (rF + 12)
```

实现使用 `log1p`、`expm1` 减少小收益率下的数值误差。`X` 是月预算等价额，退休期没有逐月模拟真实现金流。退休收益率为零时，本模型把可持续预算设为 `X = 0`，表示在无限期维持本金的约束下，没有收益可以支出。

默认税后月收入 20,000 元、工作 40 年、初始资产为零、工作期收益率为零、退休期实际年化收益率 2.5%，得到月预算 **10,000 元**、退休资产 **480 万元**。默认当前年龄为 22 岁，对应 62 岁退休。

这个确定性模型没有纳入养老金、大额支出、变化的收入、市场波动或收益顺序风险。结果是给定假设下的预算关系，不是市场中安全提取率或退休成功率的承诺。

## 文件结构

| 路径 | 职责 |
| --- | --- |
| `dist/index.html` | 页面结构与交互入口 |
| `dist/styles.css` | 布局、颜色与响应式样式 |
| `dist/app.js` | 滑块联动、图表、方案比较与链接分享 |
| `dist/model.js` | 默认参数、输入边界与退休预算计算 |
| `dist/avatar.js` | 预算与年龄到奶龙图格的独立映射 |
| `dist/assets/nailong-life-atlas.png` | ImageGen 生成的 5 × 3 奶龙同人图集 |
| `docs/image-generation.md` | 生成工具、完整提示词与图集布局 |
| `scripts/serve.mjs` | 本地静态服务器 |
| `scripts/build.mjs` | 静态产物准备与源码压缩包生成 |
| `tests/` | 计算、边界与相关行为测试 |

## 静态部署

先执行 `npm run build`，再把 `dist/` 作为站点根目录发布即可。GitHub Pages 可以上传或通过自己的工作流发布该目录；Netlify 的构建命令设为 `npm run build`、发布目录设为 `dist`。网页不需要服务端、数据库或额外运行库。

## 后续扩展方向

可考虑加入养老金、分阶段收入与支出、有限退休年限、波动收益情景。它们尚未实现；扩展时应先明确现金流时点与金额口径，再添加计算和测试。

## 许可证

代码：[MIT](LICENSE) · Copyright 2026 Retirement Simulator contributors。角色与图片说明：[ASSETS.md](ASSETS.md)。

页面的中心装置与拖动角色玩法参考 [cholf5/liang-slider](https://github.com/cholf5/liang-slider)；阶段刻度、背景大字与最高档光环参考 [Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator)。未复制参考项目的图片或代码。
