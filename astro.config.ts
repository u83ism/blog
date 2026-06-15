import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGithubAlerts from 'remark-github-alerts';
import { rehypeImageLink } from './src/lib/rehype-image-link';
import { rehypeImageRow } from './src/lib/rehype-image-row';
import { rehypeCloudinaryResize } from './src/lib/rehype-cloudinary-resize';
import { rehypeXEmbed } from './src/lib/rehype-x-embed';
import { rehypeYoutubeEmbed } from './src/lib/rehype-youtube-embed';

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGithubAlerts],
    rehypePlugins: [rehypeImageLink, rehypeImageRow, rehypeCloudinaryResize, rehypeXEmbed, rehypeYoutubeEmbed],
  },
  // ホバー時にページを事前取得してページ遷移を高速化
  prefetch: true,
  site: 'https://u83-blog.pages.dev',
  output: 'static',
  // trailingSlash: 'always' により import.meta.env.BASE_URL = '/blog/' となる
  trailingSlash: 'always',
});
