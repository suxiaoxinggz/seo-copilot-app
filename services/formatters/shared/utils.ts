
/**
 * Converts markdown-like text to basic HTML.
 * This is a simplified version to handle headings and paragraphs.
 * @param text The markdown text.
 * @returns An HTML string.
 */
export const markdownToHtml = (text: string): string => {
    if (!text) return '';
    // This regex looks for block-level elements to avoid wrapping them in <p>
    const blockRegex = /^(<h[1-6]>.*<\/h[1-6]>|<figure>.*<\/figure>|<pre>.*<\/pre>|<div>.*<\/div>)$/;

    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const blocks = html.split(/(?:\r?\n\s*){2,}/);

    return blocks.map(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return '';
        if (trimmedBlock.startsWith('### ')) return `<h3>${trimmedBlock.substring(4)}</h3>`;
        if (trimmedBlock.startsWith('## ')) return `<h2>${trimmedBlock.substring(3)}</h2>`;
        if (trimmedBlock.startsWith('# ')) return `<h1>${trimmedBlock.substring(2)}</h1>`;
        // Un-escape our own figure tags
        if (trimmedBlock.startsWith('&lt;figure')) {
           return trimmedBlock.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        // Don't wrap existing block-level html in p tags
        if (blockRegex.test(trimmedBlock.replace(/&lt;/g, '<').replace(/&gt;/g, '>'))) {
            return trimmedBlock;
        }
        return `<p>${trimmedBlock.replace(/\r?\n/g, '<br />')}</p>`;
    }).join('\n');
};

/**
 * Sanitizes a string to be safely embedded in HTML content.
 * Replaces characters that could break HTML structure.
 * @param text The text to sanitize.
 * @returns A sanitized string.
 */
export const sanitizeTextForHtml = (text: string): string => {
    if (!text) return '';
    // Per user request, replace double dashes to avoid breaking HTML comments (good practice anyway)
    return text.replace(/--/g, '—');
};
