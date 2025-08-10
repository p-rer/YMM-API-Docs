import { useEffect, useState } from "react"
import type { TocItem } from "./useVisibleHeadings"

export function useTocIndicatorStyle({
  visibleHeadings,
  toc,
  tocContainerRef,
  tocItemRefs,
  isTocItemActive,
}: {
  visibleHeadings: Set<string>
  toc: TocItem[]
  tocContainerRef: React.RefObject<HTMLDivElement>
  tocItemRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>
  isTocItemActive: (item: TocItem) => boolean
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    if (visibleHeadings.size === 0 || !tocContainerRef.current) {
      setIndicatorStyle({ top: 0, height: 0, opacity: 0 })
      return
    }
    // isTocItemActiveはuseCallbackで固定するか、依存配列から外してください
    const activeItemIds = toc.filter(item => isTocItemActive(item)).map(item => item.id)
    if (activeItemIds.length === 0) {
      setIndicatorStyle({ top: 0, height: 0, opacity: 0 })
      return
    }
    const activeElements = activeItemIds.map(id => tocItemRefs.current.get(id)).filter(Boolean) as HTMLAnchorElement[]
    if (activeElements.length === 0) return
    const containerRect = tocContainerRef.current.getBoundingClientRect()
    const firstElement = activeElements[0]
    const lastElement = activeElements[activeElements.length - 1]
    const firstRect = firstElement.getBoundingClientRect()
    const lastRect = lastElement.getBoundingClientRect()
    const top = firstRect.top - containerRect.top
    const height = (lastRect.top + lastRect.height) - firstRect.top
    setIndicatorStyle({ top, height, opacity: 1 })
  // 依存配列をこうする
  }, [visibleHeadings, toc])
  // tocContainerRef, tocItemRefs, isTocItemActiveは入れない
  return indicatorStyle
}