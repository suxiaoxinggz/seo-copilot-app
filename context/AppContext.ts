import { createContext, Dispatch, SetStateAction } from 'react';
import { Model, Project, KeywordSubProject, Article, SavedImageSet, PostToPublish, PublishingChannel, PublishingItem, Database } from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AppContextType {
  models: Model[];
  setModels: Dispatch<SetStateAction<Model[]>>;
  defaultModelId: string | null;
  setDefaultModelId: Dispatch<SetStateAction<string | null>>;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  keywordLibrary: KeywordSubProject[];
  setKeywordLibrary: Dispatch<SetStateAction<KeywordSubProject[]>>;
  articles: Article[];
  setArticles: Dispatch<SetStateAction<Article[]>>;
  savedImageSets: SavedImageSet[];
  setSavedImageSets: Dispatch<SetStateAction<SavedImageSet[]>>;
  postsToPublish: PostToPublish[];
  setPostsToPublish: Dispatch<SetStateAction<PostToPublish[]>>;
  publishingChannels: PublishingChannel[];
  setPublishingChannels: Dispatch<SetStateAction<PublishingChannel[]>>;
  publishingQueue: PublishingItem[];
  setPublishingQueue: Dispatch<SetStateAction<PublishingItem[]>>;
  supabase: SupabaseClient<Database> | null;
  session: Session | null;
  fetchData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);