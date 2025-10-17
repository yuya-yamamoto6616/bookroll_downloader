# 📚 BookRoll Downloader

BookRollの資料を自動でPDF化するChrome拡張機能です。

## 🌟 特徴

- 📄 **ワンクリックでPDF化**: 全ページを自動スクロールして1つのPDFファイルに変換
- 🎨 **元の画質を維持**: Canvas要素から高品質な画像データを取得
- 💾 **メモリ効率**: 画像ファイルとして保存せず、メモリ上で直接PDF化
- 🔄 **重複ページ検出**: 同じページの重複ダウンロードを自動的に防止
- 🎯 **BookRoll専用**: BookRoll (*.bookroll.jp) で動作

## 🚀 インストール方法

### 開発者モードでインストール

1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone https://github.com/yuya-yamamoto6616/bookroll_downloader.git
   ```

2. Chromeで `chrome://extensions/` を開く

3. 右上の「デベロッパーモード」をONにする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. ダウンロードしたフォルダを選択

## 📖 使い方

1. BookRollで資料ページを開く

2. 拡張機能アイコン（巻物🎓）をクリック

3. 「全ページPDF化」ボタンをクリック

4. 自動的に全ページがスクロールされ、PDF化されます

5. 完了すると `bookroll_document.pdf` がダウンロードされます

## 🛠️ 技術スタック

- **Manifest V3**: 最新のChrome拡張機能仕様
- **jsPDF**: PDFファイル生成ライブラリ
- **Canvas API**: 高品質な画像データの取得

## 📁 ファイル構成

```
bookroll_downloader/
├── manifest.json          # 拡張機能の設定ファイル
├── content.js            # メインロジック（自動スクロール・PDF生成）
├── popup.html            # ポップアップUI
├── popup.js              # ポップアップの動作
├── jspdf.umd.min.js      # PDF生成ライブラリ
├── icon*.png             # 拡張機能アイコン
└── README.md             # このファイル
```

## ⚙️ 動作の仕組み

1. **ページ検出**: CSSセレクタ `canvas.drawCanvas` でCanvas要素を取得
2. **画像キャプチャ**: Canvas内容をBase64形式で保存
3. **重複チェック**: 前のページと画像データを比較し、同一ならスキップ
4. **自動スクロール**: 「次のページへ」ボタンを自動クリック
5. **PDF生成**: すべてのページを1つのPDFファイルに変換

## 🔧 カスタマイズ

### ダウンロード間隔の調整

`content.js` の `sleep` 時間を変更できます：

```javascript
await sleep(1500); // ミリ秒単位（1500 = 1.5秒）
```

### PDF設定の変更

`content.js` の PDF生成部分でサイズや向きを変更できます：

```javascript
const pdf = new jsPDF({
  orientation: 'portrait',  // 'landscape' で横向き
  unit: 'mm',
  format: 'a4'              // 'letter', 'a3' など
});
```

## ⚠️ 注意事項

- BookRoll (*.bookroll.jp) ドメインでのみ動作します
- ページ数が多い場合、処理に時間がかかります
- インターネット接続が必要です（BookRollへのアクセスのため）

## 🤖 開発について

このプロジェクトのコードとREADMEは、**GitHub Copilot (AI)** の支援を受けて作成されています。

- コード実装: AI による提案とコード生成
- ドキュメント: AI によるREADME作成
- 企画・要件定義: 人間のアイデア

## 📝 ライセンス

このプロジェクトは個人利用・教育目的で作成されています。

## 🤝 コントリビューション

バグ報告や機能リクエストは、Issuesでお知らせください。

---

**Made with ❤️ for students**
