"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChevronRight, ChevronLeft, Menu, Search, X } from "lucide-react"

interface DocTreeNode {
  name: string
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
  breadcrumbs: { label: string; href: string }[]
  prevNext?: {
    prev?: { slug: string; title: string }
    next?: { slug: string; title: string }
  }
}

export default function DocsLayout({
                                     children,
                                     docTree,
                                     toc,
                                     title,
                                     lastUpdated,
                                     breadcrumbs,
                                     prevNext,
                                   }: DocsLayoutProps) {
  const pathname = usePathname()
  const [visibleHeadings, setVisibleHeadings] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredTree, setFilteredTree] = useState<DocTreeNode[]>(docTree)

  // Filter doc tree based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTree(docTree)
      return
    }

    const query = searchQuery.toLowerCase()

    function filterNode(node: DocTreeNode): DocTreeNode | null {
      // Check if current node matches
      const titleMatches = node.title?.toLowerCase().includes(query)
      const nameMatches = node.name.toLowerCase().includes(query)

      // If no children, return based on current node match
      if (!node.children || node.children.length === 0) {
        return titleMatches || nameMatches ? { ...node } : null
      }

      // Filter children
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as DocTreeNode[]

      // If any children match or current node matches, return node with filtered children
      if (filteredChildren.length > 0 || titleMatches || nameMatches) {
        return {
          ...node,
          children: filteredChildren,
        }
      }

      return null
    }

    const filtered = docTree.map(filterNode).filter(Boolean) as DocTreeNode[]

    setFilteredTree(filtered)
  }, [searchQuery, docTree])

  // Organize TOC items into a hierarchical structure
  const sectionMap = toc.reduce((acc: Map<string, string>, item) => {
    if (item.depth === 3) {
      // Find parent section (h2) for this subsection (h3)
      const parentSection = toc.find(
        (h) =>
          h.depth === 2 &&
          toc.indexOf(h) < toc.indexOf(item) &&
          !toc.some((h2) => h2.depth === 2 && toc.indexOf(h) < toc.indexOf(h2) && toc.indexOf(h2) < toc.indexOf(item)),
      )

      if (parentSection) {
        acc.set(item.id, parentSection.id)
      }
    }
    return acc
  }, new Map())

  // Track visible headings for table of contents
  useEffect(() => {
    if (toc.length === 0) return

    const headingElements = toc.map(({ id }) => document.getElementById(id)).filter(Boolean)

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id

          setVisibleHeadings((prev) => {
            const newSet = new Set(prev)
            if (entry.isIntersecting) {
              newSet.add(id)
            } else {
              newSet.delete(id)
            }
            return newSet
          })
        })
      },
      {
        rootMargin: "-80px 0px -50% 0px", // Adjust for better visibility calculation
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    headingElements.forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => {
      headingElements.forEach((element) => {
        if (element) observer.unobserve(element)
      })
    }
  }, [toc])

  // Render document tree recursively
  const renderDocTree = (nodes: DocTreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isActive = node.url === pathname

      return (
        <div key={node.name} className={cn("pl-4", level > 0 && "border-l")}>
          {node.url ? (
            <Link
              href={node.url}
              className={cn(
                "block py-1 text-sm hover:text-primary transition-colors",
                isActive ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {node.title || node.name}
            </Link>
          ) : (
            <div className="py-1 text-sm font-medium">{node.title || node.name}</div>
          )}
          {node.children && node.children.length > 0 && (
            <div className="mt-1">{renderDocTree(node.children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  // Determine if a TOC item should be highlighted
  const isTocItemActive = (item: TocItem) => {
    // If the heading itself is visible, highlight it
    if (visibleHeadings.has(item.id)) return true

    // If this is a section heading (h2) and any of its subsections are visible, highlight it
    if (item.depth === 2) {
      for (const [subsectionId, sectionId] of sectionMap.entries()) {
        if (sectionId === item.id && visibleHeadings.has(subsectionId)) {
          return true
        }
      }
    }

    return false
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile navigation */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] pr-0">
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documentation..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1.5 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)] pb-10">
              <div className="px-4 py-2">{renderDocTree(filteredTree)}</div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        <div className="flex-1 text-center font-medium">{title}</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-5 w-5" />
              <span className="sr-only">Toggle table of contents</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="px-4 py-2 font-medium">On This Page</div>
            <ScrollArea className="h-[calc(100vh-8rem)] pb-10">
              <div className="px-4 py-2">
                <div className="flex flex-col space-y-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={cn(
                        "text-sm py-1 transition-colors hover:text-primary relative",
                        item.depth === 2 ? "pl-0" : `pl-${(item.depth - 2) * 4}`,
                        isTocItemActive(item)
                          ? "font-medium text-primary before:absolute before:left-[-12px] before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-full"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.text}
                    </a>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop layout */}
      <div className="hidden lg:flex">
        {/* Left sidebar (document tree) */}
        <div className="fixed inset-y-0 left-0 w-64 border-r bg-background">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold">Documentation</span>
            </Link>
          </div>
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1.5 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="px-4 py-2">{renderDocTree(filteredTree)}</div>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 pl-64 pr-64">
          <div className="mx-auto max-w-3xl px-8 py-8">
            {/* Breadcrumbs */}
            <nav className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  <ChevronRight className="h-4 w-4" />
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-foreground">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Title and last updated */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Last updated: {format(lastUpdated, "MMMM d, yyyy")}</p>
            </div>

            {/* Main content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">{children}</div>

            {/* Previous/Next navigation */}
            {prevNext && (
              <div className="mt-12 flex items-center justify-between border-t pt-4">
                {prevNext.prev ? (
                  <Link
                    href={prevNext.prev.slug === "" ? "/" : `/${prevNext.prev.slug}`}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{prevNext.prev.title}</span>
                  </Link>
                ) : (
                  <div />
                )}
                {prevNext.next && (
                  <Link
                    href={prevNext.next.slug === "" ? "/" : `/${prevNext.next.slug}`}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span>{prevNext.next.title}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar (table of contents) */}
        <div className="fixed inset-y-0 right-0 w-64 border-l bg-background">
          <div className="h-14 border-b px-4 py-4 font-medium">On This Page</div>
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <div className="px-4 py-4">
              <div className="flex flex-col space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                      "text-sm py-1 transition-colors hover:text-primary relative",
                      item.depth === 2 ? "pl-0" : `pl-${(item.depth - 2) * 4}`,
                      isTocItemActive(item)
                        ? "font-medium text-primary before:absolute before:left-[-12px] before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-full"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile content */}
      <div className="flex-1 lg:hidden">
        <div className="container py-6">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                <ChevronRight className="h-4 w-4" />
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Last updated */}
          <p className="mb-4 text-sm text-muted-foreground">Last updated: {format(lastUpdated, "MMMM d, yyyy")}</p>

          {/* Main content */}
          <div className="prose prose-slate dark:prose-invert max-w-none">{children}</div>

          {/* Previous/Next navigation for mobile view */}
          {prevNext && (
            <div className="mt-12 flex items-center justify-between border-t pt-4">
              {prevNext.prev ? (
                <Link
                  href={prevNext.prev.slug === "" ? "/" : `/${prevNext.prev.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>{prevNext.prev.title}</span>
                </Link>
              ) : (
                <div />
              )}
              {prevNext.next && (
                <Link
                  href={prevNext.next.slug === "" ? "/" : `/${prevNext.next.slug}`}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>{prevNext.next.title}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

