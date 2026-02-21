import Link from "next/link"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import React, { useState, useRef, useEffect } from "react"

function isEllipsisCrumb(
    crumb: { label: string; href: string | null } | { label: string; href: string | null; isEllipsis: boolean }
): crumb is { label: string; href: string | null; isEllipsis: boolean } {
  return (crumb as any).isEllipsis === true;
}

export function DocsBreadcrumbs({ breadcrumbs }: { breadcrumbs: { label: string; href: string | null }[] }) {
  const [hiddenType, setHiddenType] = useState<"middle" | "start" | null>(null)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const [ellipsisItems, setEllipsisItems] = useState<{ label: string, href: string | null }[]>([])
  const [keepCount, setKeepCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const measureNavRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function updateHiddenType() {
      if (!containerRef.current || !measureNavRef.current || breadcrumbs.length <= 4) {
        setHiddenType(null)
        setEllipsisItems([])
        setKeepCount(0)
        return
      }

      const containerWidth = containerRef.current.getBoundingClientRect().width

      const children = Array.from(measureNavRef.current.children) as HTMLElement[]
      const itemWidths = children.map(child => {
        const rect = child.getBoundingClientRect()
        const style = window.getComputedStyle(child)
        const marginLeft = parseFloat(style.marginLeft)
        const marginRight = parseFloat(style.marginRight)
        return rect.width + marginLeft + marginRight
      })

      const totalWidth = itemWidths.reduce((a, b) => a + b, 0)

      if (totalWidth <= containerWidth) {
        setHiddenType(null)
        setEllipsisItems([])
        setKeepCount(0)
        return
      }

      const ellipsisWidth = 60
      const homeWidth = itemWidths[0]

      for (let keepFromEnd = breadcrumbs.length; keepFromEnd >= 1; keepFromEnd--) {
        let calculatedWidth = homeWidth + ellipsisWidth

        for (let i = breadcrumbs.length - keepFromEnd; i < breadcrumbs.length; i++) {
          calculatedWidth += itemWidths[1 + i]
        }

        if (calculatedWidth <= containerWidth) {
          const hiddenCount = breadcrumbs.length - keepFromEnd
          if (hiddenCount > 0) {
            setKeepCount(keepFromEnd)
            setHiddenType("start")
            const hidden = breadcrumbs.slice(0, hiddenCount)
            setEllipsisItems(hidden)
          } else {
            setHiddenType(null)
            setEllipsisItems([])
            setKeepCount(0)
          }
          return
        }
      }

      setKeepCount(1)
      setHiddenType("start")
      const hidden = breadcrumbs.slice(0, breadcrumbs.length - 1)
      setEllipsisItems(hidden)
    }

    updateHiddenType()
    window.addEventListener("resize", updateHiddenType)
    return () => window.removeEventListener("resize", updateHiddenType)
  }, [breadcrumbs])

  function handleEllipsisClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setShowEllipsisMenu((v) => !v)
  }

  useEffect(() => {
    if (!showEllipsisMenu) return
    function closeMenu() {
      setShowEllipsisMenu(false)
    }
    window.addEventListener("click", closeMenu)
    return () => window.removeEventListener("click", closeMenu)
  }, [showEllipsisMenu])

  function getDisplayBreadcrumbs() {
    if (!hiddenType) {
      return breadcrumbs
    }
    const hiddenCount = breadcrumbs.length - keepCount
    return [
      { label: "...", href: "", isEllipsis: true },
      ...breadcrumbs.slice(hiddenCount),
    ]
  }

  const displayBreadcrumbs = getDisplayBreadcrumbs()

  return (
      <div ref={containerRef} className={"relative w-full mb-4 overflow-x-auto min-w-0"}>
        <nav
            ref={measureNavRef}
            className="fixed -left-[9999px] top-0 z-[-1] flex items-center space-x-1 text-sm text-muted-foreground opacity-0 pointer-events-none"
            style={{ paddingLeft: 8, paddingRight: 8 }}
            aria-hidden="true"
        >
          <Link href="/" className="hover:text-foreground whitespace-nowrap" tabIndex={-1}>
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
              <div key={crumb.label + crumb.href + index} className="flex items-center">
                <ChevronRight className="h-4 w-4" />
                {crumb.href == null ? (
                    <span className="whitespace-nowrap">{crumb.label}</span>
                ) : (
                    <Link href={crumb.href} className="hover:text-foreground whitespace-nowrap" tabIndex={-1}>
                      {crumb.label}
                    </Link>
                )}
              </div>
          ))}
        </nav>

        <nav
            className="flex items-center space-x-1 text-sm text-muted-foreground relative"
            style={{ paddingLeft: 8, paddingRight: 8 }}
        >
          <Link href="/" className="hover:text-foreground whitespace-nowrap">
            Home
          </Link>
          {displayBreadcrumbs.map((crumb, index) => (
              <div key={crumb.label + crumb.href + index} className="flex items-center relative">
                <ChevronRight className="h-4 w-4" />
                {isEllipsisCrumb(crumb) ? (
                    <>
                      <button
                          type="button"
                          className="px-2 flex items-center hover:bg-muted rounded text-foreground whitespace-nowrap"
                          onClick={handleEllipsisClick}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-label="Show hidden breadcrumbs" />
                        <span className="sr-only">Show hidden breadcrumbs</span>
                      </button>
                      <div
                          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${
                              showEllipsisMenu
                                  ? 'opacity-100'
                                  : 'opacity-0 pointer-events-none'}`}
                          style={
                            {
                              background: "rgba(0,0,0,0.5)",
                              backdropFilter: "blur(10px)",
                            }}
                      >
                        <div
                            className="bg-popover border rounded shadow-lg min-w-50 max-w-full py-2"
                            style={{
                              whiteSpace: "nowrap",
                              maxHeight: "70dvh",
                              overflowY: "auto",
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                          {ellipsisItems.map((item) =>
                              item.href !== null ? (
                                  <Link
                                      href={item.href}
                                      className="block px-4 py-2 hover:bg-muted text-foreground whitespace-nowrap"
                                      key={item.href}
                                      onClick={() => setShowEllipsisMenu(false)}
                                  >
                                    {item.label}
                                  </Link>
                              ) : (
                                  <span className="block px-4 py-2 hover:bg-muted text-foreground whitespace-nowrap" key={"_" + item.label}>
                                {item.label}
                              </span>
                              )
                          )}
                          <button
                              type="button"
                              className="block w-full px-4 py-2 text-center text-destructive hover:bg-muted"
                              onClick={() => setShowEllipsisMenu(false)}
                          >閉じる</button>
                        </div>
                      </div>
                    </>
                ) : (
                    crumb.href == null ? (
                        <span className="whitespace-nowrap">{crumb.label}</span>
                    ) : (
                        <Link href={crumb.href} className="hover:text-foreground whitespace-nowrap">
                          {crumb.label}
                        </Link>
                    )
                )}
              </div>
          ))}
        </nav>
      </div>
  )
}