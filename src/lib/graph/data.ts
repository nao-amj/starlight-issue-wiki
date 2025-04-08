/**
 * グラフデータの処理と準備のためのユーティリティ
 */

import type { GitHubIssue } from '../../data/types';
import { findBidirectionalLinks } from '../zettelkasten';
import { BASE_PATH } from '../../config';
import type { GraphData, GraphNode, GraphLink } from './types';

/**
 * Issue一覧からグラフノードを作成
 */
export function createGraphNodes(issues: GitHubIssue[], currentIssueNumber?: number): GraphNode[] {
  return issues.map(issue => ({
    id: issue.number,
    title: issue.title,
    url: `${BASE_PATH}/wiki/${issue.number}`,
    isCurrent: issue.number === currentIssueNumber,
    labels: issue.labels ? issue.labels.map(label => 
      typeof label === 'object' ? label.name : label
    ) : [],
    state: issue.state || 'open',
    comments: issue.comments || 0,
    updated_at: issue.updated_at,
    created_at: issue.created_at
  }));
}

/**
 * Issue間のリンク関係を抽出
 */
export function createGraphLinks(issues: GitHubIssue[], bidirectionalLinks: Map<number, number[]>): GraphLink[] {
  const links: GraphLink[] = [];
  const processedLinks = new Set<string>();

  issues.forEach(issue => {
    if (!issue.body) return;
    
    // [[...]]形式のリンクを検出
    const wikiLinks = issue.body.match(/\\[\\[(.*?)\\]\\]/g);
    if (wikiLinks) {
      wikiLinks.forEach(link => {
        const linkedTitle = link.substring(2, link.length - 2).trim();
        const linkedIssue = issues.find(i => 
          i.title.toLowerCase() === linkedTitle.toLowerCase() ||
          i.title.toLowerCase().includes(linkedTitle.toLowerCase())
        );
        
        if (linkedIssue && linkedIssue.number !== issue.number) {
          const linkId = `${issue.number}-${linkedIssue.number}`;
          if (!processedLinks.has(linkId)) {
            processedLinks.add(linkId);
            links.push({
              source: issue.number,
              target: linkedIssue.number,
              bidirectional: bidirectionalLinks.has(issue.number) && 
                bidirectionalLinks.get(issue.number)?.includes(linkedIssue.number),
              type: 'wiki'
            });
          }
        }
      });
    }
    
    // #番号形式のリンクを検出
    const issueRefs = issue.body.match(/#(\\d+)/g);
    if (issueRefs) {
      issueRefs.forEach(ref => {
        const refNumber = parseInt(ref.substring(1), 10);
        const refIssue = issues.find(i => i.number === refNumber);
        
        if (refIssue && refIssue.number !== issue.number) {
          const linkId = `${issue.number}-${refIssue.number}`;
          const reverseLinkId = `${refIssue.number}-${issue.number}`;
          
          if (!processedLinks.has(linkId) && !processedLinks.has(reverseLinkId)) {
            processedLinks.add(linkId);
            links.push({
              source: issue.number,
              target: refIssue.number,
              bidirectional: bidirectionalLinks.has(issue.number) && 
                bidirectionalLinks.get(issue.number)?.includes(refIssue.number),
              type: 'reference'
            });
          }
        }
      });
    }
  });

  return links;
}

/**
 * グラフデータを準備
 */
export function prepareGraphData(issues: GitHubIssue[], currentIssueNumber?: number): GraphData {
  // 双方向リンクを検出
  const bidirectionalLinks = findBidirectionalLinks(issues);
  
  // ノードとリンクの作成
  const nodes = createGraphNodes(issues, currentIssueNumber);
  const links = createGraphLinks(issues, bidirectionalLinks);
  
  return { nodes, links };
}

/**
 * 現在のノードに関連するノードとリンクのみにフィルタリングしたグラフデータを作成
 */
export function filterGraphForCurrentNode(graphData: GraphData, currentIssueNumber?: number): GraphData {
  if (!currentIssueNumber) return graphData;
  
  // 現在のノードと直接リンクしているノードのみを表示
  const connectedNodeIds = new Set<number>();
  connectedNodeIds.add(currentIssueNumber);
  
  graphData.links.forEach(link => {
    if (link.source === currentIssueNumber) {
      connectedNodeIds.add(link.target);
    }
    if (link.target === currentIssueNumber) {
      connectedNodeIds.add(link.source);
    }
  });
  
  return {
    nodes: graphData.nodes.filter(node => connectedNodeIds.has(node.id)),
    links: graphData.links.filter(link => 
      connectedNodeIds.has(link.source) && connectedNodeIds.has(link.target)
    )
  };
}

/**
 * ノードの色を決定する関数
 */
export function getNodeColor(node: GraphNode): string {
  if (node.isCurrent) return '#f04050';
  if (node.labels && node.labels.length > 0) {
    if (node.labels.includes('documentation')) return '#0075ca';
    if (node.labels.includes('feature')) return '#a2eeef';
    if (node.labels.includes('wiki')) return '#7057ff';
  }
  return '#4f6df5';
}

/**
 * ノードのサイズを決定する関数
 */
export function getNodeSize(node: GraphNode): number {
  // コメント数に応じてサイズを変更
  const baseSize = 6;
  if (node.comments > 10) return baseSize + 4;
  if (node.comments > 5) return baseSize + 2;
  if (node.comments > 0) return baseSize + 1;
  return baseSize;
}

/**
 * ラベルを短縮する関数
 */
export function truncateLabel(text: string): string {
  return text.length > 15 ? text.substring(0, 15) + '...' : text;
}
