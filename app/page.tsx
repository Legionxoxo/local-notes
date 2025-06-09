"use client"

import { useState, useEffect } from "react"
import { FileTree } from "@/components/file-tree"
import { NoteEditor } from "@/components/note-editor"
import { VaultSelector } from "@/components/vault-selector"
import { VaultManager } from "@/components/vault-manager"
import { useFileSystem } from "@/hooks/use-file-system"

export default function NoteTakingApp() {
  const {
    currentVault,
    availableVaults,
    files,
    folders,
    currentFile,
    selectDirectory,
    switchVault,
    createFile,
    createFolder,
    renameFile,
    renameFolder,
    openFile,
    saveFile,
    deleteFile,
    deleteFolder,
    refreshFiles,
    moveFile,
    deleteVault,
    createNewVault,
  } = useFileSystem()

  const [editorContent, setEditorContent] = useState<any>(null)

  // Load welcome.md when vault is first created
  useEffect(() => {
    if (currentVault && files.includes("welcome.md") && !currentFile) {
      handleFileSelect("welcome.md")
    }
  }, [currentVault, files, currentFile])

  const handleSave = async (content: any) => {
    if (currentFile) {
      await saveFile(currentFile.path, content)
      setEditorContent(content)
    }
  }

  const handleFileSelect = async (filePath: string) => {
    const content = await openFile(filePath)
    setEditorContent(content)
  }

  const handleCreateFile = async (fileName: string, folderPath?: string) => {
    await createFile(fileName, folderPath)
    await refreshFiles()
  }

  const handleCreateFolder = async (folderName: string, parentPath?: string) => {
    await createFolder(folderName, parentPath)
    await refreshFiles()
  }

  const handleRenameFile = async (oldPath: string, newName: string) => {
    try {
      await renameFile(oldPath, newName)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to rename file:", error)
      alert("Failed to rename file. Please try again.")
    }
  }

  const handleRenameFolder = async (oldPath: string, newName: string) => {
    try {
      await renameFolder(oldPath, newName)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to rename folder:", error)
      alert("Failed to rename folder. Please try again.")
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    try {
      await deleteFile(filePath)
    } catch (error) {
      console.error("Failed to delete file:", error)
      alert("Failed to delete file. Please try again.")
    }
  }

  const handleDeleteFolder = async (folderPath: string) => {
    try {
      await deleteFolder(folderPath)
    } catch (error) {
      console.error("Failed to delete folder:", error)
      alert("Failed to delete folder. Please try again.")
    }
  }

  const handleFileDrop = async (filePath: string, targetFolder: string) => {
    try {
      await moveFile(filePath, targetFolder)
      await refreshFiles()
    } catch (error) {
      console.error("Failed to move file:", error)
      alert("Failed to move file. Please try again.")
    }
  }

  // Show vault selector if no vault is selected
  if (!currentVault) {
    return <VaultSelector onSelectVault={selectDirectory} />
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Fixed Height */}
      <div className="w-80 border-r border-border flex flex-col h-full">
        {/* Sidebar Header - Fixed */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">{currentVault.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">Vault: {currentVault.name}</p>
        </div>

        {/* File Tree - Scrollable */}
        <div className="flex-1 overflow-auto">
          <FileTree
            files={files}
            folders={folders}
            currentFile={currentFile?.path}
            onFileSelect={handleFileSelect}
            onFileDrop={handleFileDrop}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRenameFile={handleRenameFile}
            onRenameFolder={handleRenameFolder}
            onDeleteFile={handleDeleteFile}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* Vault Manager - Fixed at Bottom */}
        <VaultManager
          currentVault={currentVault}
          availableVaults={availableVaults}
          onCreateNewVault={createNewVault}
          onDeleteVault={deleteVault}
          onSwitchVault={switchVault}
        />
      </div>

      {/* Main Editor - Full Height */}
      <div className="flex-1 h-full">
        {currentFile ? (
          <NoteEditor
            key={currentFile.path}
            fileName={currentFile.name}
            initialContent={editorContent}
            onSave={handleSave}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to Your Vault</h2>
              <p>Create your first note to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
