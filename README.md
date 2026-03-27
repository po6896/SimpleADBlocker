# Simple AD Blocker

Sleipnir Mobile (Android) 向けの広告ブロッカーエクステンション。

## インストール

Sleipnir Mobile で下記ページを開いてください:

https://po6896.github.io/SimpleADBlocker/

## 機能

- CSS非表示フィルタ
- 広告iframe除去
- 動的広告の検知・除去
- 日本語サイト対応
- アフィリエイトリンク非表示

## 技術仕様

- **形式**: Sleipnir Extension (`.slex.js`)
- **依存**: jQuery (`@require jquery`), Sleipnir API (`@require api`)
- **対応URL**: `http://*`, `https://*`

## 注意事項

- サイトのレイアウトが崩れる場合は、そのサイトを `@exclude` に追加してください

## ライセンス

MIT
