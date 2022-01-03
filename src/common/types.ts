// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as protocol from 'vscode-languageserver-protocol';

export interface IDisposable {
    dispose(): void | undefined;
}

export type TemporaryFile = { filePath: string } & IDisposable;

// Type for refresh notebook to pass through LSP
export type RefreshNotebookEvent = {
    cells: protocol.DidOpenTextDocumentParams[];
};
