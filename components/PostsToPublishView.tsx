



import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { PostToPublish, PublishingItem } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { TrashIcon, DownloadIcon, PublishIcon } from './icons';
import Checkbox from './ui/Checkbox';
import Modal from './ui/Modal';
import StatusBadgeGrid from './StatusBadgeGrid';

// Helper to trigger HTML file download
const downloadHTML = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


export const PostsToPublishView: React.FC = () => {
    const context = useContext(AppContext);
    const { postsToPublish, setPostsToPublish, projects, keywordLibrary, setPublishingQueue } = context || { postsToPublish: [], setPostsToPublish: () => {}, projects: [], keywordLibrary: [], setPublishingQueue: () => {} };

    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
    const [viewingPost, setViewingPost] = useState<PostToPublish | null>(null);

    const handleToggleSelection = (postId: string) => {
        setSelectedPosts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };
    
    const handleSelectAll = () => {
        if (selectedPosts.size === postsToPublish.length) {
            setSelectedPosts(new Set());
        } else {
            setSelectedPosts(new Set(postsToPublish.map(p => p.id)));
        }
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`您确定要删除选中的 ${selectedPosts.size} 篇文章吗?`)) {
            const selectedIds = Array.from(selectedPosts);
            setPostsToPublish(postsToPublish.filter(p => !selectedIds.includes(p.id)));
            setSelectedPosts(new Set());
        }
    };

    const handleAddToQueue = () => {
        const selectedIds = Array.from(selectedPosts);
        const postsToAdd = postsToPublish.filter(p => selectedIds.includes(p.id));
        
        const newQueueItems: PublishingItem[] = postsToAdd.map(post => ({
            id: `queue-post-${post.id}-${Date.now()}`,
            sourceId: post.id,
            sourceType: 'post',
            name: post.title,
            status: 'queued',
            log: '等待发布',
        }));

        setPublishingQueue(prev => {
             const existingIds = new Set(prev.map(p => p.sourceId));
             const uniqueNewItems = newQueueItems.filter(item => !existingIds.has(item.sourceId));
             return [...prev, ...uniqueNewItems];
        });
        setSelectedPosts(new Set());
        alert(`${newQueueItems.length}篇文章已添加到发布队列。`);
    };
    
    const handleExportSelected = () => {
        const selectedIds = Array.from(selectedPosts);
        postsToPublish
            .filter(p => selectedIds.includes(p.id))
            .forEach(p => {
                const filename = `${p.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.html`;
                downloadHTML(p.htmlContent, filename);
            });
    };

    if (postsToPublish.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                <p>您保存的待发布文章将显示在此处。</p>
                <p className="text-sm">转到“图文加工”模块来创建并保存您的第一篇图文内容。</p>
            </div>
        );
    }

    return (
        <>
        <div className="mt-8 space-y-4 pb-20">
            <div className="flex items-center gap-4">
                 <Checkbox
                    id="select-all-posts"
                    checked={postsToPublish.length > 0 && selectedPosts.size === postsToPublish.length}
                    isIndeterminate={selectedPosts.size > 0 && selectedPosts.size < postsToPublish.length}
                    onChange={handleSelectAll}
                />
                <label htmlFor="select-all-posts" className="text-white font-medium">全选</label>
            </div>

            {postsToPublish.map(post => {
                const parentProject = projects.find(p => p.id === post.parentProjectId);
                const subProject = keywordLibrary.find(sp => sp.id === post.subProjectId);
                
                const keywordsPreview = useMemo(() => {
                    return post.keywordContext
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.toLowerCase().includes('keyword:') || line.toLowerCase().includes('lsi:'))
                        .map(line => line.split(':')[1]?.trim())
                        .filter(Boolean)
                        .slice(0, 15)
                        .join('; ');
                }, [post.keywordContext]);

                return (
                    <Card key={post.id} className="cursor-pointer hover:border-blue-500/50 transition-colors" >
                        <div className="flex items-start gap-4">
                            <Checkbox
                                id={`select-post-${post.id}`}
                                checked={selectedPosts.has(post.id)}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelection(post.id);
                                }}
                                className="mt-2"
                                aria-label={`选择文章 ${post.title}`}
                            />
                            <div className="flex-1 min-w-0" onClick={() => setViewingPost(post)}>
                                <div className="flex justify-between items-start">
                                    <div className='flex-1'>
                                        <h3 className="text-xl font-bold text-white truncate">{post.title}</h3>
                                        <div className="mt-2">
                                            <StatusBadgeGrid destinations={post.publishedDestinations} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right flex-shrink-0 ml-4">
                                        {parentProject?.name}{subProject && ` / ${subProject.name}`}<br />
                                        {post.usedImages.length} 张图片 | {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <p className="text-sm text-gray-400 mt-2 truncate" title={keywordsPreview}>
                                    <span className="font-semibold text-gray-300">关键词: </span>{keywordsPreview || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>

        {selectedPosts.size > 0 && (
            <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                <span className="text-white font-semibold">{selectedPosts.size} 已选择</span>
                <Button variant="secondary" size="sm" onClick={() => setSelectedPosts(new Set())}>取消选择</Button>
                 <Button variant="primary" size="sm" onClick={handleAddToQueue}>
                    <PublishIcon className="w-4 h-4 mr-1" /> 添加到发布队列
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExportSelected}>
                    <DownloadIcon className="w-4 h-4 mr-1" /> 导出 (HTML)
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                    <TrashIcon className="w-4 h-4 mr-1" /> 删除
                </Button>
            </div>
        )}

        <Modal isOpen={!!viewingPost} onClose={() => setViewingPost(null)} title={viewingPost?.title || '文章预览'}>
            {viewingPost && (
                 <div className="h-[75vh] flex flex-col bg-gray-800 p-4">
                    <div className="p-4 bg-white rounded-md flex-grow overflow-y-auto">
                        <div 
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: viewingPost.htmlContent }}
                        />
                    </div>
                 </div>
            )}
        </Modal>
        </>
    );
};