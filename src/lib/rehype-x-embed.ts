import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent, Text } from 'hast';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type OEmbedResponse = {
  readonly html: string;
};

type EmbedCache = Record<string, string>;

const CACHE_PATH = resolve('src/data/x-embed-cache.json');

// x.com と twitter.com のポストURLにマッチ
const X_URL_RE = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;

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
    const apiUrl = new URL('https://publish.twitter.com/oembed');
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('omit_script', '1');
    apiUrl.searchParams.set('dnt', '1');
    const response = await fetch(apiUrl.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as OEmbedResponse;
    return data.html ?? null;
  } catch {
    return null;
  }
};

// p要素の直後にあるblockquote要素を探す（間の空白テキストノードは無視）
const findNextBlockquote = (
  parent: Root | Element,
  afterIndex: number,
): { readonly node: Element; readonly index: number } | null => {
  for (let i = afterIndex + 1; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.type === 'text' && (child as Text).value.trim() === '') continue;
    if (child.type === 'element' && (child as Element).tagName === 'blockquote') {
      return { node: child as Element, index: i };
    }
    break;
  }
  return null;
};

type Target = {
  readonly pIndex: number;
  readonly parent: Root | Element;
  readonly url: string;
  readonly fallback: { readonly node: Element; readonly index: number } | null;
};

/**
 * 段落内に単独で書かれたX(Twitter)のポストURLをoEmbed埋め込みに変換するrehypeプラグイン。
 * URLの直後にblockquoteがある場合はフォールバックテキストとして埋め込む。
 * ビルド時にoEmbed APIを呼び出し、結果はsrc/data/x-embed-cache.jsonにキャッシュする。
 */
export const rehypeXEmbed = () => {
  return async (tree: Root): Promise<void> => {
    const cache = loadCache();
    const targets: Target[] = [];

    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== 'element' || (child as Element).tagName !== 'a') return;
      const href = (child as Element).properties?.href;
      if (typeof href !== 'string' || !X_URL_RE.test(href)) return;

      const parentNode = parent as Root | Element;
      targets.push({
        pIndex: index,
        parent: parentNode,
        url: href,
        fallback: findNextBlockquote(parentNode, index),
      });
    });

    if (targets.length === 0) return;

    // oEmbedを並列取得
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

    // 除去するblockquoteのインデックスを親ごとに収集
    const removeByParent = new Map<Root | Element, Set<number>>();

    targets.forEach(({ pIndex, parent, fallback }, i) => {
      const html = htmlResults[i];
      if (!html) return;

      const fallbackEl: ElementContent[] = fallback
        ? [
            {
              type: 'element',
              tagName: 'div',
              properties: { className: ['x-embed-fallback'] },
              children: fallback.node.children as ElementContent[],
            },
          ]
        : [];

      (parent.children as ElementContent[])[pIndex] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['x-embed'] },
        children: [
          { type: 'raw', value: html } as unknown as ElementContent,
          ...fallbackEl,
        ],
      };

      if (fallback) {
        if (!removeByParent.has(parent)) removeByParent.set(parent, new Set());
        removeByParent.get(parent)!.add(fallback.index);
      }
    });

    // フォールバックblockquoteを元の位置から除去（元のインデックスでフィルタ）
    for (const [parent, indices] of removeByParent) {
      parent.children = parent.children.filter(
        (_, i) => !indices.has(i),
      ) as ElementContent[];
    }
  };
};
