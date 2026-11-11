"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight, Menu, GithubIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { SearchBox } from "@/components/SearchBox"
import { DocTree } from "@/components/DocTree"
import { SearchResults } from "@/components/SearchResults"
import { TableOfContents } from "@/components/TableOfContents"
import { HeadEllipsis } from "@/components/HeadEllipsis"
import { useFilteredTree } from "@/hooks/useFilteredTree"
import { useFullTextSearch } from "@/hooks/useFullTextSearch"
import { useVisibleHeadings } from "@/hooks/useVisibleHeadings"
import { useIsTocItemActive } from "@/hooks/useIsTocItemActive"
import { useTocIndicatorStyle } from "@/hooks/useTocIndicatorStyle"
import { useIsMobile } from "@/hooks/use-mobile"
import { SITE_TITLE } from "@/lib/siteSetting"

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

interface Props {
  title: string
  toc: TocItem[]
}

export function DocsLayoutClient({ title, toc }: Props) {
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
  const [docTree, setDocTree] = useState<DocTreeNode[]>([])
  const [isTreeHovered, setIsTreeHovered] = useState(false)

  const tocItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const tocContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/doc-tree")
      .then((response) => {
        if (!response.ok) throw new Error(`Navigation tree request failed: ${response.status}`)
        return response.json() as Promise<DocTreeNode[]>
      })
      .then((tree) => {
        if (active && Array.isArray(tree)) setDocTree(tree)
      })
      .catch((error) => {
        if (active) console.error("Failed to load documentation navigation:", error)
      })
    return () => { active = false }
  }, [])

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value)
    const hasQuery = value.trim().length > 0
    setIsSearchMode(hasQuery && !suppressSearchMode)
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("q", value)
    else params.delete("q")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams, suppressSearchMode])

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
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [])

  const handleCloseSearchPanel = useCallback(() => {
    setIsSearchMode(false)
    setMobileShowResults(false)
  }, [])

  const { results: searchResults, isSearching } = useFullTextSearch(searchQuery)
  const filteredTree = useFilteredTree(docTree, "")
  const visibleHeadings = useVisibleHeadings(toc)
  const isTocItemActive = useIsTocItemActive(toc, visibleHeadings)
  const indicatorStyle = useTocIndicatorStyle({
    visibleHeadings, toc, tocContainerRef, tocItemRefs, isTocItemActive,
  })

  const setTocItemRef = (element: HTMLAnchorElement | null, id: string) => {
    if (element) tocItemRefs.current.set(id, element)
  }

  return (
    <>
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
                  if (searchQuery.trim().length > 0) setMobileShowResults(true)
                }}
              />
            </div>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pb-10">
                <div className="px-4 py-2">
                  {mobileShowResults ? (
                    <SearchResults
                      results={searchResults}
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
          <a href="https://github.com/p-rer/YMM-API-Docs/tree/master/content" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <GithubIcon className="h-5 w-5" />
            <span className="sr-only">View documentation source on GitHub</span>
          </a>
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

      <div className="hidden lg:flex">
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

        <div className="fixed right-4 bottom-16 z-40 hidden lg:block xl:hidden">
          <ThemeToggle variant="secondary" />
        </div>
        <div className="fixed right-4 bottom-4 z-40 hidden lg:block xl:hidden">
          <Sheet>
            <SheetTitle className="hidden" />
            <SheetTrigger asChild>
              <Button size="icon" variant="secondary" className="w-9 h-9">
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Toggle table of contents</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md">
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
        </div>

        <div
          className="hidden xl:block fixed top-0 right-0 h-dvh w-64 border-l bg-background"
          style={{ zIndex: 30 }}
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

      {isSearchMode && (
        <div className="fixed inset-0 z-20 overflow-auto bg-background">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <SearchResults
              results={searchResults}
              isSearching={isSearching}
              query={searchQuery}
              onClose={handleCloseSearchPanel}
            />
          </div>
        </div>
      )}
    </>
  )
}
