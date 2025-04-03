/**
 * Zettelkastenモードの機能を実装するユーティリティ
 */

import { ZettelkastenConfig, DEFAULT_ZETTELKASTEN_CONFIG, BASE_PATH } from '../config';
import type { GitHubIssue } from '../data/types';

// ユーザー設定をロードする関数
export function loadZettelkastenSettings(): ZettelkastenConfig {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_ZETTELKASTEN_CONFIG;
  }

  try {
    const savedConfig = localStorage.getItem('zettelkastenConfig');
    return savedConfig 
      ? { ...DEFAULT_ZETTELKASTEN_CONFIG, ...JSON.parse(savedConfig) }
      : DEFAULT_ZETTELKASTEN_CONFIG;
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    return DEFAULT_ZETTELKASTEN_CONFIG;
  }
}

// ユーザー設定を保存する関数
export function saveZettelkastenSettings(config: ZettelkastenConfig): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    localStorage.setItem('zettelkastenConfig', JSON.stringify(config));
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
  }
}

// キーワード抽出のためのユーティリティ
export function extractKeywords(issues: GitHubIssue[]): Map<string, number> {
  const keywordMap = new Map<string, number>();
  const config = loadZettelkastenSettings();
  
  // 短すぎるキーワードを除外する最小長
  const minLength = config.keywordMinLength || 3;
  
  issues.forEach(issue => {
    // タイトルをキーワードとして追加
    if (issue.title && issue.title.length >= minLength) {
      keywordMap.set(issue.title.toLowerCase(), issue.number);
    }
    
    // ラベルをキーワードとして追加
    issue.labels?.forEach(label => {
      if (label.name && label.name.length >= minLength) {
        keywordMap.set(label.name.toLowerCase(), issue.number);
      }
    });
  });
  
  return keywordMap;
}

// 双方向リンクを検出する関数
export function findBidirectionalLinks(issues: GitHubIssue[]): Map<number, number[]> {
  const mentionMap = new Map<number, Set<number>>();
  const bidirectionalLinks = new Map<number, number[]>();
  
  // すべての言及を収集
  issues.forEach(issue => {
    if (!mentionMap.has(issue.number)) {
      mentionMap.set(issue.number, new Set<number>());
    }
    
    // 本文中の[[...]]形式のリンクを検出
    const wikiLinkRegex = /\[\[(.*?)\]\]/g;
    let match;
    
    if (issue.body) {
      while ((match = wikiLinkRegex.exec(issue.body)) !== null) {
        const linkedTitle = match[1].trim();
        
        // タイトルから対応するIssueを探す
        const linkedIssue = issues.find(i => 
          i.title.toLowerCase() === linkedTitle.toLowerCase() ||
          i.title.toLowerCase().includes(linkedTitle.toLowerCase())
        );
        
        if (linkedIssue && linkedIssue.number !== issue.number) {
          mentionMap.get(issue.number)?.add(linkedIssue.number);
        }
      }
    }
  });
  
  // 双方向リンクを検出
  mentionMap.forEach((mentions, issueNumber) => {
    const bidirectional: number[] = [];
    
    mentions.forEach(mentionedIssue => {
      const mentionedIssueMentions = mentionMap.get(mentionedIssue);
      
      // 双方向で言及しているかをチェック
      if (mentionedIssueMentions && mentionedIssueMentions.has(issueNumber)) {
        bidirectional.push(mentionedIssue);
      }
    });
    
    if (bidirectional.length > 0) {
      bidirectionalLinks.set(issueNumber, bidirectional);
    }
  });
  
  return bidirectionalLinks;
}

// バックリンクを取得する関数
export function findBacklinks(currentIssueNumber: number, issues: GitHubIssue[]): GitHubIssue[] {
  const currentIssue = issues.find(issue => issue.number === currentIssueNumber);
  if (!currentIssue) return [];
  
  return issues.filter(issue => {
    if (issue.number === currentIssueNumber) return false;
    
    // 本文が存在するかチェック
    if (!issue.body) return false;
    
    // 本文に現在のIssueへの言及があるかをチェック
    const titleLower = currentIssue.title.toLowerCase();
    const bodyLower = issue.body.toLowerCase();
    
    // [[リンク]]形式をチェック
    const containsWikiLink = bodyLower.includes(`[[${titleLower}]]`);
    
    // #番号形式をチェック
    const containsIssueReference = bodyLower.includes(`#${currentIssueNumber}`);
    
    return containsWikiLink || containsIssueReference;
  });
}

// 本文にZettelkastenリンクを適用する関数
export function applyZettelkastenLinks(
  body: string, 
  keywords: Map<string, number>, 
  currentIssueNumber: number
): string {
  const config = loadZettelkastenSettings();
  if (!config.enabled || !config.autoLinkKeywords) return body;
  
  let processedBody = body;
  
  // すでに[[...]]形式でリンクされている部分を除外してキーワードリンクをかける
  const parts: string[] = [];
  const wikiLinkRegex = /\[\[(.*?)\]\]/g;
  let lastIndex = 0;
  let match;
  
  while ((match = wikiLinkRegex.exec(processedBody)) !== null) {
    // リンク前のテキスト部分を追加
    const beforeLink = processedBody.substring(lastIndex, match.index);
    parts.push(processKeywordLinks(beforeLink, keywords, currentIssueNumber));
    
    // リンク部分はそのまま追加
    parts.push(match[0]);
    
    lastIndex = match.index + match[0].length;
  }
  
  // 残りの部分を処理
  if (lastIndex < processedBody.length) {
    parts.push(processKeywordLinks(
      processedBody.substring(lastIndex), 
      keywords, 
      currentIssueNumber
    ));
  }
  
  return parts.join('');
}

// キーワードをWikiリンクに変換
function processKeywordLinks(
  text: string, 
  keywords: Map<string, number>, 
  currentIssueNumber: number
): string {
  let processedText = text;
  
  // 長いキーワードから処理（短いキーワードが長いキーワードの一部である可能性があるため）
  const sortedKeywords = Array.from(keywords.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [keyword, issueNumber] of sortedKeywords) {
    // 自分自身へのリンクは作成しない
    if (issueNumber === currentIssueNumber) continue;
    
    // 単語境界を考慮してキーワードを見つける
    const regex = new RegExp(`\\b(${escapeRegExp(keyword)})\\b`, 'gi');
    processedText = processedText.replace(regex, `[[$1]]`);
  }
  
  return processedText;
}

// 正規表現のエスケープ処理
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// WikiリンクをHTMLリンクに変換する関数
export function convertWikiLinksToHtml(
  body: string, 
  issues: GitHubIssue[], 
  bidirectionalLinks: Map<number, number[]>,
  currentIssueNumber: number
): string {
  const config = loadZettelkastenSettings();
  if (!config.enabled) return body;
  
  const wikiLinkRegex = /\[\[(.*?)\]\]/g;
  
  return body.replace(wikiLinkRegex, (match, linkText) => {
    const linkedTitle = linkText.trim();
    
    // タイトルから対応するIssueを探す
    const linkedIssue = issues.find(issue => 
      issue.title.toLowerCase() === linkedTitle.toLowerCase() ||
      issue.title.toLowerCase().includes(linkedTitle.toLowerCase())
    );
    
    if (linkedIssue) {
      // 双方向リンクかどうかを確認
      const isBidirectional = bidirectionalLinks.has(currentIssueNumber) && 
        bidirectionalLinks.get(currentIssueNumber)?.includes(linkedIssue.number);
      
      const linkClass = isBidirectional && config.highlightBidirectional
        ? 'wiki-link bidirectional' 
        : 'wiki-link';
      
      return `<a href="${BASE_PATH}/wiki/${linkedIssue.number}" class="${linkClass}" 
               data-issue="${linkedIssue.number}">${linkedTitle}</a>`;
    }
    
    // 対応するIssueが見つからない場合は未リンクとして表示
    return `<span class="wiki-link-unlinked">${linkedTitle}</span>`;
  });
}
