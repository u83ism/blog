import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

// Cloudinaryの変換パラメータ（高さ360px上限、縮小のみ、品質・フォーマット自動）
const TRANSFORM = 'h_360,c_limit,q_auto,f_auto';
const CLOUDINARY_UPLOAD_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

const applyTransform = (url: string): string => {
  const match = CLOUDINARY_UPLOAD_RE.exec(url);
  if (!match) return url;
  return `${match[1]}${TRANSFORM}/${match[2]}`;
};

/**
 * Cloudinary画像のsrcに変換パラメータを挿入するrehypeプラグイン。
 * rehypeImageLinkの後に適用することで、<a>はオリジナルURL・<img>はリサイズURLになる。
 */
export const rehypeCloudinaryResize = (): (tree: Root) => void => {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      const src = node.properties?.src;
      if (typeof src !== 'string') return;
      node.properties.src = applyTransform(src);
    });
  };
};
