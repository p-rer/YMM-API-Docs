import type { TocItem } from "../hooks/useVisibleHeadings"

export function getSectionMap(toc: TocItem[]) {
  return toc.reduce((acc: Map<string, string>, item) => {
    if (item.depth === 3) {
      const parentSection = toc.find(
        (h) =>
          h.depth === 2 &&
          toc.indexOf(h) < toc.indexOf(item) &&
          !toc.some((h2) => h2.depth === 2 && toc.indexOf(h) < toc.indexOf(h2) && toc.indexOf(h2) < toc.indexOf(item)),
      )
      if (parentSection) acc.set(item.id, parentSection.id)
    }
    return acc
  }, new Map())
}