import type React from "react"
import "../styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/siteSetting"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: {
    template: `%s | ${SITE_TITLE}`,
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  verification: {
    google: "aDwWKkJuoJbqULPjl_5adzrTrf_UzVDSzKfSKOyB9RQ",
  },
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={"overflow-y-scroll scrollbar"} suppressHydrationWarning>
    <body className={inter.className}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
    </body>
    </html>
  )
}

