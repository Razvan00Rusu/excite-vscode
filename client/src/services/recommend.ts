import axios from "axios";
import { z } from "zod";

export const INFERENCES = z.object({
  inference: z.array(
    z.object({
      result: z.array(
        z.object({
          title: z.string(),
          abstract: z.string(),
          venue: z.string(),
          year: z.number(),
          author: z.string(),
          id: z.number(),
        })
      ),
    })
  ),
});

export async function recommendReferenceByLocalContext(localContext: string) {
  console.log("localContext", localContext);
  const res = await axios.get("http://localhost:3000/", {
    data: {
      inference: [
        {
          context: localContext,
        },
      ],
    },
  });
  console.log(res);
  let recommendations: z.infer<typeof INFERENCES>;
  try {
    recommendations = INFERENCES.parse(res.data);
  } catch (e) {
    console.log(e);
    return;
  }
  return recommendations;
}

export async function recommendReferenceByGlobalContext(globalContext: string) {
  // with the current model - this is how it works - at least for now. might not apply to all models
  return recommendReferenceByLocalContext(globalContext);
}

export async function recommendReferenceByHybridContext(
  localContext: string,
  globalContext: string
) {
  throw new Error("Not Implemented");
}
