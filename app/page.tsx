import { getDocBySlug, getDocTree, getNextAndPrevDocs } from "@/lib/docs"
import { DocsLayout } from "./docs-layout"
import { generateOgImageStatic } from "@/lib/og";
import { title } from "process";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/siteSetting";
import {Metadata} from "next";

// Add dynamic metadata generation
export async function generateMetadata() {
  try {
    const doc = await getDocBySlug("")

    const imageDataUri = await generateOgImageStatic("HOME", "");
    if (!doc) {
      return {
        title: {SITE_TITLE},
        description: {SITE_DESCRIPTION},
        openGraph: {
          images: [imageDataUri],
          title: {SITE_TITLE}
        }
      }
    }
  } catch (error) {
    console.error("Error generating homepage metadata:", error)
    return {
      title: {SITE_TITLE},
      description: {SITE_DESCRIPTION},
    }
  }
}

export default async function HomePage() {
  try {
    const doc = await getDocBySlug("", true)

    if (!doc) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center">
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
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">Error Loading Documentation</h1>
        <p className="mt-4">There was an error loading the documentation. Please check your content files.</p>
      </div>
    )
  }
}

