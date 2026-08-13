import { useState, useEffect, useRef, useCallback } from "react";

export interface SearchResult {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
}

const DEBOUNCE_DELAY = 300;

interface SearchResponse {
  results: SearchResult[];
}

export function useFullTextSearch(query: string): {
  results: SearchResult[];
  isSearching: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef<number | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data =
          (await response.json()) as SearchResponse;

        setResults(data.results);
      } catch (e) {
        console.error("Search error:", e);
        setResults([]);
      }
    },
    [],
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
    isSearching,
  };
}