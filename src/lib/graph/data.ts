/**
 * グラフデータを準備するためのユーティリティ関数
 */

import type { GraphData, GraphNode, GraphLink } from './types';
import fs from 'fs';
import path from 'path';

// キャッシュディレクトリ
const CACHE_DIR = './.cache';
// キャッシュの有効期限（ミリ秒）- 1時間
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Issueデータからグラフデータを生成
 * @param issues GitHub APIから取得したIssue配列
 * @param currentId 現在表示中のIssue ID（オプション）
 */
export function prepareGraphData(issues: any[], currentId?: number): GraphData {
  // キャッシュをチェック
  const cacheKey = `graph-data-${currentId || 'all'}`;
  
  // 開発中はキャッシュを無効化
  const cachedData = null; // getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  console.log('Building graph data...');
  console.time('Graph data generation');

  // パフォーマンス改善のため、常にMap操作を使用
  const nodesMap = new Map<number, GraphNode>();
  const linksMap = new Map<string, GraphLink>();
  
  // ノードの作成
  issues.forEach(issue => {
    nodesMap.set(issue.number, {
      id: issue.number,
      title: issue.title,
      url: `/starlight-issue-wiki/wiki/${issue.number}`,
      labels: issue.labels?.map((label: any) => label.name) || [],
      comments: issue.comments,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      state: issue.state,
      isCurrent: issue.number === currentId
    });
  });
  
  // リンクの抽出 - パフォーマンス最適化バージョン
  issues.forEach(issue => {
    if (!issue.body) return;
    
    // マッチングを一度だけ行い、結果を保持
    const wikiLinksMatches = issue.body.match(/\[\[(.*?)\]\]/g);
    const idRefsMatches = issue.body.match(/#(\d+)/g);
    
    // [[...]] 形式のリンクを処理
    if (wikiLinksMatches) {
      wikiLinksMatches.forEach((match: string) => {
        const linkedTitle = match.substring(2, match.length - 2).trim();
        
        // O(n)の線形探索を避け、フィルタリングを最適化
        for (const [targetId, node] of nodesMap.entries()) {
          if (node.title.toLowerCase() === linkedTitle.toLowerCase() ||
              node.title.toLowerCase().includes(linkedTitle.toLowerCase())) {
            // 重複チェックを高速化
            const linkId = `${issue.number}-${targetId}`;
            if (targetId !== issue.number && !linksMap.has(linkId)) {
              linksMap.set(linkId, {
                source: issue.number,
                target: targetId,
                type: 'wikilink',
                bidirectional: false  // 初期値はfalse
              });
              
              // 双方向リンクの検出
              const reverseLinkId = `${targetId}-${issue.number}`;
              if (linksMap.has(reverseLinkId)) {
                // 既存のリンクを双方向としてマーク
                linksMap.get(linkId)!.bidirectional = true;
                linksMap.get(reverseLinkId)!.bidirectional = true;
                
                // デバッグログ
                console.log(`双方向リンクを検出: ${issue.number} <-> ${targetId}`);
              }
            }
            break; // 一致したらループ終了
          }
        }
      });
    }
    
    // #数字 形式のリンクを処理
    if (idRefsMatches) {
      idRefsMatches.forEach((match: string) => {
        const targetId = parseInt(match.substring(1), 10);
        
        // ノードマップで直接チェック - O(1)の操作
        if (nodesMap.has(targetId) && targetId !== issue.number) {
          const linkId = `${issue.number}-${targetId}`;
          if (!linksMap.has(linkId)) {
            linksMap.set(linkId, {
              source: issue.number,
              target: targetId,
              type: 'idref',
              bidirectional: false  // 初期値はfalse
            });
            
            // 双方向リンクの検出
            const reverseLinkId = `${targetId}-${issue.number}`;
            if (linksMap.has(reverseLinkId)) {
              // 既存のリンクを双方向としてマーク
              linksMap.get(linkId)!.bidirectional = true;
              linksMap.get(reverseLinkId)!.bidirectional = true;
              
              // デバッグログ
              console.log(`双方向リンクを検出 (ID参照): ${issue.number} <-> ${targetId}`);
            }
          }
        }
      });
    }
  });
  
  // 双方向リンクの数をカウント
  let bidirectionalCount = 0;
  linksMap.forEach(link => {
    if (link.bidirectional) {
      bidirectionalCount++;
    }
  });
  
  console.log(`双方向リンクの合計 (重複カウント含む): ${bidirectionalCount}`);
  console.log(`実際の双方向リンクペア数: ${bidirectionalCount / 2}`);
  
  // 結果を生成
  const result: GraphData = {
    nodes: Array.from(nodesMap.values()),
    links: Array.from(linksMap.values())
  };
  
  console.timeEnd('Graph data generation');
  
  // パフォーマンス統計
  console.log(`Generated graph with ${result.nodes.length} nodes and ${result.links.length} links`);
  
  // 結果をキャッシュに保存
  saveToCache(cacheKey, result);
  
  return result;
}

/**
 * 現在のノードの周囲に表示するグラフをフィルタリング
 * パフォーマンス最適化バージョン
 */
export function filterGraphForCurrentNode(graphData: GraphData, currentId?: number): GraphData {
  if (!currentId) return graphData;
  
  // キャッシュをチェック
  const cacheKey = `filtered-graph-${currentId}`;
  
  // 開発中はキャッシュを無効化
  const cachedData = null; // getFromCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  console.time('Graph filtering');
  
  // サイズ制限 - グラフが大きすぎる場合に適用
  const MAX_NODES = 50;
  
  // 現在のノードを含むか確認
  const currentNode = graphData.nodes.find(n => n.id === currentId);
  if (!currentNode) return graphData;
  
  // 関連ノードIDのセットを構築 (O(1)のルックアップのため)
  const relatedNodeIds = new Set<number>();
  relatedNodeIds.add(currentId);
  
  // 直接リンクしたノードを見つける - O(m) where m is number of links
  graphData.links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (sourceId === currentId) {
      relatedNodeIds.add(targetId);
    } else if (targetId === currentId) {
      relatedNodeIds.add(sourceId);
    }
  });
  
  // サイズ制限を適用
  let includedNodeIds = Array.from(relatedNodeIds);
  
  // グラフが大きすぎる場合、最も重要なノードだけを保持
  if (includedNodeIds.length > MAX_NODES) {
    const linkedNodesWithWeight = Array.from(relatedNodeIds)
      .filter(id => id !== currentId)
      .map(id => {
        // ノードの重要度の計算
        const node = graphData.nodes.find(n => n.id === id);
        const linkCount = graphData.links.filter(l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return s === id || t === id;
        }).length;
        
        return {
          id,
          weight: (node?.comments || 0) + linkCount * 2
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_NODES - 1) // 現在のノード用に1つ残す
      .map(item => item.id);
    
    // 現在のノードと重要なノードのみを含める
    includedNodeIds = [currentId, ...linkedNodesWithWeight];
  }
  
  // サブグラフの作成
  const filteredNodes = graphData.nodes.filter(node => includedNodeIds.includes(node.id));
  const filteredLinks = graphData.links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return includedNodeIds.includes(sourceId) && includedNodeIds.includes(targetId);
  });
  
  const result = {
    nodes: filteredNodes,
    links: filteredLinks
  };
  
  console.timeEnd('Graph filtering');
  
  // 結果をキャッシュに保存
  saveToCache(cacheKey, result);
  
  return result;
}

/**
 * ノードの色を決定する
 * @param node グラフノード
 */
export function getNodeColor(node: GraphNode): string {
  if (node.isCurrent) {
    return '#ff5252';
  }
  
  if (node.state === 'closed') {
    return '#9e9e9e';
  }
  
  // ラベルに基づく色分け
  if (node.labels && node.labels.length > 0) {
    if (node.labels.some(l => l.includes('documentation') || l.includes('wiki'))) {
      return '#4fc3f7';
    }
    if (node.labels.some(l => l.includes('bug') || l.includes('error'))) {
      return '#ef5350';
    }
    if (node.labels.some(l => l.includes('feature'))) {
      return '#66bb6a';
    }
    if (node.labels.some(l => l.includes('enhancement'))) {
      return '#8c9eff';
    }
  }
  
  // コメント数に基づく色合い
  if (node.comments > 5) {
    return '#5c6bc0';
  }
  if (node.comments > 0) {
    return '#7986cb';
  }
  
  return '#9fa8da';
}

/**
 * ノードのサイズを決定する
 * @param node グラフノード
 */
export function getNodeSize(node: GraphNode): number {
  let size = 6;
  
  // コメント数による調整
  if (node.comments > 10) {
    size += 3;
  } else if (node.comments > 5) {
    size += 2;
  } else if (node.comments > 0) {
    size += 1;
  }
  
  // ラベル数による調整
  if (node.labels && node.labels.length > 0) {
    size += Math.min(node.labels.length, 2);
  }
  
  return size;
}

/**
 * ラベルを表示用に短くする
 * @param label ラベル文字列
 */
export function truncateLabel(label: string): string {
  const maxLength = 25;
  if (label.length <= maxLength) {
    return label;
  }
  return label.substring(0, maxLength - 3) + '...';
}

// キャッシュユーティリティ関数
// キャッシュディレクトリが存在しない場合は作成
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * キャッシュからデータを取得
 * @param cacheKey キャッシュのキー
 * @returns キャッシュデータまたはnull
 */
function getFromCache(cacheKey: string): any | null {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      
      // キャッシュが有効期限内かチェック
      if (cacheData.timestamp && Date.now() - cacheData.timestamp < CACHE_TTL) {
        console.log(`Using cached graph data for ${cacheKey}`);
        return cacheData.data;
      }
    } catch (error) {
      console.error(`Error reading cache for ${cacheKey}:`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * データをキャッシュに保存
 * @param cacheKey キャッシュのキー
 * @param data 保存するデータ
 */
function saveToCache(cacheKey: string, data: any): void {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  
  try {
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: Date.now(),
        data
      }, null, 0), // インデントを省いて容量削減
      'utf8'
    );
    console.log(`Cached graph data for ${cacheKey}`);
  } catch (error) {
    console.error(`Error caching data for ${cacheKey}:`, error);
  }
}
