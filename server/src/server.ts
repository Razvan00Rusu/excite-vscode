import {
	CompletionItem,
	CompletionItemKind,
	Diagnostic,
	DiagnosticSeverity,
	DidChangeConfigurationNotification,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	TextDocuments,
	createConnection
} from 'vscode-languageserver/node';

import { readFileSync } from 'fs';
import { join } from 'path';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = true;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	console.log("server server");
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: [ '[' ]
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	console.log('validate');
	const workspaceFolders = await connection.workspace.getWorkspaceFolders();
	if (!workspaceFolders){
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
		return;
	}
		
	const currFolder = workspaceFolders[0];
	let refCSLJSON = join(currFolder.uri, '.excite/ref.csl.json');
	refCSLJSON = refCSLJSON.replace('file:', '');
	let jsonData: any[] = [];
	try {
		jsonData = JSON.parse(readFileSync(refCSLJSON).toString()) as unknown as any[];
	} catch (e) {
		console.log('validate2', e);
	}

	console.log('validate3', jsonData);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	const pattern = /\[@[A-Za-z_0-9]+_[0-9]{2,4}\]/g;
	const placeholder_pattern = /\[\?]/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
		m[0] = m[0].replace('[@', '').replace(']', '');
		console.log("citekey", m[0]);
		if (!jsonData.find((x) => x.id === m![0])) {
			console.log("not found");
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Error,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length),
			},
			message: `${m[0]} is not a valid citekey in your references.`,
			source: 'excite',
		};
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range),
					},
					message: `Make sure you have an entry in your reference file with the corresponding citekey. In this instance, the citekey '${m[0]}' was not found.`,
				},
			];
		}
		diagnostics.push(diagnostic);
		}
		
	}

	while ((m = placeholder_pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++;
			console.log('not found');
			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(m.index),
					end: textDocument.positionAt(m.index + m[0].length),
				},
				message: `${m[0]} is a placeholder citation.`,
				source: 'excite',
			};
			if (hasDiagnosticRelatedInformationCapability) {
				diagnostic.relatedInformation = [
					{
						location: {
							uri: textDocument.uri,
							range: Object.assign({}, diagnostic.range),
						},
						message: `Don't forget to replace the placeholder citekey with a real one. Use the command 'Excite: Start automatic citation' to automatically extract the context and recommend a reference`,
					},
				];
			}
			diagnostics.push(diagnostic);
	}

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	async (_textDocumentPosition: TextDocumentPositionParams): Promise<CompletionItem[]> => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		console.log("hover check");
		const workspaceFolders = await connection.workspace.getWorkspaceFolders();
		if (!workspaceFolders) return [
			{
				label: 'Save for later',
				kind: CompletionItemKind.Text,
				data: -1,
				insertText: '?',
				documentation:
					'Insert a placeholder to leave for automatic citation recommendation',
			},
	];
		const currFolder = workspaceFolders[0];
		let refCSLJSON = join(currFolder.uri, '.excite/ref.csl.json');
		refCSLJSON = refCSLJSON.replace('file:', '');
		let jsonData: any[] = [];
		try {
			jsonData = JSON.parse(readFileSync(refCSLJSON).toString()) as unknown as any[];
		} catch (e) {
			console.log('yo', e);
		}

		console.log("hover check 2", jsonData);
		

		return [{label: "Insert placeholder", kind: CompletionItemKind.Text, data: -1, insertText: "?", documentation: "Insert a placeholder to leave for automatic citation recommendation"}, ...jsonData.map((el, idx) => {
			return {
				label: el.title ?? "Untitled",
				kind: CompletionItemKind.Text,
				data: idx,
				insertText: `@${el.id}` ?? "Unknown citekey",
				documentation: `${el.title ?? "Untitled"}\n${el.author.reduce((acc: string, curr: any) => `${acc} ${curr.given[0]}. ${curr.family},`, "")}`,
			};
		})];
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
