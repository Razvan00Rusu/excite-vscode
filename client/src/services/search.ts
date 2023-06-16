/* eslint-disable @typescript-eslint/naming-convention */
import axios from "axios";
import { z } from "zod";

const OPENALEX_API_RESPONSE = z.array(
  z.object({
    authorships: z.array(
      z.object({
        author_position: z.enum(["first", "middle", "last"]),
        author: z.object({
          display_name: z.string().nullable(),
          id: z.string().nullable(),
        }),
        institutions: z.array(
          z.object({
            display_name: z.string().optional(),
            id: z.string().nullish(),
          })
        ),
      })
    ),
    primary_location: z.object({
      source: z.object({
        display_name: z.string().nullable(),
      }).nullable(),
    }),
    cited_by_count: z.number(),
    concepts: z.array(
      z.object({
        display_name: z.string().nullable(),
        id: z.string().nullable(),
        wikidata: z.string().nullable(),
      })
    ),
    created_date: z.string().nullable(),
    display_name: z.string().nullable(),
    doi: z.string().nullable(),
    open_access: z.object({
      is_oa: z.boolean().nullable(),
      any_repository_has_fulltext: z.boolean().nullable(),
      oa_url: z.string().nullable(),
    }),
    publication_date: z.string().nullable(),
    publication_year: z.number().nullable(),
    title: z.string().nullable(),
    type: z.string().nullable(),
  })
);

export async function searchForReference(query: string) {
  const res = await axios.get(
    `https://api.openalex.org/works?mailto=rar119@ic.ac.uk&search=${query}`
  );
  console.log(res);
  let items: z.infer<typeof OPENALEX_API_RESPONSE>;
  console.log("data", res.data);
  try {
    items = OPENALEX_API_RESPONSE.parse(res.data.results);
  } catch (e) {
    console.log(e);
    return;
  }
  return items;
}
