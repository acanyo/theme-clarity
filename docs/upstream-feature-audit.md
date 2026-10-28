# 原版 Clarity 与 Halo 版功能对照

核对日期：2026-10-28。

- 原版：`L33Z22L11/blog-v3`，当前 `main` 的 `381f1c1648a53d6f7aa8e351d521311af6da998d`，版本 3.8.0，提交日期 2026-09-27。
- Halo 版：本项目 `main`，基准提交 `0380e8f4a88793880e419d85e82c0ee6fe29134a`，加上当前尚未提交的迁移改动。
- 项目内的 `blog-v3/` 是 `acanyo/blog-v3` 的旧 fork，版本 3.5.0，提交 `60ee61414af6f4d249dea761dd1b60fdcfb03b1e`，日期 2025-11-25。它不代表原作者当前状态。
- 本文以两边源码、配置和模板为证据。Docker Halo 只补查了当前文章 HTML；未将全部原版交互或未安装插件的能力当作已完成的浏览器验收。

下列是当前功能差异，不全部属于 3.8.0 新增。3.8.0 的明确变更主要是 CSS 工具链、布局与过渡；应按最终行为移植，不能通过版本号比较完成度，也不需要为了跟随版本而重写 Halo 版的整个样式系统。[上游迁移说明](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/MIGRATION.md)

## 判断

原版的主要特色是围绕阅读形成一致的细节：文章类型决定排版，列表排序决定日期展示，搜索结果定位到小节，文章内容能附带专属侧栏与参考资料。Halo 版的优势是后台配置与插件场景更广，包括瞬间、图库、友圈、装备、追番、Steam 和商城等适配。这些模板的存在不等于所有对应插件都在本轮完成运行验收。

继续迁移最有价值的是补齐阅读和浏览链路，再扩展专用内容组件。

## 已有的能力

以下能力在 Halo 版已有，不应重复算成缺失：

- 三栏与响应式布局、浅色/深色/跟随系统、目录和阅读高亮、摘要、文字分享、图片灯箱、分类图标与颜色。
- 提示框、标签页、复制、折叠、提示、模糊、时间线、引用、聊天、键帽、卡片列表、带说明图片、Emoji 时钟等内容组件。Halo 版另有进度条、分栏、步骤、便签。
- 轮播、文章共享过渡、历史滚动恢复、抽屉互斥与面板避让已在本轮实现；验收范围见 [迁移记录](upstream-migration.md)。
- 普通代码块复制/行号/换行/折叠、表格滚动/换行、Mermaid 按需加载与主题重绘已迁移。高级代码标记仍有差距，见下文。
- 搜索已有 Halo 插件入口和快捷键；RSS 已有订阅入口；友链已有气泡、分组和随机访问。它们与原版的细节仍有差异。

## 主要缺口

### 1. 单篇文章的技术 / 故事版式：已有样式，后台和渲染未接通

原版通过文章 `type` 同时控制页头标题和正文：技术文章偏左对齐、无正文缩进；故事文章采用衬线标题与首行缩进。

Halo 版已保留 `.md-tech`、`.md-story` 和 `.text-story` 的样式片段，但 `templates/post.html:16` 固定输出 `class="article"`，文章元数据配置没有类型选项；页头居中是全局设置，不能替代单篇类型。

迁移价值：高。为不同文章选择合适版式，是原版辨识度很强的一部分。

- 原版：[正文类型](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/pages/%5B...slug%5D.vue#L42-L49)、[页头](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/PostHeader.vue#L61-L64)。
- 本地：`src/styles/scss/components/post/_article-headings.scss:36`、`:68`，`annotation-setting.yaml:53`，`templates/modules/post/post-header.html:5`。
- 适配方向：文章元数据选择类型，旧文章保持现有默认；标题与正文一起应用。验收正文、封面标题、目录及特殊组件嵌套，不能只给标题居中。

### 2. 列表筛选、排序、URL 与分页联动：缺少完整浏览流程

原版首页可以按首级分类筛选，按创建/更新日期排序；升序入口由配置决定。首页将分类、排序、方向和页码绑定到 URL，切换分类回到第一页。更新日期排序时，卡片会优先展示更新日期。原版分类筛选并非任意标签与多分类联合过滤。

Halo 版有分类/标签独立页面和分页，但没有这套首页联动工具栏；文章列表当前只显示发布日期。

迁移价值：高，文章较多时尤其明显。

- 原版：[首页状态](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/pages/index.vue#L10-L13)、[排序与筛选控件](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/OrderToggle.vue)、[卡片日期](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/Article.vue#L24-L40)。
- 本地：`templates/modules/post-list.html:39`、`src/alpine/pagination.ts`；当前工作区还删除了旧 `templates/modules/order-toggle.html`。
- 适配方向：先验证 Halo 当前版本的查询与分页契约。排序必须覆盖整个查询结果，不能只重排已加载的一页；URL 刷新、返回、第二页与 Swup 导航均须保持状态。

### 3. 归档密度与信息展示：基础归档已有，原版增强缺失

原版归档支持分类/日期排序、年内篇数和字数汇总，还有较隐蔽的密度面板：调节行间距、1–8 列；多列时减少辅助信息。

Halo 版已有按年/月归档、年龄或建站年数、分页及封面；缺少密度调节和年内字数/篇数汇总，年份旁当前显示月份数量。原版归档的排序与分类状态没有像首页一样绑定 URL，不能把首页的全部状态能力套到归档上。

迁移价值：中高。建议保留清晰的默认单列，只把多列作为可选阅读偏好。

- 原版：[归档](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/pages/archive.vue#L44-L120)。
- 本地：`templates/archives.html:20`、`:30`，`templates/modules/archive-layout/new.html`。
- 数据注意：Halo 当前归档会分页，不能把当前页相加的结果标成全年统计。

### 4. 字数与更新时间：原版贯穿卡片、正文、归档和统计

原版文章卡片与页头显示字数；归档汇总每年字数，统计侧栏显示总字数和年度明细。页头会在创建与修改日期相差明显时展示修改日期。

Halo 版当前强调阅读数、评论数、作者和发布日期；没有对应字数显示链路。统计侧栏的“上次更新”取最新文章的发布日期，与原版构建时间语义也不同，且不代表旧文章最近修改的时间。

原版虽然有 `readingTime` 数据，本次检查的卡片和页头实际显示的是字数，不能据此宣称它们已展示“预计阅读 X 分钟”。

迁移价值：中高。先补单篇字数和修改时间，再做跨年度统计。全站字数需要确认 Halo 数据来源及缓存方式，避免前端下载全部正文后累加。

- 原版：[文章页头](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/PostHeader.vue#L32-L57)、[统计展示](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/widget/BlogStats.vue)、[聚合实现](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/server/api/stats.get.ts)。
- 本地：`templates/modules/post/post-header.html:26`、`templates/modules/post-list.html:36`、`templates/modules/aside-widgets/stats-widget.html:14`。

### 5. 单篇专属侧栏、参考链接与封面控制：元数据能力未对齐

原版文章可以通过 `aside` 配置专属组件顺序，并把 Markdown 中的 `meta-aside-*` 内容放进侧栏，例如该文章的项目仓库、说明卡。文章还支持结构化参考链接、内容形式的自定义许可区、隐藏头部信息以及封面滤镜/压暗。

Halo 版的侧栏主要来自全局配置，文章页显示目录和选定的热门/最新文章；单篇只能开关目录。已有转载来源、自定义协议文字/URL、AI 声明、标题颜色，但没有上述单篇内容区域和参考链接列表。

迁移价值：高。技术文档、项目介绍、系列文章尤其适用。应把文章配置与全站组件配置分开，避免每篇文章复制一大段全局设置。

- 原版：[文章侧栏](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/pages/%5B...slug%5D.vue#L10-L16)、[自定义侧栏渲染](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/composables/useWidgets.ts)、[参考资料与许可区](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/PostFooter.vue#L28-L46)、[封面与信息控制](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/PostHeader.vue#L10-L32)。
- 本地：`templates/modules/aside.html:18`、`annotation-setting.yaml:53`、`templates/modules/post/post-footer.html`。

### 6. 搜索细节：已有插件入口，不能直接判定为全部缺失

原版搜索明确提供：

- 选中文字后打开搜索，优先把所选文本作为关键词。
- 按内容小节建立搜索结果，显示标题路径、正文摘要和关键词高亮，并跳转到小节锚点。
- 中文分词、前缀匹配、一定程度的模糊匹配与标题权重。
- 上下键/Enter/Esc 操作，结果变化时尽量保留原选中项。

Halo 版主题只调用 `SearchWidget.open()`，已接入快捷键与主题色变量。搜索插件可能自行实现其中部分功能；本轮不能把插件未知能力全部算成主题缺失，也不能认定搜索效果已与原版一致。

迁移价值：高，但先做插件契约与实际搜索验收。选中文本传入、结果样式适配可在接口支持时补充；章节索引与排序能力应由搜索插件或其后端负责，不宜在主题内另建一套全站正文索引。

- 原版：[选中词](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/stores/search.ts#L8-L27)、[搜索实现](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/popover/Search.vue)、[结果小节路径与高亮](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/popover/SearchItem.vue)。
- 本地：`templates/modules/sidebar-widgets/search-button.html:6`、`src/modules/search-shortcut.ts:10`。

### 7. 专用内容组件：有明显可补项目

| 原版组件 | 当前 Halo 版对应情况 | 价值 |
| --- | --- | --- |
| LinkCard 链接卡片 | 没有对应的文章自定义组件挂载；友链页面卡片不是正文链接卡 | 高，文章交叉引用常用 |
| LinkBanner 带横幅链接卡 | 没有对应正文组件 | 高，项目和系列内容入口 |
| Badge 行内徽标 | 没有对应正文组件；原版可按链接推导 GitHub 头像/站点图标 | 中，工具和项目说明 |
| Poetry 诗文排版 | 没有对应正文组件 | 中，诗词与生活文章 |
| MusicScore ABC 乐谱 | 无 `abcjs` 渲染与播放适配 | 低至中，音乐文章；播放还依赖浏览器音频和音色资源可用 |
| VideoEmbed 视频 | 编辑器可插入普通视频不等于有主题统一的平台组件；没有原版这套 B 站/YouTube/抖音/TikTok/原生视频适配 | 中，多平台媒体文章 |

原版还会为普通外链显示域名提示和按域名匹配的图标。可以作为正文链接体验增强单独适配。

Halo 版已有的提示框、标签页、复制等组件不应重做。原版 MDC 是 Nuxt 的内容编译机制，Halo 版目前使用 `c-*` HTML 标签和 Preact 挂载，不能直接把原版文章语法复制过来。更实用的交付是组件实现加 Halo 编辑器可用的示例说明。

- 原版：[内容组件目录](https://github.com/L33Z22L11/blog-v3/tree/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/content)、[自动外链图标](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/content/ProseA.vue)。
- 本地：`src/preact/index.tsx:43`、`src/preact/components/ContentComponents.tsx`。目前组件集中在单个文件；后续新增应按组件职责拆分，避免继续扩成大文件。

### 8. 代码块高级表达：基础交互已迁移，技术写作增强未统一

原版 Shiki 处理支持增删行、整行/词高亮、聚焦行、错误/警告标注、缩进线、括号配色，并显示代码行数、字符数和字节数。可以用来突出教程中的具体修改。

Halo 版普通代码块保留编辑器已有高亮，主题补工具栏与行号；主题本身没有解析这套 Shiki 注释语法，也没有完整统计与可配置的折叠阈值。已有 `shiki-code` 由对应插件负责，可能具有部分同类能力，须单独验证。

迁移价值：技术博客为中高。应先决定由代码插件还是主题承担渲染，保留编辑器和插件原有 DOM，避免双重高亮与重复工具栏。

- 原版：[Shiki 转换器](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/composables/useShiki.ts#L55-L68)、[代码块](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/content/ProsePre.vue)。
- 本地：`src/modules/reading/code-blocks.ts:10`、`:82`。

### 9. 友链订阅信息与列表操作：已有较完整友链，但用途不同

原版具有分组内随机重排、取消重排恢复原序、无订阅源提示、建站日期/技术栈/备注信息和 `subscriptions.opml` 导出。OPML 用于把友链订阅导入 RSS 阅读器。

Halo 版已有友链分组、介绍气泡、随机穿梭、申请/修改表单、可访问性状态和 RSS 友圈；随机访问一家站点与随机重排整个分组不同。目前没有主题侧的 OPML 导出和同等订阅提示展示。

迁移价值：中。友圈聚合已是我们现有能力，不要因为原版有订阅字段而重复实现友圈。新增日期、技术栈等字段时应优先使用链接插件的实际元数据。

- 原版：[分组随机排序](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/content/FeedGroup.vue#L18-L41)、[卡片信息](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/content/FeedCard.vue)、[OPML](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/server/routes/subscriptions.opml.get.ts)。
- 本地：`templates/modules/links/link-list.html`、`templates/modules/links/script.html`、`templates/page_friends.html`。

## 单独发现的迁移退化项：文章上 / 下篇（发布前已修复）

原版仍在正文页使用 `PostSurround`，显示相邻文章、日期与边界提示。我们的基准提交也有 `templates/modules/post/cursor-post.html`，但当前工作区删除了该模板和 `templates/post.html` 中的调用。

这属于现有导航能力的移除，不应算作“以前一直没有”。Docker Halo 的 `/archives/clarity-reading-review` 当前返回完整文章 HTML，正文类名为 `article`，没有 `surround-post` 区域，与源码现状一致。不能据此推断其他未核对的线上部署也同样缺失。

以上是审计时的状态。准备 1.6.16 发布时已恢复相邻文章模板、调用及排序配置，并增加共享过渡标记；保留分类上下文与键盘导航。发布验证记录见版本说明。

- 原版：[相邻文章](https://github.com/L33Z22L11/blog-v3/blob/381f1c1648a53d6f7aa8e351d521311af6da998d/app/components/post/PostSurround.vue)。
- 本地证据：`git diff -- templates/modules/post/cursor-post.html templates/post.html`，`src/alpine/pagination.ts:123` 仍会查找 `.surround-post`。

## 较低优先级与不必照搬的部分

- 原版 `/preview` 是公开可访问的预览内容列表，不是权限隔离机制。Halo 已有后台草稿/预览流程，不能照搬成公开展示未发布文章。
- 原版更新日志小组件包含作者自己的建站经历；Halo 可用自定义组件承载自己的真实数据，不值得直接移植个人内容。
- Konami 按键切换 RTL 的彩蛋、作者定制的镜像域名处理，对核心阅读价值有限。
- Nuxt/Content/Pinia/MDC、文件路由、构建脚本、静态 Atom 生成属于原版技术栈。Halo 应继续使用自身内容、订阅与插件机制。
- CSS 改写为原生嵌套是上游工程选择，不等于用户可感知的新功能，也不能未经测量宣称性能提升某个百分比。

## 建议迁移顺序与验收

1. 复查并恢复文章上/下篇，验证首篇、末篇、分类进入、键盘及 Swup 返回。
2. 接通单篇技术/故事排版；补文章更新时间、单篇字数与参考链接。字数数据来源先核实，不在浏览器遍历全部正文。
3. 完成全结果范围的列表筛选/排序及 URL/分页状态，之后做归档密度。验证刷新、返回、深链接和第二页。
4. 补专属侧栏与正文链接卡/横幅卡，再完善组件示例。验收手机、暗色、目录和特殊内容嵌套。
5. 安装并核对实际搜索与代码插件，再决定补选中词搜索、小节定位和高级代码标记的哪一层。
6. 按真实内容需要增加 Badge、诗文、视频、乐谱与 OPML。

本轮新增此对照文档，没有改动主题运行代码；已有迁移、构建与运行验证记录继续以 `upstream-migration.md` 为准。原版功能存在依据来自源码，不代表对原版线上所有功能完成了逐项交互测试。
