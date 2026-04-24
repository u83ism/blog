/**
 * 行頭インデント除去スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-indent.ts
 *
 * 問題:
 *   HTML→Markdown変換時に行頭へタブ・半角スペース・全角スペースが残存し、
 *   タブや4スペースはMarkdownのコードブロックとして誤レンダリングされる。
 *
 * 修正方法:
 *   frontmatter以外の行頭に連続する [\t 　]+ を除去する。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const POSTS_DIR = resolve(__dirname, '..', 'src', 'content', 'posts');

/** frontmatterを除いた本文の行頭インデントを除去する */
function stripLeadingIndent(content: string): string {
  // frontmatter（--- で囲まれた先頭ブロック）を切り出す
  const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  if (!frontmatterMatch) return content;

  const frontmatter = frontmatterMatch[0];
  const body = content.slice(frontmatter.length);

  // 行頭のタブ・半角スペース・全角スペースをすべて除去
  const fixedBody = body.replace(/^[\t 　]+/gmu, '');

  return frontmatter + fixedBody;
}

/** 1ファイルを処理し、変更があればtrueを返す */
function fixFile(filePath: string): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const fixed = stripLeadingIndent(original);
  if (fixed === original) return false;
  writeFileSync(filePath, fixed, 'utf-8');
  return true;
}

/** ディレクトリを再帰的に処理する */
function processDirectory(dir: string): readonly string[] {
  const patched: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      patched.push(...processDirectory(fullPath));
    } else if (entry.endsWith('.md')) {
      if (fixFile(fullPath)) {
        patched.push(fullPath.replace(POSTS_DIR, '').replace(/\\/g, '/'));
      }
    }
  }
  return patched;
}

function main(): void {
  console.log('🔍 行頭インデントを除去中...\n');
  const patched = processDirectory(POSTS_DIR);

  if (patched.length === 0) {
    console.log('✅ 修正が必要なファイルはありませんでした');
    return;
  }

  console.log(`✅ ${patched.length} 件のファイルを修正しました:`);
  for (const f of patched) {
    console.log(`  📝 ${f}`);
  }
}

main();
