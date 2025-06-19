import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
        return NextResponse.json(
            { error: "No query provided" },
            { status: 400 }
        );
    }
    const uploadDir = path.join(process.cwd(), "uploads");
    let files: string[] = [];
    try {
        files = await fs.readdir(uploadDir);
    } catch {
        return NextResponse.json({ results: [] });
    }
    const matches: string[] = [];
    for (const file of files) {
        const filePath = path.join(uploadDir, file);
        try {
            const content = await fs.readFile(filePath, "utf8");
            if (file.includes(query) || content.includes(query)) {
                matches.push(file);
            }
        } catch {}
    }
    return NextResponse.json({ results: matches });
}
