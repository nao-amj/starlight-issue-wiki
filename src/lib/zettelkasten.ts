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
    // 本文中の[[...]]形式のリンクを検出
    const wikiLinkRegex = /\\[\\[(.*?)\\]\\]/g;
    
    if (issue.body) {
      // マッチをすべて検出
      const matches = [...issue.body.matchAll(/\[\[(.*?)\]\]/g)];
      
      if (matches.length > 0) {
        matches.forEach(match => {
          if (match[1]) {
            // [[...]]から内部のテキストを抽出
            const linkedTitle = match[1].trim();
            
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
          }
        });
      }
      
      // #番号の形式も検出
      const issueRefMatches = [...issue.body.matchAll(/#(\d+)/g)];
      
      if (issueRefMatches.length > 0) {
        issueRefMatches.forEach(match => {
          if (match[1]) {
            const issueNumber = parseInt(match[1], 10);
            // 実際にそのissue番号が存在するか確認
            const linkedIssue = issues.find(i => i.number === issueNumber);
            
            if (linkedIssue && linkedIssue.number !== issue.number) {
              const mentions = mentionMap.get(issue.number);
              if (mentions) {
                mentions.add(linkedIssue.number);
              }
            }
          }
        });
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
  
  // すでに[[...]]形式でリンクされている部分を除外するために、文書をセグメント化
  const segments: {text: string, isWikiLink: boolean}[] = [];
  let lastIndex = 0;
  
  // [[...]]を見つけてセグメント化
  const wikiLinkRegex = /\[\[(.*?)\]\]/g;
  let match;
  
  while ((match = wikiLinkRegex.exec(processedBody)) !== null) {
    // リンク前のテキスト
    if (match.index > lastIndex) {
      segments.push({
        text: processedBody.substring(lastIndex, match.index),
        isWikiLink: false
      });
    }
    
    // リンク自体
    segments.push({
      text: match[0],
      isWikiLink: true
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 残りのテキスト
  if (lastIndex < processedBody.length) {
    segments.push({
      text: processedBody.substring(lastIndex),
      isWikiLink: false
    });
  }
  
  // Wiki形式でないセグメントのみキーワード変換
  for (let i = 0; i < segments.length; i++) {
    if (!segments[i].isWikiLink) {
      segments[i].text = processKeywordLinks(segments[i].text, keywords, currentIssueNumber);
    }
  }
  
  // 全セグメントを結合
  return segments.map(s => s.text).join('');
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
    
    try {
      // 単語境界を考慮してキーワードを見つける
      const regex = new RegExp(`\\b(${escapeRegExp(keyword)})\\b`, 'gi');
      
      // 最初の一致のみリンクに変換（複数の同じキーワードがあった場合に無限ループを防ぐ）
      let matched = false;
      processedText = processedText.replace(regex, (match, p1) => {
        if (!matched) {
          matched = true;
          return `[[${p1}]]`;
        }
        return match;
      });
    } catch (e) {
      console.error(`キーワード変換エラー: ${keyword}`, e);
    }
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
