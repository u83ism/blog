import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { tags } from './lib/tags';

// 雑記エントリのコレクション定義（Astro 6: glob ローダーを使用）
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z
    .object({
      // 投稿日付（公開記事では必須、下書きでは省略可）
      date: z.date().optional(),
      // 下書きフラグ（true なら本番ビルドから除外し、開発サーバーでのみ表示する）
      draft: z.boolean().default(false),
      // タグ一覧（正規タグのみ許可、省略時は空配列）
      tags: z.array(z.enum(tags)).default([]),
      // タイトル（省略時は date から自動生成: YYYY年MM月DD日）
      title: z.string().optional(),
    })
    // 下書きでない記事に date が無ければビルドエラーにする（公開し忘れ防止）
    .refine((data) => data.draft || data.date !== undefined, {
      message: '公開記事には date が必要です（下書きなら draft: true を付けてください）',
      path: ['date'],
    }),
});

export const collections = { posts };
