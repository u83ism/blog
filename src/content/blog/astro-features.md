---
title: "Astroの便利な機能について"
date: "2024-01-20"
updated: "2024-01-22"
tags: ["Astro", "TypeScript", "SSG"]
description: "Astroの便利な機能とContent Collectionsの使い方を解説します。"
published: true
slug: "astro-features"
---

# Astroの便利な機能について

Astroには多くの便利な機能が搭載されています。今回はその中でも特に重要な機能について解説します。

## Content Collections

Content Collectionsは、マークダウンファイルを型安全に管理できる機能です。

### 設定方法

```typescript
// content/config.ts
import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    description: z.string(),
    published: z.boolean().default(true),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

### データの取得

```astro
---
import { getCollection } from 'astro:content';

const allPosts = await getCollection('blog');
const publishedPosts = allPosts.filter(post => post.data.published);
---
```

## 島アーキテクチャ

Astroの「島アーキテクチャ」により、必要な部分のみでJavaScriptを実行できます。

```astro
---
// 静的な部分
---

<div>
  <h1>静的なコンテンツ</h1>
  <!-- この部分のみJavaScriptが動作 -->
  <InteractiveComponent client:load />
</div>
```

## パフォーマンス最適化

- **自動的な画像最適化**
- **CSSの最小化**
- **未使用コードの削除**
- **プリフェッチ機能**

これらの機能により、高速なWebサイトを簡単に構築できます。
