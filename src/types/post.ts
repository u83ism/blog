import type { CollectionEntry } from 'astro:content';

/** コレクションから読み込んだ生の記事（下書きは date を省略できる） */
export type PostEntry = CollectionEntry<'posts'>;

/** 表示用に正規化した記事（date が必ず存在する） */
export type Post = PostEntry & { readonly data: { readonly date: Date } };
