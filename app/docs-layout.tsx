"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, Menu, GithubIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

import { DocsBreadcrumbs } from "@/components/DocsBreadcrumbs"
import { LastUpdated } from "@/components/LastUpdated"
import { PrevNextNav } from "@/components/PrevNextNav"
import { SearchBox } from "@/components/SearchBox"
import { DocTree } from "@/components/DocTree"
import { SearchResults } from "@/components/SearchResults"
import { TableOfContents } from "@/components/TableOfContents"
import { CodeCopyButtons } from "@/components/CodeCopyButtons"
import { AiSummary } from "@/components/AiSummary"

import { useFilteredTree } from "@/hooks/useFilteredTree"
import { useFullTextSearch } from "@/hooks/useFullTextSearch"
import { useVisibleHeadings } from "@/hooks/useVisibleHeadings"
import { useIsTocItemActive } from "@/hooks/useIsTocItemActive"
import { useTocIndicatorStyle } from "@/hooks/useTocIndicatorStyle"
import { SITE_TITLE } from "@/lib/siteSetting"
import { cn } from "@/lib/utils"
import { shouldExecuteSummary } from "@/lib/summary"
import { HeadEllipsis } from "@/components/HeadEllipsis"
import {useIsMobile} from "@/hooks/use-mobile";

interface DocTreeNode {
  name: string
  isExtended: boolean
  title?: string
  url?: string
  isIndex?: boolean
  children?: DocTreeNode[]
}

interface TocItem {
  depth: number
  text: string
  id: string
}

interface DocsLayoutProps {
  children: React.ReactNode
  docTree: DocTreeNode[]
  toc: TocItem[]
  title: string
  lastUpdated: Date
  breadcrumbs: { label: string; href: string | null }[]
  githubRepoEditUrl: string | null
  prevNext?: {
    prev?: { slug: string; title: string }
    next?: { slug: string; title: string }
  }
  articleId: string | null
  summaryText: string | null
}

export function DocsLayout({
                             children,
                             docTree,
                             toc,
                             title,
                             lastUpdated,
                             breadcrumbs,
                             githubRepoEditUrl,
                             prevNext,
                             articleId,
                             summaryText,
                           }: DocsLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const q = searchParams.get("q") ?? ""
  const fromSearch = searchParams.get("fromSearch") === "1"
  const [searchQuery, setSearchQueryState] = useState(q)
  const [isSearchMode, setIsSearchMode] = useState(q.length > 0 && !(fromSearch && !isMobile))
  const [mobileShowResults, setMobileShowResults] = useState(q.length > 0)
  const [suppressSearchMode, setSuppressSearchMode] = useState(fromSearch)

  const [isTreeHovered, setIsTreeHovered] = useState(false)
  const tocItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const tocContainerRef = useRef<HTMLDivElement | null>(null)

  const setSearchQuery = useCallback(
    (v: string) => {
      setSearchQueryState(v)
      const hasQuery = v.trim().length > 0

      setIsSearchMode(hasQuery && !suppressSearchMode)

      const params = new URLSearchParams(searchParams.toString())
      if (v) { params.set("q", v) } else { params.delete("q") }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false, })
    },
    [pathname, router, searchParams, suppressSearchMode],
  )

  useEffect(() => {
    const hasQuery = q.trim().length > 0

    if (!hasQuery) {
      setSearchQueryState("")
      setIsSearchMode(false)
      setMobileShowResults(false)
      setSuppressSearchMode(false)
      return
    }
    if (isMobile) {
      setMobileShowResults(true)
      setIsSearchMode(false)
    } else {
      setMobileShowResults(false)
      setIsSearchMode(!suppressSearchMode)
    }
  }, [q, suppressSearchMode, isMobile])

  useEffect(() => {
    if (!fromSearch) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete("fromSearch")

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    })
  }, [])

  const handleCloseSearchPanel = useCallback(() => {
    setIsSearchMode(false)
    setMobileShowResults(false)
  }, [])

  const {results: searchResults, isIndexLoading, isSearching,} = useFullTextSearch(searchQuery)

  const filteredTree = useFilteredTree(docTree, "")

  const visibleHeadings = useVisibleHeadings(toc)
  const isTocItemActive = useIsTocItemActive(toc, visibleHeadings)
  const indicatorStyle = useTocIndicatorStyle({
    visibleHeadings,
    toc,
    tocContainerRef,
    tocItemRefs,
    isTocItemActive,
  })

  const setTocItemRef = (element: HTMLAnchorElement | null, id: string) => {
    if (element) tocItemRefs.current.set(id, element)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
        <Sheet>
          <SheetTitle className="hidden" />
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-full sm:w-full sm:max-w-xl pr-0 flex flex-col">
            <div className="flex h-14 items-center px-4 shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold">{SITE_TITLE}</span>
              </Link>
            </div>
            <div className="px-4 py-2 shrink-0">
              <SearchBox
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setMobileShowResults(true)
                  }
                }}
              />
            </div>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pb-10">
                <div className="px-4 py-2">
                  {mobileShowResults ? (
                    <SearchResults
                      results={searchResults}
                      isIndexLoading={isIndexLoading}
                      isSearching={isSearching}
                      query={searchQuery}
                      onClose={handleCloseSearchPanel}
                      onBackToTree={() => setMobileShowResults(false)}
                    />
                  ) : (
                    <DocTree nodes={filteredTree} pathname={pathname} />
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 text-left min-w-0">
          <HeadEllipsis className="font-medium" text={title} />
        </div>
        <div className="flex items-center gap-2">
          {githubRepoEditUrl && (
            <Link
              href={githubRepoEditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <GithubIcon className="h-5 w-5" />
              <span className="sr-only">Edit on GitHub</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
        <Sheet>
          <SheetTitle className="hidden" />
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Toggle table of contents</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-full sm:w-full sm:max-w-xl">
            <div className="px-4 py-2 font-medium">On This Page</div>
            <ScrollArea className="h-[calc(100dvh-8rem)] pb-10">
              <div className="px-4 py-2">
                <TableOfContents
                  toc={toc}
                  tocContainerRef={tocContainerRef}
                  tocItemRefs={tocItemRefs}
                  isTocItemActive={isTocItemActive}
                  setTocItemRef={setTocItemRef}
                  indicatorStyle={indicatorStyle}
                />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </header>

      {/* ── Desktop Layout ── */}
      <div className="hidden lg:flex">
        {/* Left Sidebar */}
        <div
          className="fixed top-0 left-0 h-dvh border-r bg-background overflow-x-auto"
          style={{
            width: isTreeHovered ? "calc(33.33vw)" : "16rem",
            maxWidth: "calc(33.33vw)",
            transition: "width 0.3s ease",
            zIndex: 30,
          }}
          onMouseEnter={() => setIsTreeHovered(true)}
          onMouseLeave={() => setIsTreeHovered(false)}
        >
          <div className="flex h-14 items-center px-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold">{SITE_TITLE}</span>
            </Link>
          </div>
          <div className="p-4">
            <SearchBox
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  setSuppressSearchMode(false)
                  setIsSearchMode(true)
                }
              }}
            />
          </div>
          <ScrollArea className="h-[calc(100dvh-8rem)]">
            <div className="px-4 py-2">
              <DocTree nodes={filteredTree} pathname={pathname} />
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-64 w-full xl:pr-64">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <div className="min-h-[calc(100dvh-10rem)] relative">
              {/* 本文 */}
              <div
                className={cn(
                  "transition-opacity duration-200",
                  isSearchMode
                    ? "fixed inset-0 -z-10 opacity-0 pointer-events-none"
                    : "opacity-100",
                )}
              >
                <DocsBreadcrumbs breadcrumbs={breadcrumbs} />
                <div className="mb-8">
                  <div className="flex items-center">
                    <h1 className="min-w-0 flex-1 wrap-break-word text-3xl font-bold tracking-tight">
                      {title}
                    </h1>
                    <div className="flex items-center gap-2 m-4">
                      {githubRepoEditUrl && (
                        <Link
                          href={githubRepoEditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <GithubIcon className="h-5 w-5" />
                          <span className="sr-only">Edit on GitHub</span>
                        </Link>
                      )}
                    </div>
                  </div>
                  <LastUpdated lastUpdated={lastUpdated} />
                </div>
                {summaryText && shouldExecuteSummary(summaryText) && articleId && (
                  <AiSummary articleId={articleId} />
                )}
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {children}
                </div>
                <CodeCopyButtons />
                <PrevNextNav prevNext={prevNext} />
              </div>

              {/* 検索結果 */}
              <div
                className={cn(
                  "transition-opacity duration-200",
                  isSearchMode
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none select-none h-0 overflow-hidden",
                )}
              >
                <SearchResults
                  results={searchResults}
                  isIndexLoading={isIndexLoading}
                  isSearching={isSearching}
                  query={searchQuery}
                  onClose={handleCloseSearchPanel}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Floating TOC (lg～xl) */}
        <div className="fixed right-4 bottom-16 z-40 hidden lg:block xl:hidden">
          <ThemeToggle variant="secondary" />
        </div>
        <div className="fixed right-4 bottom-4 z-40 hidden lg:block xl:hidden">
          <Sheet>
            <SheetTitle className="hidden" />
            <SheetTrigger asChild>
              <Button size="icon" variant="secondary" className="w-9 h-9">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md">
              <div className="px-4 py-2 font-medium">On This Page</div>
              <ScrollArea className="h-[calc(100dvh-8rem)]">
                <div className="px-4 py-2">
                  <TableOfContents
                    toc={toc}
                    tocContainerRef={tocContainerRef}
                    tocItemRefs={tocItemRefs}
                    isTocItemActive={isTocItemActive}
                    setTocItemRef={setTocItemRef}
                    indicatorStyle={indicatorStyle}
                  />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Right Sidebar: TOC (xl+) */}
        <div
          className={cn(
            "hidden xl:block fixed top-0 right-0 h-dvh w-64 border-l bg-background",
            "transition-opacity duration-200",
            isSearchMode ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <div className="h-14 px-4 py-4 font-medium">On This Page</div>
          <ScrollArea className="h-[calc(100dvh-6.5rem)]">
            <div className="px-4 py-4">
              <TableOfContents
                toc={toc}
                tocContainerRef={tocContainerRef}
                tocItemRefs={tocItemRefs}
                isTocItemActive={isTocItemActive}
                setTocItemRef={setTocItemRef}
                indicatorStyle={indicatorStyle}
              />
            </div>
          </ScrollArea>
          <ThemeToggle className="m-2" />
        </div>
      </div>

      {/* ── Mobile Content ── */}
      <div className="flex-1 lg:hidden">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <DocsBreadcrumbs breadcrumbs={breadcrumbs} />
          </div>
          <LastUpdated lastUpdated={lastUpdated} />
          {summaryText && shouldExecuteSummary(summaryText) && articleId && (
            <AiSummary articleId={articleId} className="mt-4" />
          )}
          <div className="prose prose-slate dark:prose-invert max-w-none wrap-break-word">
            {children}
          </div>
          <CodeCopyButtons />
          <PrevNextNav prevNext={prevNext} />
        </div>
      </div>
      <CodeCopyButtons />
    </div>
  )
}