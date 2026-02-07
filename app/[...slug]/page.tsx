import { notFound } from "next/navigation"
import {getAllDocPaths, getDocBySlug, getDocTree, getNextAndPrevDocs} from "@/lib/docs"
import type { Metadata } from "next"
import {generateOgImageFile} from "@/lib/og";
import {format} from "date-fns";
import { SITE_TITLE, SITE_URL } from "@/lib/siteSetting";

type Props = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Generate static params for all possible slug combinations
export async function generateStaticParams() {
  const paths = getAllDocPaths()

  // Filter out the root path as it's handled by the root page.tsx
  return paths
    .filter(path => path !== "")
    .map((path) => {
      if (path === "") {
        return { slug: [] };
      }
      const slugArray = path.split("/");
      return { slug: slugArray };
    });
}

export async function generateMetadata({ params }: Props): Promise<Metadata | undefined> {
  try {
    if (!(await params).slug || (await params).slug.length === 0) {
      return undefined;
    }
    const slug = (await params).slug.join("/")
    const doc = await getDocBySlug(slug)

    if (!doc) {
      return
    }
    const imageName = slug.replace(/\//g, "-")
    const imageUrl = await generateOgImageFile(
      `doc-${imageName}-${doc.lastUpdated.getTime()}`,
      doc.title,
      format(doc.lastUpdated, "MMMM d, yyyy"),
    )

    return {
      title: doc.title,
      description: doc.description,
      alternates: {
        canonical: `/${slug}`,
      },
      openGraph: {
        title: doc.title,
        description: doc.description,
        type: "article",
        url: `${SITE_URL}/${slug}`,
        siteName: SITE_TITLE,
        images: [imageUrl],
      },
      twitter: {
        card: "summary_large_image",
        title: doc.title,
        description: doc.description,
        images: [imageUrl],
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
        githubRepoEditUrl={doc.githubEditUrl}
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
