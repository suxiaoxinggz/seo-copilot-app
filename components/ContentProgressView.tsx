

import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Article, Project, KeywordSubProject, PublishingItem } from '../types';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';
import { TrashIcon, PublishIcon } from './icons';
import StatusBadgeGrid from './StatusBadgeGrid';


// Helper to trigger TXT file download
const downloadTXT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


const ContentProgressView: React.FC = () => {
    const context = useContext(AppContext);
    const { articles, setArticles, projects, keywordLibrary, setPublishingQueue } = context || { articles: [], setArticles: () => {}, projects: [], keywordLibrary: [], setPublishingQueue: () => {} };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

    const handleCardClick = (article: Article) => {
        setSelectedArticle(article);
        setEditedContent(article.content);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedArticle(null);
        setEditedContent('');
    };

    const handleSave = () => {
        if (!selectedArticle) return;

        // Don't save if content hasn't changed.
        if (editedContent.trim() === selectedArticle.content.trim()) {
            handleCloseModal();
            return;
        }
        
        // Determine the base title from the article that was opened
        const baseTitle = selectedArticle.title.replace(/\s\(Version \d+\)$/, '').trim();
        
        // Find all articles belonging to this lineage to determine the next version number
        const lineage = articles.filter(a => a.title.replace(/\s\(Version \d+\)$/, '').trim() === baseTitle);
        
        // New version is the next number in the sequence
        const nextVersion = lineage.length + 1;
        
        const newTitle = `${baseTitle} (Version ${nextVersion})`;

        const newArticle: Article = {
            ...selectedArticle, // Inherit project IDs etc.
            id: `article-${Date.now()}`,
            title: newTitle, // Use the new versioned title
            content: editedContent.trim(), // Use the new content from the textarea
            createdAt: new Date().toISOString(),
            publishedDestinations: [],
        };

        setArticles([...articles, newArticle]);
        handleCloseModal();
    };
    
    const handleToggleSelection = (articleId: string) => {
        setSelectedArticles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(articleId)) {
                newSet.delete(articleId);
            } else {
                newSet.add(articleId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedArticles.size === articles.length) {
            setSelectedArticles(new Set());
        } else {
            setSelectedArticles(new Set(articles.map(a => a.id)));
        }
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`您确定要删除选中的 ${selectedArticles.size} 篇文章吗？`)) {
            const selectedIds = Array.from(selectedArticles);
            const newArticles = articles.filter(a => !selectedIds.includes(a.id));
            setArticles(newArticles);
            setSelectedArticles(new Set());
        }
    };

    const handleAddToQueue = () => {
        const selectedIds = Array.from(selectedArticles);
        const articlesToAdd = articles.filter(a => selectedIds.includes(a.id));
        
        const newQueueItems: PublishingItem[] = articlesToAdd.map(article => ({
            id: `queue-article-${article.id}-${Date.now()}`,
            sourceId: article.id,
            sourceType: 'article',
            name: article.title,
            status: 'queued',
            log: '等待发布',
        }));

        setPublishingQueue(prev => {
             const existingIds = new Set(prev.map(p => p.sourceId));
             const uniqueNewItems = newQueueItems.filter(item => !existingIds.has(item.sourceId));
             return [...prev, ...uniqueNewItems];
        });
        setSelectedArticles(new Set());
        alert(`${newQueueItems.length}篇文章已添加到发布队列。`);
    };

    const formatArticleDataAsText = (articlesToExport: Article[], allProjects: Project[], allKeywordLibraries: KeywordSubProject[]): string => {
        let textContent = '';
        articlesToExport.forEach(a => {
            const parent = allProjects.find(p => p.id === a.parentProjectId);
            const sub = allKeywordLibraries.find(sp => sp.id === a.subProjectId);
            textContent += '==================================================\n';
            textContent += `文章标题: ${a.title}\n`;
            textContent += `父项目: ${parent?.name || 'N/A'}\n`;
            textContent += `子项目: ${sub?.name || 'N/A'}\n`;
            textContent += `创建于: ${new Date(a.createdAt).toLocaleDateString()}\n`;
            textContent += `使用模型: ${a.modelUsed}\n\n`;
            textContent += '--- 内容 ---\n';
            textContent += `${a.content}\n`;
            textContent += '==================================================\n\n';
        });
        return textContent;
    };


    const handleExportSelected = () => {
        const selectedIds = Array.from(selectedArticles);
        const articlesToExport = articles.filter(a => selectedIds.includes(a.id));
        const textContent = formatArticleDataAsText(articlesToExport, projects, keywordLibrary);
        downloadTXT(textContent, `articles-export-${new Date().toISOString().split('T')[0]}.txt`);
        setSelectedArticles(new Set());
    };


    if (articles.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                <p>您保存的文章将显示在此处。</p>
                <p className="text-sm">转到“大纲与文章”生成器来创建和保存您的第一篇内容。</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center gap-4 mt-8 mb-4">
                <Checkbox
                    id="select-all-articles"
                    checked={articles.length > 0 && selectedArticles.size === articles.length}
                    isIndeterminate={selectedArticles.size > 0 && selectedArticles.size < articles.length}
                    onChange={handleSelectAll}
                />
                <label htmlFor="select-all-articles" className="text-white font-medium">全选</label>
            </div>
            <div className="space-y-4 pb-20">
                {articles.map(article => {
                    const parentProject = projects.find(p => p.id === article.parentProjectId);
                    const subProject = keywordLibrary.find(sp => sp.id === article.subProjectId);
                    
                    return (
                        <Card key={article.id}>
                            <div className="flex items-start gap-4">
                                 <Checkbox
                                    id={`select-article-${article.id}`}
                                    checked={selectedArticles.has(article.id)}
                                    onChange={() => handleToggleSelection(article.id)}
                                    className="mt-2"
                                    aria-label={`选择文章 ${article.title}`}
                                />
                                <div 
                                    className="flex-1 cursor-pointer"
                                    onClick={() => handleCardClick(article)}
                                >
                                    <div className="flex justify-between items-start hover:bg-gray-700/20 p-1 rounded-md">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white">{article.title}</h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                项目: <span className="font-semibold text-gray-300">{parentProject?.name || 'N/A'} / {subProject?.name || 'N/A'}</span>
                                            </p>
                                             <div className="mt-2">
                                                <StatusBadgeGrid destinations={article.publishedDestinations} />
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-xs text-gray-500">创建于: {new Date(article.createdAt).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500 mt-1">模型: <span className="font-semibold text-gray-400">{article.modelUsed}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {selectedArticles.size > 0 && (
                 <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-white font-semibold">{selectedArticles.size} 已选择</span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedArticles(new Set())}>取消选择</Button>
                    <Button variant="primary" size="sm" onClick={handleAddToQueue}>
                        <PublishIcon className="w-4 h-4 mr-1" /> 添加到发布队列
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                        <TrashIcon className="w-4 h-4 mr-1" /> 删除
                    </Button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedArticle?.title || '编辑文章'}>
                {selectedArticle && (
                    <div className="flex flex-col h-[75vh]">
                        <div className="flex-grow overflow-y-auto pr-2">
                             <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="文章内容..."
                                autoFocus
                            />
                        </div>
                        <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
                            <Button variant="secondary" onClick={handleCloseModal}>关闭</Button>
                            <Button 
                                variant="primary" 
                                onClick={handleSave}
                                disabled={!editedContent.trim() || editedContent.trim() === selectedArticle.content.trim()}
                            >
                                保存为新版本
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default ContentProgressView;