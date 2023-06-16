import * as vscode from "vscode";
import {
  recommendReferenceByGlobalContext
} from "../services/recommend";
import { CommandResult } from './helpers';

export async function recommendSource(context: vscode.ExtensionContext): Promise<CommandResult> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      ok: false,
      result: null,
      error: "No active editor",
    };
  }

  const panel = vscode.window.createWebviewPanel(
    "citationRecommendation",
    "Citation Recommendation",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  const document = editor.document;
  const fullText = document.getText();
  const removedPreamble = fullText.replace(/^---[\s\S]*?---\s*/, "");
  const removeNewLines = removedPreamble.replace(/\n/g, " ");
  const removePunctuation = removeNewLines.replace(/[^\w\s]+/g, "");
  const removeExcessWhitespace = removePunctuation
    .split(" ")
    .filter((word) => word.trim() !== "")
    .join(" ");
  const globalRecommendation = await recommendReferenceByGlobalContext(
    removeExcessWhitespace
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Excite</title>
      </head>
      <body>
        <h1>Source Recommendation</h1>
        <h3>Source Recommendations:</h3>
        ${
          globalRecommendation?.inference[0].result
            .slice(0, 5)
            .map((el, idx) => {
              return `
            <div>
              <p class="recommendationTitle" onClick="submitSelection('${
                el.title
              }')">${idx + 1}. ${el.title}</p>
              <small>
              By: ${el.author}
              </small> <br/>
              <small style="white-space: nowrap;overflow-x: hidden;text-overflow: ellipsis;">
              ${el.venue} ${el.year}
              </small> <br/>
            </div>
            `;
            })
            .reduce(
              (acc: string, currValue: string) => (acc += currValue),
              ""
            ) ?? "No Global Recommendations"
        }
        <script>
                    const vscode = acquireVsCodeApi();

                    function submitSelection(title) {
                      vscode.postMessage({ command: 'selected', title: title });
                    }
                </script>
        <style>
          .recommendationTitle {
          }
          .recommendationTitle:hover {
            text-decoration: underline;
            cursor: pointer;
          }
        </style>
      </body>
    </html>
  `;

  panel.webview.onDidReceiveMessage(async (message) => {
    console.log("clicked", message);
    if (message.command === "selected") {

    //   const findDetails = await searchForReference(message.title);
    //   console.log("find details", findDetails);
    //   if (!findDetails || !findDetails[0].doi) {
    //     vscode.window.showErrorMessage(
    //       "Could not retrieve data for this source."
    //     );
    //     return;
    //   }

    //   console.log("doi", findDetails[0].doi);

    //   let bib = await axios.get(findDetails[0].doi, {
    //     headers: {
    //       // eslint-disable-next-line @typescript-eslint/naming-convention
    //       Accept: "application/x-bibtex; charset=utf-8",
    //     },
    //   });
    //   const addBib = await addToRefFile(bib.data);
    //   if (!addBib) {
    //     vscode.window.showErrorMessage("Error adding bibtex to references");
    //   } else {
    //     vscode.window.showInformationMessage("Added source to references.");
    //   }

    //   const citekey = extractCitekeyFromBibtex(bib.data);
    //   if (!citekey) {
    //     vscode.window.showErrorMessage("unable to extract citekey from bibtex");
    //   }
    //   const insertCiteKey = insertTextAtCurrentPosition({
    //     text: `[@${citekey}]`,
    //     editor: editor,
    //     position: "end",
    //   });
    //   if (!insertCiteKey) {
    //     vscode.window.showErrorMessage(
    //       "unable to insert citekey into active document"
    //     );
    //   }
    }
  });

   return {
    ok: true,
    result: "Success",
    error: null,
   };
}
