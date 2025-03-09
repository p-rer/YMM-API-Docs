const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Ensure the output directory exists
const outputDir = path.join(process.cwd(), "out")
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Run the Next.js build and export
console.log("Building and exporting static site...")
execSync("next build", { stdio: "inherit" })

console.log("Static site generated successfully!")
console.log(`Output directory: ${outputDir}`)

