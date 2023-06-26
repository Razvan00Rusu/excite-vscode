import axios from "axios";
import * as natural from "natural";
import * as vscode from "vscode";
import { extractCitekeyFromBibtex } from "../services/bibtex";
import { recommendReferenceByLocalContext } from "../services/recommend";
import { searchForReference } from "../services/search";
import { generateAutoRecommendationHTML } from "../workspace/webviews/autoRecommendationResultsView";
import { addToRefFile } from "../workspace/workspace";
import { CommandResult } from './helpers';
import { runCommand } from '../workspace/terminal';

export async function autoRecommendation(
  context: vscode.ExtensionContext
): Promise<CommandResult> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor");
    return {
      ok: false,
      result: null,
      error: "No active editor",
    };
  }

  const document = editor.document;
  const fullText = document.getText();
  const token = /\[\?\]/g;
  let occurences: vscode.Range[] = [];

  let match;
  while((match = token.exec(fullText)) !== null) {
    const startPosition = document.positionAt(match.index);
    const endPosition = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPosition, endPosition);
    occurences.push(range);
  }

  console.log(occurences);

  console.log("occurances", occurences);

  if (occurences.length < 1) {
    vscode.window.showErrorMessage("No citation markers");
    return {
      ok: false,
      result: null,
      error: "No citation markers",
    };
  }

  const panel = vscode.window.createWebviewPanel(
    "unknownCitation",
    "Unknown Reference",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true, // Enable JavaScript in the webview
    }
  );

  const removedPreamble = fullText.replace(/^---[\s\S]*?---\s*/, "");
  const tokeniser = new natural.SentenceTokenizer();
  const tokenised = tokeniser.tokenize(removedPreamble);
  console.log("Sentences: ", tokenised);

  for (let i = 0; i < occurences.length; i++) {
    let j = tokenised.findIndex(token => token.includes("[?]"));
    if (j === -1) {continue;};
    let sentence = tokenised[j];
    while (sentence.length < 50 && j > 0) {
      sentence = `${tokenised[j-1]} ${sentence}`;
      // TODO: should probably clean up this sentence string
      // remove punctuation etc... 
      j--;
    }
    const recommendations = await recommendReferenceByLocalContext(sentence);
    panel.webview.html = generateAutoRecommendationHTML(recommendations, sentence, i);
    const title = await updateWebviewPanel(panel);
    if (typeof title !== "string") {
      vscode.window.showErrorMessage("Invalid Selection");
      continue;
    }
    const findDetails = await searchForReference(title);
    console.log("find details", findDetails);
    if (!findDetails || !findDetails[0].doi) {
      vscode.window.showErrorMessage(
        "Could not retrieve data for this source."
      );
      i--;
      continue;
    }

    console.log("doi", findDetails[0].doi);

    let bib = await axios.get(findDetails[0].doi, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accept: "application/x-bibtex; charset=utf-8",
      },
    });
    const citekey = extractCitekeyFromBibtex(bib.data);
    if (!citekey) {
      vscode.window.showErrorMessage("unable to extract citekey from bibtex");
      continue;
    }
    const addBib = await addToRefFile(bib.data);
    if (!addBib) {
      vscode.window.showErrorMessage("Error adding bibtex to references");
    } else {
      vscode.window.showInformationMessage("Added source to references.");
    }
    runCommand('pandoc', [
			'-f',
			'bibtex',
			'-t',
			'csljson',
			'.excite/ref.bib',
			'-o',
			'.excite/ref.csl.json',
		]);
    const formattedCitekey = `[@${citekey}]`;
    const insertCiteKey = await editor.edit((editBuilder) => {
      editBuilder.replace(occurences[i], formattedCitekey);
    });
    occurences = occurences.map((range, idx) => {
      if (range.start.line === occurences[i].start.line && idx !== i) {
        const newStart = range.start.translate(0, formattedCitekey.length-3);
        const newEnd = range.end.translate(0, formattedCitekey.length-3);
        return new vscode.Range(newStart, newEnd);
      } else {
        return range;
      }
    });
    if (!insertCiteKey) {
      vscode.window.showErrorMessage(
        "unable to insert citekey into active document"
      );
      continue;
    }

    console.log(title, "next");
    console.log(i, j, sentence);
    // TODO: Think about whether to remove previously used [?]s
    // pro: not linking potentially unrelated sentences together
    // con: harder to implement
    tokenised.splice(j, 1);
  }
  panel.dispose();

  return {
    ok: true,
    result: "Auto-recommendation complete",
    error: null,
  };
}

async function updateWebviewPanel(panel: vscode.WebviewPanel): Promise<string> {
  return new Promise((resolve) => {
    panel.webview.onDidReceiveMessage((message) => {
      if (message.command === "selected") {
        console.log("Resovled: ", message);
        resolve(message.title);
      }
    });
  });
}
