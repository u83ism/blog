import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent } from 'hast';

/**
 * Markdown内の<img>を<a target="_blank">で包み、クリックで新しいタブに画像を開くrehypeプラグイン。
 * すでに<a>で囲まれている場合（手動リンク付き画像）はスキップする。
 */
export const rehypeImageLink = (): (tree: Root) => void => {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent) => {
      if (node.tagName !== 'img') return;
      if (index === undefined || !parent) return;

      // すでに<a>で囲まれている場合はスキップ
      if ('tagName' in parent && (parent as Element).tagName === 'a') return;

      const src = node.properties?.src;
      if (typeof src !== 'string' || !src) return;

      const anchor: Element = {
        type: 'element',
        tagName: 'a',
        properties: {
          href: src,
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
        },
        children: [node],
      };

      (parent.children as ElementContent[])[index] = anchor;
    });
  };
};
