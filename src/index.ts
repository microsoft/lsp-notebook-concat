// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscodeUri from 'vscode-uri';
import { NotebookConverterImpl, NotebookConverter } from './notebookConverter';
import { getConcatDocumentRoot } from './notebookConcatDocument';
import { isNotebookCell } from './common/utils';
import { RefreshNotebookEvent } from './types';

export { isNotebookCell, getConcatDocumentRoot, RefreshNotebookEvent, NotebookConverter };

export function createConverter(
    notebookHeaderGetter: (uri: vscodeUri.URI) => string,
    platformGetter: () => string,
    disableTypeIgnore = false
): NotebookConverter {
    return new NotebookConverterImpl(notebookHeaderGetter, platformGetter, disableTypeIgnore);
}
