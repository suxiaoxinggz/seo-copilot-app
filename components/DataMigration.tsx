import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import Button from './ui/Button';
import Card from './ui/Card';

const LOCAL_STORAGE_KEYS = [
    'llm_models',
    'seo_projects',
    'keyword_library',
    'saved_articles',
    'saved_image_sets',
    'posts_to_publish',
    'publishing_channels',
    'publishing_queue',
];

const TABLE_MAP: Record<string, string> = {
    'llm_models': 'models',
    'seo_projects': 'projects',
    'keyword_library': 'keyword_library',
    'saved_articles': 'articles',
    'saved_image_sets': 'saved_image_sets',
    'posts_to_publish': 'posts_to_publish',
    'publishing_channels': 'publishing_channels',
    'publishing_queue': 'publishing_queue',
};


const DataMigration: React.FC = () => {
    const context = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    
    const { session, fetchData, supabase } = context || {};
    
    const handleMigrate = async () => {
        if (!session || !supabase) {
            alert("You must be logged in to a configured backend to migrate data.");
            return;
        }

        if (!window.confirm("This will upload your local data to your cloud account. Existing cloud data with the same ID will be overwritten. Do you want to continue?")) {
            return;
        }

        setIsLoading(true);
        setLog([]);
        
        const addLog = (message: string) => setLog(prev => [...prev, message]);

        for (const key of LOCAL_STORAGE_KEYS) {
            try {
                const item = window.localStorage.getItem(key);
                if (!item) {
                    addLog(`ℹ️ No local data found for ${key}. Skipping.`);
                    continue;
                }
                
                const data = JSON.parse(item);
                if (!Array.isArray(data) || data.length === 0) {
                    addLog(`ℹ️ No items to migrate for ${key}. Skipping.`);
                    continue;
                }
                
                const tableName = TABLE_MAP[key];
                if (!tableName) {
                     addLog(`⚠️ No table mapping found for ${key}. Skipping.`);
                     continue;
                }

                // Add user_id to each record
                const dataWithUser = data.map(record => ({ ...record, user_id: session.user.id }));
                
                addLog(`⏳ Migrating ${data.length} items for ${key} to table ${tableName}...`);
                
                const { error } = await supabase.from(tableName as any).upsert(dataWithUser);
                
                if (error) {
                    throw new Error(`Error migrating ${key}: ${error.message}`);
                }
                
                addLog(`✅ Successfully migrated ${key}.`);

            } catch (error: any) {
                addLog(`❌ ${error.message}`);
            }
        }
        
        addLog("🎉 Migration process finished.");
        
        if (window.confirm("Migration complete. Do you want to clear your local browser data now? This is recommended to avoid confusion.")) {
            LOCAL_STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
            addLog("🧹 Local data cleared.");
        }

        setIsLoading(false);
        // Refetch data to update the UI
        if (fetchData) {
            addLog("🔄 Refreshing app data...");
            await fetchData();
            addLog("👍 App data refreshed.");
        }
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">数据迁移</h3>
                    <p className="text-gray-400 mt-1 text-sm">将存储在您浏览器中的旧数据迁移到您的云端账户。</p>
                </div>
                <Button 
                    className="mt-4 md:mt-0"
                    onClick={handleMigrate}
                    isLoading={isLoading}
                    disabled={!session || !supabase}
                >
                    开始迁移本地数据
                </Button>
            </div>
            {log.length > 0 && (
                <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700 rounded-md max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                        {log.join('\n')}
                    </pre>
                </div>
            )}
        </Card>
    );
};

export default DataMigration;