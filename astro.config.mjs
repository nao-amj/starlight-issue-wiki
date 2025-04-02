import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // サイトのベースURLを設定
  site: 'https://nao-amj.github.io',
  base: '/starlight-issue-wiki',
  
  // 出力ディレクトリを明示的に指定
  outDir: './dist',
  
  // 静的サイトとして出力
  output: 'static',
  
  // ビルド時の詳細設定
  build: {
    format: 'directory',
    assets: '_assets'
  }
});
