# Excite - VSCode Extension and LSP

This repository contains the code for the Excite extension and LSP. This project was completed as part of an MEng Final Year Project in Electronic and Information Engineering at Imperial College London titled `Context Senstive Citation`, the full paper for which can be found [here]().

Author: Razvan Rusu

Supervisor: Dr. Dan Goodman

2nd Marker: TBC

## Overview and Motivation

Managing references while producing academic work has often been a pain point for authors. Excite proposes to mitigate this burden by making it easy for authors to obtain and maintain their bibliographic information.

Excite offers serveral functions to factilitate this, with the goal of keeping authors engaged with the writing process instead of spending large amounts of time hunting down and keeping track of their citations. Additionally, by interfacing with a citation recommendation engine, it reduces the burden of paper discovery and storage.

## Functionality

The functionality of the extension is split between the client and the LSP server.

The client works in an active workspace and has the following features:
- Initialising the directory
- Searching for citations and inserting this into the bibliography
- Inserting citations already in the bibliography into the document 
- Recommending related documents based on the entire document
- Recommending citations based on a highlighted context
- Automatically going through the document, extracting contexts and recommending citations for citation placeholders.
- Building the project into a PDF, LaTeX or Microsoft Word file. 

This LSP server works on markdown files and has the following features:
- Auto-complete when a citation is about to be inserted - providing metadata to help identify documents 
- Warnings for placeholder citations left in the text
- Errors for citations where the citekey is not in the bibliography
- Bibliographic metadata on hover over a citation marker

## Dependancies

The extension requires [Pandoc](https://pandoc.org/) to convert between files. It was developed with v3.1.1. It must be installed and added to `$PATH`.

## Repository Structure
```
.
├── client // Excite client
│     └── src
│       └── extension.ts // Extension entry point
├── package.json // The extension manifest
└── server // Language Server
    └── src
        └── server.ts // Language server entry point
```

## Installation 

A VSIX of the latest release can be found in the `releases` tab. Once downloaded, this can be installed by opening VSCode, navigating to the `Extensions` tab, clicking the three dots from the top and selecting `Install from VSIX`. A reload might be required.

Context-sensitive citation features need the accompanying inference server to be running. This can be found at [this repository]().

## Usage

All commands need to be run in a workspace where `Excite` has been initialised. To do this, simply open any folder and run the `Excite: Set up directory` command as explained below. Once this has been done, other commands can be used. 

All of the commands available can be seen by opening the command pallete <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (Windows) or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> (MacOS) and entering the prefix: `Excite:`

Most commands also need to be run with an editor open so that it can insert text into it. If the editor is not open, and error message will be shown.

A network connection is also be needed for all searching and inference commands to search up document metadata.

## Development

This extension was developed with [NodeJS](https://nodejs.org/) v18.16.0 (the latest LTS version at time of development). 

The required packages for both the client and LSP can be installed by running `npm install` in the root directory.

In the `Run and Debug` tab of VS Code, there are three tasks preconfigured
1. `Launch Extension` - Compiling and running the extension client and server
> N.B. There might some some errors reported by the Typescript compiler when trying to build - these appear to be a bug with one of the included packages. Clicking 'debug anyway' will still launch the extension.
2. `Attach to Server` - Attaching to the server terminal to be able to see debug (console) statements in the `Debug Console`
3. `Run tests` - Runs all integration tests

To package the extension, simply run `npx vsce package` in the root directory.