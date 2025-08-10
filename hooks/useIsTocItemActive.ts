import { useMemo } from "react"
import type { TocItem } from "./useVisibleHeadings"
import { getSectionMap } from "../lib/tocSectionMap"

export function useIsTocItemActive(toc: TocItem[], visibleHeadings: Set<string>) {
  const sectionMap = useMemo(() => getSectionMap(toc), [toc])
  return (item: TocItem) => {
    if (visibleHeadings.has(item.id)) return true
    if (item.depth === 2) {
      for (const [subsectionId, sectionId] of sectionMap.entries()) {
        if (sectionId === item.id && visibleHeadings.has(subsectionId)) {
          return true
        }
      }
    }
    return false
  }
}