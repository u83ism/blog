import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 雑記エントリのコレクション定義（Astro 6: glob ローダーを使用）
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    // 投稿日付（必須）
    date: z.date(),
    // タグ一覧（省略時は空配列）
    tags: z.array(z.string()).default([]),
    // タイトル（省略時は date から自動生成: YYYY年MM月DD日）
    title: z.string().optional(),
  }),
});

export const collections = { posts };
