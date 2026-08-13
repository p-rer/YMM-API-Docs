import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Document } from "flexsearch";

export interface SearchIndexEntry {
  id: number;
  slug: string;
  title: string;
  body: string;
  section: string;
}

export interface SearchResult {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
}

interface SearchRequest {
  query: string;
}

const EXCERPT_CONTEXT = 40;
const EXCERPT_LENGTH = 120;

let indexRef: Document<any, any> | null = null;
let bodyMapRef: Map<string, string> = new Map();
let indexPromiseRef: Promise<void> | null = null;

function makeExcerpt(body: string, query: string): string {
  const lower = body.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  let idx = -1;

  for (const term of terms) {
    const found = lower.indexOf(term);

    if (found !== -1) {
      idx = found;
      break;
    }
  }

  if (idx === -1) {
    return body.slice(0, EXCERPT_LENGTH) + "…";
  }

  const start = Math.max(0, idx - EXCERPT_CONTEXT);
  const end = Math.min(body.length, idx + EXCERPT_LENGTH);

  return (
    (start > 0 ? "…" : "") +
    body.slice(start, end) +
    (end < body.length ? "…" : "")
  );
}

async function ensureIndex(): Promise<void> {
  if (indexRef) {
    return;
  }

  if (indexPromiseRef) {
    return indexPromiseRef;
  }

  indexPromiseRef = (async () => {
    try {
      const [FlexSearchModule, file] = await Promise.all([
        import("flexsearch"),
        readFile(
          path.join(process.cwd(), "public", "search-index.json"),
          "utf-8",
        ),
      ]);

      const entries: SearchIndexEntry[] = JSON.parse(file);

      const FlexSearch =
        (FlexSearchModule as any).default ?? FlexSearchModule;

      const index = new FlexSearch.Document({
        tokenize: "full",
        resolution: 9,
        cache: 100,
        document: {
          id: "id",
          index: [
            { field: "title", tokenize: "full", resolution: 9 },
            { field: "body", tokenize: "full", resolution: 3 },
          ],
          store: ["slug", "title", "section"],
        },
      });

      const bodyMap = new Map<string, string>();

      for (const entry of entries) {
        bodyMap.set(entry.slug, entry.body);
        index.add(entry);
      }

      indexRef = index;
      bodyMapRef = bodyMap;
    } catch (error) {
      indexPromiseRef = null;
      throw error;
    }
  })();

  return indexPromiseRef;
}

export async function POST(request: Request) {
  try {
    const params = (await request.json()) as SearchRequest;
    const searchQuery = params.query?.trim();

    if (!searchQuery) {
      return NextResponse.json({
        results: [],
      });
    }

    await ensureIndex();

    if (!indexRef) {
      throw new Error("Search index is not available");
    }

    const terms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const minimumMatches = Math.max(
      1,
      Math.ceil(terms.length / 2),
    );

    const raw = indexRef.search(searchQuery, {
      limit: 100,
      enrich: true,
      suggest: true,
    }) as {
      field: string;
      result: {
        id: number;
        doc: {
          slug: string;
          title: string;
          section: string;
        };
      }[];
    }[];

    const seen = new Set<string>();

    const merged: (SearchResult & {
      score: number;
      order: number;
    })[] = [];

    let order = 0;

    const append = (field: "title" | "body") => {
      const result = raw.find((x) => x.field === field);

      if (!result) {
        return;
      }

      for (const { doc } of result.result) {
        if (seen.has(doc.slug)) {
          continue;
        }

        seen.add(doc.slug);

        const body = bodyMapRef.get(doc.slug) ?? "";
        const text = `${doc.title}\n${body}`.toLowerCase();

        const matched = terms.filter((t) =>
          text.includes(t),
        ).length;

        if (matched < minimumMatches) {
          continue;
        }

        merged.push({
          slug: doc.slug,
          title: doc.title,
          section: doc.section,
          excerpt: makeExcerpt(body, searchQuery),
          score: matched,
          order: order++,
        });
      }
    };

    append("title");
    append("body");

    merged.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.order - b.order;
    });

    return NextResponse.json({
      results: merged.map(
        ({ score, order, ...result }) => result,
      ),
    });
  } catch (error) {
    console.error("Search API error:", error);

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}