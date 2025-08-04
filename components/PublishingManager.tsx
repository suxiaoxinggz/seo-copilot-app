

import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { PublishingChannel, PublishingPlatform, PublishingItem, Page, WpTerm, PublishedDestination } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';
import Select from './ui/Select';
import { PlusIcon, TrashIcon, PencilIcon, GlobeAltIcon, CloudIcon, DatabaseIcon } from './icons';
import { publishItem } from '../services/publishingService';
import Checkbox from './ui/Checkbox';
import { PublishingStatusView } from './PublishingStatusView';
import { fetchWpCategories, fetchWpTags } from '../services/wordpressApiService';
import Spinner from './ui/Spinner';

const platformIcons: Record<PublishingPlatform, React.ReactNode> = {
    [PublishingPlatform.WORDPRESS]: <GlobeAltIcon className="w-5 h-5" />,
    [PublishingPlatform.CLOUDFLARE_R2]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.SUPABASE]: <DatabaseIcon className="w-5 h-5" />,
    [PublishingPlatform.GCS]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.S3]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.CUSTOM]: <PencilIcon className="w-5 h-5" />,
};


const WordPressForm: React.FC<{ config: any; setConfig: (config: any) => void, channel?: PublishingChannel | null }> = ({ config, setConfig, channel }) => {
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [fetchedCategories, setFetchedCategories] = useState<WpTerm[]>([]);
    const [fetchedTags, setFetchedTags] = useState<WpTerm[]>([]);
    
    const selectedCategoryIds = useMemo(() => new Set<number>((String(config.categories || '')).split(',').map((s:string) => parseInt(s.trim(), 10)).filter(n => !isNaN(n))), [config.categories]);
    const selectedTagIds = useMemo(() => new Set<number>((String(config.tags || '')).split(',').map((s:string) => parseInt(s.trim(), 10)).filter(n => !isNaN(n))), [config.tags]);

    const handleFetchTerms = async () => {
        const channelToFetch = channel || { id: 'temp', name: 'temp', platform: PublishingPlatform.WORDPRESS, config };
        
        if (!channelToFetch.config.apiUrl || !channelToFetch.config.username || !channelToFetch.config.password) {
            setError("Please fill in API URL, Username, and Application Password first.");
            return;
        }

        setIsLoadingTerms(true);
        setError(null);
        setFetchedCategories([]);
        setFetchedTags([]);
        try {
            const [cats, tags] = await Promise.all([
                fetchWpCategories(channelToFetch),
                fetchWpTags(channelToFetch)
            ]);
            setFetchedCategories(cats);
            setFetchedTags(tags);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while fetching terms.");
        } finally {
            setIsLoadingTerms(false);
        }
    };

    const handleTermSelection = (termId: number, termType: 'categories' | 'tags') => {
        const currentIds = new Set<number>((String(config[termType] || '')).split(',').map((s:string) => parseInt(s.trim(), 10)).filter(n => !isNaN(n)));
        if (currentIds.has(termId)) {
            currentIds.delete(termId);
        } else {
            currentIds.add(termId);
        }
        setConfig({ ...config, [termType]: Array.from(currentIds).join(',') });
    };

    const renderTermSelector = (title: string, fetchedTerms: WpTerm[], selectedIds: Set<number>, termType: 'categories' | 'tags') => (
        <div className="mt-2">
            <h4 className="font-semibold text-gray-300 mb-1">{title}</h4>
            {fetchedTerms.length > 0 ? (
                <div className="max-h-40 overflow-y-auto bg-gray-900/50 border border-gray-600 rounded-md p-2 space-y-1">
                    {fetchedTerms.map(term => (
                        <label key={term.id} className="flex items-center space-x-2 p-1 rounded hover:bg-gray-700/50 cursor-pointer">
                            <Checkbox 
                                id={`term-${termType}-${term.id}`}
                                checked={selectedIds.has(term.id)}
                                onChange={() => handleTermSelection(term.id, termType)}
                            />
                            <span className="text-sm text-gray-200">{term.name}</span>
                        </label>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-gray-500">No terms found.</p>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <Input label="WordPress REST API 地址" value={config.apiUrl || ''} onChange={e => setConfig({ ...config, apiUrl: e.target.value })} placeholder="https://example.com" />
            <Input label="用户名" value={config.username || ''} onChange={e => setConfig({ ...config, username: e.target.value })} />
            <Input label="应用密码 (Application Password)" type="password" value={config.password || ''} onChange={e => setConfig({ ...config, password: e.target.value })} />
            <Select label="默认发布状态" value={config.status || 'draft'} onChange={e => setConfig({ ...config, status: e.target.value })}>
                <option value="draft">草稿</option>
                <option value="publish">立即发布</option>
            </Select>
            <Input label="语言标识 (可选)" value={config.lang || ''} onChange={e => setConfig({ ...config, lang: e.target.value })} placeholder="e.g., en-US" />
            
            <div className="pt-4 border-t border-gray-700/50">
                <label className="block text-sm font-medium text-gray-300 mb-1">分类 (可选)</label>
                <div className="flex items-center gap-2">
                    <Input value={config.categories || ''} onChange={e => setConfig({ ...config, categories: e.target.value })} placeholder="Enter category IDs, comma separated" />
                    <Button variant="secondary" size="sm" onClick={handleFetchTerms} isLoading={isLoadingTerms}>Fetch</Button>
                </div>
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                {!isLoadingTerms && fetchedCategories.length > 0 && renderTermSelector("选择分类", fetchedCategories, selectedCategoryIds, 'categories')}
            </div>

            <div className="pt-2">
                 <label className="block text-sm font-medium text-gray-300 mb-1">标签 (可选)</label>
                <div className="flex items-center gap-2">
                    <Input value={config.tags || ''} onChange={e => setConfig({ ...config, tags: e.target.value })} placeholder="Enter tag names, comma separated" />
                </div>
                {!isLoadingTerms && fetchedTags.length > 0 && renderTermSelector("选择标签", fetchedTags, selectedTagIds, 'tags')}
            </div>
        </div>
    );
};

const CloudStorageForm: React.FC<{ config: any; setConfig: (config: any) => void; platform: PublishingPlatform }> = ({ config, setConfig, platform }) => {
    const platformSpecificFields: Record<string, { label: string, key: string, placeholder?: string, isPassword?: boolean, isTextArea?: boolean }[]> = {
        [PublishingPlatform.CLOUDFLARE_R2]: [
            { label: 'Bucket Name', key: 'bucket' },
            { label: 'Account ID', key: 'accountId' },
            { label: 'Access Key ID', key: 'accessKeyId' },
            { label: 'Secret Access Key', key: 'secretAccessKey', isPassword: true },
        ],
        [PublishingPlatform.SUPABASE]: [
            { label: 'Project URL', key: 'url', placeholder: 'https://<project>.supabase.co' },
            { label: 'Service Role Key', key: 'serviceRoleKey', isPassword: true },
            { label: 'Bucket Name', key: 'bucket' },
        ],
        [PublishingPlatform.GCS]: [
            { label: 'Project ID', key: 'projectId' },
            { label: 'Bucket Name', key: 'bucketName' },
            { label: 'Service Account Key (JSON)', key: 'serviceAccountKey', isPassword: true, isTextArea: true },
        ],
        [PublishingPlatform.S3]: [
            { label: 'Bucket Name', key: 'bucketName' },
            { label: 'Region', key: 'region', placeholder: 'e.g., us-east-1' },
            { label: 'Access Key ID', key: 'accessKeyId' },
            { label: 'Secret Access Key', key: 'secretAccessKey', isPassword: true },
        ]
    };

    const fields = platformSpecificFields[platform] || [];
    
    return (
        <div className="space-y-4">
             {fields.map(field => (
                field.isTextArea ? (
                    <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                         <textarea
                            value={config[field.key] || ''}
                            onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                            placeholder={field.placeholder || ''}
                            rows={5}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                ) : (
                    <Input
                        key={field.key}
                        label={field.label}
                        type={field.isPassword ? 'password' : 'text'}
                        value={config[field.key] || ''}
                        onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                        placeholder={field.placeholder || ''}
                    />
                )
            ))}
            <div className="pt-4 border-t border-gray-700/50">
                <Input label="上传目录前缀 (可选)" value={config.pathPrefix || ''} onChange={e => setConfig({ ...config, pathPrefix: e.target.value })} placeholder="e.g., blog/images/" />
                <Input label="公共访问 URL (可选)" value={config.publicUrl || ''} onChange={e => setConfig({ ...config, publicUrl: e.target.value })} placeholder="e.g., https://cdn.example.com" />
                <Button size="sm" variant="secondary" className="mt-2" disabled>测试上传 (即将推出)</Button>
            </div>
        </div>
    );
};


const ChannelModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (channel: PublishingChannel) => void;
    editingChannel: Partial<PublishingChannel> | null;
}> = ({ isOpen, onClose, onSave, editingChannel }) => {
    const [channel, setChannel] = useState<Partial<PublishingChannel> | null>(null);

    React.useEffect(() => {
        if (isOpen && editingChannel) {
            setChannel({ ...editingChannel });
        }
    }, [isOpen, editingChannel]);
    
    if (!isOpen || !channel) return null;

    const setConfig = (newConfig: any) => {
        setChannel(prev => prev ? ({ ...prev, config: { ...(prev.config || {}), ...newConfig }}) : null);
    };

    const handleSave = () => {
        if (channel && channel.name) {
             onSave({
                id: channel.id || `channel-${Date.now()}`,
                name: channel.name,
                platform: channel.platform || PublishingPlatform.WORDPRESS,
                config: channel.config || {},
            });
        }
    };
    
    const isSaveDisabled = !channel.name || !channel.platform;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={channel.id ? '编辑发布渠道' : '添加发布渠道'}>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <Input label="渠道名称" value={channel.name || ''} onChange={e => setChannel({ ...channel, name: e.target.value })} placeholder="e.g., My Company Blog" autoFocus/>
                <Select label="发布平台" value={channel.platform || ''} onChange={e => setChannel({ ...channel, platform: e.target.value as PublishingPlatform, config: {} })}>
                    <option value="" disabled>选择平台...</option>
                    {Object.values(PublishingPlatform).map(p => (
                        <option key={p} value={p} disabled={p !== PublishingPlatform.WORDPRESS}>{p} {p !== PublishingPlatform.WORDPRESS && '(即将推出)'}</option>
                    ))}
                </Select>
                
                <div className="pt-4 border-t border-gray-700">
                    {channel.platform === PublishingPlatform.WORDPRESS && <WordPressForm config={channel.config || {}} setConfig={setConfig} channel={channel as PublishingChannel} />}
                    {channel.platform && [PublishingPlatform.CLOUDFLARE_R2, PublishingPlatform.S3, PublishingPlatform.GCS, PublishingPlatform.SUPABASE].includes(channel.platform) && <CloudStorageForm config={channel.config || {}} setConfig={setConfig} platform={channel.platform} />}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>取消</Button>
                    <Button onClick={handleSave} disabled={isSaveDisabled}>保存</Button>
                </div>
            </div>
        </Modal>
    );
};

const PublishingQueueView: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { 
        publishingQueue, 
        setPublishingQueue, 
        publishingChannels, 
        articles,
        savedImageSets,
        postsToPublish,
        setArticles, 
        setSavedImageSets, 
        setPostsToPublish 
    } = context;

    const [selectedQueueItems, setSelectedQueueItems] = useState<Set<string>>(new Set());
    const [targetChannelId, setTargetChannelId] = useState<string>('');
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    
    const handleToggleSelection = (itemId: string) => {
        const item = publishingQueue.find(i => i.id === itemId);
        if (item?.status === 'success' || item?.status === 'publishing') return; 

        setSelectedQueueItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allSelectableIds = publishingQueue.filter(i => i.status !== 'success' && i.status !== 'publishing').map(i => i.id);
        if (selectedQueueItems.size === allSelectableIds.length) {
            setSelectedQueueItems(new Set());
        } else {
            setSelectedQueueItems(new Set(allSelectableIds));
        }
    };
    
    const updateItemInState = (sourceId: string, sourceType: string, destination: PublishedDestination) => {
        const updater = (items: any[]) => items.map(item => {
            if (item.id === sourceId) {
                return {
                    ...item,
                    publishedDestinations: [...(item.publishedDestinations || []), destination]
                };
            }
            return item;
        });

        if (sourceType === 'article') setArticles(updater);
        else if (sourceType === 'image_set') setSavedImageSets(updater);
        else if (sourceType === 'post') setPostsToPublish(updater);
    };

    const handlePublishSelected = async () => {
        const channel = publishingChannels.find(c => c.id === targetChannelId);
        if (!channel) {
            alert("Please select a valid publishing channel.");
            return;
        }
        
        const itemsToPublishFromQueue = publishingQueue.filter(item => selectedQueueItems.has(item.id));

        for (const queueItem of itemsToPublishFromQueue) {
            setPublishingQueue(prev => prev.map(q => q.id === queueItem.id ? { ...q, status: 'publishing' } : q));
            
            // Just-in-time data hydration
            let fullDataItem;
            switch (queueItem.sourceType) {
                case 'article':
                    fullDataItem = articles.find(a => a.id === queueItem.sourceId);
                    break;
                case 'post':
                    fullDataItem = postsToPublish.find(p => p.id === queueItem.sourceId);
                    break;
                case 'image_set':
                    fullDataItem = savedImageSets.find(s => s.id === queueItem.sourceId);
                    break;
            }

            if (!fullDataItem) {
                 const errorMessage = "Source data not found. It may have been deleted.";
                 setPublishingQueue(prev => prev.map(q => q.id === queueItem.id ? { ...q, status: 'failed', log: errorMessage } : q));
                 continue; // Skip to the next item
            }
            
            const itemWithData: PublishingItem = {
                ...queueItem,
                data: fullDataItem
            };

            try {
                const result = await publishItem(itemWithData, channel);
                updateItemInState(queueItem.sourceId, queueItem.sourceType, result);
                setPublishingQueue(prev => prev.map(q => q.id === queueItem.id ? { ...q, status: 'success', log: result.log } : q));

            } catch (error: any) {
                const errorMessage = error.message || "An unknown error occurred.";
                const failedDestination: PublishedDestination = {
                    platform: channel.platform,
                    status: 'failed',
                    target: channel.config.apiUrl || channel.name,
                    publishedAt: new Date().toISOString(),
                    log: errorMessage,
                };
                updateItemInState(queueItem.sourceId, queueItem.sourceType, failedDestination);
                setPublishingQueue(prev => prev.map(q => q.id === queueItem.id ? { ...q, status: 'failed', log: errorMessage } : q));
            }
        }
    };
    
    const clearCompleted = () => {
        setPublishingQueue(prev => prev.filter(item => item.status !== 'success'));
    };

    const clearAll = () => {
        if (window.confirm("Are you sure you want to clear the entire publishing queue?")) {
            setPublishingQueue([]);
            setSelectedQueueItems(new Set());
        }
    };
    
    const getStatusStyles = (status: PublishingItem['status']) => {
        switch (status) {
            case 'queued': return 'border-gray-600';
            case 'publishing': return 'border-blue-500 animate-pulse';
            case 'success': return 'border-green-500/50 bg-green-900/10';
            case 'failed': return 'border-red-500/50 bg-red-900/10';
            default: return 'border-gray-700';
        }
    };
    
    const hasAnyPublishing = publishingQueue.some(i => i.status === 'publishing');

    return (
      <div className="h-full flex flex-col">
        <h2 className="text-2xl font-bold mb-4">发布队列 ({publishingQueue.length})</h2>
        <div className="flex items-center mb-4 gap-4">
            <Checkbox 
                id="select-all-queue"
                checked={publishingQueue.length > 0 && selectedQueueItems.size === publishingQueue.filter(i => i.status === 'queued' || i.status === 'failed').length}
                isIndeterminate={selectedQueueItems.size > 0 && selectedQueueItems.size < publishingQueue.filter(i => i.status === 'queued' || i.status === 'failed').length}
                onChange={handleSelectAll}
                disabled={hasAnyPublishing}
            />
            <label htmlFor="select-all-queue">全选</label>
        </div>
        <div className="flex-grow space-y-3 overflow-y-auto pr-2">
            {publishingQueue.length > 0 ? publishingQueue.map(item => (
                <Card key={item.id} className={`p-3 transition-all ${getStatusStyles(item.status)}`}>
                    <div className="flex items-start gap-3">
                         <Checkbox
                            id={`queue-${item.id}`}
                            checked={selectedQueueItems.has(item.id)}
                            onChange={() => handleToggleSelection(item.id)}
                            className="mt-1"
                            disabled={item.status === 'success' || item.status === 'publishing'}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{item.name}</p>
                            <p className="text-sm text-gray-400 capitalize">{item.sourceType.replace('_', ' ')}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                           {item.status === 'publishing' && <Spinner size="sm" />}
                           {item.status === 'success' && <span className="text-sm font-bold text-green-400">SUCCESS</span>}
                           {item.status === 'failed' && <span className="text-sm font-bold text-red-400">FAILED</span>}
                           <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]" title={item.log}>{item.log}</p>
                        </div>
                    </div>
                </Card>
            )) : <p className="text-center text-gray-500 py-10">发布队列是空的。</p>}
        </div>
        <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-700 space-y-4">
            <Select label="发布到渠道" value={targetChannelId} onChange={e => setTargetChannelId(e.target.value)}>
                <option value="" disabled>选择一个渠道...</option>
                {publishingChannels.map(c => <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    variant="primary" 
                    onClick={handlePublishSelected} 
                    disabled={selectedQueueItems.size === 0 || !targetChannelId || hasAnyPublishing}
                    isLoading={hasAnyPublishing}
                >
                    发布选中 ({selectedQueueItems.size})
                </Button>
                <Button variant="secondary" onClick={() => setIsLogModalOpen(true)}>查看发布日志</Button>
                <Button variant="secondary" onClick={clearCompleted}>清除已完成</Button>
                <Button variant="danger" onClick={clearAll}>清空队列</Button>
            </div>
        </div>
         <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title="发布日志">
            <PublishingStatusView />
        </Modal>
      </div>
    );
};

const PublishingManager: React.FC<{ setPage: (page: Page) => void }> = ({ setPage }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { publishingChannels, setPublishingChannels } = context;

    const [editingChannel, setEditingChannel] = useState<Partial<PublishingChannel> | null>(null);
    const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

    const handleSaveChannel = (channel: PublishingChannel) => {
        setPublishingChannels(prev => {
            const existing = prev.find(c => c.id === channel.id);
            if (existing) {
                return prev.map(c => c.id === channel.id ? channel : c);
            }
            return [...prev, channel];
        });
        
        // After saving, reset form inputs inside the modal if it's a new channel being edited from scratch
        if(editingChannel && !editingChannel.id) {
            setEditingChannel(null);
        }

        setIsChannelModalOpen(false);
    };
    
    const handleEditChannel = (channel: PublishingChannel) => {
        setEditingChannel(channel);
        setIsChannelModalOpen(true);
    };

    const handleAddNewChannel = () => {
        setEditingChannel({ name: '', platform: PublishingPlatform.WORDPRESS, config: { status: 'draft' } });
        setIsChannelModalOpen(true);
    };
    
    const handleDeleteChannel = (id: string) => {
        if (window.confirm("Are you sure you want to delete this publishing channel? This cannot be undone.")) {
            setPublishingChannels(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white flex-shrink-0">发布管理</h1>
            <p className="text-gray-400 mt-2 flex-shrink-0">在这里配置您的发布渠道，并管理待发布的项目队列。</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 flex-grow min-h-0">
              {/* Left Column: Channels */}
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h2 className="text-2xl font-bold">发布渠道</h2>
                  <Button onClick={handleAddNewChannel}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    添加渠道
                  </Button>
                </div>
                 <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                    {publishingChannels.length > 0 ? publishingChannels.map(channel => (
                        <Card key={channel.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400">{platformIcons[channel.platform]}</span>
                                    <div>
                                        <p className="font-bold text-white">{channel.name}</p>
                                        <p className="text-sm text-gray-500">{channel.platform}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditChannel(channel)}><PencilIcon className="w-4 h-4"/></Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDeleteChannel(channel.id)}><TrashIcon className="w-4 h-4"/></Button>
                                </div>
                            </div>
                        </Card>
                    )) : <p className="text-center text-gray-500 py-10">没有已配置的渠道。</p>}
                 </div>
              </div>
              {/* Right Column: Queue */}
              <div className="h-full flex flex-col">
                <PublishingQueueView setPage={setPage} />
              </div>
            </div>
            {isChannelModalOpen && (
                 <ChannelModal
                    isOpen={isChannelModalOpen}
                    onClose={() => setIsChannelModalOpen(false)}
                    onSave={handleSaveChannel}
                    editingChannel={editingChannel}
                />
            )}
        </div>
    );
};

export default PublishingManager;