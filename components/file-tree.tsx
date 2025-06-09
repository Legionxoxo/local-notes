"use client"

import type React from "react"

import { useState } from "react"
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown, Plus, FolderPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface FileInfo {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileInfo[]
}

interface FileTreeProps {
  files: string[]
  folders: string[]
  currentFile?: string
  onFileSelect: (filePath: string) => void
  onFileDrop: (filePath: string, targetFolder: string) => void
  onCreateFile: (fileName: string, folderPath?: string) => void
  onCreateFolder: (folderName: string, parentPath?: string) => void
  onRenameFile: (oldPath: string, newName: string) => void
  onRenameFolder: (oldPath: string, newName: string) => void
  onDeleteFile: (filePath: string) => void
  onDeleteFolder: (folderPath: string) => void
}

export function FileTree({
  files,
  folders,
  currentFile,
  onFileSelect,
  onFileDrop,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{ path: string; type: "file" | "folder" } | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [creatingItem, setCreatingItem] = useState<{ type: "file" | "folder"; parentPath?: string } | null>(null)
  const [creatingValue, setCreatingValue] = useState("")

  // Organize files and folders into a tree structure
  const organizeItems = (): FileInfo[] => {
    const items: FileInfo[] = []

    // Add folders first
    folders.forEach((folder) => {
      items.push({
        name: folder,
        path: folder,
        type: "folder",
        children: [],
      })
    })

    // Add files
    files
      .filter((file) => file.endsWith(".md"))
      .forEach((file) => {
        const pathParts = file.split("/")
        if (pathParts.length === 1) {
          // Root level file
          items.push({
            name: file,
            path: file,
            type: "file",
          })
        } else {
          // File in a folder
          const folderName = pathParts[0]
          let folder = items.find((item) => item.type === "folder" && item.name === folderName)
          if (!folder) {
            folder = {
              name: folderName,
              path: folderName,
              type: "folder",
              children: [],
            }
            items.push(folder)
          }
          folder.children!.push({
            name: pathParts[pathParts.length - 1],
            path: file,
            type: "file",
          })
        }
      })

    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const handleDragStart = (e: React.DragEvent, filePath: string) => {
    setDraggedFile(filePath)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault()
    if (draggedFile && draggedFile !== targetFolder) {
      onFileDrop(draggedFile, targetFolder)
    }
    setDraggedFile(null)
  }

  const startEditing = (path: string, type: "file" | "folder") => {
    const name = type === "file" ? path.split("/").pop()?.replace(".md", "") || "" : path.split("/").pop() || ""
    setEditingItem({ path, type })
    setEditingValue(name)
  }

  const finishEditing = () => {
    if (editingItem && editingValue.trim()) {
      if (editingItem.type === "file") {
        onRenameFile(editingItem.path, editingValue.trim())
      } else {
        onRenameFolder(editingItem.path, editingValue.trim())
      }
    }
    setEditingItem(null)
    setEditingValue("")
  }

  const startCreating = (type: "file" | "folder", parentPath?: string) => {
    setCreatingItem({ type, parentPath })
    setCreatingValue("")
  }

  const finishCreating = () => {
    if (creatingItem && creatingValue.trim()) {
      if (creatingItem.type === "file") {
        const fileName = creatingValue.trim().endsWith(".md") ? creatingValue.trim() : `${creatingValue.trim()}.md`
        onCreateFile(fileName, creatingItem.parentPath)
      } else {
        onCreateFolder(creatingValue.trim(), creatingItem.parentPath)
      }
    }
    setCreatingItem(null)
    setCreatingValue("")
  }

  const handleDeleteItem = (path: string, type: "file" | "folder") => {
    if (type === "file") {
      onDeleteFile(path)
    } else {
      onDeleteFolder(path)
    }
  }

  const renderItem = (item: FileInfo, level = 0) => {
    const isExpanded = expandedFolders.has(item.path)
    const paddingLeft = level * 16
    const isEditing = editingItem?.path === item.path

    if (item.type === "folder") {
      return (
        <div key={item.path}>
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors group",
              draggedFile && "border-2 border-dashed border-muted-foreground/50",
            )}
            style={{ paddingLeft: paddingLeft + 8 }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item.path)}
          >
            <button onClick={() => toggleFolder(item.path)} className="flex items-center gap-1 flex-1 min-w-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 flex-shrink-0" />
              )}
              {isEditing ? (
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={finishEditing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishEditing()
                    if (e.key === "Escape") {
                      setEditingItem(null)
                      setEditingValue("")
                    }
                  }}
                  className="h-6 text-sm"
                  autoFocus
                />
              ) : (
                <span className="truncate" onDoubleClick={() => startEditing(item.path, "folder")}>
                  {item.name}
                </span>
              )}
            </button>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => startCreating("file", item.path)}
                title="New file"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => startCreating("folder", item.path)}
                title="New folder"
              >
                <FolderPlus className="w-3 h-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the folder "{item.name}" and all its contents? This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteItem(item.path, "folder")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {isExpanded && (
            <div>
              {creatingItem?.parentPath === item.path && (
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm"
                  style={{ paddingLeft: paddingLeft + 32 }}
                >
                  {creatingItem.type === "file" ? (
                    <FileText className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 flex-shrink-0" />
                  )}
                  <Input
                    value={creatingValue}
                    onChange={(e) => setCreatingValue(e.target.value)}
                    onBlur={finishCreating}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishCreating()
                      if (e.key === "Escape") {
                        setCreatingItem(null)
                        setCreatingValue("")
                      }
                    }}
                    placeholder={creatingItem.type === "file" ? "File name" : "Folder name"}
                    className="h-6 text-sm"
                    autoFocus
                  />
                </div>
              )}
              {item.children && item.children.map((child) => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div
          key={item.path}
          draggable
          onDragStart={(e) => handleDragStart(e, item.path)}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors group",
            currentFile === item.path && "bg-accent text-accent-foreground",
            draggedFile === item.path && "opacity-50",
          )}
          style={{ paddingLeft: paddingLeft + 8 }}
          onClick={() => !isEditing && onFileSelect(item.path)}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          {isEditing ? (
            <Input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishEditing()
                if (e.key === "Escape") {
                  setEditingItem(null)
                  setEditingValue("")
                }
              }}
              className="h-6 text-sm"
              autoFocus
            />
          ) : (
            <span className="truncate flex-1" onDoubleClick={() => startEditing(item.path, "file")}>
              {item.name.replace(".md", "")}
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 ml-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  title="Delete file"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete File</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{item.name.replace(".md", "")}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteItem(item.path, "file")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )
    }
  }

  const organizedItems = organizeItems()

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm font-medium">Files</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => startCreating("file")}
            title="New file"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => startCreating("folder")}
            title="New folder"
          >
            <FolderPlus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        {creatingItem && !creatingItem.parentPath && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm">
            {creatingItem.type === "file" ? (
              <FileText className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 flex-shrink-0" />
            )}
            <Input
              value={creatingValue}
              onChange={(e) => setCreatingValue(e.target.value)}
              onBlur={finishCreating}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishCreating()
                if (e.key === "Escape") {
                  setCreatingItem(null)
                  setCreatingValue("")
                }
              }}
              placeholder={creatingItem.type === "file" ? "File name" : "Folder name"}
              className="h-6 text-sm"
              autoFocus
            />
          </div>
        )}
        {organizedItems.map((item) => renderItem(item))}
        {organizedItems.length === 0 && !creatingItem && (
          <p className="text-sm text-muted-foreground px-2 py-4">No files found. Create your first note!</p>
        )}
      </div>
    </div>
  )
}
