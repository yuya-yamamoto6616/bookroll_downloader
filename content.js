/**
 * BookRoll Downloader - Content Script
 * 
 * BookRollの資料を自動でPDF化するChrome拡張機能
 * このコードはGitHub Copilot (AI) の支援を受けて作成されています
 * 
 * @author yuya-yamamoto6616 (with AI assistance)
 */

// 処理を少し待つための関数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 有効なコンテンツを持つCanvasを探す関数
function findValidCanvas() {
  const allCanvases = document.querySelectorAll('canvas');
  // Setを使って重複したCanvas候補を排除
  const canvasCandidates = Array.from(new Set([
    document.querySelector('canvas.hyperlink-canvas'),
    document.querySelector('canvas[data-v-53c53034]'),
    document.querySelector('.canvas-wrapper canvas'),
    ...Array.from(allCanvases).filter(c => c.width > 100 && c.height > 100)
  ]));
  
  // 警告回避用の一時Canvasを1つだけ作成して使い回す
  if (!window._tempCanvasForCheck) {
    window._tempCanvasForCheck = document.createElement('canvas');
    window._tempCtxForCheck = window._tempCanvasForCheck.getContext('2d', { willReadFrequently: true });
  }
  const tempCanvas = window._tempCanvasForCheck;
  const tempCtx = window._tempCtxForCheck;
  
  for (const candidate of canvasCandidates) {
    if (!candidate) continue;
    
    try {
      // 一時Canvasのサイズを対象のCanvasに合わせる
      if (tempCanvas.width !== candidate.width || tempCanvas.height !== candidate.height) {
        tempCanvas.width = candidate.width;
        tempCanvas.height = candidate.height;
      }
      
      // 元のCanvasの内容を一時Canvasにコピー
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(candidate, 0, 0);
      
      // 一時Canvasからピクセルデータを取得（これで警告が出ない）
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 32ビット単位でピクセルデータを扱うことで比較を高速化
      const data32 = new Uint32Array(imgData.data.buffer);
      
      // 白くないピクセルがあるかチェック
      let hasNonWhitePixel = false;
      // 10ピクセル飛ばしでチェックして処理を約10倍高速化
      for (let i = 0; i < data32.length; i += 10) {
        const pixel = data32[i];
        
        // アルファチャンネルが0（完全な透明）は無視
        if ((pixel & 0xFF000000) === 0) continue;
        
        // 白 (0xFFFFFFFF) 以外があればコンテンツありとみなす
        if (pixel !== 0xFFFFFFFF) {
          hasNonWhitePixel = true;
          break;
        }
      }
      
      if (hasNonWhitePixel) {
        // console.log(`コンテンツを持つCanvasを発見: ${candidate.className}`);
        return candidate;
      }
    } catch (e) {
      // console.warn(`Canvas確認エラー:`, e);
    }
  }
  return null;
}

// 次のページへ移動する関数
async function goToNextPage() {
  const nextButton = document.querySelector(".next-btn");
  if (nextButton && !nextButton.disabled && !nextButton.classList.contains('v-btn--disabled')) {
    nextButton.click();
    // ページ遷移のアニメーションを待つ
    await sleep(500);
    return true;
  }
  return false;
}

// メインの自動ダウンロード処理
async function startDownload() {
  const imageDataArray = [];
  let pageCounter = 1;
  let previousCanvasData = null;

  while (true) {
    console.log(`ページ ${pageCounter} のダウンロードを試みます...`);
    
    let canvas = null;
    let base64Data = null;
    let waitCount = 0;
    const maxWait = 30; // 最大3秒 (100ms * 30)
    
    // ページ遷移直後は少し待つ（アニメーション等への配慮）
    if (pageCounter > 1) {
      await sleep(300);
    }

    let stableCount = 0;
    let lastTempData = null;

    // Canvasが描画されるまでポーリング（短い間隔で監視）
    while (waitCount < maxWait) {
      canvas = findValidCanvas();
      if (canvas) {
        const tempData = canvas.toDataURL('image/png');
        
        // 最初のページ、または前のページと違う画像が取得できた場合
        if (pageCounter === 1 || tempData !== previousCanvasData) {
          if (tempData === lastTempData) {
            // 画像が変化しなくなったらカウントアップ
            stableCount++;
            // 5回連続(約500ms)同じ画像なら描画完了とみなす
            if (stableCount >= 5) {
              base64Data = tempData;
              break;
            }
          } else {
            // 画像が変化した（描画途中）場合はカウントリセット
            stableCount = 0;
            lastTempData = tempData;
          }
        } else if (pageCounter > 1 && tempData === previousCanvasData) {
          // ページ遷移したはずなのに前のページと同じ画像が取得された場合
          // まだ画面が切り替わっていないと判断して待機を続ける
          stableCount = 0;
        }
      }
      await sleep(100);
      waitCount++;
    }

    // タイムアウトした場合の処理
    if (!base64Data) {
      if (lastTempData) {
        // 異なる画像が取得できていたが安定しなかった場合
        base64Data = lastTempData;
      } else if (canvas && previousCanvasData) {
        // 3秒待っても画像が全く変化しなかった場合
        // 最終ページで「次へ」ボタンを押したが画面が切り替わらなかったと判断する
        console.log('画像が変化しませんでした。最終ページとみなして終了します。');
        alert(`ダウンロード完了！\n合計 ${pageCounter - 1} ページをダウンロードしました。\n\nPDFを作成中...`);
        await createPDFFromImages(imageDataArray);
        break;
      }
    }

    if (!canvas || !base64Data) {
      console.error('有効なCanvasが見つかりませんでした');
      alert(`画像を含むCanvasが見つかりませんでした。\nページ: ${pageCounter}\n待機回数: ${waitCount}`);
      break;
    }

    try {
      imageDataArray.push(base64Data);
      console.log(`ページ ${pageCounter} をダウンロードしました。`);
      
      previousCanvasData = base64Data;
      pageCounter++;
    } catch (error) {
      console.error('Canvas読み取りエラー:', error);
      alert('Canvas画像の読み取りに失敗しました。');
      break;
    }

    const hasNext = await goToNextPage();
    if (!hasNext) {
      // 次へボタンが押せない（最終ページ）場合は終了処理へ
      console.log('最終ページに到達しました。ダウンロードを終了します。');
      alert(`ダウンロード完了！\n合計 ${pageCounter - 1} ページをダウンロードしました。\n\nPDFを作成中...`);
      await createPDFFromImages(imageDataArray);
      break;
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
async function createPDFFromImages(imageDataArray) {
  if (!imageDataArray || imageDataArray.length === 0) {
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
    alert(`✅ 完了！\n\n${imageDataArray.length}ページのPDFを作成しました。\nファイル名: ${filename}`);

  } catch (error) {
    console.error('PDF作成エラー:', error);
    alert(`PDF作成中にエラーが発生しました。\n\nエラー: ${error.message}`);
  }
}

startDownload();