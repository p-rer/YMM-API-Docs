import { notFound } from "next/navigation"
import { getAllDocPaths, getDocBySlug, getDocTree, getNextAndPrevDocs } from "@/lib/docs"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}
// Generate static params for all possible slug combinations
export async function generateStaticParams() {
  const paths = getAllDocPaths()

  // Filter out the root path as it's handled by the root page.tsx
  return paths.map((path) => {
    if (path === "") {
      return { slug: [] };
    }
    const slugArray = path.split("/");
    return { slug: slugArray };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata | undefined> {
  try {
    const slug = (await params).slug.join("/")
    const doc = await getDocBySlug(slug)

    if (!doc) {
      return
    }

    return {
      title: doc.title,
      description: doc.description,
      openGraph: {
        images: [`/og?title=${doc.title}`],
      },
    }
  } catch (error) {
    console.log(error)
  }
}

import { DocsLayout } from "../docs-layout"

export default async function DocPage({ params }: Props) {
  try {
    const slug = (await params).slug?.length ? (await params).slug.join("/") : "";

    const doc = await getDocBySlug(slug)

    if (!doc) {
      notFound()
    }

    const docTree = await getDocTree()
    const prevNext = await getNextAndPrevDocs(slug)

    // Ensure proper links for navigation
    if (prevNext.prev && prevNext.prev.slug === "") {
      prevNext.prev.slug = "" // Keep empty for root, will be handled in the component
    }

    if (prevNext.next && prevNext.next.slug === "") {
      prevNext.next.slug = "" // Keep empty for root, will be handled in the component
    }

    return (
      <DocsLayout
        docTree={docTree}
        toc={Array.isArray(doc.toc) ? doc.toc : []}
        title={doc.title}
        lastUpdated={doc.lastUpdated}
        breadcrumbs={doc.breadcrumbs}
        prevNext={prevNext}
      >
        <div dangerouslySetInnerHTML={{ __html: doc.content }} />
      </DocsLayout>
    )
  } catch (error) {
    console.error("Error rendering page:", error)
    notFound()
  }
}

