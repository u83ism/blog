---
title: "初めてのブログ記事"
date: "2024-01-15"
tags: ["JavaScript", "Astro", "ブログ"]
description: "Astroを使ったブログシステムの最初の記事です。"
published: true
slug: "first-post"
---

# 初めてのブログ記事

こんにちは！これはAstroを使って作成したブログシステムの最初の記事です。

## Astroについて

Astroは静的サイト生成に特化したフレームワークで、以下の特徴があります：

- **高速**: 必要最小限のJavaScriptのみを送信
- **柔軟**: React、Vue、Svelteなど複数のフレームワークを組み合わせ可能
- **開発者体験**: TypeScriptサポートとホットリロード

## このブログシステムの特徴

このブログシステムでは以下の機能を実装予定です：

1. マークダウンファイルでの記事作成
2. タグによるフィルタリング
3. 月別アーカイブ
4. 全文検索機能

## コードサンプル

```javascript
// Astro Content Collectionsの使用例
import { getCollection } from 'astro:content';

const allBlogPosts = await getCollection('blog', ({ data }) => {
  return data.published === true;
});
```

今後も定期的に記事を更新していく予定です！
