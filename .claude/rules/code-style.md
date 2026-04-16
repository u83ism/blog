## 言語・実行環境
- TypeScriptのみ使用
- 実行環境は Node.js（ESM）
- 明示的な理由がない限りCommonJSは禁止
- strictモードを前提とする
- `any` の使用は禁止

---

## プロジェクト構成

このプロジェクトは **Astro** フレームワークを使用したWebサイトである。

### ファイル種別と役割

| 種別 | パス例 | 役割 |
|------|--------|------|
| Astroページ | `src/pages/**/*.astro` | ルーティング・レンダリング |
| Astroレイアウト | `src/layouts/**/*.astro` | 共通レイアウト |
| Astroコンポーネント | `src/components/**/*.astro` | UIパーツ |
| ロジック | `src/lib/**/*.ts` | ビジネスロジック（純粋関数） |
| 型定義 | `src/types/**/*.ts` | 共有型 |
| コンテンツ設定 | `src/content.config.ts` | コレクション定義 |

---

## Pure / Effect の定義

`.astro` ファイルのfrontmatterでのfetchはAstroの設計として自然であり許容する。
Pure/Effect分類は主に `src/lib/` 配下の `.ts` ファイルに適用する。

### Pure
- 同じ入力 → 同じ出力
- 外部状態に依存しない
- 外部状態を変更しない

例: `calculateTotal(cart)` / `buildGameSummary(data)` / `normalizeSlug(str)`

### Effect
以下を含む処理はEffectとする：
- DBアクセス / HTTP / ファイルI/O
- Date / Random
- 環境変数の読み取り

Effectであることを命名で明示する：
`fetch` / `load` / `read` / `query` / `save` / `create` / `update` / `delete`

---

## アーキテクチャ原則

### 1. 関数型寄りの設計（`src/lib/` 配下）

- 純粋関数を優先する
- classは使用しない
- 共有ミュータブル状態は禁止
- ビジネスロジック内で副作用を発生させない

### 2. Astroコンポーネントの設計

- frontmatterにはデータ取得・整形のみ記述する
- ロジックが複雑になったら `src/lib/` に切り出す
- コンポーネント間の状態共有は行わない

### 3. スコープ規律

- 変数スコープは最小化する
- `const` を優先する
- 必要がない限り再代入しない

### 4. 状態管理

- グローバル状態は禁止
- モジュールレベルのミュータブル状態は禁止
- データは引数と戻り値で受け渡す

---

## コーディング規約

- `src/lib/` 内のexportする関数には明示的な戻り値型を付ける
- 可能な限り `readonly` を使用する
- enumよりユニオン型を優先する
- 暗黙の `any` を禁止
- 分岐には判別可能ユニオン（discriminated union）を使用する

---

## エラーハンドリング

- `src/lib/` のコアロジックでは例外をthrowしない
- `Result` 型のような戻り値でエラーを表現する
- 例外を投げるのはAstroページ層（404処理など）のみ

---

## コード生成時の指針

- 関数は小さく保つ
- ネストした命令的ブロックを避ける
- 制御構造を多用するよりも合成を優先する
- 不要な抽象化や過剰設計を避ける

---

## ファイル分割の指針

- `.ts` ファイルは原則150行以内、200行を超えたら分割を検討
- `.astro` ファイルは200行以内を目安とする
- 単一責務を超えたら行数に関係なく分割
- `src/lib/` のexportが3個以上なら分割検討
- テストファイルは対象ファイル1つごとに分ける（例: `lib/parser.ts` → `lib/parser.test.ts`）

---

## 命名規則

### `src/lib/` のPure関数
禁止語：
`save` / `create`（永続化含意）/ `update` / `delete` / `fetch` / `load` / `read` / `query` / `write` / `send` / `emit`

推奨語：
`calculate` / `compute` / `derive` / `build`（メモリ内のみ）/ `map` / `filter` / `format` / `parse` / `toX` / `fromX` / `validate` / `normalize`

### `src/lib/` のEffect関数
Effectであることを明示する語を含める：
`fetch` / `load` / `read` / `query` / `save` / `create` / `update` / `delete` / `write`

---

## 厳格制約

- Astro以外の外部ライブラリは正当な理由なしに導入しない
- DIコンテナを使用しない
- デコレーターを使用しない
- 明示的に要求されない限りOOPパターンを採用しない

---

## Astro MCP（Model Context Protocol）

このプロジェクトには **Astro Docs MCPサーバー** が `.mcp.json` で設定されている。

### MCPサーバー情報

- **名称**: `astro-docs`
- **URL**: `https://mcp.docs.astro.build/mcp`
- **トランスポート**: Streamable HTTP

### 利用方針

- AstroのAPIや機能について調査する際は、MCPサーバー経由で最新ドキュメントを参照する
- AIが古いパターンを提示する可能性があるため、不明な点はMCPで確認してから実装する
- 新しい統合を追加する際は `astro add` コマンドの使用を優先する（AIによる手動設定より公式CLIを信頼する）
- テンプレートやスターターをゼロから再実装せず、既存の公式テンプレートを活用する
