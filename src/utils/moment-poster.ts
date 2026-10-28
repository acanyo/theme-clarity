/**
 * 瞬间海报生成（Canvas 2D）
 *
 * 版式：
 *   封面（750×420，cover 裁剪；加载失败回退默认封面；仍失败则主题色横幅
 *   + 站点名）→ 标题（40px，至多 3 行）→ 头像 + 作者 · 发布于日期
 *   → 摘要（26px，至多 4 行）→ 分隔线 → 二维码 + 站点名 + 扫码提示。
 *
 * 颜色取自主题 CSS 变量，随深浅色模式切换；封面与头像以
 * crossOrigin="anonymous" 加载，失败时降级，避免污染画布导致导出失败。
 */

import QRCode from "qrcode";

/** 海报绘制所需数据，由瞬间详情页按钮的 data-* 属性提供 */
export interface MomentPosterData {
  title: string;
  /** 下载文件名（不含扩展名），为空时回退 title */
  filename?: string;
  /** 正文纯文本（模板侧传入 HTML，由入口脚本转为纯文本） */
  excerpt: string;
  cover: string;
  defaultCover: string;
  permalink: string;
  site: string;
  author: string;
  avatar: string;
  date: string;
  dateLabel: string;
}

export interface MomentPosterResult {
  url: string;
  filename: string;
}

interface ThemeColors {
  bg: string;
  ink: string;
  ink2: string;
  rule: string;
  accent: string;
  fontFamily: string;
}

interface PosterFonts {
  title: string;
  meta: string;
  excerpt: string;
  site: string;
  hint: string;
}

const WIDTH = 750;
const PADDING = 48;
const CONTENT_WIDTH = WIDTH - PADDING * 2;
const COVER_HEIGHT = 420;
const BAND_HEIGHT = 200;
const QR_BLOCK = 204;
const QR_SIZE = 180;

const TITLE_LINE_HEIGHT = 54;
const TITLE_MAX_LINES = 3;
const META_LINE_HEIGHT = 34;
const META_MAX_LINES = 2;
const AVATAR_SIZE = 56;
const EXCERPT_LINE_HEIGHT = 42;
const EXCERPT_MAX_LINES = 4;
const SITE_LINE_HEIGHT = 38;

/** 读取主题配色与字体族，变量缺失时回退中性色 */
function readTheme(): ThemeColors {
  const root = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => root.getPropertyValue(name).trim() || fallback;
  return {
    bg: pick("--c-bg-1", "#ffffff"),
    ink: pick("--c-text-1", "#18181b"),
    ink2: pick("--c-text-2", "#52525b"),
    rule: pick("--c-border", "#e4e4e7"),
    accent: pick("--c-primary", "#c2410c"),
    fontFamily: getComputedStyle(document.body).fontFamily || "sans-serif",
  };
}

function createFonts(theme: ThemeColors): PosterFonts {
  return {
    title: `700 40px ${theme.fontFamily}`,
    meta: `400 24px ${theme.fontFamily}`,
    excerpt: `400 26px ${theme.fontFamily}`,
    site: `700 28px ${theme.fontFamily}`,
    hint: `400 22px ${theme.fontFamily}`,
  };
}

/** 图片加载失败（含跨域无 CORS 头）时 resolve(null)，由调用方回退版式 */
function loadImage(src: string, cors = true): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = new URL(src, window.location.href).href;
  });
}

/**
 * 文本换行：CJK 字符与全角标点按单字断行，拉丁文本按单词断行，
 * 超宽单词再逐字硬断；超出 maxLines 时末行以 … 截断。
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const tokens = text.match(/[\p{Script=Han}\uFF00-\uFFEF]+|[^\s\p{Script=Han}\uFF00-\uFFEF]+|\s+/gu) ?? [];
  const lines: string[] = [];
  let line = "";
  let truncated = false;

  for (const token of tokens) {
    if (ctx.measureText(line + token).width <= maxWidth) {
      line += token;
      continue;
    }
    if (line) {
      lines.push(line.trimEnd());
      line = token.trimStart();
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
      continue;
    }
    // 单个 token 超宽：逐字硬断
    for (const ch of token) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        lines.push(line);
        line = "";
        if (lines.length >= maxLines) {
          truncated = true;
          break;
        }
      }
      line += ch;
    }
    if (truncated) break;
  }
  if (!truncated && line.trim()) lines.push(line.trimEnd());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    truncated = true;
  }
  if (truncated && lines.length) {
    const last = lines.length - 1;
    let clipped = lines[last];
    while (clipped && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    lines[last] = `${clipped}…`;
  }
  return lines;
}

interface PosterLayout {
  titleLines: string[];
  excerptLines: string[];
  metaLines: string[];
  siteLines: string[];
  metaBlockHeight: number;
  height: number;
}

/** 第一遍测量：量出各区块文本行与画布总高 */
function measurePoster(
  ctx: CanvasRenderingContext2D,
  data: MomentPosterData,
  fonts: PosterFonts,
  hasCover: boolean,
  hasAvatar: boolean,
): PosterLayout {
  ctx.font = fonts.title;
  const titleLines = wrapText(ctx, data.title, CONTENT_WIDTH, TITLE_MAX_LINES);

  ctx.font = fonts.excerpt;
  const excerptLines = data.excerpt ? wrapText(ctx, data.excerpt, CONTENT_WIDTH, EXCERPT_MAX_LINES) : [];

  const meta = [data.author, data.date && `${data.dateLabel ? `${data.dateLabel} ` : ""}${data.date}`]
    .filter(Boolean)
    .join(" · ");
  ctx.font = fonts.meta;
  const metaLines = meta ? wrapText(ctx, meta, CONTENT_WIDTH - (hasAvatar ? AVATAR_SIZE + 16 : 0), META_MAX_LINES) : [];

  ctx.font = fonts.site;
  const siteLines = data.site ? wrapText(ctx, data.site, CONTENT_WIDTH - QR_BLOCK - 24, 2) : [];

  let height = hasCover ? COVER_HEIGHT : BAND_HEIGHT;
  height += 40 + titleLines.length * TITLE_LINE_HEIGHT + 16;
  const metaBlockHeight = Math.max(hasAvatar ? AVATAR_SIZE : 0, metaLines.length * META_LINE_HEIGHT);
  if (metaLines.length || hasAvatar) height += metaBlockHeight;
  if (excerptLines.length) height += 12 + excerptLines.length * EXCERPT_LINE_HEIGHT;
  height += 40 + 1 + 28 + QR_BLOCK + 40;

  return { titleLines, excerptLines, metaLines, siteLines, metaBlockHeight, height };
}

function drawCoverCrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

/** 封面区：有图时 cover 裁剪，无图（或加载失败）时主题色横幅 + 站点名 */
function drawCoverSection(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  cover: HTMLImageElement | null,
  site: string,
): number {
  if (cover) {
    drawCoverCrop(ctx, cover, WIDTH, COVER_HEIGHT);
    return COVER_HEIGHT;
  }

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, WIDTH, BAND_HEIGHT);
  ctx.restore();
  if (site) {
    ctx.font = `700 44px ${theme.fontFamily}`;
    ctx.fillStyle = theme.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(site, WIDTH / 2, BAND_HEIGHT / 2, CONTENT_WIDTH);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
  return BAND_HEIGHT;
}

function drawTitleSection(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  fonts: PosterFonts,
  lines: string[],
  y: number,
): number {
  ctx.font = fonts.title;
  ctx.fillStyle = theme.ink;
  for (const line of lines) {
    ctx.fillText(line, PADDING, y);
    y += TITLE_LINE_HEIGHT;
  }
  return y + 16;
}

/** 作者区：圆形头像 + 作者 · 发布日期，文本在行高块内垂直居中 */
function drawMetaSection(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  fonts: PosterFonts,
  avatar: HTMLImageElement | null,
  lines: string[],
  blockHeight: number,
  y: number,
): number {
  let metaX = PADDING;
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(PADDING + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const scale = Math.max(AVATAR_SIZE / avatar.naturalWidth, AVATAR_SIZE / avatar.naturalHeight);
    const sw = AVATAR_SIZE / scale;
    const sh = AVATAR_SIZE / scale;
    const sx = (avatar.naturalWidth - sw) / 2;
    const sy = (avatar.naturalHeight - sh) / 2;
    ctx.drawImage(avatar, sx, sy, sw, sh, PADDING, y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(PADDING + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2 - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = theme.rule;
    ctx.lineWidth = 1;
    ctx.stroke();
    metaX += AVATAR_SIZE + 16;
  }
  if (lines.length) {
    ctx.font = fonts.meta;
    ctx.fillStyle = theme.ink2;
    let lineY = y + (blockHeight - lines.length * META_LINE_HEIGHT) / 2;
    for (const line of lines) {
      ctx.fillText(line, metaX, lineY);
      lineY += META_LINE_HEIGHT;
    }
  }
  return y + blockHeight;
}

function drawExcerptSection(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  fonts: PosterFonts,
  lines: string[],
  y: number,
): number {
  if (!lines.length) return y;
  y += 12;
  ctx.font = fonts.excerpt;
  ctx.fillStyle = theme.ink2;
  for (const line of lines) {
    ctx.fillText(line, PADDING, y);
    y += EXCERPT_LINE_HEIGHT;
  }
  return y;
}

function drawDivider(ctx: CanvasRenderingContext2D, theme: ThemeColors, y: number): number {
  ctx.strokeStyle = theme.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y + 0.5);
  ctx.lineTo(WIDTH - PADDING, y + 0.5);
  ctx.stroke();
  return y + 1 + 28;
}

/** 页脚区：白底圆角二维码卡 + 站点名 + 扫码提示 */
function drawFooterSection(
  ctx: CanvasRenderingContext2D,
  theme: ThemeColors,
  fonts: PosterFonts,
  qrImage: HTMLImageElement,
  siteLines: string[],
  y: number,
): number {
  ctx.beginPath();
  ctx.moveTo(PADDING + 12, y);
  ctx.arcTo(PADDING + QR_BLOCK, y, PADDING + QR_BLOCK, y + QR_BLOCK, 12);
  ctx.arcTo(PADDING + QR_BLOCK, y + QR_BLOCK, PADDING, y + QR_BLOCK, 12);
  ctx.arcTo(PADDING, y + QR_BLOCK, PADDING, y, 12);
  ctx.arcTo(PADDING, y, PADDING + QR_BLOCK, y, 12);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = theme.rule;
  ctx.stroke();
  ctx.drawImage(qrImage, PADDING + (QR_BLOCK - QR_SIZE) / 2, y + (QR_BLOCK - QR_SIZE) / 2, QR_SIZE, QR_SIZE);

  const textX = PADDING + QR_BLOCK + 24;
  const textBlockHeight = siteLines.length * SITE_LINE_HEIGHT + (siteLines.length ? 8 : 0) + 30;
  let textY = y + (QR_BLOCK - textBlockHeight) / 2;

  ctx.font = fonts.site;
  ctx.fillStyle = theme.ink;
  for (const line of siteLines) {
    ctx.fillText(line, textX, textY);
    textY += SITE_LINE_HEIGHT;
  }
  if (siteLines.length) textY += 8;

  ctx.font = fonts.hint;
  ctx.fillStyle = theme.ink2;
  ctx.fillText("扫码查看瞬间", textX, textY);

  return y + QR_BLOCK + 40;
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "");
  return (cleaned || "poster").slice(0, 40);
}

/** 生成海报并返回可预览/下载的 objectURL 与文件名 */
export async function generateMomentPoster(data: MomentPosterData): Promise<MomentPosterResult> {
  const theme = readTheme();
  const fonts = createFonts(theme);

  let cover = data.cover ? await loadImage(data.cover) : null;
  // 封面跨域加载失败时回退主题设置的默认封面图
  if (!cover && data.defaultCover && data.defaultCover !== data.cover) {
    cover = await loadImage(data.defaultCover);
  }
  const avatar = data.avatar ? await loadImage(data.avatar) : null;

  const absoluteUrl = new URL(data.permalink, window.location.origin).href;
  const qrDataUrl = await QRCode.toDataURL(absoluteUrl, {
    width: 400,
    margin: 0,
    color: { dark: "#18181b", light: "#ffffff" },
  });
  const qrImage = await loadImage(qrDataUrl, false);
  if (!qrImage) throw new Error("QR code render failed");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const layout = measurePoster(ctx, data, fonts, cover !== null, avatar !== null);

  // 设置尺寸会重置 ctx 状态，绘制前重新设置基线
  canvas.width = WIDTH;
  canvas.height = layout.height;
  ctx.textBaseline = "top";

  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, layout.height);

  let y = drawCoverSection(ctx, theme, cover, data.site);
  y += 40;
  y = drawTitleSection(ctx, theme, fonts, layout.titleLines, y);
  if (layout.metaLines.length || avatar) {
    y = drawMetaSection(ctx, theme, fonts, avatar, layout.metaLines, layout.metaBlockHeight, y);
  }
  y = drawExcerptSection(ctx, theme, fonts, layout.excerptLines, y);
  y += 40;
  y = drawDivider(ctx, theme, y);
  drawFooterSection(ctx, theme, fonts, qrImage, layout.siteLines, y);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Canvas export failed");

  return {
    url: URL.createObjectURL(blob),
    filename: sanitizeFilename(data.filename || data.title),
  };
}
