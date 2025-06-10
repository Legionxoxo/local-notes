// Convert markdown to EditorJS format
export function markdownToEditorJS(markdown: string): any {
    const lines = markdown.split("\n");
    const blocks: any[] = [];
    let currentListItems: string[] = [];
    let currentListType: "ordered" | "unordered" | null = null;
    let i = 0;

    const flushList = () => {
        if (currentListItems.length > 0) {
            blocks.push({
                type: "list",
                data: {
                    style:
                        currentListType === "ordered" ? "ordered" : "unordered",
                    items: currentListItems,
                },
            });
            currentListItems = [];
            currentListType = null;
        }
    };

    const processInlineFormatting = (text: string): string => {
        return text
            .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
            .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic
            .replace(/==(.*?)==/g, "<mark>$1</mark>"); // Highlight
    };

    while (i < lines.length) {
        let line = lines[i].trim();

        // Skip empty lines
        if (!line) {
            flushList();
            i++;
            continue;
        }

        // Delimiter (horizontal rule)
        if (line === "---" || line === "***" || line === "___") {
            flushList();
            blocks.push({
                type: "delimiter",
                data: {},
            });
        }
        // Code blocks
        else if (line.startsWith("```")) {
            flushList();
            const language = line.replace("```", "").trim();
            let codeContent = "";
            i++; // Move to next line

            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeContent += (codeContent ? "\n" : "") + lines[i];
                i++;
            }

            blocks.push({
                type: "code",
                data: {
                    code: codeContent,
                },
            });
        }
        // Tables
        else if (line.includes("|") && line.split("|").length > 2) {
            flushList();
            const tableRows: string[][] = [];
            let j = i;

            // Parse table rows
            while (j < lines.length && lines[j].includes("|")) {
                const row = lines[j]
                    .split("|")
                    .map((cell) => cell.trim())
                    .filter((cell) => cell);
                if (row.length > 0) {
                    tableRows.push(row);
                }
                j++;

                // Skip separator row (e.g., |---|---|)
                if (
                    j < lines.length &&
                    lines[j].match(/^\s*\|?[\s\-\|:]+\|?\s*$/)
                ) {
                    j++;
                }
            }

            if (tableRows.length > 0) {
                const maxCols = Math.max(...tableRows.map((row) => row.length));
                const normalizedRows = tableRows.map((row) => {
                    while (row.length < maxCols) {
                        row.push("");
                    }
                    return row;
                });

                blocks.push({
                    type: "table",
                    data: {
                        withHeadings: true,
                        content: normalizedRows,
                    },
                });
            }

            i = j - 1;
        }
        // Images
        else if (line.match(/!\[.*?\]\(.*?\)/)) {
            flushList();
            const match = line.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
                blocks.push({
                    type: "image",
                    data: {
                        url: match[2],
                        caption: match[1] || "",
                    },
                });
            }
        }
        // Headers
        else if (line.startsWith("#")) {
            flushList();
            const headerMatch = line.match(/^#+/);
            if (headerMatch && headerMatch[0]) {
                const level = headerMatch[0].length;
                const text = line.replace(/^#+\s*/, "");
                if (text) {
                    blocks.push({
                        type: "header",
                        data: {
                            text: processInlineFormatting(text),
                            level: Math.min(level, 6),
                        },
                    });
                }
            }
        }
        // Checklist items
        else if (line.match(/^[-*+]\s*\[([ x])\]/i)) {
            flushList();
            const match = line.match(/^[-*+]\s*\[([ x])\]\s*(.*)/i);
            if (match && match[1] && match[2]) {
                const checked = match[1].toLowerCase() === "x";
                const text = match[2];

                // Look ahead for more checklist items
                const checklistItems = [
                    {
                        text: processInlineFormatting(text),
                        checked: checked,
                    },
                ];

                let j = i + 1;
                while (j < lines.length) {
                    const nextLine = lines[j].trim();
                    const nextMatch = nextLine.match(
                        /^[-*+]\s*\[([ x])\]\s*(.*)/i
                    );
                    if (nextMatch && nextMatch[1] && nextMatch[2]) {
                        checklistItems.push({
                            text: processInlineFormatting(nextMatch[2]),
                            checked: nextMatch[1].toLowerCase() === "x",
                        });
                        j++;
                    } else if (nextLine === "") {
                        j++;
                    } else {
                        break;
                    }
                }

                blocks.push({
                    type: "checklist",
                    data: {
                        items: checklistItems,
                    },
                });

                i = j - 1;
            }
        }
        // Unordered list items
        else if (
            line.match(/^[-*+]\s/) &&
            !line.match(/^[-*+]\s*\[([ x])\]/i)
        ) {
            const text = line.replace(/^[-*+]\s/, "");
            if (currentListType !== "unordered") {
                flushList();
                currentListType = "unordered";
            }
            currentListItems.push(processInlineFormatting(text));
        }
        // Ordered list items
        else if (line.match(/^\d+\.\s/)) {
            const text = line.replace(/^\d+\.\s/, "");
            if (currentListType !== "ordered") {
                flushList();
                currentListType = "ordered";
            }
            currentListItems.push(processInlineFormatting(text));
        }
        // Regular paragraph
        else {
            flushList();
            // Collect multi-line paragraphs
            let paragraphText = line;
            let j = i + 1;

            while (
                j < lines.length &&
                lines[j].trim() !== "" &&
                !lines[j].trim().startsWith("#") &&
                !lines[j].trim().match(/^[-*+]\s/) &&
                !lines[j].trim().match(/^\d+\.\s/) &&
                !lines[j].trim().match(/^[-*+]\s*\[([ x])\]/i) &&
                !lines[j].trim().startsWith("```") &&
                !(lines[j].includes("|") && lines[j].split("|").length > 2) &&
                !lines[j].match(/!\[.*?\]\(.*?\)/) &&
                lines[j] !== "---" &&
                lines[j] !== "***" &&
                lines[j] !== "___"
            ) {
                paragraphText += " " + lines[j].trim();
                j++;
            }

            if (paragraphText) {
                blocks.push({
                    type: "paragraph",
                    data: {
                        text: processInlineFormatting(paragraphText),
                    },
                });
            }

            i = j - 1;
        }

        i++;
    }

    flushList();
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

                    // Convert HTML tags to markdown
                    text = text.replace(/<code>([^<]+)<\/code>/g, "`$1`");
                    text = text.replace(/<strong>([^<]+)<\/strong>/g, "**$1**");
                    text = text.replace(/<em>([^<]+)<\/em>/g, "*$1*");
                    text = text.replace(
                        /<a href="([^"]+)">([^<]+)<\/a>/g,
                        "[$2]($1)"
                    );

                    // Remove any remaining HTML tags and decode entities
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

                            // Convert HTML tags to markdown
                            itemText = itemText.replace(
                                /<code>([^<]+)<\/code>/g,
                                "`$1`"
                            );
                            itemText = itemText.replace(
                                /<strong>([^<]+)<\/strong>/g,
                                "**$1**"
                            );
                            itemText = itemText.replace(
                                /<em>([^<]+)<\/em>/g,
                                "*$1*"
                            );
                            itemText = itemText.replace(
                                /<a href="([^"]+)">([^<]+)<\/a>/g,
                                "[$2]($1)"
                            );

                            // Remove any remaining HTML tags
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

                            // Convert HTML tags to markdown
                            itemText = itemText.replace(
                                /<code>([^<]+)<\/code>/g,
                                "`$1`"
                            );
                            itemText = itemText.replace(
                                /<strong>([^<]+)<\/strong>/g,
                                "**$1**"
                            );
                            itemText = itemText.replace(
                                /<em>([^<]+)<\/em>/g,
                                "*$1*"
                            );
                            itemText = itemText.replace(
                                /<a href="([^"]+)">([^<]+)<\/a>/g,
                                "[$2]($1)"
                            );

                            // Remove any remaining HTML tags
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

                    // Convert HTML tags to markdown
                    quoteText = quoteText.replace(
                        /<code>([^<]+)<\/code>/g,
                        "`$1`"
                    );
                    quoteText = quoteText.replace(
                        /<strong>([^<]+)<\/strong>/g,
                        "**$1**"
                    );
                    quoteText = quoteText.replace(/<em>([^<]+)<\/em>/g, "*$1*");
                    quoteText = quoteText.replace(
                        /<a href="([^"]+)">([^<]+)<\/a>/g,
                        "[$2]($1)"
                    );

                    // Remove any remaining HTML tags
                    quoteText = quoteText.replace(/<[^>]*>/g, "");

                    return `> ${quoteText}`;

                case "code":
                    const code = block.data.code || "";
                    const language = block.data.language || "";
                    return `\`\`\`${language}\n${code}\n\`\`\``;

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
                        defaultText = block.data.text;

                        // Convert HTML tags to markdown
                        defaultText = defaultText.replace(
                            /<code>([^<]+)<\/code>/g,
                            "`$1`"
                        );
                        defaultText = defaultText.replace(
                            /<strong>([^<]+)<\/strong>/g,
                            "**$1**"
                        );
                        defaultText = defaultText.replace(
                            /<em>([^<]+)<\/em>/g,
                            "*$1*"
                        );
                        defaultText = defaultText.replace(
                            /<a href="([^"]+)">([^<]+)<\/a>/g,
                            "[$2]($1)"
                        );

                        // Remove any remaining HTML tags
                        defaultText = defaultText.replace(/<[^>]*>/g, "");
                    }
                    return defaultText;
            }
        })
        .filter((text: string) => text.trim() !== "") // Remove empty blocks
        .join("\n\n");
}
