// RSSフィードエンドポイント
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { resolveTitle, sortPostsByDateDesc } from '@/lib/posts';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const allPosts = await getCollection('posts');
  const sorted = sortPostsByDateDesc(allPosts);

  return rss({
    title: 'u83 said so.',
    description: '2000年代から続くゆうやみの個人雑記ブログ。',
    site: context.site!,
    items: sorted.map((post) => ({
      title: resolveTitle(post),
      pubDate: post.data.date,
      link: `/blog/posts/${post.id.replace(/\.mdx?$/, '')}/`,
    })),
  });
}
