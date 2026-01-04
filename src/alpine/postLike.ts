import type Alpine from "alpinejs";

export function registerPostLike(alpine: typeof Alpine) {
  alpine.data("postLike", () => ({
    count: 0,
    liked: false,
    loading: false,
    postName: "",

    init() {
      const el = this.$el as HTMLElement;
      this.postName = el.dataset.name || "";
      this.count = parseInt(el.dataset.count || "0", 10);

      if (this.postName) {
        const likedPosts = JSON.parse(localStorage.getItem("liked_posts") || "{}");
        this.liked = !!likedPosts[this.postName];
      }
    },

    async toggleLike() {
      if (this.loading || !this.postName || this.liked) return;

      this.loading = true;
      try {
        const res = await fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group: "content.halo.run",
            plural: "posts",
            name: this.postName,
          }),
        });

        if (res.ok) {
          const likedPosts = JSON.parse(localStorage.getItem("liked_posts") || "{}");
          likedPosts[this.postName] = true;
          localStorage.setItem("liked_posts", JSON.stringify(likedPosts));
          this.liked = true;
          this.count++;
        }
      } catch (err) {
        console.error("点赞失败:", err);
      } finally {
        this.loading = false;
      }
    },
  }));
}
