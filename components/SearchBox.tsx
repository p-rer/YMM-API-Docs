import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
// import { AiSearch } from "@/components/AiSearch"

interface SearchBoxProps {
  searchQuery: string
  setSearchQuery: (v: string) => void
  onFocus?: () => void
  className?: string
  inputClassName?: string
}

export function SearchBox({
                            searchQuery,
                            setSearchQuery,
                            onFocus,
                            className,
                            inputClassName,
                          }: SearchBoxProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search documentation..."
        className={cn("pl-8 pr-16 rounded-none", inputClassName)}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={onFocus}
      />
      <div className="absolute right-1 top-1.5 flex items-center gap-1">
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
        {/*<AiSearch/>*/}
      </div>
    </div>
  )
}