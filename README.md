# Project

This module is used to generate a 'concatenated' notebook for use in an LSP based language server. 

### Directions for building

You might want to setup an npm link for the jupyter repository

- git clone https://github.com/microsoft/vscode-jupyter.git
- git clone https://github.com/microsoft/vscode-jupyter-lsp-middleware.git
- git clone https://github.com/microsoft/lsp-notebook-concat.git
- cd lsp-notebook-concat
- npm link (sets up linking to this module)
- cd ..\vscode-jupyter-lsp-middleware
- npm link @vscode/lsp-notebook-concat (the name of the lsp-notebook-concat module in npm)
- npm link (set up linking to this module for vscode-jupyter)
- cd ..\vscode-jupyter
- npm link @vscode/jupyter-lsp-middleware (the name of the vscode-jupyter-lsp-middleware module in npm)

Then to build vscode-jupyter-lsp-middleware

- npm run download-api (updates vscode.d.ts)
- npm run webpack (which will setup stuff for using with vscode-python)

### Directions for debugging with jupyter extension

- Run the steps above for getting the npm link setup
- From with VS code, open both jupyter, lsp-middleware, and lsp-notebook-concat as three folders
- Build the 'webpack link' task for lsp-notebook-concat
- Build the 'webpack link' task for lsp-middleware
- Build the compile task for jupyter
- Set breakpoints in the dist/index.js file while debugging (it's a development webpack)
- Edit lsp code
- Rerun the 'webpack link' build every time (it doesn't watch as it runs a post build step)

### Directions for running tests

- npm run tests (builds and runs tests)

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
