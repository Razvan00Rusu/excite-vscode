import * as vscode from 'vscode';
import { insertTextAtCurrentPosition } from '../workspace/editor';
import { runCommand, runCommandInTerminal } from '../workspace/terminal';
import { isInWorkspace } from '../workspace/workspace';
import { CommandResult } from './helpers';

export default async function insertKnownCitation(
	context: vscode.ExtensionContext
): Promise<CommandResult> {
	console.log('Inserting citation');
	if (!isInWorkspace()) {
		return {
			ok: false,
			result: null,
			error: 'Trying to insert citation when not in workspace',
		};
	}
	console.log('workspace');

	const activeEditor = vscode.window.activeTextEditor;
  console.log("activeEditor", activeEditor?.document.uri);
	if (!activeEditor) {
		vscode.window.showErrorMessage('No active editor');
		return {
			ok: false,
			result: null,
			error: 'No active editor',
		};
	}
	console.log('editor');

	const configFile = await vscode.workspace.findFiles('.excite/excite-config.json');
	if (configFile.length === 0) {
		console.error('File not found');
		return {
			ok: false,
			result: null,
			error: 'Config file not found',
		};
	}
	console.log('config file', configFile);

	let configJson = {};
	const configFileUri = configFile[0];
  console.log("pog", configFileUri);
	try {
		const data = await vscode.workspace.fs.readFile(configFileUri);
    console.log("data", data);
		configJson = await JSON.parse(data.toString());
		console.log("configJSON", configJson);
	} catch (e) {
		console.error("config err: ", e);
	}
try {
	runCommand('ls', ['-lh']);
} catch (e) {
	console.log(
		`Terminal error deleting ref.csl.json: ${e}. It is probably because the file did not exist.`
	);
}
	try {
    runCommand('rm', ['.excite/ref.csl.json']);
  } catch (e) {
		console.log(
			`Terminal error deleting ref.csl.json: ${e}. It is probably because the file did not exist.`
		);
	}
	console.log('rm', );
	try {
		runCommand('pandoc', [
			'-f',
			'bibtex',
			'-t',
			'csljson',
			'.excite/ref.bib',
			'-o',
      '.excite/ref.csl.json'
		]);
	} catch (e) {
		console.log(
			`Terminal error generating ref.csl.json: ${e}. Make sure pandoc is installed and in $PATH`
		);
		return {
			ok: false,
			result: null,
			error: `Terminal error generating ref.csl.json: ${e}. Make sure pandoc is installed and in $PATH`,
		};
	}
	console.log('pandoc');
	const bibFile = await vscode.workspace.findFiles('.excite/ref.csl.json');
	if (bibFile.length === 0) {
		console.error('File not found');
		// convertBibtexToCSLJSON(workspaceFolders[0]);
		return {
			ok: false,
			result: null,
			error: 'ref.csl.json not found',
		};
	}
  console.log("bibFile", bibFile);
	const bibFileUri = bibFile[0];
	try {
		const data = await vscode.workspace.fs.readFile(bibFileUri);
		const cslFile = await JSON.parse(data.toString());
		console.log(cslFile);
		const refs = cslFile.map((ref: any) => `${ref.id ?? ''} - ${ref.title ?? ''}`);
		vscode.window.showQuickPick(refs).then(async (selection) => {
			if (!selection) {
				return {
					ok: false,
					result: null,
					error: 'No selection',
				};
			}
			const res = await insertTextAtCurrentPosition({
				text: `[@${selection.split('-')[0].trim()}]`,
				editor: activeEditor,
			});
			if (!res) {
				vscode.window.showErrorMessage('Error adding citation into document');
				return {
					ok: false,
					result: null,
					error: 'Error adding citation into document',
				};
			}
		});
	} catch (error) {
		console.error(error);
	}

	return {
		ok: true,
		result: 'Citation insertion complete',
		error: null,
	};
}
