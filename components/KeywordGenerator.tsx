import React, { useState, useContext, useCallback, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import Button from './ui/Button';
import Card from './ui/Card';
import Select from './ui/Select';
import Toggle from './ui/Toggle';
import { generateKeywordMap, generateLsiForNode, translateBatch } from '../services/llmService';
import { KeywordMap, Model, RenderLevel1Node, RenderLsiNode, SelectedKeywords, KeywordSubProject, SavedLevel1Node, RenderLevel2Node, SavedLevel2Node, Project } from '../types';
import KeywordMapNode from './KeywordMapNode';
import { SEO_PROMPT_TEMPLATE } from '../constants';
import Modal from './ui/Modal';
import Input from './ui/Input';
import FilterBar, { FilterState } from './FilterBar';


// NEW: Add a mapping for English page types from legacy data to the Chinese equivalents used in filters.
const PAGE_TYPE_MAP: { [key: string]: string } = {
  'Product Detail Pages': '产品详情类',
  'Article/Blog Pages': '文章类',
  'Hub/Category Pages': '聚合类',
  // Map Chinese values to themselves to handle both old and new data gracefully.
  '产品详情类': '产品详情类',
  '文章类': '文章类',
  '聚合类': '聚合类',
};

// Utility to transform raw map to renderable map with unique IDs
const transformToRenderableMap = (map: KeywordMap): RenderLevel1Node[] => {
    return map.keywordHierarchy.map((l1, i) => ({
        ...l1,
        id: `l1-${i}`,
        children: l1.children.map((l2, j) => ({
            ...l2,
            id: `l1-${i}-l2-${j}`,
            lsi: (l2.lsi || []).map((lsiText, k) => ({
                id: `l1-${i}-l2-${j}-lsi-${k}`,
                text: lsiText,
            })),
        })),
    }));
};


const KeywordGenerator: React.FC = () => {
    const context = useContext(AppContext);
    const [initialKeywords, setInitialKeywords] = useState('vividcozy bedding, bedding sets, buy vividcozy bedding');
    const [extraInstructions, setExtraInstructions] = useState('Focus on bedroom scenarios for young professionals.');
    
    // Model used for the *last successful generation*
    const [generationModel, setGenerationModel] = useState<Model | null>(null);

    const [enableWebSearch, setEnableWebSearch] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [keywordMap, setKeywordMap] = useState<RenderLevel1Node[] | null>(null);
    const [selectedKeywords, setSelectedKeywords] = useState<SelectedKeywords>({});
    const [filters, setFilters] = useState<FilterState>({ category: '', pageType: '', userBehavior: '' });
    
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [translatingNodeId, setTranslatingNodeId] = useState<string | null>(null);

    const [promptTemplate, setPromptTemplate] = useState(SEO_PROMPT_TEMPLATE);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState('');

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [subProjectName, setSubProjectName] = useState('');
    const [parentProjectId, setParentProjectId] = useState('');
    const [newParentProjectName, setNewParentProjectName] = useState('');

    const [expandedL1Nodes, setExpandedL1Nodes] = useState<Record<string, boolean> | null>(null);

    
    if (!context) return null;
    const { models, defaultModelId, projects, keywordLibrary, fetchData, supabase, session } = context;

    // The model currently selected in the dropdown
    const [selectedModelId, setSelectedModelId] = useState<string>(context?.defaultModelId || models[0]?.id);
    const currentSelectedModel = models.find(m => m.id === selectedModelId);

    const modelWarning = useMemo(() => {
        if (!generationModel || !currentSelectedModel) return null;
        if (generationModel.id !== currentSelectedModel.id) {
            return `LSI and Translation generation will still use the original model (${generationModel.nickname}) for consistency.`;
        }
        return null;
    }, [generationModel, currentSelectedModel]);

    const handleGenerateMap = async () => {
        if (!currentSelectedModel) {
            setError("No model selected.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setKeywordMap(null);
        setSelectedKeywords({});
        setTranslations({}); // Reset translations on new generation
        setExpandedL1Nodes(null); // Reset expansion state
        try {
            const result = await generateKeywordMap(initialKeywords, extraInstructions, currentSelectedModel, promptTemplate);
            const renderableMap = transformToRenderableMap(result);
            setKeywordMap(renderableMap);
            setGenerationModel(currentSelectedModel); // Lock the model on successful generation
            // Initialize all nodes to be expanded
            const initialExpandedState = renderableMap.reduce((acc, node) => {
                acc[node.id] = true;
                return acc;
            }, {} as Record<string, boolean>);
            setExpandedL1Nodes(initialExpandedState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateLsi = useCallback(async (level1Node: RenderLevel1Node, level2NodeId: string): Promise<void> => {
        const level2Node = level1Node.children.find(c => c.id === level2NodeId);
        // Always use the model from the initial generation for consistency
        if (!level2Node || !keywordMap || !generationModel) return;

        const contextForLsi = {
            initialKeywords,
            originalPrompt: extraInstructions,
            level1Keyword: level1Node.keyword,
            level1Type: level1Node.type,
            level2Keyword: level2Node.keyword,
            level2Type: level2Node.type,
            existingLSI: level2Node.lsi.map(l => l.text),
        };

        const newLsis = await generateLsiForNode(contextForLsi, generationModel);

        setKeywordMap(currentMap => {
            if (!currentMap) return null;
            return currentMap.map(l1 => {
                if (l1.id !== level1Node.id) return l1;
                return {
                    ...l1,
                    children: l1.children.map(l2 => {
                        if (l2.id !== level2NodeId) return l2;
                        
                        const existingLsiTexts = new Set(l2.lsi.map(l => l.text));
                        const uniqueNewLsis = newLsis
                          .filter(nl => !existingLsiTexts.has(nl))
                          .map((text, index): RenderLsiNode => ({
                            id: `${l2.id}-lsi-${l2.lsi.length + index}`,
                            text,
                            isNew: true, // Mark as new
                          }));

                        return {
                            ...l2,
                            lsi: [...l2.lsi.map(l => ({...l, isNew: false})), ...uniqueNewLsis] // Reset old ones, mark new
                        };
                    })
                };
            });
        });
    }, [initialKeywords, extraInstructions, keywordMap, generationModel]);

    const handleTranslateNode = useCallback(async (level1NodeId: string) => {
        if (!generationModel || !keywordMap) return;
        
        setTranslatingNodeId(level1NodeId);
        try {
            const level1Node = keywordMap.find(n => n.id === level1NodeId);
            if (!level1Node) return;

            // Gather all selected nodes with their IDs and text
            const nodesToTranslate: {id: string; text: string}[] = [];
            if(selectedKeywords[level1Node.id]) nodesToTranslate.push({ id: level1Node.id, text: level1Node.keyword });

            level1Node.children.forEach(l2 => {
                if(selectedKeywords[l2.id]) nodesToTranslate.push({ id: l2.id, text: l2.keyword });
                l2.lsi.forEach(lsi => {
                    if(selectedKeywords[lsi.id]) nodesToTranslate.push({ id: lsi.id, text: lsi.text });
                });
            });

            const uniqueTexts = [...new Set(nodesToTranslate.map(n => n.text))];
            if (uniqueTexts.length === 0) return;
            
            const translationMap = await translateBatch(uniqueTexts, generationModel);

            // Create a map from node ID to translated text
            const newTranslations: Record<string, string> = {};
            nodesToTranslate.forEach(node => {
                if (translationMap[node.text]) {
                    newTranslations[node.id] = translationMap[node.text];
                }
            });

            setTranslations(prev => ({...prev, ...newTranslations}));

        } catch (err) {
             setError(err instanceof Error ? `Translation failed: ${err.message}` : 'An unknown translation error occurred.');
        } finally {
            setTranslatingNodeId(null);
        }
    }, [generationModel, keywordMap, selectedKeywords]);


    const handleOpenPromptEditor = () => {
        setEditingPrompt(promptTemplate);
        setIsPromptModalOpen(true);
    };

    const handleSavePrompt = () => {
        setPromptTemplate(editingPrompt);
        setIsPromptModalOpen(false);
    };

    const handleSelectionChange = (id: string, checked: boolean) => {
        setSelectedKeywords(prev => {
            const newSelection = { ...prev, [id]: checked };

            // Cascade changes down
            const cascadeDown = (nodeId: string, isChecked: boolean) => {
                const node = findNodeById(nodeId);
                if (!node) return;
                
                if (isLevel1Node(node)) {
                    node.children.forEach(child => {
                        newSelection[child.id] = isChecked;
                        cascadeDown(child.id, isChecked);
                    });
                } else if (isLevel2Node(node)) {
                    node.lsi.forEach(lsi => {
                        newSelection[lsi.id] = isChecked;
                    });
                }
            };

            // Find all descendants of the toggled node and update their selection
            cascadeDown(id, checked);
            
            // Cascade changes up
            const cascadeUp = (nodeId: string) => {
                 const parentId = getParentId(nodeId);
                 if (!parentId) return;

                 const parentNode = findNodeById(parentId);
                 // A parent node must exist and must be a Level 1 or Level 2 node (i.e., it must have children).
                 if (!parentNode || !(isLevel1Node(parentNode) || isLevel2Node(parentNode))) {
                     return;
                 }

                 const siblings = getChildren(parentNode);
                 const allSiblingsChecked = siblings.every(s => newSelection[s.id]);
                 
                 if (allSiblingsChecked) {
                    newSelection[parentId] = true;
                 } else {
                    delete newSelection[parentId]; // Will be indeterminate or unchecked
                 }
                 cascadeUp(parentId);
            };

            cascadeUp(id);
            
            // Clean up: remove false values
            return Object.fromEntries(Object.entries(newSelection).filter(([, v]) => v));
        });
    };

    const findNodeById = (id: string): RenderLevel1Node | RenderLevel2Node | RenderLsiNode | null => {
        if (!keywordMap) return null;
        for (const l1 of keywordMap) {
            if (l1.id === id) return l1;
            for (const l2 of l1.children) {
                if (l2.id === id) return l2;
                for (const lsi of l2.lsi) {
                    if (lsi.id === id) return lsi;
                }
            }
        }
        return null;
    }

    const isLevel1Node = (node: any): node is RenderLevel1Node => 'children' in node;
    const isLevel2Node = (node: any): node is RenderLevel2Node => 'lsi' in node;
    
    const getParentId = (childId: string): string | null => {
        const parts = childId.split('-');
        if (parts.length <= 2) return null;
        return parts.slice(0, -2).join('-');
    }

    const getChildren = (node: RenderLevel1Node | RenderLevel2Node): (RenderLevel2Node | RenderLsiNode)[] => {
        if (isLevel1Node(node)) return node.children;
        if (isLevel2Node(node)) return node.lsi;
        return [];
    }
    
    const handleOpenSaveModal = () => {
        const firstSelectedL1 = keywordMap?.find(l1 =>
          Object.keys(selectedKeywords).some(key => key.startsWith(l1.id))
        );
        
        let defaultSubProjectName = '';
        if (firstSelectedL1) {
          defaultSubProjectName = `${firstSelectedL1.keyword} - ${firstSelectedL1.type}`;
        }
        setSubProjectName(defaultSubProjectName);

        if (projects.length > 0) {
            setParentProjectId(projects[0].id);
        } else {
            setParentProjectId('');
        }
        setNewParentProjectName('');
        setIsSaveModalOpen(true);
    };

    const handleSaveSubProject = async () => {
        if (!supabase || !session) return;
        
        let finalParentProjectId = parentProjectId;
        
        try {
            if (parentProjectId === 'create_new') {
                if (!newParentProjectName.trim()) {
                    alert("请输入新母项目的名称。");
                    return;
                }
                const newProject: Omit<Project, 'user_id'> = {
                    id: `proj-${Date.now()}`,
                    name: newParentProjectName.trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const { data, error } = await supabase.from('projects').insert({ ...newProject, user_id: session.user.id }).select().single();
                if (error) throw error;
                finalParentProjectId = data.id;
            }

            if (!subProjectName.trim() || !finalParentProjectId) {
                alert("请输入子项目名称并选择一个母项目。");
                return;
            }
            
            // Versioning logic
            let finalSubProjectName = subProjectName.trim();
            const baseName = finalSubProjectName.replace(/\s\(Version \d+\)$/, '').trim();
            const lineage = keywordLibrary.filter(sp => 
                sp.parentProjectId === finalParentProjectId && 
                sp.name.replace(/\s\(Version \d+\)$/, '').trim() === baseName
            );
            if (lineage.some(sp => sp.name === finalSubProjectName)) {
                finalSubProjectName = `${baseName} (Version ${lineage.length + 1})`;
            }

            const savedHierarchy: SavedLevel1Node[] = [];
            const savedNodeIds = new Set<string>();

            keywordMap?.forEach(l1 => {
                const isL1SelectedOrIndeterminate = Object.keys(selectedKeywords).some(key => key.startsWith(l1.id));
                if (!isL1SelectedOrIndeterminate) return;
                
                const savedChildren: SavedLevel2Node[] = [];
                l1.children.forEach(l2 => {
                    const isL2SelectedOrIndeterminate = Object.keys(selectedKeywords).some(key => key.startsWith(l2.id));
                    if (!isL2SelectedOrIndeterminate) return;
                    
                    const savedLsi = l2.lsi
                        .filter(lsi => selectedKeywords[lsi.id])
                        .map(lsi => {
                            savedNodeIds.add(lsi.id);
                            return { id: lsi.id, text: lsi.text };
                        });
                    
                    if (selectedKeywords[l2.id] || savedLsi.length > 0) {
                        savedNodeIds.add(l2.id);
                        savedChildren.push({ ...l2, lsi: savedLsi });
                    }
                });

                if (selectedKeywords[l1.id] || savedChildren.length > 0) {
                     savedNodeIds.add(l1.id);
                     savedHierarchy.push({ ...l1, children: savedChildren });
                }
            });
            
            if (savedHierarchy.length === 0) {
                alert("没有选择要保存的关键词。");
                return;
            }

            const savedTranslations: Record<string, string> = {};
            for(const nodeId of savedNodeIds) {
                if (translations[nodeId]) {
                    savedTranslations[nodeId] = translations[nodeId];
                }
            }

            const newSubProject: Omit<KeywordSubProject, 'user_id'> = {
                id: `subproj-${Date.now()}`,
                name: finalSubProjectName,
                parentProjectId: finalParentProjectId,
                savedAt: new Date().toISOString(),
                modelUsed: generationModel?.nickname || 'Unknown',
                keywords: savedHierarchy,
                translations: savedTranslations,
            };

            const { error } = await supabase.from('keyword_library').insert({ ...newSubProject, user_id: session.user.id });
            if (error) throw error;
            
            await fetchData(); // Refresh all data from DB
            setIsSaveModalOpen(false);
            setSubProjectName('');
            setParentProjectId('');
            setNewParentProjectName('');
            setSelectedKeywords({});
            alert("子项目保存成功！");

        } catch(err) {
            alert(`保存失败: ${(err as Error).message}`);
        }
    };
    
    const selectionCount = Object.keys(selectedKeywords).length;

    const filteredKeywordMap = useMemo(() => {
        if (!keywordMap) return null;
        const { category, pageType, userBehavior } = filters;
        if (!category && !pageType && !userBehavior) {
          return keywordMap;
        }
    
        return keywordMap
          .map(l1 => {
            // Filter L2 children based on userBehavior first
            let l1Children = l1.children;
            if (userBehavior) {
              l1Children = l1.children.filter(l2 => l2.type.startsWith(userBehavior));
            }
    
            return { ...l1, children: l1Children };
          })
          .filter(l1 => {
            // Then filter L1 based on its properties and whether it still has children
            const categoryMatch = !category || l1.type === category;
            const pageTypeMatch = !pageType || PAGE_TYPE_MAP[l1.pageType] === pageType;
            const hasChildren = l1.children.length > 0;
    
            return categoryMatch && pageTypeMatch && hasChildren;
          });
    }, [keywordMap, filters]);
    
    const isSaveDisabled = useMemo(() => {
        if (!subProjectName.trim()) return true;
        if (parentProjectId === 'create_new') {
            return !newParentProjectName.trim();
        }
        return !parentProjectId;
    }, [subProjectName, parentProjectId, newParentProjectName]);


    const handleExpandAll = () => {
        if (!filteredKeywordMap) return;
        const allExpanded = filteredKeywordMap.reduce((acc, node) => {
            acc[node.id] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setExpandedL1Nodes(allExpanded);
    };

    const handleCollapseAll = () => {
        setExpandedL1Nodes({});
    };

    const handleToggleExpand = (nodeId: string) => {
        setExpandedL1Nodes(prev => {
            if (!prev) return { [nodeId]: false };
            return { ...prev, [nodeId]: !prev[nodeId] };
        });
    };

    return (
        <>
        <div className="flex h-full relative">
            <div className="w-1/3 min-w-[400px] max-w-[500px] bg-gray-900 border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white">关键词输入</h2>
                
                <Card>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="initial-keywords" className="block text-sm font-medium text-gray-300 mb-1">初始关键词</label>
                            <textarea
                                id="initial-keywords"
                                value={initialKeywords}
                                onChange={(e) => setInitialKeywords(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., vividcozy bedding, bedding sets"
                            />
                        </div>
                         <div>
                            <label htmlFor="extra-instructions" className="block text-sm font-medium text-gray-300 mb-1">额外指令 (可选)</label>
                            <textarea
                                id="extra-instructions"
                                value={extraInstructions}
                                onChange={(e) => setExtraInstructions(e.target.value)}
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., focus on sustainability"
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Prompt Template</label>
                        <Button variant="secondary" size="sm" onClick={handleOpenPromptEditor}>查看/编辑</Button>
                    </div>
                    <textarea
                        readOnly
                        value={promptTemplate}
                        onClick={handleOpenPromptEditor}
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                </Card>


                <Card>
                    <div className="space-y-4">
                       <Select label="选择模型" value={selectedModelId || ''} onChange={(e) => setSelectedModelId(e.target.value)}>
                            {models.map(m => <option key={m.id} value={m.id}>{m.nickname}</option>)}
                       </Select>
                       <Toggle label="启用网络搜索" enabled={enableWebSearch} setEnabled={setEnableWebSearch} disabled={!currentSelectedModel?.supportsWebSearch} />
                       {modelWarning && <p className="text-xs text-yellow-400">{modelWarning}</p>}
                    </div>
                </Card>

                <div className="pt-4">
                   <Button onClick={handleGenerateMap} isLoading={isLoading} className="w-full text-lg">
                       生成关键词地图
                   </Button>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg text-gray-300">正在生成关键词地图... 请稍候。</p>
                    </div>
                )}
                {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-md">{error}</div>}
                {keywordMap && !isLoading && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-3xl font-bold text-white">生成的关键词地图</h2>
                             {filteredKeywordMap && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={handleExpandAll}>全部展开</Button>
                                    <Button size="sm" variant="secondary" onClick={handleCollapseAll}>全部折叠</Button>
                                </div>
                            )}
                        </div>
                        <FilterBar
                            onFilter={setFilters}
                            onReset={() => setFilters({ category: '', pageType: '', userBehavior: '' })}
                        />
                        <div className="space-y-4 pb-24">
                            {filteredKeywordMap && filteredKeywordMap.length > 0 ? (
                                filteredKeywordMap.map(node => (
                                    <KeywordMapNode 
                                        key={node.id} 
                                        level1Node={node} 
                                        onGenerateLsi={handleGenerateLsi} 
                                        selectedKeywords={selectedKeywords}
                                        onSelectionChange={handleSelectionChange}
                                        translations={translations}
                                        onTranslate={handleTranslateNode}
                                        isTranslating={translatingNodeId === node.id}
                                        isExpanded={expandedL1Nodes ? !!expandedL1Nodes[node.id] : true}
                                        onToggleExpand={() => handleToggleExpand(node.id)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    <p>没有结果符合您的筛选条件。</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {!keywordMap && !isLoading && !error && (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>您生成的关键词地图将显示在此处。</p>
                    </div>
                )}
            </div>
            {selectionCount > 0 && (
                <div className="absolute bottom-0 left-1/3 right-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-700 flex justify-center items-center">
                    <Button size="md" variant="primary" onClick={handleOpenSaveModal}>
                        保存所选内容 ({selectionCount} 项)
                    </Button>
                </div>
            )}
        </div>

        <Modal isOpen={isPromptModalOpen} onClose={() => setIsPromptModalOpen(false)} title="编辑 Prompt Template">
            <div className="space-y-4">
                <textarea
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    rows={20}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                 <p className="text-xs text-gray-400">
                    使用 <code>{`{initialKeywords}`}</code> 和 <code>{`{extraInstructions}`}</code> 等占位符。它们将被自动替换。
                </p>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={() => setIsPromptModalOpen(false)}>取消</Button>
                    <Button variant="primary" onClick={handleSavePrompt}>保存提示</Button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="保存关键词子项目">
            <div className="space-y-4">
                <Input
                    label="子项目名称"
                    value={subProjectName}
                    onChange={(e) => setSubProjectName(e.target.value)}
                    placeholder="例如：卧室床上用品关键词"
                />
                <Select
                    label="分配给母项目"
                    value={parentProjectId}
                    onChange={(e) => setParentProjectId(e.target.value)}
                >
                    <option value="" disabled>选择一个项目...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="create_new">+ 创建新项目</option>
                </Select>
                {parentProjectId === 'create_new' && (
                    <div className="pl-4 mt-2 border-l-2 border-gray-600">
                         <Input 
                            label="新母项目名称" 
                            value={newParentProjectName}
                            onChange={(e) => setNewParentProjectName(e.target.value)}
                            placeholder="例如：Q4 内容营销活动"
                            autoFocus
                        />
                    </div>
                )}
                 <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={() => setIsSaveModalOpen(false)}>取消</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSaveSubProject}
                        disabled={isSaveDisabled}
                    >
                        保存子项目
                    </Button>
                </div>
            </div>
        </Modal>
        </>
    );
};

export default KeywordGenerator;