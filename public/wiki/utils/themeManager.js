/**
 * テーマ管理ユーティリティ
 * システム設定、ユーザー設定に基づいたダーク/ライトモードの切り替え機能
 * フォントサイズの管理機能を追加
 */

// テーマタイプ
const THEME_TYPES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// フォントサイズタイプ
const FONT_SIZES = {
  SMALL: 'small',  // 14px
  MEDIUM: 'medium', // 16px (default)
  LARGE: 'large',   // 18px
  X_LARGE: 'x-large' // 20px
};

// ローカルストレージキー
const THEME_STORAGE_KEY = 'wiki-theme-preference';
const FONT_SIZE_STORAGE_KEY = 'wiki-font-size-preference';

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
 * フォントサイズの保存された設定を取得
 * @returns {string} 'small', 'medium', 'large', 'x-large' のいずれか
 */
function getSavedFontSizePreference() {
  try {
    return localStorage.getItem(FONT_SIZE_STORAGE_KEY) || FONT_SIZES.MEDIUM;
  } catch (error) {
    console.error('ローカルストレージからフォントサイズ設定を取得できませんでした:', error);
    return FONT_SIZES.MEDIUM;
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
 * フォントサイズの設定を保存
 * @param {string} fontSize - 'small', 'medium', 'large', 'x-large' のいずれか
 */
function saveFontSizePreference(fontSize) {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  } catch (error) {
    console.error('フォントサイズ設定をローカルストレージに保存できませんでした:', error);
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
 * フォントサイズの値（ピクセル）を取得
 * @param {string} sizeKey - 'small', 'medium', 'large', 'x-large' のいずれか
 * @returns {number} フォントサイズのピクセル値
 */
function getFontSizeValue(sizeKey) {
  const fontSizeMap = {
    [FONT_SIZES.SMALL]: 14,
    [FONT_SIZES.MEDIUM]: 16,
    [FONT_SIZES.LARGE]: 18,
    [FONT_SIZES.X_LARGE]: 20
  };
  
  return fontSizeMap[sizeKey] || 16; // デフォルトは16px
}

/**
 * フォントサイズを設定
 * @param {string} size - 'small', 'medium', 'large', 'x-large' のいずれか
 */
function setFontSize(size) {
  if (!Object.values(FONT_SIZES).includes(size)) {
    size = FONT_SIZES.MEDIUM; // 無効な値の場合はデフォルトを使用
  }
  
  // フォントサイズ値を取得
  const fontSizeValue = getFontSizeValue(size);
  
  // ルート要素のフォントサイズを設定
  document.documentElement.style.fontSize = `${fontSizeValue}px`;
  
  // データ属性を設定（CSSからのアクセス用）
  document.documentElement.setAttribute('data-font-size', size);
  
  // 設定を保存
  saveFontSizePreference(size);
  
  // イベントを発火してフォントサイズ変更を通知
  window.dispatchEvent(new CustomEvent('font-size-changed', { 
    detail: { 
      size,
      value: fontSizeValue
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
  
  // 保存されているフォントサイズを取得して適用
  const savedFontSize = getSavedFontSizePreference();
  setFontSize(savedFontSize);
  
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
  FONT_SIZES,
  getCurrentTheme,
  getSavedThemePreference,
  getSavedFontSizePreference,
  setTheme,
  setFontSize,
  initThemeManager
};

// ページロード時に自動で初期化
document.addEventListener('DOMContentLoaded', initThemeManager);
