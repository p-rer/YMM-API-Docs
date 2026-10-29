"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

type Preview = {
  html: string
  left: number
  top: number
}

const SHOW_DELAY = 1000
const HIDE_DELAY = 250
const PREVIEW_WIDTH = 448
const PREVIEW_HEIGHT = 420
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
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingAnchorRef = useRef<HTMLAnchorElement | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestId = useRef(0)
  const anchorRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const cancelShow = () => {
      if (showTimer.current !== undefined) {
        clearTimeout(showTimer.current)
        showTimer.current = undefined
      }
      pendingAnchorRef.current = null
    }

    const cancelHide = () => {
      if (hideTimer.current !== undefined) {
        clearTimeout(hideTimer.current)
        hideTimer.current = undefined
      }
    }

    const clearPreview = () => {
      cancelShow()
      cancelHide()
      requestId.current += 1
      anchorRef.current = null
      setPreview(null)
    }

    const hide = () => {
      cancelHide()
      hideTimer.current = setTimeout(() => {
        hideTimer.current = undefined
        anchorRef.current = null
        requestId.current += 1
        setPreview(null)
      }, HIDE_DELAY)
    }

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor || !anchor.isConnected) {
        clearPreview()
        return
      }
      setPreview(current => current ? { ...current, ...getPreviewPosition(anchor) } : null)
    }

    const isPreviewable = (anchor: HTMLAnchorElement) => {
      if (!anchor.hasAttribute("href") || anchor.hasAttribute("download")) return false

      try {
        const url = new URL(anchor.href, window.location.href)
        return (
          (url.protocol === "http:" || url.protocol === "https:") &&
          url.origin === window.location.origin &&
          url.pathname !== window.location.pathname
        )
      } catch {
        return false
      }
    }

    const show = async (anchor: HTMLAnchorElement) => {
      cancelHide()

      if (!isPreviewable(anchor)) {
        clearPreview()
        return
      }

      if (anchorRef.current === anchor) return

      anchorRef.current = anchor
      const id = ++requestId.current
      setPreview(null)

      try {
        // Resolve same-origin redirects (including API reference aliases) before
        // requesting the preview for the final document URL.
        const targetUrl = new URL(anchor.href, window.location.href)
        const response = await fetch(
          `/api/doc-preview?href=${encodeURIComponent(targetUrl.href)}`,
          { headers: { Accept: "application/json" }, redirect: "follow" },
        )
        if (!response.ok) return

        const data: { html?: unknown } = await response.json()
        if (
          id !== requestId.current ||
          anchorRef.current !== anchor ||
          !anchor.isConnected ||
          typeof data.html !== "string" ||
          !data.html.trim()
        ) {
          return
        }

        setPreview({ html: data.html, ...getPreviewPosition(anchor) })
      } catch {
        // A preview failure must not interfere with normal link navigation.
      }
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>("[data-doc-content] a[href]")
      if (!anchor) return
      if (anchorRef.current === anchor || pendingAnchorRef.current === anchor) return
      cancelShow()
      if (!isPreviewable(anchor)) {
        clearPreview()
        return
      }
      pendingAnchorRef.current = anchor
      showTimer.current = setTimeout(() => {
        showTimer.current = undefined
        pendingAnchorRef.current = null
        void show(anchor)
      }, SHOW_DELAY)
    }

    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>("[data-doc-content] a[href]")
      if (!anchor || anchor.contains(event.relatedTarget as Node | null)) return
      if (pendingAnchorRef.current === anchor) cancelShow()

      // Keep the preview open while the pointer moves from its source link into the card.
      if (event.relatedTarget instanceof Element && event.relatedTarget.closest("[data-internal-link-preview]")) return
      hide()
    }

    document.addEventListener("pointerover", onPointerOver)
    document.addEventListener("pointerout", onPointerOut)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)

    return () => {
      cancelShow()
      cancelHide()
      requestId.current += 1
      document.removeEventListener("pointerover", onPointerOver)
      document.removeEventListener("pointerout", onPointerOut)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [])

  if (!preview) return null

  return createPortal(
    <div
      data-internal-link-preview
      className="prose prose-sm dark:prose-invert fixed z-50 max-h-[min(70vh,26.25rem)] w-[min(28rem,calc(100vw-1rem))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border bg-popover p-4 text-popover-foreground shadow-lg [&_a]:pointer-events-none [&_a]:cursor-text"
      style={{ left: preview.left, top: preview.top }}
      onPointerEnter={() => {
        if (hideTimer.current !== undefined) {
          clearTimeout(hideTimer.current)
          hideTimer.current = undefined
        }
      }}
      onPointerLeave={() => {
        if (hideTimer.current !== undefined) clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => {
          hideTimer.current = undefined
          requestId.current += 1
          anchorRef.current = null
          setPreview(null)
        }, HIDE_DELAY)
      }}
      dangerouslySetInnerHTML={{ __html: preview.html }}
    />,
    document.body,
  )
}
