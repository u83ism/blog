import type { Post, PostEntry } from '../types/post';

/** 下書きの扱いに関するオプション */
export type DraftOptions = {
  /** true なら下書きも結果に含める（ローカル開発時） */
  readonly includeDrafts: boolean;
  /** 日付未定の下書きに仮で割り当てる日付 */
  readonly fallbackDate: Date;
};

/** 日付未定の下書きに仮の日付を割り当てる */
const toPost = (entry: PostEntry, fallbackDate: Date): Post => ({
  ...entry,
  data: { ...entry.data, date: entry.data.date ?? fallbackDate },
});

/**
 * 記事一覧を表示用に正規化する
 * - includeDrafts が false なら下書きを除外する
 * - 日付未定の下書きには fallbackDate を割り当てる
 */
export const normalizePosts = (
  entries: readonly PostEntry[],
  options: DraftOptions,
): readonly Post[] =>
  entries
    .filter((entry) => options.includeDrafts || !entry.data.draft)
    .map((entry) => toPost(entry, options.fallbackDate));
