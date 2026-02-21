import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="mt-2 text-xl">Page Not Found</h2>
      <p className="mt-4 text-center text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  )
}

