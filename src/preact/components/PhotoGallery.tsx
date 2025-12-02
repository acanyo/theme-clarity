import { useState, useEffect, useRef } from "preact/hooks";

interface Photo {
  url: string;
  cover?: string;
  displayName?: string;
  description?: string;
  groupName?: string;
}

interface PhotoGroup {
  name: string;
  displayName: string;
  photoCount: number;
  photos: Photo[];
}

interface Props {
  groups: PhotoGroup[];
}

export function PhotoGallery({ groups }: Props) {
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [visiblePhotos, setVisiblePhotos] = useState<Photo[]>([]);
  const [loadedCount, setLoadedCount] = useState(20);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 获取所有图片
  const allPhotos = groups.flatMap((g) =>
    g.photos.map((p) => ({ ...p, groupName: g.name }))
  );

  // 根据分类筛选图片
  const filteredPhotos =
    activeGroup === "all"
      ? allPhotos
      : allPhotos.filter((p) => p.groupName === activeGroup);

  // 更新可见图片
  useEffect(() => {
    setVisiblePhotos(filteredPhotos.slice(0, loadedCount));
  }, [activeGroup, loadedCount, groups]);

  // 无限滚动加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && loadedCount < filteredPhotos.length) {
          setLoadedCount((prev) => Math.min(prev + 12, filteredPhotos.length));
        }
      },
      { rootMargin: "200px" }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [filteredPhotos.length, loadedCount]);

  // 切换分类时重置加载数量
  const handleGroupChange = (groupName: string) => {
    setActiveGroup(groupName);
    setLoadedCount(20);
  };

  // 打开 Fancybox
  const openLightbox = (_photo: Photo, index: number) => {
    const items = filteredPhotos.map((p) => ({
      src: p.url,
      caption: p.displayName || "",
    }));
    // @ts-ignore
    if (window.Fancybox) {
      // @ts-ignore
      window.Fancybox.show(items, { startIndex: index });
    }
  };

  return (
    <div class="photo-gallery">
      {/* 分类标签 */}
      <div class="photo-tabs">
        <button
          class={`photo-tab ${activeGroup === "all" ? "active" : ""}`}
          onClick={() => handleGroupChange("all")}
        >
          <span class="icon-[ph--squares-four-bold]"></span>
          全部
          <span class="tab-count">{allPhotos.length}</span>
        </button>
        {groups.map((group) => (
          <button
            key={group.name}
            class={`photo-tab ${activeGroup === group.name ? "active" : ""}`}
            onClick={() => handleGroupChange(group.name)}
          >
            <span class="icon-[ph--folder-bold]"></span>
            {group.displayName}
            <span class="tab-count">{group.photoCount}</span>
          </button>
        ))}
      </div>

      {/* 瀑布流图片 */}
      <div class="photo-masonry">
        {visiblePhotos.map((photo, index) => (
          <figure
            key={`${photo.groupName}-${index}`}
            class="photo-item"
            onClick={() => openLightbox(photo, index)}
          >
            <img
              src={photo.cover || photo.url}
              alt={photo.displayName || ""}
              loading="lazy"
              decoding="async"
            />
            {photo.displayName && <figcaption>{photo.displayName}</figcaption>}
          </figure>
        ))}
      </div>

      {/* 加载更多触发器 */}
      {loadedCount < filteredPhotos.length && (
        <div ref={loaderRef} class="photo-loader">
          <span class="icon-[ph--spinner-bold] animate-spin"></span>
          加载中...
        </div>
      )}

      {/* 无图片提示 */}
      {filteredPhotos.length === 0 && (
        <div class="empty-state">
          <span class="icon-[ph--image-broken-bold]"></span>
          <p>暂无图片</p>
        </div>
      )}

      {/* 加载完成提示 */}
      {loadedCount >= filteredPhotos.length && filteredPhotos.length > 0 && (
        <div class="photo-end">已加载全部 {filteredPhotos.length} 张图片</div>
      )}
    </div>
  );
}
