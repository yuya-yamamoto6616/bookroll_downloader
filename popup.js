/**
 * BookRoll Downloader - Popup Script
 * このコードはGitHub Copilot (AI) の支援を受けて作成されています
 */

document.getElementById('startDownload').addEventListener('click', () => {
  // 現在開いているタブの情報を取得
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // jspdf.umd.min.jsとcontent.jsを順番に実行
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['jspdf.umd.min.js', 'content.js']
    });
  });
});