/**
 * legacyのzakki*.htmから画像を抽出し、既存のMarkdownファイルに追記するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/patch-images.ts
 *
 * 処理内容:
 *   1. DLB/legacy/gazou/ を public/legacy/gazou/ にコピー
 *   2. 各zakki*.htmのエントリから<center>内の画像を抽出
 *   3. 対応するMarkdownファイル末尾に画像を追記
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BLOG_ROOT = resolve(__dirname, '..');
const DLB_LEGACY = resolve(BLOG_ROOT, '..', 'DLB', 'legacy');
const POSTS_DIR = join(BLOG_ROOT, 'src', 'content', 'posts');
const GAZOU_SRC = join(DLB_LEGACY, 'gazou');
const GAZOU_DEST = join(BLOG_ROOT, 'public', 'legacy', 'gazou');

const ZAKKI_FILES: readonly { file: string; year: number }[] = [
  { file: 'zakki.htm', year: 2014 },
  { file: 'zakki13.htm', year: 2013 },
  { file: 'zakki12.htm', year: 2012 },
  { file: 'zakki11.htm', year: 2011 },
  { file: 'zakki10.htm', year: 2010 },
  { file: 'zakki09.htm', year: 2009 },
  { file: 'zakki08.htm', year: 2008 },
  { file: 'zakki07.htm', year: 2007 },
  { file: 'zakki06.htm', year: 2006 },
  { file: 'zakki05.htm', year: 2005 },
  { file: 'zakki04.htm', year: 2004 },
  { file: 'zakki03.htm', year: 2003 },
  { file: 'zakki02.htm', year: 2002 },
  { file: 'zakki01.htm', year: 2001 },
  { file: 'zakki00.htm', year: 2000 },
];

interface ImgRef {
  readonly src: string;  // /legacy/gazou/... 形式のパス
  readonly alt: string;
  readonly href: string | null;  // サムネイルの場合のリンク先
}

interface EntryImages {
  readonly date: string;
  readonly images: readonly ImgRef[];
}

/** gazou/xxx → /blog/legacy/gazou/xxx に変換 */
function convertImagePath(src: string): string {
  // すでに絶対パスの場合はそのまま
  if (src.startsWith('/') || src.startsWith('http')) return src;
  return `/blog/legacy/${src}`;
}

/** <img> タグから ImgRef を生成する */
function parseImgTag(imgTag: string, wrapperHref: string | null): ImgRef {
  const srcMatch = imgTag.match(/src="([^"]+)"/i);
  const altMatch = imgTag.match(/alt="([^"]*)"/i);
  const src = srcMatch ? convertImagePath(srcMatch[1]) : '';
  const alt = altMatch ? altMatch[1] : '';
  return { src, alt, href: wrapperHref };
}

/**
 * <center>...</center> ブロックから ImgRef を抽出する
 * taiwan2.jpg への空リンクは無視する
 */
function extractImagesFromCenter(centerBlock: string): readonly ImgRef[] {
  const results: ImgRef[] = [];

  // パターン1: <a href="url"><img ...></a> （サムネイル→フル画像）
  const linkedImgPattern = /<a\s+href="([^"]+)"[^>]*>\s*(<img[^>]+>)\s*<\/a>/gi;
  let match: RegExpExecArray | null;
  const linkedPositions = new Set<number>();

  while ((match = linkedImgPattern.exec(centerBlock)) !== null) {
    const href = match[1];
    const imgTag = match[2];
    // taiwan2.jpg など無関係な空リンクは無視
    if (imgTag && href && !href.includes('taiwan')) {
      results.push(parseImgTag(imgTag, convertImagePath(href)));
      // この位置のimgは単独パターンで重複処理しないようにマーク
      for (let i = match.index; i < match.index + match[0].length; i++) {
        linkedPositions.add(i);
      }
    }
  }

  // パターン2: 単独の <img> タグ（リンクなし）
  const imgPattern = /<img[^>]+>/gi;
  while ((match = imgPattern.exec(centerBlock)) !== null) {
    // すでにパターン1で処理済みの位置はスキップ
    if (linkedPositions.has(match.index)) continue;
    results.push(parseImgTag(match[0], null));
  }

  return results.filter(img => img.src !== '');
}

/** #main div の内容を抽出する（convert-zakki.ts と同じロジック） */
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

/** HTMファイルからエントリごとの画像リストを抽出する */
function extractEntryImages(html: string): readonly EntryImages[] {
  const mainContent = extractMainContent(html);
  const results: EntryImages[] = [];

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
    const entryHtml = mainContent.slice(startIndex, endIndex);

    // <center>...</center> ブロックを全て抽出
    const centerPattern = /<center>([\s\S]*?)<\/center>/gi;
    const images: ImgRef[] = [];
    let centerMatch: RegExpExecArray | null;
    while ((centerMatch = centerPattern.exec(entryHtml)) !== null) {
      const extracted = extractImagesFromCenter(centerMatch[1]);
      images.push(...extracted);
    }

    if (images.length > 0) {
      results.push({ date, images });
    }
  }

  return results;
}

/** ImgRef を Markdown 記法に変換する */
function imgRefToMarkdown(img: ImgRef): string {
  if (img.href) {
    return `[![${img.alt}](${img.src})](${img.href})`;
  }
  return `![${img.alt}](${img.src})`;
}

/** 日付に対応するMarkdownファイルのパスを全て返す（連番含む） */
function findMarkdownFiles(date: string): readonly string[] {
  const year = date.slice(0, 4);
  const yearDir = join(POSTS_DIR, year);
  if (!existsSync(yearDir)) return [];

  const files = readdirSync(yearDir);
  return files
    .filter(f => f === `${date}.md` || f.match(new RegExp(`^${date}-\\d+\\.md$`)))
    .map(f => join(yearDir, f))
    .sort();
}

/** Markdownファイルに画像セクションを追記する */
function appendImagesToMarkdown(filePath: string, images: readonly ImgRef[]): boolean {
  const content = readFileSync(filePath, 'utf-8');

  // すでに画像が含まれている場合はスキップ（冪等性）
  if (content.includes('![') || content.includes('](/legacy/')) {
    console.log(`    ⏭  画像追記済みのためスキップ`);
    return false;
  }

  const imageMarkdown = images.map(imgRefToMarkdown).join('\n\n');
  const updated = `${content.trimEnd()}\n\n${imageMarkdown}\n`;
  writeFileSync(filePath, updated, 'utf-8');
  return true;
}

/** gazou フォルダを public/legacy/gazou にコピーする */
function copyGazouFolder(): void {
  console.log('\n📁 gazouフォルダをコピー中...');
  if (!existsSync(GAZOU_SRC)) {
    console.error(`  ❌ コピー元が見つかりません: ${GAZOU_SRC}`);
    return;
  }
  mkdirSync(dirname(GAZOU_DEST), { recursive: true });
  cpSync(GAZOU_SRC, GAZOU_DEST, { recursive: true });
  console.log(`  ✅ ${GAZOU_SRC} → ${GAZOU_DEST}`);
}

/** メイン処理 */
function main(): void {
  copyGazouFolder();

  let totalPatched = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const { file } of ZAKKI_FILES) {
    const filePath = join(DLB_LEGACY, file);
    console.log(`\n📄 処理中: ${file}`);

    let html: string;
    try {
      html = readFileSync(filePath, 'utf-8');
    } catch {
      console.error(`  ❌ ファイルが見つかりません: ${filePath}`);
      continue;
    }

    let entryImages: readonly EntryImages[];
    try {
      entryImages = extractEntryImages(html);
    } catch (e) {
      console.error(`  ❌ 解析失敗: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    console.log(`  🖼  画像あきエントリ数: ${entryImages.length}`);

    for (const { date, images } of entryImages) {
      const mdFiles = findMarkdownFiles(date);

      if (mdFiles.length === 0) {
        console.warn(`  ⚠️  対応するMDファイルなし: ${date}`);
        totalNotFound++;
        continue;
      }

      // 同日付に複数ファイルがある場合は最初の1つに追記
      const targetFile = mdFiles[0];
      console.log(`  📝 ${date} (${images.length}枚) → ${targetFile.replace(BLOG_ROOT, '')}`);

      if (appendImagesToMarkdown(targetFile, images)) {
        totalPatched++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`\n🎉 完了: ${totalPatched} 件パッチ済み、${totalSkipped} 件スキップ、${totalNotFound} 件MDなし`);
}

main();
