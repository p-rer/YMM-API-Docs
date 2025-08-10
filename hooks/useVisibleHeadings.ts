import { useEffect, useState } from "react"

export interface TocItem {
  depth: number
  text: string
  id: string
}

export function useVisibleHeadings(toc: TocItem[]) {
  const [visibleHeadings, setVisibleHeadings] = useState<Set<string>>(new Set())

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
            if (entry.isIntersecting) newSet.add(id)
            else newSet.delete(id)
            return newSet
          })
        })
      },
      { rootMargin: "0px", threshold: 0 },
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

  return visibleHeadings
}