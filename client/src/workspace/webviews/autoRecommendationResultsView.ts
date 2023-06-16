import {z} from "zod";
import { INFERENCES } from "../../services/recommend";

export function generateAutoRecommendationHTML (recommendations: z.infer<typeof INFERENCES> | undefined, context: string, positionIdx: number) {
    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Excite</title>
      </head>
      <body>
        <h1>Auto-Recommendation</h1>
        <h3>Context:</h3>
        <blockquote style="text-align: center">${context}</blockquote>
        <h3>Recommendations:</h3>
        ${
          recommendations?.inference[0].result
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
        <script>
                    const vscode = acquireVsCodeApi();

                    function submitSelection(title) {
                      vscode.postMessage({ command: 'selected', title: title, position: ${positionIdx} });
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
    </html>`;
}