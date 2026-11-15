import { getCollection } from 'astro:content';
import type { Post } from '../types/post';
import { normalizePosts } from './post-draft';

/**
 * 記事一覧を読み込む（Effect: コレクション読み込み・環境変数・現在日時に依存）
 * - 開発サーバー（npm run dev）では下書きも含める
 * - ビルド（本番・ブランチプレビュー）では下書きを除外する
 * - 日付未定の下書きには現在日時を仮の日付として割り当てる
 */
export const loadPosts = async (): Promise<readonly Post[]> =>
  normalizePosts(await getCollection('posts'), {
    includeDrafts: import.meta.env.DEV,
    fallbackDate: new Date(),
  });
