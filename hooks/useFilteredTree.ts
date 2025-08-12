import { useEffect, useState } from "react"

export interface DocTreeNode {
  name: string  
  isExtended: boolean
  title?: string
  url?: string
  isIndex?: boolean
  children?: DocTreeNode[]
}

export function useFilteredTree(docTree: DocTreeNode[], searchQuery: string) {
  const [filteredTree, setFilteredTree] = useState<DocTreeNode[]>(docTree)

  useEffect(() => {
    if (!searchQuery.trim()) {
      docTree.forEach(node => ({ ...node, isExtended: false }))
      setFilteredTree(docTree)
      return
    }
    const query = searchQuery.toLowerCase()
    function filterNode(node: DocTreeNode): DocTreeNode | null {
      const titleMatches = node.title?.toLowerCase().includes(query)
      const nameMatches = node.name.toLowerCase().includes(query)
      if (!node.children || node.children.length === 0) {
        return titleMatches || nameMatches ? { ...node, isExtended: true } : null
      }
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as DocTreeNode[]
      if (filteredChildren.length > 0 || titleMatches || nameMatches) {
        return { ...node, isExtended: true, children: filteredChildren }
      }
      return null
    }
    const filtered = docTree.map(filterNode).filter(Boolean) as DocTreeNode[]
    setFilteredTree(filtered)
  }, [searchQuery, docTree])

  return filteredTree
}