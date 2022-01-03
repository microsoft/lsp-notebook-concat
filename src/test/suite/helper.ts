/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscodeUri from 'vscode-uri';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import { IDisposable, RefreshNotebookEvent } from '../../types';
import * as uuid from 'uuid/v4';
import { NotebookConcatDocument } from '../../notebookConcatDocument';
import * as protocol from 'vscode-languageserver-protocol';
import { InteractiveInputScheme, NotebookCellScheme } from '../../common/utils';

export interface Ctor<T> {
    new (): T;
}

export function mock<T>(): Ctor<T> {
    return function () {} as any;
}

export interface ICell {
    source: string[],
    lang: string,
    kind: string,
    metadata?: any,
    uri: vscodeUri.URI,
    version: number
}

export function withTestNotebook(
    uri: vscodeUri.URI,
    cells: [
        source: string[],
        lang: string,
        kind: string,
        output: string[],
        metadata?: any
    ][],
    callback: (uri: vscodeUri.URI, cells: ICell[]) => void
) {
    const mapped = cells.map((c, i) => {
        return {
            source: c[0],
            lang: c[1],
            kind: c[2],
            uri: vscodeUri.URI.from({scheme: NotebookCellScheme, path: uri.path, fragment: `ch${i.toString().padStart(8, '0')}`}),
            version: 1
        }
    })
    callback(uri, mapped);
}

export function generateConcat(uri: vscodeUri.URI, cells: ICell[], extraCells?: ICell[]) {
    const concat = new NotebookConcatDocument(uri.toString(), () => '');
    const converter = (c: ICell) => {
        const result: protocol.DidOpenTextDocumentParams = {
            textDocument: {
                uri: c.uri.toString(),
                languageId: c.lang,
                version: 1,
                text: c.source.join('\n')
            }
        };
        return result;
    };
    cells
        .filter((c) => c.lang === 'python' || c.uri.scheme === InteractiveInputScheme)
        .forEach((c) => concat.handleOpen(converter(c)));
    if (extraCells) {
        extraCells.forEach((c) => concat.handleOpen(converter(c)));
    }
    return concat;
}

export function generateInputCell(source: string[]): ICell {
    return {
        uri: vscodeUri.URI.from({ scheme: InteractiveInputScheme, path: '1.interactive' }),
        source,
        lang: 'python',
        version: 1,
        kind: 'code'
    };
}


export const defaultNotebookTestTimeout = 60_000;

export const PYTHON_LANGUAGE = 'python';
export const MARKDOWN_LANGUAGE = 'markdown';
export const JUPYTER_LANGUAGE = 'jupyter';

export enum CellOutputMimeTypes {
    error = 'application/vnd.code.notebook.error',
    stderr = 'application/vnd.code.notebook.stderr',
    stdout = 'application/vnd.code.notebook.stdout'
}

export const EXTENSION_ROOT_DIR_FOR_TESTS = path.join(__dirname, '..', '..', '..', 'src', 'test');

export function swallowExceptions(cb: Function) {
    try {
        cb();
    } catch {
        // Ignore errors.
    }
}



export async function sleep(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function createTemporaryFile(options: {
    templateFile: string;
    dir: string;
}): Promise<{ file: string } & IDisposable> {
    const extension = path.extname(options.templateFile);
    const tempFile = tmp.tmpNameSync({ postfix: extension, dir: options.dir });
    await fs.copyFile(options.templateFile, tempFile);
    return { file: tempFile, dispose: () => swallowExceptions(() => fs.unlinkSync(tempFile)) };
}

export async function createTemporaryNotebook(
    templateFile: string,
    disposables: IDisposable[],
    kernelName: string = 'Python 3'
): Promise<string> {
    const extension = path.extname(templateFile);
    const tempFile = tmp.tmpNameSync({
        postfix: extension,
        prefix: path.basename(templateFile, '.ipynb')
    });
    if (await fs.pathExists(templateFile)) {
        const contents = JSON.parse(await fs.readFile(templateFile, { encoding: 'utf-8' }));
        if (contents.kernel) {
            contents.kernel.display_name = kernelName;
        }
        await fs.writeFile(tempFile, JSON.stringify(contents, undefined, 4));
    }

    disposables.push({ dispose: () => swallowExceptions(() => fs.unlinkSync(tempFile)) });
    return tempFile;
}


export function noop() {
    // Do nothing
}

export function traceInfo(...args: any[]) {
    if (process.env.IS_CI || process.env.FORCE_LOGGING) {
        console.log(...args);
    }
}

/**
 * Captures screenshots (png format) & dumps into root directory (on CI).
 * If there's a failure, it will be logged (errors are swallowed).
 */
export async function captureScreenShot(fileNamePrefix: string) {
    if (!process.env.IS_CI) {
        return;
    }
    const name = `${fileNamePrefix}_${uuid()}`.replace(/[\W]+/g, '_');
    const filename = path.join(EXTENSION_ROOT_DIR_FOR_TESTS, `${name}-screenshot.png`);
    try {
        const screenshot = require('screenshot-desktop');
        await screenshot({ filename });
        console.info(`Screenshot captured into ${filename}`);
    } catch (ex) {
        console.error(`Failed to capture screenshot into ${filename}`, ex);
    }
}

export function asRefreshEvent(cells: ICell[]): RefreshNotebookEvent {
    return {
        cells: cells.filter((c) => c.lang === 'python')
            .map((c) => {
                return {
                    textDocument: {
                        uri: c.uri.toString(),
                        text: c.source.join('\n'),
                        languageId: c.lang,
                        version: c.version
                    }
                };
            })
    };
}

