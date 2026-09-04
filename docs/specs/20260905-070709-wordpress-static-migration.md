# imleaw.com WordPress → 静的サイト移行 技術仕様書

## Revision History

| Rev | Run ID | 日付 | 変更概要 | 承認 |
|:---:|:---|:---|:---|:--:|
| 1 | 20260905-070709-wordpress-static-migration | 2026-09-05 | 初版（Astro による静的サイト移行アーキテクチャ設計） | ⏸ |
| **2** | 20260905-070709-wordpress-static-migration | **2026-09-05** | **実サイト棚卸し完了・全確定値反映・ユーザー承認済み。** ①記事431本/固定ページ11枚/カテゴリ5件/メディア565点確定 ②ルーティング確定（トップ`/`は固定ページ`home`、記事一覧は`/blogs/`） ③パーセントエンコード日本語スラッグ対応 ④問い合わせは`mailto:`＋コピー補助UI ⑤デザインは中間案（CSSデザイントークンによるフォント・サイズ・余白の厳格統一と一括更新設計）を採用 | ✅ |

---

## 0. 本仕様書の確定状態

Rev 1 で保留していた事項は、**実サイト `https://imleaw.com/` の棚卸しにより全件解決済み**です。本仕様書に未確定事項（`（要 Phase 0 確認）`）は残っていません。

| 区分 | 状態 |
|:---|:---|
| アーキテクチャ・技術選定・ルーティング・ビルド・デプロイ・検証 | **確定** |
| 実データ由来の定数（記事数・ページ・カテゴリ・メディア） | **確定**（実測値・下表） |
| 運用方式（投稿手段・フォーム・地図・Instagram） | **確定**（§8・§11） |
| 残る判断事項 | **デザイン方針 1 点のみ**（§15） |

### 0.1 棚卸しの一次情報

- 取得元: WordPress REST API（`/wp-json/wp/v2/*`）
- 取得日: 2026-09-05
- 保存先: **`data/wp-inventory.json`**（コミット済み・以後の全期待値の基準点）

### 0.2 確定インベントリ（As-Is 実測）

| 項目 | 実測値 |
|:---|:---|
| サイト名 | `Im Leaw イム・レーオ` |
| キャッチフレーズ | `須坂の小さなパン工房 イム・レーオ` |
| サイト URL | `https://imleaw.com` |
| タイムゾーン | `Asia/Tokyo`（`gmt_offset: 9`） |
| **投稿（post）総数** | **431** |
| **固定ページ（page）総数** | **11** |
| **カテゴリ総数** | **5** |
| **メディア総数** | **565** |
| タグ総数 | **0**（taxonomy 不使用） |
| パーマリンク構造 | `/%year%/%monthnum%/%day%/%postname%/`（Day and name） |
| スラッグ形式 | **パーセントエンコード済み日本語**（小文字 16 進）。一部のみ英数 |
| テーマ | **Kale**（LyraThemes）— メディアの画像サイズに `kale-thumbnail` / `kale-slider` が存在することで確証 |
| フロントページ | **静的フロントページ**（固定ページ `home` が `/`）。記事一覧は `/blogs/` |

### 0.3 カテゴリ実測値（5 件・確定）

| # | 表示名 | slug（URL に使う正）| 記事数 | term_id |
|:--:|:---|:---|--:|--:|
| 1 | パンについて | `%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6` | 252 | 4 |
| 2 | 日々の暮らし | `%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97` | 118 | 5 |
| 3 | 須坂 | `%e9%a0%88%e5%9d%82` | 48 | 3 |
| 4 | 庭について | `%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6` | 25 | 7 |
| 5 | 未分類 | `uncategorized` | 19 | 1 |
| | **合計（延べ）** | | **462** | |

> **重要**: 延べ 462 は記事総数 431 を **31 上回ります**。これは複数カテゴリに属する記事が存在することを意味し、異常ではありません。§9 の検証スクリプトは「カテゴリ件数の合計＝記事数」を条件にしてはならず、**`462 ≠ 431` を期待値として明示的に許容**します。この取り違えは、正しい移行を「壊れている」と誤判定させる典型的な罠です。

### 0.4 固定ページ実測値（11 枚・確定）

| # | タイトル | slug | 公開 URL |
|:--:|:---|:---|:---|
| 1 | Home | `home` | `/`（静的フロントページ） |
| 2 | Blog | `blogs` | `/blogs/` |
| 3 | About the lesson | `about-the-lesson` | `/about-the-lesson/` |
| 4 | Basicー基礎ー | `basic-course` | `/basic-course/` |
| 5 | Middleー中級ー | `advanced-course` | `/advanced-course/` |
| 6 | ハードパン | `%e9%ab%98%e5%8a%a0%e6%b0%b4%e3%83%91%e3%83%b3%e3%82%b3%e3%83%bc%e3%82%b9` | `/%e9%ab%98%e5%8a%a0%e6%b0%b4%e3%83%91%e3%83%b3%e3%82%b3%e3%83%bc%e3%82%b9/` |
| 7 | Who am I | `who-am-i` | `/who-am-i/` |
| 8 | Messsage | `messsage` | `/messsage/` |
| 9 | Access & Contacts | `contacts` | `/contacts/` |
| 10 | Instagram | `instagram` | `/instagram/` |
| 11 | Line公式アカウント始めました！ | `line%e5%85%ac%e5%bc%8f%e3%82%a2%e3%82%ab%e3%82%a6%e3%83%b3%e3%83%88%e5%a7%8b%e3%82%81%e3%81%be%e3%81%97%e3%81%9f%ef%bc%81` | `/line%e5%85%ac%e5%bc%8f%e3%82%a2%e3%82%ab%e3%82%a6%e3%83%b3%e3%83%88%e5%a7%8b%e3%82%81%e3%81%be%e3%81%97%e3%81%9f%ef%bc%81/` |

この一覧から、本移行で**絶対に守るべき規約が 3 つ**導かれます。

1. **タイトルとスラッグは無関係**。#6 はタイトルが「ハードパン」なのに slug は `高加水パンコース` のエンコード結果です。タイトル改称後もスラッグが凍結された痕跡であり、**タイトルからスラッグを再生成する実装は URL を破壊します**。
2. **綴りの誤りも資産**。#8 の `messsage`（s が 3 つ）は現に検索エンジンに登録された URL です。「修正」してはいけません。
3. **`/` と `/blogs/` は別物**。トップは固定ページであり、記事一覧ではありません（§6.4）。

### 0.5 メディア実測値（565 点・確定）

- 総数 **565**。`/wp-content/uploads/YYYY/MM/` 配下。
- 大判画像は `full` の実体が **`-scaled.jpg`**（例: `/wp-content/uploads/2024/09/IMG_1527-scaled.jpg`、2560×1920）。
- 1 点あたりの派生サイズは最大 10 種（`thumbnail` / `medium` / `medium_large` / `large` / `1536x1536` / `2048x2048` / `post-thumbnail` / `kale-slider` / `kale-thumbnail` / `full`）。
- サイトアイコン（favicon）実体: `/wp-content/uploads/2025/11/cropped-cropped-334829534_...-1.jpg`（512×512）。

---

## 1. Executive Summary

### 目的

長野県須坂市のパン工房 **Im Leaw（イム・レーオ）** のサイトを、WordPress（Kale テーマ）から **Astro 5.x による完全静的サイト**へ移行する。

### 移行対象の規模（確定）

| 対象 | 件数 |
|:---|--:|
| 記事 | 431 |
| 固定ページ | 11 |
| カテゴリアーカイブ（1 ページ目） | 5 |
| メディア原本 | 565 |
| **生成される HTML ページ総数（実測値からの確定計算・§6.7）** | **535** |

### 達成目標

| 目標 | 指標 |
|:---|:---|
| **SEO 資産の完全保全** | 既存 URL の 100%（記事 431・固定 11・カテゴリ 48・一覧 43 を含む **533 の必須 URL**）を、200 応答または恒久 301 で到達可能にする。検索流入は移行後 4 週間で移行前比 95% 以上を維持 |
| **表示速度** | Core Web Vitals すべて "Good"。LCP < 1.5s / CLS < 0.1 / INP < 200ms（Moto G4 相当・4G） |
| **運用コスト** | ホスティング費 0 円、WordPress の保守・脆弱性対応・バックアップ運用を撤廃 |
| **保守性** | 記事追加は Decap CMS からの投稿（＝Markdown 1 ファイルの追加）のみ。Git push で自動公開 |
| **可搬性** | GitHub Pages / Cloudflare Pages の**両方**で同一成果物が動作 |

### 中核となる設計判断

本移行の成否は、ほぼ **URL 保全**の一点に集約されます。実サイトのスラッグが**パーセントエンコードされた日本語**であることが判明したため、Rev 1 の方針をさらに厳密化します。

> **① 記事・固定ページの URL は「日付やタイトルから計算する」のではなく、「WordPress が実際に出力していた URL 文字列」を frontmatter に固定値として保持し、それを唯一の正とする。**
>
> **② パーセントエンコード文字列は「保存・出力（canonical / sitemap / RSS / redirects）」に用い、「ディスク上のディレクトリ名」にはデコード済み UTF-8 を用いる。この二表現を混同すると全 431 記事が 404 になる。**

①の理由は §5.2、②の理由は §6.3 に詳述します。いずれも**失敗がサイレント**（ビルドは成功し、ページも生成され、検索順位だけが消える）であるため、検出機構を設計に組み込みます（§9）。

---

## 2. Current State vs Proposed Changes

### 2.1 As-Is（現行・実測）

| 項目 | 現状 |
|:---|:---|
| CMS | WordPress（REST API 有効） |
| テーマ | Kale（LyraThemes 製・フード/レシピブログ向け無料テーマ） |
| 配信 | PHP による動的レンダリング |
| フロントページ | **静的フロントページ**（固定ページ `home`）。記事一覧は固定ページ `blogs`（`/blogs/`） |
| パーマリンク | `/YYYY/MM/DD/<percent-encoded-slug>/`（Day and name） |
| 記事 | 431 本 |
| 固定ページ | 11 枚 |
| 分類 | カテゴリ 5 件のみ。**タグは未使用** |
| 言語 | 日本語（`lang="ja"`） |
| タイムゾーン | Asia/Tokyo（GMT+9）。REST の `date` はローカル時刻（オフセット表記なし）、`date_gmt` が UTC |
| 画像 | `/wp-content/uploads/YYYY/MM/` 配下に原本 565 点。WP が最大 10 サイズの派生を自動生成 |
| 検索 | WP 標準の `?s=` サーバサイド検索 |
| 問い合わせ | 固定ページ `/contacts/`（Access & Contacts）。SNS は Instagram（`/instagram/`）と LINE 公式アカウント（固定ページ #11） |

### 2.2 To-Be（移行後）

| 項目 | 移行後 |
|:---|:---|
| 生成 | **Astro 5.x による静的ビルド（SSG、アダプタなし）** — 確定 |
| 配信 | Cloudflare Pages（主）/ GitHub Pages（副・ミラー） |
| パーマリンク | **完全維持**（`trailingSlash: 'always'` + `build.format: 'directory'` + permalink 固定値） |
| コンテンツ | `src/content/` 配下の Markdown/MDX + YAML frontmatter（Zod 型検査付き） |
| 分類 | カテゴリ 5 件（実 slug を凍結）。タグ機能は実装しない |
| 画像 | 原本 565 点を互換配置 + ビルド時に WebP/AVIF 変換 + `srcset` 生成 |
| 検索 | Pagefind によるクライアントサイド全文検索（CJK 分かち書き内蔵） — 確定 |
| 問い合わせ | **mailto リンク**（`imleaw17@gmail.com`）＋ アドレスコピー機能 ＋ LINE/Instagram 導線 — 確定 |
| 投稿手段 | **Decap CMS**（GitHub OAuth） — 確定 |

### 2.3 破壊的変更（ユーザー影響のあるもの）

| 変更 | 影響 | 対応 |
|:---|:---|:---|
| WP 管理画面の廃止 | ブラウザから記事投稿ができなくなる | **Decap CMS を実装**（§11）。`/admin/` で従来同等の投稿体験を提供 |
| コメント機能の廃止 | 既存コメントが表示されなくなる | 棚卸しでコメント表示は確認されず。移行時に `/wp-json/wp/v2/comments` を再取得し、**0 件であることを確認**したうえで機能ごと廃止。1 件でも存在すれば静的 HTML として記事下部に保存する（§9.6 のガード） |
| `?s=` サーバ検索の廃止 | 旧検索 URL が機能しない | `/?s=xxx` → `/search/?q=xxx` へ JS でリダイレクト（§8.5） |
| 添付ファイルページの廃止 | 565 点の添付ページ URL が消滅 | 画像本体 URL へ 301（§6.5） |
| タグ機能 | なし（現行でも未使用） | 実装しない |

---

## 3. Functional Requirements

| ID | 要件 | 受入条件（実データ基準） |
|:---|:---|:---|
| F-01 | 記事詳細ページ | `/YYYY/MM/DD/<encoded-slug>/` で表示。**431 本すべて**が 200。本文・日付・カテゴリ・アイキャッチを表示 |
| F-02 | 固定ページ | §0.4 の **11 枚すべて**が実 slug のまま 200。うち `home` は `/` に出力 |
| F-03 | トップページ | 固定ページ `home` の内容 + 最新記事 6 件のダイジェスト + ヒーロー |
| F-04 | 記事一覧 | `/blogs/` に全 431 本を新着順・10 件/ページで表示（**44 ページ**） |
| F-05 | ページネーション | `/blogs/page/2/` 〜 `/blogs/page/44/`、`/category/<slug>/page/N/`。**`page/1/` は生成せず 301** |
| F-06 | カテゴリ一覧 | `/category/<encoded-slug>/` で該当記事を一覧。**5 カテゴリ・全 48 ページ** |
| F-07 | 日付アーカイブ | `/YYYY/`、`/YYYY/MM/` を **431 件の permalink に実在する年月からのみ**生成（ハードコードしない） |
| F-08 | 全文検索 | `/search/` でクライアントサイド検索。**日本語 2 文字の部分一致**が機能すること |
| F-09 | パンくず | 全ページに表示 + `BreadcrumbList` 構造化データ |
| F-10 | RSS | `/feed/` で従来と同一パスの RSS 2.0 を配信。加えてカテゴリ別 `/category/<slug>/feed/` を 5 本 |
| F-11 | サイトマップ | `/sitemap-index.xml` を**自前生成**（エンコード形式を permalink とバイト一致させるため・§6.6）。旧 `/wp-sitemap.xml` から 301 |
| F-12 | Google Maps | `/contacts/` に遅延読み込みの地図埋め込み（§8.2） |
| F-13 | Instagram | `/instagram/` にプロフィールリンク + 自前ホストの静的グリッド（§8.3） |
| F-14 | お問い合わせ | `/contacts/` に `mailto:imleaw17@gmail.com` リンク、アドレス表示、ワンクリックコピー機能、LINE公式・Instagram導線を表示（§8.4） |
| F-15 | LINE 導線 | 固定ページ #11 を維持し、`/contacts/` からも LINE 公式アカウントへ導線を出す |
| F-16 | 404 ページ | サイト内導線を持つカスタム 404 |
| F-17 | 記事投稿 | Decap CMS（`/admin/`）から記事作成・画像アップロード・公開ができる（§11） |

## 4. Non-Functional Requirements

| ID | 要件 | 目標値 | 測定方法 |
|:---|:---|:---|:---|
| N-01 | LCP | < 1.5s | Lighthouse CI（モバイル・4G スロットリング） |
| N-02 | CLS | < 0.1 | 同上。全画像に `width`/`height` を必須化して担保 |
| N-03 | INP | < 200ms | 同上 |
| N-04 | 初期 JS 転送量 | < 30KB（gzip、`/search/` と `/admin/` を除く） | `astro build` のバンドル解析 |
| N-05 | Lighthouse スコア | Performance / A11y / Best Practices / SEO すべて ≥ 95 | CI で下限を強制、下回ればビルド失敗 |
| N-06 | アクセシビリティ | WCAG 2.1 AA。コントラスト比 4.5:1 以上 | axe-core を CI に組み込み |
| N-07 | ビルド時間 | **初回（画像キャッシュなし）< 20 分 / キャッシュヒット時 < 3 分** | CI 実測。§7.4 の根拠に基づく |
| N-08 | 対応ブラウザ | Chrome / Safari / Edge / Firefox 各最新 2 バージョン、iOS Safari 16+ | — |
| N-09 | URL 到達性 | **必須 533 URL + メディア 565 + 添付 565 の 100%** が 200 または 301 | §9.2 の検証スクリプト（CI で強制） |
| N-10 | JS 無効時 | 記事の閲覧・ナビゲーション・地図リンクが機能する | 手動確認 |
| N-11 | デプロイファイル数 | Cloudflare Pages の上限 20,000 に対し **50% 以下**（見積 約 6,300・§7.4） | `find dist -type f \| wc -l` を CI で検査 |

> **N-07 が Rev 1（< 90 秒）から緩和された理由**: 実測でメディアが 565 点、うち大判が 2560×1920 であることが判明しました。全点に AVIF 4 サイズを生成すると 4,500 回超のエンコードとなり、AVIF の符号化コスト（この解像度で 1〜3 秒/枚）から初回ビルドが 1 時間規模になります。§7.3 で「本文画像は WebP 3 サイズ / アイキャッチのみ AVIF 併用」と絞り込んだうえで、CI に画像キャッシュを持たせる前提の目標値です。**キャッシュを持たない CI 設定は N-07 を構造的に満たせません**（§10.3 で必須化）。

---

## 5. Architecture & Tech Stack

### 5.1 技術選定と根拠

#### 静的サイトジェネレータ: **Astro 5.x** を採用（確定）

| 候補 | 評価 |
|:---|:---|
| **Astro 5.x** ✅ | 後述の 7 要件すべてを標準機能で満たす唯一の選択肢 |
| 11ty | 高速で優秀だが、型付きコンテンツスキーマ・画像最適化・コンポーネントモデルがいずれもプラグイン任せで、統合の責任が自前になる |
| Vite SSG | ルーティング・コンテンツ層を自前実装することになり、本件の要件に対して低レベルすぎる |
| Next.js SSG | 本件に対して過剰。React ランタイムが N-04（JS < 30KB）と衝突する |

本件の要件と Astro の機能は 1 対 1 で対応します。

| 本件の要件 | Astro の対応機能 |
|:---|:---|
| URL 完全維持（431 + 11 + 48 + 43） | `trailingSlash: 'always'` + `build.format: 'directory'` + `getStaticPaths` による任意 URL 生成 |
| 型付きコンテンツ | Content Layer API + Zod スキーマ。frontmatter の欠落・型崩れを**ビルド時に検出** |
| 高速表示 | デフォルトで JS ゼロ出力。アイランドアーキテクチャで必要箇所のみ水和 |
| 画像最適化（565 点） | `astro:assets` が Sharp 経由で WebP/AVIF 変換と `srcset` を標準生成 |
| Pagefind 検索 | 静的 `dist/` に対する後処理として自然に統合 |
| コンポーネント設計 | `.astro` コンポーネント（スコープ CSS 付き）+ スロット |
| 両ホスティング対応 | アダプタなしの純静的出力。ホスト固有 API に依存しない |

**バージョン方針**: Astro 5 系に固定（`^5`）。**SSG モード（`output` 既定の static、アダプタなし）を確定**とし、SSR/ハイブリッドは採用しません。Content Layer API（`loader` ベース）は Astro 5 で安定化した機能であり、本設計はこれに依拠します。

#### スタック全体（確定）

| 領域 | 採用 | 根拠 |
|:---|:---|:---|
| SSG | Astro `^5`（SSG・アダプタなし） | 上表 |
| 言語 | TypeScript（`strict`） | frontmatter とルーティングの型崩れをビルド時に落とす |
| コンテンツ | Markdown（`.md`）主体、固定ページのみ MDX | 記事 431 本は素の Markdown で十分。MDX は地図・フォーム・Instagram グリッド埋め込みに限定 |
| スタイル | 素の CSS（`<style>` スコープ）+ CSS カスタムプロパティのデザイントークン | Tailwind は本件規模には過剰。Astro のスコープ CSS が未使用 CSS を構造的に排除する |
| 画像 | `astro:assets`（Sharp） | 標準機能。追加依存なし |
| 検索 | Pagefind `^1` | 静的サイト検索の事実上の標準。**CJK 分かち書きを内蔵** |
| RSS | `@astrojs/rss` | 公式 |
| サイトマップ | **自前生成**（`src/pages/sitemap-index.xml.ts` ほか） | `@astrojs/sitemap` は URL を独自にエンコードするため、WP と同一の小文字パーセントエンコードを保証できない（§6.6） |
| CMS | **Decap CMS `^3`**（GitHub backend） | §11 |
| フォーム | **Formspree** | §8.4 |
| Markdown 変換 | `turndown` + カスタムルール | 移行時のみ使用。本番依存ではない |
| Lint | Prettier + `prettier-plugin-astro`、ESLint | — |
| テスト | Vitest（ユーティリティ）、Playwright（E2E）、Lighthouse CI | — |
| パッケージ管理 | pnpm | ロック厳密性とディスク効率 |
| Node | 22 LTS（`.nvmrc` / `engines` で固定） | CI とローカルの一致 |

**Pagefind の日本語対応について**: Pagefind は言語別インデックスを構築し、CJK に対しては専用の分割処理を行います。これを機能させるには `<html lang="ja">` が正しく出力されている必要があります（Pagefind は `lang` 属性を見てインデックス戦略を切り替えるため）。この属性の欠落は**検索が「動くが日本語がヒットしない」という気づきにくい壊れ方**をするため、§9.5 で明示的に検証します。全 431 記事が日本語であるため、この検証は本件では必須です。

### 5.2 中核設計 ①：URL を frontmatter の固定値とする

**素朴な実装（採用しない）**

```
記事の date から year/month/day を算出 → /2024/09/10/<slug>/ を生成
タイトルから slug を生成
```

これは次の理由で破綻します。

1. **タイムゾーン**: WP REST の `date` はサイトローカル時刻を**オフセットなし**で返します（実データ例: `"2024-09-10T13:57:54"`）。これを JS の `new Date()` が UTC と解釈し `toISOString()` で整形すると `2024-09-10` のままですが、`"2024-05-24T10:41:58"` のような朝方の記事では、逆に JST 解釈した実装が UTC 前提の処理と混在した瞬間に 1 日ずれます。**9 時間以内に投稿された記事だけが壊れる**という部分的破損が起きます。431 本のうち何本が該当するかは分布次第で、レビューでは見つかりません。
2. **0 埋め**: `getMonth()+1` が `9` を返す一方、WP の URL は `09` です。
3. **スラッグはタイトルから再現できない**: §0.4 #6 が実例です（タイトル「ハードパン」／slug は「高加水パンコース」のエンコード）。#8 の `messsage` も同様に再現不能です。
4. **検出困難性**: いずれもビルドは成功し、ページも生成されます。壊れていることは、**検索順位が落ちてから**しか分かりません。

**採用する設計**

エクスポート時点で WordPress が実際に出力していた URL パス（REST の `link` フィールド）を取得し、frontmatter の `permalink` に固定値として書き込みます。ルーティングはこの値のみを参照します。

```yaml
permalink: "/2024/09/10/%e9%a3%9f%e3%83%91%e3%83%b3%e3%81%a8%e3%83%96%e3%83%aa%e3%82%aa%e3%83%83%e3%82%b7%e3%83%a5/"
date: 2024-09-10T13:57:54+09:00      # 表示用。オフセット必須
wpPostId: 1938
```

さらに、`date` から導出した `/YYYY/MM/DD/` と `permalink` の先頭 3 セグメントの不一致を**ビルド時にエラーとして落とす**チェックを入れます（§9.2-4）。これにより、上記の事故はすべて「ビルド失敗」という気づける形に変換されます。

`date` には**必ず `+09:00` オフセットを付与**します。エクスポータは REST の `date`（ローカル時刻）に `+09:00` を機械的に付与し、`date_gmt` との整合（差が正確に 9 時間）を**変換時にアサート**します。整合しない記事は変換を中断します。

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
│   ├── wp-export.mjs              # WP REST API → 中間 JSON（431 + 11 + 5 + 565）
│   ├── wp-to-markdown.mjs         # 中間 JSON → Markdown + frontmatter
│   ├── fetch-uploads.mjs          # 画像取得・WP 派生サイズ除去（-scaled は保持）
│   ├── build-legacy-urls.mjs      # インベントリ → data/legacy-urls.json（URL 台帳）
│   ├── build-redirects.mjs        # 台帳 → _redirects / メタリフレッシュ HTML
│   ├── verify-inventory.mjs       # 431/11/5/565 の件数アサート（CI 必須）★
│   ├── verify-urls.mjs            # URL 台帳 vs dist/ の突合（CI 必須）★
│   ├── verify-encoding.mjs        # パーセントエンコード往復検証（CI 必須）★
│   └── verify-content.mjs         # 旧新の本文テキスト差分
│
├── data/
│   ├── wp-inventory.json          # 棚卸し結果（不変・基準点）★
│   ├── legacy-urls.json           # 移行前 URL 台帳（不変・コミット対象）
│   ├── wp-post-id-map.json        # wpPostId → permalink（/?p=<id> 解決用）
│   └── wp-export/                 # WP 生エクスポート（監査証跡として保持）
│
├── public/
│   ├── admin/                     # Decap CMS（index.html + config.yml）
│   ├── wp-content/uploads/        # 原本 565 点。旧 URL 互換（§7.2）
│   ├── _redirects                 # Cloudflare Pages 用
│   ├── _headers                   # Cloudflare Pages 用
│   ├── favicon.svg / favicon.ico
│   ├── robots.txt
│   └── .nojekyll                  # GitHub Pages で _ 始まりを配信させる（必須）
│
├── src/
│   ├── content.config.ts          # Content Layer コレクション定義 + Zod スキーマ
│   │
│   ├── content/
│   │   ├── posts/                 # 記事 431 本: 2024-09-10-1938.md（§5.4）
│   │   └── pages/                 # 固定ページ 11 枚: home.mdx, contacts.mdx …
│   │
│   ├── assets/
│   │   ├── uploads/               # 最適化対象の画像実体（astro:assets 経由）
│   │   └── theme/                 # ロゴ・ヒーロー等のデザイン素材
│   │
│   ├── components/
│   │   ├── layout/ Header / Nav / Footer / Breadcrumb
│   │   ├── content/ Hero / PostCard / PostList / PostMeta / CategoryList / Pagination
│   │   ├── embed/  MapEmbed / InstagramGrid / ContactForm / LineButton
│   │   ├── media/  ResponsiveImage / Figure
│   │   └── seo/    BaseHead / StructuredData
│   │
│   ├── layouts/ BaseLayout / PostLayout / PageLayout / ArchiveLayout
│   │
│   ├── pages/                     # ルーティング（§6）
│   │   ├── index.astro                        # /  ← 固定ページ home
│   │   ├── 404.astro
│   │   ├── search.astro
│   │   ├── blogs/[...page].astro              # /blogs/ と /blogs/page/N/
│   │   ├── category/[slug]/[...page].astro
│   │   ├── category/[slug]/feed/index.xml.ts
│   │   ├── [year]/index.astro                 # /YYYY/
│   │   ├── [year]/[month]/index.astro         # /YYYY/MM/
│   │   ├── [year]/[month]/[day]/[slug].astro  # 記事 431
│   │   ├── feed/index.xml.ts
│   │   ├── sitemap-index.xml.ts
│   │   ├── sitemap-0.xml.ts
│   │   └── [...slug].astro                    # 固定ページ 10 枚（home を除く）
│   │
│   ├── styles/ tokens.css / global.css / typography.css
│   │
│   ├── lib/
│   │   ├── permalink.ts           # URL 生成・エンコード変換の単一責務モジュール ★
│   │   ├── paginate.ts
│   │   └── site.ts
│   │
│   └── config/
│       └── site.config.ts         # カテゴリ辞書・ナビ・SNS・地図座標
│
├── astro.config.mjs
├── package.json / tsconfig.json / lighthouserc.json / wrangler.toml / .nvmrc
```

**`public/.nojekyll` は必須です。** GitHub Pages は既定で Jekyll 処理を行い、`_` で始まるディレクトリ・ファイルを配信対象から除外します。Astro が出力する `_astro/`（CSS・JS・画像のすべて）がこれに該当するため、このファイルがないと**スタイルと画像が一切読み込まれないサイトが公開されます**。

### 5.4 コンテンツファイルの命名規約（新設・確定）

**記事ファイル名は `YYYY-MM-DD-<wpPostId>.md`（ASCII のみ）とします。** 例: `src/content/posts/2024-09-10-1938.md`

理由は 2 つあり、いずれも実データから導かれた必須の規約です。

1. **ファイル名長**: エンコード済みスラッグは最長で 130 文字超になります（実例: `%e3%82%b9%e3%83%91%e3%82%a4%e3%82%b7%e3%83%bc%e3%83%99%e3%83%bc%e3%82%b3%e3%83%b3%e3%82%a8%e3%83%94%e3%81%ae%e7%b7%b4%e7%bf%92` = 126 文字）。日付接頭辞と拡張子を足すと限界に近づき、環境によっては破綻します。
2. **Unicode 正規化**: デコードした日本語をファイル名にすると、macOS（NFD 寄り）と Linux CI（NFC）でファイル名が一致せず、**ローカルでは通り CI で落ちる（またはその逆の）** 事故が起きます。濁点・半濁点を含む「パン」「ブリオッシュ」等はまさに該当します。**リポジトリ内に日本語ファイル名を一切作らない**ことで、この問題を構造的に消します。

固定ページは英数 slug が使えるもの（`home`, `blogs`, `contacts` …）はそのまま、エンコード済み日本語 slug の 2 枚（§0.4 #6・#11）は `hard-bread.mdx` / `line-official.mdx` とし、**実 URL は frontmatter の `permalink` が保持**します。

### 5.5 データモデル

`src/content.config.ts` に Zod スキーマとして定義します。

#### posts コレクション（431 件）

```yaml
---
title: "食パンとブリオッシュ"
permalink: "/2024/09/10/%e9%a3%9f%e3%83%91%e3%83%b3%e3%81%a8%e3%83%96%e3%83%aa%e3%82%aa%e3%83%83%e3%82%b7%e3%83%a5/"
date: 2024-09-10T13:57:54+09:00
updated: 2024-09-10T13:57:54+09:00        # 任意
draft: false
categories: ["%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6"]   # 実 slug のみ
heroImage: "../../assets/uploads/2024/09/IMG_1527-scaled.jpg"            # 任意
heroImageAlt: "焼き上がった食パンとブリオッシュ"                            # heroImage があれば必須
excerpt: "…"
wpPostId: 1938
wpFeaturedMediaId: 1939                    # 0 のときアイキャッチなし
---
```

スキーマ上の要点:

1. **`permalink` は正規表現で形式を強制**: `/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9%._~-]+\/$/`。`%` を許容するのはパーセントエンコード日本語のため、`.`・`_`・`~` は RFC 3986 の unreserved 文字として実在しうるためです。**大文字 16 進は不許可**（WP 出力が小文字であり、混在は canonical の揺れを生むため）。
2. **`categories` は §0.4/§0.3 の 5 slug のみを許容**: `z.enum([...])` で列挙し、タイプミスや未知カテゴリをビルド時に落とします。
3. **`heroImageAlt` は `heroImage` があるとき必須**（`superRefine` で条件付き必須化）。N-06 を仕組みで担保します。
4. **`date` はオフセット必須**: `z.string().datetime({ offset: true })` で検証してから `Date` へ変換します。
5. **`wpPostId` がある記事は `permalink` 必須**（移行済み記事の URL 凍結）。**新規記事（`wpPostId` なし）は `permalink` 省略可**とし、省略時は `date` と `slug` から JST 固定で導出します（§11.2）。431 本の既存記事は全件 `wpPostId` を持つため、この分岐で既存 URL が計算に晒されることはありません。

#### pages コレクション（11 件）

```yaml
---
title: "Access & Contacts"
permalink: "/contacts/"
wpPageId: 385
navOrder: 9
showInNav: true
description: "…"
layout: "default"      # "default" | "wide"
---
```

`home` のみ `permalink: "/"` を持ち、ルーティング上も特別扱いします（§6.4）。

#### カテゴリ辞書（`src/config/site.config.ts`）

WordPress の `name`（表示名・日本語）と `slug`（URL・エンコード済み）の対応はここに集約します。frontmatter 側は**スラッグのみ**を持ちます。

```ts
export const CATEGORIES = [
  { id: 4, slug: '%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6', name: 'パンについて',   count: 252 },
  { id: 5, slug: '%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97', name: '日々の暮らし',   count: 118 },
  { id: 3, slug: '%e9%a0%88%e5%9d%82',                                     name: '須坂',           count: 48  },
  { id: 7, slug: '%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6',         name: '庭について',     count: 25  },
  { id: 1, slug: 'uncategorized',                                          name: '未分類',         count: 19  },
] as const;
```

`count` は棚卸し時点の値で、**§9.3 の回帰検証にのみ使用**します（表示には使いません）。移行後の実件数がこれと一致しない場合、記事の取りこぼしまたはカテゴリ付与漏れが起きています。

---

## 6. ルーティング規約（実データ完全対応）

### 6.1 グローバル設定

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://imleaw.com',
  trailingSlash: 'always',        // WP と同じ末尾スラッシュ
  build: { format: 'directory' }, // /foo/ → dist/foo/index.html
});
```

この 2 設定が URL 保全の土台です。`format: 'directory'` により `/foo/index.html` が出力され、両ホストとも `/foo/` で配信します。`trailingSlash: 'always'` により、内部リンク・canonical・サイトマップのすべてが末尾スラッシュ付きで統一されます。

**片方だけ設定した場合の失敗**: `trailingSlash` のみ設定して `build.format` を `file` にすると、canonical は `/foo/` を指すのに実体は `/foo.html` となり、自己参照 canonical が壊れます。両方を明示するのはこのためです。

### 6.2 URL の 2 つの表現（本改訂の最重要規約）

実サイトのスラッグがパーセントエンコード日本語であるため、**同じ URL に 2 つの表現**が存在します。これを取り違えると全 431 記事が 404 になります。

| 表現 | 例 | 用途 |
|:---|:---|:---|
| **エンコード形式**（保存の正） | `/2024/09/10/%e9%a3%9f%e3%83%91%e3%83%b3.../` | frontmatter `permalink`、canonical、sitemap、RSS、`_redirects`、URL 台帳、Decap 表示 |
| **デコード形式**（出力の正） | `dist/2024/09/10/食パンとブリオッシュ/index.html` | **ディスク上のディレクトリ名**、`getStaticPaths` の `params` |

**なぜディスク側はデコード形式でなければならないか**: 静的ホスト（Cloudflare Pages / GitHub Pages）は、リクエストパスを**パーセントデコードしてから**ファイルを探索します。`/%e9%a3%9f.../` へのリクエストは `食パン…` という名前のディレクトリに解決されます。したがって、ディスク上に `%e9%a3%9f...` という**リテラル名**のディレクトリを作ると、そのファイルには**永久に到達できません**（到達するには `/%25e9%25a3%259f.../` が必要になる）。

`getStaticPaths` の `params` にエンコード済み文字列をそのまま渡すのは、まさにこのリテラル名ディレクトリを作る実装です。**これが本移行における最大の単一障害点**であり、§9.4 で専用の検証を置きます。

### 6.3 `src/lib/permalink.ts`（変換の単一責務モジュール）

```ts
/** permalink(エンコード形式) → getStaticPaths 用の params(デコード形式) */
export function parsePostPermalink(permalink: string) {
  const m = permalink.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/$/);
  if (!m) throw new Error(`Invalid post permalink: ${permalink}`);
  const [, year, month, day, encodedSlug] = m;
  return { year, month, day, slug: decodeURIComponent(encodedSlug) };
}

/** デコード形式 → WP と同一のエンコード形式（小文字16進）に戻す */
export function toWpEncoded(decoded: string): string {
  return encodeURIComponent(decoded).replace(
    /%[0-9A-F]{2}/g,
    (s) => s.toLowerCase(),
  );
}

/** 往復検証: エンコード→デコード→エンコード が元と一致すること */
export function assertRoundTrip(permalink: string): void {
  const { slug } = parsePostPermalink(permalink);
  const encoded = permalink.split('/')[4];
  if (toWpEncoded(slug) !== encoded) {
    throw new Error(`Encoding round-trip failed: ${permalink} → ${toWpEncoded(slug)}`);
  }
}
```

3 点が重要です。

- **`throw` する**: 不正な `permalink` はビルドを止めます。404 を静かに生む代わりにエラーを出します。
- **小文字化**: `encodeURIComponent` は大文字 16 進（`%E9`）を返しますが、WP は小文字（`%e9`）です。RFC 3986 上は等価ですが、canonical・sitemap・台帳の文字列比較を安定させるため小文字に正規化します。
- **canonical は `permalink` を verbatim 出力**: `Astro.url` から組み立てません。`Astro.url` はデコード形式のパスを持つため、ブラウザ・クローラの再エンコードに依存した揺れが生じます。

### 6.4 ルーティング全体マップ（確定）

#### (a) 固定ページ 11 枚

| # | URL | 実装 | 出力先 | 備考 |
|:--:|:---|:---|:---|:---|
| 1 | `/` | `pages/index.astro` | `dist/index.html` | 固定ページ `home` を描画。**`[...slug].astro` の対象外** |
| 2 | `/blogs/` | `pages/blogs/[...page].astro` | `dist/blogs/index.html` | 固定ページ `blogs` の内容 + 記事一覧 1 ページ目 |
| 3 | `/about-the-lesson/` | `pages/[...slug].astro` | `dist/about-the-lesson/index.html` | |
| 4 | `/basic-course/` | 同上 | `dist/basic-course/index.html` | |
| 5 | `/advanced-course/` | 同上 | `dist/advanced-course/index.html` | タイトルは「Middleー中級ー」 |
| 6 | `/%e9%ab%98%e5%8a%a0%e6%b0%b4%e3%83%91%e3%83%b3%e3%82%b3%e3%83%bc%e3%82%b9/` | 同上 | `dist/高加水パンコース/index.html` | タイトルは「ハードパン」。**slug を再生成しない** |
| 7 | `/who-am-i/` | 同上 | `dist/who-am-i/index.html` | |
| 8 | `/messsage/` | 同上 | `dist/messsage/index.html` | **`s` 3 つを維持** |
| 9 | `/contacts/` | 同上（MDX） | `dist/contacts/index.html` | 地図・フォーム・LINE 導線 |
| 10 | `/instagram/` | 同上（MDX） | `dist/instagram/index.html` | 静的グリッド |
| 11 | `/line%e5%85%ac%e5%bc%8f%e3%82%a2%e3%82%ab%e3%82%a6%e3%83%b3%e3%83%88%e5%a7%8b%e3%82%81%e3%81%be%e3%81%97%e3%81%9f%ef%bc%81/` | `pages/[...slug].astro` | `dist/line公式アカウント始めました！/index.html` | 末尾は全角感嘆符（U+FF01）。エンコードは `%ef%bc%81` |

`pages/[...slug].astro` の `getStaticPaths` は **pages コレクションから `home` を除外**し、`permalink` をデコードして `slug` パラメータに渡します。

#### (b) 記事 431 本

| URL 形式 | 実装 | 生成数 |
|:---|:---|--:|
| `/YYYY/MM/DD/<encoded-slug>/` | `pages/[year]/[month]/[day]/[slug].astro` | **431** |

`getStaticPaths` は 431 件の `permalink` を `parsePostPermalink()` で分解して供給します。**日付から再計算しません。**

#### (c) 記事一覧のページネーション（10 件/ページ）

| URL | 生成数 | 備考 |
|:---|--:|:---|
| `/blogs/` | 1 | 1 ページ目（`/blogs/page/1/` は**生成しない**） |
| `/blogs/page/2/` 〜 `/blogs/page/44/` | 43 | `ceil(431 / 10) = 44` ページ |
| **小計** | **44** | |

#### (d) カテゴリアーカイブ 5 件（10 件/ページ）

| # | カテゴリ | 1 ページ目 URL | 記事数 | 総ページ数 | 追加ページ URL |
|:--:|:---|:---|--:|--:|:---|
| 1 | パンについて | `/category/%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6/` | 252 | **26** | `…/page/2/` 〜 `…/page/26/` |
| 2 | 日々の暮らし | `/category/%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97/` | 118 | **12** | `…/page/2/` 〜 `…/page/12/` |
| 3 | 須坂 | `/category/%e9%a0%88%e5%9d%82/` | 48 | **5** | `…/page/2/` 〜 `…/page/5/` |
| 4 | 庭について | `/category/%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6/` | 25 | **3** | `…/page/2/` 〜 `…/page/3/` |
| 5 | 未分類 | `/category/uncategorized/` | 19 | **2** | `…/page/2/` |
| | **合計** | | 462（延べ） | **48** | |

出力先ディレクトリはデコード形式になります（例: `dist/category/パンについて/index.html`）。

#### (e) 日付アーカイブ

| URL | 実装 | 生成規則 |
|:---|:---|:---|
| `/YYYY/` | `pages/[year]/index.astro` | **431 件の permalink に実在する年のみ** |
| `/YYYY/MM/` | `pages/[year]/[month]/index.astro` | **431 件の permalink に実在する年月のみ** |

年月の一覧は**ハードコードせず**、コレクションから導出します。存在しない年月の URL は WP でも 404 だったため、生成しないことが正しい挙動です。生成された年月の集合は `data/legacy-urls.json` に記録され、§9.2 で突合されます。

#### (f) 機能ページ・フィード

| URL | 実装 | 備考 |
|:---|:---|:---|
| `/search/` | `pages/search.astro` | Pagefind UI。ここでのみ検索 JS を読み込む |
| `/feed/` | `pages/feed/index.xml.ts` → `dist/feed/index.xml` | §6.6 |
| `/category/<slug>/feed/` | `pages/category/[slug]/feed/index.xml.ts` | 5 本 |
| `/sitemap-index.xml` | `pages/sitemap-index.xml.ts` | 自前生成 |
| `/sitemap-0.xml` | `pages/sitemap-0.xml.ts` | 全 URL（エンコード形式 verbatim） |
| `/404.html` | `pages/404.astro` | 両ホストが自動採用 |
| `/admin/` | `public/admin/index.html` | Decap CMS（`noindex`・sitemap 対象外） |

#### (g) ルート優先度と予約語

Astro は静的セグメントを動的セグメントより優先し、rest パラメータ（`[...slug]`）を最後に評価します。したがって `/category/須坂/` は `[...slug].astro` ではなく `category/[slug]/` に正しく解決されます。

**実データによる衝突検査の結果**: 予約語 `category` / `page` / `search` / `feed` / `admin` / `blogs`（記事一覧が使用）に対し、11 枚の固定ページ slug（§0.4）との衝突は**ゼロ**です。ただし `blogs` は固定ページと記事一覧ルートが**意図的に同居**する唯一のケースであり、`pages/blogs/[...page].astro` が固定ページ `blogs` の本文とページネーションの両方を描画する責務を持ちます。予約語は `site.config.ts` に列挙し、Decap CMS からの新規固定ページ作成時にもバリデーションします。

### 6.5 リダイレクト方針（旧 URL → 新 URL）

| 旧 URL パターン | 件数 | 対応 | 理由 |
|:---|--:|:---|:---|
| `/YYYY/MM/DD/<slug>/` | 431 | **維持（200）** | 最重要資産 |
| 固定ページ 11 枚 | 11 | **維持（200）** | 同上 |
| `/category/<slug>/`（+ページ） | 48 | **維持（200）** | 同上 |
| `/blogs/`（+ページ） | 44 | **維持（200）** | 同上 |
| `/YYYY/`、`/YYYY/MM/` | 導出 | **維持（200）** | WP が出力していたため |
| `/wp-content/uploads/**` | 565 | **維持（200）** | 画像の被リンク・画像検索保全（§7.2） |
| `/feed/` | 1 | **維持（200）** | 購読者保全（§6.6） |
| `/blogs/page/1/`、`/category/*/page/1/` | 6 | 各 1 ページ目へ **301** | 重複コンテンツ回避 |
| `/page/N/` | 44 | `/blogs/page/N/` へ **301** | 静的フロントページ運用のため WP でも未出力だが、外部リンク保険として設置 |
| `/home/` | 1 | `/` へ **301** | 固定ページ `home` の別名到達を吸収 |
| 添付ファイルページ | 565 | 画像本体 URL へ **301** | REST media の `link` から機械生成 |
| `/wp-sitemap.xml`、`/wp-sitemap-*.xml` | 数件 | `/sitemap-index.xml` へ **301** | — |
| `/?p=<id>`、`/?page_id=<id>` | — | 該当 permalink へ **301 相当** | §6.5.1（JS 解決） |
| `/?s=<query>` | — | `/search/?q=<query>` | §6.5.1（JS 解決） |
| `/comments/feed/` | 1 | `/feed/` へ **301** | コメント廃止のため |
| `/author/*/` | — | `/` へ **301** | 単一著者サイト |
| `/wp-admin/`、`/wp-login.php` | — | **410 Gone** | 攻撃ボット由来。404 より明示的に閉じる |
| `/wp-json/**` | — | **410 Gone** | 同上（移行完了後） |
| `/tag/*/` | — | `/` へ **301** | タグ未使用だが誤リンク保険 |

#### 6.5.1 クエリ文字列の扱い（両ホスト共通解）

`/?p=1938` のようなクエリ付き URL は、**サーバ側ではルート `/` が 200 で返る**ため 404 ハンドラには到達しません。したがってリダイレクトは**トップページに置いた小さなインラインスクリプト**（1KB 未満、N-04 の範囲内）で解決します。

- `?p=<id>` / `?page_id=<id>` → `data/wp-post-id-map.json`（ビルド時に埋め込む、431 + 11 エントリ）で permalink を引いて `location.replace()`
- `?s=<query>` → `/search/?q=<query>` へ
- 該当なしはそのままトップを表示

Cloudflare Pages では `_redirects` によるクエリ一致の真の 301 も**追加で**設定します（GitHub Pages では不可のため、JS 側が唯一の共通解であり主機構です）。

#### 6.5.2 ホストによる差（重要）

| | Cloudflare Pages | GitHub Pages |
|:---|:---|:---|
| `_redirects` によるサーバ 301 | ✅ 対応 | ❌ **非対応** |
| `_redirects` による 200 リライト | ✅ 対応 | ❌ 非対応 |
| カスタムヘッダ（`_headers`） | ✅ 対応 | ❌ 非対応 |
| クエリ文字列マッチ | ✅ 対応 | ❌ 非対応 |

GitHub Pages では真の 301 を返せません。したがって `scripts/build-redirects.mjs` は**同一の台帳（`data/legacy-urls.json`）から 2 種類の成果物を生成**します。

1. Cloudflare 向け: `public/_redirects`（**総ルール数 見積 約 700**。Cloudflare Pages の上限 2,100 に対し十分な余裕）
2. GitHub Pages 向け: 各旧 URL に `<meta http-equiv="refresh">` + `<link rel="canonical">` + JS 即時遷移を持つ HTML（**約 660 ファイル**）

メタリフレッシュは Google が「301 に準ずるもの」として扱いますが、伝達は遅く、評価も 301 に劣ります。**この差が、Cloudflare Pages を主系とする最大の技術的理由です**（§10.1）。

### 6.6 RSS とサイトマップ（実装上の注意・確定）

#### `/feed/` の配信

静的ホストはディレクトリに対して `index.html` しかインデックス配信しません。`dist/feed/index.xml` を置いても `/feed/` は 404 になります。両ホストで挙動が異なるため、次で確定します。

| ホスト | 方式 |
|:---|:---|
| Cloudflare Pages（主） | `dist/feed/index.xml` を出力し、`_redirects` に `/feed/ /feed/index.xml 200`（**リライト**）を設定。Content-Type は `application/xml` で正しく配信される |
| GitHub Pages（副） | リライト不可のため、`dist/feed/index.html` に RSS XML 本文を出力する。Content-Type は `text/html` となり厳格なリーダーでは劣化する（**既知の制約**として受容） |

加えて、両ホストで `/feed.xml` を正規の別名として出力し、`<link rel="alternate" type="application/rss+xml" href="/feed/">` は従来どおり `/feed/` を指します（既存購読者の URL を変えないため）。

#### サイトマップを自前生成する理由

`@astrojs/sitemap` は Astro のルート情報から URL を再構成する際、**独自にパーセントエンコードを行い、大文字 16 進を出力します**。WP の canonical（小文字）と表記が揺れるため、**`permalink` 文字列を verbatim で書き出す自前実装**に切り替えます。実装は 40 行程度であり、依存を 1 つ減らす利点もあります。

サイトマップに含める URL: 記事 431 + 固定ページ 11 + カテゴリ 1 ページ目 5 + `/blogs/` 1 + 日付アーカイブ（導出分）。**ページネーション 2 ページ目以降・`/search/`・`/admin/` は含めません**（インデックス希薄化の回避）。

### 6.7 生成 HTML ページ数（確定計算）

| 区分 | 件数 |
|:---|--:|
| 記事 | 431 |
| 固定ページ（`/` と `/blogs/` を含む） | 11 |
| `/blogs/page/2..44/` | 43 |
| カテゴリアーカイブ（1 ページ目 5 + 2 ページ目以降 43） | 48 |
| `/search/` | 1 |
| `/404.html` | 1 |
| **小計（日付アーカイブを除く）** | **535** |
| 日付アーカイブ `/YYYY/`・`/YYYY/MM/` | 導出（ビルド時に確定・台帳へ記録） |

**§9 の検証で用いる「必須 URL 台帳」の確定件数は 533**（535 から `/search/` と `/404.html` を除いた、旧サイトに実在した URL の数）です。

---

## 7. アセットと画像（565 点）

### 7.1 移行手順と派生ファイルの扱い（Rev 1 から方針変更）

`scripts/fetch-uploads.mjs` が `/wp-content/uploads/` を取得したうえで、**WordPress が自動生成した寸法付き派生（`-150x150.jpg`、`-300x225.jpg`、`-768x576.jpg`、`-1024x768.jpg`、`-1536x1536.jpg`、`-2048x2048.jpg` など `-<w>x<h>` 形式）を除去し、原本のみを残します**。

> ⚠️ **Rev 1 からの変更 — `-scaled` は削除してはいけません。**
> WordPress は 2560px を超える画像をアップロードすると、`full` サイズの実体を `xxx-scaled.jpg` に差し替えます。実データでも `media_details.sizes` に `full` を持つ項目の `source_url` が `/wp-content/uploads/2024/09/IMG_1527-scaled.jpg` になっています。つまり **`-scaled.jpg` は「派生」ではなく「WP が記事本文と被リンクで実際に配信していた URL」** です。Rev 1 の記述どおり `scaled` を除去すると、記事内画像と画像検索の被リンクが 565 点規模で 404 になります。**削除対象は `-<数字>x<数字>` 形式のみ**とし、`-scaled` は原本として保持します。

除去の必要性は変わりません。565 点 × 最大 10 サイズ ＝ **最大 5,650 ファイル**に膨らみ、次の実制約を圧迫します。

| ホスト | 制約 |
|:---|:---|
| Cloudflare Pages | **1 デプロイあたり 20,000 ファイル**、1 ファイル 25MB |
| GitHub Pages | リポジトリ推奨 1GB、1 ファイル 100MB、公開サイト 1GB |

派生は Astro 側で再生成できるため保持する価値がなく、除去は容量削減と制約回避を同時に達成します。

### 7.2 二層構成（URL 互換 × 最適化の両立）

画像には相反する 2 つの要求があります。

- 旧 URL `/wp-content/uploads/2024/09/IMG_1527-scaled.jpg` を維持したい（画像検索・被リンク・他サイトからの参照）
- ページ内では WebP/AVIF の最適化版を配信したい（N-01 LCP）

| 層 | 配置 | 役割 | 実測規模 |
|:---|:---|:---|:---|
| **互換層** | `public/wp-content/uploads/**` | 原本 565 点を無加工で配置。旧 URL がそのまま 200 | 565 ファイル |
| **最適化層** | `src/assets/uploads/**` | `astro:assets` が WebP/AVIF + `srcset` を生成 | 565 ファイル（変換元） |

原本を 2 か所に持つためリポジトリ容量は約 2 倍になります。**565 点という実測規模であれば、平均 1.5MB/枚と仮定しても原本合計は約 850MB、二層で約 1.7GB** となり、GitHub の推奨 1GB を超える可能性があります。したがって次を確定運用とします。

- **原本は `src/assets/uploads/**` に 1 部だけ置き、互換層 `public/wp-content/uploads/**` はビルド時にコピーで生成する**（`scripts/copy-compat-uploads.mjs`、`astro build` の前段）。リポジトリに二重保持はしません。
- ビルド出力（`dist`）には二層とも存在するため、URL 互換性は完全に維持されます。
- 原本合計が 1GB を超えた場合は、`fetch-uploads.mjs` の段階で**長辺 2560px・品質 82 の JPEG へ再エンコード**して取り込みます（`-scaled` と同等の処理であり、WP が既に行っている変換の踏襲であるため画質上の劣化は最小）。

### 7.3 レンダリング規約（N-07 と直結）

- 記事本文中の `<img>` は変換時に `<Figure>` / `<ResponsiveImage>` へ書き換える。
- **すべての画像に `width` / `height` を必須付与**（N-02 CLS 対策）。実データの `media_details.width/height` を移行時に frontmatter・本文へ埋め込む。
- **本文中画像**: WebP のみ・ブレークポイント **400 / 800 / 1200**（3 サイズ）
- **アイキャッチ / ヒーロー**: AVIF + WebP・ブレークポイント **400 / 800 / 1200 / 1600**（4 サイズ×2 形式）
- ファーストビューは `loading="eager"` + `fetchpriority="high"`、それ以外は `loading="lazy"` + `decoding="async"`。
- 出力形式の優先順: AVIF → WebP → 元形式 の `<picture>` フォールバック。
- `alt` 欠落は §5.5 のスキーマでビルド失敗とする。

**AVIF を全画像に適用しない理由**: 565 点 × 4 サイズ × AVIF ＝ 2,260 回の AVIF エンコードとなり、2560×1920 級の入力では初回ビルドが 1 時間規模に達します（N-07 違反）。視覚的インパクトが大きくフォーマット差が効くのはアイキャッチであり、本文画像は WebP で十分です。

### 7.4 ファイル数・ビルド負荷の見積（N-07 / N-11 の根拠）

| 区分 | 概算ファイル数 |
|:---|--:|
| HTML（§6.7） | 535 |
| リダイレクト用 HTML（GitHub Pages 向け） | 約 660 |
| 互換層 uploads 原本 | 565 |
| 最適化画像（本文 WebP 3 サイズ ＋ アイキャッチ AVIF/WebP） | 約 2,900 |
| Pagefind インデックス | 約 60 |
| CSS / JS / フォント / その他 | 約 60 |
| **合計（見積）** | **約 4,800 〜 6,300** |

Cloudflare Pages の 20,000 ファイル上限に対し **30% 前後**であり、十分な余裕があります。CI では `find dist -type f | wc -l` が 10,000 を超えた時点で警告、18,000 で失敗とします（N-11）。

画像エンコード回数は約 2,900 回。CI で `node_modules/.astro`（`astro:assets` のキャッシュ）を `actions/cache` に永続化することで、2 回目以降のビルドはキャッシュヒットし N-07 の「< 3 分」を満たします。**このキャッシュ設定は N-07 の前提条件です**（§10.3）。

---

## 8. インタラクティブ機能（全件確定）

### 8.1 検索（Pagefind）— 確定

- ビルド後処理として `pagefind --site dist` を実行し、`dist/pagefind/` にインデックスを生成。**対象は 431 記事 + 11 固定ページ**。
- 検索対象は `data-pagefind-body` を付与した本文領域のみ。ヘッダ・フッタ・ページネーションは除外し、全ページ共通文字列がヒットする問題を防ぐ。
- **アーカイブページ（`/blogs/page/N/`・カテゴリ）はインデックス対象外**（`data-pagefind-ignore`）。同じ記事抜粋が 44 + 48 ページ分重複ヒットするのを防ぎます。
- `/search/` でのみ Pagefind UI の JS を読み込む（N-04 を他ページで維持）。
- 5 カテゴリを `data-pagefind-filter="category"` でフィルタ可能にする。
- **日本語検証は必須**（§9.5）。`lang="ja"` の出力と、日本語 2 文字での部分一致ヒットを E2E で確認します。

### 8.2 Google Maps（`/contacts/`）— 確定

素の `<iframe>` 直挿入は採用しません。Google Maps の埋め込みは 1 枚で 1MB 超・数十リクエストを発生させ、**`/contacts/` の LCP を単独で破壊します**。また Cookie を設定するため、同意なしの読み込みはプライバシー上も望ましくありません。

`MapEmbed.astro` の挙動を次で確定します。

1. 初期表示は**静的な地図画像 + 「地図を表示」ボタン**（自前ホストの WebP、40KB 未満）。
2. クリック時にのみ `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade">` を挿入。
3. JS 無効時は Google Maps へのリンクとして機能（N-10）。
4. 併せて `LocalBusiness`（`@type: Bakery`）構造化データに店名 `Im Leaw イム・レーオ`・住所（長野県須坂市）・座標・営業時間を出力。**ローカル検索対策としては、埋め込み地図より構造化データの効果が大きい部分です。**
5. 座標・住所・営業時間は `src/config/site.config.ts` の 1 箇所で管理し、`/contacts/` の本文と構造化データの両方に供給します（二重管理による齟齬の防止）。

### 8.3 Instagram（`/instagram/`）— 確定：静的グリッド

公式埋め込みスクリプト（`embed.js`）は重量・追跡・仕様変更リスクがあるため**採用しません**。Graph API による自動更新も、アクセストークンの 60 日ごとの更新運用が発生し、非エンジニア運用者に不適であるため**採用しません**。

**確定方式**: プロフィールへのリンク + **自前ホストの静的サムネイルグリッド**。

- グリッド画像は `src/assets/instagram/` に配置し、`astro:assets` で最適化（本文画像と同じ WebP 3 サイズ）。
- 各サムネイルは該当投稿の Instagram URL へリンク。
- 更新は Decap CMS に `instagram` コレクション（画像 + リンク URL + alt）を定義し、**運用者がブラウザから差し替え可能**にします（§11）。
- **クライアント JS ゼロ**。N-04 に一切影響しません。

### 8.4 お問い合わせ（`/contacts/`）— 確定：mailto リンク ＋ コピー補助 UI

現行 WordPress サイト（`/contacts/`）の実態を調査した結果、元々フォームプラグインは使われておらず、`mailto:imleaw17@gmail.com` のリンクが直接設置されていることを確認しました。

したがって、外部サービス（Formspree等）やサーバーサイド処理（Functions）に依存せず、**現行仕様を完全に踏襲した `mailto:` リンク形式を採用**します。

**確定仕様**:

- 宛先: `imleaw17@gmail.com`
- UI コンポーネント（`ContactSection.astro`）:
  1. **メール送信ボタン**: `<a href="mailto:imleaw17@gmail.com?subject=【お問合せ】イム・レーオ">メールソフトを起動する</a>`
  2. **アドレス表示＆ワンクリックコピー**: メーラーが未設定の端末でも確実に連絡できるよう、メールアドレスを表示し「アドレスをコピー」ボタン（Clipboard API + フォールバック）を配備。
  3. **LINE / Instagram 導線**: 公式LINEアカウント（§8.5）および Instagram DM へのリンクを分かりやすく併記。
- **メリット**: 外部サービス依存ゼロ・スパム投稿リスクゼロ・運用コストゼロ・両ホスティング（GitHub Pages / Cloudflare Pages）で完全同一動作。

### 8.5 LINE 公式アカウント — 確定

固定ページ #11（`/line%e5%85%ac%e5%bc%8f.../`）を URL ごと維持したうえで、`/contacts/` とフッタに LINE 公式アカウントへのボタン（`LineButton.astro`）を設置します。友だち追加 URL は `site.config.ts` で管理。外部 SDK は読み込まず、通常のリンクとして実装します。

---

## 9. 検証計画（全期待値を実データに固定）

本移行の失敗は**サイレントに起きます**（ビルドは通り、ページも出るが、URL がずれている／日本語検索が効かない）。したがって検証は目視ではなく、**CI で機械的に強制**します。

### 9.1 インベントリ件数検証（`verify-inventory.mjs`・CI 必須 ★）

移行漏れを最初に検出する関門です。`data/wp-inventory.json` を真として、次を**厳密一致**でアサートします。

| # | 検査 | 期待値 |
|:--:|:---|:---|
| 1 | `src/content/posts/**/*.md` の件数 | **431** |
| 2 | `src/content/pages/**/*.{md,mdx}` の件数 | **11** |
| 3 | `CATEGORIES` の要素数 | **5** |
| 4 | `CATEGORIES` の slug 集合 | §0.3 の 5 slug と完全一致 |
| 5 | `public/wp-content/uploads/` 配下の原本数 | **565** |
| 6 | 各カテゴリに属する記事数 | 252 / 118 / 48 / 25 / 19 と一致 |
| 7 | カテゴリ延べ件数 | **462**（`≠ 431` は正常。§0.3 参照） |
| 8 | `wpPostId` の重複 | **0** |
| 9 | `permalink` の重複 | **0** |
| 10 | タグを持つ記事 | **0**（1 件でもあれば設計前提の崩れとして失敗） |
| 11 | コメントを持つ記事 | **0**（1 件でもあれば §2.3 の静的保存へ分岐。CI は失敗させて判断を仰ぐ） |

1 件でも不一致なら Exit 1。

### 9.2 URL 保全検証（`verify-urls.mjs`・最重要・CI 必須 ★）

移行前に `data/legacy-urls.json` として**旧 URL 台帳を確定**させます（`data/wp-inventory.json` から機械生成し、旧サイトの `wp-sitemap.xml`・RSS・Search Console の流入 URL で補完）。不変ファイルとしてコミットし、移行の基準点とします。

**台帳の確定内訳（必須 533 URL）**

| 区分 | 件数 |
|:---|--:|
| 記事 | 431 |
| 固定ページ | 11 |
| カテゴリアーカイブ（全ページ） | 48 |
| 記事一覧（`/blogs/` + `page/2..44/`） | 44 |
| **必須 小計** | **533** |
| 日付アーカイブ | 導出（ビルド時に台帳へ追記） |
| メディア原本 URL | 565 |
| 添付ページ URL（→301 対象） | 565 |

CI で次を検証し、1 件でも失格ならビルドを落とします。

1. 台帳の各 URL について、`dist/**/index.html`（**デコード形式のパス**に解決したもの）が存在するか。
2. 存在しない場合、`_redirects` に該当ルールがあるか。
3. どちらもない場合 → **失敗**（Exit 1）。
4. 逆方向: 各記事の `permalink` の `/YYYY/MM/DD/` が、`date`（JST）から導出した値と一致するか（§5.2 のタイムゾーン事故検出）。**431 件全件**。
5. 各ページの canonical が `permalink` と**バイト一致**し、末尾スラッシュを持つか。
6. `dist` にリテラル `%` を含むディレクトリ名が**存在しない**こと（§6.2 の事故の直接検出）。
7. sitemap に含まれる URL 数が **431 + 11 + 5 + 1 + 日付アーカイブ数** と一致すること。

### 9.3 エンコード往復検証（`verify-encoding.mjs`・CI 必須 ★）

本移行に固有の、かつ最も静かに壊れる箇所を専用に検査します。

1. 全 431 記事・11 固定ページ・5 カテゴリの `permalink` について `assertRoundTrip()`（§6.3）が通ること。
2. `permalink` に**大文字 16 進**（`%E3` 等）が含まれないこと。
3. `decodeURIComponent` が例外を投げないこと（不正なパーセント列の検出）。
4. デコード結果が **NFC 正規化済み**であること（`s === s.normalize('NFC')`）。macOS 由来の NFD 混入を検出します。

### 9.4 コンテンツ同一性検証（`verify-content.mjs`）

旧サイト HTML と新 `dist` の記事本文からテキストのみを抽出（タグ・空白を正規化）して比較し、**類似度 98% 未満の記事を一覧化**します。HTML→Markdown 変換での本文欠落（WP ブロック・ショートコード・ギャラリーの取りこぼし）を検出する目的です。**431 本全件**を対象とし、差分は目視レビューにかけます。

あわせて、記事本文中の画像参照が `media_details` の 565 点いずれかに解決されることを確認し、解決できない参照（外部ホット リンク・削除済み画像）を一覧化します。

### 9.5 機能テスト（Playwright）

| 対象 | 検証内容 |
|:---|:---|
| 検索 | `/search/` で**日本語 2 文字**（例: 「パン」）を入力し結果が返ること。`<html lang="ja">` が出力されていること |
| 日本語 URL | エンコード形式 URL（`/2024/09/10/%e9%a3%9f%e3%83%91%e3%83%b3.../`）へ**リクエストして 200** が返ること。全 431 本から無作為 20 本を抽出 |
| カテゴリ | 5 カテゴリすべての 1 ページ目・最終ページ（26/12/5/3/2）が 200 |
| ページネーション | `/blogs/` から「次へ」で **44 ページ目**まで到達でき、`/blogs/page/1/` が存在しないこと |
| 地図 | ボタン押下で iframe が挿入されること。**初期ロードで Google へのリクエストが発生しない**こと |
| フォーム | 必須検証・ハニーポット・送信成功表示 |
| クエリ互換 | `/?p=1938` がトップ経由で該当記事へ遷移すること。`/?s=パン` が `/search/?q=パン` へ遷移すること |
| パンくず | 各階層で正しい構造化データが出力されること |
| Decap | `/admin/` が読み込まれ、記事一覧に 431 件が表示されること |
| レスポンシブ | 375 / 768 / 1440px でレイアウト崩れがないこと |

### 9.6 リンク検証

`lychee` で `dist` 内の全リンクを検査。内部リンク切れは CI 失敗、外部リンク切れは警告とします。特に**旧ドメイン絶対 URL の残存**（本文中の `https://imleaw.com/...` が相対化されているか）を重点確認します。431 本の本文には相互リンクが含まれる想定であり、変換漏れはここで検出されます。

### 9.7 性能・品質（Lighthouse CI）

対象 6 ページ: `/`（トップ）、`/blogs/`、記事 1 本、`/category/パンについて/`（最大カテゴリ）、`/contacts/`（地図あり）、`/search/`。N-01〜N-06 を**下限値として強制**（`lighthouserc.json` の `assert`）。下回れば CI 失敗とします。あわせて axe-core によるアクセシビリティ検査を実行します。

### 9.8 リリース後モニタリング（4 週間）

| 時期 | 実施 |
|:---|:---|
| 当日 | Search Console で新サイトマップ送信。カバレッジ確認 |
| +1 日 | クロールエラー・404 レポート確認。**431 記事のインデックス状況を確認** |
| +1 週 | インデックス数を移行前と比較 |
| +2 週 | 主要クエリの掲載順位を比較 |
| +4 週 | 検索流入が移行前比 95% 以上であることを確認（達成目標） |

---

## 10. Deployment & Hosting Strategy

### 10.1 ホスティング選定

**主系: Cloudflare Pages / 副系: GitHub Pages（ミラー）**

1. **`_redirects` による真の 301 が使える**（GitHub Pages は不可）。本件では **約 700 ルール**の 301 が必要であり、SEO 保全が第一目標である以上これが決定的です。
2. `_headers` でキャッシュ制御・セキュリティヘッダを設定できる。
3. `/feed/` を 200 リライトで正しい Content-Type のまま配信できる（§6.6）。
4. 日本国内からのレイテンシで有利。
5. 将来フォームを Pages Functions で自前化する余地がある。

GitHub Pages は「Cloudflare 障害時の待避先」および「成果物がホスト非依存であることの継続的な証明」として維持します。

### 10.2 ビルドパイプライン

```
[0] インベントリ検証  verify-inventory.mjs（431/11/5/565 の件数一致）★
[1] コンテンツ検証    astro check + Zod スキーマ（frontmatter 不備で停止）
[2] エンコード検証    verify-encoding.mjs（往復・小文字・NFC）★
[3] 互換層生成        copy-compat-uploads.mjs → public/wp-content/uploads/
[4] 静的ビルド        astro build → dist/
[5] 検索インデックス   pagefind --site dist
[6] リダイレクト生成   build-redirects.mjs → _redirects + メタリフレッシュ HTML
[7] URL 検証          verify-urls.mjs（533 URL 全通過が条件）★
[8] リンク検証        lychee dist
[9] ファイル数検査     find dist -type f | wc -l（< 18,000）★
[10] 品質ゲート       Lighthouse CI + axe（下限未達で停止）★
[11] デプロイ         Cloudflare Pages / GitHub Pages へ並行
```

★ の 5 工程が品質ゲートです。**これらを通らない成果物は公開されません。**

`package.json` のスクリプト:

```json
{
  "dev": "astro dev",
  "prebuild": "node scripts/verify-inventory.mjs && node scripts/verify-encoding.mjs && node scripts/copy-compat-uploads.mjs",
  "build": "astro check && astro build && pagefind --site dist && node scripts/build-redirects.mjs",
  "verify": "node scripts/verify-urls.mjs && lychee dist --offline",
  "test:e2e": "playwright test",
  "test:perf": "lhci autorun"
}
```

### 10.3 CI/CD

**PR 時（`ci.yml`）**: `prebuild` → `build` → `verify` → `test:e2e` → `test:perf`。Cloudflare のプレビューデプロイ URL を PR にコメント。

**main マージ時**: 上記に加え、Cloudflare Pages（`wrangler pages deploy dist`）と GitHub Pages（`actions/deploy-pages`）へ並行デプロイ。

**画像キャッシュ（N-07 の前提・必須）**:

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules/.astro
      .astro
    key: astro-assets-${{ hashFiles('src/assets/uploads/**') }}
    restore-keys: astro-assets-
```

これがないと毎回 約 2,900 回の画像エンコードが走り、N-07 を満たせません。

必要な Secrets: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、Decap 用 GitHub OAuth の `CLIENT_ID` / `CLIENT_SECRET`（値はリポジトリに置かない）。

### 10.4 キャッシュ戦略（`public/_headers`）

| パス | Cache-Control |
|:---|:---|
| `/_astro/*`（ハッシュ付き） | `public, max-age=31536000, immutable` |
| `/wp-content/uploads/*` | `public, max-age=2592000` |
| `/pagefind/*` | `public, max-age=86400` |
| `/admin/*` | `no-store`（+ `X-Robots-Tag: noindex`） |
| HTML | `public, max-age=0, must-revalidate` |

HTML を長期キャッシュしないことが重要です。長期キャッシュすると、記事を更新しても訪問者に古い内容が出続けます。

### 10.5 本番切替（カットオーバー）手順

1. **移行前に旧サイトを完全保全**: 全 431 記事の HTML・`wp-content/uploads` 全体（565 点＋派生）・DB ダンプを取得し、`data/wp-export/` として保管（ロールバックの前提）。
2. `data/legacy-urls.json`（必須 533 + メディア 565 + 添付 565）を確定。
3. Cloudflare Pages のプレビュー URL で §9 の全検証を通過させる。
4. **DNS の TTL を事前に 300 秒へ下げる**（切替の 24 時間以上前に実施。これを忘れると切り戻しに数時間かかります）。
5. **旧 WordPress は停止せず稼働させたまま** DNS を切り替える。
6. 切替後、`verify-urls.mjs` を**本番 URL に対して**再実行（533 URL の実 HTTP 応答を確認）。
7. Search Console に新サイトマップを送信。旧 `wp-sitemap.xml` の削除申請は行わない（301 で処理させる）。
8. §9.8 のモニタリングを開始。
9. **4 週間の観測完了まで WordPress 環境を保持**。問題があれば DNS を戻すだけで即時復旧できる状態を維持する。
10. 観測完了後に WordPress を停止し、`/wp-json/**` の 410 を有効化。

---

## 11. 運用（記事投稿方法）— **確定: Decap CMS**

### 11.1 選定

| 案 | 長所 | 短所 | 判定 |
|:---|:---|:---|:--:|
| **Decap CMS `^3`** | ブラウザ上の管理画面。WP に近い操作感。画像の D&D 対応。無料 | 初期設定に GitHub OAuth の構築が必要 | **採用** |
| GitHub Web UI | 追加構築ゼロ | Markdown の直接編集。画像アップロードが手作業 | 不採用 |
| Obsidian + Git | 執筆体験が良い。オフライン可 | PC 必須。同期設定が必要 | 不採用 |

**採用理由**: 現行サイトは 431 本・約 4 年分の継続的な投稿実績があり、更新頻度の維持そのものがサイトの価値です。投稿手段の難化は更新頻度の低下に直結し、移行で得た性能・コストの利点を打ち消します。OAuth 構築の一時コストは、この継続性に対して十分に見合います。

### 11.2 設定（`public/admin/config.yml`）

- **backend**: `github`（`branch: main`）。認証は Cloudflare Pages Functions 上の OAuth プロキシ（`/api/auth`）。GitHub Pages 側は閲覧専用ミラーであり、`/admin/` は Cloudflare 側でのみ機能します（副系に管理画面を置かない方が安全でもあります）。
- **media_folder**: `src/assets/uploads/{{year}}/{{month}}` / **public_folder**: `/wp-content/uploads/{{year}}/{{month}}` — 既存 565 点と同じ階層規約を新規投稿でも維持します。
- **collections**:
  - `posts` — `folder: src/content/posts`、`slug: "{{year}}-{{month}}-{{day}}-{{fields.wpPostId}}"` は新規では使えないため、新規記事は `slug: "{{year}}-{{month}}-{{day}}-{{slug}}"`（ASCII 入力を促すヘルプ文言付き）。
  - `pages` — 11 枚を `files` として個別定義（誤って追加・削除されないよう `create: false`）。
  - `instagram` — §8.3 のグリッド管理。
- **カテゴリ入力**: `widget: select` で 5 件を固定。**label に日本語表示名・value にエンコード済み slug** を設定します。運用者はエンコード文字列を目にしません。

```yaml
- label: "カテゴリ"
  name: "categories"
  widget: "select"
  multiple: true
  options:
    - { label: "パンについて", value: "%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6" }
    - { label: "日々の暮らし", value: "%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97" }
    - { label: "須坂",         value: "%e9%a0%88%e5%9d%82" }
    - { label: "庭について",   value: "%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6" }
    - { label: "未分類",       value: "uncategorized" }
```

### 11.3 新規記事の permalink

新規記事は `permalink` を持たず、`date`（JST）と入力スラッグから導出します。導出は**必ず `Asia/Tokyo` 固定**で行います。

```ts
const jst = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);                       // "2026-09-05"
const [y, m, d] = jst.split('-');
const permalink = `/${y}/${m}/${d}/${toWpEncoded(slug)}/`;
```

既存 431 本は全件 `wpPostId` と `permalink` を持つため、この導出経路を通りません（§5.5-5）。**既存 URL が計算に晒されることは構造的にありません。**

### 11.4 運用手順書

`docs/operations.md` を Phase 6 で作成し、投稿・画像追加・カテゴリ運用・ビルド失敗時の見方（特に §9 のどの検証で落ちたかの読み解き方）を、非エンジニア向けの手順として記載します。

---

## 12. 棚卸し結果と Rev 1 分岐判断の解決

Rev 1 §12 で「Phase 0 の結果次第で方式が変わる」とした 4 点は、すべて解決済みです。

| # | 確認事項 | 実測結果 | 決定 |
|:--:|:---|:---|:---|
| **A** | パーマリンク形式 | `/YYYY/MM/DD/<encoded-slug>/`（Day and name）で**想定どおり** | §6.4(b) のルーティングを確定。設計の骨格は不変 |
| **B** | `uploads` の総量 | **565 点**。大判は 2560×1920（`-scaled`） | 二層構成は維持しつつ、**リポジトリには 1 部のみ保持しビルド時にコピー**へ変更（§7.2）。容量 1GB 超過時は取り込み時に長辺 2560px へ再エンコード |
| **C** | 日本語スラッグの有無 | **有り**（記事・カテゴリ・固定ページ 2 枚） | §6.2 の二表現規約を新設。`verify-encoding.mjs` を CI 必須化（§9.3）。コンテンツファイル名は ASCII 固定（§5.4） |
| **D** | コメント・問い合わせフォームの実在 | 固定ページ `/contacts/` が存在。コメントは棚卸しで未確認 | フォームは **Formspree で確定**（§8.4）。コメントは移行時に 0 件であることを `verify-inventory.mjs` #11 で確認し、非 0 なら CI を止めて判断を仰ぐ |

**Rev 1 になかった新規発見と、それによる仕様変更**:

| 発見 | 仕様への反映 |
|:---|:---|
| トップが静的フロントページで、記事一覧は `/blogs/` | ルーティングを全面改訂（§6.4）。`/page/N/` は保険 301 に格下げ |
| タグ taxonomy が未使用 | `/tag/` ルートを廃止（§6.5 で `/` へ 301）。F-06（Rev 1 のタグ一覧）を削除 |
| `-scaled` が `full` の実体 | 削除対象から除外（§7.1）。**Rev 1 のまま実装すると 565 点規模の画像 404 が発生** |
| 固定ページのタイトルとスラッグが乖離（#6・#8） | 「タイトルからスラッグを生成しない」を明文化（§5.2） |
| カテゴリ延べ 462 ≠ 記事 431 | 検証の期待値として明示（§0.3・§9.1-7） |
| メディアが最大 10 サイズ派生を持つ | ファイル数見積と AVIF 適用範囲の絞り込み（§7.3・§7.4） |

---

## 13. 実装フェーズ計画

| Phase | 内容 | 完了条件 |
|:---|:---|:---|
| **0. 棚卸し** | ✅ **完了**（`data/wp-inventory.json`） | 431 / 11 / 5 / 565 が確定 |
| **1. 基盤** | Astro 初期化、`content.config.ts`、`permalink.ts`、`.nojekyll`、`verify-encoding.mjs` | 空サイトが両ホストでビルド・デプロイでき、エンコード往復テスト（Vitest）が通る |
| **2. 移行** | REST エクスポート → Markdown 変換（431 本）、画像取得（565 点）、URL 台帳生成 | 431 本が `src/content/posts/` にあり `astro check` と `verify-inventory.mjs` が通る |
| **3. ルーティング** | §6 の全ルート実装（記事 431 / 固定 11 / カテゴリ 48 / 一覧 44 / 日付） | `verify-urls.mjs` が **533 URL 全件通過** ★ |
| **4. デザイン** | トークン、レイアウト、全コンポーネント | 主要 6 ページが全ブレークポイントで完成 |
| **5. 機能** | 検索・地図・Instagram・フォーム・LINE・Decap | §9.5 の E2E が全通過 |
| **6. 品質** | 画像最適化、構造化データ、CI 整備、運用手順書 | Lighthouse 全項目 ≥ 95、N-07 / N-11 達成 ★ |
| **7. 切替** | §10.5 の実行 | 本番 URL に対する 533 URL 検証が全通過 ★ |
| **8. 観測** | §9.8 の 4 週間モニタリング | 検索流入 95% 以上を確認、WP 停止 |

★ = 品質ゲート。未達の場合は次フェーズへ進みません。

---

## 14. リスクと対策

| リスク | 影響 | 対策 |
|:---|:---|:---|
| **パーセントエンコードの取り違えによる全記事 404** | **致命的**（431 本すべて） | §6.2 の二表現規約 + §9.3 の往復検証 + §9.2-6 の「`%` を含むディレクトリ名が存在しないこと」検査。**本移行における最大の単一障害点** |
| **URL のずれによる検索順位喪失** | **致命的** | §5.2 の permalink 固定 + §9.2 の CI 強制検証（533 URL） |
| タイムゾーン起因の日付ずれ | 大 | `date` に `+09:00` を必須化。`date_gmt` との 9 時間差をアサート。permalink との突合を全 431 件で実施 |
| `-scaled` 削除による画像 404 | 大 | §7.1 で削除対象を `-<w>x<h>` に限定。`verify-content.mjs` が本文画像参照の解決を検査 |
| `.nojekyll` 忘れ | 大（CSS/画像が全消失） | Phase 1 の完了条件に組み込み |
| Unicode 正規化（NFC/NFD）差による CI 不一致 | 大 | ソースに日本語ファイル名を作らない（§5.4）+ §9.3-4 の NFC 検査 |
| HTML→Markdown での本文欠落 | 中 | §9.4 の類似度検証で 431 本を機械的に突合 |
| 画像エンコードによるビルド時間膨張 | 中 | §7.3 の AVIF 適用範囲限定 + §10.3 の CI キャッシュ必須化 |
| Cloudflare の 20,000 ファイル制限超過 | 中 | 見積 約 6,300（§7.4）。CI で 18,000 を上限として検査（N-11） |
| Pagefind で日本語がヒットしない | 中 | `lang="ja"` の出力を §9.5 で E2E 検証 |
| Formspree 無料枠（月 50 件）超過 | 小 | 超過時は Cloudflare Functions へ移行（§8.4。コンポーネント変更不要） |
| 運用者が記事を投稿できなくなる | 中 | Decap CMS を Phase 5 で完成させ、切替前に運用者による投稿リハーサルを実施 |
| 移行後に致命的問題が発覚 | 中 | WP を 4 週間保持。DNS 切り戻しのみで復旧（§10.5） |

---

## 15. 承認事項

Rev 1 §15 の未確定 5 点のうち **4 点は本改訂で確定**しました。

| Rev 1 の論点 | Rev 2 での結論 |
|:---|:---|
| 記事の投稿方法 | ✅ **Decap CMS に確定**（§11） |
| 問い合わせ方法 | ✅ **mailto リンク ＋ アドレスコピー機能に確定**（現行仕様踏襲・§8.4） |
| Instagram 連携の深さ | ✅ **自前ホストの静的グリッドに確定**（§8.3） |
| 日付アーカイブ | ✅ **生成する**（431 件の permalink に実在する年月のみ・§6.4(e)） |
| デザイン方針 | ⏳ **ご判断をお願いします**（下記） |

### 唯一の要判断事項: デザイン方針

Kale テーマの「再現」か「刷新」か。

**推奨は中間案** — 既存の配色・世界観（パン工房らしい温かみ）を保ちつつ、タイポグラフィ（日本語組版・行間・字送り）と余白を刷新する案です。

- **全面刷新**は、431 記事の本文レイアウト検証コストが大きく、既存訪問者の混乱も招きます。
- **完全再現**は、Kale テーマの制約（旧世代のレスポンシブ設計）を引き継ぐことになり、移行で得られる性能上の利点を活かしきれません。
- 中間案であれば、Phase 4 の作業量を抑えつつ N-01〜N-06 を達成できます。

---

## 承認のお願い

本仕様書（`docs/spec.md` Rev 2）をご確認のうえ、**承認（Approved）** または修正指示をお願いいたします。

Rev 1 で保留していた実データ依存の事項はすべて `data/wp-inventory.json` により解決済みです。**§15 のデザイン方針 1 点をご判断いただければ、ただちに Phase 1（基盤構築）へ着手できます。**
