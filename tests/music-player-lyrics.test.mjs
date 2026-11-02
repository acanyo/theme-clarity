import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./support/load-typescript.mjs";

function createHarness({ visible = true } = {}) {
  const layout = { visible, heights: Array(160).fill(26.4) };
  const ticks = [];
  const listeners = new Map();
  const windowMock = {
    innerWidth: 1280,
    innerHeight: 800,
    MUSIC_CONFIG: { server: "netease", type: "playlist", id: "test", volume: 70 },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };
  const { musicPlayer } = loadTypeScript("src/alpine/musicPlayer.ts", {
    window: windowMock,
    document: { getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: {},
    fetch: async () => ({ ok: true, json: async () => [] }),
    requestAnimationFrame: (callback) => callback(),
  });
  const player = musicPlayer();
  player.lyrics = layout.heights.map((_, index) => ({ time: index * 2, text: `Line ${index}` }));
  const lines = layout.heights.map((_, index) => ({
    get offsetHeight() {
      return layout.visible ? Math.round(layout.heights[index]) : 0;
    },
    getBoundingClientRect() {
      return {
        top: layout.visible ? 100 + player.lyricsOffset + layout.heights.slice(0, index).reduce((a, b) => a + b, 0) : 0,
        height: layout.visible ? layout.heights[index] : 0,
      };
    },
  }));
  player.$refs = {
    lyricsWrapper: {
      get clientHeight() {
        return layout.visible ? 60 : 0;
      },
    },
    lyricsScroll: {
      querySelectorAll: () => lines,
      getBoundingClientRect: () => ({ top: layout.visible ? 100 + player.lyricsOffset : 0 }),
    },
  };
  player.$nextTick = (callback) => ticks.push(callback);
  return {
    player,
    layout,
    listeners,
    windowMock,
    flushTicks() {
      while (ticks.length) ticks.shift()();
    },
    activeCenter() {
      const bounds = lines[player.currentLyricIndex].getBoundingClientRect();
      return bounds.top - 100 + bounds.height / 2;
    },
  };
}

test("a hidden lyrics panel does not overwrite its last measured offset", () => {
  const { player, flushTicks } = createHarness({ visible: false });
  player.lyricsOffset = -100;

  player.centerLyrics();
  flushTicks();

  assert.equal(player.lyricsOffset, -100);
});

test("opening the player centers the current lyric without waiting for the next line", () => {
  const { player, layout, flushTicks, activeCenter } = createHarness({ visible: false });
  player.currentTime = 24;
  player.updateLyrics();
  flushTicks();

  layout.visible = true;
  player.toggleExpand();
  flushTicks();

  assert.equal(player.currentLyricIndex, 12);
  assert.ok(Math.abs(activeCenter() - 30) < 0.001);
});

test("long lyrics retain fractional line heights instead of accumulating rounding errors", () => {
  const { player, flushTicks, activeCenter } = createHarness();
  player.currentLyricIndex = 130;

  player.centerLyrics();
  flushTicks();

  assert.ok(Math.abs(activeCenter() - 30) < 0.001);
});

test("resizing an expanded player recenters lyrics after line wrapping changes", async () => {
  const { player, layout, listeners, windowMock, flushTicks, activeCenter } = createHarness();
  await player.init();
  player.expanded = true;
  player.currentLyricIndex = 12;
  player.centerLyrics();
  flushTicks();

  layout.heights.fill(52.8);
  windowMock.innerWidth = 390;
  listeners.get("resize")();
  flushTicks();

  assert.ok(Math.abs(activeCenter() - 30) < 0.001);
});
