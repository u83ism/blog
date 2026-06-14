import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent } from 'hast';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type OEmbedResponse = {
  readonly html: string;
};

type EmbedCache = Record<string, string>;

const CACHE_PATH = resolve('src/data/youtube-embed-cache.json');

// youtube.com/watch、youtu.be、youtube.com/shorts のURLにマッチ
const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts\/)|youtu\.be\/)/;

const loadCache = (): EmbedCache => {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as EmbedCache;
  } catch {
    return {};
  }
};

const saveCache = (cache: EmbedCache): void => {
  const cacheDirectory = dirname(CACHE_PATH);
  if (!existsSync(cacheDirectory)) mkdirSync(cacheDirectory, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
};

const fetchOEmbed = async (url: string): Promise<string | null> => {
  try {
    const apiUrl = new URL('https://www.youtube.com/oembed');
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('format', 'json');
    const response = await fetch(apiUrl.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as OEmbedResponse;
    return data.html ?? null;
  } catch {
    return null;
  }
};

type Target = {
  readonly pIndex: number;
  readonly parent: Root | Element;
  readonly url: string;
};

/**
 * 段落内に単独で書かれたYouTubeのURLをoEmbed埋め込みに変換するrehypeプラグイン。
 * ビルド時にoEmbed APIを呼び出し、結果はsrc/data/youtube-embed-cache.jsonにキャッシュする。
 */
export const rehypeYoutubeEmbed = () => {
  return async (tree: Root): Promise<void> => {
    const cache = loadCache();
    const targets: Target[] = [];

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== 'element' || (child as Element).tagName !== 'a') return;
      const href = (child as Element).properties?.href;
      if (typeof href !== 'string' || !YOUTUBE_URL_RE.test(href)) return;

      targets.push({
        pIndex: index,
        parent: parent as Root | Element,
        url: href,
      });
    });

    if (targets.length === 0) return;

    const htmlResults = await Promise.all(
      targets.map(async ({ url }) => {
        let html = cache[url];
        if (!html) {
          html = (await fetchOEmbed(url)) ?? '';
          if (html) {
            cache[url] = html;
            saveCache(cache);
          }
        }
        return html || null;
      }),
    );

    targets.forEach(({ pIndex, parent }, i) => {
      const html = htmlResults[i];
      if (!html) return;

      (parent.children as ElementContent[])[pIndex] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['youtube-embed'] },
        children: [{ type: 'raw', value: html } as unknown as ElementContent],
      };
    });
  };
};
