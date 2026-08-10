"use client"

import { useState } from "react"
import { Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"

interface AiSearchResult {
  slug: string
  title: string
  excerpt: string
  section: string
}

interface AiSearchResponse {
  results: AiSearchResult[]
  explanation: string
}

type Status = "idle" | "loading" | "done" | "error"

export function AiSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [results, setResults] = useState<AiSearchResult[]>([])
  const [explanation, setExplanation] = useState("")
  const [error, setError] = useState("")

  async function handleSearch() {
    if (!query.trim()) return

    setStatus("loading")
    setError("")

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      const data = (await res.json()) as AiSearchResponse | { error: string }

      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "AI検索に失敗しました")
      }

      setResults(data.results)
      setExplanation(data.explanation)
      setStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI検索に失敗しました")
      setStatus("error")
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setQuery("")
      setStatus("idle")
      setResults([])
      setExplanation("")
      setError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="AI検索"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI検索
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2">
          <Input
            placeholder="何について知りたいですか？"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch()
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={status === "loading"}>
            {status === "loading" ? "検索中..." : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {status === "idle" && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>AIがドキュメントを検索します</p>
              <p className="text-sm mt-2">キーワードを入力して検索を開始してください</p>
            </div>
          )}

          {status === "loading" && (
            <div className="space-y-4 py-8">
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-4">
              {explanation && (
                <div className="bg-accent/40 border px-4 py-3">
                  <p className="text-sm">{explanation}</p>
                </div>
              )}

              {results.length > 0 ? (
                <ul className="space-y-2">
                  {results.map((result) => (
                    <li key={result.slug}>
                      <Link
                        href={`/${result.slug}`}
                        onClick={() => setOpen(false)}
                        className="block p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {result.section}
                          </span>
                          <span className="text-sm font-medium">{result.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.excerpt}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>関連するドキュメントが見つかりませんでした</p>
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setStatus("idle")
                  setError("")
                }}
              >
                再試行
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
