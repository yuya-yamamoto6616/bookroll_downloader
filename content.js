// 処理を少し待つための関数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Base64データを実際のファイルデータ（Blob）に変換する関数
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

// 画像データを保存する配列
const imageDataArray = [];

// メインの自動ダウンロード処理
async function startDownload() {
  let pageCounter = 1;
  let previousCanvasData = null;
  let samePageCount = 0;

  while (true) {
    console.log(`ページ ${pageCounter} のダウンロードを試みます...`);
    
    // Canvasの読み込みを待つ
    await sleep(1500);
    
    // Canvas要素から画像を取得
    const allCanvases = document.querySelectorAll('canvas');
    let canvas = null;
    let canvasCandidates = [
      document.querySelector('canvas.hyperlink-canvas'),
      document.querySelector('canvas[data-v-53c53034]'),
      document.querySelector('.canvas-wrapper canvas'),
      ...Array.from(allCanvases).filter(c => c.width > 100 && c.height > 100)
    ];
    
    // 有効なコンテンツを持つcanvasを探す
    for (let candidate of canvasCandidates) {
      if (!candidate) continue;
      
      try {
        const ctx = candidate.getContext('2d');
        const imgData = ctx.getImageData(0, 0, candidate.width, candidate.height);
        const pixels = imgData.data;
        
        // 白くないピクセルがあるかチェック
        let hasNonWhitePixel = false;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i+1];
          const b = pixels[i+2];
          const a = pixels[i+3];
          
          if (!(r === 255 && g === 255 && b === 255) && a !== 0) {
            hasNonWhitePixel = true;
            break;
          }
        }
        
        if (hasNonWhitePixel) {
          canvas = candidate;
          console.log(`コンテンツを持つCanvasを発見: ${candidate.className}`);
          break;
        }
      } catch (e) {
        console.warn(`Canvas確認エラー:`, e);
      }
    }

    if (!canvas) {
      console.error('有効なCanvasが見つかりませんでした');
      alert('画像を含むCanvasが見つかりませんでした。');
      break;
    }

    try {
      // CanvasからBase64データを取得
      const base64Data = canvas.toDataURL('image/png');
      
      // 同じ画像が2回連続で検出されたら終了
      if (previousCanvasData === base64Data) {
        samePageCount++;
        console.log(`同じページ検出: ${samePageCount}回目`);
        if (samePageCount >= 2) {
          console.log('ダウンロードを終了します。');
          alert(`ダウンロード完了！合計 ${pageCounter - 1} ページをダウンロードしました。\n\nPDFを作成中...`);
          await createPDFFromImages();
          break;
        }
      } else {
        samePageCount = 0;
      }
      
      // 新しいページの場合のみダウンロード
      if (samePageCount === 0) {
        imageDataArray.push(base64Data);
        console.log(`ページ ${pageCounter} をダウンロードしました。`);
        
        previousCanvasData = base64Data;
        pageCounter++;
      }
    } catch (error) {
      console.error('Canvas読み取りエラー:', error);
      alert('Canvas画像の読み取りに失敗しました。');
      break;
    }

    // 次のページへ移動
    const nextButton = document.querySelector(".next-btn");
    if (nextButton && !nextButton.disabled && !nextButton.classList.contains('v-btn--disabled')) {
      nextButton.click();
      await sleep(2000);
    } else {
      // 次へボタンが使えない場合も続行（同じページ検出で停止）
      await sleep(2000);
    }
  }
}

// jsPDFを取得
function getJsPDF() {
  if (typeof window.jsPDF !== 'undefined') {
    return window.jsPDF;
  } else if (window.jspdf && typeof window.jspdf.jsPDF !== 'undefined') {
    return window.jspdf.jsPDF;
  }
  throw new Error('jsPDFライブラリが見つかりません');
}

// PDFを作成
async function createPDFFromImages() {
  if (imageDataArray.length === 0) {
    console.log('PDF作成: 画像データがありません');
    return;
  }

  try {
    console.log(`PDF作成を開始します... ${imageDataArray.length}ページ`);
    await sleep(200);
    
    const jsPDF = getJsPDF();
    
    // 最初の画像を読み込んで向きを判定
    const firstImg = new Image();
    firstImg.src = imageDataArray[0];
    await new Promise((resolve) => { firstImg.onload = resolve; });
    
    const isLandscape = firstImg.width > firstImg.height;
    
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < imageDataArray.length; i++) {
      if (i > 0) pdf.addPage();

      const img = new Image();
      img.src = imageDataArray[i];
      
      await Promise.race([
        new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('タイムアウト')), 5000))
      ]);

      // 画像のアスペクト比を維持しつつ、ページいっぱいに配置
      const imgRatio = img.width / img.height;
      const pageRatio = pageWidth / pageHeight;
      
      let scaledWidth, scaledHeight, x, y;
      
      if (imgRatio > pageRatio) {
        // 画像が用紙より横長 → 幅を基準
        scaledWidth = pageWidth;
        scaledHeight = pageWidth / imgRatio;
        x = 0;
        y = (pageHeight - scaledHeight) / 2;
      } else {
        // 画像が用紙より縦長 → 高さを基準
        scaledHeight = pageHeight;
        scaledWidth = pageHeight * imgRatio;
        x = (pageWidth - scaledWidth) / 2;
        y = 0;
      }

      pdf.addImage(imageDataArray[i], 'PNG', x, y, scaledWidth, scaledHeight);
      console.log(`PDF: ページ ${i + 1}/${imageDataArray.length} を追加`);
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `bookroll_${timestamp}.pdf`;
    pdf.save(filename);

    console.log('✅ PDF作成完了:', filename);
    alert(`✅ 完了！\n\n${imageDataArray.length}ページのPDFを作成しました。\nファイル名: ${filename}\n\n※ダウンロードしたPNG画像は手動で削除してください。`);

  } catch (error) {
    console.error('PDF作成エラー:', error);
    alert(`PDF作成中にエラーが発生しました。\n\nエラー: ${error.message}\n\n画像データ（PNG）は保存されています。`);
  }
}

startDownload();