import type React from "react"
import { DocsBreadcrumbs } from "@/components/DocsBreadcrumbs"
import { LastUpdated } from "@/components/LastUpdated"
import { DocContributorsList } from "@/components/DocContributorsList"
import { PrevNextNav } from "@/components/PrevNextNav"
import { AiSummary } from "@/components/AiSummary"
import { CodeCopyButtons } from "@/components/CodeCopyButtons"
import { InternalLinkPreview } from "@/components/InternalLinkPreview"
import { DocsLayoutClient } from "@/components/DocsLayoutClient"
import type { DocContributors } from "@/lib/doc-contributors"
import { cn } from "@/lib/utils"

interface TocItem {
  depth: number
  text: string
  id: string
}

interface DocsLayoutProps {
  children: React.ReactNode
  toc: TocItem[]
  title: string
  lastUpdated: Date
  contributors?: DocContributors | null
  breadcrumbs: { label: string; href: string | null }[]
  githubRepoEditUrl: string | null
  prevNext?: {
    prev?: { slug: string; title: string }
    next?: { slug: string; title: string }
  }
  articleId: string | null
  showSummary: boolean
}

export function DocsLayout({
  children,
  toc,
  title,
  lastUpdated,
  contributors,
  breadcrumbs,
  githubRepoEditUrl,
  prevNext,
  articleId,
  showSummary,
}: DocsLayoutProps) {
  const article = (
    <>
      <DocsBreadcrumbs breadcrumbs={breadcrumbs} />
      <div className="mb-8">
        <div className="flex items-center">
          <h1 className="min-w-0 flex-1 wrap-break-word text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {githubRepoEditUrl && (
            <div className="flex items-center gap-2 m-4">
              <a
                href={githubRepoEditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <span aria-hidden="true">GitHub</span>
                <span className="sr-only">Edit on GitHub</span>
              </a>
            </div>
          )}
        </div>
        <LastUpdated lastUpdated={lastUpdated} />
        <DocContributorsList contributors={contributors} />
      </div>
      {showSummary && articleId && <AiSummary articleId={articleId} />}
      <div className="prose prose-slate dark:prose-invert max-w-none wrap-break-word" data-doc-content>
        {children}
      </div>
      <PrevNextNav prevNext={prevNext} />
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <DocsLayoutClient
        title={title}
        githubRepoEditUrl={githubRepoEditUrl}
        toc={toc}
      />

      <div className="hidden lg:flex flex-1">
        <main className="flex-1 pl-64 w-full xl:pr-64">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <div className="min-h-[calc(100dvh-10rem)] relative">{article}</div>
          </div>
        </main>
      </div>

      <div className="flex-1 lg:hidden">
        <div className="container py-6">
          {article}
        </div>
      </div>

      <CodeCopyButtons />
      <InternalLinkPreview />
    </div>
  )
}
