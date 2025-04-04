/**
 * Zettelkastenモードの機能を実装するユーティリティ
 */

import { BASE_PATH, DEFAULT_ZETTELKASTEN_CONFIG } from '../config';
import type { GitHubIssue } from '../data/types';

// Zettelkasten設定の型定義
export interface ZettelkastenConfig {
  enabled: boolean;
  autoLinkKeywords: boolean;
  highlightBidirectional: boolean;
  showBacklinks: boolean;
  keywordMinLength: number;
}

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
    if (issue.labels && Array.isArray(issue.labels)) {
      issue.labels.forEach(label => {
        if (typeof label === 'object' && label.name && label.name.length >= minLength) {
          keywordMap.set(label.name.toLowerCase(), issue.number);
        }
      });
    }
  });
  
  return keywordMap;
}

// 双方向リンクを検出する関数
export function findBidirectionalLinks(issues: GitHubIssue[]): Map<number, number[]> {
  const mentionMap = new Map<number, Set<number>>();
  const bidirectionalLinks = new Map<number, number[]>();
  
  // 各issueのデフォルトの空のセットを作成
  issues.forEach(issue => {
    mentionMap.set(issue.number, new Set<number>());
  });
  
  // すべての言及を収集
  issues.forEach(issue => {
    if (issue.body) {
      // マッチをすべて検出 - [[...]]形式のリンク
      try {
        const matches = issue.body.match(/\[\[(.*?)\]\]/g);
        
        if (matches && matches.length > 0) {
          matches.forEach(matchStr => {
            // [[...]]から内部のテキストを抽出
            const linkedTitle = matchStr.substring(2, matchStr.length - 2).trim();
            
            // タイトルから対応するIssueを探す
            const linkedIssue = issues.find(i => 
              i.title.toLowerCase() === linkedTitle.toLowerCase() ||
              i.title.toLowerCase().includes(linkedTitle.toLowerCase())
            );
            
            if (linkedIssue && linkedIssue.number !== issue.number) {
              const mentions = mentionMap.get(issue.number);
              if (mentions) {
                mentions.add(linkedIssue.number);
              }
            }
          });
        }
      } catch (e) {
        console.error('Wikiリンク検出エラー:', e);
      }
      
      // #番号の形式も検出
      try {
        const issueRefMatches = issue.body.match(/#(\d+)/g);
        
        if (issueRefMatches && issueRefMatches.length > 0) {
          issueRefMatches.forEach(matchStr => {
            const issueNumber = parseInt(matchStr.substring(1), 10);
            // 実際にそのissue番号が存在するか確認
            const linkedIssue = issues.find(i => i.number === issueNumber);
            
            if (linkedIssue && linkedIssue.number !== issue.number) {
              const mentions = mentionMap.get(issue.number);
              if (mentions) {
                mentions.add(linkedIssue.number);
              }
            }
          });
        }
      } catch (e) {
        console.error('Issue参照検出エラー:', e);
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
  
  // 既存の [[...]] リンクを検出するための正規表現
  const wikiLinkRegex = /\[\[(.*?)\]\]/g;
  
  // 既存リンクの位置を記録
  const existingLinks = [];
  let match;
  while ((match = wikiLinkRegex.exec(body)) !== null) {
    existingLinks.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0]
    });
  }
  
  // キーワードをソート (長い順)
  const sortedKeywords = Array.from(keywords.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  // 処理済みの位置を追跡
  let result = '';
  let lastIndex = 0;
  
  for (let i = 0; i < body.length;) {
    // この位置が既存リンク内かチェック
    let insideExistingLink = false;
    for (const link of existingLinks) {
      if (i >= link.start && i < link.end) {
        // 既存リンク内なら、リンク全体をスキップ
        if (i === link.start) {
          result += link.text;
          lastIndex = link.end;
        }
        i = link.end;
        insideExistingLink = true;
        break;
      }
    }
    
    if (insideExistingLink) continue;
    
    // キーワードマッチング
    let matched = false;
    for (const [keyword, issueNumber] of sortedKeywords) {
      // 自分自身へのリンクはスキップ
      if (issueNumber === currentIssueNumber) continue;
      
      // 単語境界チェックのための簡易版
      const remainingText = body.slice(i);
      const keywordLower = keyword.toLowerCase();
      const lowerText = remainingText.toLowerCase();
      
      if (lowerText.startsWith(keywordLower)) {
        const charBefore = i > 0 ? body[i - 1] : ' ';
        const charAfter = body[i + keyword.length] || ' ';
        
        // 単語境界チェック (簡易版)
        if (/\W/.test(charBefore) && /\W/.test(charAfter)) {
          // リンクとして追加
          result += `[[${body.slice(i, i + keyword.length)}]]`;
          i += keyword.length;
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) {
      // マッチしなかった文字を追加
      result += body[i];
      i++;
    }
  }
  
  return result;
}

// WikiリンクをHTMLリンクに変換する関数（純粋な正規表現ベース）
export function convertWikiLinksToHtml(
  body: string, 
  issues: GitHubIssue[], 
  bidirectionalLinks: Map<number, number[]>,
  currentIssueNumber: number
): string {
  // Zettelkastenモードに関わらず常にリンク変換を行う（enabled条件を削除）
  
  // デバッグログ
  console.log(`convertWikiLinksToHtml: Processing ${body.length} characters`);
  
  // 正規表現で[[...]]形式のリンクを検索して置換
  const result = body.replace(/\[\[(.*?)\]\]/g, (match, linkedTitle) => {
    linkedTitle = linkedTitle.trim();
    console.log(`Found wiki link: [[${linkedTitle}]]`);
    
    // タイトルから対応するIssueを探す
    const linkedIssue = issues.find(issue => 
      issue.title.toLowerCase() === linkedTitle.toLowerCase() ||
      issue.title.toLowerCase().includes(linkedTitle.toLowerCase())
    );
    
    if (linkedIssue) {
      console.log(`Matched to issue #${linkedIssue.number}`);
      
      // 双方向リンクかどうかを確認
      const isBidirectional = bidirectionalLinks.has(currentIssueNumber) && 
        bidirectionalLinks.get(currentIssueNumber)?.includes(linkedIssue.number);
      
      const linkClass = isBidirectional
        ? 'wiki-link bidirectional' 
        : 'wiki-link';
      
      return `<a href="${BASE_PATH}/wiki/${linkedIssue.number}" class="${linkClass}" data-issue="${linkedIssue.number}">${linkedTitle}</a>`;
    }
    
    // 対応するIssueが見つからない場合は未リンクとして表示
    console.log(`No matching issue found for: ${linkedTitle}`);
    return `<span class="wiki-link-unlinked">${linkedTitle}</span>`;
  });
  
  console.log('Wiki links conversion completed');
  return result;
}
