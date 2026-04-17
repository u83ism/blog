/**
 * zakki*.htmの画像を正しい位置に挿入してMarkdownを再生成するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/regen-content.ts
 *
 * 処理内容:
 *   - 画像を含むエントリのみ対象
 *   - 既存MDファイルのfrontmatter（タグ等）を保持しつつ本文を再変換
 *   - <center><img>ブロックを元の位置でMarkdown画像に変換
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BLOG_ROOT = resolve(__dirname, '..');
const DLB_LEGACY = resolve(BLOG_ROOT, '..', 'DLB', 'legacy');
const POSTS_DIR = join(BLOG_ROOT, 'src', 'content', 'posts');

const ZAKKI_FILES: readonly { file: string }[] = [
  { file: 'zakki.htm' },
  { file: 'zakki13.htm' },
  { file: 'zakki12.htm' },
  { file: 'zakki11.htm' },
  { file: 'zakki10.htm' },
  { file: 'zakki09.htm' },
  { file: 'zakki08.htm' },
  { file: 'zakki07.htm' },
  { file: 'zakki06.htm' },
  { file: 'zakki05.htm' },
  { file: 'zakki04.htm' },
  { file: 'zakki03.htm' },
  { file: 'zakki02.htm' },
  { file: 'zakki01.htm' },
  { file: 'zakki00.htm' },
];

/** gazou/xxx → /blog/legacy/gazou/xxx に変換 */
function convertImagePath(src: string): string {
  if (src.startsWith('/') || src.startsWith('http')) return src;
  return `/blog/legacy/${src}`;
}

/**
 * <center>ブロックの内容を画像Markdownに変換する
 * 戻り値は前後に空行を含むブロック文字列、または画像なしなら空文字
 */
function convertCenterBlock(inner: string): string {
  const results: string[] = [];
  const processedPositions = new Set<number>();

  // パターン1: <a href="url"><img ...></a>（サムネイル→フル画像リンク）
  // taiwan*.jpg への空リンクは除外
  const linkedPattern = /<a\s+href="([^"]+)"[^>]*>\s*<img([^>]+)>\s*<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkedPattern.exec(inner)) !== null) {
    const href = m[1];
    const imgAttrs = m[2];
    if (!href.toLowerCase().includes('taiwan')) {
      const src = imgAttrs.match(/src="([^"]+)"/i)?.[1] ?? '';
      const alt = imgAttrs.match(/alt="([^"]*)"/i)?.[1] ?? '';
      if (src) {
        results.push(`[![${alt}](${convertImagePath(src)})](${convertImagePath(href)})`);
      }
    }
    for (let i = m.index; i < m.index + m[0].length; i++) {
      processedPositions.add(i);
    }
  }

  // パターン2: 単独の <img>（リンクなし）
  const imgPattern = /<img([^>]+)>/gi;
  while ((m = imgPattern.exec(inner)) !== null) {
    if (processedPositions.has(m.index)) continue;
    const imgAttrs = m[1];
    const src = imgAttrs.match(/src="([^"]+)"/i)?.[1] ?? '';
    const alt = imgAttrs.match(/alt="([^"]*)"/i)?.[1] ?? '';
    if (src) {
      results.push(`![${alt}](${convertImagePath(src)})`);
    }
  }

  if (results.length === 0) return '';
  return `\n\n${results.join('\n\n')}\n\n`;
}

/**
 * HTML を Markdown に変換する（画像位置を保持する版）
 *
 * 元の convert-zakki.ts との主な違い:
 * - <center>ブロックを除去せず画像Markdownに変換
 * - <p>タグを抽出・結合する代わりにインプレース変換して順序を保持
 */
function convertToMarkdown(html: string): string {
  let md = html;

  // <font ... ><b>text</b></font> → **text**
  md = md.replace(/<font[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/font>/gi, '**$1**');

  // <font color="...">text</font> → text
  md = md.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  // <b>text</b> → **text**
  md = md.replace(/<b>([\s\S]*?)<\/b>/gi, (_, inner: string) => {
    const cleaned = inner.trim();
    return cleaned ? `**${cleaned}**` : '';
  });

  // <center>...</center> → 画像Markdown（<a href>変換より前に処理する必要がある）
  md = md.replace(/<center>([\s\S]*?)<\/center>/gi, (_, inner: string) => convertCenterBlock(inner));

  // <a href="url">text</a> → [text](url)（画像リンクは変換済みなので安全）
  md = md.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // 連続する <br>（2個以上）→ 段落区切り
  md = md.replace(/(<br\s*\/?>\s*[　\s]*){2,}/gi, '\n\n');

  // 単独 <br> → 除去
  md = md.replace(/<br\s*\/?>/gi, '');

  // （後日追記：...） → blockquote
  md = md.replace(/（後日追記：([\s\S]*?)）(?=[\s<]|$)/g, '\n\n> 後日追記：$1\n');

  // <p>...</p> → 内容を段落として展開（順序を保持するためextractではなくreplaceを使う）
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner: string) => {
    const text = inner.trim();
    return text ? `${text}\n\n` : '';
  });

  // <ul> / <li> → Markdown リスト
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
    return items.map(item => `- ${item[1].trim()}`).join('\n') + '\n\n';
  });

  // HTMLエンティティ変換
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)));

  // 残余 HTML タグを除去
  md = md.replace(/<[^>]+>/g, '');

  // 行頭のタブ・半角スペースを除去（コードブロック誤認識を防ぐ）
  // ※全角スペース（　）は日本語段落字下げとして保持
  md = md.split('\n').map(line => line.replace(/^[\t ]+/, '')).join('\n');

  // 3行以上の空行を2行に圧縮
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/** #main div の内容を抽出する */
function extractMainContent(html: string): string {
  const startTag = '<div id="main">';
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) throw new Error('#main div が見つかりません');

  const afterStart = html.slice(startIdx + startTag.length);
  const footCommentIdx = afterStart.indexOf('<!-- #foot');
  if (footCommentIdx !== -1) {
    const closeBeforeFoot = afterStart.slice(0, footCommentIdx).lastIndexOf('</div>');
    if (closeBeforeFoot !== -1) return afterStart.slice(0, closeBeforeFoot);
    return afterStart.slice(0, footCommentIdx);
  }

  const lastClose = afterStart.lastIndexOf('</div>');
  if (lastClose !== -1) return afterStart.slice(0, lastClose);
  throw new Error('#main div の終端が見つかりません');
}

/** YYYY/MM/DD を YYYY-MM-DD に正規化する */
function normalizeDate(rawDate: string): string {
  const dateOnly = rawDate.split('（')[0].trim();
  const parts = dateOnly.split('/');
  if (parts.length !== 3) throw new Error(`予期しない日付形式: "${rawDate}"`);
  const year = parts[0].padStart(4, '0');
  const month = parts[1].padStart(2, '0');
  const day = parts[2].replace(/[Xx]+/, '01').padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface Entry {
  readonly date: string;
  readonly rawHtml: string;
  readonly hasImages: boolean;
}

/** エントリを分割し、画像を含むもののみ返す */
function splitEntriesWithImages(mainContent: string): readonly Entry[] {
  const entries: Entry[] = [];
  const h2Pattern = /<h2>([\s\S]*?)<\/h2>/gi;
  const matches = [...mainContent.matchAll(h2Pattern)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    let date: string;
    try {
      date = normalizeDate(match[1].trim());
    } catch {
      continue;
    }

    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = matches[i + 1]?.index ?? mainContent.length;
    const rawHtml = mainContent.slice(startIndex, endIndex);

    const hasImages = /<center>[\s\S]*?<img/i.test(rawHtml);
    if (hasImages) {
      entries.push({ date, rawHtml, hasImages });
    }
  }

  return entries;
}

/** 既存MDファイルのfrontmatterブロックを抽出する */
function extractFrontmatter(content: string): string {
  if (!content.startsWith('---')) return '';
  const end = content.indexOf('---', 3);
  if (end === -1) return '';
  return content.slice(0, end + 3);
}

/** 日付に対応するMarkdownファイルを返す（連番含む最初の1つ） */
function findMarkdownFile(date: string): string | null {
  const year = date.slice(0, 4);
  const yearDir = join(POSTS_DIR, year);
  if (!existsSync(yearDir)) return null;

  const files = readdirSync(yearDir);
  const match = files
    .filter(f => f === `${date}.md` || f.match(new RegExp(`^${date}-\\d+\\.md$`)))
    .sort()[0];

  return match ? join(yearDir, match) : null;
}

/** メイン処理 */
function main(): void {
  let totalPatched = 0;
  let totalNotFound = 0;

  for (const { file } of ZAKKI_FILES) {
    const filePath = join(DLB_LEGACY, file);

    let html: string;
    try {
      html = readFileSync(filePath, 'utf-8');
    } catch {
      console.error(`❌ ファイルが見つかりません: ${filePath}`);
      continue;
    }

    let mainContent: string;
    try {
      mainContent = extractMainContent(html);
    } catch (e) {
      console.error(`❌ #main 抽出失敗 (${file}): ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const entries = splitEntriesWithImages(mainContent);
    if (entries.length === 0) continue;

    console.log(`\n📄 ${file}: 画像ありエントリ ${entries.length} 件`);

    for (const { date, rawHtml } of entries) {
      const mdPath = findMarkdownFile(date);
      if (!mdPath) {
        console.warn(`  ⚠️  MDファイルなし: ${date}`);
        totalNotFound++;
        continue;
      }

      const existing = readFileSync(mdPath, 'utf-8');
      const frontmatter = extractFrontmatter(existing);
      if (!frontmatter) {
        console.warn(`  ⚠️  frontmatter取得失敗: ${mdPath}`);
        continue;
      }

      const newBody = convertToMarkdown(rawHtml);
      const newContent = `${frontmatter}\n\n${newBody}\n`;

      writeFileSync(mdPath, newContent, 'utf-8');
      console.log(`  ✅ ${date} → ${mdPath.replace(BLOG_ROOT, '')}`);
      totalPatched++;
    }
  }

  console.log(`\n🎉 完了: ${totalPatched} 件再生成、${totalNotFound} 件MDなし`);
}

main();
