/**
 * config.ts
 * All application-wide constants. No logic. No imports. No side effects.
 */

export const CONFIG = {
  STORAGE_KEY: 'openreview_data',
  UNDO_DURATION_MS: 8000,
  DECISION_STATES: ['include', 'exclude', 'maybe', 'unscreened'] as const,
  APP_VERSION: '1.0.0',
  MIN_YEAR: 1000,
  MAX_YEAR: 2100,
} as const;
