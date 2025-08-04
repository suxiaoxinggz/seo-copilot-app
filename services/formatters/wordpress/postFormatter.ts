
import { PostToPublish, ImageObject } from '../../../types';
import { sanitizeTextForHtml } from '../shared/utils';

export interface WordPressPostPayload {
    title: string;
    content: string;
    images: ImageObject[];
}

/**
 * Formats a PostToPublish item into a standardized payload for WordPress.
 * @param data The PostToPublish object.
 * @returns A standardized WordPressPostPayload object.
 */
export function formatPostForWordPress(data: PostToPublish): WordPressPostPayload {
    const { title, htmlContent, keywordContext, usedImages } = data;

    let finalContent = htmlContent;

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
        images: usedImages || [],
    };
}
