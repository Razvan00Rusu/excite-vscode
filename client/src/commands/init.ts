import * as vscode from 'vscode';
import { TextEncoder } from 'util';
import { isInWorkspace } from '../workspace/workspace';

import { IEEE_CSL } from '../core/styles/IEEE';
import { HARVARD_ICL } from '../core/styles/Harvard-ICL';
import type { CommandResult } from './helpers';

/**
 * Initialises directory.
 * 1. Creates 'ref.bib' file if doesn't exist already.
 * 2. Creates 'excite-config.json' file if it doesn't exist already.
 *
 * Needs to be called in an active workspace.  Will only execute on the first workspace.
 */
export default async function initialiseWorkspace(
	context: vscode.ExtensionContext
): Promise<CommandResult> {
	if (!isInWorkspace()) {
		return {
			ok: false,
			result: null,
			error: 'Trying to initialise excite when not in workspace',
		};
	}

	return await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Initialising Excite',
			cancellable: false,
		},
		async (progress, token) => {
			let workspaceFolders = vscode.workspace.workspaceFolders!;

			let firstWorkspaceFolderUri = workspaceFolders[0].uri;
			let folderPath = vscode.Uri.joinPath(firstWorkspaceFolderUri, '.excite');
			let refFilePath = vscode.Uri.joinPath(folderPath, 'ref.bib');
			const workspaceContents = await vscode.workspace.fs.readDirectory(
				firstWorkspaceFolderUri
			);
			if (
				workspaceContents.some(
					(item) => item[0] === '.excite' && item[1] === vscode.FileType.Directory
				)
			) {
				vscode.window.showErrorMessage(
					`This workspace already contains a ".excite" folder. Delete this folder if you want to reinitialise excite in this workspace.`
				);
				return {
					ok: false,
					result: null,
					error: 'Workspace already contains .excite folder',
				};
			}

			progress.report({ message: 'Creating .excite folder', increment: 20 });
			await vscode.workspace.fs.createDirectory(folderPath);
			progress.report({ message: 'Creating config file', increment: 10 });
			await vscode.workspace.fs.writeFile(
				vscode.Uri.joinPath(folderPath, 'excite-config.json'),
				new TextEncoder().encode(
					JSON.stringify({
						entry: 'main.md',
						serverIP: "http://localhost:3000"
					})
				)
			);
			vscode.workspace.fs.writeFile(refFilePath, new TextEncoder().encode(''));
			progress.report({
				message: 'Adding reference style files',
				increment: 10,
			});
			await vscode.workspace.fs.writeFile(
				vscode.Uri.joinPath(folderPath, 'styles/IEEE.csl'),
				new TextEncoder().encode(IEEE_CSL)
			);
			await vscode.workspace.fs.writeFile(
				vscode.Uri.joinPath(folderPath, 'styles/Harvard_ICL.csl'),
				new TextEncoder().encode(HARVARD_ICL)
			);

			if (workspaceContents.some(item => item[0] === "main.md" && item[1] === vscode.FileType.File)) {
				vscode.window.showErrorMessage(
					'This workspace already contains a main.md file'
				);
				return {
					ok: true,
					result: 'Workspace already contains main.md file',
					error: null,
				};
			}
			``;
			await vscode.workspace.fs.writeFile(
				vscode.Uri.joinPath(firstWorkspaceFolderUri, 'main.md'),
				new TextEncoder().encode(
					`---\ntitle: "My Document"\noutput: "pdf_document"\nbibliography: ".excite/ref.bib"\ncsl: ".excite/styles/IEEE.csl"\n---\n\n# Header\nBegin writing your text here!\n\n# References\n`
				)
			);
			return {
				ok: true,
				result: 'Initialised workspace',
				error: null,
			};
		}
	);
}
