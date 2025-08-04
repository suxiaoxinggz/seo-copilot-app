import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Model, KeywordSubProject, Article, Project } from '../types';
import { ARTICLE_PROMPT_TEMPLATE } from '../constants';
import { generateArticle, translateText } from '../services/llmService';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import Toggle from './ui/Toggle';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { PencilIcon } from './icons';

// Helper to format a sub-project into a string for the context textarea
const formatSubProjectForContext = (subProject: KeywordSubProject): string => {
    let context = `Sub-Project: ${subProject.name}\n`;
    context += `Model Used: ${subProject.modelUsed}\n\n`;

    subProject.keywords.forEach(l1 => {
        context += `--- Core Keyword ---\n`;
        context += `Keyword: ${l1.keyword}\n`;
        context += `Type: ${l1.type}\n`;
        context += `Page Type: ${l1.pageType}\n\n`;
        
        l1.children.forEach(l2 => {
            context += `  --- Sub-core Keyword ---\n`;
            context += `  Keyword: ${l2.keyword}\n`;
            context += `  Type: ${l2.type}\n`;
            if(l2.lsi.length > 0) {
                 context += `  LSI: ${l2.lsi.map(l => l.text).join(', ')}\n\n`;
            }
        });
    });
    return context;
};


const ArticleGenerator: React.FC = () => {
    const context = useContext(AppContext);
    
    // Left panel state
    const [promptTemplate, setPromptTemplate] = useState(ARTICLE_PROMPT_TEMPLATE);
    const [keywordContext, setKeywordContext] = useState('');
    const [selectedModelId, setSelectedModelId] = useState(context?.defaultModelId || context?.models[0]?.id || '');
    const [enableWebSearch, setEnableWebSearch] = useState(false);
    
    // Right panel state
    const [generatedArticle, setGeneratedArticle] = useState('');
    const [translatedArticle, setTranslatedArticle] = useState('');

    // Control state
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generationModel, setGenerationModel] = useState<Model | null>(null);

    // Modal states
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);
    
    // Save modal specific state
    const [articleTitle, setArticleTitle] = useState('');
    const [saveToParentProject, setSaveToParentProject] = useState(''); // Holds ID or "create_new"
    const [saveToSubProject, setSaveToSubProject] = useState(''); // Holds ID or "create_new"
    const [newParentProjectName, setNewParentProjectName] = useState('');
    const [newSubProjectName, setNewSubProjectName] = useState('');


    if (!context) return null;
    const { models, projects, keywordLibrary, fetchData, supabase, session } = context;
    const currentSelectedModel = models.find(m => m.id === selectedModelId);

    const handleGenerate = async () => {
        if (!currentSelectedModel) {
            setError("No model selected.");
            return;
        }
        if (!keywordContext.trim()) {
            setError("Keyword context cannot be empty.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedArticle('');
        setTranslatedArticle('');
        try {
            const result = await generateArticle(keywordContext, currentSelectedModel, promptTemplate);
            setGeneratedArticle(result);
            setGenerationModel(currentSelectedModel);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!generatedArticle || !currentSelectedModel) return;
        setIsTranslating(true);
        try {
            const result = await translateText(generatedArticle, currentSelectedModel);
            setTranslatedArticle(result);
        } catch (err) {
            // Handle translation error if necessary
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCloseSaveModal = () => {
        setIsSaveModalOpen(false);
        setArticleTitle('');
        setSaveToParentProject('');
        setSaveToSubProject('');
        setNewParentProjectName('');
        setNewSubProjectName('');
    };

    const handleOpenSaveModal = () => {
        // Pre-fill title with the first line of the article, assuming it's a heading
        setArticleTitle(generatedArticle.split('\n')[0].replace(/#/g, '').trim() || '');
        setSaveToParentProject(projects.length > 0 ? projects[0].id : '');
        setSaveToSubProject('');
        setNewParentProjectName('');
        setNewSubProjectName('');
        setIsSaveModalOpen(true);
    };

    const handleSaveArticle = async () => {
        if (!generationModel || !supabase || !session) return;

        let finalParentProjectId = saveToParentProject;
        let finalSubProjectId = saveToSubProject;
        
        try {
            if (saveToParentProject === 'create_new') {
                if (!newParentProjectName.trim() || !newSubProjectName.trim()) {
                    alert("Please provide names for the new parent and sub-projects.");
                    return;
                }
                const newProject: Omit<Project, 'user_id'> = {
                    id: `proj-${Date.now()}`,
                    name: newParentProjectName.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const { data: newProjData, error: projError } = await supabase.from('projects').insert({ ...newProject, user_id: session.user.id }).select().single();
                if (projError) throw projError;
                finalParentProjectId = newProjData.id;
                
                const newSubProject: Omit<KeywordSubProject, 'user_id'> = {
                    id: `subproj-${Date.now()}`,
                    name: newSubProjectName.trim(),
                    parentProjectId: finalParentProjectId,
                    savedAt: new Date().toISOString(),
                    modelUsed: generationModel.nickname,
                    keywords: [],
                };
                const { data: newSubProjData, error: subProjError } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id }).select().single();
                if (subProjError) throw subProjError;
                finalSubProjectId = newSubProjData.id;

            } else if (saveToSubProject === 'create_new') {
                if (!newSubProjectName.trim()) {
                    alert("Please provide a name for the new sub-project.");
                    return;
                }
                const newSubProject: Omit<KeywordSubProject, 'user_id'> = {
                    id: `subproj-${Date.now()}`,
                    name: newSubProjectName.trim(),
                    parentProjectId: finalParentProjectId,
                    savedAt: new Date().toISOString(),
                    modelUsed: generationModel.nickname,
                    keywords: [],
                };
                const { data: newSubProjData, error: subProjError } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id }).select().single();
                if (subProjError) throw subProjError;
                finalSubProjectId = newSubProjData.id;
            }

            if (!articleTitle.trim() || !finalParentProjectId || !finalSubProjectId) {
                 alert("Please ensure an article title, parent project, and sub-project are set.");
                 return;
            }

            const newArticle: Omit<Article, 'user_id'> = {
                id: `article-${Date.now()}`,
                title: articleTitle.trim(),
                content: generatedArticle,
                keywordContext: keywordContext,
                parentProjectId: finalParentProjectId,
                subProjectId: finalSubProjectId,
                createdAt: new Date().toISOString(),
                modelUsed: generationModel.nickname,
                publishedDestinations: [],
            };

            const { error: articleError } = await supabase.from('articles').insert({ ...newArticle, user_id: session.user.id });
            if (articleError) throw articleError;
            
            await fetchData();
            handleCloseSaveModal();

        } catch (err) {
            alert(`Save failed: ${(err as Error).message}`);
        }
    };
    
    const handleSelectSubProject = (subProject: KeywordSubProject) => {
        setKeywordContext(formatSubProjectForContext(subProject));
        setIsLibraryModalOpen(false);
    };

    const isSaveDisabled = () => {
        if (!articleTitle.trim() || !generationModel) return true;

        if (saveToParentProject === 'create_new') {
            return !newParentProjectName.trim() || !newSubProjectName.trim();
        }
        if (!saveToParentProject) return true;

        if (saveToSubProject === 'create_new') {
            return !newSubProjectName.trim();
        }
        if (!saveToSubProject) return true;

        return false;
    };

    return (
        <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-1/3 min-w-[450px] max-w-[550px] bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white">文章生成</h2>
                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Prompt Template</label>
                        <Button variant="secondary" size="sm" onClick={() => { setEditingPrompt(promptTemplate); setIsPromptModalOpen(true); }}>查看/编辑</Button>
                    </div>
                    <textarea readOnly value={promptTemplate} rows={5} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-400 cursor-pointer" />
                </Card>
                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">关键词上下文</label>
                        <Button variant="secondary" size="sm" onClick={() => setIsLibraryModalOpen(true)}>从库中提取</Button>
                    </div>
                    <textarea
                        value={keywordContext}
                        onChange={(e) => setKeywordContext(e.target.value)}
                        rows={12}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm"
                        placeholder="Paste keywords or extract from your library."
                    />
                </Card>
                <Card>
                     <div className="space-y-4">
                       <Select label="Select Model" value={selectedModelId || ''} onChange={(e) => setSelectedModelId(e.target.value)}>
                            {models.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                       </Select>
                       <Toggle label="Enable Web Search" enabled={enableWebSearch} setEnabled={setEnableWebSearch} disabled={!currentSelectedModel?.supportsWebSearch} />
                    </div>
                </Card>
                <div className="mt-auto pt-4">
                    <Button onClick={handleGenerate} isLoading={isLoading} className="w-full text-lg">
                        生成文章
                    </Button>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 p-8 flex flex-col overflow-y-auto">
                 {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg text-gray-300">正在生成文章...</p>
                    </div>
                )}
                {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-md mb-4">{error}</div>}
                
                {!isLoading && !generatedArticle && !error && (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>您生成的文章将显示在此处。</p>
                    </div>
                )}

                {generatedArticle && (
                    <div className="flex-1 flex flex-col h-full">
                         <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">生成内容</h2>
                                <Button variant="secondary" size="sm" onClick={() => setIsContentModalOpen(true)} aria-label="Expand and Edit Content">
                                    <PencilIcon className="w-4 h-4" />
                                </Button>
                            </div>
                            <div>
                                <Button onClick={handleGenerate} isLoading={isLoading} size="sm" variant="secondary" className="mr-2">重新生成</Button>
                                <Button onClick={handleOpenSaveModal} size="sm" variant="primary">保存文章</Button>
                            </div>
                        </div>
                        <textarea
                            value={generatedArticle}
                            onChange={(e) => setGeneratedArticle(e.target.value)}
                            className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-md p-4 resize-none"
                        />
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-semibold text-white">翻译 (中文)</h3>
                                <Button onClick={handleTranslate} isLoading={isTranslating} size="sm" variant="secondary">翻译</Button>
                            </div>
                            <div className="w-full h-40 bg-gray-800 border border-gray-700 rounded-md p-4 whitespace-pre-wrap overflow-y-auto">
                                {translatedArticle || <span className="text-gray-500">翻译结果将显示在此处...</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modals */}
            <Modal isOpen={isPromptModalOpen} onClose={() => setIsPromptModalOpen(false)} title="编辑文章提示">
                <textarea value={editingPrompt} onChange={(e) => setEditingPrompt(e.target.value)} rows={15} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
                <div className="flex justify-end mt-4">
                    <Button onClick={() => { setPromptTemplate(editingPrompt); setIsPromptModalOpen(false); }}>保存提示</Button>
                </div>
            </Modal>
            
            <Modal isOpen={isLibraryModalOpen} onClose={() => setIsLibraryModalOpen(false)} title="从库中提取关键词">
                <div className="max-h-[60vh] overflow-y-auto">
                    {keywordLibrary.length > 0 ? (
                        <ul className="space-y-2">
                            {keywordLibrary.map(sp => (
                                <li key={sp.id} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer" onClick={() => handleSelectSubProject(sp)}>
                                    <p className="font-semibold text-white">{sp.name}</p>
                                    <p className="text-sm text-gray-400">父项目: {projects.find(p => p.id === sp.parentProjectId)?.name}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center">您的库中没有子项目。</p>}
                </div>
            </Modal>

            <Modal isOpen={isContentModalOpen} onClose={() => setIsContentModalOpen(false)} title="编辑内容">
                <div className="h-[75vh] flex flex-col">
                    <textarea
                        value={generatedArticle}
                        onChange={(e) => setGeneratedArticle(e.target.value)}
                        className="w-full flex-grow bg-gray-900 border border-gray-600 rounded-md p-3 text-base resize-none"
                        autoFocus
                    />
                </div>
            </Modal>
            
             <Modal isOpen={isSaveModalOpen} onClose={handleCloseSaveModal} title="保存文章">
                <div className="space-y-4">
                    <Input label="文章标题" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} autoFocus />
                    
                    <Select 
                        label="父项目" 
                        value={saveToParentProject} 
                        onChange={(e) => {
                            setSaveToParentProject(e.target.value);
                            setSaveToSubProject('');
                            setNewSubProjectName('');
                        }}
                    >
                        <option value="">选择父项目...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        <option value="create_new">+ 创建新项目</option>
                    </Select>

                    {saveToParentProject === 'create_new' && (
                        <div className="pl-4 mt-2 space-y-4 border-l-2 border-gray-600">
                            <Input 
                                label="新父项目名称" 
                                value={newParentProjectName}
                                onChange={(e) => setNewParentProjectName(e.target.value)}
                                placeholder="e.g. Q4 Content Strategy"
                            />
                            <Input 
                                label="新子项目名称" 
                                value={newSubProjectName}
                                onChange={(e) => setNewSubProjectName(e.target.value)}
                                placeholder="e.g. Initial Blog Posts"
                            />
                        </div>
                    )}

                    {saveToParentProject && saveToParentProject !== 'create_new' && (
                        <>
                            <Select 
                                label="子项目" 
                                value={saveToSubProject} 
                                onChange={(e) => setSaveToSubProject(e.target.value)} 
                            >
                                <option value="">选择子项目...</option>
                                {keywordLibrary.filter(sp => sp.parentProjectId === saveToParentProject).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                                <option value="create_new">+ 创建新子项目</option>
                            </Select>

                            {saveToSubProject === 'create_new' && (
                                <div className="pl-4 mt-2 border-l-2 border-gray-600">
                                    <Input 
                                        label="新子项目名称"
                                        value={newSubProjectName}
                                        onChange={(e) => setNewSubProjectName(e.target.value)}
                                        placeholder="e.g. November Articles"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="secondary" onClick={handleCloseSaveModal}>取消</Button>
                        <Button variant="primary" onClick={handleSaveArticle} disabled={isSaveDisabled()}>保存</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ArticleGenerator;