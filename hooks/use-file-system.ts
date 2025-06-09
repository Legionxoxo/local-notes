"use client";

import { useState, useCallback } from "react";
import {
    markdownToEditorJS,
    editorJSToMarkdown,
} from "@/lib/markdown-converter";

interface FileInfo {
    name: string;
    path: string;
    handle: FileSystemFileHandle;
}

interface VaultInfo {
    name: string;
    handle: FileSystemDirectoryHandle;
    parentHandle: FileSystemDirectoryHandle;
}

export function useFileSystem() {
    const [currentVault, setCurrentVault] = useState<VaultInfo | null>(null);
    const [availableVaults, setAvailableVaults] = useState<VaultInfo[]>([]);
    const [files, setFiles] = useState<string[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);

    // Check if a directory is a valid vault
    const isValidVault = useCallback(
        async (dirHandle: FileSystemDirectoryHandle): Promise<boolean> => {
            try {
                // Check for vault marker file
                await dirHandle.getFileHandle(".vault-marker");
                return true;
            } catch {
                // If no marker file, check if it has any .md files (legacy vaults)
                try {
                    for await (const [name, handle] of (
                        dirHandle as any
                    ).entries()) {
                        if (handle.kind === "file" && name.endsWith(".md")) {
                            return true;
                        }
                    }
                    return false;
                } catch {
                    return false;
                }
            }
        },
        []
    );

    const selectDirectory = useCallback(
        async (vaultName: string) => {
            try {
                if ("showDirectoryPicker" in window) {
                    // Let user select the parent directory
                    const parentHandle = await (
                        window as any
                    ).showDirectoryPicker();

                    // Create the vault folder inside the selected directory
                    const vaultHandle = await parentHandle.getDirectoryHandle(
                        vaultName,
                        { create: true }
                    );

                    // Create vault marker file
                    const markerHandle = await vaultHandle.getFileHandle(
                        ".vault-marker",
                        { create: true }
                    );
                    const markerWritable = await markerHandle.createWritable();
                    await markerWritable.write(
                        JSON.stringify({
                            created: new Date().toISOString(),
                            version: "1.0.0",
                            name: vaultName,
                        })
                    );
                    await markerWritable.close();

                    // Create welcome.md file
                    const welcomeContent = `# Welcome to ${vaultName}

Welcome to your new vault! This is your personal knowledge base where you can:

## Getting Started

- **Create notes**: Click the + button to create a new note
- **Organize**: Create folders to organize your notes
- **Rich editing**: Use the toolbar to format your text with headers, lists, tables, and more
- **Auto-save**: Your notes are automatically saved as you type

## Features

### Text Formatting
- **Bold** and *italic* text
- Headers (H1 through H6)
- Lists and checklists
- Code blocks and inline code
- Tables
- Quotes

### Organization
- Create folders and subfolders
- Drag and drop files between folders
- Search across all your notes

### File Format
All your notes are saved as standard Markdown (.md) files, so you can:
- Open them in any text editor
- Use them with other note-taking apps
- Version control them with Git
- Share them easily

---

Happy note-taking! 📝
`;

                    const welcomeFileHandle = await vaultHandle.getFileHandle(
                        "welcome.md",
                        { create: true }
                    );
                    const writable = await welcomeFileHandle.createWritable();
                    await writable.write(welcomeContent);
                    await writable.close();

                    const vaultInfo: VaultInfo = {
                        name: vaultName,
                        handle: vaultHandle,
                        parentHandle: parentHandle,
                    };

                    setCurrentVault(vaultInfo);
                    await refreshFiles(vaultHandle);
                    await loadAvailableVaults(parentHandle);

                    // Set welcome.md as the current file
                    setCurrentFile({
                        name: "welcome.md",
                        path: "welcome.md",
                        handle: welcomeFileHandle,
                    });
                }
            } catch (error) {
                console.error("Error creating vault:", error);
                throw error;
            }
        },
        [isValidVault]
    );

    const loadAvailableVaults = useCallback(
        async (parentHandle: FileSystemDirectoryHandle) => {
            try {
                const vaults: VaultInfo[] = [];
                for await (const [name, handle] of (
                    parentHandle as any
                ).entries()) {
                    if (handle.kind === "directory") {
                        const dirHandle = handle as FileSystemDirectoryHandle;
                        if (await isValidVault(dirHandle)) {
                            vaults.push({
                                name,
                                handle: dirHandle,
                                parentHandle,
                            });
                        }
                    }
                }
                setAvailableVaults(vaults);
            } catch (error) {
                console.error("Error loading available vaults:", error);
            }
        },
        [isValidVault]
    );

    const switchVault = useCallback(async (vaultInfo: VaultInfo) => {
        try {
            setCurrentVault(vaultInfo);
            await refreshFiles(vaultInfo.handle);
            setCurrentFile(null);
        } catch (error) {
            console.error("Error switching vault:", error);
        }
    }, []);

    const refreshFiles = useCallback(
        async (handle?: FileSystemDirectoryHandle) => {
            const dirHandle = handle || currentVault?.handle;
            if (!dirHandle) return;

            try {
                const fileList: string[] = [];
                const folderList: string[] = [];

                const scanDirectory = async (
                    currentHandle: FileSystemDirectoryHandle,
                    currentPath = ""
                ) => {
                    for await (const [name, entryHandle] of (
                        currentHandle as any
                    ).entries()) {
                        // Skip hidden files and vault marker
                        if (name.startsWith(".")) continue;

                        const fullPath = currentPath
                            ? `${currentPath}/${name}`
                            : name;

                        if (entryHandle.kind === "file") {
                            fileList.push(fullPath);
                        } else if (entryHandle.kind === "directory") {
                            folderList.push(fullPath);
                            await scanDirectory(entryHandle, fullPath);
                        }
                    }
                };

                await scanDirectory(dirHandle);

                setFiles(fileList.sort());
                setFolders(folderList.sort());
            } catch (error) {
                console.error("Error reading directory:", error);
            }
        },
        [currentVault]
    );

    const createFile = useCallback(
        async (fileName: string, folderPath?: string) => {
            if (!currentVault) return;

            try {
                let targetHandle = currentVault.handle;

                if (folderPath) {
                    const pathParts = folderPath.split("/");
                    for (const part of pathParts) {
                        targetHandle = await targetHandle.getDirectoryHandle(
                            part,
                            { create: true }
                        );
                    }
                }

                const filePath = folderPath
                    ? `${folderPath}/${fileName}`
                    : fileName;
                const fileHandle = await targetHandle.getFileHandle(fileName, {
                    create: true,
                });
                const writable = await fileHandle.createWritable();
                await writable.write(
                    "# " +
                        fileName.replace(".md", "") +
                        "\n\nStart writing your note here..."
                );
                await writable.close();

                setCurrentFile({
                    name: fileName,
                    path: filePath,
                    handle: fileHandle,
                });
            } catch (error) {
                console.error("Error creating file:", error);
            }
        },
        [currentVault]
    );

    const createFolder = useCallback(
        async (folderName: string, parentPath?: string) => {
            if (!currentVault) return;

            try {
                let targetHandle = currentVault.handle;

                if (parentPath) {
                    const pathParts = parentPath.split("/");
                    for (const part of pathParts) {
                        targetHandle = await targetHandle.getDirectoryHandle(
                            part,
                            { create: true }
                        );
                    }
                }

                await targetHandle.getDirectoryHandle(folderName, {
                    create: true,
                });
            } catch (error) {
                console.error("Error creating folder:", error);
            }
        },
        [currentVault]
    );

    const renameFile = useCallback(
        async (oldPath: string, newName: string) => {
            if (!currentVault) return;

            try {
                // Read the file content first
                let sourceHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = oldPath.split("/");
                const oldFileName = pathParts.pop()!;

                // Navigate to source folder
                for (const part of pathParts) {
                    sourceHandle = await sourceHandle.getDirectoryHandle(part);
                }

                const sourceFileHandle = await sourceHandle.getFileHandle(
                    oldFileName
                );
                const file = await sourceFileHandle.getFile();
                const content = await file.text();

                // Create file with new name
                const newFileName = newName.endsWith(".md")
                    ? newName
                    : `${newName}.md`;
                const newFileHandle = await sourceHandle.getFileHandle(
                    newFileName,
                    { create: true }
                );
                const writable = await newFileHandle.createWritable();
                await writable.write(content);
                await writable.close();

                // Delete the original file
                await sourceHandle.removeEntry(oldFileName);

                // Update current file if it was the renamed file
                if (currentFile?.path === oldPath) {
                    const newPath =
                        pathParts.length > 0
                            ? `${pathParts.join("/")}/${newFileName}`
                            : newFileName;
                    setCurrentFile({
                        name: newFileName,
                        path: newPath,
                        handle: newFileHandle,
                    });
                }
            } catch (error) {
                console.error("Error renaming file:", error);
                throw error;
            }
        },
        [currentVault, currentFile]
    );

    const renameFolder = useCallback(
        async (oldPath: string, newName: string) => {
            if (!currentVault) return;

            try {
                // Get parent directory path and old folder name
                const pathParts = oldPath.split("/");
                const oldFolderName = pathParts.pop()!;
                const parentPath =
                    pathParts.length > 0 ? pathParts.join("/") : "";

                // Navigate to parent directory
                let parentHandle = currentVault.handle;
                if (parentPath) {
                    for (const part of pathParts) {
                        parentHandle = await parentHandle.getDirectoryHandle(
                            part
                        );
                    }
                }

                // Get the old folder handle
                const oldFolderHandle = await parentHandle.getDirectoryHandle(
                    oldFolderName
                );

                // Create new folder
                const newFolderHandle = await parentHandle.getDirectoryHandle(
                    newName,
                    { create: true }
                );

                // Helper function to recursively copy contents
                const copyFolderContents = async (
                    sourceHandle: FileSystemDirectoryHandle,
                    targetHandle: FileSystemDirectoryHandle,
                    sourcePath: string,
                    targetPath: string
                ) => {
                    // Copy all entries from source to target
                    for await (const [name, handle] of (
                        sourceHandle as any
                    ).entries()) {
                        const sourceItemPath = sourcePath
                            ? `${sourcePath}/${name}`
                            : name;
                        const targetItemPath = targetPath
                            ? `${targetPath}/${name}`
                            : name;

                        if (handle.kind === "file") {
                            // Copy file
                            const fileHandle = handle as FileSystemFileHandle;
                            const file = await fileHandle.getFile();
                            const content = await file.text();

                            const newFileHandle =
                                await targetHandle.getFileHandle(name, {
                                    create: true,
                                });
                            const writable =
                                await newFileHandle.createWritable();
                            await writable.write(content);
                            await writable.close();

                            // Update current file reference if needed
                            if (
                                currentFile &&
                                currentFile.path === sourceItemPath
                            ) {
                                setCurrentFile({
                                    name: currentFile.name,
                                    path: targetItemPath,
                                    handle: newFileHandle,
                                });
                            }
                        } else if (handle.kind === "directory") {
                            // Create and copy directory recursively
                            const dirHandle =
                                handle as FileSystemDirectoryHandle;
                            const newDirHandle =
                                await targetHandle.getDirectoryHandle(name, {
                                    create: true,
                                });

                            await copyFolderContents(
                                dirHandle,
                                newDirHandle,
                                sourceItemPath,
                                targetItemPath
                            );
                        }
                    }
                };

                // Start the recursive copy
                await copyFolderContents(
                    oldFolderHandle,
                    newFolderHandle,
                    oldPath,
                    parentPath ? `${parentPath}/${newName}` : newName
                );

                // Delete the old folder after successful copy
                await parentHandle.removeEntry(oldFolderName, {
                    recursive: true,
                });

                // Update any open file paths if they were in the renamed folder
                if (currentFile && currentFile.path.startsWith(oldPath + "/")) {
                    const newPath = currentFile.path.replace(
                        oldPath,
                        parentPath ? `${parentPath}/${newName}` : newName
                    );

                    // We don't need to update the handle as it was already updated during the copy
                    setCurrentFile({
                        ...currentFile,
                        path: newPath,
                    });
                }

                // Refresh file list
                await refreshFiles();
            } catch (error) {
                console.error("Error renaming folder:", error);
                throw error;
            }
        },
        [currentVault, currentFile, refreshFiles]
    );

    const openFile = useCallback(
        async (filePath: string) => {
            if (!currentVault) return null;

            try {
                let currentHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = filePath.split("/");
                const fileName = pathParts.pop()!;

                // Navigate to the correct folder
                for (const part of pathParts) {
                    currentHandle = await currentHandle.getDirectoryHandle(
                        part
                    );
                }

                const fileHandle = await currentHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                const content = await file.text();

                setCurrentFile({
                    name: fileName,
                    path: filePath,
                    handle: fileHandle,
                });

                // Convert markdown to EditorJS format
                return markdownToEditorJS(content);
            } catch (error) {
                console.error("Error opening file:", error);
                return null;
            }
        },
        [currentVault]
    );

    const saveFile = useCallback(
        async (filePath: string, content: any) => {
            if (!currentVault) return;

            try {
                let currentHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = filePath.split("/");
                const fileName = pathParts.pop()!;

                // Navigate to the correct folder
                for (const part of pathParts) {
                    currentHandle = await currentHandle.getDirectoryHandle(
                        part
                    );
                }

                const fileHandle = await currentHandle.getFileHandle(fileName, {
                    create: true,
                });
                const writable = await fileHandle.createWritable();

                // Convert EditorJS content to markdown
                const markdown = editorJSToMarkdown(content);
                await writable.write(markdown);
                await writable.close();
            } catch (error) {
                console.error("Error saving file:", error);
            }
        },
        [currentVault]
    );

    const deleteFile = useCallback(
        async (filePath: string) => {
            if (!currentVault) return;

            try {
                let currentHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = filePath.split("/");
                const fileName = pathParts.pop()!;

                // Navigate to the correct folder
                for (const part of pathParts) {
                    currentHandle = await currentHandle.getDirectoryHandle(
                        part
                    );
                }

                await currentHandle.removeEntry(fileName);

                // If the deleted file was the current file, clear it
                if (currentFile?.path === filePath) {
                    setCurrentFile(null);
                }

                // Refresh files list
                await refreshFiles();
            } catch (error) {
                console.error("Error deleting file:", error);
                throw error;
            }
        },
        [currentVault, currentFile, refreshFiles]
    );

    const deleteFolder = useCallback(
        async (folderPath: string) => {
            if (!currentVault) return;

            try {
                let parentHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = folderPath.split("/");
                const folderName = pathParts.pop()!;

                // Navigate to parent folder
                for (const part of pathParts) {
                    parentHandle = await parentHandle.getDirectoryHandle(part);
                }

                // Delete the folder recursively
                await parentHandle.removeEntry(folderName, { recursive: true });

                // If the current file was in this folder, clear it
                if (currentFile?.path.startsWith(folderPath)) {
                    setCurrentFile(null);
                }

                // Refresh files list
                await refreshFiles();
            } catch (error) {
                console.error("Error deleting folder:", error);
                throw error;
            }
        },
        [currentVault, currentFile, refreshFiles]
    );

    const moveFile = useCallback(
        async (filePath: string, targetFolderPath: string) => {
            if (!currentVault) return;

            try {
                // First, read the file content
                let sourceHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                const pathParts = filePath.split("/");
                const fileName = pathParts.pop()!;

                // Navigate to source folder
                for (const part of pathParts) {
                    sourceHandle = await sourceHandle.getDirectoryHandle(part);
                }

                const sourceFileHandle = await sourceHandle.getFileHandle(
                    fileName
                );
                const file = await sourceFileHandle.getFile();
                const content = await file.text();

                // Create file in target folder
                let targetHandle: FileSystemDirectoryHandle =
                    currentVault.handle;
                if (targetFolderPath) {
                    const targetPathParts = targetFolderPath.split("/");
                    for (const part of targetPathParts) {
                        targetHandle = await targetHandle.getDirectoryHandle(
                            part
                        );
                    }
                }

                const targetFileHandle = await targetHandle.getFileHandle(
                    fileName,
                    { create: true }
                );
                const writable = await targetFileHandle.createWritable();
                await writable.write(content);
                await writable.close();

                // Delete the original file
                await sourceHandle.removeEntry(fileName);

                // Update current file if it was the moved file
                if (currentFile?.path === filePath) {
                    const newPath = targetFolderPath
                        ? `${targetFolderPath}/${fileName}`
                        : fileName;
                    setCurrentFile({
                        name: fileName,
                        path: newPath,
                        handle: targetFileHandle,
                    });
                }
            } catch (error) {
                console.error("Error moving file:", error);
                throw error;
            }
        },
        [currentVault, currentFile]
    );

    const deleteVault = useCallback(
        async (vaultToDelete?: VaultInfo) => {
            const vault = vaultToDelete || currentVault;
            if (!vault) return;

            try {
                await vault.parentHandle.removeEntry(vault.name, {
                    recursive: true,
                });

                // Update available vaults
                await loadAvailableVaults(vault.parentHandle);

                // If we deleted the current vault, reset state
                if (vault === currentVault) {
                    setCurrentVault(null);
                    setFiles([]);
                    setFolders([]);
                    setCurrentFile(null);
                }
            } catch (error) {
                console.error("Error deleting vault:", error);
                throw error;
            }
        },
        [currentVault, loadAvailableVaults]
    );

    const createNewVault = useCallback(() => {
        // Reset state to show vault selector
        setCurrentVault(null);
        setFiles([]);
        setFolders([]);
        setCurrentFile(null);
    }, []);

    return {
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
        refreshFiles: () => refreshFiles(),
        moveFile,
        deleteVault,
        createNewVault,
    };
}
