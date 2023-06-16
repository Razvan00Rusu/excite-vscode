import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import { CommandResult } from '../../commands/helpers';

// suite('Excite Initialisation Suite', async () => {
// 	suiteSetup(async () => {
// 		await vscode.extensions.getExtension('excite.vscode')?.activate();
// 	});

// 	let tempDir = os.tmpdir();

// 	setup(async () => {
// 		fs.mkdirSync(`${tempDir}/excite-vscode-test`);
// 		vscode.workspace.updateWorkspaceFolders(0, 0, {
// 			uri: vscode.Uri.file(`${tempDir}/excite-vscode-test`),
// 		});
// 	});

// 	teardown(async () => {
// 		fs.rmdirSync(`${tempDir}/excite-vscode-test`, { recursive: true });
// 	});

// 	test('Excite Commands Loaded', async () => {
// 		const commands = [
// 			'excite-vscode.init',
// 			'excite-vscode.searchCitation',
// 			'excite-vscode.insertKnownReference',
// 			'excite-vscode.recommendCitation',
// 			'excite-vscode.recommendSource',
// 			'excite-vscode.autoRecommendation',
// 			'excite-vscode.build',
// 		];
// 		const registeredCommands = await vscode.commands.getCommands();

// 		let commandsPresent = true;
// 		let commandMissing = '';

// 		for (const command of commands) {
// 			if (!registeredCommands.includes(command)) {
// 				commandsPresent = false;
// 				commandMissing = command;
// 				break;
// 			}
// 		}

// 		assert.strictEqual(commandsPresent, true, `Command ${commandMissing} not found`);
// 	});

// 	test('Excite Init', async () => {
// 		const initialiseInEmptyDir = await vscode.commands.executeCommand<CommandResult>(
// 			'excite-vscode.init'
// 		);
// 		assert.deepStrictEqual(initialiseInEmptyDir, {
// 			ok: true,
// 			result: 'Initialised workspace',
// 			error: null,
// 		});

// 		const initialiseInInitialisedDir =
// 			await vscode.commands.executeCommand<CommandResult>('excite-vscode.init');
// 		assert.deepStrictEqual(initialiseInInitialisedDir, {
// 			ok: false,
// 			result: null,
// 			error: 'Workspace already contains .excite folder',
// 		});

// 		fs.rmdirSync(`${tempDir}/excite-vscode-test/.excite`, { recursive: true });
// 		const initialiseInDirWithMDFile =
// 			await vscode.commands.executeCommand<CommandResult>('excite-vscode.init');
// 		assert.deepStrictEqual(initialiseInDirWithMDFile, {
// 			ok: true,
// 			result: 'Workspace already contains main.md file',
// 			error: null,
// 		});
// 	});
// });
