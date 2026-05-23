import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGithubAlerts from 'remark-github-alerts';
import { rehypeImageLink } from './src/lib/rehype-image-link';

// https://astro.build/config
export default defineConfig({
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGithubAlerts],
    rehypePlugins: [rehypeImageLink],
  },
  // ホバー時にページを事前取得してページ遷移を高速化
  prefetch: true,
  // GitHub Pagesのリポジトリ名をbaseとして設定
  base: '/blog',
  site: 'https://u83ism.github.io',
  output: 'static',
  // trailingSlash: 'always' により import.meta.env.BASE_URL = '/blog/' となる
  trailingSlash: 'always',
});
