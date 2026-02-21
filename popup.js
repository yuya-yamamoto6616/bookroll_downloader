/**
 * BookRoll Downloader - Popup Script
 * このコードはGitHub Copilot (AI) の支援を受けて作成されています
 */

document.getElementById('startDownload').addEventListener('click', async () => {
  try {
    // 現在開いているタブの情報を取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // jspdf.umd.min.jsとcontent.jsを順番に実行
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['jspdf.umd.min.js', 'content.js']
      });
    }
  } catch (error) {
    console.error('スクリプトの実行に失敗しました:', error);
  }
});