import { cn } from "@/lib/utils"

export interface TocItem {
  depth: number
  text: string
  id: string
}

export function TocIndicator({ indicatorStyle }: { indicatorStyle: { top: number; height: number; opacity: number } }) {
  return (
    <div
      className="absolute left-[-12px] w-[3px] bg-primary rounded-full transition-all duration-300 ease-in-out"
      style={{
        top: `${indicatorStyle.top}px`,
        height: `${indicatorStyle.height}px`,
        opacity: indicatorStyle.opacity
      }}
    />
  )
}

interface TableOfContentsProps {
  toc: TocItem[]
  tocContainerRef: React.RefObject<HTMLDivElement | null>
  tocItemRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>
  isTocItemActive: (item: TocItem) => boolean
  setTocItemRef: (element: HTMLAnchorElement | null, id: string) => void
  indicatorStyle: { top: number; height: number; opacity: number }
}

export function TableOfContents({
  toc,
  tocContainerRef,
  tocItemRefs,
  isTocItemActive,
  setTocItemRef,
  indicatorStyle,
}: TableOfContentsProps) {
  return (
    <div className="flex flex-col space-y-1 relative" ref={tocContainerRef}>
      <TocIndicator indicatorStyle={indicatorStyle} />
      {toc.map((item) => (
        <a
          key={item.id}
          ref={(el) => setTocItemRef(el, item.id)}
          href={`#${item.id}`}
          className={cn(
            "text-sm py-1 transition-colors hover:text-primary relative",
            item.depth === 2 ? "pl-0" : `pl-${(item.depth - 2) * 4}`,
            isTocItemActive(item)
              ? "font-medium text-primary"
              : "text-muted-foreground",
          )}
        >
          {item.text}
        </a>
      ))}
    </div>
  )
}