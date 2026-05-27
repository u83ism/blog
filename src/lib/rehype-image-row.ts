import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent, Text } from 'hast';

const isImageLink = (node: ElementContent): node is Element =>
  node.type === 'element' &&
  (node as Element).tagName === 'a' &&
  (node as Element).children.some(
    child => child.type === 'element' && (child as Element).tagName === 'img'
  );

const isWhitespaceText = (node: ElementContent): node is Text =>
  node.type === 'text' && (node as Text).value.trim() === '';

/**
 * <p>内で連続する画像リンクを<div class="image-row">で包むrehypeプラグイン。
 * rehypeImageLinkの後に適用すること。
 */
export const rehypeImageRow = (): (tree: Root) => void => {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'p') return;

      const newChildren: ElementContent[] = [];
      let currentGroup: Element[] = [];

      const flushGroup = () => {
        if (currentGroup.length >= 2) {
          newChildren.push({
            type: 'element',
            tagName: 'div',
            properties: { className: ['image-row'] },
            children: [...currentGroup],
          });
        } else {
          newChildren.push(...currentGroup);
        }
        currentGroup = [];
      };

      for (const child of node.children) {
        if (isImageLink(child)) {
          currentGroup.push(child);
        } else if (isWhitespaceText(child) && currentGroup.length > 0) {
          // グループ構築中の空白テキストノードはスキップ
          continue;
        } else {
          flushGroup();
          newChildren.push(child);
        }
      }
      flushGroup();

      node.children = newChildren;
    });
  };
};
