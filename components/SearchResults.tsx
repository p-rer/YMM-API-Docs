"use client"

import Link from "next/link"
import { X, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SearchResult } from "@/hooks/useFullTextSearch"

interface SearchResultsProps {
  results: SearchResult[]
  isSearching: boolean
  query: string
  onClose: () => void
  onBackToTree?: () => void
  className?: string
}

function highlight(text: string, query: string): React.ReactNode {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return text

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const regex = new RegExp(`(${escaped.join("|")})`, "gi")
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-accent text-accent-foreground rounded-none px-0.5">{part}</mark>
      : part,
  )
}

export function SearchResults({
                                results,
                                isSearching,
                                query,
                                onClose,
                                onBackToTree,
                                className,
                              }: SearchResultsProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-2 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          {onBackToTree && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onBackToTree}
              aria-label="ツリーに戻る"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {isSearching
                ? "検索中…"
                : results.length > 0
                  ? `${results.length} 件`
                  : query.trim()
                    ? "結果なし"
                    : ""}
          </span>
        </div>
        {!onBackToTree && (
          <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="検索結果を閉じる"
        >
          <X className="h-4 w-4"/>
        </Button>
        )}
      </div>

      {/* 結果リスト */}
      <ul className="divide-y">
        {results.map((result) => {
          const params = new URLSearchParams()
          params.set("q", query)
          params.set("fromSearch", "1")
          const href =
            query
              ? `/${result.slug}?${params.toString()}`
              : `/${result.slug}`

          return (
            <li key={result.slug}>
              <Link
                href={href}
                className="block px-4 py-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {result.section}
                </span>
                  <span className="text-sm font-medium truncate">
                  {highlight(result.title, query)}
                </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {highlight(result.excerpt, query)}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}