import type Swup from "swup";
import { reinitializeComponents, syncThemeConfig } from "../reinit";
import {
  createSwupSuccessHandler,
  handleSwupComplete,
  handleSwupError,
  handleSwupSend,
  handleSwupTimeout,
} from "./events";
import { preloadConditionalStyles, updateMetaTags } from "./meta";
import { destroySlides } from "../../modules/slide-loader";
import { registerArticleTransition } from "../article-transition";
import { registerHistoryScroll } from "../history-scroll";

export const registerSwupHooks = (swup: Swup) => {
  registerHistoryScroll(swup);
  registerArticleTransition(swup);

  swup.hooks.on("visit:start", (visit) => {
    handleSwupSend(visit);
  });

  swup.hooks.on(
    "content:replace",
    async (_visit, { page }) => {
      await preloadConditionalStyles(page.html);
      destroySlides();
    },
    { before: true },
  );

  swup.hooks.on("content:replace", (_visit, { page }) => {
    updateMetaTags(page.html);
    document.querySelector("#main-content")?.classList.add("swup-content");
  });

  swup.hooks.on("page:view", createSwupSuccessHandler(reinitializeComponents, syncThemeConfig));

  swup.hooks.on("visit:end", (visit) => {
    handleSwupComplete(visit);
  });

  swup.hooks.on("fetch:timeout", (_visit, args) => {
    handleSwupTimeout(args);
  });

  swup.hooks.on("fetch:error", (visit, args) => {
    handleSwupError(visit, args);
  });
};

export { updateMetaTags, preloadConditionalStyles } from "./meta";
export { updateActiveNavItem } from "./navigation";
export { executeNewScripts } from "./scripts";
export { getMetaKey, isPathMatch } from "./utils";
