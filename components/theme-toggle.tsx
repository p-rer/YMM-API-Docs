"use client"

import {useTheme} from "next-themes"
import {useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {Moon, Sun, Laptop} from "lucide-react"
import {cn} from "@/lib/utils";

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({className}: ThemeToggleProps) {
  const {theme, setTheme} = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className={cn(className, "w-9 h-9")}/>
  }

  return (
    <DropdownMenu>
        <Button variant="ghost" size="icon" className={cn(className, "w-9 h-9 lg:w-auto p-2")} onClick={() => 
        theme === "system" ? setTheme("light") : (
          theme === "light" ? setTheme("dark") : setTheme("system"))}>
          <div className="flex items-center justify-center lg:justify-start">
            <Sun
              className={theme ==="light" ? "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" : "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-90 scale-0"}/>
            <Moon
              className={theme ==="dark" ? "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" : "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-90 scale-0"}/>
            <Laptop
              className={theme ==="system" ? "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" : "absolute h-[1.2rem] w-[1.2rem] transition-all rotate-90 scale-0"}/>
            <span className="hidden lg:flex ml-6">{theme?.toUpperCase()}</span>
          </div>
          <span className=" sr-only">Toggle theme</span>
        </Button>
    </DropdownMenu>
  )
}

