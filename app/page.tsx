import { getDocBySlug, getDocTree, getNextAndPrevDocs } from "@/lib/docs"
import { DocsLayout } from "./docs-layout"

// Add searchParams to match Next.js expectations
interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Add dynamic metadata generation
export async function generateMetadata() {
  try {
    const doc = await getDocBySlug("")

    if (!doc) {
      return {
        title: "Documentation Home",
        description: "Static documentation site home page",
      }
    }

    return {
      title: doc.title,
      description: doc.frontmatter.description || `${doc.title} - Documentation`,
    }
  } catch (error) {
    console.error("Error generating homepage metadata:", error)
    return {
      title: "Documentation Home",
      description: "Static documentation site home page",
    }
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  try {
    const doc = await getDocBySlug("")

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

