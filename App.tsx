import React, { useState, useMemo, useEffect } from 'react';
import { initializeSupabase } from './services/supabaseClient';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { PRESET_MODELS } from './constants';
import { Model, Page, Project, KeywordSubProject, Article, SavedImageSet, PostToPublish, PublishingChannel, PublishingItem, Database } from './types';
import Sidebar from './components/Sidebar';
import KeywordGenerator from './components/KeywordGenerator';
import ModelSettings from './components/ModelSettings';
import Dashboard from './components/Dashboard';
import ComingSoon from './components/ComingSoon';
import ArticleGenerator from './components/ArticleGenerator';
import { AppContext } from './context/AppContext';
import ImageTextProcessor from './components/ImageTextProcessor';
import PublishingManager from './components/PublishingManager';
import Spinner from './components/ui/Spinner';
import Auth from './components/Auth';
import Card from './components/ui/Card';

const PageContainer: React.FC<{ isVisible: boolean; children: React.ReactNode }> = ({ isVisible, children }) => (
    <div style={{ display: isVisible ? 'block' : 'none' }} className="h-full">
      {children}
    </div>
);

const App: React.FC = () => {
  const [configError, setConfigError] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  
  const [isLoading, setIsLoading] = useState(true); // Combined loading state

  // App data state
  const [models, setModels] = useState<Model[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [keywordLibrary, setKeywordLibrary] = useState<KeywordSubProject[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedImageSets, setSavedImageSets] = useState<SavedImageSet[]>([]);
  const [postsToPublish, setPostsToPublish] = useState<PostToPublish[]>([]);
  const [publishingChannels, setPublishingChannels] = useState<PublishingChannel[]>([]);
  const [publishingQueue, setPublishingQueue] = useState<PublishingItem[]>([]);

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        // This endpoint is a Cloudflare Function that returns public env vars
        const response = await fetch('/config');
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to load configuration (${response.status})`);
        }
        const config = await response.json();
        const supabaseClient = initializeSupabase(config.supabaseUrl, config.supabaseAnonKey);
        setSupabase(supabaseClient);
      } catch (error) {
        console.error("Configuration Error:", error);
        setConfigError((error as Error).message);
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchAppConfig();
  }, []);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false); // Done loading once we have auth status
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, [supabase]);
  
  const fetchData = async () => {
      if (!session || !supabase) return;
      setIsLoading(true);
      try {
        const fetchPromises = [
          supabase.from('projects').select('*'),
          supabase.from('keyword_library').select('*'),
          supabase.from('articles').select('*'),
          supabase.from('models').select('*'),
          supabase.from('posts_to_publish').select('*'),
          supabase.from('publishing_channels').select('*'),
          supabase.from('publishing_queue').select('*'),
          supabase.from('saved_image_sets').select('*'),
        ];

        const [
            projectsRes,
            keywordLibraryRes,
            articlesRes,
            modelsRes,
            postsToPublishRes,
            publishingChannelsRes,
            publishingQueueRes,
            savedImageSetsRes
        ] = await Promise.all(fetchPromises);
        
        if (projectsRes.error) throw projectsRes.error;
        setProjects(projectsRes.data || []);
        
        if (keywordLibraryRes.error) throw keywordLibraryRes.error;
        setKeywordLibrary(keywordLibraryRes.data || []);

        if (articlesRes.error) throw articlesRes.error;
        setArticles(articlesRes.data || []);
        
        if (modelsRes.error) throw modelsRes.error;
        if (!modelsRes.data || modelsRes.data.length === 0) {
            const initialModels = PRESET_MODELS.map(m => ({ ...m, user_id: session.user.id }));
            const { data: newModels, error: insertError } = await supabase.from('models').insert(initialModels).select();
            if (insertError) throw insertError;
            setModels(newModels || []);
            setDefaultModelId(newModels?.[0]?.id || null);
        } else {
             setModels(modelsRes.data);
             const userDefault = modelsRes.data.find(m => m.isDefault);
             setDefaultModelId(userDefault?.id || modelsRes.data[0]?.id || null);
        }

        if (postsToPublishRes.error) throw postsToPublishRes.error;
        setPostsToPublish(postsToPublishRes.data || []);

        if (publishingChannelsRes.error) throw publishingChannelsRes.error;
        setPublishingChannels(publishingChannelsRes.data || []);

        if (publishingQueueRes.error) throw publishingQueueRes.error;
        setPublishingQueue(publishingQueueRes.data || []);

        if (savedImageSetsRes.error) throw savedImageSetsRes.error;
        setSavedImageSets(savedImageSetsRes.data || []);

      } catch (error) {
          console.error("Error fetching data:", error);
          alert("Could not fetch user data.");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    if (session && supabase) {
      fetchData();
    } else {
      setProjects([]);
      setKeywordLibrary([]);
      setArticles([]);
      setModels([]);
      setPostsToPublish([]);
      setPublishingChannels([]);
      setPublishingQueue([]);
      setSavedImageSets([]);
    }
  }, [session, supabase]);


  const appContextValue = useMemo(() => ({
    models, setModels,
    defaultModelId, setDefaultModelId,
    projects, setProjects,
    keywordLibrary, setKeywordLibrary,
    articles, setArticles,
    savedImageSets, setSavedImageSets,
    postsToPublish, setPostsToPublish,
    publishingChannels, setPublishingChannels,
    publishingQueue, setPublishingQueue,
    supabase,
    session,
    fetchData
  }), [
    models, defaultModelId, projects, keywordLibrary, articles, 
    savedImageSets, postsToPublish, publishingChannels, publishingQueue, supabase, session
  ]);

  const renderAppContent = () => {
    if (isConfigLoading) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
          <Spinner size="lg" />
          <p className="ml-4 text-gray-400">Initializing application...</p>
        </div>
      );
    }
    
    if (configError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-2xl p-4 text-center">
                <Card>
                    <h2 className="text-2xl font-bold text-red-500">Application Error</h2>
                    <p className="mt-4 text-gray-300">Could not start the application due to a configuration issue.</p>
                    <p className="mt-2 text-xs text-gray-500 bg-gray-900 p-2 rounded-md">{configError}</p>
                </Card>
            </div>
        </div>
      );
    }

    if (isLoading && !session) { // Show a spinner while checking for a session
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-gray-900">
          <Spinner size="lg" />
        </div>
      );
    }
    
    if (!session) {
        return <Auth />;
    }
    
    // Show spinner if we have a session but are still fetching data
    if (isLoading && session) {
         return (
             <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
                <Sidebar currentPage={page} setPage={setPage} />
                <main className="flex-1 overflow-y-auto flex items-center justify-center">
                    <Spinner size="lg" />
                </main>
             </div>
         );
    }

    return (
      <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
        <Sidebar currentPage={page} setPage={setPage} />
        <main className="flex-1 overflow-y-auto">
          <PageContainer isVisible={page === 'dashboard'}><Dashboard /></PageContainer>
          <PageContainer isVisible={page === 'keyword-map'}><KeywordGenerator /></PageContainer>
          <PageContainer isVisible={page === 'outline-article'}><ArticleGenerator /></PageContainer>
          <PageContainer isVisible={page === 'image-text'}><ImageTextProcessor /></PageContainer>
          <PageContainer isVisible={page === 'localization'}><ComingSoon featureName="本地化" /></PageContainer>
          <PageContainer isVisible={page === 'publish'}><PublishingManager setPage={setPage} /></PageContainer>
          <PageContainer isVisible={page === 'settings'}><ModelSettings /></PageContainer>
        </main>
      </div>
    );
  };

  return (
    <AppContext.Provider value={appContextValue}>
      {renderAppContent()}
    </AppContext.Provider>
  );
};

export default App;