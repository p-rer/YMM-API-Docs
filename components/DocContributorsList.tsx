import { Fragment } from "react"
import Link from "next/link"
import type { DocContributors, DocPerson } from "@/lib/doc-contributors"
import { cn } from "@/lib/utils"

function Person({ person }: { person: DocPerson }) {
  if (!person.github) return <span>{person.name}</span>

  return (
    <Link
      href={`https://github.com/${person.github}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-foreground hover:underline"
    >
      {person.name}
    </Link>
  )
}

export function DocContributorsList({contributors, className}: {
  contributors?: DocContributors | null
  className?: string
}) {
  if (!contributors) return null

  const groups = [
    { label: "Authors", people: contributors.authors },
    { label: "Editors", people: contributors.editors },
    { label: "Contributors", people: contributors.contributors },
  ].filter((group) => group.people.length > 0)

  if (groups.length === 0) return null

  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground",
        className
      )}
    >
      {groups.map((group) => (
        <p key={group.label}>
          {group.label}:{" "}
          {group.people.map((person, index) => (
            <Fragment key={`${index}:${person.github ?? person.name}`}>
              {index > 0 && ", "}
              <Person person={person} />
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}
