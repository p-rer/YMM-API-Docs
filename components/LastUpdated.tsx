import { format } from "date-fns"

export function LastUpdated({ lastUpdated }: { lastUpdated: Date }) {
  return (
    <p className="mt-2 text-sm text-muted-foreground">Last updated: {format(lastUpdated, "MMMM d, yyyy")}</p>
  )
}