/**
 * ナレッジグラフ機能のための型定義
 */

import type { GitHubIssue } from '../../data/types';

// グラフノードの型定義
export interface GraphNode {
  id: number;
  title: string;
  url: string;
  isCurrent: boolean;
  labels: string[];
  state: string;
  comments: number;
  updated_at: string;
  created_at: string;
}

// グラフリンクの型定義
export interface GraphLink {
  source: number;
  target: number;
  bidirectional: boolean;
  type: 'wiki' | 'reference';
}

// グラフデータの型定義
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// KnowledgeGraphコンポーネントのprops型
export interface KnowledgeGraphProps {
  issues: GitHubIssue[];
  currentIssueNumber?: number;
  showFullGraph?: boolean;
}

// コントロールパネルの設定
export interface GraphControlsConfig {
  showLabels: boolean;
  showLegend: boolean;
  physicsEnabled: boolean;
}

// ノード詳細情報の型
export interface NodeDetails {
  id: number;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
  comments: number;
  labels: string[];
  incomingLinks: GraphNode[];
  outgoingLinks: GraphNode[];
}
