
import { Article, ImageObject } from '../../../types';
import { markdownToHtml, sanitizeTextForHtml } from '../shared/utils';

export interface WordPressArticlePayload {
    title: string;
    content: string;
    images: ImageObject[]; // Always empty for articles
}

/**
 * Formats an Article item into a standardized payload for WordPress.
 * @param data The Article object.
 * @returns A standardized WordPressArticlePayload object.
 */
export function formatArticleForWordPress(data: Article): WordPressArticlePayload {
    const { title, content: markdownContent, keywordContext } = data;

    const articleBodyHtml = markdownToHtml(markdownContent);
    
    let finalContent = `<div>${articleBodyHtml}</div>`;

    if (keywordContext && keywordContext.trim()) {
        const sanitizedContext = sanitizeTextForHtml(keywordContext);
        const keywordContextHtml = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-family: sans-serif;">
                <strong style="display: block; margin-bottom: 10px; font-size: 1.1em; color: #1d2327;">关键词上下文参考:</strong>
                <div style="font-size: 0.9em; color: #3c434a; white-space: pre-wrap; background-color: #f6f7f7; padding: 1em; border-radius: 4px;">${sanitizedContext}</div>
            </div>`;
        finalContent += keywordContextHtml;
    }

    return {
        title,
        content: finalContent,
        images: [], // Articles do not have associated images in this flow
    };
}
