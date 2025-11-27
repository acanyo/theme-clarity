export interface ThemeConfig {
  development: Development;
  post: Post;
}

export interface Development {
  enabled: boolean;
}

export interface Post {
  content_theme: string;
  content_size: string;
}
