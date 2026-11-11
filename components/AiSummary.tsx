"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AiSummaryProps {
  articleId: string
  className?: string
}

type Status = "idle" | "loading" | "done" | "error"

export function AiSummary({ articleId, className }: AiSummaryProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [summary, setSummary] = useState("")
  const [error, setError] = useState("")

  async function handleGenerate() {
    setStatus("loading")
    setError("")

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      })

      const data = (await res.json()) as { summary?: string; error?: string }

      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? "要約の生成に失敗しました")
      }

      setSummary(data.summary)
      setStatus("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "要約の生成に失敗しました")
      setStatus("error")
    }
  }

  return (
    <section
      aria-label="AI による要約"
      className={cn(
        "not-prose mb-8 border-y bg-accent/40 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">AI 要約</span>

        {status === "idle" && (
          <Button size="sm" variant="secondary" onClick={handleGenerate}>
            要約を生成
          </Button>
        )}

        {status === "loading" && (
          <Button size="sm" variant="secondary" disabled>
            生成中...
          </Button>
        )}

        {status === "error" && (
          <Button size="sm" variant="ghost" onClick={handleGenerate}>
            再試行
          </Button>
        )}
      </div>

      {status !== "idle" && (
        <div aria-live="polite" className="mt-3 text-sm">
          {status === "loading" && (
            <div className="space-y-2" aria-hidden="true">
              <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          )}

          {status === "done" && (
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed text-foreground">
              {summary}
            </div>
          )}

          {status === "error" && <p className="text-destructive">{error}</p>}
        </div>
      )}

      {status === "done" && (
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          この要約は生成 AI（Gemini）によって作成されています。内容が正確でない場合があります。
        </p>
      )}
    </section>
  )
}
