import { useState, useEffect, useRef, useCallback } from "react";
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

const EXCERPT_CONTEXT = 40;
const EXCERPT_LENGTH = 120;
const DEBOUNCE_DELAY = 300; // ms

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

  if (idx === -1) return body.slice(0, EXCERPT_LENGTH) + "…";

  const start = Math.max(0, idx - EXCERPT_CONTEXT);
  const end = Math.min(body.length, idx + EXCERPT_LENGTH);

  return (
    (start > 0 ? "…" : "") +
    body.slice(start, end) +
    (end < body.length ? "…" : "")
  );
}

// bodies はフォーカス時に先読みし、検索前に揃えておく
let bodiesLoadPromise: Promise<void> | null = null;
let bodiesData: Record<string, string> | null = null;

export function prefetchBodies(): void {
  if (bodiesData || bodiesLoadPromise) return;
  bodiesLoadPromise = fetch("/search-bodies.json")
    .then((r) => r.json())
    .then((data) => { bodiesData = data; })
    .catch(() => {});
}

export function useFullTextSearch(query: string): {
  results: SearchResult[];
  isIndexLoading: boolean;
  isSearching: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isIndexLoading, setIsIndexLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const indexRef = useRef<Document<any, any> | null>(null);
  const bodyMapRef = useRef<Map<string, string>>(new Map());
  const indexedRef = useRef(false);
  const indexPromiseRef = useRef<Promise<void> | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const ensureIndex = useCallback(async () => {
    if (indexedRef.current) return;
    if (indexPromiseRef.current) return indexPromiseRef.current;

    indexPromiseRef.current = (async () => {
      setIsIndexLoading(true);
      setResults([]);

      try {
        const [FlexSearchModule, manifestRes, metaRes] = await Promise.all([
          import("flexsearch"),
          fetch("/search-index/manifest.json"),
          fetch("/search-meta.json"),
        ]);

        if (!manifestRes.ok) throw new Error(`manifest: HTTP ${manifestRes.status}`);
        if (!metaRes.ok) throw new Error(`meta: HTTP ${metaRes.status}`);

        const shardKeys: string[] = await manifestRes.json();
        const metaList: { id: number; slug: string; title: string; section: string }[] =
          await metaRes.json();

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

        // シャードを並列フェッチして import
        await Promise.all(
          shardKeys.map(async (safeName) => {
            const res = await fetch(`/search-index/${safeName}.json`);
            const data = await res.json();
            if (data !== null) {
              index.import(safeName.replace(/_/g, "."), data);
            }
          }),
        );

        // bodyMapRef に bodies を充填
        // prefetchBodies() が完了していればそれを使い、未完了なら待つ
        if (!bodiesData) {
          prefetchBodies();
          await bodiesLoadPromise;
        }
        if (bodiesData) {
          for (const { slug } of metaList) {
            const body = bodiesData[slug];
            if (body) bodyMapRef.current.set(slug, body);
          }
        }

        indexRef.current = index;
        indexedRef.current = true;
      } catch (e) {
        indexPromiseRef.current = null;
        console.error("Failed to load search index:", e);
        throw e;
      } finally {
        setIsIndexLoading(false);
      }
    })();

    return indexPromiseRef.current;
  }, []);

  // --- 以下は元のコードと完全に同一 ---

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        await ensureIndex();

        if (!indexRef.current) return;

        const terms = searchQuery
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        const minimumMatches = Math.max(
          1,
          Math.ceil(terms.length / 2),
        );

        const raw = indexRef.current.search(searchQuery, {
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
          if (!result) return;

          for (const { doc } of result.result) {
            if (seen.has(doc.slug)) continue;
            seen.add(doc.slug);

            const body = bodyMapRef.current.get(doc.slug) ?? "";
            const text = `${doc.title}\n${body}`.toLowerCase();
            const matched = terms.filter((t) => text.includes(t)).length;

            if (matched < minimumMatches) continue;

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

        setResults(
          merged.map(({ score, order, ...result }) => result),
        );
      } catch (e) {
        console.error("Search error:", e);
      }
    },
    [ensureIndex],
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await performSearch(trimmed);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, performSearch]);

  return {
    results,
    isIndexLoading,
    isSearching,
  };
}