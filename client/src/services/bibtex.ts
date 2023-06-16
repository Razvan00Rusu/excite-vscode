import axios from "axios";

export function extractCitekeyFromBibtex (bibtex: string): string | undefined {
    const openingBracket = bibtex.indexOf("{");
    const comma = bibtex.indexOf(",");

    if (!openingBracket || !comma) {return undefined;}
    return bibtex.slice(openingBracket+1, comma);
}

export async function getBibtexFromDOI (doi: string) {
    console.log("doi input", doi);
    const res = await axios.get(doi, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accept: "application/x-bibtex; charset=utf-8",
      },
    });
    if (res.status === 200 && typeof res.data === "string") {
        return res.data;
    }
    return undefined;
}