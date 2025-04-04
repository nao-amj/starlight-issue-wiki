/**
 * データエクスポートとインポート機能のためのユーティリティ
 */

import type { GitHubIssue } from '../data/types';

/**
 * Issueデータをテキスト形式でエクスポートする形式のタイプ
 */
export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html';

/**
 * GitHubのIssueをJSONファイルとしてエクスポート
 * @param issues GitHubのIssueデータ配列
 * @param includeDetails 詳細情報を含めるかどうか
 * @returns JSONテキスト
 */
export function exportIssuesToJSON(issues: GitHubIssue[], includeDetails: boolean = true): string {
  if (!Array.isArray(issues)) {
    return '[]';
  }

  // 詳細情報を含める場合は、そのままの形式でエクスポート
  if (includeDetails) {
    return JSON.stringify(issues, null, 2);
  }

  // 詳細情報を含めない場合は、必要な情報のみを抽出
  const simplifiedIssues = issues.map(issue => ({
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    labels: issue.labels?.map(label => ({
      name: label.name,
      color: label.color
    })),
    assignees: issue.assignees?.map(assignee => ({
      login: assignee.login
    }))
  }));

  return JSON.stringify(simplifiedIssues, null, 2);
}

/**
 * GitHubのIssueをCSVファイルとしてエクスポート
 * @param issues GitHubのIssueデータ配列
 * @returns CSVテキスト
 */
export function exportIssuesToCSV(issues: GitHubIssue[]): string {
  if (!Array.isArray(issues) || issues.length === 0) {
    return 'number,title,state,created_at,updated_at,labels,assignees\n';
  }

  // ヘッダー行
  const header = 'number,title,state,created_at,updated_at,labels,assignees\n';

  // データ行
  const rows = issues.map(issue => {
    // 各フィールドをエスケープして、カンマで区切る
    const row = [
      issue.number,
      escapeCsvField(issue.title),
      issue.state,
      issue.created_at,
      issue.updated_at,
      issue.labels?.map(label => label.name).join(';') || '',
      issue.assignees?.map(assignee => assignee.login).join(';') || ''
    ];

    return row.join(',');
  }).join('\n');

  return header + rows;
}

/**
 * GitHubのIssueをMarkdownファイルとしてエクスポート
 * @param issues GitHubのIssueデータ配列
 * @returns Markdownテキスト
 */
export function exportIssuesToMarkdown(issues: GitHubIssue[]): string {
  if (!Array.isArray(issues) || issues.length === 0) {
    return '# Issues\n\nNo issues found.\n';
  }

  let markdown = '# Issues\n\n';

  // 各Issueをマークダウン形式で出力
  issues.forEach(issue => {
    markdown += `## #${issue.number}: ${issue.title}\n\n`;
    markdown += `**State:** ${issue.state}\n`;
    markdown += `**Created:** ${formatDate(issue.created_at)}\n`;
    markdown += `**Updated:** ${formatDate(issue.updated_at)}\n`;

    if (issue.labels && issue.labels.length > 0) {
      markdown += `**Labels:** ${issue.labels.map(label => label.name).join(', ')}\n`;
    }

    if (issue.assignees && issue.assignees.length > 0) {
      markdown += `**Assignees:** ${issue.assignees.map(assignee => assignee.login).join(', ')}\n`;
    }

    markdown += '\n';
    markdown += issue.body ? issue.body : '*(No description)*';
    markdown += '\n\n---\n\n';
  });

  return markdown;
}

/**
 * GitHubのIssueをHTMLファイルとしてエクスポート
 * @param issues GitHubのIssueデータ配列
 * @returns HTMLテキスト
 */
export function exportIssuesToHTML(issues: GitHubIssue[]): string {
  if (!Array.isArray(issues) || issues.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Issues Report</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
          .issue { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .issue-title { font-size: 20px; margin-bottom: 10px; }
          .issue-meta { font-size: 14px; color: #666; margin-bottom: 15px; }
          .issue-body { line-height: 1.5; }
          .label { display: inline-block; padding: 3px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        </style>
      </head>
      <body>
        <h1>Issues Report</h1>
        <p>No issues found.</p>
      </body>
      </html>
    `;
  }

  // HTML本文を構築
  let issuesHtml = '';
  issues.forEach(issue => {
    const labelsHtml = issue.labels?.map(label => {
      const textColor = isLightColor(label.color) ? '#000' : '#fff';
      return `<span class="label" style="background-color: #${label.color}; color: ${textColor}">${label.name}</span>`;
    }).join('') || '';

    issuesHtml += `
      <div class="issue">
        <h2 class="issue-title">#${issue.number}: ${escapeHtml(issue.title)}</h2>
        <div class="issue-meta">
          State: ${issue.state} | 
          Created: ${formatDate(issue.created_at)} | 
          Updated: ${formatDate(issue.updated_at)}
          ${issue.assignees && issue.assignees.length > 0 ? 
            ' | Assignees: ' + issue.assignees.map(a => a.login).join(', ') : 
            ''}
        </div>
        ${labelsHtml ? `<div class="issue-labels">${labelsHtml}</div>` : ''}
        <div class="issue-body">
          ${issue.body ? convertMarkdownToHtml(issue.body) : '<p><em>No description</em></p>'}
        </div>
      </div>
    `;
  });

  // 完全なHTMLドキュメントを返す
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Issues Report</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
        .issue { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .issue-title { font-size: 20px; margin-bottom: 10px; }
        .issue-meta { font-size: 14px; color: #666; margin-bottom: 15px; }
        .issue-labels { margin-bottom: 15px; }
        .issue-body { line-height: 1.5; }
        .label { display: inline-block; padding: 3px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        code { font-family: Consolas, Monaco, 'Andale Mono', monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        pre code { padding: 0; background-color: transparent; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin-left: 0; color: #666; }
      </style>
    </head>
    <body>
      <h1>Issues Report</h1>
      <p>Total Issues: ${issues.length} | Generated: ${formatDate(new Date().toISOString())}</p>
      ${issuesHtml}
    </body>
    </html>
  `;
}

/**
 * 指定された形式でIssueをエクスポート
 * @param issues Issue配列
 * @param format エクスポート形式
 * @param includeDetails JSON形式の場合、詳細情報を含めるかどうか
 * @returns エクスポートデータのテキスト
 */
export function exportIssuesTo(issues: GitHubIssue[], format: ExportFormat, includeDetails: boolean = true): string {
  switch (format) {
    case 'json':
      return exportIssuesToJSON(issues, includeDetails);
    case 'csv':
      return exportIssuesToCSV(issues);
    case 'markdown':
      return exportIssuesToMarkdown(issues);
    case 'html':
      return exportIssuesToHTML(issues);
    default:
      return exportIssuesToJSON(issues, includeDetails);
  }
}

/**
 * CSVフィールドのエスケープ処理
 * @param value エスケープする値
 * @returns エスケープされた値
 */
function escapeCsvField(value: any): string {
  if (value == null) return '';
  
  const str = String(value);
  // ダブルクオートやカンマが含まれる場合は、フィールドをダブルクオートで囲み、
  // 内部のダブルクオートはダブルクオートでエスケープする
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * HTML特殊文字のエスケープ
 * @param text エスケープするテキスト
 * @returns エスケープされたテキスト
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 日付の書式設定
 * @param dateString ISO形式の日付文字列
 * @returns 整形された日付文字列
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * 色が明るいかどうかを判定
 * @param hexColor 16進数のカラーコード（例: "FF5733"）
 * @returns 明るい色の場合はtrue
 */
function isLightColor(hexColor: string): boolean {
  try {
    // 16進数をRGB値に変換
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    
    // 輝度を計算（YIQ方式）
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    return yiq >= 128; // 128以上は明るい色
  } catch (error) {
    return false;
  }
}

/**
 * 簡易的なマークダウンからHTMLへの変換（完全ではない）
 * @param markdownText マークダウンテキスト
 * @returns HTMLテキスト
 */
function convertMarkdownToHtml(markdownText: string): string {
  if (!markdownText) return '';
  
  let html = escapeHtml(markdownText);
  
  // 見出し (h1～h6)
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // コード（インライン）
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // コードブロック（simple version）
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // リンク
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // 強調と太字
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // リスト項目
  html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
  
  // 箇条書きリストグループ
  html = html.replace(/(<li>.*?<\/li>)\n(?!<li>)/gs, '<ul>$1</ul>\n');
  
  // 引用
  html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
  
  // 段落
  html = html.replace(/\n\n(?!<)/g, '\n\n<p>');
  html = html.replace(/\n\n(?!<)/g, '</p>\n\n');
  
  return html;
}

/**
 * JSON形式からIssueデータをインポート
 * @param jsonData JSONデータ
 * @returns インポートされたIssue配列
 */
export function importIssuesFromJSON(jsonData: string): GitHubIssue[] {
  try {
    const data = JSON.parse(jsonData);
    if (!Array.isArray(data)) {
      throw new Error('Invalid JSON data: Expected an array of issues');
    }
    return data;
  } catch (error) {
    console.error('Error importing issues from JSON:', error);
    return [];
  }
}

/**
 * CSV形式からIssueデータをインポート
 * @param csvData CSVデータ
 * @returns インポートされたIssue配列
 */
export function importIssuesFromCSV(csvData: string): GitHubIssue[] {
  try {
    const lines = csvData.split('\n');
    if (lines.length < 2) {
      return [];
    }

    // ヘッダー行を取得
    const headers = lines[0].split(',');
    const numberIndex = headers.indexOf('number');
    const titleIndex = headers.indexOf('title');
    const stateIndex = headers.indexOf('state');
    const createdAtIndex = headers.indexOf('created_at');
    const updatedAtIndex = headers.indexOf('updated_at');
    const labelsIndex = headers.indexOf('labels');
    const assigneesIndex = headers.indexOf('assignees');

    // 必須フィールドのインデックスをチェック
    if (numberIndex === -1 || titleIndex === -1) {
      throw new Error('Required fields missing in CSV header');
    }

    // データ行をパース
    const issues: GitHubIssue[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 空行をスキップ

      // CSVの行を適切に分割（クオートされたフィールド内のカンマを考慮）
      const fields = parseCSVLine(lines[i]);

      // 基本フィールドを取得
      const number = parseInt(fields[numberIndex], 10);
      const title = fields[titleIndex];
      const state = stateIndex !== -1 ? fields[stateIndex] : 'open';
      const created_at = createdAtIndex !== -1 ? fields[createdAtIndex] : new Date().toISOString();
      const updated_at = updatedAtIndex !== -1 ? fields[updatedAtIndex] : new Date().toISOString();

      // ラベルを処理
      const labels = [];
      if (labelsIndex !== -1 && fields[labelsIndex]) {
        const labelNames = fields[labelsIndex].split(';');
        labelNames.forEach(name => {
          if (name.trim()) {
            labels.push({
              name: name.trim(),
              color: generateRandomColor()
            });
          }
        });
      }

      // アサイニーを処理
      const assignees = [];
      if (assigneesIndex !== -1 && fields[assigneesIndex]) {
        const assigneeNames = fields[assigneesIndex].split(';');
        assigneeNames.forEach(login => {
          if (login.trim()) {
            assignees.push({
              login: login.trim()
            });
          }
        });
      }

      // Issue オブジェクト作成
      const issue: GitHubIssue = {
        number,
        title,
        state,
        created_at,
        updated_at,
        labels,
        assignees
      };

      issues.push(issue);
    }

    return issues;
  } catch (error) {
    console.error('Error importing issues from CSV:', error);
    return [];
  }
}

/**
 * CSVの行を適切に分割
 * @param line CSV行
 * @returns フィールドの配列
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // ダブルクオートがペアになっている場合はフィールド内の文字として扱う
      if (i + 1 < line.length && line[i + 1] === '"') {
        currentField += '"';
        i++; // 次の文字をスキップ
      } else {
        // クオートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り（クオート外）
      fields.push(currentField);
      currentField = '';
    } else {
      // 通常の文字
      currentField += char;
    }
  }

  // 最後のフィールドを追加
  fields.push(currentField);

  return fields;
}

/**
 * ランダムな色コードを生成
 * @returns 16進数のカラーコード
 */
function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * ファイルをダウンロードする
 * @param content ファイルの内容
 * @param fileName ファイル名
 * @param contentType コンテンツタイプ
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * ファイルの内容を読み込む
 * @param file Fileオブジェクト
 * @returns ファイルの内容を含むPromise
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}
