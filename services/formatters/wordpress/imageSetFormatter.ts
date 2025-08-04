
import { SavedImageSet, ImageObject } from '../../../types';

export interface WordPressImageSetPayload {
    images: ImageObject[];
    name: string;
}

/**
 * Formats a SavedImageSet item for publishing to WordPress Media Library.
 * @param data The SavedImageSet object.
 * @returns A payload containing the images to be uploaded.
 */
export function formatImageSetForWordPress(data: SavedImageSet): WordPressImageSetPayload {
    return {
        images: data.images,
        name: data.name,
    };
}
