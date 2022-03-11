/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as protocol from 'vscode-languageserver-protocol';
import { asRefreshEvent, generateConcat, generateInputCell, ICell, withTestNotebook } from './helper';
import { InteractiveScheme } from '../../common/utils';
import { NotebookConcatDocument } from '../../notebookConcatDocument';
import { createLocation, createPosition, createRange } from '../../helper';
import * as vscodeUri from 'vscode-uri';

const HeaderText = 'import IPython\nIPython.get_ipython()';

suite('concatTextDocument', () => {

    function applyEdit(
        concat: NotebookConcatDocument,
        cell: ICell,
        line: number,
        char: number,
        newText: string,
        endLine: number = line,
        endChar: number = char
    ) {
        const change: protocol.DidChangeTextDocumentParams = {
            textDocument: {
                version: cell.version + 1,
                uri: cell.uri.toString()
            },
            contentChanges: [
                {
                    text: newText,
                    range: {
                        start: {
                            line,
                            character: char
                        },
                        end: {
                            line: endLine,
                            character: endChar
                        }
                    }
                }
            ]
        };
        return concat.handleChange(change);
    }

    function createLocationFromPosition(cell: ICell, line: number, char: number) {
        const uri = cell.uri;
        return createLocation(uri.toString(), {
            start: { line, character: char },
            end: { line, character: char }
        });
    }

    test(`edits to a cell`, () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);

                // Try insertion
                applyEdit(concat, cells[2], 0, 0, 'bar');
                assert.strictEqual(
                    concat.getText(),
                    [HeaderText, 'print(1)', 'barfoo = 2', 'print(foo)', ''].join('\n')
                );
                // Then deletion
                applyEdit(concat, cells[2], 0, 3, '', 0, 6);
                assert.strictEqual(concat.getText(), [HeaderText, 'print(1)', 'bar = 2', 'print(foo)', ''].join('\n'));

                // Then replace
                applyEdit(concat, cells[2], 1, 6, 'bar', 1, 9);
                assert.strictEqual(concat.getText(), [HeaderText, 'print(1)', 'bar = 2', 'print(bar)', ''].join('\n'));
            }
        );
    });

    test('concat document for notebook', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                assert.strictEqual(concat.lineCount, 5);
                assert.strictEqual(concat.languageId, 'python');
                assert.strictEqual(concat.getText(), [HeaderText, 'print(1)', 'foo = 2', 'print(foo)', ''].join('\n'));
            }
        );
    });

    test('refresh (move) concat document for notebook', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                assert.strictEqual(concat.getText(), [HeaderText, 'print(1)', 'foo = 2', 'print(foo)', ''].join('\n'));
                const firstCell = cells[0];
                const lastCell = cells[2];
                cells.splice(0, 1, lastCell);
                cells.splice(2, 1, firstCell);
                concat.handleRefresh(asRefreshEvent(cells));
                assert.strictEqual(concat.getText(), [HeaderText, 'foo = 2', 'print(foo)', 'print(1)', ''].join('\n'));
            }
        );
    });

    test('concat document for interactive window', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: InteractiveScheme, path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const inputDocument = generateInputCell(['print("bar")'])
                const concat = generateConcat(uri, cells, [inputDocument]);
                assert.strictEqual(concat.lineCount, 6);
                assert.strictEqual(concat.languageId, 'python');
                assert.strictEqual(
                    concat.getText(),
                    [HeaderText, 'print(1)', 'foo = 2', 'print(foo)', 'print("bar")', ''].join('\n')
                );
                assert.strictEqual(concat.lineAt(2).text, 'print(1)');
                assert.strictEqual(concat.lineAt(3).text, 'foo = 2');
                assert.strictEqual(concat.lineAt(4).text, 'print(foo)');
                assert.strictEqual(concat.lineAt(5).text, 'print("bar")');

                assert.strictEqual(
                    concat.notebookLocationAt(createPosition(2, 0)).uri.toString(),
                    cells[0].uri.toString()
                );
                assert.strictEqual(
                    concat.notebookLocationAt(createPosition(3, 0)).uri.toString(),
                    cells[2].uri.toString()
                );
                assert.strictEqual(
                    concat.notebookLocationAt(createPosition(4, 0)).uri.toString(),
                    cells[2].uri.toString()
                );
                assert.strictEqual(
                    concat.notebookLocationAt(createPosition(5, 0)).uri.toString(),
                    inputDocument.uri.toString()
                );

                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[0], 0, 0)),
                    createPosition(2, 0)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[0], 0, 3)),
                    createPosition(2, 3)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[2], 0, 0)),
                    createPosition(3, 0)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[2], 0, 3)),
                    createPosition(3, 3)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[2], 1, 0)),
                    createPosition(4, 0)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(cells[2], 1, 3)),
                    createPosition(4, 3)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(inputDocument, 0, 0)),
                    createPosition(5, 0)
                );
                assert.deepStrictEqual(
                    concat.concatPositionAt(createLocationFromPosition(inputDocument, 0, 3)),
                    createPosition(5, 3)
                );
            }
        );
    });

    test('concat document for interactive window 2', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: InteractiveScheme, path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const inputDocument = generateInputCell(
                    ['print("bar")', 'p.']
                );
                const concat = generateConcat(uri, cells, [inputDocument]);
                assert.strictEqual(concat.lineCount, 7);
                assert.strictEqual(concat.languageId, 'python');
                assert.strictEqual(
                    concat.getText(),
                    [HeaderText, 'print(1)', 'foo = 2', 'print(foo)', 'print("bar")', 'p.', ''].join('\n')
                );
                assert.strictEqual(concat.lineAt(0).text, 'import IPython');
                assert.strictEqual(concat.lineAt(2).text, 'print(1)');
                assert.strictEqual(concat.lineAt(3).text, 'foo = 2');
                assert.strictEqual(concat.lineAt(4).text, 'print(foo)');
                assert.strictEqual(concat.lineAt(5).text, 'print("bar")');
                assert.strictEqual(concat.lineAt(6).text, 'p.');

                assert.deepStrictEqual(
                    concat.notebookLocationAt(createPosition(6, 2)).range,
                    createRange(createPosition(1, 2), createPosition(1, 2))
                );
            }
        );
    });

    test('concat document for interactive window, empty history', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: InteractiveScheme, path: 'test.ipynb' }),
            [],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const inputDocument = generateInputCell(
                    ['print("bar")', 'p.']
                );
                const concat = generateConcat(uri, cells, [inputDocument]);
                assert.strictEqual(concat.lineCount, 2);
                // assert.strictEqual(concat.languageId, 'python');
                // assert.strictEqual(concat.getText(), ['print(1)', 'foo = 2', 'print(foo)', 'print("bar")', 'p.'].join('\n'));
                // assert.strictEqual(concat.lineAt(0).text, 'print(1)');
                // assert.strictEqual(concat.lineAt(1).text, 'foo = 2');
                // assert.strictEqual(concat.lineAt(2).text, 'print(foo)');
                // assert.strictEqual(concat.lineAt(3).text, 'print("bar")');
                // assert.strictEqual(concat.lineAt(4).text, 'p.');

                assert.deepStrictEqual(
                    concat.notebookLocationAt(createPosition(1, 2)).range,
                    createRange(createPosition(1, 2), createPosition(1, 2))
                );
            }
        );
    });

    test('Cell with magics/shell escape/await', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['await print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['%%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['!foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                assert.strictEqual(concat.lineCount, 9);
                assert.strictEqual(concat.languageId, 'python');
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'await print(1) # type: ignore',
                        '%foo = 2 # type: ignore',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
            }
        );
    });

    test('Cell with magics/shell escape/await with typeIgnore off', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['await print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['%%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['!foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells, undefined, /*disableTypeIgnore*/ true);
                assert.strictEqual(concat.lineCount, 9);
                assert.strictEqual(concat.languageId, 'python');
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'await print(1)',
                        '%foo = 2',
                        'print(foo)',
                        '%%foo = 2',
                        'print(foo)',
                        '!foo = 2',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
            }
        );
    });

    test('Edit a magic/shell/await', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['await print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['%%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['!foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                assert.strictEqual(concat.lineCount, 9);
                assert.strictEqual(concat.languageId, 'python');

                // Try insertion
                applyEdit(concat, cells[2], 0, 0, 'bar');
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'await print(1) # type: ignore',
                        'bar%foo = 2',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );

                // Then deletion
                const edit = applyEdit(concat, cells[0], 0, 0, '', 0, 1);
                assert.strictEqual(edit?.contentChanges[0].text, 'import IPython\nIPython.get_ipython()\nwait print(1)\n', 'Edit should be a complete replace')
                assert.strictEqual((edit.contentChanges[0] as any).range.start.line, 0)
                assert.strictEqual((edit.contentChanges[0] as any).range.end.line, 3)
                assert.strictEqual((edit.contentChanges[0] as any).range.end.character, 0)
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'wait print(1)',
                        'bar%foo = 2',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
                // Undo deletion
                applyEdit(concat, cells[0], 0, 0, 'a');
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'await print(1) # type: ignore',
                        'bar%foo = 2',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
                // Insertion after
                applyEdit(concat, cells[0], 0, 14, '\n');
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'await print(1) # type: ignore',
                        '',
                        'bar%foo = 2',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
                // Replace whole line
                applyEdit(concat, cells[0], 0, 0, 'dude', 0, 14);
                assert.strictEqual(
                    concat.getText(),
                    [
                        HeaderText,
                        'dude',
                        '',
                        'bar%foo = 2',
                        'print(foo)',
                        '%%foo = 2 # type: ignore',
                        'print(foo)',
                        '!foo = 2 # type: ignore',
                        'print(foo)',
                        ''
                    ].join('\n')
                );
            }
        );
    });

    test('Span testing', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['await print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}],
                [['%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['%%foo = 2', 'print(foo)'], 'python', 'code', [], {}],
                [['!foo = 2', 'print(foo)'], 'python', 'code', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                const uris = concat.getCells();
                let spans = concat.createSpans(
                    uris[0],
                    'import numpy as np\n%matplotlib widget\nimport pandas as pd\n',
                    0,
                    0
                );
                assert.strictEqual(spans.length, 4);
                assert.strictEqual(spans[0].text, 'import IPython\nIPython.get_ipython()\n');
                assert.strictEqual(spans[1].text, 'import numpy as np\n%matplotlib widget');
                assert.strictEqual(spans[1].realOffset, 0);
                assert.strictEqual(spans[2].text, ' # type: ignore');
                assert.strictEqual(spans[3].text, '\nimport pandas as pd\n');
                assert.strictEqual(spans[0].endOffset, spans[1].startOffset, 'Span offset problem 1a');
                assert.strictEqual(spans[1].endOffset, spans[2].startOffset, 'Span offset problem 2a');
                assert.strictEqual(spans[2].endOffset, spans[3].startOffset, 'Span offset problem 3a');
                spans = concat.createSpans(
                    uris[0],
                    'import numpy as np\n%matplotlib widget\nimport pandas as pd\n',
                    100,
                    100
                );
                assert.strictEqual(spans.length, 3);
                assert.strictEqual(spans[0].text, 'import numpy as np\n%matplotlib widget');
                assert.strictEqual(spans[0].realOffset, 100);
                assert.strictEqual(spans[1].text, ' # type: ignore');
                assert.strictEqual(spans[2].text, '\nimport pandas as pd\n');
                assert.strictEqual(spans[0].endOffset, spans[1].startOffset, 'Span offset problem 1b');
                assert.strictEqual(spans[1].endOffset, spans[2].startOffset, 'Span offset problem 2b');

                spans = concat.createSpans(uris[0], `%timeit\nprint(ddd)\n!dude\nddx\n\n`, 10, 0);

                assert.strictEqual(spans.length, 5);
                assert.strictEqual(spans[0].text, '%timeit');
                assert.strictEqual(spans[0].realOffset, 0);
                assert.strictEqual(spans[1].text, ' # type: ignore');
                assert.strictEqual(spans[2].text, '\nprint(ddd)\n!dude');
                assert.strictEqual(spans[3].text, ' # type: ignore');
                assert.strictEqual(spans[4].text, '\nddx\n\n');
                assert.strictEqual(spans[0].endOffset, spans[1].startOffset, 'Span offset problem 1-');
                assert.strictEqual(spans[1].endOffset, spans[2].startOffset, 'Span offset problem 2-');
                assert.strictEqual(spans[2].endOffset, spans[3].startOffset, 'Span offset problem 3-');
                assert.strictEqual(spans[3].endOffset, spans[4].startOffset, 'Span offset problem 4-');
            }
        );
    });

    test('Edits across lines', () => {
        withTestNotebook(
            vscodeUri.URI.from({ scheme: 'vscode-notebook', path: 'test.ipynb' }),
            [
                [['print(1)'], 'python', 'code', [], {}],
                [['test'], 'markdown', 'markup', [], {}]
            ],
            (uri: vscodeUri.URI, cells: ICell[]) => {
                const concat = generateConcat(uri, cells);
                assert.strictEqual(concat.lineCount, 3);
                assert.strictEqual(concat.languageId, 'python');

                // Try insertion
                const changes = applyEdit(concat, cells[0], 0, 8, '\n  ');
                assert.ok(changes, 'No changes output');
                assert.strictEqual(changes.contentChanges.length, 1, `Content changes wrong length`);
                assert.strictEqual(changes.contentChanges[0].text, '\n  ', `Content changes dont have correct text`);
                assert.strictEqual(
                    (changes.contentChanges[0] as any).range.start.line,
                    2,
                    `Invalid start line for changes`
                );
            }
        );
    });
});
