/**
 * 移行コンテンツの整形修正スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-content.ts
 *
 * 処理内容:
 *   1. 4スペース以上インデントの折り返し行を前の行に結合
 *   2. 単一改行を段落区切り（空行）に変換
 *   3. 全角英数字を半角に変換（記号は対象外）
 *
 * 対象: 2003〜2014年（2000〜2002は手動修正済み）
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const POSTS_DIR = resolve(__dirname, '..', 'src', 'content', 'posts');

const TARGET_YEARS = Array.from({ length: 12 }, (_, i) => String(2003 + i));

function processBody(body: string): string {
  // 4スペース以上で始まる折り返し行を前の行に結合（末尾の余分な空白も除去）
  let result = body.replace(/[ \t]*\n {4,}/g, ' ');

  // 単一改行を段落区切り（空行）に変換
  result = result.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

  // 3連続以上の改行を2連続に正規化
  result = result.replace(/\n{3,}/g, '\n\n');

  // 全角英数字を半角に変換（全角記号・括弧は対象外）
  result = result.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );

  return result;
}

function processContent(content: string): string {
  // フロントマター（---〜---）は変更しない
  const match = content.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!match) return processBody(content);
  return match[1] + processBody(match[2]);
}

let updatedCount = 0;
let unchangedCount = 0;

for (const year of TARGET_YEARS) {
  const dir = join(POSTS_DIR, year);
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    continue;
  }

  for (const file of files) {
    const filePath = join(dir, file);
    const original = readFileSync(filePath, 'utf-8');
    const updated = processContent(original);

    if (updated !== original) {
      writeFileSync(filePath, updated, 'utf-8');
      console.log(`✓ ${join(year, file)}`);
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }
}

console.log(`\n処理完了: ${updatedCount}件更新、${unchangedCount}件変更なし`);
