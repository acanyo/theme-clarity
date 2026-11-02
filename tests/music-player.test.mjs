import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

const POSITION_KEY = "clarity:music-player:position:v1";

// vm 沙箱内创建的对象原型不同，deepStrictEqual 会误判，这里转为当前域的普通对象再比较
function pos(player) {
  return { left: player.playerPosition.left, top: player.playerPosition.top };
}

function createHarness({
  viewportWidth = 1280,
  viewportHeight = 720,
  playerWidth = 336,
  playerHeight = 48,
  playerBorderHeight = 0,
  panelScrollHeight = 0,
  savedPosition = null,
} = {}) {
  const timers = [];
  const listeners = new Map();
  const store = new Map();

  if (savedPosition) {
    store.set(POSITION_KEY, JSON.stringify(savedPosition));
  }

  const panelEl = { scrollHeight: panelScrollHeight };
  const playerEl = {
    offsetWidth: playerWidth,
    offsetHeight: playerHeight,
    get clientHeight() {
      return this.offsetHeight - playerBorderHeight;
    },
    querySelector: (selector) => (selector === ".expand-panel" ? panelEl : null),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: playerWidth, height: playerHeight }),
  };

  const windowMock = {
    innerWidth: viewportWidth,
    innerHeight: viewportHeight,
    setTimeout: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout: () => {},
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };

  const localStorageMock = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };

  const documentMock = {
    getElementById: () => playerEl,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const { musicPlayer } = loadTypeScript("src/alpine/musicPlayer.ts", {
    window: windowMock,
    document: documentMock,
    localStorage: localStorageMock,
    navigator: {},
  });

  const player = musicPlayer();
  player.$refs = { player: playerEl };
  player.$nextTick = (callback) => callback();

  return {
    player,
    playerEl,
    panelEl,
    windowMock,
    store,
    listeners,
    runTimers() {
      while (timers.length > 0) {
        timers.shift()();
      }
    },
  };
}

test("restorePlayerPosition clamps a position saved on a larger display into the current viewport", () => {
  const { player } = createHarness({ savedPosition: { left: 1700, top: 1000 } });

  player.restorePlayerPosition();

  // 1280x720 视口、播放器 336x48：最大合法坐标为 (944, 672)
  assert.deepEqual(pos(player), { left: 944, top: 672 });
});

test("restorePlayerPosition keeps an in-bounds position unchanged", () => {
  const { player } = createHarness({ savedPosition: { left: 100, top: 120 } });

  player.restorePlayerPosition();

  assert.deepEqual(pos(player), { left: 100, top: 120 });
});

test("restorePlayerPosition clamps negative coordinates to the viewport origin", () => {
  const { player } = createHarness({ savedPosition: { left: -50, top: -20 } });

  player.restorePlayerPosition();

  assert.deepEqual(pos(player), { left: 0, top: 0 });
});

test("restorePlayerPosition ignores malformed data", () => {
  const { player, store } = createHarness();

  store.set(POSITION_KEY, JSON.stringify({ left: "abc", top: 10 }));
  player.restorePlayerPosition();
  assert.deepEqual(pos(player), { left: null, top: null });

  store.set(POSITION_KEY, "{invalid json");
  player.restorePlayerPosition();
  assert.deepEqual(pos(player), { left: null, top: null });
});

test("clampPositionToViewport adapts to different resolutions", () => {
  const cases = [
    { viewportWidth: 1920, viewportHeight: 1080, left: 1900, top: 1050, expected: { left: 1584, top: 1032 } },
    { viewportWidth: 1366, viewportHeight: 768, left: 1400, top: 800, expected: { left: 1030, top: 720 } },
    { viewportWidth: 390, viewportHeight: 844, left: 400, top: 900, expected: { left: 54, top: 796 } },
  ];

  for (const { viewportWidth, viewportHeight, left, top, expected } of cases) {
    const { player } = createHarness({ viewportWidth, viewportHeight });
    assert.deepEqual(
      { ...player.clampPositionToViewport(left, top) },
      expected,
      `viewport ${viewportWidth}x${viewportHeight}`,
    );
  }
});

test("clampPositionToViewport keeps the origin visible when the player is larger than the viewport", () => {
  const { player } = createHarness({ viewportWidth: 300, viewportHeight: 40, playerWidth: 336, playerHeight: 48 });

  assert.deepEqual({ ...player.clampPositionToViewport(120, 60) }, { left: 0, top: 0 });
});

test("toggleExpand pre-clamps a near-edge position using the expanded panel size", () => {
  const { player, playerEl, runTimers } = createHarness({
    viewportWidth: 1280,
    viewportHeight: 800,
    panelScrollHeight: 380,
    savedPosition: { left: 1200, top: 760 },
  });

  player.restorePlayerPosition();
  // 恢复时按折叠尺寸 336x48 钳制
  assert.deepEqual(pos(player), { left: 944, top: 752 });

  player.toggleExpand();

  // 展开后宽 336、高 48+380=428：最大合法坐标为 (944, 372)
  assert.equal(player.expanded, true);
  assert.deepEqual(pos(player), { left: 944, top: 372 });

  // 动画结束后按实际尺寸兜底校验，结果应保持稳定
  playerEl.offsetHeight = 428;
  runTimers();
  assert.deepEqual(pos(player), { left: 944, top: 372 });
});

test("collapse returns to the pre-expand position instead of the clamped high point", () => {
  const { player, playerEl, runTimers } = createHarness({
    viewportWidth: 1280,
    viewportHeight: 800,
    panelScrollHeight: 380,
    savedPosition: { left: 1200, top: 760 },
  });

  player.restorePlayerPosition();
  // 恢复时按折叠尺寸钳制为 (944, 752)
  assert.deepEqual(pos(player), { left: 944, top: 752 });

  player.toggleExpand();
  // 展开时被边缘钳制"顶高"到 (944, 372)
  assert.deepEqual(pos(player), { left: 944, top: 372 });

  playerEl.offsetHeight = 428;
  player.toggleExpand();

  // 收起后回到展开前的位置，而不是停留在高点
  assert.equal(player.expanded, false);
  assert.deepEqual(pos(player), { left: 944, top: 752 });

  playerEl.offsetHeight = 48;
  runTimers();
  assert.deepEqual(pos(player), { left: 944, top: 752 });
});

test("dragging while expanded discards the pre-expand position", () => {
  const { player } = createHarness({
    viewportWidth: 1280,
    viewportHeight: 800,
    panelScrollHeight: 380,
    savedPosition: { left: 1200, top: 760 },
  });

  player.restorePlayerPosition();
  player.toggleExpand();
  assert.deepEqual(pos(player), { left: 944, top: 372 });

  // 展开状态下用户手动拖拽到新位置
  player.dragState = { isDragging: true, startX: 0, startY: 0, initialLeft: 500, initialTop: 400 };
  player.onDragMove({ clientX: 10, clientY: 10, preventDefault: () => {} });
  assert.deepEqual(pos(player), { left: 510, top: 410 });

  // 收起后保持拖拽后的位置，不回跳
  player.toggleExpand();
  assert.deepEqual(pos(player), { left: 510, top: 410 });
});

test("collapse keeps the restored position visible after the viewport shrinks", () => {
  const { player, playerEl, windowMock, runTimers } = createHarness({
    viewportWidth: 1280,
    viewportHeight: 800,
    panelScrollHeight: 380,
    savedPosition: { left: 900, top: 700 },
  });

  player.restorePlayerPosition();
  player.toggleExpand();
  playerEl.offsetHeight = 428;
  runTimers();

  windowMock.innerWidth = 800;
  windowMock.innerHeight = 600;
  player.ensurePlayerInViewport(false);
  player.toggleExpand();

  assert.equal(player.expanded, false);
  assert.deepEqual(pos(player), { left: 464, top: 552 });
});

test("collapse includes the player border when restoring a near-bottom position", () => {
  const { player, playerEl } = createHarness({ playerBorderHeight: 2 });
  player.expanded = true;
  player.preExpandPosition = { left: 100, top: 700 };
  playerEl.offsetHeight = 430;

  player.toggleExpand();

  assert.deepEqual(pos(player), { left: 100, top: 670 });
});

test("toggleExpand uses the mobile expanded width on narrow viewports", () => {
  const { player } = createHarness({
    viewportWidth: 390,
    viewportHeight: 844,
    panelScrollHeight: 300,
    savedPosition: { left: 350, top: 800 },
  });

  player.restorePlayerPosition();
  player.toggleExpand();

  // 恢复时先按折叠宽度 336 钳制为 390-336=54；展开后高度 48+300=348，top 修正为 844-348=496
  assert.deepEqual(pos(player), { left: 54, top: 496 });
});

test("toggleExpand without a dragged position keeps the CSS preset position", () => {
  const { player, runTimers } = createHarness();

  player.toggleExpand();

  assert.equal(player.expanded, true);
  assert.deepEqual(pos(player), { left: null, top: null });
  runTimers();
  assert.deepEqual(pos(player), { left: null, top: null });
});

test("togglePlaylist re-clamps the bottom edge when the list grows the panel", () => {
  const { player } = createHarness({
    viewportWidth: 1280,
    viewportHeight: 800,
    panelScrollHeight: 380,
    savedPosition: { left: 100, top: 700 },
  });

  player.restorePlayerPosition();
  player.expanded = true;
  player.playlist = Array.from({ length: 50 }, (_, index) => ({
    id: String(index),
    title: "t",
    artist: "a",
    cover: "",
    url: "u",
  }));

  player.togglePlaylist();

  // 展开播放列表后高度 48+380+200=628，超出 78vh=624 的上限：top 最大为 800-624=176
  assert.equal(player.showPlaylist, true);
  assert.deepEqual(pos(player), { left: 100, top: 176 });
});

test("onDragMove still clamps dragging to the viewport bounds", () => {
  const { player } = createHarness();

  player.dragState = { isDragging: true, startX: 900, startY: 600, initialLeft: 900, initialTop: 600 };
  player.onDragMove({ clientX: 2000, clientY: 1200, preventDefault: () => {} });
  assert.deepEqual(pos(player), { left: 944, top: 672 });

  player.onDragMove({ clientX: 800, clientY: 500, preventDefault: () => {} });
  assert.deepEqual(pos(player), { left: 800, top: 500 });

  player.onDragMove({ clientX: 0, clientY: 0, preventDefault: () => {} });
  assert.deepEqual(pos(player), { left: 0, top: 0 });
});

test("viewport shrink re-clamps the position in memory without overwriting the saved one", () => {
  const { player, windowMock, store } = createHarness({ savedPosition: { left: 900, top: 600 } });

  player.restorePlayerPosition();
  player.savePlayerPosition();

  // 窗口从 1280x720 缩小到 800x600（例如移动到更小的显示器）
  windowMock.innerWidth = 800;
  windowMock.innerHeight = 600;
  player.ensurePlayerInViewport(false);

  assert.deepEqual(pos(player), { left: 464, top: 552 });
  // persist=false：不覆盖用户保存的位置，窗口还原后仍可恢复
  assert.deepEqual(JSON.parse(store.get(POSITION_KEY)), { left: 900, top: 600 });
});

test("init restores an out-of-bounds position clamped, persists the fix and registers a resize guard", async () => {
  const timers = [];
  const listeners = new Map();
  const store = new Map();
  store.set(POSITION_KEY, JSON.stringify({ left: 1700, top: 1000 }));

  const playerEl = { offsetWidth: 336, offsetHeight: 48, querySelector: () => null };
  const windowMock = {
    innerWidth: 1280,
    innerHeight: 720,
    MUSIC_CONFIG: {
      server: "netease",
      type: "playlist",
      id: "123",
      api_url: "",
      custom_params: "",
      order: "list",
      volume: 70,
      position: "right",
      autoplay: false,
      showLrc: true,
      enabledDrag: true,
    },
    setTimeout: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimeout: () => {},
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };

  const { musicPlayer } = loadTypeScript("src/alpine/musicPlayer.ts", {
    window: windowMock,
    document: { getElementById: () => playerEl, addEventListener: () => {}, removeEventListener: () => {} },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    navigator: {},
    fetch: async () => ({ ok: true, json: async () => [] }),
    requestAnimationFrame: (callback) => callback(),
  });

  const player = musicPlayer();
  player.$refs = { player: playerEl };
  player.$nextTick = (callback) => callback();

  await player.init();

  assert.equal(player.isReady, true);
  assert.deepEqual(pos(player), { left: 944, top: 672 });
  assert.deepEqual(JSON.parse(store.get(POSITION_KEY)), { left: 944, top: 672 });
  assert.equal(typeof listeners.get("resize"), "function");

  // 跨显示器移动窗口后分辨率变小，resize 监听会重新钳制位置
  windowMock.innerWidth = 1024;
  windowMock.innerHeight = 640;
  listeners.get("resize")();
  assert.deepEqual(pos(player), { left: 688, top: 592 });

  player.destroy();
  assert.equal(listeners.has("resize"), false);
});
