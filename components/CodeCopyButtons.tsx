"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

type Target = {
  id: string
  element: HTMLElement
  pre: HTMLElement
  wrapper: HTMLElement
}

export function CodeCopyButtons() {
  const pathname = usePathname()
  const [targets, setTargets] = useState<Target[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const preElements = Array.from(document.querySelectorAll(".prose pre")) as HTMLElement[]
    const mapped: Target[] = []

    for (const [index, preElement] of preElements.entries()) {
      const parent = preElement.parentElement
      if (!parent) continue

      const wrapper = document.createElement("div")
      wrapper.dataset.codeCopyWrapper = "true"
      wrapper.className = "relative"

      parent.insertBefore(wrapper, preElement)
      wrapper.append(preElement)

      const host = document.createElement("div")
      host.dataset.codeCopyHost = "true"
      host.className = "pointer-events-none sticky top-16 z-10 -mb-10 flex h-0 justify-end pr-2 pt-2 lg:top-2"
      wrapper.prepend(host)

      mapped.push({ id: `code-copy-${index}`, element: host, pre: preElement, wrapper })
    }

    setTargets(mapped)

    return () => {
      for (const target of mapped) {
        if (target.wrapper.parentElement) {
          target.wrapper.replaceWith(target.pre)
        }
      }
    }
  }, [pathname])

  async function handleCopy(target: Target) {
    const code = target.pre.querySelector("code")
    const text = code?.textContent || target.pre.textContent || ""
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
            className="pointer-events-auto rounded-md bg-black/80 p-1.5 text-white backdrop-blur hover:bg-black"
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
