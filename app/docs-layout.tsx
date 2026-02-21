"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ChevronLeft, Menu, GithubIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

import { DocsBreadcrumbs } from "../components/DocsBreadcrumbs"
import { LastUpdated } from "../components/LastUpdated"
import { PrevNextNav } from "../components/PrevNextNav"
import { SearchBox } from "../components/SearchBox"
import { DocTree } from "../components/DocTree"
import { TableOfContents } from "../components/TableOfContents"
import { CodeCopyButtons } from "../components/CodeCopyButtons"

import { useFilteredTree } from "../hooks/useFilteredTree"
import { useVisibleHeadings } from "../hooks/useVisibleHeadings"
import { useIsTocItemActive } from "../hooks/useIsTocItemActive"
import { useTocIndicatorStyle } from "../hooks/useTocIndicatorStyle"
import { SITE_TITLE } from "@/lib/siteSetting"
import { cn } from "@/lib/utils"

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
}

export function DocsLayout({ children, docTree, toc, title, lastUpdated, breadcrumbs, githubRepoEditUrl, prevNext }: DocsLayoutProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [isTreeHovered, setIsTreeHovered] = useState(false)
  const tocItemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const tocContainerRef = useRef<HTMLDivElement | null>(null)

  const filteredTree = useFilteredTree(docTree, searchQuery)
  const visibleHeadings = useVisibleHeadings(toc)
  const isTocItemActive = useIsTocItemActive(toc, visibleHeadings)
  const indicatorStyle = useTocIndicatorStyle({ visibleHeadings, toc, tocContainerRef, tocItemRefs, isTocItemActive })

  const setTocItemRef = (element: HTMLAnchorElement | null, id: string) => {
    if (element) tocItemRefs.current.set(id, element)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
        {/* Mobile DocTree (Sheet) */}
        <Sheet>
          <SheetTitle className="hidden"></SheetTitle>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          {/* FULL WIDTH FOR MOBILE */}
          <SheetContent side="left" className="w-full max-w-full sm:w-full sm:max-w-xl pr-0">
            <div className="px-4 py-2">
              <SearchBox searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>
            <ScrollArea className="h-[calc(100dvh-8rem)] pb-10">
              <div className="px-4 py-2">
                <DocTree nodes={filteredTree} pathname={pathname} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <div className="flex-1 text-left font-medium">{title}</div>
        {/* GitHub Edit Link */}
        {githubRepoEditUrl && (
          <Link href={githubRepoEditUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <GithubIcon className="h-5 w-5" />
            <span className="sr-only">Edit on GitHub</span>
          </Link>
        )}
        {/* Theme Toggle */}
        <ThemeToggle />
        {/* Mobile TOC (Sheet) */}
        <Sheet>
          <SheetTitle className="hidden"></SheetTitle>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Toggle table of contents</span>
            </Button>
          </SheetTrigger>
          {/* FULL WIDTH FOR MOBILE */}
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

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Left Sidebar: DocTree */}
        <div
          className="fixed inset-y-0 left-0 border-r bg-background overflow-x-auto"
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
            <SearchBox searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
          <ScrollArea className="h-[calc(100dvh-8rem)]">
            <div className="px-4 py-2">
              <DocTree nodes={filteredTree} pathname={pathname} />
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-64 pr-64">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <DocsBreadcrumbs breadcrumbs={breadcrumbs} />
            <div className="mb-8">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {/* GitHub Edit Link */}
                {githubRepoEditUrl && (
                  <Link href={githubRepoEditUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground m-4 hover:text-foreground">
                    <GithubIcon className="h-5 w-5" />
                    <span className="sr-only">Edit on GitHub</span>
                  </Link>
                )}
              </div>
              <LastUpdated lastUpdated={lastUpdated} />
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none">{children}</div>
            <CodeCopyButtons />
            <PrevNextNav prevNext={prevNext} />
          </div>
        </div>

        {/* Right Sidebar: TOC */}
        <div className="fixed inset-y-0 right-0 w-64 border-l bg-background">
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

      {/* Mobile Content */}
      <div className="flex-1 lg:hidden">
        <div className="container py-6">
          <DocsBreadcrumbs breadcrumbs={breadcrumbs} />
          <LastUpdated lastUpdated={lastUpdated} />
          <div className="prose prose-slate dark:prose-invert max-w-none">{children}</div>
          <CodeCopyButtons />
          <PrevNextNav prevNext={prevNext} />
        </div>
      </div>
      <CodeCopyButtons />
    </div>
  )
}
