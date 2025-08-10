import Link from "next/link"
import { cn } from "@/lib/utils"

export interface DocTreeNode {
  name: string
  title?: string
  url?: string
  isIndex?: boolean
  children?: DocTreeNode[]
}

function normalizePath(path :string | undefined) {
  if (!path) return '';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

interface DocTreeProps {
  nodes: DocTreeNode[]
  pathname: string
  level?: number
}

export function DocTree({ nodes, pathname, level = 0 }: DocTreeProps) {
  return (
    <>
      {nodes.map((node) => {
        const isActive = normalizePath(pathname) === normalizePath(node.url);

        return (
          <div key={node.name} className={cn("pl-4", level > 0 && "border-l")}>
            {node.url ? (
              <Link
                href={node.url}
                className={cn(
                  "block py-1 text-sm hover:text-primary transition-colors",
                  isActive ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {node.title || node.name}
              </Link>
            ) : (
              <div className="py-1 text-sm font-medium">{node.title || node.name}</div>
            )}
            {node.children && node.children.length > 0 && (
              <div className="mt-1">
                <DocTree nodes={node.children} pathname={pathname} level={level + 1} />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}