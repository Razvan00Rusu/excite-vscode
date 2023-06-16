import * as vscode from "vscode";
import { spawnSync, execSync, exec } from 'child_process';
import { isInWorkspace } from './workspace';

export async function runCommandInTerminal(
  command: string,
  shellPath?: string,
  name?: string,
  location?: vscode.TerminalLocation
): Promise<boolean> {
  console.log("yo1");
  const terminal = vscode.window.createTerminal({
    shellPath,
    name,
    location: location ? location : vscode.TerminalLocation.Panel,
  });
  terminal.sendText(command, false);
  terminal.sendText("; exit");
  const state = terminal.dispose();
  const state2 = terminal.state;
  while (!terminal.exitStatus) { 
    console.log('yo3', terminal.state, terminal.exitStatus);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('yo2', terminal.state, terminal.exitStatus);
  return true;
}

export function runCommand(command: string, args: string[] = []) {
  if (!isInWorkspace) {
    throw new Error('Not in workspace');
  }
	let wf = vscode.workspace.workspaceFolders![0].uri.path;
	const child = spawnSync(command, args, { shell: true, encoding: 'utf-8', cwd: wf });

	if (child.error) {
		throw child.error;
	}

	if (child.status === 0) {
		return;
	} else {
		throw new Error(`Child process exited with code ${child.status}`);
	}
}
