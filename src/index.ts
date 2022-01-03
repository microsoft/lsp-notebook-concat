// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscodeUri from 'vscode-uri';
import { NotebookConverter } from './notebookConverter';

export function createConverter(getNotebookHeader: (uri: vscodeUri.URI) => string): NotebookConverter {
    return new NotebookConverter(getNotebookHeader);
}
