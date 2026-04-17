/**
 * CommonMarkの太字レンダリング問題を修正するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/fix-bold.ts
 *
 * 問題:
 *   CommonMarkの右フランキング規則により、閉じ ** の直前がUnicode句読点（！？。）など）で
 *   直後が空白でも句読点でもない文字の場合、** がリテラルとして出力される。
 *
 * 修正方法:
 *   閉じ ** の直後にスペースを追加することで右フランキング条件（2b）を満たす。
 *   例: `！！！**の` → `！！！** の`
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const POSTS_DIR = resolve(__dirname, '..', 'src', 'content', 'posts');

/** Unicode句読点かどうか判定 */
function isUnicodePunctuation(char: string): boolean {
  return /\p{P}/u.test(char);
}

/**
 * テキスト内の太字パターンを修正する
 * - コンテンツ末尾の空白を除去 → 閉じ ** の直前が空白だと条件1違反
 * - 閉じ ** の直前が句読点かつ直後が非空白 → 閉じ ** の後にスペースを追加
 * - 開き ** の直前が非空白/非句読点かつ直後が句読点 → 開き ** の前にスペースを追加
 */
function fixBoldText(text: string): string {
  // パス1: コンテンツ末尾の空白を除去（例: **神作 ** → **神作**）
  // 閉じ ** の直前が空白だと右フランキング条件1違反になる
  let result = text.replace(/\*\*([^*\n]+?) +\*\*/gu, '**$1**');

  // パス2: 閉じ ** 修正（例: ！**の → ！** の）
  result = result.replace(
    /\*\*([^*\n]+?)\*\*([^\s*\n])/gu,
    (_match, content: string, charAfter: string) => {
      const lastChar = content[content.length - 1];
      // 直前が句読点 OR 直後が句読点 のどちらかで右フランキング条件を満たさない
      if (isUnicodePunctuation(lastChar) || isUnicodePunctuation(charAfter)) {
        return `**${content}** ${charAfter}`;
      }
      return `**${content}**${charAfter}`;
    }
  );

  // パス3: 開き ** 修正（例: は**！ → は **！）
  result = result.replace(
    /([^\s])(\*\*)(\p{P})/gu,
    (_match, charBefore: string, stars: string, charAfter: string) => {
      if (!isUnicodePunctuation(charBefore)) {
        return `${charBefore} ${stars}${charAfter}`;
      }
      return `${charBefore}${stars}${charAfter}`;
    }
  );

  return result;
}

/** 1ファイルを処理し、変更があればtrueを返す */
function fixFile(filePath: string): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const fixed = fixBoldText(original);
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
  console.log('🔍 太字パターンを修正中...\n');
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
