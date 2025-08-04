
import { PublishingChannel, WpTerm } from '../types';

function getWpApiEndpoint(baseUrl: string, path: string): string {
    let normalizedUrl = baseUrl.replace(/\/+$/, '');
    if (!normalizedUrl.includes('/wp-json')) {
        normalizedUrl = `${normalizedUrl}/wp-json`;
    }
    return `${normalizedUrl}${path}`;
}

export async function fetchWpCategories(channel: PublishingChannel): Promise<WpTerm[]> {
    const { apiUrl, username, password } = channel.config;
    if (!apiUrl || !username || !password) {
        throw new Error("WordPress channel configuration is incomplete.");
    }
    const endpoint = getWpApiEndpoint(apiUrl, '/wp/v2/categories?per_page=100');
    const authString = btoa(`${username}:${password}`);
    
    const response = await fetch(endpoint, {
        headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch categories: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.map((cat: any) => ({ id: cat.id, name: cat.name, count: cat.count }));
}

export async function fetchWpTags(channel: PublishingChannel): Promise<WpTerm[]> {
    const { apiUrl, username, password } = channel.config;
     if (!apiUrl || !username || !password) {
        throw new Error("WordPress channel configuration is incomplete.");
    }
    const endpoint = getWpApiEndpoint(apiUrl, '/wp/v2/tags?per_page=100');
    const authString = btoa(`${username}:${password}`);
    
    const response = await fetch(endpoint, {
        headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch tags: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.map((tag: any) => ({ id: tag.id, name: tag.name, count: tag.count }));
}

export async function createWpTerm(channel: PublishingChannel, termType: 'tags' | 'categories', name: string): Promise<WpTerm> {
    const { apiUrl, username, password } = channel.config;
    if (!apiUrl || !username || !password) {
        throw new Error("WordPress channel configuration is incomplete.");
    }
    const endpoint = getWpApiEndpoint(apiUrl, `/wp/v2/${termType}`);
    const authString = btoa(`${username}:${password}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Handle cases where the term already exists
        if (errorText.includes('term_exists')) {
             throw new Error(`Term "${name}" already exists on the WordPress site.`);
        }
        throw new Error(`Failed to create ${termType.slice(0, -1)} "${name}": ${response.status} ${errorText}`);
    }

    const createdTerm = await response.json();
    return { id: createdTerm.id, name: createdTerm.name, count: createdTerm.count };
}
