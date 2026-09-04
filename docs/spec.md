# imleaw.com WordPress → 静的サイト移行 技術仕様書

## Revision History

| Rev | Run ID | 日付 | 変更概要 | 承認 |
|:---:|:---|:---|:---|:--:|
| 1 | 20260905-070709-wordpress-static-migration | 2026-09-05 | 初版（Astro による静的サイト移行アーキテクチャ設計） | ⏸ |

---

## ⚠️ 本仕様書の前提と未確定事項（最初にお読みください）

本 Run の実行環境では**外部ネットワークアクセスが遮断されており、`https://imleaw.com/` の実クロールができませんでした**。したがって本仕様書は次の状態にあります。

- **確定している部分**: アーキテクチャ、技術選定、ルーティング規約、ビルドパイプライン、デプロイ戦略、検証方式。これらは実サイトの内容に依存しません。
- **未確定の部分**: 記事総数・カテゴリ名・固定ページの実スラッグ・画像総容量・使用中プラグイン・現行テーマの実 DOM。

これらは **Phase 0（実サイト棚卸し）** で機械的に確定させます。Phase 0 は本仕様の設計判断を覆すものではなく、**設計に流し込む定数を確定させる工程**です。ただし §12「分岐判断ポイント」に挙げた 4 点だけは、Phase 0 の結果次第で方式が変わるため、実測後に再承認をいただきます。

本文中、実サイト未確認の記述は **（要 Phase 0 確認）** と明示します。

---

## 1. Executive Summary

### 目的

長野県須坂市のパン工房 imleaw のサイトを、WordPress（Kale テーマ）から **Astro による完全静的サイト**へ移行する。

### 達成目標

| 目標 | 指標 |
|:---|:---|
| **SEO 資産の完全保全** | 既存 URL の 100% を、200 応答または恒久 301 で到達可能にする。検索流入は移行後 4 週間で移行前比 95% 以上を維持 |
| **表示速度** | Core Web Vitals すべて "Good"。LCP < 1.5s / CLS < 0.1 / INP < 200ms（Moto G4 相当・4G） |
| **運用コスト** | ホスティング費 0 円、WordPress の保守・脆弱性対応・バックアップ運用を撤廃 |
| **保守性** | 記事追加は Markdown 1 ファイルの追加のみ。Git push で自動公開 |
| **可搬性** | GitHub Pages / Cloudflare Pages の**両方**で同一成果物が動作 |

### 中核となる設計判断

本移行の成否は、ほぼ **URL 保全**の一点に集約されます。そのため本仕様では次の方針を採ります。

> **記事の URL は「日付から計算する」のではなく、「WordPress が実際に出力していた URL」を frontmatter に固定値として保持し、それを唯一の正とする。**

理由は §5.2 に詳述しますが、要点は「日付からの逆算はタイムゾーンと 0 埋めで容易に 1 日ずれ、しかもビルドは成功してしまう」ためです。ずれた URL は 404 となり、被リンクと検索順位を失います。この事故は**サイレントに起きる**ため、検出機構を設計に組み込みます（§9.1）。

---

## 2. Current State vs Proposed Changes

### 2.1 As-Is（現行）

| 項目 | 現状 |
|:---|:---|
| CMS | WordPress |
| テーマ | Kale（LyraThemes 製・フード/レシピブログ向け無料テーマ） |
| 配信 | PHP による動的レンダリング（レンタルサーバ想定） |
| パーマリンク | `/YYYY/MM/DD/slug/`（Day and name 形式）（要 Phase 0 確認） |
| 言語 | 日本語（`lang="ja"`） |
| 画像 | `/wp-content/uploads/YYYY/MM/` 配下。WP による多サイズ派生（`-150x150` 等）を自動生成 |
| 検索 | WP 標準の `?s=` サーバサイド検索 |
| 問い合わせ | （要 Phase 0 確認：Contact Form 7 等のプラグイン、または Instagram DM への誘導のみの可能性） |

**As-Is の課題**

1. **セキュリティ**: WordPress 本体・テーマ・プラグインの脆弱性に継続的な追随が必要。放置は改ざん・スパム投稿の直接原因となる。
2. **速度**: PHP 実行 + プラグイン由来の CSS/JS 重複読み込みにより LCP が伸びやすい。Kale テーマは jQuery 依存。
3. **コスト**: レンタルサーバの月額費用が発生し続ける。
4. **運用**: 管理画面の UI 更新・PHP バージョン更新のたびに動作確認が要る。

### 2.2 To-Be（移行後）

| 項目 | 移行後 |
|:---|:---|
| 生成 | Astro 5.x による静的ビルド（SSG、アダプタなし） |
| 配信 | Cloudflare Pages（主）/ GitHub Pages（副・ミラー） |
| パーマリンク | **完全維持**（`trailingSlash: 'always'` + `build.format: 'directory'`） |
| コンテンツ | `src/content/` 配下の Markdown/MDX + YAML frontmatter（Zod 型検査付き） |
| 画像 | ビルド時に AVIF/WebP へ変換 + `srcset` 自動生成。原本 URL も互換維持 |
| 検索 | Pagefind によるクライアントサイド全文検索（CJK 分かち書き対応） |
| 問い合わせ | 静的フォーム（Formspree 既定 / Cloudflare Pages Functions 併用可） |

### 2.3 破壊的変更（ユーザー影響のあるもの）

| 変更 | 影響 | 対応 |
|:---|:---|:---|
| WP 管理画面の廃止 | ブラウザから記事投稿ができなくなる | §11 で 3 案を提示（Decap CMS / GitHub Web UI / Obsidian）。**承認時に選択が必要** |
| コメント機能の廃止 | 既存コメントが表示されなくなる | （要 Phase 0 確認）コメントが実在する場合、静的 HTML として記事下部に保存する。新規受付は giscus か停止 |
| `?s=` サーバ検索の廃止 | 旧検索 URL が機能しない | `/?s=xxx` → `/search/?q=xxx` へ JS でリダイレクト（§5.5） |
| 添付ファイルページの廃止 | `/YYYY/MM/DD/slug/image-name/` が消滅 | 画像本体 URL へ 301（§5.4） |

---

## 3. Functional Requirements

| ID | 要件 | 受入条件 |
|:---|:---|:---|
| F-01 | 記事詳細ページ | `/YYYY/MM/DD/slug/` で表示。本文・日付・カテゴリ・タグ・アイキャッチを表示 |
| F-02 | 固定ページ | `/about/`、`/access/` 等のルート直下スラッグで表示（実スラッグは要 Phase 0 確認） |
| F-03 | トップページ | 最新記事一覧。ヒーロー（ヘッダーバナー）を表示 |
| F-04 | ページネーション | `/page/2/`、`/category/<name>/page/2/`（WP と同一形式） |
| F-05 | カテゴリ一覧 | `/category/<slug>/` で該当記事を一覧 |
| F-06 | タグ一覧 | `/tag/<slug>/` |
| F-07 | 日付アーカイブ | `/YYYY/`、`/YYYY/MM/`（要 Phase 0 確認：WP が出力していた場合のみ） |
| F-08 | 全文検索 | `/search/` でクライアントサイド検索。日本語の部分一致が機能すること |
| F-09 | パンくず | 全ページに表示 + `BreadcrumbList` 構造化データ |
| F-10 | RSS | `/feed/` で従来と同一パスの RSS 2.0 を配信 |
| F-11 | サイトマップ | `/sitemap-index.xml` を生成。旧 `/wp-sitemap.xml` から 301 |
| F-12 | Google Maps | アクセスページに遅延読み込みの地図埋め込み |
| F-13 | Instagram | プロフィールリンク + 最新投稿の表示（§8.3） |
| F-14 | 問い合わせフォーム | 名前・メール・本文・送信。スパム対策付き |
| F-15 | 404 ページ | サイト内導線を持つカスタム 404 |

## 4. Non-Functional Requirements

| ID | 要件 | 目標値 | 測定方法 |
|:---|:---|:---|:---|
| N-01 | LCP | < 1.5s | Lighthouse CI（モバイル・4G スロットリング） |
| N-02 | CLS | < 0.1 | 同上。全画像に `width`/`height` を必須化して担保 |
| N-03 | INP | < 200ms | 同上 |
| N-04 | 初期 JS 転送量 | < 30KB（gzip、検索ページを除く） | `astro build` のバンドル解析 |
| N-05 | Lighthouse スコア | Performance / A11y / Best Practices / SEO すべて ≥ 95 | CI で下限を強制、下回ればビルド失敗 |
| N-06 | アクセシビリティ | WCAG 2.1 AA。コントラスト比 4.5:1 以上 | axe-core を CI に組み込み |
| N-07 | ビルド時間 | < 90 秒（記事 200 本想定） | CI 実測 |
| N-08 | 対応ブラウザ | Chrome / Safari / Edge / Firefox 各最新 2 バージョン、iOS Safari 16+ | — |
| N-09 | URL 到達性 | 旧 URL の 100% が 200 または 301 | §9.1 の検証スクリプト（CI で強制） |
| N-10 | JS 無効時 | 記事の閲覧・ナビゲーション・地図リンクが機能する | 手動確認 |

---

## 5. Architecture & Tech Stack

### 5.1 技術選定と根拠

#### 静的サイトジェネレータ: **Astro 5.x** を採用

| 候補 | 評価 |
|:---|:---|
| **Astro** ✅ | 後述の 6 要件すべてを標準機能で満たす唯一の選択肢 |
| 11ty | 高速で優秀だが、型付きコンテンツスキーマ・画像最適化・コンポーネントモデルがいずれもプラグイン任せで、統合の責任が自前になる |
| Vite SSG | ルーティング・コンテンツ層を自前実装することになり、本件の要件に対して低レベルすぎる |
| Next.js SSG | 本件に対して過剰。React ランタイムが N-04（JS < 30KB）と衝突する |

Astro を選ぶ具体的な理由は、本件の要件と機能が 1 対 1 で対応するためです。

| 本件の要件 | Astro の対応機能 |
|:---|:---|
| URL 完全維持（要件 1） | `trailingSlash: 'always'` + `build.format: 'directory'` + `getStaticPaths` による任意 URL 生成 |
| 型付きコンテンツ（要件 2） | Content Layer API + Zod スキーマ。frontmatter の欠落・型崩れを**ビルド時に検出** |
| 高速表示（要件 3） | デフォルトで JS ゼロ出力。アイランドアーキテクチャで必要箇所のみ水和 |
| 画像最適化（要件 4） | `astro:assets` が Sharp 経由で AVIF/WebP 変換と `srcset` を標準生成 |
| Pagefind 検索（要件 5） | 静的 `dist/` に対する後処理として自然に統合 |
| コンポーネント設計（要件 6） | `.astro` コンポーネント（スコープ CSS 付き）+ スロット |
| 両ホスティング対応（要件 7） | アダプタなしの純静的出力。ホスト固有 API に依存しない |

**バージョン方針**: Astro 5 系に固定（`^5`）。Content Layer API（`loader` ベース）は Astro 5 で安定化した機能であり、本設計はこれに依拠します。

#### スタック全体

| 領域 | 採用 | 根拠 |
|:---|:---|:---|
| SSG | Astro `^5` | 上表 |
| 言語 | TypeScript（`strict`） | frontmatter とルーティングの型崩れをビルド時に落とす |
| コンテンツ | Markdown（`.md`）主体、必要箇所のみ MDX | 記事は素の Markdown で十分。MDX は固定ページの地図・フォーム埋め込みに限定 |
| スタイル | 素の CSS（`<style>` スコープ）+ CSS カスタムプロパティのデザイントークン | Tailwind は本件規模には過剰。Astro のスコープ CSS が未使用 CSS を構造的に排除する |
| 画像 | `astro:assets`（Sharp） | 標準機能。追加依存なし |
| 検索 | Pagefind `^1` | 静的サイト検索の事実上の標準。**CJK 分かち書きを内蔵**（後述） |
| RSS | `@astrojs/rss` | 公式 |
| サイトマップ | `@astrojs/sitemap` | 公式 |
| Markdown 変換 | `turndown` + カスタムルール | 移行時のみ使用。本番依存ではない |
| Lint | Prettier + `prettier-plugin-astro`、ESLint | — |
| テスト | Vitest（ユーティリティ）、Playwright（E2E）、Lighthouse CI | — |
| パッケージ管理 | pnpm | ロック厳密性とディスク効率 |
| Node | 22 LTS（`.nvmrc` / `engines` で固定） | CI とローカルの一致 |

**Pagefind の日本語対応について**: Pagefind は言語別インデックスを構築し、CJK に対しては専用の分割処理を行います。これを機能させるには `<html lang="ja">` が正しく出力されている必要があります（Pagefind は `lang` 属性を見てインデックス戦略を切り替えるため）。この属性の欠落は**検索が「動くが日本語がヒットしない」という気づきにくい壊れ方**をするため、§9.4 で明示的に検証します。

### 5.2 中核設計：URL を frontmatter の固定値とする

要件 1（URL・SEO 保全）に対する本仕様の中心的な設計判断です。

**素朴な実装（採用しない）**

```
記事の date から year/month/day を算出 → /2023/04/05/slug/ を生成
```

これは次の理由で破綻します。

1. **タイムゾーン**: WordPress は日付をサイトのタイムゾーン（Asia/Tokyo）で保持します。エクスポートした `2023-04-05T08:00:00` を JS の `new Date()` が UTC と解釈し、`toISOString()` で整形すると `2023-04-04` になります。**9 時間以内に投稿された記事だけが 1 日ずれる**という部分的な破損が起きます。
2. **0 埋め**: `getMonth()+1` が `4` を返す一方、WP の URL は `04` です。
3. **検出困難性**: いずれもビルドは成功し、ページも生成されます。壊れていることは、**検索順位が落ちてから**しか分かりません。

**採用する設計**

エクスポート時点で WordPress が実際に出力していた URL パスを取得し、frontmatter の `permalink` に固定値として書き込みます。ルーティングはこの値のみを参照します。

```yaml
permalink: "/2023/04/05/campagne/"   # WP の実 URL。唯一の正
date: 2023-04-05T08:00:00+09:00      # 表示用。オフセット必須
```

さらに、`date` から導出した URL と `permalink` の不一致を**ビルド時にエラーとして落とす**チェックを入れます（§9.1）。これにより、上記 3 つの事故はすべて「ビルド失敗」という気づける形に変換されます。

なお `date` には**必ず `+09:00` オフセットを付与**します。オフセットなしの日時文字列は実行環境のタイムゾーンに依存して解釈が変わり、CI（UTC）とローカル（JST）で表示日付が食い違います。Zod スキーマでオフセットの存在を必須化します。

### 5.3 ディレクトリ構成

```
imleaw.com/
├── .github/workflows/
│   ├── deploy-pages.yml           # GitHub Pages デプロイ
│   ├── deploy-cloudflare.yml      # Cloudflare Pages デプロイ
│   └── ci.yml                     # PR 時: lint / build / URL 検証 / Lighthouse
│
├── docs/                          # 仕様書・Run 記録（.agents 規約）
│
├── scripts/                       # 移行・検証スクリプト（本番バンドル対象外）
│   ├── wp-export.mjs              # WP REST API → 中間 JSON
│   ├── wp-to-markdown.mjs         # 中間 JSON → Markdown + frontmatter
│   ├── fetch-uploads.mjs          # 画像取得・WP 派生サムネイル除去
│   ├── build-redirects.mjs        # 旧 URL 台帳 → _redirects / メタリフレッシュ
│   ├── verify-urls.mjs            # 旧 URL 台帳 vs dist/ の突合（CI 必須）
│   └── verify-content.mjs         # 旧新の本文テキスト差分
│
├── data/
│   ├── legacy-urls.json           # 移行前 URL 台帳（不変・コミット対象）
│   └── wp-export/                 # WP 生エクスポート（監査証跡として保持）
│
├── public/                        # 無加工でコピーされる
│   ├── wp-content/uploads/        # 画像の原本 URL 互換（§7.2）
│   ├── _redirects                 # Cloudflare Pages 用
│   ├── _headers                   # Cloudflare Pages 用
│   ├── favicon.svg
│   ├── robots.txt
│   └── .nojekyll                  # GitHub Pages で _ 始まりを配信させる（必須）
│
├── src/
│   ├── content.config.ts          # Content Layer コレクション定義 + Zod スキーマ
│   │
│   ├── content/
│   │   ├── posts/                 # 記事: 2023-04-05-campagne.md
│   │   └── pages/                 # 固定ページ: about.md, access.mdx
│   │
│   ├── assets/
│   │   ├── uploads/               # 最適化対象の画像実体（astro:assets 経由）
│   │   └── theme/                 # ロゴ・ヒーロー等のデザイン素材
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Nav.astro
│   │   │   ├── Footer.astro
│   │   │   └── Breadcrumb.astro
│   │   ├── content/
│   │   │   ├── Hero.astro
│   │   │   ├── PostCard.astro
│   │   │   ├── PostList.astro
│   │   │   ├── PostMeta.astro      # 日付・カテゴリ・タグ
│   │   │   ├── CategoryList.astro
│   │   │   ├── TagList.astro
│   │   │   └── Pagination.astro
│   │   ├── embed/
│   │   │   ├── MapEmbed.astro      # クリック後に iframe を挿入（§8.2）
│   │   │   ├── InstagramFeed.astro
│   │   │   └── ContactForm.astro
│   │   ├── media/
│   │   │   ├── ResponsiveImage.astro
│   │   │   └── Figure.astro        # WP の caption 相当
│   │   └── seo/
│   │       ├── BaseHead.astro      # meta / OGP / canonical
│   │       └── StructuredData.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── PostLayout.astro
│   │   ├── PageLayout.astro
│   │   └── ArchiveLayout.astro
│   │
│   ├── pages/                     # ルーティング（§6）
│   │   ├── index.astro
│   │   ├── 404.astro
│   │   ├── search.astro
│   │   ├── feed.xml.ts
│   │   ├── page/[page].astro
│   │   ├── category/[slug]/[...page].astro
│   │   ├── tag/[slug]/[...page].astro
│   │   ├── [year]/[month]/[day]/[slug].astro
│   │   └── [...slug].astro        # 固定ページ（最低優先度）
│   │
│   ├── styles/
│   │   ├── tokens.css             # デザイントークン
│   │   ├── global.css
│   │   └── typography.css         # 記事本文（日本語組版）
│   │
│   ├── lib/
│   │   ├── permalink.ts           # URL 生成・検証の単一責務モジュール
│   │   ├── paginate.ts
│   │   └── site.ts                # サイト定数（社名・住所・SNS）
│   │
│   └── config/
│       └── site.config.ts         # ナビ・SNS・地図座標などの編集可能設定
│
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── lighthouserc.json
├── wrangler.toml                  # Cloudflare Pages 用
└── .nvmrc
```

**`public/.nojekyll` は必須です。** GitHub Pages は既定で Jekyll 処理を行い、`_` で始まるディレクトリ・ファイルを配信対象から除外します。Astro が出力する `_astro/`（CSS・JS・画像のすべて）がこれに該当するため、このファイルがないと**スタイルと画像が一切読み込まれないサイトが公開されます**。

---

### 5.4 データモデル

`src/content.config.ts` に Zod スキーマとして定義します。frontmatter の不備はビルド時に検出され、壊れたコンテンツが公開されることを構造的に防ぎます。

#### posts コレクション

```yaml
---
title: "自家製カンパーニュ"                    # 必須
permalink: "/2023/04/05/campagne/"            # 必須・唯一の正・不変
date: 2023-04-05T08:00:00+09:00               # 必須・TZ オフセット必須
updated: 2023-05-01T10:00:00+09:00            # 任意
draft: false                                   # 既定 false
categories: ["bread"]                          # スラッグの配列
tags: ["sourdough", "levain"]
heroImage: "../../assets/uploads/2023/04/campagne.jpg"   # 任意・相対パス
heroImageAlt: "スライスしたカンパーニュ"        # heroImage があれば必須
excerpt: "…"                                   # 任意。無ければ本文冒頭から生成
wpPostId: 123                                  # 移行トレーサビリティ用
---
```

スキーマ上の要点は次の 3 点です。

1. **`permalink` は正規表現で形式を強制**します（`/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9%\-]+\/$/`）。先頭・末尾スラッシュの欠落を型レベルで排除します。
2. **`heroImageAlt` は `heroImage` があるとき必須**（Zod の `superRefine` で条件付き必須化）。N-06（WCAG AA）を仕組みで担保し、レビューの注意力に依存させません。
3. **`date` はオフセット必須**。`z.string().datetime({ offset: true })` で検証してから `Date` へ変換します。

日本語スラッグへの注意（要 Phase 0 確認）: WordPress は日本語タイトルからパーセントエンコードされたスラッグ（`/2023/04/05/%e3%83%91%e3%83%b3/`）を生成することがあります。**この場合もエンコード済み文字列をそのまま `permalink` に保持します**。デコードして「読みやすく」してはいけません。URL が変わり 404 になります。スキーマの正規表現が `%` を許容しているのはこのためです。

#### pages コレクション

```yaml
---
title: "アクセス"
permalink: "/access/"
order: 3                    # ナビ表示順
showInNav: true
description: "…"            # meta description
layout: "default" | "wide"
---
```

#### カテゴリ・タグ

WordPress の `name`（表示名・日本語）と `slug`（URL・英数）の対応は `src/config/site.config.ts` に集約します。frontmatter 側は**スラッグのみ**を持ちます。表示名を frontmatter に散らすと、名称変更時に全記事の書き換えが必要になるためです。

---

## 6. ルーティング規約

### 6.1 グローバル設定

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://imleaw.com',
  trailingSlash: 'always',        // WP と同じ末尾スラッシュ
  build: { format: 'directory' }, // /foo/ → dist/foo/index.html
});
```

この 2 設定が要件 1 の土台です。`format: 'directory'` により `/foo/index.html` が出力され、GitHub Pages・Cloudflare Pages ともに `/foo/` で配信します。`trailingSlash: 'always'` により、Astro が生成する内部リンク・canonical・サイトマップのすべてが末尾スラッシュ付きで統一されます。

**片方だけ設定した場合の失敗**: `trailingSlash` のみ設定して `build.format` を既定（`directory`）から変えると、canonical は `/foo/` を指すのに実体は `/foo.html` となり、canonical と実 URL が食い違って自己参照 canonical が壊れます。両方を明示するのはこのためです。

### 6.2 ルート一覧

| URL | 実装ファイル | 生成方法 |
|:---|:---|:---|
| `/` | `pages/index.astro` | 最新記事 N 件 + ヒーロー |
| `/page/2/` … | `pages/page/[page].astro` | `paginate()`。**`/page/1/` は生成せず `/` へ 301** |
| `/YYYY/MM/DD/slug/` | `pages/[year]/[month]/[day]/[slug].astro` | `permalink` を分解して `getStaticPaths` に供給 |
| `/category/<slug>/` | `pages/category/[slug]/[...page].astro` | 全カテゴリ × ページ数 |
| `/category/<slug>/page/2/` | 同上 | `[...page]` の rest パラメータで 1 ファイルに統合 |
| `/tag/<slug>/` | `pages/tag/[slug]/[...page].astro` | 同上 |
| `/<page-slug>/` | `pages/[...slug].astro` | pages コレクション |
| `/search/` | `pages/search.astro` | Pagefind UI |
| `/feed/` | 後述 | RSS 2.0 |
| `/sitemap-index.xml` | `@astrojs/sitemap` | 自動 |
| 404 | `pages/404.astro` | 両ホストが `404.html` を自動採用 |

**`getStaticPaths` の実装方針**（`src/lib/permalink.ts`）:

```ts
// permalink 文字列を分解してパラメータ化する。日付からの再計算はしない。
export function parsePermalink(permalink: string) {
  const m = permalink.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/$/);
  if (!m) throw new Error(`Invalid permalink: ${permalink}`);
  const [, year, month, day, slug] = m;
  return { year, month, day, slug };
}
```

`throw` する点が重要です。不正な `permalink` はビルドを止め、404 を生む代わりにエラーを出します。

**ルート優先度**: Astro は静的セグメントを動的セグメントより優先し、rest パラメータ（`[...slug]`）を最後に評価します。したがって `/category/bread/` は `[...slug].astro` ではなく `category/[slug]/` に正しく解決されます。ただし固定ページに `category` や `page` というスラッグを付けると衝突するため、これらは予約語として `site.config.ts` に列挙し、Phase 0 で衝突がないことを確認します。

### 6.3 ページネーションの URL 形式

WordPress は `/page/1/` を出力せず `/` を正とします。Astro の `paginate()` は既定で 1 ページ目を `/page/1/` に生成しうるため、**1 ページ目は生成対象から除外し、`/page/1/` → `/` の 301 を `_redirects` に定義**します（重複コンテンツ回避）。カテゴリ・タグも同様に `/category/x/page/1/` → `/category/x/` とします。

### 6.4 リダイレクト方針（旧 URL → 新 URL）

| 旧 URL パターン | 対応 | 理由 |
|:---|:---|:---|
| `/YYYY/MM/DD/slug/` | **維持（200）** | 最重要資産 |
| `/category/*/`、`/tag/*/` | **維持（200）** | 同上 |
| 固定ページ | **維持（200）** | 同上 |
| `/wp-content/uploads/**` | **維持（200）** | 画像の被リンク・画像検索保全（§7.2） |
| `/feed/` | **維持（200）** | 購読者保全 |
| `/YYYY/`、`/YYYY/MM/` | 維持 or `/` へ 301 | Phase 0 で WP の出力有無を確認して決定 |
| `/wp-sitemap.xml` | `/sitemap-index.xml` へ 301 | — |
| `/?p=<id>` | 該当記事へ 301 | `wpPostId` で解決。クエリ文字列のため `_redirects` で処理 |
| `/?s=<query>` | `/search/?q=<query>` | クエリのため JS 側で処理（§5.5 相当・§8.4） |
| `/author/*/` | `/` へ 301 | 単一著者サイトのため独立ページは不要（要 Phase 0 確認） |
| 添付ファイルページ | 画像本体 URL へ 301 | — |
| `/wp-admin/`、`/wp-login.php` | 410 Gone | 攻撃ボット由来。404 より明示的に閉じる |
| `/wp-json/**` | 410 Gone | 同上 |

**ホストによる差**（重要）:

| | Cloudflare Pages | GitHub Pages |
|:---|:---|:---|
| `_redirects` によるサーバ 301 | ✅ 対応 | ❌ **非対応** |
| カスタムヘッダ（`_headers`） | ✅ 対応 | ❌ 非対応 |
| クエリ文字列マッチ | ✅ 対応 | ❌ 非対応 |

GitHub Pages では真の 301 を返せません。したがって `scripts/build-redirects.mjs` は**同一の台帳（`data/legacy-urls.json`）から 2 種類の成果物を生成**します。

1. Cloudflare 向け: `public/_redirects`
2. GitHub Pages 向け: 各旧 URL に `<meta http-equiv="refresh">` + `<link rel="canonical">` + JS 即時遷移を持つ HTML ファイル

メタリフレッシュは Google が「301 に準ずるもの」として扱いますが、伝達は遅く、評価も 301 に劣ります。**この差が、Cloudflare Pages を主系とする最大の技術的理由です**（§10.1）。

---

## 7. アセットと画像

### 7.1 移行手順

`scripts/fetch-uploads.mjs` が `/wp-content/uploads/` を再帰取得したうえで、**WordPress が自動生成した派生サムネイル（`-150x150.jpg`、`-300x200.jpg`、`-768x512.jpg`、`scaled` 等）を除去し、原本のみを残します**。

この除去は必須です。WordPress は 1 枚の画像につき 5〜8 個の派生ファイルを生成するため、原本 300 枚のサイトが 2,000 ファイル超に膨らみます。これは次の実制約に直接抵触します。

| ホスト | 制約 |
|:---|:---|
| Cloudflare Pages | **1 デプロイあたり 20,000 ファイル**、1 ファイル 25MB |
| GitHub Pages | リポジトリ推奨 1GB、1 ファイル 100MB、公開サイト 1GB |

派生ファイルは Astro 側で再生成できるため保持する価値がなく、**除去は容量削減と制約回避を同時に達成します**。

### 7.2 二層構成（URL 互換 × 最適化の両立）

画像には相反する 2 つの要求があります。

- 旧 URL `/wp-content/uploads/2023/04/campagne.jpg` を維持したい（画像検索・被リンク・他サイトからの参照）
- ページ内では AVIF/WebP の最適化版を配信したい（N-01 LCP）

本仕様では両方を満たすため、二層で持ちます。

| 層 | 配置 | 役割 |
|:---|:---|:---|
| **互換層** | `public/wp-content/uploads/**` | 原本を無加工で配置。旧 URL がそのまま 200 を返す |
| **最適化層** | `src/assets/uploads/**` | `astro:assets` が AVIF/WebP + `srcset` を生成。ページ内表示に使用 |

原本を 2 か所に持つためリポジトリ容量は約 2 倍になります。小規模サイトでは許容範囲ですが、**Phase 0 の実測で原本合計が 500MB を超える場合は互換層を「外部被リンクのある画像のみ」に絞ります**（§12 の分岐判断 B）。

### 7.3 レンダリング規約

- 記事本文中の `<img>` は変換時に `<Figure>` / `<ResponsiveImage>` へ書き換える。
- **すべての画像に `width` / `height` を必須付与**（N-02 CLS 対策）。
- ファーストビュー（ヒーロー・記事アイキャッチ）は `loading="eager"` + `fetchpriority="high"`、それ以外は `loading="lazy"` + `decoding="async"`。
- 出力形式: AVIF → WebP → 元形式 の `<picture>` フォールバック。
- ブレークポイント: 400 / 800 / 1200 / 1600px。
- `alt` 欠落は §5.4 のスキーマでビルド失敗とする。

---

## 8. インタラクティブ機能

### 8.1 検索（Pagefind）

- ビルド後処理として `pagefind --site dist` を実行し、`dist/pagefind/` にインデックスを生成。
- 検索対象は `data-pagefind-body` を付与した本文領域のみ。ヘッダ・フッタ・サイドバーは除外し、全ページ共通文字列がヒットする問題を防ぐ。
- `/search/` でのみ Pagefind UI の JS を読み込む（N-04 を他ページで維持）。
- カテゴリを `data-pagefind-filter` でフィルタ可能にする。
- **日本語検証は必須**（§9.4）。`lang="ja"` の出力と、日本語 2 文字での部分一致ヒットを E2E で確認します。

### 8.2 Google Maps（アクセスページ）

素の `<iframe>` 直挿入は採用しません。Google Maps の埋め込みは 1 枚で 1MB 超・数十リクエストを発生させ、**アクセスページの LCP を単独で破壊します**。また Cookie を設定するため、同意なしの読み込みはプライバシー上も望ましくありません。

`MapEmbed.astro` は次の挙動とします。

1. 初期表示は**静的な地図画像 + 「地図を表示」ボタン**（軽量）。
2. クリック時にのみ `<iframe loading="lazy">` を挿入。
3. JS 無効時は Google Maps へのリンクとして機能（N-10）。
4. 併せて `LocalBusiness`（`Bakery`）構造化データに住所・座標・営業時間を出力。ローカル検索対策として、埋め込み地図より効果が大きい部分です。

### 8.3 Instagram

公式埋め込みスクリプト（`embed.js`）は重量・追跡・仕様変更リスクがあるため既定では採用しません。

- **既定**: プロフィールへのリンク + サムネイルグリッド。画像は移行時に取得して自前ホストする静的グリッド。
- **任意**: Instagram Graph API で最新 N 件をビルド時に取得し静的化（アクセストークン更新の運用が発生するため、要望があれば採用）。

いずれもクライアント JS ゼロで実現します。

### 8.4 問い合わせフォーム

3 案を比較します。

| 案 | 長所 | 短所 |
|:---|:---|:---|
| **Formspree**（推奨・既定） | 純静的。**両ホストで同一動作**。実装が最小 | 無料枠は月 50 件。外部サービス依存 |
| Cloudflare Pages Functions | 自前完結。Turnstile と統合しやすい | **GitHub Pages では動作せず、両ホスト同一成果物という前提が崩れる** |
| Google Forms 埋め込み | 完全無料・無制限 | デザイン統一が困難。UX が劣る |

**推奨: Formspree を既定とし、`<ContactForm>` の送信先を環境変数 `PUBLIC_CONTACT_ENDPOINT` で切り替え可能にする。**

この抽象化により、将来 Cloudflare Functions（`functions/api/contact.ts`）へ移行する際もコンポーネントの変更は不要です。スパム対策はハニーポット項目 + Formspree 標準機能とし、Cloudflare 運用に一本化した時点で Turnstile を追加します。

なお `/?s=` 旧検索 URL の受けは、`404.astro` と `search.astro` に配置する小さなスクリプトで `?s=` を `?q=` として解釈することで対応します（GitHub Pages がクエリ文字列リダイレクトに対応しないため、JS 側での処理が両ホスト共通解となります）。

---

## 9. 検証計画

本移行の失敗は**サイレントに起きます**（ビルドは通り、ページも出るが、URL がずれている／日本語検索が効かない）。したがって検証は目視ではなく、**CI で機械的に強制**します。

### 9.1 URL 保全検証（最重要・CI 必須）

移行前に `data/legacy-urls.json` として**旧 URL 台帳を確定**させます（旧サイトの `wp-sitemap.xml`・RSS・全ページクロール・可能なら Search Console と Google Analytics の流入 URL を統合）。以下は不変ファイルとしてコミットし、移行の基準点とします。

`scripts/verify-urls.mjs` が CI で次を検証し、1 件でも失格ならビルドを落とします。

1. 台帳の各 URL に対応する `dist/**/index.html` が存在するか。
2. 存在しない場合、`_redirects` に該当ルールがあるか。
3. どちらもない場合 → **失敗**（Exit 1）。
4. 逆方向: 各記事の `permalink` が `date` から導かれる `/YYYY/MM/DD/` と一致するか（§5.2 のタイムゾーン事故検出）。
5. 各ページの canonical が自己 URL と一致し、末尾スラッシュを持つか。

### 9.2 コンテンツ同一性検証

`scripts/verify-content.mjs` が、旧サイト HTML と新 `dist` の記事本文からテキストのみを抽出（タグ・空白を正規化）して比較し、**類似度 98% 未満の記事を一覧化**します。HTML→Markdown 変換での本文欠落（WP ブロック・ショートコード・ギャラリーの取りこぼし）を検出する目的です。差分は目視レビューにかけます。

### 9.3 リンク検証

`lychee` で `dist` 内の全リンクを検査。内部リンク切れは CI 失敗、外部リンク切れは警告とします。特に**旧ドメイン絶対 URL の残存**（本文中の `https://imleaw.com/...` がリダイレクト経由になっていないか）を重点確認します。

### 9.4 機能テスト（Playwright）

| 対象 | 検証内容 |
|:---|:---|
| 検索 | `/search/` で**日本語 2 文字**を入力し結果が返ること。`<html lang="ja">` が出力されていること |
| ページネーション | 最終ページまで「次へ」で到達でき、`/page/1/` が存在しないこと |
| 地図 | ボタン押下で iframe が挿入されること。**初期ロードで Google へのリクエストが発生しない**こと |
| フォーム | 必須検証・ハニーポット・送信成功表示 |
| パンくず | 各階層で正しい構造化データが出力されること |
| レスポンシブ | 375 / 768 / 1440px でレイアウト崩れがないこと |

### 9.5 性能・品質（Lighthouse CI）

トップ・記事・カテゴリ・アクセス・検索の 5 種を対象に、N-01〜N-06 を**下限値として強制**（`lighthouserc.json` の `assert`）。下回れば CI 失敗とします。あわせて axe-core によるアクセシビリティ検査を実行します。

### 9.6 リリース後モニタリング（4 週間）

| 時期 | 実施 |
|:---|:---|
| 当日 | Search Console で新サイトマップ送信。カバレッジ確認 |
| +1 日 | クロールエラー・404 レポート確認 |
| +1 週 | インデックス数を移行前と比較 |
| +2 週 | 主要クエリの掲載順位を比較 |
| +4 週 | 検索流入が移行前比 95% 以上であることを確認（達成目標） |

---

## 10. Deployment & Hosting Strategy

### 10.1 ホスティング選定

**主系: Cloudflare Pages / 副系: GitHub Pages（ミラー）**

Cloudflare Pages を主系とする理由は §6.4 に示したとおりです。

1. **`_redirects` による真の 301 が使える**（GitHub Pages は不可）。SEO 保全が本件の第一目標である以上、これが決定的です。
2. `_headers` でキャッシュ制御・セキュリティヘッダを設定できる。
3. 日本国内からのレイテンシで有利。
4. 将来フォームを Pages Functions で自前化する余地がある。

GitHub Pages は「Cloudflare 障害時の待避先」および「成果物がホスト非依存であることの継続的な証明」として維持します。両方に同一成果物をデプロイし続けることで、特定ホストへのロックインを構造的に防ぎます。

### 10.2 ビルドパイプライン

```
[1] コンテンツ検証   astro check + Zod スキーマ（frontmatter 不備で停止）
[2] 静的ビルド       astro build → dist/
[3] 検索インデックス  pagefind --site dist
[4] リダイレクト生成  build-redirects.mjs → _redirects + メタリフレッシュ HTML
[5] URL 検証         verify-urls.mjs（失格ならここで停止）★
[6] リンク検証       lychee dist
[7] 品質ゲート       Lighthouse CI + axe（下限未達で停止）★
[8] デプロイ         Cloudflare Pages / GitHub Pages へ並行
```

★ の 2 工程が品質ゲートです。**これらを通らない成果物は公開されません。**

`package.json` のスクリプト:

```json
{
  "dev": "astro dev",
  "build": "astro check && astro build && pagefind --site dist && node scripts/build-redirects.mjs",
  "verify": "node scripts/verify-urls.mjs && lychee dist --offline",
  "test:e2e": "playwright test",
  "test:perf": "lhci autorun"
}
```

### 10.3 CI/CD

**PR 時（`ci.yml`）**: `build` → `verify` → `test:e2e` → `test:perf`。Cloudflare のプレビューデプロイ URL を PR にコメント。

**main マージ時**: 上記に加え、Cloudflare Pages（`wrangler pages deploy dist`）と GitHub Pages（`actions/deploy-pages`）へ並行デプロイ。

必要な Secrets: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（値はリポジトリに置かない）。

### 10.4 キャッシュ戦略（`public/_headers`）

| パス | Cache-Control |
|:---|:---|
| `/_astro/*`（ハッシュ付き） | `public, max-age=31536000, immutable` |
| `/wp-content/uploads/*` | `public, max-age=2592000` |
| `/pagefind/*` | `public, max-age=86400` |
| HTML | `public, max-age=0, must-revalidate` |

HTML を長期キャッシュしないことが重要です。長期キャッシュすると、記事を更新しても訪問者に古い内容が出続けます。

### 10.5 本番切替（カットオーバー）手順

SEO 事故はこの工程で起きるため、手順を固定します。

1. **移行前に旧サイトを完全保全**: 全ページの HTML・`wp-content/uploads` 全体・DB ダンプを取得し、`data/wp-export/` として保管（ロールバックの前提）。
2. `data/legacy-urls.json`（旧 URL 台帳）を確定。
3. Cloudflare Pages のプレビュー URL で §9 の全検証を通過させる。
4. **DNS の TTL を事前に 300 秒へ下げる**（切替の 24 時間以上前に実施。これを忘れると切り戻しに数時間かかります）。
5. **旧 WordPress は停止せず稼働させたまま** DNS を切り替える。
6. 切替後、`verify-urls.mjs` を**本番 URL に対して**再実行。
7. Search Console に新サイトマップを送信。
8. §9.6 のモニタリングを開始。
9. **4 週間の観測完了まで WordPress 環境を保持**。問題があれば DNS を戻すだけで即時復旧できる状態を維持する。
10. 観測完了後に WordPress を停止。

---

## 11. 運用（記事投稿方法）— **承認時に選択が必要**

WordPress 管理画面の廃止は、サイト運用者にとって最も体感の大きい変化です。3 案を提示します。

| 案 | 長所 | 短所 | 適する運用者 |
|:---|:---|:---|:---|
| **Decap CMS**（推奨） | ブラウザ上の管理画面。WP に近い操作感。画像の D&D 対応。無料 | 初期設定に認証（GitHub OAuth）の構築が必要 | WP と同じ感覚で運用したい |
| GitHub Web UI | 追加構築ゼロ | Markdown の直接編集。画像アップロードが手作業 | Git に慣れている |
| Obsidian + Git | 執筆体験が良い。オフライン可 | PC 必須。同期設定が必要 | ローカルで書きたい |

**推奨は Decap CMS** です。運用者が非エンジニアの場合、投稿手段の難化はサイトの更新頻度低下に直結し、移行で得た性能・コストの利点を打ち消します。ただし構築工数が増えるため、**どの案を採るかご判断ください**（要件未確定事項）。

---

## 12. Phase 0（実サイト棚卸し）と分岐判断ポイント

実装着手前に、次を機械的に確定させます。

```bash
# 1. 全 URL の列挙（サイトマップ + 全クロール）
curl -s https://imleaw.com/wp-sitemap.xml
wget --spider -r -np -nd --reject-regex 'wp-admin' https://imleaw.com/ 2>&1 | grep '^--' 

# 2. コンテンツ構造（REST API が公開されていれば最も正確）
curl -s 'https://imleaw.com/wp-json/wp/v2/posts?per_page=100&_embed'
curl -s 'https://imleaw.com/wp-json/wp/v2/pages?per_page=100'
curl -s 'https://imleaw.com/wp-json/wp/v2/categories?per_page=100'

# 3. 画像の総量とファイル数
wget -r -np -nd -A jpg,jpeg,png,gif,webp https://imleaw.com/wp-content/uploads/
du -sh uploads/ && find uploads/ -type f | wc -l

# 4. 現行テーマの DOM・配色・タイポグラフィ（デザイン再現の基準）
```

REST API が無効化されている場合は、WP 管理画面からの WXR エクスポート（ツール → エクスポート）に切り替えます。

### 分岐判断ポイント（Phase 0 の結果次第で方式が変わる 4 点）

| # | 確認事項 | 分岐 |
|:--:|:---|:---|
| **A** | パーマリンク形式が本当に `/YYYY/MM/DD/slug/` か | 異なる場合（`/slug/` や `/?p=id`）はルーティング定義を差し替え。**設計の骨格は不変** |
| **B** | `uploads` の総容量 | ≤ 500MB → §7.2 の二層構成をそのまま採用。> 500MB → 互換層を被リンクのある画像のみに限定 |
| **C** | 日本語スラッグの有無 | 有る場合、パーセントエンコード済み文字列をそのまま保持（§5.4） |
| **D** | コメント・問い合わせフォームの実在 | コメントがあれば静的保存。フォームの現行仕様に合わせて §8.4 の案を確定 |

---

## 13. 実装フェーズ計画

| Phase | 内容 | 完了条件 |
|:---|:---|:---|
| **0. 棚卸し** | §12 の実行。`legacy-urls.json` 確定 | 全 URL・全画像・全記事が手元にある |
| **1. 基盤** | Astro 初期化、`content.config.ts`、`permalink.ts`、`.nojekyll` | 空サイトが両ホストでビルド・デプロイできる |
| **2. 移行** | エクスポート → Markdown 変換、画像取得 | 全記事が `src/content/posts/` にあり `astro check` が通る |
| **3. ルーティング** | §6 の全ルート実装 | `verify-urls.mjs` が全件通過 ★ |
| **4. デザイン** | トークン、レイアウト、全コンポーネント | 主要 5 ページが全ブレークポイントで完成 |
| **5. 機能** | 検索・地図・Instagram・フォーム | §9.4 の E2E が全通過 |
| **6. 品質** | 最適化、構造化データ、CI 整備 | Lighthouse 全項目 ≥ 95 ★ |
| **7. 切替** | §10.5 の実行 | 本番 URL に対する検証が全通過 |
| **8. 観測** | §9.6 の 4 週間モニタリング | 検索流入 95% 以上を確認、WP 停止 |

★ = 品質ゲート。未達の場合は次フェーズへ進みません。

---

## 14. リスクと対策

| リスク | 影響 | 対策 |
|:---|:---|:---|
| **URL のずれによる検索順位喪失** | **致命的** | §5.2 の permalink 固定 + §9.1 の CI 強制検証。設計上の最優先事項 |
| タイムゾーン起因の日付ずれ | 大 | `date` に `+09:00` を必須化。permalink との突合をビルド時に実施 |
| `.nojekyll` 忘れ | 大（CSS/画像が全消失） | Phase 1 の完了条件に組み込み |
| HTML→Markdown での本文欠落 | 中 | §9.2 の類似度検証で全記事を機械的に突合 |
| Cloudflare の 20,000 ファイル制限超過 | 中 | §7.1 の派生サムネイル除去。Phase 0 で実数を確認 |
| Pagefind で日本語がヒットしない | 中 | `lang="ja"` の出力を §9.4 で E2E 検証 |
| 運用者が記事を投稿できなくなる | 中 | §11 で投稿手段を確定してから切替 |
| 移行後に致命的問題が発覚 | 中 | WP を 4 週間保持。DNS 切り戻しのみで復旧（§10.5） |

---

## 15. 未確定事項（承認前にご判断いただきたい点）

1. **記事の投稿方法**（§11）— Decap CMS / GitHub Web UI / Obsidian のいずれか。**推奨は Decap CMS**。
2. **問い合わせフォーム**（§8.4）— Formspree（推奨）/ Cloudflare Functions / Google Forms。現行の問い合わせ手段が Phase 0 で判明次第、確定します。
3. **デザイン方針** — Kale テーマの「再現」か「刷新」か。**推奨は、既存の配色・世界観を保ちつつタイポグラフィと余白を刷新する中間案**。全面刷新は既存訪問者の混乱と検証コストを招き、完全再現は移行の利点を活かしきれません。
4. **Instagram 連携の深さ**（§8.3）— 静的グリッド（推奨）か、Graph API による自動更新か。
5. **日付アーカイブ**（F-07）— 現行 WP の出力有無を Phase 0 で確認後に確定。

---

## 承認のお願い

本仕様書（`docs/spec.md`）をご確認のうえ、**承認（Approved）** または修正指示をお願いいたします。

特に §15 の 5 点についてご判断いただけますと、Phase 0 完了後ただちに実装へ着手できます。また §12 の分岐判断 A〜D は Phase 0 の実測後に結果をご報告し、必要であれば本仕様を改訂して再承認をいただきます。
