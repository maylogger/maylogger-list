import type { FC, ReactNode } from "react";

/**
 * Ladle CSF 型別精簡版。
 * 不直接從 `@ladle/react` 匯入型別，避免套件內部 `.tsx` 被 tsc 一併檢查。
 */
export interface StoryDefault<P = Record<string, unknown>> {
  title?: string;
  args?: Partial<P>;
  meta?: Record<string, unknown>;
}

export type Story<P = Record<string, never>> = FC<P> & {
  storyName?: string;
  args?: Partial<P>;
  meta?: Record<string, unknown>;
};

export type GlobalProvider = FC<{
  children: ReactNode;
  globalState?: unknown;
  dispatch?: unknown;
  config?: unknown;
  storyMeta?: unknown;
}>;
