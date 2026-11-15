import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PostEntry } from '../types/post';
import { normalizePosts } from './post-draft';

// テスト用の記事エントリを組み立てる
const buildEntry = (id: string, data: Partial<PostEntry['data']>): PostEntry =>
  ({
    id,
    collection: 'posts',
    body: '',
    data: { tags: [], draft: false, ...data },
  }) as unknown as PostEntry;

const fallbackDate = new Date('2026-11-15T00:00:00Z');
const published = buildEntry('2026/2026-11-15', { date: new Date('2026-11-15') });
const datedDraft = buildEntry('2026/2026-12-01', { date: new Date('2026-12-01'), draft: true });
const undatedDraft = buildEntry('drafts/sociology', { draft: true });
const entries = [published, datedDraft, undatedDraft];

test('includeDrafts が false なら下書きを除外する', () => {
  const posts = normalizePosts(entries, { includeDrafts: false, fallbackDate });
  assert.deepEqual(posts.map((post) => post.id), ['2026/2026-11-15']);
});

test('includeDrafts が true なら下書きも含める', () => {
  const posts = normalizePosts(entries, { includeDrafts: true, fallbackDate });
  assert.deepEqual(posts.map((post) => post.id), ['2026/2026-11-15', '2026/2026-12-01', 'drafts/sociology']);
});

test('日付未定の下書きには fallbackDate を割り当てる', () => {
  const [post] = normalizePosts([undatedDraft], { includeDrafts: true, fallbackDate });
  assert.equal(post?.data.date, fallbackDate);
});

test('日付がある記事の日付は変えない', () => {
  const posts = normalizePosts([published, datedDraft], { includeDrafts: true, fallbackDate });
  assert.deepEqual(
    posts.map((post) => post.data.date.toISOString()),
    ['2026-11-15T00:00:00.000Z', '2026-12-01T00:00:00.000Z'],
  );
});

test('元の記事エントリを変更しない', () => {
  normalizePosts([undatedDraft], { includeDrafts: true, fallbackDate });
  assert.equal(undatedDraft.data.date, undefined);
});
