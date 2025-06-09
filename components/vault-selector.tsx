"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen, BookOpen } from "lucide-react"

interface VaultSelectorProps {
  onSelectVault: (vaultName: string) => void
}

export function VaultSelector({ onSelectVault }: VaultSelectorProps) {
  const [vaultName, setVaultName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateVault = async () => {
    if (!vaultName.trim()) {
      alert("Please enter a vault name")
      return
    }

    try {
      setIsCreating(true)
      if ("showDirectoryPicker" in window) {
        await onSelectVault(vaultName.trim())
      } else {
        alert(
          "File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.",
        )
      }
    } catch (error) {
      console.error("Error creating vault:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <img src="/logo.svg" alt="Airvault logo" className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl">Create Your Vault</CardTitle>
          <CardDescription>
            Choose a location and name for your vault. A new folder will be created to store all your notes as markdown
            files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-name">Vault Name</Label>
            <Input
              id="vault-name"
              placeholder="My Notes"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateVault()}
            />
          </div>

          <Button onClick={handleCreateVault} className="w-full" size="lg" disabled={isCreating}>
            <FolderOpen className="w-5 h-5 mr-2" />
            {isCreating ? "Creating Vault..." : "Create Vault"}
          </Button>

          <div className="mt-4 text-sm text-muted-foreground">
            <p className="mb-2">What happens next?</p>
            <ul className="space-y-1 text-xs">
              <li>• Choose where to create your vault folder</li>
              <li>• A new folder with your vault name will be created</li>
              <li>• A welcome note will be added to get you started</li>
              <li>• All notes are saved as .md (markdown) files</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
