"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

type Target = {
  id: string
  element: HTMLElement
}

export function CodeCopyButtons() {
  const pathname = usePathname()
  const [targets, setTargets] = useState<Target[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const preElements = Array.from(document.querySelectorAll(".prose pre")) as HTMLElement[]
    const mapped = preElements.map((element, index) => {
      element.style.position = "relative"
      return { id: `code-copy-${index}`, element }
    })
    setTargets(mapped)
  }, [pathname])

  async function handleCopy(target: Target) {
    const code = target.element.querySelector("code")
    const text = code?.textContent || target.element.textContent || ""
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedId(target.id)
    setTimeout(() => setCopiedId((prev) => (prev === target.id ? null : prev)), 1200)
  }

  return (
    <>
      {targets.map((target) =>
        createPortal(
          <button
            key={target.id}
            type="button"
            onClick={() => void handleCopy(target)}
            className="absolute right-2 top-2 z-10 rounded-md border border-border/70 bg-background/90 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground"
            aria-label="Copy code"
          >
            {copiedId === target.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>,
          target.element,
        ),
      )}
    </>
  )
}
