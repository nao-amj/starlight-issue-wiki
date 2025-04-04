/**
 * テーマ管理ユーティリティ
 * システム設定、ユーザー設定に基づいたダーク/ライトモードの切り替え機能
 */

// テーマタイプ
const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// ローカルストレージキー
const THEME_STORAGE_KEY = 'wiki-theme-preference';

/**
 * 現在のテーマを取得
 * @returns {string} 'light' または 'dark'
 */
function getCurrentTheme() {
  const html = document.documentElement;
  return html.classList.contains('dark') ? THEME_TYPES.DARK : THEME_TYPES.LIGHT;
}

/**
 * テーマの保存された設定を取得
 * @returns {string} 'light', 'dark', 'auto'のいずれか
 */
function getSavedThemePreference() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || THEME_TYPES.AUTO;
  } catch (error) {
    console.error('ローカルストレージからテーマ設定を取得できませんでした:', error);
    return THEME_TYPES.AUTO;
  }
}

/**
 * テーマの設定を保存
 * @param {string} theme - 'light', 'dark', 'auto'のいずれか
 */
function saveThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('テーマ設定をローカルストレージに保存できませんでした:', error);
  }
}

/**
 * システム設定のダークモード判定
 * @returns {boolean} システム設定がダークモードの場合はtrue
 */
function isSystemDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * システムのテーマ設定変更を監視
 * @param {Function} callback テーマが変更されたときに呼び出されるコールバック関数
 * @returns {Function} 監視を停止するための関数
 */
function watchSystemThemeChanges(callback) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // イベントリスナーを追加
  const listener = (e) => {
    callback(e.matches ? THEME_TYPES.DARK : THEME_TYPES.LIGHT);
  };
  
  // 古いブラウザでは addEventListener がない場合がある
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
  } else {
    mediaQuery.addListener(listener);
  }
  
  // イベントリスナーを削除するための関数を返す
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', listener);
    } else {
      mediaQuery.removeListener(listener);
    }
  };
}

/**
 * テーマを設定
 * @param {string} mode - 'light', 'dark', 'auto'のいずれか
 */
function setTheme(mode) {
  const html = document.documentElement;
  
  // モードに基づいてダークモードを設定
  if (mode === THEME_TYPES.AUTO) {
    // システム設定に基づく
    const isDark = isSystemDarkMode();
    html.classList.toggle('dark', isDark);
  } else {
    // ユーザー指定のテーマ
    html.classList.toggle('dark', mode === THEME_TYPES.DARK);
  }
  
  // 設定を保存
  saveThemePreference(mode);
  
  // イベントを発火してテーマ変更を通知
  window.dispatchEvent(new CustomEvent('theme-changed', { 
    detail: { 
      mode, 
      isDark: html.classList.contains('dark')
    } 
  }));
}

/**
 * テーママネージャーの初期化
 */
function initThemeManager() {
  // 保存されているテーマ設定を取得
  const savedTheme = getSavedThemePreference();
  
  // テーマを適用
  setTheme(savedTheme);
  
  // 自動モードの場合、システム設定の変更を監視
  if (savedTheme === THEME_TYPES.AUTO) {
    watchSystemThemeChanges((newTheme) => {
      if (getSavedThemePreference() === THEME_TYPES.AUTO) {
        document.documentElement.classList.toggle('dark', newTheme === THEME_TYPES.DARK);
      }
    });
  }
}

// テーマ関連のAPIをエクスポート
export {
  THEME_TYPES,
  getCurrentTheme,
  getSavedThemePreference,
  setTheme,
  initThemeManager
};

// ページロード時に自動で初期化
document.addEventListener('DOMContentLoaded', initThemeManager);
