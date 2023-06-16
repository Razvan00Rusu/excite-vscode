import * as vscode from 'vscode';
import axios from 'axios';
import { languages, Hover } from 'vscode';

import initialiseWorkspace from './commands/init';
import insertKnownReference from './commands/insertCitation';
import { buildProject } from './commands/build';
import searchCitation from './commands/searchCitation';
import { recommendCitation } from './commands/citationRecommendation';
import { autoRecommendation } from './commands/autoRecommendation';
import { recommendSource } from './commands/sourceRecommendation';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
} from 'vscode-languageclient/node';

import { workspace, ExtensionContext } from 'vscode';
import * as path from 'path';
import { runCommand, runCommandInTerminal } from './workspace/terminal';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
	console.log('server module', serverModule);
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: {
				execArgv: ['--nolazy', '--inspect=6009'],
			},
		},
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'markdown' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
		},
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	vscode.workspace.onDidSaveTextDocument(async (event) => {
		console.log('save');
		console.log(event.fileName);
		if (event.fileName.endsWith('.excite/ref.bib')) {
			vscode.window.showInformationMessage(
				'Change Detected to Ref.bib. Updating ref.csl.json file'
			);
			try {
				runCommand('rm', ['.excite/ref.csl.json']);
			} catch (e) {
				console.log(
					`Terminal error deleting ref.csl.json: ${e}. It is probably because the file did not exist.`
				);
			}
			console.log('rm');
			try {
				runCommand('pandoc', [
					'-f',
					'bibtex',
					'-t',
					'csljson',
					'.excite/ref.bib',
					'-o',
					'.excite/ref.csl.json',
				]);
			} catch (e) {
				console.log(
					`Terminal error generating ref.csl.json: ${e}. Make sure pandoc is installed and in $PATH`
				);
			}
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('excite-vscode.init', async () => {
			return initialiseWorkspace(context);
		}),
		vscode.commands.registerCommand('excite-vscode.searchCitation', async () => {
			return searchCitation(context);
		}),
		vscode.commands.registerCommand('excite-vscode.insertKnownReference', async () => {
			return insertKnownReference(context);
		}),
		vscode.commands.registerCommand('excite-vscode.recommendCitation', async () => {
			return recommendCitation(context);
		}),
		vscode.commands.registerCommand('excite-vscode.recommendSource', async () => {
			return recommendSource(context);
		}),
		vscode.commands.registerCommand('excite-vscode.autoRecommendation', async () => {
			return autoRecommendation(context);
		}),
		vscode.commands.registerCommand('excite-vscode.build', async () => {
			return buildProject(context);
		})
	);

	console.log('Excite Activated');
}

export function deactivate() {}
