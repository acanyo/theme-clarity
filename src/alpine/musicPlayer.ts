import type Alpine from "alpinejs";

type OrderMode = "list" | "random";

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  lrc?: string;
  resolvedUrl?: string;
  resolveAttempts?: number;
}

interface Lyric {
  time: number;
  text: string;
}

interface PersistedMusicState {
  signature: string;
  index: number;
  currentTime: number;
  volume: number;
  playing: boolean;
  orderMode: OrderMode;
  updatedAt: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
}

interface MusicPlayerState {
  expanded: boolean;
  playing: boolean;
  loading: boolean;
  showPlaylist: boolean;
  currentAudioUrl: string;
  playlist: Song[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  orderMode: OrderMode;
  lyrics: Lyric[];
  currentLyricIndex: number;
  lyricsOffset: number;
  configSignature: string;
  pendingSeekTime: number | null;
  resumeOnReady: boolean;
  lastPersistedAt: number;
  apiUrl?: string;
  customParams?: string;
  dragState: DragState;
  playerPosition: { left: number | null; top: number | null };
  preExpandPosition: { left: number; top: number } | null;
  isReady: boolean;
  enabledDrag?: boolean;
  viewportClampTimer: number | null;
  onViewportResize: (() => void) | null;
  readonly currentSong: Song | null;
  readonly progress: number;

  init(this: MusicPlayerState): Promise<void>;
  loadPlaylist(this: MusicPlayerState, server: string, type: string, id: string, apiUrl?: string): Promise<void>;
  resolveSongUrl(this: MusicPlayerState, index: number): Promise<void>;
  loadLyrics(this: MusicPlayerState, lrcUrl: string): Promise<void>;
  parseLrc(this: MusicPlayerState, lrcText: string): Lyric[];
  togglePlay(this: MusicPlayerState): void;
  play(this: MusicPlayerState): Promise<void>;
  pause(this: MusicPlayerState): void;
  prev(this: MusicPlayerState): void;
  next(this: MusicPlayerState): void;
  playSong(this: MusicPlayerState, index: number): void;
  onSongChange(this: MusicPlayerState): Promise<void>;
  toggleOrder(this: MusicPlayerState): void;
  shufflePlaylist(this: MusicPlayerState): void;
  seek(this: MusicPlayerState, event: MouseEvent): void;
  setVolume(this: MusicPlayerState, value: string | number): void;
  toggleExpand(this: MusicPlayerState): void;
  formatTime(this: MusicPlayerState, seconds: number): string;
  onTimeUpdate(this: MusicPlayerState): void;
  onLoaded(this: MusicPlayerState): void;
  onEnded(this: MusicPlayerState): void;
  onError(this: MusicPlayerState): Promise<void>;
  updateLyrics(this: MusicPlayerState): void;
  centerLyrics(this: MusicPlayerState): void;
  setupMediaSession(this: MusicPlayerState): void;
  updateMediaSession(this: MusicPlayerState): void;
  restoreState(this: MusicPlayerState): Promise<boolean>;
  persistState(this: MusicPlayerState, force?: boolean): void;
  onDragStart(this: MusicPlayerState, event: MouseEvent | TouchEvent): void;
  onDragMove(this: MusicPlayerState, event: MouseEvent | TouchEvent): void;
  onDragEnd(this: MusicPlayerState): void;
  getEventClientPos(this: MusicPlayerState, event: MouseEvent | TouchEvent): { clientX: number; clientY: number };
  savePlayerPosition(this: MusicPlayerState): void;
  restorePlayerPosition(this: MusicPlayerState): void;
  resetPlayerPosition(this: MusicPlayerState): void;
  clampPositionToViewport(
    this: MusicPlayerState,
    left: number,
    top: number,
    width?: number,
    height?: number,
  ): { left: number; top: number };
  ensurePlayerInViewport(this: MusicPlayerState, persist?: boolean): void;
  clampExpandedPosition(this: MusicPlayerState): void;
  togglePlaylist(this: MusicPlayerState): void;
  destroy(this: MusicPlayerState): void;
  $refs?: {
    audio?: HTMLAudioElement;
    player?: HTMLElement;
    lyricsWrapper?: HTMLElement;
    lyricsScroll?: HTMLElement;
  };
  $nextTick?: (callback: () => void) => void;
}

const DEFAULT_API_URL = "https://api.i-meto.com/meting/api";
const DEFAULT_VOLUME = 70;
const MAX_RESOLVE_ATTEMPTS = 2;
const STATE_SAVE_INTERVAL_MS = 1000;
const PLAYER_STATE_KEY = "clarity:music-player:state:v1";
const PLAYER_POSITION_KEY = "clarity:music-player:position:v1";

// 以下尺寸约束与 _music-player.scss 中 .music-capsule 的样式保持一致
const PLAYER_COLLAPSED_HEIGHT = 48;
const PLAYER_EXPANDED_WIDTH = 336;
const PLAYER_EXPANDED_WIDTH_MOBILE = 320;
const PLAYER_EXPANDED_WIDTH_RATIO = 0.92;
const PLAYER_EXPANDED_MAX_HEIGHT_RATIO = 0.78;
const PLAYER_MOBILE_BREAKPOINT = 768;
const PLAYLIST_MAX_HEIGHT = 200;
const PLAYLIST_ITEM_HEIGHT = 37;
const EXPAND_TRANSITION_MS = 320;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toStringWithFallback(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function normalizeVolume(value: unknown): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return DEFAULT_VOLUME;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function appendRawQuery(url: string, rawQuery?: string): string {
  if (!rawQuery) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${rawQuery}`;
}

function buildMetingApiUrl(baseUrl: string, server: string, type: string, id: string, customParams?: string): string {
  const url = `${baseUrl}?server=${encodeURIComponent(server)}&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  return appendRawQuery(url, customParams);
}

function extractHostname(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function mapSong(raw: unknown, index: number): Song | null {
  if (!isRecord(raw)) return null;

  const url = toOptionalString(raw.url);
  if (!url) return null;

  return {
    id: toStringWithFallback(raw.id, `song-${index}`),
    title: toStringWithFallback(raw.title ?? raw.name, "未知歌曲"),
    artist: toStringWithFallback(raw.author ?? raw.artist, "未知歌手"),
    cover: toOptionalString(raw.pic ?? raw.cover) ?? "",
    url,
    lrc: toOptionalString(raw.lrc),
  };
}

function extractPlayableUrl(payload: unknown): string | null {
  if (isRecord(payload)) {
    return toOptionalString(payload.url) ?? null;
  }

  if (Array.isArray(payload) && payload.length > 0 && isRecord(payload[0])) {
    return toOptionalString(payload[0].url) ?? null;
  }

  return null;
}

function getConfigSignature(server: string, type: string, id: string): string {
  return `${server}:${type}:${id}`;
}

function readPersistedState(): PersistedMusicState | null {
  try {
    const raw = localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const signature = toOptionalString(parsed.signature);
    const index = Number(parsed.index);
    const currentTime = Number(parsed.currentTime);
    const volume = Number(parsed.volume);
    const playing = parsed.playing === true;
    const orderMode = parsed.orderMode === "random" ? "random" : "list";
    const updatedAt = Number(parsed.updatedAt);

    if (!signature || Number.isNaN(index) || Number.isNaN(currentTime) || Number.isNaN(volume)) {
      return null;
    }

    return {
      signature,
      index,
      currentTime,
      volume,
      playing,
      orderMode,
      updatedAt: Number.isNaN(updatedAt) ? Date.now() : updatedAt,
    };
  } catch {
    return null;
  }
}

function writePersistedState(state: PersistedMusicState): void {
  try {
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
  } catch {
    // 忽略存储失败（隐私模式/配额）
  }
}

export function musicPlayer(): MusicPlayerState {
  return {
    expanded: false,
    playing: false,
    loading: false,
    showPlaylist: false,
    currentAudioUrl: "",

    playlist: [],
    currentIndex: 0,
    currentTime: 0,
    duration: 0,
    volume: DEFAULT_VOLUME,
    orderMode: "list",

    lyrics: [],
    currentLyricIndex: 0,
    lyricsOffset: 0,

    configSignature: "",
    pendingSeekTime: null,
    resumeOnReady: false,
    lastPersistedAt: 0,

    dragState: {
      isDragging: false,
      startX: 0,
      startY: 0,
      initialLeft: 0,
      initialTop: 0,
    },
    playerPosition: { left: null, top: null },
    preExpandPosition: null,
    isReady: false,
    viewportClampTimer: null,
    onViewportResize: null,

    get currentSong(): Song | null {
      return this.playlist[this.currentIndex] ?? null;
    },

    get progress(): number {
      return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    },

    async init(this: MusicPlayerState) {
      const config = window.MUSIC_CONFIG;
      if (!config?.id) return;

      this.configSignature = getConfigSignature(config.server, config.type, config.id);
      this.volume = normalizeVolume(config.volume);
      this.orderMode = config.order === "random" ? "random" : "list";
      this.apiUrl = toOptionalString(config.api_url);
      this.customParams = toOptionalString(config.custom_params);
      this.enabledDrag = config.enabledDrag === true;

      // 先恢复位置，再加载播放列表，确保位置在显示前已设置
      if (this.enabledDrag) {
        this.restorePlayerPosition();
      }

      // 窗口可视区域变化（调整窗口大小、跨显示器移动、分辨率/DPI 变化）后重新校验位置
      this.onViewportResize = () => {
        this.ensurePlayerInViewport(false);
        if (this.expanded) this.centerLyrics();
      };
      window.addEventListener("resize", this.onViewportResize);

      await this.loadPlaylist(config.server, config.type, config.id, this.apiUrl);

      const audio = this.$refs?.audio;
      if (audio) {
        audio.volume = this.volume / 100;
      }

      const restored = await this.restoreState();
      this.setupMediaSession();

      // 延迟显示播放器，避免从默认位置瞬移的视觉效果
      this.$nextTick?.(() => {
        // 显示前最后校验一次，确保播放器完整处于可视区域内
        this.ensurePlayerInViewport(true);
        requestAnimationFrame(() => {
          this.isReady = true;
        });
      });

      if (!restored && config.autoplay && this.playlist.length > 0) {
        await this.play();
      }

      this.persistState(true);
    },

    async loadPlaylist(this: MusicPlayerState, server: string, type: string, id: string, apiUrl?: string) {
      this.loading = true;

      try {
        const baseUrl = toOptionalString(apiUrl) ?? DEFAULT_API_URL;
        const requestUrl = buildMetingApiUrl(baseUrl, server, type, id, this.customParams);
        const response = await fetch(requestUrl);

        if (!response.ok) {
          throw new Error("Failed to fetch playlist");
        }

        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) {
          this.playlist = [];
          return;
        }

        this.playlist = payload
          .map((item, index) => mapSong(item, index))
          .filter((song): song is Song => song !== null);

        this.currentIndex = 0;
        this.currentTime = 0;
        this.duration = 0;

        if (this.orderMode === "random") {
          this.shufflePlaylist();
        }

        if (this.playlist.length > 0) {
          await this.resolveSongUrl(this.currentIndex);
          if (this.currentSong?.lrc) {
            await this.loadLyrics(this.currentSong.lrc);
          } else {
            this.lyrics = [];
          }
          this.updateMediaSession();
        }
      } catch (error) {
        console.error("Failed to load playlist:", error);
      } finally {
        this.loading = false;
      }
    },

    async resolveSongUrl(this: MusicPlayerState, index: number) {
      const song = this.playlist[index];
      if (!song) return;

      if (song.resolvedUrl) {
        this.currentAudioUrl = song.resolvedUrl;
        return;
      }

      let resolvedUrl = song.url;
      song.resolveAttempts = (song.resolveAttempts ?? 0) + 1;

      const customHost = extractHostname(this.apiUrl);
      const needsResolve =
        resolvedUrl.includes("api.i-meto.com") ||
        (customHost !== null && resolvedUrl.includes(customHost)) ||
        resolvedUrl.includes("server=");

      if (needsResolve) {
        try {
          const fetchUrl = appendRawQuery(appendRawQuery(resolvedUrl, `t=${Date.now()}`), this.customParams);
          const response = await fetch(fetchUrl);
          const contentType = response.headers.get("content-type") ?? "";

          if (contentType.includes("application/json")) {
            const payload: unknown = await response.json();
            resolvedUrl = extractPlayableUrl(payload) ?? response.url;
          } else {
            resolvedUrl = response.url;
          }
        } catch (error) {
          console.warn("Failed to resolve URL for song:", song.title, error);
        }
      }

      song.resolvedUrl = resolvedUrl;
      this.currentAudioUrl = resolvedUrl;
    },

    async loadLyrics(this: MusicPlayerState, lrcUrl: string) {
      try {
        const fetchUrl = appendRawQuery(lrcUrl, this.customParams);
        const response = await fetch(fetchUrl);
        const lrcText = await response.text();
        this.lyrics = this.parseLrc(lrcText);
        this.centerLyrics();
      } catch {
        this.lyrics = [];
      }
    },

    parseLrc(this: MusicPlayerState, lrcText: string): Lyric[] {
      const lines = lrcText.split("\n");
      const result: Lyric[] = [];
      const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

      for (const line of lines) {
        const matches = [...line.matchAll(timeRegex)];
        const text = line.replace(timeRegex, "").trim();

        if (matches.length > 0 && text.length > 0) {
          for (const match of matches) {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            const ms = match[3] ? Number(match[3].padEnd(3, "0")) : 0;
            const time = minutes * 60 + seconds + ms / 1000;
            result.push({ time, text });
          }
        }
      }

      return result.sort((a, b) => a.time - b.time);
    },

    togglePlay(this: MusicPlayerState) {
      if (this.playing) {
        this.pause();
        return;
      }

      void this.play();
    },

    async play(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (!audio || !this.currentSong) return;

      if (!this.currentAudioUrl) {
        await this.resolveSongUrl(this.currentIndex);
      }

      if (!this.currentAudioUrl) return;

      try {
        audio.volume = this.volume / 100;
        await audio.play();
        this.playing = true;
        this.persistState(true);
      } catch {
        this.playing = false;
        this.persistState(true);
        console.warn("Autoplay blocked by browser");
      }
    },

    pause(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (!audio) return;

      audio.pause();
      this.playing = false;
      this.resumeOnReady = false;
      this.persistState(true);
    },

    prev(this: MusicPlayerState) {
      if (this.playlist.length === 0) return;

      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      void this.onSongChange();
    },

    next(this: MusicPlayerState) {
      if (this.playlist.length === 0) return;

      if (this.orderMode === "random") {
        this.currentIndex = Math.floor(Math.random() * this.playlist.length);
      } else {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      }

      void this.onSongChange();
    },

    playSong(this: MusicPlayerState, index: number) {
      if (index < 0 || index >= this.playlist.length) return;

      this.currentIndex = index;
      void this.onSongChange();
    },

    async onSongChange(this: MusicPlayerState) {
      this.pause();
      this.currentTime = 0;
      this.duration = 0;
      this.currentLyricIndex = 0;
      this.lyricsOffset = 0;
      this.pendingSeekTime = null;

      await this.resolveSongUrl(this.currentIndex);

      if (this.currentSong?.lrc) {
        await this.loadLyrics(this.currentSong.lrc);
      } else {
        this.lyrics = [];
      }

      this.$nextTick?.(() => {
        void this.play();
      });

      this.updateMediaSession();
      this.persistState(true);
    },

    toggleOrder(this: MusicPlayerState) {
      this.orderMode = this.orderMode === "list" ? "random" : "list";
      this.persistState(true);
    },

    shufflePlaylist(this: MusicPlayerState) {
      for (let i = this.playlist.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
      }
    },

    seek(this: MusicPlayerState, event: MouseEvent) {
      const bar = event.currentTarget as HTMLElement | null;
      const audio = this.$refs?.audio;
      if (!bar || !audio || this.duration <= 0) return;

      const rect = bar.getBoundingClientRect();
      const offset = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const percent = rect.width > 0 ? offset / rect.width : 0;
      audio.currentTime = percent * this.duration;
      this.currentTime = audio.currentTime;
      this.persistState(true);
    },

    setVolume(this: MusicPlayerState, value: string | number) {
      this.volume = normalizeVolume(value);
      const audio = this.$refs?.audio;
      if (audio) {
        audio.volume = this.volume / 100;
      }
      this.persistState(true);
    },

    toggleExpand(this: MusicPlayerState) {
      this.expanded = !this.expanded;

      const { left, top } = this.playerPosition;
      if (this.expanded) {
        // 展开前记录当前位置，收起时恢复，避免被边缘钳制"顶高"后回不去
        this.preExpandPosition = left !== null && top !== null ? { left, top } : null;

        // 靠近屏幕边缘展开时，面板增大后会溢出可视区域，需要按展开后的尺寸校验位置
        this.clampExpandedPosition();
        this.centerLyrics();
      } else if (this.preExpandPosition) {
        // 窗口可能在展开期间缩小，恢复旧坐标时仍需按收起后的高度校验边界。
        const player = this.$refs?.player ?? document.getElementById("music-player");
        const bodyHeight = player?.querySelector<HTMLElement>(".capsule-body")?.offsetHeight ?? PLAYER_COLLAPSED_HEIGHT;
        const borderHeight = player ? player.offsetHeight - player.clientHeight : 0;
        this.playerPosition = this.clampPositionToViewport(
          this.preExpandPosition.left,
          this.preExpandPosition.top,
          player?.offsetWidth,
          bodyHeight + borderHeight,
        );
        this.preExpandPosition = null;
      }
    },

    togglePlaylist(this: MusicPlayerState) {
      this.showPlaylist = !this.showPlaylist;

      // 展开播放列表会进一步增高面板，需要重新校验下边界
      if (this.showPlaylist && this.expanded) {
        this.clampExpandedPosition();
      }
    },

    formatTime(this: MusicPlayerState, seconds: number): string {
      if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    },

    onTimeUpdate(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (!audio) return;

      this.currentTime = audio.currentTime;
      this.updateLyrics();
      this.persistState(false);
    },

    onLoaded(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (!audio) return;

      this.duration = audio.duration;

      if (this.pendingSeekTime !== null && Number.isFinite(audio.duration) && audio.duration > 0) {
        const maxTime = Math.max(0, audio.duration - 0.5);
        audio.currentTime = Math.min(Math.max(this.pendingSeekTime, 0), maxTime);
        this.currentTime = audio.currentTime;
        this.pendingSeekTime = null;
      }

      if (this.resumeOnReady) {
        this.resumeOnReady = false;
        void this.play();
      }

      this.persistState(true);
    },

    onEnded(this: MusicPlayerState) {
      this.next();
    },

    async onError(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      const song = this.currentSong;
      if (!audio || !song) return;

      const attempts = song.resolveAttempts ?? 0;
      if (attempts < MAX_RESOLVE_ATTEMPTS) {
        await this.resolveSongUrl(this.currentIndex);
        audio.load();
        if (this.playing) {
          try {
            await audio.play();
          } catch {
            console.warn("Replay failed after resolving audio url");
          }
        }
        return;
      }

      window.setTimeout(() => {
        this.next();
      }, 1000);
    },

    updateLyrics(this: MusicPlayerState) {
      if (this.lyrics.length === 0) return;

      let nextIndex = 0;
      for (let i = 0; i < this.lyrics.length; i += 1) {
        if (this.currentTime >= this.lyrics[i].time) {
          nextIndex = i;
        } else {
          break;
        }
      }

      if (nextIndex !== this.currentLyricIndex) {
        this.currentLyricIndex = nextIndex;
        this.centerLyrics();
      }
    },

    centerLyrics(this: MusicPlayerState) {
      this.$nextTick?.(() => {
        const wrapper = this.$refs?.lyricsWrapper;
        const scroll = this.$refs?.lyricsScroll;
        if (!wrapper || !scroll || wrapper.clientHeight === 0) return;

        const lines = Array.from(scroll.querySelectorAll<HTMLElement>(".lyric-line"));
        if (lines.length === 0) return;

        const index = Math.min(Math.max(this.currentLyricIndex, 0), lines.length - 1);
        const line = lines[index].getBoundingClientRect();
        const offsetTop = line.top - scroll.getBoundingClientRect().top;

        // 两个矩形共享滚动变换，差值保留小数像素，避免逐行取整导致长歌词漂移。
        this.lyricsOffset = wrapper.clientHeight / 2 - offsetTop - line.height / 2;
      });
    },

    setupMediaSession(this: MusicPlayerState) {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.setActionHandler("play", () => {
        void this.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.prev();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        this.next();
      });
    },

    updateMediaSession(this: MusicPlayerState) {
      if (!("mediaSession" in navigator) || !this.currentSong) return;

      const artworkSrc = this.currentSong.cover || "/themes/theme-clarity/assets/images/logo.svg";

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentSong.title,
        artist: this.currentSong.artist,
        artwork: [{ src: artworkSrc, sizes: "512x512", type: "image/jpeg" }],
      });
    },

    async restoreState(this: MusicPlayerState): Promise<boolean> {
      if (!this.configSignature || this.playlist.length === 0) return false;

      const persisted = readPersistedState();
      if (!persisted || persisted.signature !== this.configSignature) return false;

      this.orderMode = persisted.orderMode;
      this.volume = normalizeVolume(persisted.volume);

      const restoredIndex = Math.min(Math.max(Math.round(persisted.index), 0), this.playlist.length - 1);

      if (restoredIndex !== this.currentIndex) {
        this.currentIndex = restoredIndex;
        await this.resolveSongUrl(this.currentIndex);
        if (this.currentSong?.lrc) {
          await this.loadLyrics(this.currentSong.lrc);
        } else {
          this.lyrics = [];
        }
        this.updateMediaSession();
      }

      this.pendingSeekTime =
        Number.isFinite(persisted.currentTime) && persisted.currentTime > 0 ? persisted.currentTime : null;
      this.resumeOnReady = persisted.playing === true;

      const audio = this.$refs?.audio;
      if (audio) {
        audio.volume = this.volume / 100;
        if (audio.readyState >= 1) {
          this.onLoaded();
        }
      }

      this.persistState(true);
      return true;
    },

    persistState(this: MusicPlayerState, force = false) {
      if (!this.configSignature || this.playlist.length === 0) return;

      const now = Date.now();
      if (!force && now - this.lastPersistedAt < STATE_SAVE_INTERVAL_MS) return;

      const audio = this.$refs?.audio;
      const state: PersistedMusicState = {
        signature: this.configSignature,
        index: this.currentIndex,
        currentTime: Number.isFinite(audio?.currentTime ?? this.currentTime)
          ? (audio?.currentTime ?? this.currentTime)
          : 0,
        volume: this.volume,
        playing: this.playing,
        orderMode: this.orderMode,
        updatedAt: now,
      };

      writePersistedState(state);
      this.lastPersistedAt = now;
    },

    getEventClientPos(this: MusicPlayerState, event: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
      if ("touches" in event) {
        const touch = event.touches[0] || event.changedTouches[0];
        return { clientX: touch.clientX, clientY: touch.clientY };
      }
      return { clientX: (event as MouseEvent).clientX, clientY: (event as MouseEvent).clientY };
    },

    onDragStart(this: MusicPlayerState, event: MouseEvent | TouchEvent) {
      const player = this.$refs?.player;
      if (!player) return;

      event.preventDefault();
      const pos = this.getEventClientPos(event);
      this.dragState.isDragging = true;
      this.dragState.startX = pos.clientX;
      this.dragState.startY = pos.clientY;

      const rect = player.getBoundingClientRect();
      this.dragState.initialLeft = rect.left;
      this.dragState.initialTop = rect.top;

      if ("touches" in event) {
        document.addEventListener("touchmove", this.onDragMove.bind(this), { passive: false });
        document.addEventListener("touchend", this.onDragEnd.bind(this));
        document.addEventListener("touchcancel", this.onDragEnd.bind(this));
      } else {
        document.addEventListener("mousemove", this.onDragMove.bind(this));
        document.addEventListener("mouseup", this.onDragEnd.bind(this));
      }
    },

    onDragMove(this: MusicPlayerState, event: MouseEvent | TouchEvent) {
      if (!this.dragState.isDragging) return;

      const player = this.$refs?.player;
      if (!player) return;

      event.preventDefault();
      const pos = this.getEventClientPos(event);
      const deltaX = pos.clientX - this.dragState.startX;
      const deltaY = pos.clientY - this.dragState.startY;

      const newLeft = this.dragState.initialLeft + deltaX;
      const newTop = this.dragState.initialTop + deltaY;

      const clamped = this.clampPositionToViewport(newLeft, newTop);
      this.playerPosition.left = clamped.left;
      this.playerPosition.top = clamped.top;

      // 用户手动拖拽后位置以新位置为准，展开前的位置不再恢复
      this.preExpandPosition = null;
    },

    onDragEnd(this: MusicPlayerState) {
      if (!this.dragState.isDragging) return;

      this.dragState.isDragging = false;
      this.savePlayerPosition();

      document.removeEventListener("mousemove", this.onDragMove.bind(this));
      document.removeEventListener("mouseup", this.onDragEnd.bind(this));
      document.removeEventListener("touchmove", this.onDragMove.bind(this));
      document.removeEventListener("touchend", this.onDragEnd.bind(this));
      document.removeEventListener("touchcancel", this.onDragEnd.bind(this));
    },

    savePlayerPosition(this: MusicPlayerState) {
      try {
        localStorage.setItem(PLAYER_POSITION_KEY, JSON.stringify(this.playerPosition));
      } catch {
        console.error("Failed to save player position");
      }
    },

    restorePlayerPosition(this: MusicPlayerState) {
      try {
        const saved = localStorage.getItem(PLAYER_POSITION_KEY);
        if (!saved) return;

        const position: unknown = JSON.parse(saved);
        if (!isRecord(position)) return;

        const { left, top } = position;
        if (typeof left !== "number" || typeof top !== "number" || !Number.isFinite(left) || !Number.isFinite(top)) {
          return;
        }

        // 打开前校验可视区域边界：恢复的位置若超出当前窗口（所在显示器的可视区域）
        // 的任意边界，则修正坐标，确保播放器完整显示在可视区域内
        const clamped = this.clampPositionToViewport(left, top);
        this.playerPosition = clamped;

        // 位置被边界修正过时，同步修正持久化的值，避免每次打开都越界
        if (clamped.left !== left || clamped.top !== top) {
          this.savePlayerPosition();
        }
      } catch {
        console.error("Failed to restore player position");
      }
    },

    resetPlayerPosition(this: MusicPlayerState) {
      this.playerPosition = { left: null, top: null };
      this.preExpandPosition = null;
      try {
        localStorage.removeItem(PLAYER_POSITION_KEY);
      } catch {
        console.error("Failed to reset player position");
      }
    },

    clampPositionToViewport(
      this: MusicPlayerState,
      left: number,
      top: number,
      width?: number,
      height?: number,
    ): { left: number; top: number } {
      // window.innerWidth/innerHeight 是当前浏览器窗口在其所在显示器上的可视区域，
      // 且使用 CSS 像素，天然兼容不同分辨率与 DPI 缩放比例
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const player = this.$refs?.player ?? document.getElementById("music-player");
      const playerWidth = width ?? player?.offsetWidth ?? 0;
      const playerHeight = height ?? player?.offsetHeight ?? 0;

      // 播放器比可视区域还大时退化为左上对齐，保证左上角可见
      const maxLeft = Math.max(0, viewportWidth - playerWidth);
      const maxTop = Math.max(0, viewportHeight - playerHeight);

      return {
        left: Math.min(Math.max(left, 0), maxLeft),
        top: Math.min(Math.max(top, 0), maxTop),
      };
    },

    ensurePlayerInViewport(this: MusicPlayerState, persist = false) {
      const { left, top } = this.playerPosition;
      if (left === null || top === null) return;

      const clamped = this.clampPositionToViewport(left, top);
      if (clamped.left !== left || clamped.top !== top) {
        this.playerPosition = clamped;
        if (persist) {
          this.savePlayerPosition();
        }
      }
    },

    clampExpandedPosition(this: MusicPlayerState) {
      const { left, top } = this.playerPosition;
      if (left === null || top === null) return;

      // 先按展开后的预估尺寸修正，避免展开动画期间溢出可视区域
      this.$nextTick?.(() => {
        const player = this.$refs?.player ?? document.getElementById("music-player");
        const panel = player?.querySelector(".expand-panel");

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const expandedWidth =
          viewportWidth <= PLAYER_MOBILE_BREAKPOINT
            ? Math.min(viewportWidth, PLAYER_EXPANDED_WIDTH_MOBILE)
            : Math.min(viewportWidth * PLAYER_EXPANDED_WIDTH_RATIO, PLAYER_EXPANDED_WIDTH);

        // x-collapse 动画期间面板自身高度在变化，但其 scrollHeight 始终是完整内容高度
        const panelHeight = panel?.scrollHeight ?? 0;
        const playlistHeight = this.showPlaylist
          ? Math.min(PLAYLIST_MAX_HEIGHT, this.playlist.length * PLAYLIST_ITEM_HEIGHT)
          : 0;
        const expandedHeight = Math.min(
          PLAYER_COLLAPSED_HEIGHT + panelHeight + playlistHeight,
          viewportHeight * PLAYER_EXPANDED_MAX_HEIGHT_RATIO,
        );

        const clamped = this.clampPositionToViewport(left, top, expandedWidth, expandedHeight);
        if (clamped.left !== this.playerPosition.left || clamped.top !== this.playerPosition.top) {
          this.playerPosition = clamped;
        }
      });

      // 展开动画结束后再按实际渲染尺寸校验一次，作为兜底
      if (this.viewportClampTimer !== null) {
        window.clearTimeout(this.viewportClampTimer);
      }
      this.viewportClampTimer = window.setTimeout(() => {
        this.viewportClampTimer = null;
        this.ensurePlayerInViewport(false);
      }, EXPAND_TRANSITION_MS);
    },

    destroy(this: MusicPlayerState) {
      if (this.onViewportResize) {
        window.removeEventListener("resize", this.onViewportResize);
        this.onViewportResize = null;
      }
      if (this.viewportClampTimer !== null) {
        window.clearTimeout(this.viewportClampTimer);
        this.viewportClampTimer = null;
      }
    },
  };
}

export function registerMusicPlayer(alpine: typeof Alpine) {
  alpine.data("musicPlayer", musicPlayer);
}
