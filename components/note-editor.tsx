"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Save, Eye, Edit } from "lucide-react"
import { markdownToEditorJS, editorJSToMarkdown } from "@/lib/markdown-converter"
import { getEditorTools } from "@/lib/editor-tools"

interface NoteEditorProps {
  fileName: string
  initialContent: any
  onSave: (content: any) => void
}

// Debounce utility
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay],
  )
}

export function NoteEditor({ fileName, initialContent, onSave }: NoteEditorProps) {
  const [editor, setEditor] = useState<any>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)

  // Debounced auto-save function
  const debouncedAutoSave = useDebounce(async (content: any) => {
    if (!autoSaveEnabled) return

    setIsSaving(true)
    try {
      await onSave(content)
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, 3000) // 3 second delay

  // Initialize editor only once per file
  useEffect(() => {
    if (isInitializedRef.current) {
      // Clean up previous editor
      if (editor) {
        editor.destroy()
        setEditor(null)
      }
    }

    const initEditor = async () => {
      if (typeof window !== "undefined" && editorContainerRef.current) {
        // Clear the container
        editorContainerRef.current.innerHTML = ""

        const EditorJS = (await import("@editorjs/editorjs")).default
        const tools = await getEditorTools()

        // Prepare initial data
        let editorData = { blocks: [] }
        if (initialContent) {
          if (typeof initialContent === "string") {
            editorData = markdownToEditorJS(initialContent)
            setMarkdownContent(initialContent)
          } else {
            editorData = initialContent
            const markdown = editorJSToMarkdown(initialContent)
            setMarkdownContent(markdown)
          }
        }

        try {
          const editorInstance = new EditorJS({
            holder: editorContainerRef.current,
            placeholder: "Start writing your note...",
            autofocus: true,
            tools,
            data: editorData,
            onChange: async () => {
              if (editorInstance) {
                try {
                  const content = await editorInstance.save()
                  const markdown = editorJSToMarkdown(content)
                  setMarkdownContent(markdown)

                  // Trigger debounced auto-save
                  if (autoSaveEnabled) {
                    debouncedAutoSave(content)
                  }
                } catch (error) {
                  console.error("Error in onChange:", error)
                }
              }
            },
            onReady: () => {
              console.log("Editor is ready for:", fileName)
            },
          })

          setEditor(editorInstance)
          isInitializedRef.current = true
        } catch (error) {
          console.error("Error initializing editor:", error)
        }
      }
    }

    initEditor()

    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [fileName]) // Only re-initialize when fileName changes

  const handleManualSave = async () => {
    if (editor) {
      try {
        setIsSaving(true)
        const content = await editor.save()
        await onSave(content)
      } catch (error) {
        console.error("Error saving manually:", error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const togglePreview = () => {
    setIsPreview(!isPreview)
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{fileName.replace(".md", "")}</h1>
          {isSaving && <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-save"
              checked={autoSaveEnabled}
              onCheckedChange={setAutoSaveEnabled}
              className="data-[state=checked]:bg-green-600"
            />
            <Label htmlFor="auto-save" className="text-sm">
              Auto-save
            </Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={togglePreview} variant="outline" size="sm">
              {isPreview ? <Edit className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {isPreview ? "Edit" : "Preview"}
            </Button>
            <Button onClick={handleManualSave} size="sm" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor/Preview - Scrollable */}
      <div className="flex-1 overflow-auto">
        {isPreview ? (
          <div className="p-6 max-w-4xl mx-auto">
            <div
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: markdownContent
                  .split("\n")
                  .map((line) => {
                    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`
                    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`
                    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`
                    if (line.startsWith("#### ")) return `<h4>${line.slice(5)}</h4>`
                    if (line.startsWith("##### ")) return `<h5>${line.slice(6)}</h5>`
                    if (line.startsWith("###### ")) return `<h6>${line.slice(7)}</h6>`
                    if (line.startsWith("> ")) return `<blockquote><p>${line.slice(2)}</p></blockquote>`
                    if (line.startsWith("- ")) return `<ul><li>${line.slice(2)}</li></ul>`
                    if (line.startsWith("* ")) return `<ul><li>${line.slice(2)}</li></ul>`
                    if (line.match(/^\d+\. /)) return `<ol><li>${line.replace(/^\d+\. /, "")}</li></ol>`
                    if (line.startsWith("```")) return line.includes("```") ? "<pre><code>" : "</code></pre>"
                    if (line.trim() === "") return "<br>"
                    return `<p>${line}</p>`
                  })
                  .join(""),
              }}
            />
          </div>
        ) : (
          <div className="p-6 h-full">
            <div
              ref={editorContainerRef}
              className="min-h-full prose prose-slate dark:prose-invert max-w-none"
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
