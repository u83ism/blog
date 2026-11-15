// RSSフィードエンドポイント
import rss from '@astrojs/rss';
import { loadPosts } from '@/lib/load-posts';
import { resolveTitle, sortPostsByDateDesc } from '@/lib/posts';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const allPosts = await loadPosts();
  const sorted = sortPostsByDateDesc(allPosts);

  return rss({
    title: 'u83 said so.',
    description: '2000年代から続くゆうやみの個人雑記ブログ。',
    site: context.site!,
    items: sorted.map((post) => ({
      title: resolveTitle(post),
      pubDate: post.data.date,
      link: `/posts/${post.id.replace(/\.mdx?$/, '')}/`,
    })),
  });
}
