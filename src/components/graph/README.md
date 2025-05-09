# ナレッジグラフコンポーネントのリファクタリング

## 概要

ナレッジグラフコンポーネントは、GitHubのissueをグラフとして可視化するための機能です。このリファクタリングでは、元々1つの大きなファイル（KnowledgeGraph.astro）に集約されていた機能を以下のように分割し、コードの保守性と再利用性を高めました。

## ファイル構造

```
src/
├── components/
│   ├── KnowledgeGraph.astro           # 従来のエントリーポイント（互換性のため）
│   └── graph/
│       ├── KnowledgeGraph.astro       # メインコンポーネント
│       ├── GraphControls.astro        # ズームや検索などのコントロール
│       ├── GraphPanel.astro           # 詳細情報パネル
│       └── GraphLegend.astro          # グラフの凡例
├── lib/
│   └── graph/
│       ├── types.ts                   # グラフ関連の型定義
│       ├── data.ts                    # データ処理機能
│       └── render.ts                  # グラフ描画ロジック
└── styles/
    └── graph.css                      # グラフ用スタイル
```

## 改善点

1. **関心の分離**: UI、データ処理、描画ロジックなど、機能ごとにコードを分割
2. **コードの再利用性**: 型定義やデータ処理関数を独立させて再利用可能に
3. **保守性の向上**: 小さなファイルに分けることで、変更の影響範囲が明確に
4. **拡張性の向上**: 新機能の追加が容易に（例：新しい可視化タイプなど）
5. **テスト容易性**: 機能ごとに分離することでテストが書きやすく

## 主な変更

### 1. データ処理の分離

- グラフデータの生成と処理を `lib/graph/data.ts` に分離
- 双方向リンクなどの検出ロジックを整理

### 2. UI関連の分割

- コントロールパネル、情報パネル、凡例を別々のコンポーネントに分割
- 各コンポーネントが自身のスタイルとロジックを管理

### 3. 描画ロジックの整理

- D3.jsに関する処理を `lib/graph/render.ts` に集約
- SVG要素の描画、イベントハンドリングを整理

### 4. スタイル定義の分離

- すべてのスタイルを `styles/graph.css` に分離
- グローバルスタイルとコンポーネント固有スタイルを整理

## 今後の展望

このリファクタリングにより、今後以下のような機能拡張が容易になります：

- 新しいグラフ表示モードの追加
- フィルタリングやグルーピング機能の強化
- パフォーマンス最適化
- レスポンシブデザインの改善
