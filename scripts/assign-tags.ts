/**
 * 全記事にキーワードベースでタグを自動付与するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/assign-tags.ts           # 実際に書き込む
 *   npx tsx scripts/assign-tags.ts --dry-run  # 変更内容を確認のみ
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAGS, type Tag } from '../src/lib/tags.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const POSTS_DIR = resolve(__dirname, '..', 'src', 'content', 'posts');

// タグ判定ルール: keywords のいずれかが本文に含まれていればタグを付与する
type TagRule = {
  readonly tag: Tag;
  readonly keywords: readonly string[];
};

const TAG_RULES: readonly TagRule[] = [
  {
    tag: '音ゲー',
    keywords: [
      'DDR', 'ビートマニア', 'BM2DX', 'BM2', 'IIDX', 'ドラムマニア',
      'SuperNOVA', '音ゲ', 'ポップン', 'ギタフリ', 'GFDM', 'BEMANI',
      'Fascination', '弐寺', 'MAX300', '激HD', '同時踏み',
    ],
  },
  {
    tag: 'ゲーム',
    keywords: [
      'クリアしました', 'クリアした', 'ゲームクリア',
      'ソフト購入', '積みゲ', 'C2G', 'ゲームソフト', 'ゲーセン', 'ゲーマー',
      'ラスボス', 'レベル上げ', 'SSX', 'ブラックマトリクス',
      'ワイルドアームズ', 'WA2', 'WA3', 'WA4', 'フェイバリットディア',
      'ゲームボーイ', 'モンコレ', 'ガンガンヴァーサス', 'PS2',
      'エクストリームレーシング', 'ラグナロク', 'KOF', 'マヴカプ',
      'ゲームショップ', 'PCゲーム', 'STG',
    ],
  },
  {
    tag: 'プロレス',
    keywords: [
      'プロレス', '21CPB', 'WWE', 'ROH', 'レスラー', '観戦', 'リングサイド',
    ],
  },
  {
    tag: 'アニメ',
    keywords: ['アニメ', 'マンガ', '漫画', '声優', 'OVA', '映画', '最終話', '巻発売'],
  },
  {
    tag: '音楽',
    keywords: ['m-flo', 'キック', 'アルバム', 'シングル', 'PV', 'CD購入', '新曲'],
  },
  {
    tag: '創作',
    keywords: [
      'オリバト', 'オリジナルバトル', 'OBRN', '魔虚楽踊', '七弔', '執筆',
    ],
  },
  {
    tag: '読書',
    keywords: [
      'ライトノベル', '読了', '読み終わ', 'オーフェンはぐれ旅',
      '魔術士オーフェン', '本を読',
    ],
  },
  {
    tag: '日常',
    keywords: [
      '学校', '大学', '授業', 'テスト', '受験', '卒業',
      '仕事', '社会人', '就活', '卒論', 'バイト', 'サークル',
    ],
  },
  {
    tag: 'サイト運営',
    keywords: [
      '更新しました', 'HP更新', 'サイト更新', 'リニューアル', '移転',
      'DLBの方', 'C2Gの方', '21CPBの方', 'OBRNの方', 'コンテンツ更新',
      '周年',
    ],
  },
  {
    tag: 'Web技術',
    keywords: ['CSS', 'JavaScript', 'HTML', 'ブラウザ', 'jQuery', 'PHP'],
  },
];

/** frontmatter 終端（2つ目の ---）以降の本文を抽出する */
function extractBody(content: string): string {
  const parts = content.split('---');
  // parts[0] = ''（最初の --- より前）, parts[1] = frontmatter, parts[2]以降 = 本文
  if (parts.length < 3) return content;
  return parts.slice(2).join('---');
}

/** キーワードルールに基づいてタグを判定する */
function detectTags(body: string): Tag[] {
  const detected: Tag[] = [];
  for (const rule of TAG_RULES) {
    const matched = rule.keywords.some(keyword => body.includes(keyword));
    if (matched) {
      detected.push(rule.tag);
    }
  }
  return detected;
}

/** frontmatter の tags 行を更新した内容を返す */
function applyTags(content: string, tags: readonly Tag[]): string {
  const tagsValue = tags.length > 0 ? `[${tags.join(', ')}]` : '[]';
  return content.replace(/^tags:.*$/m, `tags: ${tagsValue}`);
}

/** ディレクトリ内の全 .md ファイルを再帰的に収集する */
function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

/** メイン処理 */
function main(): void {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('🔍 ドライランモード（ファイルは変更されません）\n');
  }

  const files = collectMarkdownFiles(POSTS_DIR);
  const tagCount: Record<string, number> = Object.fromEntries(TAGS.map(t => [t, 0]));
  let totalTagged = 0;
  let totalUntagged = 0;

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const body = extractBody(content);
    const tags = detectTags(body);
    const shortPath = filePath.replace(POSTS_DIR, '');

    if (tags.length > 0) {
      console.log(`✅ ${shortPath}: [${tags.join(', ')}]`);
      for (const tag of tags) {
        tagCount[tag]++;
      }
      totalTagged++;
    } else {
      console.log(`⚠️  ${shortPath}: タグなし`);
      totalUntagged++;
    }

    if (!isDryRun) {
      const updated = applyTags(content, tags);
      writeFileSync(filePath, updated, 'utf-8');
    }
  }

  console.log('\n📊 タグ別件数:');
  for (const tag of TAGS) {
    console.log(`  ${tag}: ${tagCount[tag]} 件`);
  }
  console.log(`\n合計 ${files.length} 件 / タグあり: ${totalTagged} 件 / タグなし: ${totalUntagged} 件`);

  if (isDryRun) {
    console.log('\n実際に書き込む場合は --dry-run を外して実行してください。');
  } else {
    console.log('\n🎉 完了');
  }
}

main();
