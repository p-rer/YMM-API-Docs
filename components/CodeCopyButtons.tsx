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
  language: string
}

export function CodeCopyButtons() {
  const pathname = usePathname()
  const [targets, setTargets] = useState<Target[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const existingWrappers = Array.from(document.querySelectorAll("[data-code-copy-wrapper='true']")) as HTMLElement[]
    for (const wrapper of existingWrappers) {
      const pre = wrapper.querySelector("pre")
      if (pre) wrapper.replaceWith(pre)
      else wrapper.remove()
    }

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
      host.className = "code-copy-header"
      wrapper.prepend(host)

      const code = preElement.querySelector("code")
      const languageClass = code?.className.match(/language-([\w-]+)/)?.[1]
      const language = preElement.dataset.language || code?.dataset.language || languageClass || "text"

      mapped.push({ id: `code-copy-${index}`, element: host, pre: preElement, wrapper, language })
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
          <div key={target.id} className="flex h-10 items-center justify-between border-b border-border bg-muted px-3 text-sm text-foreground">
            <span className="font-mono text-xs uppercase tracking-wide">{target.language}</span>
            <button
              type="button"
              onClick={() => void handleCopy(target)}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center border border-border bg-background text-foreground"
              aria-label="Copy code"
            >
              {copiedId === target.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>,
          target.element,
        ),
      )}
    </>
  )
}
