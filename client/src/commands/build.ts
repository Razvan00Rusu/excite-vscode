import * as vscode from "vscode";
import { z } from "zod";
import { CSL_JSON } from "../types/csl-json";
import { EXCITE_CONFIG } from "../types/excite-config";
import { runCommandInTerminal } from "../workspace/terminal";
import { isInWorkspace } from "../workspace/workspace";
import { CommandResult } from './helpers';

export async function buildProject(context: vscode.ExtensionContext) : Promise<CommandResult> {
    if (!isInWorkspace()) {
      return {
        ok: false,
        result: null,
        error: "Trying to build project when not in workspace",
      };
    }
    let workspaceFolder = vscode.workspace.workspaceFolders!;
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Building Project",
        cancellable: false, 
      },
      async (progress) => {
        progress.report({message: "Creating output folder", increment: 10});
        progress.report({
          message: "Finding config file",
          increment: 10,
        });
        const configFile = await vscode.workspace.findFiles(
          ".excite/excite-config.json"
        );
        if (configFile.length === 0) {
          console.error("File not found");
          vscode.window.showErrorMessage(".excite/excite-config.json not found. Make sure this file exists and try again.");
          return;
        }

        progress.report({
          message: "Reading config file",
          increment: 10,
        });

        let configJson: z.infer<typeof EXCITE_CONFIG>;
        const configFileUri = configFile[0];
        try {
          const data = await vscode.workspace.fs.readFile(configFileUri);
          configJson = EXCITE_CONFIG.parse(await JSON.parse(data.toString()));
          console.log(configJson);
        } catch (error) {
          console.error(error);
          vscode.window.showErrorMessage("Error parsing config file. Make sure it matches the required schema.");
          return;
        }

        console.log("starting commands");
        progress.report({
          message: "Generating ref.csl.json file",
          increment: 10,
        });

        try {
          console.log("first command");
          await runCommandInTerminal("rm .excite/ref.csl.json");
          await runCommandInTerminal("rm -rf ./out");
          console.log("second command");
          await runCommandInTerminal(
            "pandoc -f bibtex -t csljson .excite/ref.bib -o .excite/ref.csl.json"
          );
        } catch (err) {
          console.log("terminal err", err);
          return;
        }

        console.log("finished commands");

        let cslFile = await vscode.workspace.findFiles(".excite/ref.csl.json");
        if (cslFile.length === 0) {
          console.error("File not found");
          return;
        }

        const cslFileUri = cslFile[0];
        let cslJson: z.infer<typeof CSL_JSON>;
        try {
          const data = await vscode.workspace.fs.readFile(cslFileUri);
          cslJson = CSL_JSON.parse(await JSON.parse(data.toString()));
          console.log("cslJson parsed", cslJson);
        } catch (error) {
          console.error(error);
          return;
        }

        progress.report({
          message: "Reading entry file...",
          increment: 10,
        });

        // let entry = await vscode.workspace.fs.readFile(
        //   vscode.Uri.joinPath(workspaceFolder[0].uri, configJson.entry)
        // ).then(res => res.toString());

        await runCommandInTerminal(
          "mkdir out/"
        );
        // await vscode.workspace.fs.writeFile(
        //   vscode.Uri.joinPath(workspaceFolder[0].uri, `out/${configJson.title}.md`),
        //   new TextEncoder().encode(entry)
        // );
        // console.log("entry", entry);

        await runCommandInTerminal(`pandoc -C ${configJson.entry} -o out/test.pdf`);
      }
    );
    return {
      ok: true,
      result: "Project built successfully",
      error: null,
    };
}