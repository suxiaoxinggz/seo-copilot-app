

import { ImageSource, ImageObject, PixabayParams, UnsplashParams, KolarsParams, PollinationsParams } from '../types';

// --- Normalizers ---

const normalizePixabayResponse = (data: any): ImageObject[] => {
    if (!data.hits) return [];
    return data.hits.map((hit: any) => ({
        id: hit.id.toString(),
        url_regular: hit.webformatURL,
        url_full: hit.largeImageURL,
        alt_description: hit.tags || 'Image from Pixabay',
        author_name: hit.user,
        author_url: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
        source_platform: ImageSource.PIXABAY,
        source_url: hit.pageURL,
        width: hit.imageWidth,
        height: hit.imageHeight,
    }));
};

const normalizeUnsplashResponse = (data: any): ImageObject[] => {
    const results = data.results || [];
    return results.map((result: any) => ({
        id: result.id,
        url_regular: result.urls.regular,
        url_full: result.urls.full,
        alt_description: result.alt_description || result.description || 'Image from Unsplash',
        author_name: result.user.name,
        author_url: result.user.links.html,
        source_platform: ImageSource.UNSPLASH,
        source_url: result.links.html,
        width: result.width,
        height: result.height,
    }));
};

const normalizeKolorsResponse = (data: any, params: KolarsParams): ImageObject[] => {
    if (!data.images || !Array.isArray(data.images)) return [];
    const [width, height] = params.image_size.split('x').map(Number);

    return data.images.map((url: string, index: number) => ({
        id: `${data.seed || 'kolors'}-${Date.now()}-${index}`,
        url_regular: url,
        url_full: url,
        alt_description: params.prompt,
        author_name: 'SiliconFlow (Kolors)',
        author_url: 'https://www.siliconflow.cn/',
        source_platform: ImageSource.KOLARS,
        source_url: 'https://www.siliconflow.cn/',
        width,
        height,
    }));
};

const normalizePollinationsResponse = (urls: string[], params: PollinationsParams): ImageObject[] => {
    return urls.map((url, index) => ({
        id: `${url}-${index}`, // Append index for better key uniqueness
        url_regular: url,
        url_full: url,
        alt_description: params.prompt,
        author_name: 'Pollinations.AI',
        author_url: 'https://pollinations.ai/',
        source_platform: ImageSource.POLLINATIONS,
        source_url: 'https://pollinations.ai/',
        width: params.width,
        height: params.height,
    }));
};


// --- API Callers ---

export const fetchPixabayImages = async (params: PixabayParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Pixabay API Key is not provided.");
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("q", params.query.substring(0, 100)); // Max 100 chars
    url.searchParams.append("per_page", params.per_page.toString());
    url.searchParams.append("image_type", "photo");
    url.searchParams.append("order", params.order);
    url.searchParams.append("orientation", params.orientation);
    if (params.safesearch) url.searchParams.append("safesearch", "true");
    if (params.editors_choice) url.searchParams.append("editors_choice", "true");

    const response = await fetch(url.toString());
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pixabay API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return normalizePixabayResponse(data);
};

export const fetchUnsplashImages = async (params: UnsplashParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Unsplash API Key is not provided.");
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.append("query", params.query);
    url.searchParams.append("per_page", params.per_page.toString());
    url.searchParams.append("orientation", params.orientation);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Client-ID ${apiKey}`
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unsplash API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return normalizeUnsplashResponse(data);
};

export const fetchKolorsImages = async (params: KolarsParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Kolors (SiliconFlow) API Key is not provided.");
    const url = "https://api.siliconflow.cn/v1/images/generations";

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        image_size: params.image_size,
        batch_size: params.per_page,
        num_inference_steps: params.num_inference_steps,
        guidance_scale: params.guidance_scale,
        enhance: params.enhance,
        nologo: params.nologo,
        transparent: params.transparent,
        private: params.private,
    };
    if (params.seed) body.seed = params.seed;
    if (params.negative_prompt) body.negative_prompt = params.negative_prompt;


    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
            parsedError = JSON.parse(errorText);
        } catch(e) {
            // not a json error
        }
        const message = parsedError?.error?.message || errorText;
        throw new Error(`Kolors API error: ${response.status} - ${message}`);
    }
    const data = await response.json();
    return normalizeKolorsResponse(data, params);
};

export const fetchPollinationsImages = async (params: PollinationsParams): Promise<ImageObject[]> => {
    // API key is not used for this service.
    const urls: string[] = [];
    // Pollinations has a rate limit (1 per 5s), so we should request them sequentially with a delay.
    // However, for UI responsiveness, we'll construct the URLs first and let the browser fetch them.
    // Note: This might still trigger rate limits if many are loaded at once.
    // For batch generation, a negative prompt can be added with `[${params.negative_prompt}]` syntax.
    const fullPrompt = params.negative_prompt 
        ? `${params.prompt} [${params.negative_prompt}]`
        : params.prompt;

    for (let i = 0; i < params.per_page; i++) {
        const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
        
        if (params.model) url.searchParams.append('model', params.model);
        if (params.width) url.searchParams.append('width', String(params.width));
        if (params.height) url.searchParams.append('height', String(params.height));
        if (params.nologo) url.searchParams.append('nologo', 'true');
        if (params.enhance) url.searchParams.append('enhance', 'true');
        if (params.transparent) url.searchParams.append('transparent', 'true');
        if (params.private) url.searchParams.append('private', 'true');
        
        // If a seed is provided by the user, we iterate on it to get slightly different images for a batch.
        // If no seed is provided, we don't append it, letting the API handle random generation for each call.
        if (params.seed) {
            url.searchParams.append('seed', String(params.seed + i));
        } else {
             // Add a random element to burst cache for repeated prompts without seeds
             url.searchParams.append('r', String(Math.random()));
        }
        
        urls.push(url.toString());
    }
    // The API returns the image directly. The service's job is to construct the URLs.
    // We don't fetch the images here; the browser will do it via the <img> src.
    return normalizePollinationsResponse(urls, params);
};