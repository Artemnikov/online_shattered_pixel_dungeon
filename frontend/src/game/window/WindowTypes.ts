export const WindowLevel = {
  BASE: 500,
  SECONDARY: 600,
  DIALOG: 700,
  SYSTEM: 800,
  FLOATING: 900,
} as const;

export type WindowLevelValue = (typeof WindowLevel)[keyof typeof WindowLevel] | number;

export const WindowBackdrop = {
  DIM: 'dim',
  DARK: 'dark',
  NONE: 'none',
  CUSTOM: 'custom',
} as const;

export type WindowBackdropValue = (typeof WindowBackdrop)[keyof typeof WindowBackdrop];

export interface WindowEntry {
  id: string;
  level?: WindowLevelValue;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  backdrop?: WindowBackdropValue;
  order?: number;
}
