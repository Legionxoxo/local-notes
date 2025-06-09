"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResultsProps {
    results: string[]
    query: string
    currentFile?: string
    onFileSelect: (filePath: string) => void
}

export function SearchResults({ results, query, currentFile, onFileSelect }: SearchResultsProps) {
    if (results.length === 0) {
        return (
            <div className="px-2 py-4 text-sm text-muted-foreground">
                {query.trim() ? "No matching files found" : "Type to search..."}
            </div>
        )
    }

    return (
        <div className="space-y-1">
            {results.map((filePath) => {
                const fileName = filePath.split("/").pop() || ""
                const folderPath = filePath.split("/").slice(0, -1).join("/")

                // Highlight matching text
                const lowerFileName = fileName.toLowerCase()
                const lowerQuery = query.toLowerCase()
                const index = lowerFileName.indexOf(lowerQuery)

                let displayName
                if (index !== -1 && query.trim()) {
                    const before = fileName.substring(0, index)
                    const match = fileName.substring(index, index + query.length)
                    const after = fileName.substring(index + query.length)
                    displayName = (
                        <>
                            {before}
                            <span className="bg-yellow-200 dark:bg-yellow-800">{match}</span>
                            {after}
                        </>
                    )
                } else {
                    displayName = fileName
                }

                return (
                    <div
                        key={filePath}
                        className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer",
                            currentFile === filePath && "bg-accent text-accent-foreground",
                        )}
                        onClick={() => onFileSelect(filePath)}
                    >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">
                                {typeof displayName === 'string'
                                    ? displayName.replace(".md", "")
                                    : displayName}
                            </span>
                            {folderPath && <span className="text-xs text-muted-foreground truncate">{folderPath}</span>}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
