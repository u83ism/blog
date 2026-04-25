import type { CollectionEntry } from 'astro:content';

/** date から YYYY年MM月DD日 形式のタイトルを生成する */
export function formatDateTitle(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

/** date を YYYY/MM/DD 形式の文字列に変換する */
export function formatDateDisplay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/** 記事のタイトルを取得する（title が省略時は日付から自動生成） */
export function resolveTitle(post: CollectionEntry<'posts'>): string {
  return post.data.title ?? formatDateTitle(post.data.date);
}

/** 記事 id から個別ページURLを生成する（Astro 5 では id に .md 拡張子が含まれる） */
export function buildPostUrl(base: string, id: string): string {
  const slug = id.replace(/\.mdx?$/, '');
  return `${base}posts/${slug}/`;
}

/** 記事を日付降順でソートする */
export function sortPostsByDateDesc(
  posts: readonly CollectionEntry<'posts'>[],
): CollectionEntry<'posts'>[] {
  return [...posts].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

/** 記事からすべてのタグを集計し、出現数降順で返す */
export function collectTags(
  posts: readonly CollectionEntry<'posts'>[],
): { tag: string; count: number }[] {
  const counter = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counter.set(tag, (counter.get(tag) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ja'));
}

/** 記事を年ごとにグループ化する（降順） */
export function groupPostsByYear(
  posts: readonly CollectionEntry<'posts'>[],
): { year: number; posts: CollectionEntry<'posts'>[] }[] {
  const groups = new Map<number, CollectionEntry<'posts'>[]>();
  for (const post of posts) {
    const year = post.data.date.getFullYear();
    const group = groups.get(year) ?? [];
    group.push(post);
    groups.set(year, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearPosts]) => ({ year, yearPosts: sortPostsByDateDesc(yearPosts) }))
    .map(({ year, yearPosts }) => ({ year, posts: yearPosts }));
}

/** Markdownの記法記号を除いた文字数から読了時間（分）を推定する（日本語: 500字/分） */
export function estimateReadingTime(body: string): number {
  const stripped = body.replace(/```[\s\S]*?```/g, '').replace(/[#*`~_>\-\[\]()!|]/g, '');
  const charCount = stripped.replace(/\s+/g, '').length;
  return Math.max(1, Math.ceil(charCount / 500));
}

/** 共通タグ数が多い順に関連記事を返す（自記事を除く） */
export function findRelatedPosts(
  current: CollectionEntry<'posts'>,
  posts: readonly CollectionEntry<'posts'>[],
  limit: number = 5,
): CollectionEntry<'posts'>[] {
  const currentTags = new Set(current.data.tags);
  return posts
    .filter((p) => p.id !== current.id)
    .map((p) => ({
      post: p,
      score: p.data.tags.filter((t) => currentTags.has(t)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.date.getTime() - a.post.data.date.getTime())
    .slice(0, limit)
    .map(({ post }) => post);
}

/** 記事を月ごとにグループ化する（降順） */
export function groupPostsByMonth(
  posts: readonly CollectionEntry<'posts'>[],
): { month: number; posts: CollectionEntry<'posts'>[] }[] {
  const groups = new Map<number, CollectionEntry<'posts'>[]>();
  for (const post of posts) {
    const month = post.data.date.getMonth() + 1;
    const group = groups.get(month) ?? [];
    group.push(post);
    groups.set(month, group);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([month, monthPosts]) => ({ month, posts: sortPostsByDateDesc(monthPosts) }));
}
