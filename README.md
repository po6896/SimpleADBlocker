# SimpleADBlocker - Sleipnir Mobile AdBlock Extension

Sleipnir Mobile (Android) 向けの最強アドブロッカーエクステンション。

## 機能

- **2000+ CSSフィルタ** - ページ描画と同時に広告を即座に非表示
- **DOM除去** - 広告iframe・スクリプトコンテナを完全削除
- **MutationObserver** - 動的に追加される広告もリアルタイム検知・除去
- **広告スクリプト除去** - Google, Taboola, nend, i-mobile等のスクリプトタグを削除
- **Anti-adblock回避** - 検知オーバーレイ除去 + デコイ要素で検知を回避
- **PR/スポンサー記事除去** - 「PR」「広告」「スポンサーリンク」ラベルの親要素ごと非表示
- **日本語サイト専用フィルタ** - Yahoo, ニコニコ, 5ch, Ameblo, FC2, はてな, Pixiv等
- **アフィリエイトリンク非表示** - A8, ValueCommerce, AccessTrade, もしも, afb, 楽天等

## 対応広告ネットワーク

| カテゴリ | 対応サービス |
|---------|------------|
| グローバル | Google AdSense, DFP/GAM, DoubleClick, Taboola, Outbrain, Criteo, Zergnet, MGID |
| 日本 | nend, i-mobile, MicroAd, Geniee SSP, AdStir, popIn, Yahoo広告 |
| アフィリエイト | A8.net, ValueCommerce, AccessTrade, もしもアフィリエイト, afb, felmat, 楽天アフィリエイト, Amazonアソシエイト |

## 対応日本語サイト

Yahoo Japan, ニコニコ動画, 5ch, Ameblo, FC2, はてなブログ, Pixiv, 価格.com, Weblio, goo, tenki.jp, Abema TV, YouTube, Wiki系サイト, Kotobank, Google検索（日本語）

## インストール

### 方法1: GitHub Pages経由（推奨）
1. 以下のリンクをSleipnir Mobileで開く
2. インストールダイアログが自動表示される

### 方法2: 直接ダウンロード
1. `sleipnir-adblock.slex.js` をスマホにダウンロード
2. Sleipnir Mobileのファイルマネージャーから開く

## 技術仕様

- **形式**: Sleipnir Extension (`.slex.js`)
- **依存**: jQuery 1.7.1 (`@require jquery`), Sleipnir API (`@require api`)
- **対応URL**: `http://*`, `https://*`
- **動作タイミング**: ページ読み込み完了後 + MutationObserverで継続監視

## 注意事項

- ネットワークレベルのリクエストブロックはできません（Sleipnir APIの制約）
- 広告が一瞬表示されてから消える場合があります
- サイトのレイアウトが崩れる場合は、そのサイトを `@exclude` に追加してください

## ライセンス

MIT
