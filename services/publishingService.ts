
import { PublishingItem, PublishingChannel, PublishingPlatform, PublishedDestination, PostToPublish, ImageObject, Article, SavedImageSet, PublishedDestinationDetail, WpTerm } from '../types';
import { formatArticleForWordPress } from './formatters/wordpress/articleFormatter';
import { formatPostForWordPress } from './formatters/wordpress/postFormatter';
import { formatImageSetForWordPress } from './formatters/wordpress/imageSetFormatter';
import { fetchWpCategories, fetchWpTags, createWpTerm } from './wordpressApiService';

// Interface for richer upload context
interface WordPressUploadData {
    image: ImageObject;
    blob?: Blob; // for base64
    sourceItem: Article | PostToPublish | SavedImageSet;
    imageIndex?: number; // for post images
}

/**
 * Normalizes a WordPress API URL and appends a path.
 * Ensures the final URL is in the format: https://domain.com/wp-json/wp/v2/path
 * @param baseUrl The base URL provided by the user (e.g., https://domain.com or https://domain.com/wp-json).
 * @param path The API path to append (e.g., /wp/v2/media).
 * @returns The fully constructed and normalized endpoint URL.
 */
function getWpEndpoint(baseUrl: string, path: string): string {
    // 1. Remove trailing slashes from the base URL.
    let normalizedUrl = baseUrl.replace(/\/+$/, '');
    
    // 2. Ensure it ends with /wp-json if it's a base URL.
    if (!normalizedUrl.includes('/wp-json')) {
        normalizedUrl = `${normalizedUrl}/wp-json`;
    }
    
    // 3. Append the path.
    return `${normalizedUrl}${path}`;
}

const base64ToBlob = (base64: string): { blob: Blob, extension: string } => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    const extension = contentType.split('/')[1] || 'jpeg';
    return { blob: new Blob([uInt8Array], { type: contentType }), extension };
};


/**
 * Publishes an image to WordPress Media Library with context-aware metadata.
 * @param uploadData An object containing the image and its context.
 * @param channel The WordPress channel configuration.
 * @returns The URL of the uploaded image on WordPress.
 */
async function uploadImageToWordPress(uploadData: WordPressUploadData, channel: PublishingChannel): Promise<string> {
    const { image, blob, sourceItem, imageIndex } = uploadData;
    const { apiUrl, username, password } = channel.config;
    if (!apiUrl || !username || !password) {
        throw new Error("WordPress channel configuration is incomplete.");
    }
    
    let imageBlob: Blob;
    let imageType: string;

    if (blob) {
        imageBlob = blob;
        imageType = blob.type;
    } else {
        const response = await fetch(image.url_full);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from ${image.url_full}. Status: ${response.statusText}`);
        }
        imageBlob = await response.blob();
        imageType = imageBlob.type;
    }
    
    const formData = new FormData();
    const extension = (imageType.split('/')[1] || 'jpg').split('+')[0];
    
    // --- Start of new dynamic metadata logic ---
    let finalTitle: string;
    let finalAltText: string;
    const finalDescription = image.alt_description || '';

    // Check if the source is an Article or Post
    if ('title' in sourceItem && ('content' in sourceItem || 'htmlContent' in sourceItem)) {
        const post = sourceItem as Article | PostToPublish;
        
        // Title Logic for Posts
        if (image.userDefinedName) {
            finalTitle = image.userDefinedName;
        } else if (post.title) {
            finalTitle = `${post.title}-image-${(imageIndex || 0) + 1}`;
        } else {
            finalTitle = image.alt_description;
        }

        // Alt Text Logic for Posts
        const keywordContext = (post as PostToPublish).keywordContext || (post as Article).keywordContext;
        finalAltText = keywordContext || image.alt_description;

    } 
    // Check if the source is an Image Set from the Library
    else if ('searchTermOrPrompt' in sourceItem) {
        const imageSet = sourceItem as SavedImageSet;
        
        // Title Logic for Library Images
        finalTitle = image.userDefinedName || image.alt_description;
        
        // Alt Text Logic for Library Images
        finalAltText = imageSet.searchTermOrPrompt || image.alt_description;
    } 
    // Fallback for any other case
    else {
        finalTitle = image.userDefinedName || image.alt_description;
        finalAltText = image.alt_description;
    }
    
    const filenameBase = finalTitle.replace(/[^a-z0-9\s-]/gi, '_').replace(/\s+/g, '-').slice(0, 80) || image.id;
    const filename = `${filenameBase}.${extension}`;

    formData.append('file', new File([imageBlob], filename, { type: imageType }));
    formData.append('title', finalTitle || filename); 
    formData.append('alt_text', finalAltText || finalTitle); 
    formData.append('caption', `Image by ${image.author_name} on ${image.source_platform}`);

    if (finalDescription) {
        formData.append('description', finalDescription);
    }
    // --- End of new dynamic metadata logic ---

    const endpoint = getWpEndpoint(apiUrl, '/wp/v2/media');
    const authString = btoa(`${username}:${password}`);

    const uploadResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
        },
        body: formData,
    });
    
    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`WordPress media upload failed with status ${uploadResponse.status}: ${errorText}`);
    }

    const mediaData = await uploadResponse.json();
    if (!mediaData.source_url) {
        throw new Error('WordPress media upload succeeded, but no source_url was returned.');
    }

    return mediaData.source_url;
}


async function publishImageSetToWordPress(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    const { images } = formatImageSetForWordPress(item.data as SavedImageSet);
    const details: PublishedDestinationDetail[] = [];
    let successCount = 0;

    for (const image of images) {
        try {
            const newUrl = await uploadImageToWordPress({ image, sourceItem: item.data as SavedImageSet }, channel);
            details.push({ status: 'success', log: `Uploaded ${image.id}`, url: newUrl });
            successCount++;
        } catch (error: any) {
            details.push({ status: 'failed', log: `Failed to upload ${image.id}: ${error.message}` });
        }
    }

    const overallStatus = successCount === images.length ? 'success' : 'failed';
    const log = `Published ${successCount}/${images.length} images to Media Library.`;

    return {
        platform: PublishingPlatform.WORDPRESS,
        status: overallStatus,
        target: channel.config.apiUrl,
        publishedAt: new Date().toISOString(),
        log,
        details,
    };
}

/**
 * Helper to resolve term names (tags, categories) to IDs, creating new terms if necessary.
 * This is more robust as it handles a mix of IDs and names in user input.
 */
async function resolveTermIds(termNamesString: string | undefined, termType: 'tags' | 'categories', channel: PublishingChannel): Promise<number[]> {
    if (!termNamesString || !termNamesString.trim()) {
        return [];
    }
    
    const userInputParts = termNamesString.split(',').map(s => s.trim()).filter(Boolean);
    if (userInputParts.length === 0) return [];
    
    const existingTerms: WpTerm[] = termType === 'tags'
        ? await fetchWpTags(channel)
        : await fetchWpCategories(channel);

    const nameToIdMap = new Map<string, number>(existingTerms.map(term => [term.name.toLowerCase(), term.id]));
    const idToNameMap = new Map<number, string>(existingTerms.map(term => [term.id, term.name]));
    
    const resolvedIds = new Set<number>();
    const namesToCreate = new Set<string>();
    
    for (const part of userInputParts) {
        const partLower = part.toLowerCase();
        const numId = parseInt(part, 10);

        // Priority 1: Check if input matches an existing term NAME.
        if (nameToIdMap.has(partLower)) {
            resolvedIds.add(nameToIdMap.get(partLower)!);
        } 
        // Priority 2: Check if input is a number AND matches an existing term ID.
        else if (!isNaN(numId) && idToNameMap.has(numId)) {
            resolvedIds.add(numId);
        } 
        // Priority 3: If neither match, it's a new term NAME to be created.
        else {
            // Check against the case-insensitive map one last time to avoid creating duplicates.
            if (!nameToIdMap.has(partLower)) {
               namesToCreate.add(part);
            }
        }
    }
    
    if (namesToCreate.size > 0) {
        // For categories, we only create them, we don't handle parent/child relationships here for simplicity.
        const creationPromises = Array.from(namesToCreate).map(name => createWpTerm(channel, termType, name));
        
        try {
            const createdTerms = await Promise.all(creationPromises);
            createdTerms.forEach(term => resolvedIds.add(term.id));
        } catch (creationError) {
            console.error(`Failed to create some ${termType}.`, creationError);
            // We can decide to continue without the failed terms or throw.
            // For now, we'll continue, and the retry mechanism will handle the rest.
            throw creationError; // Throw to trigger the retry logic
        }
    }
    
    return Array.from(resolvedIds);
}

async function publishToWordPress(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    const { apiUrl, username, password } = channel.config;
    
    // 1. Use the appropriate formatter based on source type
    const { title, images } = item.sourceType === 'article'
        ? formatArticleForWordPress(item.data as Article)
        : formatPostForWordPress(item.data as PostToPublish);
        
    let content = item.sourceType === 'article' 
        ? formatArticleForWordPress(item.data as Article).content
        : formatPostForWordPress(item.data as PostToPublish).content;

    // 2. Upload all images and get their new URLs
    if (images && images.length > 0) {
        const base64Regex = /src=["'](data:image\/[^;]+;base64,[^"']+)["']/g;
        const base64Sources = [...content.matchAll(base64Regex)].map(match => match[1]);

        if(base64Sources.length !== images.length){
             console.warn("Mismatch between number of images in HTML and in usedImages array. Replacement may be incorrect.");
        }

        for (let i = 0; i < base64Sources.length; i++) {
            const oldUrl = base64Sources[i];
            const image = images[i]; // Rely on order
            if (!image) continue;

            try {
                const { blob } = base64ToBlob(oldUrl);
                const newUrl = await uploadImageToWordPress(
                    { image, blob, sourceItem: item.data as PostToPublish | Article, imageIndex: i }, 
                    channel
                );
                
                const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapeRegExp(oldUrl), 'g');
                content = content.replace(regex, newUrl);

            } catch (error) {
                console.error(`Failed to upload image ${i+1} for post ${title}`, error);
            }
        }
    }

    // 3. Prepare post payload with resolved term IDs
    const postPayload: any = {
        title: { raw: title }, 
        content: content,
        status: channel.config.status || 'draft',
    };
    if (channel.config.lang) postPayload.lang = channel.config.lang;

    // 4. Publish the post (with insurance retry)
    const endpoint = getWpEndpoint(apiUrl, '/wp/v2/posts');
    const authString = btoa(`${username}:${password}`);

    try {
        // Resolve tags and categories only if provided
        const [tagIds, categoryIds] = await Promise.all([
            resolveTermIds(channel.config.tags, 'tags', channel),
            resolveTermIds(channel.config.categories, 'categories', channel)
        ]);
        if (tagIds.length > 0) postPayload.tags = tagIds;
        if (categoryIds.length > 0) postPayload.categories = categoryIds;
        
        // First attempt with tags and categories
        const postResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload),
        });

        if (!postResponse.ok) {
            const errorText = await postResponse.text();
            throw new Error(`WordPress post creation failed (1st attempt): ${errorText}`);
        }
        
        const createdPost = await postResponse.json();
        return {
            platform: PublishingPlatform.WORDPRESS,
            status: 'success',
            target: channel.config.apiUrl,
            url: createdPost.link,
            publishedAt: new Date().toISOString(),
            log: `Successfully published post with ID: ${createdPost.id}`,
        };

    } catch (initialError) {
        console.warn("Initial post creation failed. Retrying without tags/categories.", initialError);

        // Insurance retry: Remove tags and categories and try again.
        delete postPayload.tags;
        delete postPayload.categories;

        const retryResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload),
        });
        
        if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            // If even the retry fails, throw the original error for better context.
            throw new Error(`WordPress post creation failed on both attempts. Initial error: ${(initialError as Error).message}. Retry error: ${errorText}`);
        }

        const createdPost = await retryResponse.json();
        return {
            platform: PublishingPlatform.WORDPRESS,
            status: 'success',
            target: channel.config.apiUrl,
            url: createdPost.link,
            publishedAt: new Date().toISOString(),
            log: `Successfully published post with ID: ${createdPost.id} (tags/categories were skipped due to an initial error).`,
        };
    }
}


/**
 * Publishes a publishing item to the specified channel.
 * This acts as a router to the correct publishing function based on platform.
 * @param item The item to publish.
 * @param channel The channel to publish to.
 * @returns A promise resolving to the publication result.
 */
export async function publishItem(item: PublishingItem, channel: PublishingChannel): Promise<PublishedDestination> {
    switch (channel.platform) {
        case PublishingPlatform.WORDPRESS:
            if (item.sourceType === 'article' || item.sourceType === 'post') {
                return publishToWordPress(item, channel);
            }
            if (item.sourceType === 'image_set') {
                return publishImageSetToWordPress(item, channel);
            }
            throw new Error(`Publishing type '${item.sourceType}' to WordPress is not supported yet.`);

        case PublishingPlatform.CLOUDFLARE_R2:
        case PublishingPlatform.SUPABASE:
        case PublishingPlatform.GCS:
        case PublishingPlatform.S3:
             throw new Error(`Publishing to ${channel.platform} is not yet implemented.`);

        default:
            throw new Error(`Unknown or unsupported publishing platform: ${channel.platform}`);
    }
}
