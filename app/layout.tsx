import type React from "react"
import "../styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/siteSetting"
import {Metadata} from "next";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] })

export const metadata : Metadata = {
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
    <html lang="en" className={"overflow-y-scroll overflow-x-hidden"} suppressHydrationWarning>
    <body className={inter.className}>
    <NextTopLoader color={"#0a0a0a"} />
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
    </body>
    </html>
  )
}

