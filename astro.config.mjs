import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 静的サイトとして出力
  output: 'static',
  // 出力ディレクトリを明示的に指定
  outDir: './dist',
  // サイトのベースURLを設定
  site: 'https://nao-amj.github.io/starlight-issue-wiki/',
  // サイト情報
  build: {
    // ビルド時の詳細ログを有効化
    format: 'directory',
    assets: '_assets'
  },
});
