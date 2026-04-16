/**
 * DLB legacy/zakki*.htm を Astro Content Collections 形式の Markdown に変換するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/convert-zakki.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// スクリプトのディレクトリから相対パスを解決
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BLOG_ROOT = resolve(__dirname, '..');
const DLB_LEGACY = resolve(BLOG_ROOT, '..', 'DLB', 'legacy');
const OUTPUT_DIR = join(BLOG_ROOT, 'src', 'content', 'posts');

// 変換対象ファイルと対応する年（エントリ順は新しい順）
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

// エントリの型
interface Entry {
  readonly rawDate: string;
  readonly date: string;    // YYYY-MM-DD 形式（XXは01で補完）
  readonly content: string; // Markdown 変換済み本文
}

/** #main div の内容を抽出する */
function extractMainContent(html: string): string {
  // #main div 開始位置を検索
  const startTag = '<div id="main">';
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) {
    throw new Error('#main div が見つかりません');
  }

  // #main の終了は <!-- #foot コメントまたは次の </div> を探す
  const afterStart = html.slice(startIdx + startTag.length);
  const footCommentIdx = afterStart.indexOf('<!-- #foot');
  if (footCommentIdx !== -1) {
    // <!-- #foot の前に現れる </div> を探す
    const closeBeforeFoot = afterStart.slice(0, footCommentIdx).lastIndexOf('</div>');
    if (closeBeforeFoot !== -1) {
      return afterStart.slice(0, closeBeforeFoot);
    }
    return afterStart.slice(0, footCommentIdx);
  }

  // <!-- #foot が見つからない場合は最後の </div> で区切る
  const lastClose = afterStart.lastIndexOf('</div>');
  if (lastClose !== -1) {
    return afterStart.slice(0, lastClose);
  }

  throw new Error('#main div の終端が見つかりません');
}

/** <h2>YYYY/MM/DD</h2> で区切られたエントリを分割する */
function splitEntries(mainContent: string): Entry[] {
  const entries: Entry[] = [];

  // <h2>日付</h2> にマッチするパターン
  const h2Pattern = /<h2>([\s\S]*?)<\/h2>/gi;
  const matches = [...mainContent.matchAll(h2Pattern)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawDate = match[1].trim();
    const date = normalizeDate(rawDate);

    // 次の <h2> までの内容（または終端まで）を取得
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = matches[i + 1]?.index ?? mainContent.length;
    const rawContent = mainContent.slice(startIndex, endIndex);

    const content = convertToMarkdown(rawContent);
    entries.push({ rawDate, date, content });
  }

  return entries;
}

/** YYYY/MM/DD または YYYY/MM/XX を YYYY-MM-DD 形式に正規化する */
function normalizeDate(rawDate: string): string {
  // "YYYY/MM/DD（補足）" の場合も考慮してスラッシュ区切りで分割
  const dateOnly = rawDate.split('（')[0].trim();
  const parts = dateOnly.split('/');

  if (parts.length !== 3) {
    throw new Error(`予期しない日付形式: "${rawDate}"`);
  }

  const year = parts[0].padStart(4, '0');
  const month = parts[1].padStart(2, '0');
  // XX（不明）の場合は 01 で補完
  const day = parts[2].replace(/[Xx]+/, '01').padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** HTML を Markdown に変換する */
function convertToMarkdown(html: string): string {
  let md = html;

  // <center>...</center>（画像ブロック等）を除去
  md = md.replace(/<center>[\s\S]*?<\/center>/gi, '');

  // <font ... ><b>text</b></font> → **text**
  md = md.replace(/<font[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/font>/gi, '**$1**');

  // <font color="...">text</font> → text（色情報を除去）
  md = md.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  // <b>text</b> → **text**
  md = md.replace(/<b>([\s\S]*?)<\/b>/gi, (_, inner: string) => {
    const cleaned = inner.trim();
    return cleaned ? `**${cleaned}**` : '';
  });

  // <a href="url">text</a> → [text](url)
  md = md.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // 連続する <br>（2個以上、全角スペースや改行を挟む場合も含む）→ 段落区切り（空行）
  md = md.replace(/(<br\s*\/?>\s*[　\s]*){2,}/gi, '\n\n');

  // 残りの単独 <br> → 除去（前後のテキストを繋げる）
  md = md.replace(/<br\s*\/?>/gi, '');

  // （後日追記：...） → blockquote
  // ネスト括弧（例: （涙））や直後に </p> が来るケースに対応するため [\s<]|$ でルックアヘッド
  md = md.replace(/（後日追記：([\s\S]*?)）(?=[\s<]|$)/g, '\n\n> 後日追記：$1\n');

  // <p>...</p> ブロックを抽出して段落として結合
  const paragraphs: string[] = [];
  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pPattern.exec(md)) !== null) {
    const text = pMatch[1].trim();
    if (text) {
      paragraphs.push(text);
    }
  }

  // <p> タグがない場合はそのまま使用（テキストノードのみの場合）
  md = paragraphs.length > 0 ? paragraphs.join('\n\n') : md;

  // <ul> / <li> → Markdown リスト
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
    return items.map(m => `- ${m[1].trim()}`).join('\n');
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

  // 3行以上の空行を2行に圧縮
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/** frontmatter を生成する */
function buildFrontmatter(date: string): string {
  return `---\ndate: ${date}\ntags: []\n---`;
}

/** 出力ファイルパスを決定する（重複する場合は連番サフィックスを付ける） */
function resolveOutputPath(date: string, usedPaths: Set<string>): string {
  const year = date.slice(0, 4);
  const base = join(OUTPUT_DIR, year, `${date}.md`);

  if (!usedPaths.has(base)) {
    usedPaths.add(base);
    return base;
  }

  // 重複日付に連番サフィックスを付与
  let suffix = 2;
  while (true) {
    const candidate = join(OUTPUT_DIR, year, `${date}-${suffix}.md`);
    if (!usedPaths.has(candidate)) {
      usedPaths.add(candidate);
      return candidate;
    }
    suffix++;
  }
}

/** メイン処理 */
function main(): void {
  const usedPaths = new Set<string>();
  let totalConverted = 0;
  let totalSkipped = 0;

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

    let mainContent: string;
    try {
      mainContent = extractMainContent(html);
    } catch (e) {
      console.error(`  ❌ #main 抽出失敗: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    let entries: Entry[];
    try {
      entries = splitEntries(mainContent);
    } catch (e) {
      console.error(`  ❌ エントリ分割失敗: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    console.log(`  📝 エントリ数: ${entries.length}`);

    for (const entry of entries) {
      if (!entry.content.trim()) {
        console.warn(`  ⚠️  本文なし（スキップ）: ${entry.rawDate}`);
        totalSkipped++;
        continue;
      }

      const outputPath = resolveOutputPath(entry.date, usedPaths);
      const year = entry.date.slice(0, 4);
      const yearDir = join(OUTPUT_DIR, year);

      if (!existsSync(yearDir)) {
        mkdirSync(yearDir, { recursive: true });
      }

      const markdown = `${buildFrontmatter(entry.date)}\n\n${entry.content}\n`;
      writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`  ✅ ${entry.rawDate} → ${outputPath.replace(BLOG_ROOT, '')}`);
      totalConverted++;
    }
  }

  console.log(`\n🎉 完了: ${totalConverted} 件変換、${totalSkipped} 件スキップ`);
}

main();
