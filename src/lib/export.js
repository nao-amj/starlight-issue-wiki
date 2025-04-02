/**
 * エクスポート機能のユーティリティ関数
 */

/**
 * IssueをNote形式に変換する
 * @param {Object} issue - GitHub Issueデータ
 * @param {Object} options - オプション
 * @param {boolean} options.includeMeta - メタデータを含めるか
 * @param {boolean} options.formatMarkdown - Markdown形式を維持するか
 * @param {boolean} options.autoAdjust - Note形式に最適化するか
 * @returns {string} Note形式のコンテンツ
 */
export function convertIssueToNoteFormat(issue, options = {}) {
  const { includeMeta = true, formatMarkdown = true, autoAdjust = true } = options;
  let noteContent = '';
  
  // メタデータを含める場合
  if (includeMeta) {
    noteContent += `<h1>${issue.title}</h1>\n\n`;
    noteContent += `<p><small>投稿日: ${new Date(issue.created_at).toLocaleDateString('ja-JP')}</small></p>\n\n`;
    
    if (issue.labels && issue.labels.length > 0) {
      noteContent += '<p>';
      issue.labels.forEach(label => {
        noteContent += `<span style="display: inline-block; padding: 0.2em 0.5em; background-color: #${label.color}20; color: #${label.color}; border: 1px solid #${label.color}40; border-radius: 0.25rem; margin-right: 0.5rem;">${label.name}</span>`;
      });
      noteContent += '</p>\n\n';
    }
    
    noteContent += '<hr>\n\n';
  }
  
  let bodyContent = issue.body || '';
  
  if (autoAdjust) {
    // マークダウンをNote形式のHTMLに最適化
    bodyContent = applyNoteOptimizations(bodyContent);
  } else if (!formatMarkdown) {
    // Markdownをプレーンテキストに変換
    bodyContent = convertMarkdownToPlainText(bodyContent);
  }
  
  noteContent += bodyContent;
  
  return noteContent;
}

/**
 * マークダウンをNote向けに最適化する
 * @param {string} markdown - マークダウンテキスト
 * @returns {string} 最適化されたHTML
 */
function applyNoteOptimizations(markdown) {
  let optimized = markdown;
  
  // 画像リンクの最適化
  optimized = optimized.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
  
  // 見出しの最適化
  optimized = optimized.replace(/^##\s+(.*)$/gm, '<h2 style="font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">$1</h2>');
  optimized = optimized.replace(/^###\s+(.*)$/gm, '<h3 style="font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</h3>');
  
  // リストの最適化
  optimized = optimized.replace(/^\s*[-*+]\s+(.*)$/gm, '<li style="margin-bottom: 0.5rem;">$1</li>');
  optimized = optimized.replace(/(<li[^>]*>.*<\/li>\n)+/gs, '<ul style="padding-left: 1.5rem; margin-bottom: 1.5rem;">$&</ul>');
  
  // 引用の最適化
  optimized = optimized.replace(/^>\s+(.*)$/gm, '<blockquote style="border-left: 4px solid #60a5fa; padding: 0.5rem 1rem; background-color: #f3f4f6; margin: 1.5rem 0;">$1</blockquote>');
  
  // コードブロックの最適化
  optimized = optimized.replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f3f4f6; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-family: monospace; margin: 1.5rem 0;">$1</pre>');
  
  // リンクの最適化
  optimized = optimized.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: none;">$1</a>');
  
  return optimized;
}

/**
 * マークダウンをプレーンテキストに変換する
 * @param {string} markdown - マークダウンテキスト
 * @returns {string} プレーンテキスト
 */
function convertMarkdownToPlainText(markdown) {
  return markdown
    .replace(/^#+\s+(.*)$/gm, '$1')
    .replace(/\*\*(.*)\*\*/g, '$1')
    .replace(/\*(.*)\*/g, '$1')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '[$1]')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
}

/**
 * Note用のエクスポートHTMLを生成する
 * @param {string} content - エクスポートするコンテンツ
 * @param {string} title - エクスポートするタイトル
 * @returns {string} エクスポート用HTML
 */
export function generateNoteExportHtml(content, title) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - Noteエクスポート</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
    img { max-width: 100%; height: auto; }
    pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; border-radius: 0.25rem; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1rem; color: #666; }
    h1, h2, h3 { font-weight: 600; line-height: 1.3; }
    .note-header { margin-bottom: 2rem; text-align: center; }
    .note-footer { margin-top: 3rem; text-align: center; font-size: 0.9rem; color: #666; border-top: 1px solid #eee; padding-top: 1rem; }
  </style>
</head>
<body>
  <div class="note-header">
    <h1>${title}</h1>
    <p>エクスポート日時: ${new Date().toLocaleString('ja-JP')}</p>
  </div>
  
  <div class="note-content">
    ${content}
  </div>
  
  <div class="note-footer">
    <p>GitWiki Hubからエクスポートされました</p>
  </div>
</body>
</html>
  `;
}

/**
 * エクスポートファイルをダウンロードする
 * @param {string} html - エクスポートするHTML
 * @param {string} filename - ファイル名
 */
export function downloadExportFile(html, filename) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
