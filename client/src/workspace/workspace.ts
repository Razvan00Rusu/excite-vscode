import * as vscode from "vscode";
import { extractCitekeyFromBibtex } from "../services/bibtex";

/**
 * Checks whether the code is running inside a workspace by
 * checking whether workspace folders exist or not.
 * 
 * Displays an error message if not in a workspace folder.
 * 
 * @ensures vscode.workspace.workspaceFolders exits. 
 * @returns True if workspace folders exist, False if not
 */
export function isInWorkspace() {
    const inWorkspace = !!vscode.workspace.workspaceFolders;
    
    if (!inWorkspace) {
        vscode.window.showErrorMessage(`You do not have an active workspace. Please open a workspace/folder and re-run this command.`);
    }

    return inWorkspace;
}

/**
 * 
 * @param bibtex Yo
 * @returns 
 */
export async function addToRefFile(bibtex: string) {
    if (!isInWorkspace()) {
        return false;
    }
    try {
        const citekey = extractCitekeyFromBibtex(bibtex);
        if (!citekey) {
            throw new Error ("Cannot extract citekey from bibtex");
        }
        const workspaceFolders = vscode.workspace.workspaceFolders!; // cannot be undefined because of isInWorkspace() call
        const fileUri = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        ".excite/ref.bib"
        );
        const fileContents = (await vscode.workspace.fs.readFile(fileUri)).toString();
        if (fileContents.includes(citekey)) {
            throw new Error ("Ref file alredy contains this reference");
        }
        const contents = fileContents + "\n" + bibtex;
        await vscode.workspace.fs.writeFile(
          fileUri,
          Buffer.from(contents, "utf8")
        );   
        return true; 
    } catch (e) {
        console.log(e);
        vscode.window.showErrorMessage(String(e));
        return false;
    }
}
