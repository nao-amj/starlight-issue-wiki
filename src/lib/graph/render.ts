/**
 * グラフの描画とインタラクションを扱うユーティリティ
 */

import type { GraphData, GraphNode, GraphLink } from './types';
import { getNodeColor, getNodeSize, truncateLabel } from './data';

// 引数に型を付与
type D3Instance = any; // D3.jsの型定義（簡易化）
type Simulation = any;
type Zoom = any;

/**
 * グラフの初期化と描画
 */
export function initGraph(
  d3: D3Instance, 
  graphElement: HTMLElement, 
  graphData: GraphData,
  isFullGraph: boolean,
  currentId?: number
) {
  // グラフの読み込み中表示を削除
  const loadingElement = graphElement.querySelector('.graph-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
  
  // SVG要素の作成
  const width = graphElement.clientWidth;
  const height = graphElement.clientHeight;
  
  const svg = d3.select(graphElement)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height]);
  
  // SVGフィルター定義（グロー効果）
  setupSvgFilters(d3, svg);
  
  // ズーム機能の定義
  const zoom = setupZoom(d3, svg, width, height);
  
  // グループコンテナ（ズーム用）
  const container = svg.append('g')
    .attr('class', 'graph-container');
  
  // リンクとノードを描画
  const { link, node, label } = renderGraphElements(d3, container, graphData, currentId);
  
  // ジャンプリンク用のコンテナ
  setupJumpLinks(d3, graphElement, graphData.nodes, isFullGraph);
  
  // ツールチップの作成
  const tooltip = d3.select('body').append('div')
    .attr('class', 'node-tooltip')
    .style('opacity', 0);
  
  // シミュレーションの設定
  const simulation = setupSimulation(d3, graphData, width, height, isFullGraph, link, node, label);
  
  // ノードイベントハンドラの設定
  setupNodeEventHandlers(
    node, 
    link, 
    label, 
    tooltip, 
    graphData, 
    isFullGraph, 
    simulation, 
    currentId
  );
  
  // ズームコントロールのイベントハンドラー
  if (isFullGraph) {
    setupZoomControls(d3, svg, zoom);
  }
  
  // 現在のノードにスクロールしてフォーカス
  if (currentId && isFullGraph) {
    focusOnCurrentNode(d3, svg, zoom, graphData, currentId, width, height);
  }
  
  // ウィンドウサイズ変更時の処理
  setupResizeHandler(svg, width, height, simulation, d3);
  
  return {
    svg,
    container,
    link,
    node,
    label,
    zoom,
    simulation,
    tooltip
  };
}

/**
 * SVGフィルターの設定
 */
function setupSvgFilters(d3: D3Instance, svg: any) {
  const defs = svg.append('defs');
  
  // グロー効果フィルター
  const filter = defs.append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');
    
  filter.append('feGaussianBlur')
    .attr('stdDeviation', '2.5')
    .attr('result', 'coloredBlur');
    
  const feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode')
    .attr('in', 'coloredBlur');
  feMerge.append('feMergeNode')
    .attr('in', 'SourceGraphic');
}

/**
 * ズーム機能の設定
 */
function setupZoom(d3: D3Instance, svg: any, width: number, height: number): Zoom {
  // ズーム機能の定義
  const zoom = d3.zoom()
    .scaleExtent([0.1, 5])
    .on('zoom', (event: any) => {
      const container = svg.select('.graph-container');
      container.attr('transform', event.transform);
      
      // ズームレベルに応じてラベルの表示を調整
      adjustLabels(d3, event.transform.k);
      
      // ジャンプリンクの位置を更新
      updateJumpLinks();
    });
  
  // SVGにズーム機能を追加
  svg.call(zoom);
  
  return zoom;
}

/**
 * グラフ要素（リンク、ノード、ラベル）の描画
 */
function renderGraphElements(
  d3: D3Instance, 
  container: any, 
  graphData: GraphData, 
  currentId?: number
) {
  // リンクを描画するためのグループ
  const link = container.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(graphData.links)
    .enter().append('line')
    .attr('class', (d: GraphLink) => 
      `graph-link ${d.bidirectional ? 'bidirectional' : ''} ${d.type || ''}`)
    .attr('stroke', (d: GraphLink) => d.bidirectional ? '#0fa968' : '#999')
    .attr('stroke-width', (d: GraphLink) => d.bidirectional ? 2.5 : 1.5);
  
  // ノードを描画するためのグループ
  const node = container.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(graphData.nodes)
    .enter().append('circle')
    .attr('class', (d: GraphNode) => `graph-node ${d.isCurrent ? 'current' : ''}`)
    .attr('r', (d: GraphNode) => d.isCurrent ? 9 : getNodeSize(d))
    .attr('fill', (d: GraphNode) => getNodeColor(d))
    .attr('data-id', (d: GraphNode) => d.id)
    .attr('data-url', (d: GraphNode) => d.url);
  
  // ラベルの描画（デフォルトでは表示）
  const label = container.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(graphData.nodes)
    .enter().append('text')
    .attr('class', (d: GraphNode) => `node-label ${d.isCurrent ? 'current' : ''}`)
    .attr('dy', (d: GraphNode) => d.isCurrent ? '-1.5em' : '-1em')
    .text((d: GraphNode) => truncateLabel(d.title))
    .style('opacity', 1); // デフォルトで全てのラベルを表示
  
  return { link, node, label };
}

/**
 * ジャンプリンクのセットアップ
 */
function setupJumpLinks(d3: D3Instance, graphElement: HTMLElement, nodes: GraphNode[], isFullGraph: boolean) {
  const jumpLinksContainer = d3.select(graphElement).append('div')
    .attr('class', 'jump-links-container')
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)
    .style('width', '100%')
    .style('height', '100%')
    .style('pointer-events', 'none');
    
  // 各ノードに対するジャンプリンクを作成
  nodes.forEach(nodeData => {
    jumpLinksContainer.append('a')
      .attr('class', 'node-jump-link')
      .attr('id', `jump-link-${nodeData.id}`)
      .attr('href', nodeData.url)
      .attr('target', isFullGraph ? '_blank' : '_self')
      .html(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>ページへ`)
      .style('display', 'none');
  });
}

/**
 * D3シミュレーションのセットアップ
 */
function setupSimulation(
  d3: D3Instance, 
  graphData: GraphData, 
  width: number, 
  height: number, 
  isFullGraph: boolean,
  link: any,
  node: any,
  label: any
): Simulation {
  // 改善: 中心からのバイアスを持つ力を追加
  const centerForce = d3.forceCenter(width / 2, height / 2);
  
  // 改善: 反発力を適切に設定
  const chargeForce = d3.forceManyBody()
    .strength(isFullGraph ? -400 : -250) // 反発力を強化
    .distanceMax(width / 2); // 最大距離を設定して広がりすぎを防止
  
  // 改善: リンク距離を調整
  const linkForce = d3.forceLink(graphData.links)
    .id((d: GraphNode) => d.id)
    .distance(isFullGraph ? 120 : 90); // リンク距離を広げる
  
  // 改善: X, Y方向の中心に引き寄せる力を追加
  const forceX = d3.forceX(width / 2).strength(0.05);
  const forceY = d3.forceY(height / 2).strength(0.05);
  
  // 改善: 衝突回避を調整
  const collideForce = d3.forceCollide().radius(25);
  
  // シミュレーションの設定
  const simulation = d3.forceSimulation(graphData.nodes)
    .force('link', linkForce)
    .force('charge', chargeForce)
    .force('center', centerForce)
    .force('x', forceX)
    .force('y', forceY)
    .force('collision', collideForce)
    .on('tick', () => {
      // 改善: ノードの位置制約を緩和して内側に集める
      const padding = 50; // 画面端からの余白
      
      // シミュレーション更新時の描画更新
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node
        .attr('cx', (d: any) => {
          return d.x = Math.max(padding, Math.min(width - padding, d.x));
        })
        .attr('cy', (d: any) => {
          return d.y = Math.max(padding, Math.min(height - padding, d.y));
        });
      
      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y - 10);
        
      // アクティブなノードのジャンプリンク位置を更新
      updateJumpLinks();
    });
  
  return simulation;
}

/**
 * ノードのイベントハンドラの設定
 */
function setupNodeEventHandlers(
  node: any,
  link: any,
  label: any,
  tooltip: any,
  graphData: GraphData,
  isFullGraph: boolean,
  simulation: Simulation,
  currentId?: number
) {
  // ノードのマウスオーバー処理
  node.on('mouseover', nodeMouseOver);
  
  // ノードのマウスアウト処理
  node.on('mouseout', nodeMouseOut);
  
  // ノードクリック時の挙動
  node.on('click', nodeClicked);
  
  // ノードダブルクリック時の挙動
  node.on('dblclick', nodeDoubleClicked);
  
  // ハンドラ関数の定義
  function nodeMouseOver(event: any, d: GraphNode) {
    // ノードを強調表示
    d3.select(this)
      .transition()
      .duration(200)
      .attr('r', d.isCurrent ? 12 : getNodeSize(d) + 3);
    
    // 関連リンク、ノード、ラベルを強調
    if (isFullGraph) {
      highlightNodeLinks(d.id);
    } else {
      // ミニグラフの場合はより単純な強調表示
      link.transition()
        .duration(200)
        .style('opacity', (l: any) => 
          l.source.id === d.id || l.target.id === d.id ? 1 : 0.1);
      
      node.transition()
        .duration(200)
        .style('opacity', (n: GraphNode) => 
          n.id === d.id || 
          graphData.links.some(l => 
            (l.source === d.id && l.target === n.id) || 
            (l.target === d.id && l.source === n.id)
          ) ? 1 : 0.3);
      
      label.transition()
        .duration(200)
        .style('opacity', (n: GraphNode) => 
          n.id === d.id || 
          graphData.links.some(l => 
            (l.source === d.id && l.target === n.id) || 
            (l.target === d.id && l.source === n.id)
          ) ? 1 : 0.1);
    }
    
    // ツールチップを表示
    tooltip.transition()
      .duration(200)
      .style('opacity', 0.9);
    
    const tooltipContent = `
      <div class="node-tooltip-title">${d.title}</div>
      <div class="node-tooltip-info">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        Issue #${d.id}
      </div>
      ${d.labels && d.labels.length > 0 ? 
        `<div class="node-tooltip-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
          ${d.labels.join(', ')}
        </div>` : ''}
      ${d.comments > 0 ? 
        `<div class="node-tooltip-info">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          コメント数: ${d.comments}
        </div>` : ''}
      <div class="node-tooltip-info">クリックで詳細表示 | ダブルクリックで記事へ</div>
    `;
    
    tooltip.html(tooltipContent)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 28) + 'px');
  }
  
  function nodeMouseOut(event: any, d: GraphNode) {
    // ノードを元に戻す
    d3.select(this)
      .transition()
      .duration(200)
      .attr('r', d.isCurrent ? 9 : getNodeSize(d));
    
    // リンク、ノード、ラベルを元に戻す
    if (isFullGraph) {
      // 選択状態のノードが存在するかチェック
      const selectedNode = node.filter('.selected');
      if (selectedNode.size() > 0) {
        // 選択状態のノードがあれば、そのノードの強調を維持
        const selectedId = selectedNode.datum().id;
        highlightNodeLinks(selectedId);
      } else {
        // 選択状態のノードがなければ、すべて通常表示に戻す
        highlightNodeLinks(null, false);
      }
    } else {
      // ミニグラフの場合の処理
      link.transition()
        .duration(200)
        .style('opacity', 0.5);
      
      node.transition()
        .duration(200)
        .style('opacity', 1);
      
      label.transition()
        .duration(200)
        .style('opacity', 1);
    }
    
    // ツールチップを非表示
    tooltip.transition()
      .duration(200)
      .style('opacity', 0);
  }
  
  function nodeClicked(event: any, d: GraphNode) {
    if (event.defaultPrevented) return;
    event.preventDefault();
    
    if (isFullGraph) {
      // 現在のノードが選択されているか
      const isCurrentlySelected = d3.select(this).classed('selected');
      
      // すべてのノードから選択状態を解除
      node.classed('selected', false).classed('active', false);
      
      if (!isCurrentlySelected) {
        // 選択状態にして詳細を表示
        d3.select(this).classed('selected', true).classed('active', true);
        highlightNodeLinks(d.id);
        showNodeDetails(d);
        
        // パネルが閉じている場合、開く
        const panelContent = document.querySelector('.panel-content');
        const togglePanelBtn = document.getElementById('toggle-panel');
        if (panelContent && panelContent.classList.contains('collapsed') && togglePanelBtn) {
          panelContent.classList.remove('collapsed');
          togglePanelBtn.classList.remove('collapsed');
        }
      } else {
        // 選択解除
        highlightNodeLinks(null, false);
        const nodeDetails = document.getElementById('node-details');
        if (nodeDetails) {
          nodeDetails.innerHTML = 
            '<div class="no-selection">ノードを選択すると詳細が表示されます</div>';
        }
      }
    } else {
      // ミニグラフの場合は直接ジャンプリンクを表示
      const nodeId = d.id;
      const jumpLink = document.getElementById(`jump-link-${nodeId}`);
      
      if (jumpLink) {
        const nodePosition = event.target.getBoundingClientRect();
        const containerPosition = (event.target.closest('.knowledge-graph-container') || 
          document.querySelector('.knowledge-graph-container'))?.getBoundingClientRect();
        
        if (containerPosition) {
          // グラフ内の相対位置を計算
          const relativeLeft = nodePosition.left - containerPosition.left;
          const relativeTop = nodePosition.top - containerPosition.top;
          
          // ジャンプリンクの位置を設定して表示
          jumpLink.style.display = 'block';
          jumpLink.style.left = `${relativeLeft}px`;
          jumpLink.style.top = `${relativeTop + 15}px`;
          
          // 表示アニメーション
          setTimeout(() => {
            jumpLink.classList.add('visible');
          }, 10);
          
          // 他のジャンプリンクを非表示
          document.querySelectorAll('.node-jump-link').forEach(el => {
            if (el.id !== `jump-link-${nodeId}`) {
              (el as HTMLElement).style.display = 'none';
              el.classList.remove('visible');
            }
          });
        }
      }
    }
  }
  
  function nodeDoubleClicked(event: any, d: GraphNode) {
    event.preventDefault();
    
    // 記事ページに直接ジャンプ
    window.location.href = d.url;
  }
  
  // リンクの強調表示
  function highlightNodeLinks(nodeId: number | null, highlight = true) {
    if (!nodeId && !highlight) {
      // すべての強調を解除
      link.classed('highlighted', false).style('opacity', 0.5);
      node.classed('selected', false).classed('active', false).style('opacity', 1);
      label.classed('highlighted', false).style('opacity', d => d.isCurrent ? 1 : 0.7);
      
      // ジャンプリンクを非表示
      document.querySelectorAll('.node-jump-link').forEach(el => {
        (el as HTMLElement).style.display = 'none';
        el.classList.remove('visible');
      });
      
      return;
    }
    
    if (!nodeId) return;
    
    // 関連リンクを強調
    link
      .classed('highlighted', d => 
        highlight && (d.source.id === nodeId || d.target.id === nodeId)
      )
      .style('opacity', d => 
        highlight 
          ? (d.source.id === nodeId || d.target.id === nodeId ? 1 : 0.1)
          : 0.5
      );

    // 関連ノードとラベルを強調
    const connectedNodeIds = new Set<number>();
    if (highlight) {
      graphData.links.forEach(l => {
        if (l.source === nodeId || (typeof l.source === 'object' && l.source.id === nodeId)) {
          connectedNodeIds.add(typeof l.target === 'object' ? l.target.id : l.target);
        }
        if (l.target === nodeId || (typeof l.target === 'object' && l.target.id === nodeId)) {
          connectedNodeIds.add(typeof l.source === 'object' ? l.source.id : l.source);
        }
      });
      connectedNodeIds.add(nodeId);
    }

    node
      .classed('selected', d => highlight && d.id === nodeId)
      .classed('active', d => highlight && d.id === nodeId)
      .style('opacity', d => 
        highlight 
          ? (connectedNodeIds.has(d.id) ? 1 : 0.2)
          : 1
      );

    const showLabels = document.querySelector('#toggle-labels')?.classList.contains('active') ?? true;
    label
      .classed('highlighted', d => highlight && d.id === nodeId)
      .style('opacity', d => {
        if (!isFullGraph) return 1;
        if (d.isCurrent) return 1;
        if (d.id === nodeId) return 1;
        if (highlight && connectedNodeIds.has(d.id)) return 1;
        return showLabels ? 0.7 : 0;
      });

    // ジャンプリンクの表示/非表示
    const jumpLinkElements = document.querySelectorAll('.node-jump-link');
    jumpLinkElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
      el.classList.remove('visible');
    });

    if (highlight) {
      const jumpLink = document.getElementById(`jump-link-${nodeId}`);
      if (jumpLink) {
        jumpLink.style.display = 'block';
        
        // アクティブなノードの位置を取得
        const activeNode = document.querySelector(`.graph-node[data-id="${nodeId}"]`);
        if (activeNode) {
          const nodePosition = activeNode.getBoundingClientRect();
          const containerPosition = activeNode.closest('.knowledge-graph-container')?.getBoundingClientRect();
          
          if (containerPosition) {
            // グラフ内の相対位置を計算
            const relativeLeft = nodePosition.left - containerPosition.left;
            const relativeTop = nodePosition.top - containerPosition.top;
            
            // ジャンプリンクの位置を設定
            jumpLink.style.left = `${relativeLeft}px`;
            jumpLink.style.top = `${relativeTop + 15}px`;
            
            // 表示アニメーション
            setTimeout(() => {
              jumpLink.classList.add('visible');
            }, 10);
          }
        }
      }
    }
  }
}

/**
 * ズームコントロールのイベントハンドラーの設定
 */
function setupZoomControls(d3: D3Instance, svg: any, zoom: any) {
  // ズームイン
  document.getElementById('zoom-in')?.addEventListener('click', () => {
    svg.transition().duration(300).call(
      zoom.scaleBy, 1.3
    );
  });
  
  // ズームアウト
  document.getElementById('zoom-out')?.addEventListener('click', () => {
    svg.transition().duration(300).call(
      zoom.scaleBy, 1 / 1.3
    );
  });
  
  // リセット
  document.getElementById('reset-graph')?.addEventListener('click', () => {
    svg.transition().duration(300).call(
      zoom.transform, d3.zoomIdentity
    );
  });
  
  // 凡例表示切り替え
  document.getElementById('toggle-legend')?.addEventListener('click', function() {
    const legendElem = document.querySelector('.graph-legend') as HTMLElement;
    if (!legendElem) return;
    
    const isVisible = legendElem.style.display !== 'none';
    legendElem.style.display = isVisible ? 'none' : 'block';
    this.classList.toggle('active', !isVisible);
  });
  
  // 凡例の閉じるボタン
  document.querySelector('.legend-close')?.addEventListener('click', () => {
    const legendElem = document.querySelector('.graph-legend') as HTMLElement;
    if (legendElem) {
      legendElem.style.display = 'none';
    }
    
    const toggleLegendBtn = document.getElementById('toggle-legend');
    if (toggleLegendBtn) {
      toggleLegendBtn.classList.remove('active');
    }
  });
  
  // ラベル表示切り替え
  const toggleLabelsBtn = document.getElementById('toggle-labels');
  if (toggleLabelsBtn) {
    toggleLabelsBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      const showLabels = this.classList.contains('active');
      
      const labels = document.querySelectorAll('.node-label');
      labels.forEach(label => {
        if (label.classList.contains('current')) {
          label.style.opacity = '1';
        } else {
          label.style.opacity = showLabels ? '1' : '0';
        }
      });
    });
  }
  
  // 物理シミュレーション切り替え
  const togglePhysicsBtn = document.getElementById('toggle-physics');
  if (togglePhysicsBtn) {
    // グローバル変数として外部参照できるようにする
    (window as any).simulationRunning = true;
    
    togglePhysicsBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      (window as any).simulationRunning = this.classList.contains('active');
      
      if ((window as any).simulation) {
        if ((window as any).simulationRunning) {
          (window as any).simulation.alpha(0.3).restart();
        } else {
          (window as any).simulation.stop();
        }
      }
    });
  }
  
  // レイアウト最適化ボタン
  document.getElementById('optimize-layout')?.addEventListener('click', function() {
    const button = this;
    
    // 現在のシミュレーション設定を保存
    const wasRunning = (window as any).simulationRunning;
    
    // 最適化中表示
    button.classList.add('active');
    button.setAttribute('disabled', 'true');
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8V3"></path><path d="M21 3v5h-5"></path></svg>';
    
    if ((window as any).simulation) {
      const simulation = (window as any).simulation;
      
      // 改善: レイアウト最適化ボタンの効果を強化
      // 一時的にシミュレーションを再開し、強度を変更
      simulation
        .force('charge', d3.forceManyBody().strength(-800))  // 非常に強い反発力
        .force('link', d3.forceLink().id((d: any) => d.id).distance(150))  // リンク距離を広げる
        .force('x', d3.forceX(window.innerWidth / 2).strength(0.15))  // X方向の力を強化
        .force('y', d3.forceY(window.innerHeight / 2).strength(0.15))  // Y方向の力を強化
        .force('collision', d3.forceCollide().radius(40))  // 衝突回避を強化
        .alpha(1.0)  // アルファ値を最大に
        .restart();
      
      // 最適化アニメーション
      setTimeout(() => {
        // 中間段階
        simulation
          .force('charge', d3.forceManyBody().strength(-600))
          .force('link', d3.forceLink().id((d: any) => d.id).distance(120))
          .force('x', d3.forceX(window.innerWidth / 2).strength(0.1))
          .force('y', d3.forceY(window.innerHeight / 2).strength(0.1))
          .alpha(0.6)
          .restart();
          
        setTimeout(() => {
          // 元の設定に戻す
          simulation
            .force('charge', d3.forceManyBody().strength(-400))
            .force('link', d3.forceLink().id((d: any) => d.id).distance(120))
            .force('x', d3.forceX(window.innerWidth / 2).strength(0.05))
            .force('y', d3.forceY(window.innerHeight / 2).strength(0.05))
            .force('collision', d3.forceCollide().radius(25));
          
          if (!wasRunning) {
            simulation.stop();
          } else {
            simulation.alpha(0.3).restart();
          }
          
          button.classList.remove('active');
          button.removeAttribute('disabled');
          button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle></svg>';
        }, 1500);
      }, 1500);
    }
  });
  
  // ノード検索
  document.getElementById('node-search')?.addEventListener('input', function() {
    const searchTerm = (this as HTMLInputElement).value.toLowerCase();
    
    const graphNodes = document.querySelectorAll('.graph-node');
    const graphLinks = document.querySelectorAll('.graph-link');
    const nodeLabels = document.querySelectorAll('.node-label');
    
    if (!searchTerm) {
      // 検索がクリアされたら元の表示に戻す
      graphNodes.forEach(node => (node as HTMLElement).style.opacity = '1');
      graphLinks.forEach(link => (link as HTMLElement).style.opacity = '0.5');
      
      nodeLabels.forEach(label => {
        if (document.getElementById('toggle-labels')?.classList.contains('active')) {
          label.style.opacity = '1';
        } else {
          label.style.opacity = label.classList.contains('current') ? '1' : '0';
        }
        label.classList.remove('highlighted');
      });
      return;
    }
    
    // マッチするノードの検索は、クライアントサイドでタイトル検索をシミュレート
    // この部分は実装上限界があり、クライアントサイドでの検索となる
    const nodeTitles = Array.from(nodeLabels).map(label => 
      (label as HTMLElement).textContent?.toLowerCase() || '');
    
    const matchingIndices = nodeTitles
      .map((title, index) => title.includes(searchTerm) ? index : -1)
      .filter(index => index !== -1);
    
    // ノードとリンクの表示を調整
    graphNodes.forEach((node, index) => {
      (node as HTMLElement).style.opacity = 
        matchingIndices.includes(index) ? '1' : '0.2';
    });
    
    graphLinks.forEach(link => {
      (link as HTMLElement).style.opacity = '0.1';
    });
    
    nodeLabels.forEach((label, index) => {
      if (matchingIndices.includes(index)) {
        (label as HTMLElement).style.opacity = '1';
        label.classList.add('highlighted');
      } else {
        (label as HTMLElement).style.opacity = '0.1';
        label.classList.remove('highlighted');
      }
    });
  });
}

/**
 * 現在のノードにフォーカスする
 */
function focusOnCurrentNode(
  d3: D3Instance, 
  svg: any, 
  zoom: any, 
  graphData: GraphData, 
  currentId: number,
  width: number,
  height: number
) {
  const currentNode = graphData.nodes.find(n => n.id === currentId);
  if (currentNode) {
    setTimeout(() => {
      svg.transition().duration(800).call(
        zoom.transform, 
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.3)
          .translate(-currentNode.x, -currentNode.y)
      );
    }, 800);
  }
}

/**
 * ウィンドウサイズ変更時のハンドラー
 */
function setupResizeHandler(
  svg: any, 
  width: number, 
  height: number, 
  simulation: Simulation,
  d3: D3Instance
) {
  window.addEventListener('resize', () => {
    const graphElement = svg.node().parentElement;
    const newWidth = graphElement.clientWidth;
    const newHeight = graphElement.clientHeight;
    
    svg.attr('width', newWidth)
       .attr('height', newHeight)
       .attr('viewBox', [0, 0, newWidth, newHeight]);
    
    // 中心位置を更新
    simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
    
    // X, Y方向の力も更新
    simulation.force('x', d3.forceX(newWidth / 2).strength(0.05));
    simulation.force('y', d3.forceY(newHeight / 2).strength(0.05));
    
    simulation.alpha(0.3).restart();
    
    // ジャンプリンクの位置を更新
    updateJumpLinks();
  });
}

/**
 * ズームレベルに応じてラベルの表示を調整する関数
 */
function adjustLabels(d3: D3Instance, zoomLevel: number) {
  // ズームレベルに応じてラベルの透明度を調整
  const showLabels = document.getElementById('toggle-labels')?.classList.contains('active');
  const labels = document.querySelectorAll('.node-label');
  
  labels.forEach(label => {
    const isCurrent = label.classList.contains('current');
    
    if (zoomLevel < 0.7) {
      (label as HTMLElement).style.opacity = isCurrent ? '1' : '0';
    } else if (showLabels) {
      (label as HTMLElement).style.opacity = '1';
    } else {
      (label as HTMLElement).style.opacity = isCurrent ? '1' : '0';
    }
  });
}

/**
 * ジャンプリンクの位置を更新する関数
 */
function updateJumpLinks() {
  // 表示されているジャンプリンクを更新
  const activeNode = document.querySelector('.graph-node.active');
  if (activeNode) {
    const nodeId = activeNode.getAttribute('data-id');
    const nodePosition = activeNode.getBoundingClientRect();
    const containerPosition = activeNode.closest('.knowledge-graph-container')?.getBoundingClientRect();
    
    if (containerPosition && nodeId) {
      const jumpLink = document.getElementById(`jump-link-${nodeId}`);
      if (jumpLink) {
        // グラフ内の相対位置を計算
        const relativeLeft = nodePosition.left - containerPosition.left;
        const relativeTop = nodePosition.top - containerPosition.top;
        
        // ジャンプリンクの位置を更新
        jumpLink.style.left = `${relativeLeft}px`;
        jumpLink.style.top = `${relativeTop + nodePosition.height / 2 + 15}px`;
      }
    }
  }
}

/**
 * 選択されたノードの詳細を表示する関数
 */
export function showNodeDetails(node: GraphNode) {
  const nodeDetails = document.getElementById('node-details');
  if (!nodeDetails) return;

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 入リンク・出リンクを取得（クライアントサイドでD3データから取得）
  const allLinks = document.querySelectorAll('.graph-link');
  const allNodes = Array.from(document.querySelectorAll('.graph-node'));
  
  const incomingLinks: GraphNode[] = [];
  const outgoingLinks: GraphNode[] = [];
  
  allLinks.forEach(linkEl => {
    const sourceId = (linkEl as any).__data__.source.id;
    const targetId = (linkEl as any).__data__.target.id;
    
    if (targetId === node.id) {
      // このノードへのリンク
      const sourceNode = allNodes.find(n => (n as any).__data__.id === sourceId);
      if (sourceNode) {
        incomingLinks.push((sourceNode as any).__data__);
      }
    }
    
    if (sourceId === node.id) {
      // このノードからのリンク
      const targetNode = allNodes.find(n => (n as any).__data__.id === targetId);
      if (targetNode) {
        outgoingLinks.push((targetNode as any).__data__);
      }
    }
  });

  // HTMLを構築
  let html = `
    <h4>${node.title}</h4>
    <div class="node-meta">
      <div><span>Issue番号:</span> <span>#${node.id}</span></div>
      <div><span>作成日:</span> <span>${formatDate(node.created_at)}</span></div>
      <div><span>更新日:</span> <span>${formatDate(node.updated_at)}</span></div>
      <div><span>コメント数:</span> <span>${node.comments}</span></div>
      ${node.labels && node.labels.length ? 
        `<div><span>ラベル:</span> <span>${node.labels.join(', ')}</span></div>` : 
        ''}
      <div><span>アクション:</span> <span><a href="${node.url}" target="_blank">記事を開く</a></span></div>
    </div>
  `;

  // リンク情報
  html += `<div class="node-links">`;
  
  // 入リンク
  html += `<h5>入リンク <span>${incomingLinks.length}</span></h5>`;
  if (incomingLinks.length > 0) {
    html += `<ul class="link-list">`;
    incomingLinks.forEach(sourceNode => {
      html += `<li><a href="${sourceNode.url}" title="${sourceNode.title}">${sourceNode.title}</a></li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>このノードを参照しているページはありません</p>`;
  }

  // 出リンク
  html += `<h5>出リンク <span>${outgoingLinks.length}</span></h5>`;
  if (outgoingLinks.length > 0) {
    html += `<ul class="link-list">`;
    outgoingLinks.forEach(targetNode => {
      html += `<li><a href="${targetNode.url}" title="${targetNode.title}">${targetNode.title}</a></li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p>このノードから他のページへのリンクはありません</p>`;
  }

  html += `</div>`;

  nodeDetails.innerHTML = html;
}
