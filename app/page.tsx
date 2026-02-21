import { getDocBySlug, getDocTree, getNextAndPrevDocs } from "@/lib/docs"
import { DocsLayout } from "./docs-layout"
import { generateOgImageFile } from "@/lib/og";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/siteSetting";
import {Metadata} from "next";

// Add dynamic metadata generation
export async function generateMetadata() : Promise<Metadata | undefined> {
  try {
    const doc = await getDocBySlug("")

    const title = doc?.title || SITE_TITLE
    const description = doc?.description || SITE_DESCRIPTION
    const lastUpdate = doc?.lastUpdated ? String(doc.lastUpdated.getTime()) : ""
    const imageUrl = await generateOgImageFile("home", title, lastUpdate)

    return {
      title,
      description,
      alternates: {
        canonical: "/",
      },
      openGraph: {
        title,
        description,
        type: "website",
        url: SITE_URL,
        siteName: SITE_TITLE,
        images: [imageUrl],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    }
  } catch (error) {
    console.error("Error generating homepage metadata:", error)
    return {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    }
  }
}

export default async function HomePage() {
  try {
    const doc = await getDocBySlug("", true)

    if (!doc) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center">
          <h1 className="text-3xl font-bold">Welcome to Documentation</h1>
          <p className="mt-4">Please create an index.md file in your content directory.</p>
        </div>
      )
    }

    const docTree = await getDocTree()
    const prevNext = await getNextAndPrevDocs("")

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
    console.error("Error rendering homepage:", error)
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">Error Loading Documentation</h1>
        <p className="mt-4">There was an error loading the documentation. Please check your content files.</p>
      </div>
    )
  }
}
