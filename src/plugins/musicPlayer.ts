/**
 * 音乐胶囊播放器 Alpine.js 组件
 */

interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  lrc?: string;
}

interface Lyric {
  time: number;
  text: string;
}

interface MusicConfig {
  server: string;
  type: string;
  id: string;
  api_url?: string;
  custom_params?: string;
  order: "list" | "random";
  volume: number;
  autoplay: boolean;
  showLrc: boolean;
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
  orderMode: "list" | "random";
  lyrics: Lyric[];
  currentLyricIndex: number;
  lyricsOffset: number;
  api_url?: string;
  custom_params?: string;
  
  currentSong: Song | null;
  progress: number;

  init(this: MusicPlayerState): Promise<void>;
  loadPlaylist(this: MusicPlayerState, server: string, type: string, id: string, api_url?: string): Promise<void>;
  resolveSongUrl(this: MusicPlayerState, index: number): Promise<void>;
  loadLyrics(this: MusicPlayerState, lrcUrl: string): Promise<void>;
  parseLrc(lrcText: string): Lyric[];
  togglePlay(this: MusicPlayerState): void;
  play(this: MusicPlayerState): void;
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
  formatTime(seconds: number): string;
  onTimeUpdate(this: MusicPlayerState): void;
  onLoaded(this: MusicPlayerState): void;
  onEnded(this: MusicPlayerState): void;
  onError(this: MusicPlayerState): Promise<void>;
  updateLyrics(this: MusicPlayerState): void;
  setupMediaSession(this: MusicPlayerState): void;
  updateMediaSession(this: MusicPlayerState): void;
  $refs?: { audio: HTMLAudioElement };
  $nextTick?(callback: () => void): void;
}

export function musicPlayer() {
  return {
    // 状态
    expanded: false,
    playing: false,
    loading: false,
    showPlaylist: false,
    currentAudioUrl: "", // 真实的播放地址

    // 播放数据
    playlist: [] as Song[],
    currentIndex: 0,
    currentTime: 0,
    duration: 0,
    volume: 70,
    orderMode: "list" as "list" | "random",

    // 歌词
    lyrics: [] as Lyric[],
    currentLyricIndex: 0,
    lyricsOffset: 0,

    // 计算属性
    get currentSong(): Song | null {
      return this.playlist[this.currentIndex] || null;
    },

    get progress(): number {
      return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    },

    // 初始化
    async init(this: MusicPlayerState) {
      const config = (window as any).MUSIC_CONFIG as MusicConfig | undefined;
      if (!config || !config.id) return;
      this.volume = config.volume || 70;
      this.orderMode = config.order || "list";
      this.api_url = config.api_url;
      this.custom_params = config.custom_params;

      // 加载歌单
      await this.loadPlaylist(config.server, config.type, config.id, config.api_url);

      // 设置音量
      const audio = this.$refs?.audio;
      if (audio) {
        audio.volume = this.volume / 100;
      }

      // 自动播放
      if (config.autoplay && this.playlist.length > 0) {
        this.play();
      }

      // 监听媒体会话
      this.setupMediaSession();
    },

    // 加载歌单
    async loadPlaylist(this: MusicPlayerState, server: string, type: string, id: string, api_url?: string) {
      this.loading = true;
      try {
        // 使用配置的 API 地址，如果没有则使用默认地址
        const baseUrl = api_url || "https://api.i-meto.com/meting/api";
        let apiUrl = `${baseUrl}?server=${server}&type=${type}&id=${id}`;
        
        // 拼接自定义参数
        if (this.custom_params) {
          apiUrl += `&${this.custom_params}`;
        }
        const response = await fetch(apiUrl);

        if (!response.ok) throw new Error("Failed to fetch playlist");

        const data = await response.json();

        // 仅保存原始 URL，不进行预解析
        this.playlist = data.map((item: any) => ({
          id: item.id || String(Math.random()),
          title: item.title || item.name || "未知歌曲",
          artist: item.author || item.artist || "未知歌手",
          cover: item.pic || item.cover || "",
          url: item.url, // 原始 URL（可能含重定向）
          lrc: item.lrc,
        }));

        if (this.orderMode === "random") {
          this.shufflePlaylist();
        }

        // 如果有自动播放
        const config = (window as any).MUSIC_CONFIG;
        if (config?.autoplay && this.playlist.length > 0) {
          // 加载歌词
          if (this.currentSong?.lrc) {
            await this.loadLyrics(this.currentSong.lrc);
          }
          // 尝试播放（如果失败会触发 onError -> resolveSongUrl）
          this.play();
        } else if (this.playlist.length > 0 && this.playlist[0].lrc) {
          // 即使不播放，也加载第一首歌的歌词用于显示
          await this.loadLyrics(this.playlist[0].lrc);
        }
      } catch (error) {
        console.error("Failed to load playlist:", error);
      } finally {
        this.loading = false;
      }
    },

    // 解析真实歌曲 URL
    async resolveSongUrl(this: MusicPlayerState, index: number) {
      const song = this.playlist[index];
      if (!song) return;

      // 标记已尝试解析，防止 onError 死循环
      (song as any)._resolved = true;

      // 如果已经解析过且有效，直接使用
      if ((song as any)._realUrl) {
        this.currentAudioUrl = (song as any)._realUrl;
        return;
      }

      let url = song.url;
      const defaultApi = "api.i-meto.com";
      
      // 判断是否需要解析：如果是 Meting API 的链接（默认或自定义）
      const needsResolve = url && (
        url.includes(defaultApi) || 
        (this.api_url && url.includes(new URL(this.api_url).hostname)) ||
        url.includes("server=")
      );

      if (needsResolve) {
        try {
          // 添加时间戳防止缓存，并拼接自定义参数
          let fetchUrl = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
          if (this.custom_params) {
            fetchUrl += `&${this.custom_params}`;
          }
          const response = await fetch(fetchUrl);
          
          // 如果返回的是 JSON
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data.url) url = data.url;
          } else {
            // 否则假设是重定向后的 URL
            url = response.url;
          }
        } catch (e) {
          console.warn("Failed to resolve URL for:", song.title, e);
        }
      }
      
      // 缓存解析结果
      (song as any)._realUrl = url;
      this.currentAudioUrl = url;
    },

    // 加载歌词
    async loadLyrics(this: MusicPlayerState, lrcUrl: string) {
      try {
        // 拼接自定义参数
        let fetchUrl = lrcUrl;
        if (this.custom_params && lrcUrl.includes("?")) {
          fetchUrl += `&${this.custom_params}`;
        } else if (this.custom_params) {
          fetchUrl += `?${this.custom_params}`;
        }
        const response = await fetch(fetchUrl);
        const lrcText = await response.text();
        this.lyrics = this.parseLrc(lrcText);
      } catch {
        this.lyrics = [];
      }
    },

    // 解析 LRC 歌词
    parseLrc(this: MusicPlayerState, lrcText: string): Lyric[] {
      const lines = lrcText.split("\n");
      const result: Lyric[] = [];
      const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

      for (const line of lines) {
        const matches = [...line.matchAll(timeRegex)];
        const text = line.replace(timeRegex, "").trim();

        if (matches.length > 0 && text) {
          for (const match of matches) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
            const time = minutes * 60 + seconds + ms / 1000;
            result.push({ time, text });
          }
        }
      }

      return result.sort((a, b) => a.time - b.time);
    },

    // 播放控制
    togglePlay(this: MusicPlayerState) {
      this.playing ? this.pause() : this.play();
    },

    play(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (audio && this.currentSong) {
        audio.play().catch(() => console.warn("Autoplay blocked"));
        this.playing = true;
      }
    },

    pause(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (audio) {
        audio.pause();
        this.playing = false;
      }
    },

    prev(this: MusicPlayerState) {
      if (this.playlist.length === 0) return;
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      this.onSongChange();
    },

    next(this: MusicPlayerState) {
      if (this.playlist.length === 0) return;
      if (this.orderMode === "random") {
        this.currentIndex = Math.floor(Math.random() * this.playlist.length);
      } else {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      }
      this.onSongChange();
    },

    playSong(this: MusicPlayerState, index: number) {
      this.currentIndex = index;
      this.onSongChange();
    },

    async onSongChange(this: MusicPlayerState) {
      this.pause(); // 切换时先暂停
      this.currentTime = 0;
      this.currentLyricIndex = 0;
      this.lyricsOffset = 0;

      // 解析真实 URL 并赋值给 currentAudioUrl
      await this.resolveSongUrl(this.currentIndex);

      if (this.currentSong?.lrc) {
        await this.loadLyrics(this.currentSong.lrc);
      } else {
        this.lyrics = [];
      }

      this.$nextTick?.(() => {
        this.play();
      });

      this.updateMediaSession();
    },

    toggleOrder(this: MusicPlayerState) {
      this.orderMode = this.orderMode === "list" ? "random" : "list";
    },

    shufflePlaylist(this: MusicPlayerState) {
      for (let i = this.playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
      }
    },

    seek(this: MusicPlayerState, event: MouseEvent) {
      const bar = event.currentTarget as HTMLElement;
      const rect = bar.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const audio = this.$refs?.audio;
      if (audio && this.duration > 0) {
        audio.currentTime = percent * this.duration;
      }
    },

    setVolume(this: MusicPlayerState, value: string | number) {
      this.volume = Number(value);
      const audio = this.$refs?.audio;
      if (audio) {
        audio.volume = this.volume / 100;
      }
    },

    toggleExpand(this: MusicPlayerState) {
      this.expanded = !this.expanded;
    },

    formatTime(this: MusicPlayerState, seconds: number): string {
      if (!seconds || isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    },

    // 音频事件
    onTimeUpdate(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (audio) {
        this.currentTime = audio.currentTime;
        this.updateLyrics();
      }
    },

    onLoaded(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      if (audio) {
        this.duration = audio.duration;
      }
    },

    onEnded(this: MusicPlayerState) {
      this.next();
    },

    async onError(this: MusicPlayerState) {
      const audio = this.$refs?.audio;
      const err = audio?.error;
    
      if (!this.currentAudioUrl || this.currentAudioUrl === window.location.href) {
        return;
      }

      console.error("Audio playback error:", {
        code: err?.code,
        message: err?.message,
        src: audio?.src,
        currentUrl: this.currentAudioUrl
      });

      const song = this.currentSong;
      if (song && !(song as any)._resolved) {
        console.warn("Trying to resolve URL again...");
        await this.resolveSongUrl(this.currentIndex);
        
        // 重新加载音频
        if (audio) {
          audio.load();
          if (this.playing) audio.play().catch(e => console.error("Replay failed:", e));
        }
      } else {
        console.error("Skipping to next song due to error");
        setTimeout(() => this.next(), 1000);
      }
    },

    updateLyrics(this: MusicPlayerState) {
      if (this.lyrics.length === 0) return;

      let index = 0;
      for (let i = 0; i < this.lyrics.length; i++) {
        if (this.currentTime >= this.lyrics[i].time) {
          index = i;
        } else {
          break;
        }
      }

      if (index !== this.currentLyricIndex) {
        this.currentLyricIndex = index;
        this.lyricsOffset = 30 - index * 24;
      }
    },

    // 媒体会话
    setupMediaSession(this: MusicPlayerState) {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", () => this.play());
        navigator.mediaSession.setActionHandler("pause", () => this.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
        navigator.mediaSession.setActionHandler("nexttrack", () => this.next());
      }
    },

    updateMediaSession(this: MusicPlayerState) {
      if ("mediaSession" in navigator && this.currentSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.currentSong.title,
          artist: this.currentSong.artist,
          artwork: [{ src: this.currentSong.cover, sizes: "512x512", type: "image/jpeg" }],
        });
      }
    },
  };
}
