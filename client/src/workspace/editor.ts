import * as vscode from 'vscode';

export async function insertTextAtCurrentPosition({text, editor=vscode.window.activeTextEditor, position="end"}:{text: string, editor: vscode.TextEditor | undefined, position?: "start" | "end"}) {
    if (!editor) {
        vscode.window.showErrorMessage("No active text editor");
        return false;
    }
    const selection = editor.selection;
    const endPosition = selection.end;

    const lastCharacter = editor.document.getText(
      new vscode.Range(endPosition.translate(0, -1), endPosition)
    );
    const textToInsert = lastCharacter === " " ? text : ` ${text}`;
    return await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.end, textToInsert);
    });
}