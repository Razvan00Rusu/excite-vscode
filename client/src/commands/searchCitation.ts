import * as vscode from "vscode";
import { extractCitekeyFromBibtex, getBibtexFromDOI } from "../services/bibtex";
import { searchForReference } from "../services/search";
import { insertTextAtCurrentPosition } from "../workspace/editor";
import { addToRefFile, isInWorkspace } from "../workspace/workspace";
import { CommandResult } from './helpers';

export default async function searchCitation(context: vscode.ExtensionContext): Promise<CommandResult> {
  if (!isInWorkspace()) {
    return {
      ok: false,
      result: null,
      error: "Trying to search citation when not in workspace",
    };
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    vscode.window.showErrorMessage("No active editor");
    return {
      ok: false,
      result: null,
      error: "No active editor",
    };
  }

  const query = await vscode.window.showInputBox({
    title: "Excite citation search - OpenAlex API",
    placeHolder: "Enter your query...",
  });
  if (!query) {
    console.log("no query");
    return {
      ok: false,
      result: null,
      error: "No query",
    };
  }
  console.log("query", query);
  let doi: string | null | undefined = "";
  let res = await searchForReference(query);
  if (!res) {
    vscode.window.showErrorMessage(
      "No search results found, try again with a different query."
    );
    return {
      ok: false,
      result: null,
      error: "No search results found",
    };
  }

  const selection = await vscode.window.showQuickPick([
    ...res
      .map(
        (entry: any) =>
          `${entry["publication_year"]} - ${entry["display_name"]}`
      )
      .slice(0, 4),
    "Show more...",
  ]);
  if (selection === "Show more...") {
    console.log("Showing more...");
    const panel = vscode.window.createWebviewPanel(
      "citationSearch",
      "Citation Search",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true, // Enable JavaScript in the webview
      }
    );

    panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Excite</title>
            </head>
            <body>
                <h1>Citation Search</h1>
                <h3>Query:</h3>
                <input type="text" id="query" name="query" value="${query}"/>
                <button type="button">Search</button>
                <h3>Results:</h3>
                ${res
                  .map((entry, idx) => {
                    return `
                        <div>
                        <p class="title" onclick="submitSelection('${
                          entry["display_name"]
                        }')">
                        ${idx + 1}. ${entry["display_name"]}
                        </p>
                        <small style="white-space: nowrap;overflow-x: hidden;text-overflow: ellipsis;">
                        ${entry["authorships"].reduce(
                          (acc, currValue) =>
                            (acc += (currValue["author"]["display_name"] ?? "") + ", "),
                          "By: "
                        )}
                        </small>
                        <br/><small>
                        Published: ${entry?.["primary_location"]?.["source"]?.["display_name"] ?? ""} ${entry["publication_year"]}, Cited-by count: ${entry["cited_by_count"] ?? 0}
                        </small>
                        <br/><small><a href="${entry["doi"]}">DOI Link</a>, 

                        <a class="${
                          entry?.["open_access"]?.["is_oa"] &&
                          entry?.["open_access"]?.["oa_url"]
                            ? ""
                            : "disabled"
                        }" href="${
                      entry?.["open_access"]?.["is_oa"] &&
                      entry?.["open_access"]?.["oa_url"]
                        ? entry?.["open_access"]?.["oa_url"]
                        : ""
                    }">
                        ${
                          entry?.["open_access"]?.["is_oa"] &&
                          entry?.["open_access"]?.["oa_url"]
                            ? "Open Access Text Available"
                            : "Not open access"
                        }
                        </a>
                        </small>
                        </div>
                      `;
                  })
                  .reduce(
                    (acc: string, currValue: string) => (acc += currValue),
                    ""
                  )}
                <script>
                    const vscode = acquireVsCodeApi();

                    document.getElementById('myButton').addEventListener('click', () => {
                        vscode.postMessage({ command: 'buttonClicked' });
                    });
                    function submitSelection(title) {
                      vscode.postMessage({ command: 'selected', title: title });
                    }
                </script>
                <style>
                    .title:hover {
                      text-decoration: underline;
                      cursor: pointer;
                    }
                    a.disabled {
                      pointer-events: none;
                      cursor: default;
                      text-decoration: none;
                      color: inherit;
                    }
                </style>
            </body>
            </html>
        `;

    panel.webview.onDidReceiveMessage(async (message) => {
      console.log(message);
      if (message.command === "buttonClicked") {
        vscode.window.showInformationMessage("Button clicked!");
      }
      if (message.command === "newSearch") {
        
      }
      if (message.command === "selected") {
        console.log(message.title);
        if (!res) {
          return;
        }
        let entryDOI = res.find(
          (el: any) => el["display_name"] === message.title
        )!["doi"];

        if (!entryDOI) {
          return;
        }

       const bib = await getBibtexFromDOI(entryDOI);
       if (!bib) {
         return;
       }
       const citekey = extractCitekeyFromBibtex(bib);
       const addRef = await addToRefFile(bib);
       const addCitation = await insertTextAtCurrentPosition({
         text: `[@${citekey}]`,
         editor: activeEditor,
       });
        panel.dispose();
      }
    });
  }
  let name = selection?.slice(selection.indexOf("-") + 2);
  let entry = res.find((el: any) => el["display_name"] === name);
  doi = entry?.["doi"];

  if (!doi) {
    vscode.window.showErrorMessage("Unable to find DOI for this source");
    return {
      ok: false,
      result: null,
      error: "Unable to find DOI for this source",
    };
  }

  const bib = await getBibtexFromDOI(doi);
  if (!bib) {return {
    ok: false,
    result: null,
    error: "Unable to retrieve BibTeX for this source",
  };}
  const citekey = extractCitekeyFromBibtex(bib);
  const addRef = await addToRefFile(bib);
  const addCitation = await insertTextAtCurrentPosition({text:`[@${citekey}]`, editor: activeEditor});
  
  console.log(`bib: ${bib}, citekey: ${citekey}`);

  if (!addRef || !addCitation) {
    vscode.window.showErrorMessage("Error adding reference to Ref file");
    return {
      ok: false,
      result: null,
      error: "Error adding reference to Ref file",
    };
  }
  return {
    ok: true,
    result: "Citation search complete",
    error: null,
  };
}
