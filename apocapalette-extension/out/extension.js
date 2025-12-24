"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var import_apocapalette_core = require("apocapalette-core");
function activate(context) {
  console.log("Apocapalette extension is now active!");
  let lastUsedHex = context.globalState.get("apocapalette.lastUsedHex", import_apocapalette_core.DEFAULT_CONFIG.baseHex);
  let oldThemeSettings = context.globalState.get("apocapalette.oldThemeSettings", {});
  let generateThemeDisposable = vscode.commands.registerCommand("apocapalette.generateTheme", async () => {
    const inputHex = await vscode.window.showInputBox({
      prompt: "Enter a base hex color for your theme",
      value: lastUsedHex,
      validateInput: (text) => {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(text) ? null : "Please enter a valid hex color (e.g., #RRGGBB or #RGB)";
      }
    });
    if (inputHex) {
      lastUsedHex = inputHex;
      context.globalState.update("apocapalette.lastUsedHex", lastUsedHex);
      const config = vscode.workspace.getConfiguration();
      oldThemeSettings = {
        colorCustomizations: config.get("workbench.colorCustomizations"),
        tokenColorCustomizations: config.get("editor.tokenColorCustomizations")
      };
      context.globalState.update("apocapalette.oldThemeSettings", oldThemeSettings);
      try {
        const themeConfig = {
          ...import_apocapalette_core.DEFAULT_CONFIG,
          baseHex: inputHex
        };
        const { vscodeTheme } = (0, import_apocapalette_core.generate)(themeConfig);
        const newColorCustomizations = vscodeTheme.colors;
        const newTokenColorCustomizations = {
          textMateRules: vscodeTheme.tokenColors
        };
        await config.update("workbench.colorCustomizations", newColorCustomizations, vscode.ConfigurationTarget.Workspace);
        await config.update("editor.tokenColorCustomizations", newTokenColorCustomizations, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage("Your editor just survived the fallout. Breathe it in.");
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate theme: ${error.message}`);
        console.error(error);
      }
    }
  });
  let revertThemeDisposable = vscode.commands.registerCommand("apocapalette.revertTheme", async () => {
    if (Object.keys(oldThemeSettings).length > 0) {
      const config = vscode.workspace.getConfiguration();
      await config.update("workbench.colorCustomizations", oldThemeSettings.colorCustomizations, vscode.ConfigurationTarget.Workspace);
      await config.update("editor.tokenColorCustomizations", oldThemeSettings.tokenColorCustomizations, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage("Reverted to pre-apocalypse theme settings.");
      context.globalState.update("apocapalette.oldThemeSettings", {});
    } else {
      vscode.window.showInformationMessage("No pre-apocalypse theme settings to revert to.");
    }
  });
  context.subscriptions.push(generateThemeDisposable, revertThemeDisposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
