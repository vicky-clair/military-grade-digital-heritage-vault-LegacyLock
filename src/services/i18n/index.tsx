/**
 * ============================================================================
 * LegacyLock 国际化 (i18n) 响应式引擎与 React Provider
 * ============================================================================
 * 
 * 核心规范：
 * 1. 默认语言严格遵循用户要求：默认显示英文 (English)；
 * 2. 仅支持三种语言：'en' (English) | 'zh' (简体中文) | 'ja' (日本語)；
 * 3. 极简零外部依赖，100% 响应式更新与跨会话持久化。
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SupportedLanguage, TranslationDictionary, SUPPORTED_LANGUAGES } from './types';
import { en } from './locales/en';
import { zh } from './locales/zh';
import { ja } from './locales/ja';

const DICTIONARIES: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  zh,
  ja,
};

const STORAGE_KEY = 'legacylock_language';

/**
 * 获取初始语言：优先读取持久化配置，若无则严格默认为英文 ('en')
 */
export function getInitialLanguage(): SupportedLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'zh' || saved === 'ja') {
        return saved;
      }
    }
  } catch (_) {}
  // 用户明确要求：默认为英文界面
  return 'en';
}

interface I18nContextType {
  /** 当前启用的语言代码 */
  language: SupportedLanguage;
  /** 切换语言 */
  setLanguage: (lang: SupportedLanguage) => void;
  /** 当前完整字典 */
  dict: TranslationDictionary;
  /** 快捷键值翻译函数，如 t('nav.all') 或 t('settings.autoLock5m') */
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  dict: en,
  t: (key) => key,
});

/**
 * 递归深层路径解析工具 (如 'nav.login' -> dict.nav.login)
 */
function resolvePath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return curr;
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => getInitialLanguage());

  const setLanguage = (lang: SupportedLanguage) => {
    if (lang !== 'en' && lang !== 'zh' && lang !== 'ja') return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja' : 'en';
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('legacylock:language-changed', { detail: lang }));
      }
    } catch (_) {}
  };

  // Language is a non-sensitive presentation preference, not vault authorization.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : language === 'ja' ? 'ja' : 'en';
    }
  }, []);

  const dict = useMemo(() => {
    return DICTIONARIES[language] || en;
  }, [language]);

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const val = resolvePath(dict, keyPath);
    if (typeof val === 'string') {
      if (params) {
        let res = val;
        for (const [k, v] of Object.entries(params)) {
          res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
        return res;
      }
      return val;
    }
    // 降级使用英文原版
    const fallback = resolvePath(en, keyPath);
    if (typeof fallback === 'string') return fallback;
    return keyPath;
  };

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    dict,
    t,
  }), [language, dict]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  return useContext(I18nContext);
};

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage };
