// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface IDisposable {
    dispose(): void | undefined;
}

export type TemporaryFile = { filePath: string } & IDisposable;
