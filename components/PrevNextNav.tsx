import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PrevNextNavProps {
  prevNext?: {
    prev?: { slug: string; title: string }
    next?: { slug: string; title: string }
  }
}

export function PrevNextNav({ prevNext }: PrevNextNavProps) {
  if (!prevNext) return null
  return (
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
  )
}