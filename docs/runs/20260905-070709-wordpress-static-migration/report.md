# Run Report: 20260905-070709-wordpress-static-migration

## Executive Summary

WordPress サイト「須坂の小さなパン工房 イム・レーオ（`imleaw.com`）」を、Astro 5.x を用いた高速・高保守性・SEO完全保全の静的サイトへ移行・構築しました。

- **移行コンテンツ**: 記事 431 本、固定ページ 11 枚、メディア 562 点、カテゴリ 5 件（全 1,009 レコード完全移行）
- **URL 保全**: 全 1,571 件の URL を `verify-urls.mjs` で検証し、100% の到達性（200 / 301 リダイレクト）を確認
- **ホスティング**: Cloudflare Pages（主）および GitHub Pages（副・ミラー）両対応
- **デザイン**: パン工房の温かみを維持しつつ、CSS デザイントークン（`tokens.css`）によるタイポグラフィ・余白の厳格統一と一括更新性を実現
- **検索 & 問い合わせ**: Pagefind による日本語全文検索（CJK 分かち書き対応）、`mailto:` ＋ クリップボードコピー機能、Decap CMS（`/admin/`）によるブラウザ記事投稿環境

---

## 成果物一覧

| コンポーネント | パス | 概要 |
|:---|:---|:---|
| **仕様書** | [docs/spec.md](file:///Users/naimasa/Projects/imleaw.com/docs/spec.md) | 承認済み確定技術仕様書（Rev 2） |
| **スナップショット** | [docs/specs/20260905-070709-wordpress-static-migration.md](file:///Users/naimasa/Projects/imleaw.com/docs/specs/20260905-070709-wordpress-static-migration.md) | 承認時点の不変仕様書 |
| **デザイントークン** | [src/styles/tokens.css](file:///Users/naimasa/Projects/imleaw.com/src/styles/tokens.css) | フォント・サイズ・余白・カラーの一括管理 CSS |
| **コンテンツスキーマ** | [src/content.config.ts](file:///Users/naimasa/Projects/imleaw.com/src/content.config.ts) | Astro 5 Content Layer (Zod 型検証) |
| **移行済み記事** | `src/content/posts/` (431 files) | YAML frontmatter 付き Markdown |
| **移行済み固定ページ** | `src/content/pages/` (11 files) | Home, About, Courses, Contacts, etc. |
| **アセット原本** | `public/wp-content/uploads/` (562 files) | URL 互換層 |
| **最適化画像** | `src/assets/uploads/` (562 files) | `astro:assets` 最適化層 |
| **管理画面** | `public/admin/index.html`, `config.yml` | Decap CMS ブラウザ管理画面 |
| **検証スクリプト** | `scripts/verify-urls.mjs`, `verify-inventory.mjs` | 自動テスト・URL 保全検証 |

---

## 検証結果

- **`npx astro check`**: 0 errors, 0 warnings, 0 hints
- **`npm run build`**: 519 ページ生成完了（ビルド時間 6.1s）
- **`node scripts/verify-urls.mjs`**: checked 1,571, passed 1,571, failed 0
- **`node scripts/verify-inventory.mjs`**: checked 8, passed 8, failed 0
- **エンドポイント疎通確認**: 全 13 主要ルート 200 OK

---

## Quota & Cost

| 指標 | 実績 |
|:---|---:|
| Routing Mode | `balanced` |
| Codex CLI 呼出数 | 5 回 |
| Claude Code CLI 呼出数 | 3 回 |
| Claude 実測費用 | $2.30 USD |
| Gemini 自前処理数 | 4 件 |
| 委譲率 | 66.7% |
