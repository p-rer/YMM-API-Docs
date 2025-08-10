import Link from "next/link"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const ITEM_MIN_WIDTH = 64
const ITEM_MAX_WIDTH = 160
const ELLIPSIS_WIDTH = 40
const NAV_PADDING = 32
const CHEVRON_WIDTH = 20

export function DocsBreadcrumbs({ breadcrumbs }: { breadcrumbs: { label: string; href: string }[] }) {
  const [hiddenType, setHiddenType] = useState<"middle" | "start" | null>(null)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const [ellipsisItems, setEllipsisItems] = useState<{ label: string, href: string }[]>([])
  const navRef = useRef<HTMLDivElement>(null)
  const ellipsisBtnRef = useRef<HTMLButtonElement>(null)
  const [windowWidth, setWindowWidth] = useState(0)

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!navRef.current || breadcrumbs.length <= 4) {
      setHiddenType(null)
      setEllipsisItems([])
      return
    }
    const totalMaxItems = breadcrumbs.length + 1 // Home
    const maxWidth = totalMaxItems * ITEM_MAX_WIDTH + (totalMaxItems - 1) * CHEVRON_WIDTH + NAV_PADDING
    const minWidth = totalMaxItems * ITEM_MIN_WIDTH + (totalMaxItems - 1) * CHEVRON_WIDTH + NAV_PADDING

    if (windowWidth > minWidth && windowWidth >= maxWidth) {
      setHiddenType(null)
      setEllipsisItems([])
      return
    }

    const sideCount = 2 // 端の表示数（Home含む）
    if (windowWidth < minWidth) {
      setHiddenType("start")
      const hidden = breadcrumbs.slice(0, breadcrumbs.length - sideCount)
      setEllipsisItems(hidden)
    } else {
      setHiddenType("middle")
      const hidden = breadcrumbs.slice(sideCount, breadcrumbs.length - sideCount)
      setEllipsisItems(hidden)
    }
  }, [windowWidth, breadcrumbs])

  function handleEllipsisClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setShowEllipsisMenu((v) => !v)
  }

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!showEllipsisMenu) return
    function closeMenu(e: MouseEvent) {
      setShowEllipsisMenu(false)
    }
    window.addEventListener("click", closeMenu)
    return () => window.removeEventListener("click", closeMenu)
  }, [showEllipsisMenu])

  function getDisplayBreadcrumbs() {
    if (!hiddenType) {
      return breadcrumbs
    }
    if (hiddenType === "start") {
      return [
        { label: "...", href: "", isEllipsis: true },
        ...breadcrumbs.slice(breadcrumbs.length - 2),
      ]
    }
    return [
      breadcrumbs[0],
      breadcrumbs[1],
      { label: "...", href: "", isEllipsis: true },
      ...breadcrumbs.slice(breadcrumbs.length - 2),
    ]
  }

  const displayBreadcrumbs = getDisplayBreadcrumbs()

  return (
    <nav
      ref={navRef}
      className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground relative"
      style={{ maxWidth: "100vw", overflowX: "auto", paddingLeft: 8, paddingRight: 8 }}
    >
      <Link href="/" className="hover:text-foreground whitespace-nowrap">
        Home
      </Link>
      {displayBreadcrumbs.map((crumb, index) => (
        <div key={crumb.label + crumb.href + index} className="flex items-center relative">
          <ChevronRight className="h-4 w-4" />
          {crumb.isEllipsis ? (
            <>
              <button
                ref={ellipsisBtnRef}
                type="button"
                className="px-2 flex items-center hover:bg-muted rounded text-foreground whitespace-nowrap"
                style={{ minWidth: ELLIPSIS_WIDTH }}
                onClick={handleEllipsisClick}
              >
                <MoreHorizontal className="h-4 w-4" aria-label="Show hidden breadcrumbs" />
                <span className="sr-only">Show hidden breadcrumbs</span>
              </button>
              {showEllipsisMenu && (
                // 画面全体を覆うポップアップ
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.1)" }}
                >
                  <div
                    className="bg-popover border rounded shadow-lg min-w-[200px] max-w-full py-2"
                    style={{
                      whiteSpace: "nowrap",
                      maxHeight: "70vh",
                      overflowY: "auto",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {ellipsisItems.map((item) => (
                      <Link
                        href={item.href}
                        className="block px-4 py-2 hover:bg-muted text-foreground whitespace-nowrap"
                        key={item.href}
                        onClick={() => setShowEllipsisMenu(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-center text-destructive hover:bg-muted"
                      onClick={() => setShowEllipsisMenu(false)}
                    >閉じる</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            index === displayBreadcrumbs.length - 1 ? (
              <span className="text-foreground whitespace-nowrap">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground whitespace-nowrap">
                {crumb.label}
              </Link>
            )
          )}
        </div>
      ))}
    </nav>
  )
}