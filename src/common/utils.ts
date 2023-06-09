// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscodeUri from 'vscode-uri';

export const NotebookScheme = 'vscode-notebook';
export const NotebookCellScheme = 'vscode-notebook-cell';
export const InteractiveInputScheme = 'vscode-interactive-input';
export const InteractiveScheme = 'vscode-interactive';
export const PYTHON_LANGUAGE = 'python';

export function isThenable<T>(v: any): v is Thenable<T> {
    return typeof v?.then === 'function';
}

export function isEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export function findLastIndex<T>(array: Array<T>, predicate: (e: T) => boolean) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
}

export function isInteractiveCell(cellUri: vscodeUri.URI): boolean {
    return (
        cellUri.fragment.includes(InteractiveScheme) ||
        cellUri.path.endsWith('.interactive') ||
        cellUri.scheme.includes(InteractiveInputScheme) ||
        cellUri.scheme.includes(InteractiveScheme)
    );
}
export function isNotebookCell(uri: vscodeUri.URI): boolean {
    return uri.scheme.includes(NotebookCellScheme) || uri.scheme.includes(InteractiveInputScheme);
}

export function splitLines(str: string): string[] {
    let lines = str.split(/\r?\n/g);
    return lines.slice(0, lines.length - 1); // Skip last empty item
}

