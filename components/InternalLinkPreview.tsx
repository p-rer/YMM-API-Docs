"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

type Preview = {
  html: string
  left: number
  top: number
}

const HIDE_DELAY = 300
const PREVIEW_WIDTH = 352
const PREVIEW_HEIGHT = 232
const VIEWPORT_PADDING = 8
const PREVIEW_GAP = 8

function getPreviewPosition(anchor: HTMLAnchorElement) {
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(PREVIEW_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2)
  const left = Math.max(
    VIEWPORT_PADDING,
    Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - VIEWPORT_PADDING),
  )
  const below = rect.bottom + PREVIEW_GAP
  const top = below + PREVIEW_HEIGHT <= window.innerHeight - VIEWPORT_PADDING
    ? below
    : Math.max(VIEWPORT_PADDING, rect.top - PREVIEW_HEIGHT - PREVIEW_GAP)

  return { left, top }
}

export function InternalLinkPreview() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestId = useRef(0)
  const anchorRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const cancelHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
    const hide = () => {
      cancelHide()
      requestId.current += 1
      hideTimer.current = setTimeout(() => {
        anchorRef.current = null
        setPreview(null)
      }, HIDE_DELAY)
    }
    const updatePosition = () => {
      if (!anchorRef.current) return
      setPreview(current => current && { ...current, ...getPreviewPosition(anchorRef.current!) })
    }
    const isPreviewable = (anchor: HTMLAnchorElement) => {
      const url = new URL(anchor.href)
      return url.origin === window.location.origin && url.pathname !== window.location.pathname && !anchor.hasAttribute("download")
    }
    const show = async (anchor: HTMLAnchorElement) => {
      if (!isPreviewable(anchor)) return
      cancelHide()
      if (anchorRef.current === anchor) return
      anchorRef.current = anchor
      const id = ++requestId.current
      const response = await fetch(`/api/doc-preview?href=${encodeURIComponent(anchor.href)}`)
      const { html } = await response.json()
      if (id !== requestId.current || !html) return
      setPreview({ html, ...getPreviewPosition(anchor) })
    }
    const onPointerOver = (event: PointerEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("[data-doc-content] a")
      if (anchor) void show(anchor)
    }
    const onPointerOut = (event: PointerEvent) => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>("[data-doc-content] a")
      if (anchor && !anchor.contains(event.relatedTarget as Node | null)) hide()
    }

    document.addEventListener("pointerover", onPointerOver)
    document.addEventListener("pointerout", onPointerOut)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      cancelHide()
      document.removeEventListener("pointerover", onPointerOver)
      document.removeEventListener("pointerout", onPointerOut)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [])

  if (!preview) return null

  return createPortal(
    <div
      className="prose prose-sm dark:prose-invert fixed z-50 max-h-[14.5rem] w-[22rem] overflow-hidden rounded-md border bg-popover p-4 text-popover-foreground shadow-lg"
      style={{ left: preview.left, top: preview.top }}
      onPointerEnter={() => hideTimer.current && clearTimeout(hideTimer.current)}
      onPointerLeave={() => {
        requestId.current += 1
        hideTimer.current = setTimeout(() => {
          anchorRef.current = null
          setPreview(null)
        }, HIDE_DELAY)
      }}
      dangerouslySetInnerHTML={{ __html: preview.html }}
    />,
    document.body,
  )
}
