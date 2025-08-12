import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronDown, File } from "lucide-react"
import { useState, useMemo } from "react"

export interface DocTreeNode {
  name: string
  isExtended: boolean
  title?: string
  url?: string
  isIndex?: boolean
  children?: DocTreeNode[]
}

function normalizePath(path: string | undefined) {
  if (!path) return ''
  return path.endsWith('/') ? path.slice(0, -1) : path
}

function isActiveNode(node: DocTreeNode, pathname: string): boolean {
  return normalizePath(pathname) !== '' && normalizePath(pathname) === normalizePath(node.url ?? '')
}

function getActivePath(nodes: DocTreeNode[], pathname: string): string[] | null {
  for (const node of nodes) {
    if (isActiveNode(node, pathname)) return [node.name]
    if (node.children) {
      const childPath = getActivePath(node.children, pathname)
      if (childPath) return [node.name, ...childPath]
    }
  }
  return null
}

interface DocTreeProps {
  nodes: DocTreeNode[]
  pathname: string
  level?: number
  openPath?: string[] | null
}

export function DocTree({ nodes, pathname, level = 0, openPath }: DocTreeProps) {
  const activePath = useMemo(() => openPath ?? getActivePath(nodes, pathname), [openPath, nodes, pathname])
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function handleToggle(name: string) {
    setOpen((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  return (
    <>
      {nodes.map((node) => {
        const isActive = isActiveNode(node, pathname)
        const hasChildren = !!node.children && node.children.length > 0
        const shouldOpen = node.isExtended || (activePath ? activePath[0] === node.name : false)
        const isOpen = typeof open[node.name] === "boolean" ? open[node.name] : shouldOpen

        return (
          <div
            key={node.name}
            className={cn(
              "group pl-4 transition-colors",
              level > 0 && "border-l border-muted"
            )}
          >
            <div className="flex items-center">
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={isOpen ? "Collapse section" : "Expand section"}
                  onClick={() => handleToggle(node.name)}
                  className={cn(
                    "mr-1 rounded p-1 hover:bg-accent transition-colors",
                    isOpen ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                  tabIndex={0}
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <File className="w-4 h-4 mr-1 text-muted-foreground" aria-hidden />
              )}
              {node.url ? (
                <Link
                  href={node.url}
                  className={cn(
                    "block py-1 text-sm whitespace-nowrap transition-colors rounded",
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  
                >
                  {node.title || node.name}
                </Link>
              ) : (
                <div className="py-1 text-sm text-muted-foreground whitespace-nowrap">
                  {node.title || node.name}
                </div>
              )}
            </div>
            {hasChildren && isOpen && (
              <div className="ml-4 mt-1">
                <DocTree
                  nodes={node.children!}
                  pathname={pathname}
                  level={level + 1}
                  openPath={shouldOpen && activePath ? activePath.slice(1) : null}
                />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}