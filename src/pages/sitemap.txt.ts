import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildPostUrl, collectTags, groupPostsByYear, groupPostsByMonth } from '@/lib/posts';

const PAGE_SIZE = 20;

export const GET: APIRoute = async ({ site }) => {
  const allPosts = await getCollection('posts');
  const base = import.meta.env.BASE_URL;

  // サイトのベースURL（末尾スラッシュあり）例: https://u83ism.github.io/blog/
  const sitemapBase = new URL(base, site).href;

  const urls: string[] = [];

  // 主要ページ
  urls.push(sitemapBase);
  urls.push(`${sitemapBase}tags/`);
  urls.push(`${sitemapBase}archive/`);
  urls.push(`${sitemapBase}sitemap/`);

  // ページネーション（2ページ目以降）
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  for (let page = 2; page <= totalPages; page++) {
    urls.push(`${sitemapBase}page/${page}/`);
  }

  // 全記事ページ
  for (const post of allPosts) {
    urls.push(`${sitemapBase}${buildPostUrl('', post.id)}`);
  }

  // タグ別一覧ページ
  const tags = collectTags(allPosts);
  for (const { tag } of tags) {
    urls.push(`${sitemapBase}tags/${encodeURIComponent(tag)}/`);
  }

  // 年別・月別アーカイブページ
  const yearGroups = groupPostsByYear(allPosts);
  for (const { year, posts: yearPosts } of yearGroups) {
    urls.push(`${sitemapBase}archive/${year}/`);
    const monthGroups = groupPostsByMonth(yearPosts);
    for (const { month } of monthGroups) {
      const monthPadded = String(month).padStart(2, '0');
      urls.push(`${sitemapBase}archive/${year}/${monthPadded}/`);
    }
  }

  return new Response(urls.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
