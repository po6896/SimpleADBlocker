#!/usr/bin/env node
/*
 * Emit a manual checklist (markdown) for real-device verification on
 * Sleipnir Mobile before gallery push. Covers the four mobile-specific
 * ad formats that desktop emulation can miss.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const CORPUS_PATH = path.join(ROOT, 'test', 'corpus', 'targets.yaml');
const OUT_PATH = path.join(ROOT, 'test', 'manual-checklist.md');

const doc = yaml.load(fs.readFileSync(CORPUS_PATH, 'utf-8'));
const entries = (doc.ads_present || []).slice(0, 5);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const version = pkg.version;

const lines = [];
lines.push(`# SimpleADBlocker 実機検証チェックリスト (v${version})`);
lines.push('');
lines.push('実機 (Sleipnir Mobile on Android) で以下を目視確認してから gallery push する。');
lines.push('自動ハーネスでは再現しにくいモバイル固有フォーマットを重点的にチェック。');
lines.push('');
lines.push('## 前提');
lines.push('- Sleipnir Mobile に `sleipnir-adblock.slex.js` v' + version + ' をインストール');
lines.push('- 比較用に一時的に無効化して "素の状態" も確認');
lines.push('- 機内モード OFF、Wi-Fi / LTE どちらでも 1 回ずつ');
lines.push('');
lines.push('## サイト別チェック');
lines.push('');
for (const e of entries) {
  lines.push(`### ${e.id}`);
  lines.push(`URL: ${e.url}`);
  lines.push('');
  lines.push('| カテゴリ | 期待 | 実機結果 | 備考 |');
  lines.push('|---|---|---|---|');
  lines.push('| インタースティシャル (全画面広告) | 表示されない | ☐ | |');
  lines.push('| アンカー広告 (画面下固定バナー) | 表示されない | ☐ | |');
  lines.push('| 動画プレロール / 自動再生 | 表示・再生されない | ☐ | |');
  lines.push('| ネイティブ広告 (記事一覧に紛れる) | 判別可能 or 消える | ☐ | |');
  lines.push('| 本文スクロール | 最後まで読める | ☐ | |');
  lines.push('| 画像表示 | 欠損なし | ☐ | |');
  lines.push('| リンクタップ | 正常遷移 | ☐ | |');
  lines.push('| ピンチズーム | 効く | ☐ | |');
  lines.push('');
}
lines.push('## 全体チェック');
lines.push('');
lines.push('- [ ] `npm run lint` PASS');
lines.push('- [ ] `npm run test:corpus` PASS');
lines.push('- [ ] 上記全サイトで重大な誤爆なし');
lines.push('- [ ] インストール・アンインストール往復で問題なし');
lines.push('- [ ] `@version` を README と slex ヘッダで一致させた');
lines.push('');
lines.push('## 判定');
lines.push('');
lines.push('- [ ] gallery push 可');
lines.push('- [ ] 要修正: ____________________________');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);

fs.writeFileSync(OUT_PATH, lines.join('\n'));
console.log('Wrote ' + OUT_PATH);
