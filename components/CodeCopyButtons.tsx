"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

type Target = {
  id: string
  element: HTMLElement
}

type Position = {
  top: number
  left: number
}

export function CodeCopyButtons() {
  const pathname = usePathname()
  const [targets, setTargets] = useState<Target[]>([])
  const [positions, setPositions] = useState<Record<string, Position>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const preElements = Array.from(document.querySelectorAll(".prose pre")) as HTMLElement[]
    const mapped = preElements.map((element, index) => {
      return { id: `code-copy-${index}`, element }
    })
    setTargets(mapped)
  }, [pathname])

  useEffect(() => {
    if (targets.length === 0) {
      setPositions({})
      return
    }

    const buttonSize = 28
    const margin = 8
    let rafId = 0

    const updatePositions = () => {
      const headerBottom = (document.querySelector("header.sticky") as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0
      const viewportTopLimit = headerBottom + margin
      const nextPositions: Record<string, Position> = {}

      for (const target of targets) {
        const rect = target.element.getBoundingClientRect()
        const minTop = rect.top + margin
        const maxTop = rect.bottom - buttonSize - margin
        const desiredTop = Math.max(minTop, viewportTopLimit)
        const top = Math.min(desiredTop, maxTop)

        if (maxTop >= minTop) {
          nextPositions[target.id] = {
            top,
            left: rect.right - buttonSize - margin,
          }
        }
      }

      setPositions(nextPositions)
    }

    const onScrollOrResize = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(updatePositions)
    }

    updatePositions()
    window.addEventListener("scroll", onScrollOrResize, { passive: true })
    window.addEventListener("resize", onScrollOrResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", onScrollOrResize)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [targets])

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
      {targets.map((target) => {
        const position = positions[target.id]
        if (!position) return null

        return createPortal(
          <button
            key={target.id}
            type="button"
            onClick={() => void handleCopy(target)}
            className="fixed z-40 rounded-md bg-black/80 p-1.5 text-white backdrop-blur hover:bg-black"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            aria-label="Copy code"
          >
            {copiedId === target.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>,
          document.body,
        )
      })}
    </>
  )
}
