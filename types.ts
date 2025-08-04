import { PostgrestError } from '@supabase/supabase-js'

export enum ModelProvider {
  PRESET = 'Preset',
  CUSTOM = 'Custom',
}

export enum ApiProvider {
  ZHIPU = 'Zhipu',
  GEMINI = 'Gemini',
  MOCK = 'Mock',
}

export interface Model {
  id: string;
  user_id?: string;
  nickname: string;
  apiKey: string; 
  baseURL?: string;
  version?: string;
  supportsWebSearch: boolean;
  type: ModelProvider;
  apiProvider: ApiProvider;
  isDefault?: boolean;
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// --- Keyword Generation & Rendering Types ---

export interface LSIKeyword {
  text: string;
  isNew?: boolean;
}

export interface Level2Node {
  keyword: string;
  type: '认知型 (Awareness)' | '决策型 (Decision)' | '信任型 (Trust)' | '行动型 (Action)';
  lsi: string[];
}

export interface Level1Node {
  keyword: string;
  type: '引流型' | '对比型' | '转化型';
  pageType: string;
  children: Level2Node[];
}

export interface KeywordMap {
  coreUserIntent: string;
  originalKeywords: {
    traffic: string[];
    comparison: string[];
    conversion: string[];
  };
  keywordHierarchy: Level1Node[];
}

// For rendering, we add unique IDs to handle state changes
export interface RenderLsiNode {
  id: string;
  text: string;
  isNew?: boolean;
}
export interface RenderLevel2Node {
  id:string;
  keyword: string;
  type: string;
  lsi: RenderLsiNode[];
}

export interface RenderLevel1Node {
  id: string;
  keyword: string;
  type: string;
  pageType: string;
  children: RenderLevel2Node[];
}

export type SelectedKeywords = Record<string, boolean>;

// --- Keyword Selection & Library Types ---

export interface SavedLsiNode {
  id: string;
  text: string;
}
export interface SavedLevel2Node {
  id: string;
  keyword: string;
  type: string;
  lsi: SavedLsiNode[];
}

export interface SavedLevel1Node {
  id: string;
  keyword: string;
  type: string;
  pageType: string;
  children: SavedLevel2Node[];
}

export interface KeywordSubProject {
    id: string;
    user_id?: string;
    name: string;
    parentProjectId: string;
    savedAt: string;
    modelUsed: string;
    keywords: SavedLevel1Node[];
    translations?: Record<string, string>;
    publishedDestinations?: PublishedDestination[];
}

// --- Article Generation Types ---
export interface PublishedDestinationDetail {
    status: 'success' | 'failed';
    log: string;
    url?: string;
}

export interface PublishedDestination {
  platform: PublishingPlatform;
  status: 'success' | 'failed';
  target: string; // e.g., site URL or bucket name
  url?: string; // The final URL of the published content
  path?: string; // The path within a bucket
  publishedAt: string; // ISO timestamp
  log: string; // Success message or error log
  details?: PublishedDestinationDetail[]; // For granular results, e.g., image sets
}

export interface Article {
  id: string;
  user_id?: string;
  title: string;
  content: string; // This is Markdown
  keywordContext: string;
  parentProjectId: string;
  subProjectId: string;
  createdAt: string;
  modelUsed: string;
  publishedDestinations: PublishedDestination[];
}

// --- Image Processing Types ---

export enum ImageSource {
  POLLINATIONS = 'Pollinations.AI',
  KOLARS = 'Kolors',
  PIXABAY = 'Pixabay',
  UNSPLASH = 'Unsplash',
}

export interface ImageApiKeys {
  [ImageSource.PIXABAY]: string;
  [ImageSource.UNSPLASH]: string;
  [ImageSource.KOLARS]: string;
  [ImageSource.POLLINATIONS]: string; // No key needed, but for type consistency
}

export interface ImageObject {
  id: string;
  url_regular: string; // The primary URL to display in the card
  url_full: string; // The URL for download/full view
  alt_description: string;
  author_name: string;
  author_url: string;
  source_platform: ImageSource;
  source_url: string; // Link to the image page on the source platform
  width: number;
  height: number;
  base64?: string; // Stored for offline use in the library
  userDefinedName?: string; // User-provided filename
  publishedDestinations?: PublishedDestination[];
}

export interface SavedImageSet {
  id: string;
  user_id?: string;
  name: string; // This now acts as a reusable tag
  searchTermOrPrompt: string;
  images: ImageObject[];
  createdAt: string;
  parentProjectId: string;
  subProjectId: string;
  publishedDestinations: PublishedDestination[];
}

export interface PostToPublish {
  id: string;
  user_id?: string;
  title: string;
  htmlContent: string;
  markdownContent: string;
  keywordContext: string;
  usedImages: ImageObject[];
  createdAt: string;
  parentProjectId: string;
  subProjectId: string;
  publishedDestinations: PublishedDestination[];
}


export interface BaseImageParams {
  query: string; // For search-based APIs
  prompt: string; // For generation-based APIs
  per_page: number;
  negative_prompt: string;
}

export interface PixabayParams extends BaseImageParams {
  order: 'popular' | 'latest';
  orientation: 'all' | 'horizontal' | 'vertical';
  safesearch: boolean;
  editors_choice: boolean;
}

export interface UnsplashParams extends BaseImageParams {
  orientation: 'landscape' | 'portrait' | 'squarish';
}

export interface KolarsParams extends BaseImageParams {
    model: 'Kwai-Kolors/Kolors';
    image_size: '1024x1024' | '768x1024' | '1024x768' | '1024x1024' | '1024x768' | '768x1024';
    num_inference_steps: number; // 20-50
    guidance_scale: number; // 7-10
    seed?: number;
    enhance: boolean;
    nologo: boolean;
    transparent: boolean;
    private: boolean;
}

export interface PollinationsParams extends BaseImageParams {
    model: 'flux' | 'gptimage' | 'Kwai-Kolors/Kolors' | 'kontext';
    width: number;
    height: number;
    seed?: number;
    nologo: boolean;
    enhance: boolean;
    transparent: boolean;
    private: boolean;
}


export type ImageSearchParams = PixabayParams | UnsplashParams | KolarsParams | PollinationsParams;


// --- Publishing Types ---

export enum PublishingPlatform {
  WORDPRESS = 'WordPress',
  CLOUDFLARE_R2 = 'Cloudflare R2',
  SUPABASE = 'Supabase',
  GCS = 'Google Cloud Storage',
  S3 = 'Amazon S3',
  CUSTOM = 'Custom REST API',
}

export interface WpTerm {
  id: number;
  name: string;
  count: number;
}

export interface PublishingChannel {
  id: string;
  user_id?: string;
  name: string;
  platform: PublishingPlatform;
  config: Record<string, any>; // Store platform-specific config here
  isDefault?: boolean;
}


export type Page = 
  | 'dashboard'
  | 'keyword-map'
  | 'outline-article'
  | 'image-text'
  | 'localization'
  | 'publish'
  | 'settings';


export type PublishableItemType = 'article' | 'post' | 'image_set';

export interface PublishingItem {
  id: string; // Unique ID for the queue item itself
  user_id?: string;
  sourceId: string; // ID of the original Article, Post, etc.
  sourceType: PublishableItemType;
  name: string; // Title or name for display
  status: 'queued' | 'publishing' | 'success' | 'failed';
  log: string; // Log message for status
  data?: Article | PostToPublish | SavedImageSet; // The actual data object, optional now
}

// Supabase Database Schema
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: {
            id: string;
            user_id: string;
            name: string;
            createdAt: string;
            updatedAt: string;
        };
        Update: {
            name?: string;
            updatedAt?: string;
        };
      };
      keyword_library: {
        Row: KeywordSubProject;
        Insert: {
            id: string;
            user_id: string;
            name: string;
            parentProjectId: string;
            savedAt: string;
            modelUsed: string;
            keywords: SavedLevel1Node[];
            translations?: Record<string, string>;
            publishedDestinations?: PublishedDestination[];
        };
        Update: {
          name?: string;
          modelUsed?: string;
          keywords?: any;
          translations?: any;
          publishedDestinations?: any;
        };
      };
      articles: {
        Row: Article;
        Insert: {
            id: string;
            user_id: string;
            title: string;
            content: string;
            keywordContext: string;
            parentProjectId: string;
            subProjectId: string;
            createdAt: string;
            modelUsed: string;
            publishedDestinations: PublishedDestination[];
        };
        Update: {
          title?: string;
          content?: string;
          keywordContext?: string;
          modelUsed?: string;
          publishedDestinations?: any;
        };
      };
      models: {
        Row: Model;
        Insert: {
            id: string;
            user_id: string;
            nickname: string;
            apiKey: string; 
            baseURL?: string;
            version?: string;
            supportsWebSearch: boolean;
            type: ModelProvider;
            apiProvider: ApiProvider;
            isDefault?: boolean;
        };
        Update: {
            nickname?: string;
            apiKey?: string;
            baseURL?: string;
            version?: string;
            supportsWebSearch?: boolean;
            type?: ModelProvider;
            apiProvider?: ApiProvider;
            isDefault?: boolean;
        };
      };
      posts_to_publish: {
        Row: PostToPublish;
        Insert: {
            id: string;
            user_id: string;
            title: string;
            htmlContent: string;
            markdownContent: string;
            keywordContext: string;
            usedImages: ImageObject[];
            createdAt: string;
            parentProjectId: string;
            subProjectId: string;
            publishedDestinations: PublishedDestination[];
        };
        Update: {
          title?: string;
          htmlContent?: string;
          markdownContent?: string;
          keywordContext?: string;
          usedImages?: any;
          publishedDestinations?: any;
        };
      };
      publishing_channels: {
        Row: PublishingChannel;
        Insert: {
            id: string;
            user_id: string;
            name: string;
            platform: PublishingPlatform;
            config: Record<string, any>;
            isDefault?: boolean;
        };
        Update: {
            name?: string;
            platform?: PublishingPlatform;
            config?: Record<string, any>;
            isDefault?: boolean;
        };
      };
      publishing_queue: {
        Row: PublishingItem;
        Insert: {
            id: string;
            user_id: string;
            sourceId: string;
            sourceType: PublishableItemType;
            name: string;
            status: 'queued' | 'publishing' | 'success' | 'failed';
            log: string;
            data?: Article | PostToPublish | SavedImageSet;
        };
        Update: {
          name?: string;
          status?: 'queued' | 'publishing' | 'success' | 'failed';
          log?: string;
          data?: any;
        };
      };
      saved_image_sets: {
        Row: SavedImageSet;
        Insert: {
            id: string;
            user_id: string;
            name: string;
            searchTermOrPrompt: string;
            images: ImageObject[];
            createdAt: string;
            parentProjectId: string;
            subProjectId: string;
            publishedDestinations: PublishedDestination[];
        };
        Update: {
          name?: string;
          searchTermOrPrompt?: string;
          images?: any;
          publishedDestinations?: any;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}