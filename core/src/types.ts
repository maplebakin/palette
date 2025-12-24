import { type Color } from 'culori';

export interface Harmony {
  mode:
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'rectangle'
    | 'square';
  reverse?: boolean;
}

export interface Sliders {
  h: number;
  s: number;
  l: number;
  c: number;
}

export interface Config {
  baseHex: string;
  harmony: Harmony;
  sliders: Sliders;
  light: Sliders;
  dark: Sliders;
  printMode: 'oklab' | 'rgb';
  lockContrast: boolean;
  contrastTarget: number;
}

export interface Token {
  name: string;
  path: string[];
  value: string;
  originalValue: string;
  type: string;
  figmaType: string;
  comment?: string;
  color: Color;
  displayColor: Color;
}

export interface TokenGroup {
  [key: string]: Token | TokenGroup;
}

export interface FigmaToken {
  [key: string]: {
    value: string;
    type: string;
    description?: string;
  };
}

export interface FigmaTokensFile {
  [key: string]: FigmaToken;
}

export interface VsCodeTheme {
  name: string;
  type: 'light' | 'dark';
  colors: {
    [key: string]: string;
  };
  tokenColors: {
    name?: string;
    scope: string[] | string;
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    };
  }[];
}

export interface Outputs {
  tokens: TokenGroup;
  vscodeTheme: VsCodeTheme;
  figmaTokens: FigmaTokensFile;
}
