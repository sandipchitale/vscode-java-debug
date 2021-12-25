// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";

export function registerVariableMenuCommands(context: vscode.ExtensionContext): void {
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("java.debug.settings")) {
            updateContextKeys();
        }
    });
    // Initialize the context keys
    updateContextKeys();

    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showType", (variableNode: any) => showType(variableNode)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showHex", () => updateVariableFormatter("showHex", true)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.notShowHex", () => updateVariableFormatter("showHex", false)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showQualifiedNames", () => updateVariableFormatter("showQualifiedNames", true)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.notShowQualifiedNames", () => updateVariableFormatter("showQualifiedNames", false)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showStaticVariables", () => updateVariableFormatter("showStaticVariables", true)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.notShowStaticVariables", () => updateVariableFormatter("showStaticVariables", false)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showLogicalStructure", () => updateVariableFormatter("showLogicalStructure", true)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.notShowLogicalStructure", () => updateVariableFormatter("showLogicalStructure", false)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.showToString", () => updateVariableFormatter("showToString", true)));
    context.subscriptions.push(instrumentOperationAsVsCodeCommand(
        "java.debug.variables.notShowToString", () => updateVariableFormatter("showToString", false)));
}

async function showType(variableNode: any) {
    // const variableName = variableNode.variable.name;
    let variableType = variableNode.variable.value;

    // Remove object id
    if ((/@[x0-9a-fA-F]*$/).test(variableType)) {
        variableType = variableType.replace(/@.*$/, '')
    }

    //Remove array suffix
    if ((/\[[x0-9a-fA-F]*\]$/).test(variableType)) {
        variableType = variableType.replace(/\[.*$/, '')
    }

    const variableTypeParts = variableType.split('$');

    if (variableTypeParts && variableTypeParts.length > 0) {

        if (variableTypeParts.length > 1) {
            variableType = await vscode.window.showQuickPick(variableTypeParts);
        } else {
            variableType = variableTypeParts[0];
        }

        if (variableType) {
            // Convert to Simple Type name
            variableType = variableType.replace(/^.*\./, '');

            await vscode.env.clipboard.writeText(variableType);
            await vscode.commands.executeCommand('workbench.action.showAllSymbols');
            vscode.window.showInformationMessage(`Type '${variableType}' copied to clipboard. Paste it in command palette and type enter`);
        }
    }
}

function updateVariableFormatter(key: string, value: any) {
    const debugSettingsRoot: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("java.debug.settings");
    if (vscode.debug.activeDebugSession && vscode.debug.activeDebugSession.type === "java") {
        const formatter: any = {
            showHex: debugSettingsRoot.showHex,
            showQualifiedNames: debugSettingsRoot.showQualifiedNames,
            showStaticVariables: debugSettingsRoot.showStaticVariables,
            showLogicalStructure: debugSettingsRoot.showLogicalStructure,
            showToString: debugSettingsRoot.showToString,
        };
        formatter[key] = value;
        vscode.debug.activeDebugSession.customRequest("refreshVariables", formatter);
    }

    // Update the formatter to settings.json
    const inspect = vscode.workspace.getConfiguration("java.debug").inspect("settings");
    let configurationTarget = vscode.ConfigurationTarget.Global;
    if (inspect && inspect.workspaceFolderValue !== undefined) {
        configurationTarget = vscode.ConfigurationTarget.WorkspaceFolder;
    } else if (inspect && inspect.workspaceValue !== undefined) {
        configurationTarget = vscode.ConfigurationTarget.Workspace;
    }
    debugSettingsRoot.update(key, value, configurationTarget);
}

function updateContextKeys() {
    const debugSettingsRoot: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("java.debug.settings");
    if (debugSettingsRoot) {
        vscode.commands.executeCommand("setContext", "javadebug:showHex", debugSettingsRoot.showHex ? "on" : "off");
        vscode.commands.executeCommand("setContext", "javadebug:showLogicalStructure", debugSettingsRoot.showLogicalStructure ? "on" : "off");
        vscode.commands.executeCommand("setContext", "javadebug:showQualifiedNames", debugSettingsRoot.showQualifiedNames ? "on" : "off");
        vscode.commands.executeCommand("setContext", "javadebug:showStaticVariables", debugSettingsRoot.showStaticVariables ? "on" : "off");
        vscode.commands.executeCommand("setContext", "javadebug:showToString", debugSettingsRoot.showToString ? "on" : "off");
    }
}
