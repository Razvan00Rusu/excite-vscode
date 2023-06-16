import * as vscode from "vscode";
import {
  recommendReferenceByGlobalContext,
  recommendReferenceByLocalContext,
} from "../services/recommend";
import { searchForReference } from "../services/search";
import axios from "axios";
import { extractCitekeyFromBibtex } from "../services/bibtex";
import { addToRefFile } from "../workspace/workspace";
import { insertTextAtCurrentPosition } from "../workspace/editor";
import { CommandResult } from './helpers';

export async function recommendCitation(context: vscode.ExtensionContext): Promise<CommandResult> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return {
      ok: false,
      result: null,
      error: "No active editor",
    };
  }

  const primarySelection = editor.selection;
  const selectedText = editor.document.getText(primarySelection);
  console.log("selectedText", selectedText);
  if (!selectedText) {
    vscode.window.showErrorMessage(
      "Highlight your local citation context to use this command."
    );
    return {
      ok: false,
      result: null,
      error: "No highlighted context",
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

  const localRecommendation = await recommendReferenceByLocalContext(
    selectedText
  );
  const globalRecommendation = await recommendReferenceByGlobalContext(
    removeExcessWhitespace
  );
  console.log(localRecommendation);
  // if (!localRecommendation) {
  //   return;
  // }

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Excite</title>
      </head>
      <body>
        <h1>Citation Recommendation</h1>
        <h3>Local Context:</h3>
        <blockquote style="text-align: center">${selectedText}</blockquote>
        <h3>Local Recommendations:</h3>
        ${
          localRecommendation?.inference[0].result
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
            ) ?? "No local recommendations"
        }
        <h3>Global Recommendations:</h3>
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
      console.log("selected", primarySelection.end, editor);
      const lastCharacter = editor.document.getText(
        new vscode.Range(
          primarySelection.end.translate(0, -1),
          primarySelection.end
        )
      );

      const findDetails = await searchForReference(message.title);
      console.log("find details", findDetails);
      if (!findDetails || !findDetails[0].doi) {
        vscode.window.showErrorMessage(
          "Could not retrieve data for this source."
        );
        return;
      }

      console.log("doi", findDetails[0].doi);

      let bib = await axios.get(findDetails[0].doi, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Accept: "application/x-bibtex; charset=utf-8",
        },
      });
      const addBib = await addToRefFile(bib.data);
      if (!addBib) {
        vscode.window.showErrorMessage("Error adding bibtex to references");
      } else {
        vscode.window.showInformationMessage("Added source to references.");
      }

      const citekey = extractCitekeyFromBibtex(bib.data);
      if (!citekey) {
        vscode.window.showErrorMessage("unable to extract citekey from bibtex");
      }
      const insertCiteKey = insertTextAtCurrentPosition({
        text: `[@${citekey}]`,
        editor: editor,
        position: "end",
      });
      if (!insertCiteKey) {
        vscode.window.showErrorMessage(
          "unable to insert citekey into active document"
        );
      }
    }
  });

  return {
    ok: true,
    result: "Inserted selected reference",
    error: null,
  };
}
