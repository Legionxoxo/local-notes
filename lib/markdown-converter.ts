// Convert markdown to EditorJS format
export function markdownToEditorJS(markdown: string): any {
    const lines = markdown.split("\n");
    const blocks: any[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        if (line === "") {
            i++;
            continue;
        }

        // Headers
        if (line.startsWith("#")) {
            const level = line.match(/^#+/)?.[0].length || 1;
            const text = line.replace(/^#+\s*/, "");
            blocks.push({
                type: "header",
                data: {
                    text,
                    level: Math.min(level, 6),
                },
            });
        }
        // Quotes
        else if (line.startsWith(">")) {
            const text = line.replace(/^>\s*/, "");
            blocks.push({
                type: "quote",
                data: {
                    text,
                    caption: "",
                },
            });
        }
        // Lists
        else if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
            const isOrdered = line.match(/^\d+\.\s/) !== null;
            const items: string[] = [];

            while (
                i < lines.length &&
                (lines[i].match(/^[-*+]\s/) || lines[i].match(/^\d+\.\s/))
            ) {
                const item = lines[i].replace(/^[-*+\d.]\s*/, "");
                items.push(item);
                i++;
            }
            i--; // Adjust for the outer loop increment

            blocks.push({
                type: "list",
                data: {
                    style: isOrdered ? "ordered" : "unordered",
                    items,
                },
            });
        }
        // Code blocks
        else if (line.startsWith("```")) {
            const language = line.replace("```", "");
            i++;
            let code = "";

            while (i < lines.length && !lines[i].startsWith("```")) {
                code += lines[i] + "\n";
                i++;
            }

            blocks.push({
                type: "code",
                data: {
                    code: code.trim(),
                },
            });
        }
        // Regular paragraphs
        else {
            blocks.push({
                type: "paragraph",
                data: {
                    text: line,
                },
            });
        }

        i++;
    }

    return {
        time: Date.now(),
        blocks,
        version: "2.28.2",
    };
}

// Convert EditorJS format to markdown
export function editorJSToMarkdown(data: any): string {
    if (!data || !data.blocks) return "";

    return data.blocks
        .map((block: any) => {
            switch (block.type) {
                case "header":
                    const level = "#".repeat(block.data.level || 1);
                    return `${level} ${block.data.text || ""}`;

                case "paragraph":
                    // Handle rich text formatting in paragraphs
                    let text = block.data.text || "";

                    // If text is an object or contains HTML, extract plain text
                    if (typeof text === "object") {
                        return "";
                    }

                    // Remove HTML tags and decode entities
                    text = text.replace(/<[^>]*>/g, "");
                    text = text.replace(/&nbsp;/g, " ");
                    text = text.replace(/&amp;/g, "&");
                    text = text.replace(/&lt;/g, "<");
                    text = text.replace(/&gt;/g, ">");

                    return text;

                case "list":
                    const style =
                        block.data.style === "ordered"
                            ? "ordered"
                            : "unordered";
                    if (!block.data.items || !Array.isArray(block.data.items)) {
                        return "";
                    }

                    return block.data.items
                        .map((item: any, index: number) => {
                            // Handle both string items and object items
                            let itemText = "";
                            if (typeof item === "string") {
                                itemText = item;
                            } else if (
                                item &&
                                typeof item === "object" &&
                                item.content
                            ) {
                                itemText = item.content;
                            } else if (
                                item &&
                                typeof item === "object" &&
                                item.text
                            ) {
                                itemText = item.text;
                            } else {
                                itemText = String(item || "");
                            }

                            // Remove HTML tags
                            itemText = itemText.replace(/<[^>]*>/g, "");

                            const prefix =
                                style === "ordered" ? `${index + 1}. ` : "- ";
                            return `${prefix}${itemText}`;
                        })
                        .join("\n");

                case "checklist":
                    if (!block.data.items || !Array.isArray(block.data.items)) {
                        return "";
                    }

                    return block.data.items
                        .map((item: any) => {
                            let itemText = "";
                            if (typeof item === "string") {
                                itemText = item;
                            } else if (item && typeof item === "object") {
                                itemText = item.text || item.content || "";
                            }

                            // Remove HTML tags
                            itemText = itemText.replace(/<[^>]*>/g, "");

                            const checked = item.checked ? "x" : " ";
                            return `- [${checked}] ${itemText}`;
                        })
                        .join("\n");

                case "quote":
                    let quoteText = block.data.text || "";
                    if (typeof quoteText === "object") {
                        quoteText = "";
                    }
                    quoteText = quoteText.replace(/<[^>]*>/g, "");
                    return `> ${quoteText}`;

                case "code":
                    const code = block.data.code || "";
                    return `\`\`\`\n${code}\n\`\`\``;

                case "delimiter":
                    return "---";

                case "table":
                    if (
                        !block.data.content ||
                        !Array.isArray(block.data.content)
                    )
                        return "";
                    const rows = block.data.content;
                    let markdown = "";

                    // Header row
                    if (rows[0] && Array.isArray(rows[0])) {
                        markdown += "| " + rows[0].join(" | ") + " |\n";
                        markdown +=
                            "| " +
                            rows[0].map(() => "---").join(" | ") +
                            " |\n";
                    }

                    // Data rows
                    for (let i = 1; i < rows.length; i++) {
                        if (rows[i] && Array.isArray(rows[i])) {
                            markdown += "| " + rows[i].join(" | ") + " |\n";
                        }
                    }

                    return markdown.trim();

                case "image":
                    const imageUrl = block.data.url || "";
                    const caption = block.data.caption || "";
                    return `![${caption}](${imageUrl})`;

                default:
                    // Handle any other block types
                    let defaultText = "";
                    if (block.data && typeof block.data.text === "string") {
                        defaultText = block.data.text.replace(/<[^>]*>/g, "");
                    }
                    return defaultText;
            }
        })
        .filter((text: string) => text.trim() !== "") // Remove empty blocks
        .join("\n\n");
}
