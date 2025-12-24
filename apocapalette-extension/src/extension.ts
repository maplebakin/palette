import * as vscode from 'vscode';
import { generate, DEFAULT_CONFIG } from 'apocapalette-core';

interface ThemeSettings {
  colorCustomizations?: { [key: string]: string };
  tokenColorCustomizations?: { [key: string]: any };
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Apocapalette extension is now active!');

  let lastUsedHex = context.globalState.get<string>('apocapalette.lastUsedHex', DEFAULT_CONFIG.baseHex);
  let oldThemeSettings = context.globalState.get<ThemeSettings>('apocapalette.oldThemeSettings', {});

  let generateThemeDisposable = vscode.commands.registerCommand('apocapalette.generateTheme', async () => {
    const inputHex = await vscode.window.showInputBox({
      prompt: 'Enter a base hex color for your theme',
      value: lastUsedHex,
      validateInput: (text: string) => {
        // Simple hex validation, could be more robust
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(text) ? null : 'Please enter a valid hex color (e.g., #RRGGBB or #RGB)';
      },
    });

    if (inputHex) {
      lastUsedHex = inputHex;
      context.globalState.update('apocapalette.lastUsedHex', lastUsedHex);

      // Store current theme settings for potential revert
      const config = vscode.workspace.getConfiguration();
      oldThemeSettings = {
        colorCustomizations: config.get('workbench.colorCustomizations'),
        tokenColorCustomizations: config.get('editor.tokenColorCustomizations'),
      };
      context.globalState.update('apocapalette.oldThemeSettings', oldThemeSettings);

      try {
        const themeConfig = {
          ...DEFAULT_CONFIG,
          baseHex: inputHex,
        };
        const { vscodeTheme } = generate(themeConfig);

        const newColorCustomizations = vscodeTheme.colors;
        const newTokenColorCustomizations = {
          textMateRules: vscodeTheme.tokenColors,
        };

        await config.update('workbench.colorCustomizations', newColorCustomizations, vscode.ConfigurationTarget.Workspace);
        await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Workspace);

        vscode.window.showInformationMessage('Your editor just survived the fallout. Breathe it in.');
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate theme: ${error.message}`);
        console.error(error);
      }
    }
  });

  let revertThemeDisposable = vscode.commands.registerCommand('apocapalette.revertTheme', async () => {
    if (Object.keys(oldThemeSettings).length > 0) {
      const config = vscode.workspace.getConfiguration();
      await config.update('workbench.colorCustomizations', oldThemeSettings.colorCustomizations, vscode.ConfigurationTarget.Workspace);
      await config.update('editor.tokenColorCustomizations', oldThemeSettings.tokenColorCustomizations, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage('Reverted to pre-apocalypse theme settings.');
      // Clear stored old settings after revert
      context.globalState.update('apocapalette.oldThemeSettings', {});
    } else {
      vscode.window.showInformationMessage('No pre-apocalypse theme settings to revert to.');
    }
  });

  context.subscriptions.push(generateThemeDisposable, revertThemeDisposable);
}

export function deactivate() { }