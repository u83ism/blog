# u83 said so.

ゆうやみ（@u83unlimited）の雑記ブログ。2000〜2014年のDLBアーカイブを移行したもの。

**URL**: https://u83ism.github.io/blog/

## 技術スタック

- **Astro 6** (SSG)
- **TypeScript**
- **GitHub Pages** (mainブランチpushで自動デプロイ)

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー起動
npm run build    # 静的ビルド
npm run preview  # ビルド結果をプレビュー
```

## コンテンツ管理

記事は `src/content/posts/YYYY/YYYY-MM-DD.md` に配置する。

```yaml
---
date: 2000-04-08
tags: [ゲーム, 日常]
---

本文……
```

- `title` は省略可（省略時は `YYYY年MM月DD日` で自動生成）
- `tags` に指定できる値は `src/lib/tags.ts` の `TAGS` 配列で管理

タグ運用の詳細は [docs/タグ管理.md](docs/タグ管理.md) を参照。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/仕様.md](docs/仕様.md) | 技術仕様・ページ仕様・ディレクトリ構成 |
| [docs/デザイン仕様.md](docs/デザイン仕様.md) | デザインコンセプト・カラーパレット・タイポグラフィ |
| [docs/タグ管理.md](docs/タグ管理.md) | タグ一覧・追加・削除・手動付与の手順 |
