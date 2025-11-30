import { Fancybox } from "@fancyapps/ui";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

/**
 * 初始化 Fancybox 灯箱
 */
export function initFancybox() {
  // 销毁之前的绑定（避免 swup 切换页面后重复绑定）
  Fancybox.destroy();

  // 全站通用绑定选择器
  const selector = [
    ".article img:not(.no-lightbox)", // 文章内容
    ".moment-media img",              // 瞬间图片
    ".moment-text img",               // 瞬间内容插图
    ".comment-content img",           // 评论区图片
    ".link-info img",                 // 友链页面图片
    ".gallery-item img"               // 如果有图集功能
  ].join(",");

  // 排除不应该放大的图片：logo、头像、表情包、图标等
  const exclude = ":not(.logo):not(.avatar):not(.emoji):not(.icon):not(.no-lightbox)";

  Fancybox.bind(`${selector}${exclude}`, {
    groupAll: true,
    Hash: false,
    Toolbar: {
      display: {
        left: ["infobar"],
        middle: [
          "zoomIn",
          "zoomOut",
          "toggle1to1",
          "rotateCCW",
          "rotateCW",
          "flipX",
          "flipY",
        ],
        right: ["slideshow", "thumbs", "close"],
      },
    },
  } as any);
}
