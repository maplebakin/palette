import { type FigmaTokensFile, type Token, type TokenGroup, type VsCodeTheme } from './types';
import { converter, wcagLuminance } from 'culori';

function findTokens(tokens: TokenGroup, type: string): Token[] {

  const found: Token[] = [];

  for (const key in tokens) {

    const item = tokens[key] as Token | TokenGroup;

    if (typeof item === 'object' && item !== null) {

      // It's a real token if it has a 'value' property

      if ('type' in item && item.type === type && 'value' in item) {

        found.push(item as Token);

      } else if (!('value' in item)) { // It's a group, recurse

        found.push(...findTokens(item as TokenGroup, type));

      }

    }

  }

  return found;

}

export function buildFigmaTokens(tokens: TokenGroup): FigmaTokensFile {
  const figmaTokens: FigmaTokensFile = {};
  const colorTokens = findTokens(tokens, 'color');

  for (const token of colorTokens) {
    const path = token.path.join('.');
    if (!figmaTokens[path]) {
      figmaTokens[path] = {};
    }
    figmaTokens[path][token.name] = {
      value: token.value,
      type: token.figmaType,
      description: token.comment || '',
    };
  }
  return figmaTokens;
}

export function buildVscodeTheme(tokens: TokenGroup, name: string = 'Apocapalette Theme'): VsCodeTheme {
  const neutral = tokens.neutral as TokenGroup;
  const primary = tokens.primary as TokenGroup;
  const secondary = tokens.secondary as TokenGroup;
  const accent = tokens.accent as TokenGroup;
  const danger = tokens.danger as TokenGroup;
  const info = tokens.info as TokenGroup;
  const success = tokens.success as TokenGroup;

  const isDark = wcagLuminance((neutral['100'] as Token).color) < 0.5;

  const theme: VsCodeTheme = {
    name,
    type: isDark ? 'dark' : 'light',
    colors: {
      // Base editor colors
      'foreground': (neutral['900'] as Token).value,
      'editor.background': (neutral['100'] as Token).value,
      'editor.foreground': (neutral['800'] as Token).value,
      'editorCursor.foreground': (accent['500'] as Token).value,
      'selection.background': (primary['300'] as Token).value,
      'editorWidget.background': (neutral['200'] as Token).value,
      'activityBar.background': (neutral['50'] as Token).value,
      'activityBar.foreground': (neutral['900'] as Token).value,
      'sideBar.background': (neutral['100'] as Token).value,
      'sideBar.foreground': (neutral['800'] as Token).value,
      'sideBar.border': (neutral['300'] as Token).value,
      'list.hoverBackground': (neutral['200'] as Token).value,
      'list.activeSelectionBackground': (primary['300'] as Token).value,
      'list.inactiveSelectionBackground': (neutral['200'] as Token).value,
      'list.focusBackground': (primary['400'] as Token).value,
      'list.highlightForeground': (accent['500'] as Token).value,

      // Buttons and inputs
      'button.background': (primary['500'] as Token).value,
      'button.foreground': (neutral['50'] as Token).value,
      'input.background': (neutral['200'] as Token).value,
      'input.border': (neutral['300'] as Token).value,
      'dropdown.background': (neutral['200'] as Token).value,
      
      // Status bar
      'statusBar.background': (primary['600'] as Token).value,
      'statusBar.foreground': (neutral['50'] as Token).value,
      'statusBar.noFolderBackground': (neutral['700'] as Token).value,

      // Tabs
      'tab.activeBackground': (neutral['100'] as Token).value,
      'tab.inactiveBackground': (neutral['50'] as Token).value,
      'tab.activeForeground': (neutral['900'] as Token).value,
      'tab.inactiveForeground': (neutral['600'] as Token).value,
      'tab.border': (neutral['300'] as Token).value,

      // Errors and warnings
      'editorError.foreground': (danger['500'] as Token).value,
      'editorWarning.foreground': (info['500'] as Token).value,
    },
    tokenColors: [
        {
            "name": "Comments",
            "scope": ["comment", "punctuation.definition.comment"],
            "settings": {
                "foreground": (neutral['500'] as Token).value,
                "fontStyle": "italic"
            }
        },
        {
            "name": "Strings",
            "scope": ["string", "punctuation.definition.string"],
            "settings": {
                "foreground": (success['500'] as Token).value
            }
        },
        {
            "name": "Numbers",
            "scope": "constant.numeric",
            "settings": {
                "foreground": (accent['500'] as Token).value
            }
        },
        {
            "name": "Built-in constants",
            "scope": "constant.language",
            "settings": {
                "foreground": (accent['600'] as Token).value,
                "fontStyle": "italic"
            }
        },
        {
            "name": "User-defined constants",
            "scope": ["constant.character", "constant.other"],
            "settings": {
                "foreground": (accent['700'] as Token).value
            }
        },
        {
            "name": "Variables",
            "scope": "variable",
            "settings": {
                "foreground": (primary['600'] as Token).value,
            }
        },
        {
            "name": "Keywords",
            "scope": "keyword",
            "settings": {
                "foreground": (danger['500'] as Token).value,
                "fontStyle": "bold"
            }
        },
        {
            "name": "Storage",
            "scope": "storage",
            "settings": {
                "foreground": (danger['600'] as Token).value
            }
        },
        {
            "name": "Classes",
            "scope": ["entity.name.class", "entity.name.type", "entity.name.namespace", "entity.name.scope-resolution"],
            "settings": {
                "foreground": (secondary['600'] as Token).value,
                "fontStyle": "underline"
            }
        },
        {
            "name": "Inherited Classes",
            "scope": "entity.other.inherited-class",
            "settings": {
                "foreground": (secondary['700'] as Token).value,
                "fontStyle": "italic underline"
            }
        },
        {
            "name": "Function names",
            "scope": "entity.name.function",
            "settings": {
                "foreground": (primary['700'] as Token).value
            }
        },
        {
            "name": "Function arguments",
            "scope": "variable.parameter",
            "settings": {
                "foreground": (primary['800'] as Token).value,
                "fontStyle": "italic"
            }
        },
        {
            "name": "Tag names",
            "scope": "entity.name.tag",
            "settings": {
                "foreground": (danger['700'] as Token).value
            }
        },
        {
            "name": "Tag attributes",
            "scope": "entity.other.attribute-name",
            "settings": {
                "foreground": (accent['800'] as Token).value
            }
        },
        {
            "name": "Library function",
            "scope": "support.function",
            "settings": {
                "foreground": (info['600'] as Token).value,
                "fontStyle": "italic"
            }
        },
        {
            "name": "Library constant",
            "scope": "support.constant",
            "settings": {
                "foreground": (info['700'] as Token).value,
                "fontStyle": "italic"
            }
        },
        {
            "name": "Library class/type",
            "scope": ["support.type", "support.class"],
            "settings": {
                "foreground": (info['800'] as Token).value,
                "fontStyle": "italic"
            }
        }
    ]
  };

  return theme;
}

