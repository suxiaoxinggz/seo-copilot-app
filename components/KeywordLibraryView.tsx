

import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { KeywordSubProject, SavedLevel1Node, SavedLevel2Node, SavedLsiNode, Project, Article, PublishedDestination } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { ChevronDownIcon, TrashIcon } from './icons';
import FilterBar, { FilterState } from './FilterBar';
import Checkbox from './ui/Checkbox';
import StatusBadgeGrid from './StatusBadgeGrid';

// Helper to trigger CSV file download
const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// Add a mapping for English page types from legacy data to the Chinese equivalents used in filters.
const PAGE_TYPE_MAP: { [key: string]: string } = {
  'Product Detail Pages': '产品详情类',
  'Article/Blog Pages': '文章类',
  'Hub/Category Pages': '聚合类',
  // Map Chinese values to themselves to handle both old and new data gracefully.
  '产品详情类': '产品详情类',
  '文章类': '文章类',
  '聚合类': '聚合类',
};

type Translations = Record<string, string>;

const LsiPill: React.FC<{ lsi: SavedLsiNode; translation?: string }> = ({ lsi, translation }) => (
    <div className="inline-flex flex-col text-left px-3 py-1.5 text-sm rounded-full bg-gray-700">
        <span className="text-gray-300">{lsi.text}</span>
        {translation && <span className="text-xs text-cyan-300 opacity-90 mt-0.5">{translation}</span>}
    </div>
);

const Level2Display: React.FC<{ level2Node: SavedLevel2Node; translations?: Translations }> = ({ level2Node, translations }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const typeColor = useMemo(() => {
        const type = level2Node.type;
        if (type.includes('认知') || type.includes('Awareness')) return 'bg-blue-900/50 text-blue-300';
        if (type.includes('决策') || type.includes('Decision')) return 'bg-yellow-900/50 text-yellow-300';
        if (type.includes('信任') || type.includes('Trust')) return 'bg-purple-900/50 text-purple-300';
        if (type.includes('行动') || type.includes('Action')) return 'bg-green-900/50 text-green-300';
        return 'bg-gray-700 text-gray-300';
    }, [level2Node.type]);

    return (
        <div className="ml-4 mt-3 pl-4 border-l-2 border-gray-700">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-start text-left hover:bg-gray-700/50 p-1 rounded-md">
                 <div className="flex-shrink-0 pt-1">
                    <ChevronDownIcon className={`w-5 h-5 mr-2 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                 </div>
                 <div>
                    <h4 className="font-semibold text-md text-teal-300">{level2Node.keyword}</h4>
                    {translations?.[level2Node.id] && <p className="text-sm text-cyan-400 mt-1">{translations[level2Node.id]}</p>}
                    <span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{level2Node.type}</span>
                </div>
            </button>
            {isExpanded && (
                <div className="mt-2 pl-6 flex flex-wrap gap-2">
                    {level2Node.lsi.map(lsi => <LsiPill key={lsi.id} lsi={lsi} translation={translations?.[lsi.id]} />)}
                </div>
            )}
        </div>
    );
};

const Level1Display: React.FC<{ level1Node: SavedLevel1Node; translations?: Translations }> = ({ level1Node, translations }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const typeColor = level1Node.type === '引流型' ? 'bg-blue-900/50 text-blue-300' :
                      level1Node.type === '对比型' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-green-900/50 text-green-300';
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-3">
             <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                <div className="text-left">
                    <h3 className="font-bold text-lg text-sky-300">{level1Node.keyword}</h3>
                    {translations?.[level1Node.id] && <p className="text-sm text-cyan-400 mt-1">{translations[level1Node.id]}</p>}
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{level1Node.type}</span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">{level1Node.pageType}</span>
                    </div>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            {isExpanded && (
                 <div className="mt-2">
                    {level1Node.children.map(level2 => <Level2Display key={level2.id} level2Node={level2} translations={translations} />)}
                 </div>
            )}
        </div>
    );
};


const SubProjectCard: React.FC<{
    subProject: KeywordSubProject;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
}> = ({ subProject, isExpanded, onToggleExpand, isSelected, onToggleSelection }) => {
    const { projects } = useContext(AppContext) || { projects: [] };
    const parentProject = projects.find(p => p.id === subProject.parentProjectId);
    
    return (
        <Card>
            <div className="flex items-start gap-4">
                <Checkbox
                    id={`select-subproj-${subProject.id}`}
                    checked={isSelected}
                    onChange={() => onToggleSelection(subProject.id)}
                    className="mt-2"
                    aria-label={`选择子项目 ${subProject.name}`}
                />
                <div className="flex-1">
                     <div className="flex justify-between items-start cursor-pointer" onClick={onToggleExpand}>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white">{subProject.name}</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                父项目: <span className="font-semibold text-gray-300">{parentProject?.name || 'N/A'}</span>
                            </p>
                             <div className="mt-2">
                                <StatusBadgeGrid destinations={subProject.publishedDestinations || []} />
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <p className="text-xs text-gray-500">保存于: {new Date(subProject.savedAt).toLocaleDateString()}</p>
                                <p className="text-xs text-gray-500 mt-1">模型: <span className="font-semibold text-gray-400">{subProject.modelUsed}</span></p>
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            {subProject.keywords.map(l1 => <Level1Display key={l1.id} level1Node={l1} translations={subProject.translations} />)}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

interface KeywordLibraryViewProps {
    filterProjectId?: string | null;
    onClearFilter?: () => void;
}

export const KeywordLibraryView: React.FC<KeywordLibraryViewProps> = ({ filterProjectId = null, onClearFilter = () => {} }) => {
    const context = useContext(AppContext);
    const { keywordLibrary, projects, fetchData, supabase } = context || {};
    
    const [filters, setFilters] = useState<FilterState>({ category: '', pageType: '', userBehavior: '' });
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
    const [selectedSubProjects, setSelectedSubProjects] = useState<Set<string>>(new Set());

    const sourceLibrary = useMemo(() => {
        if (!keywordLibrary) return [];
        return filterProjectId
            ? keywordLibrary.filter(sp => sp.parentProjectId === filterProjectId)
            : keywordLibrary;
    }, [keywordLibrary, filterProjectId]);
    
    const displayLibrary = useMemo(() => {
        const { category, pageType, userBehavior } = filters;
        if (!category && !pageType && !userBehavior) {
            return sourceLibrary;
        }

        return sourceLibrary.map(subProject => {
            const filteredKeywords = subProject.keywords
                .map(l1 => {
                    let l1Children = l1.children;
                    if (userBehavior) {
                        l1Children = l1.children.filter(l2 => l2.type.startsWith(userBehavior));
                    }
                    return { ...l1, children: l1Children };
                })
                .filter(l1 => {
                    const categoryMatch = !category || l1.type === category;
                    const pageTypeMatch = !pageType || PAGE_TYPE_MAP[l1.pageType] === pageType;
                    const hasChildren = l1.children.length > 0;
                    return categoryMatch && pageTypeMatch && hasChildren;
                });

            return { ...subProject, keywords: filteredKeywords };
        }).filter(subProject => subProject.keywords.length > 0);
     }, [sourceLibrary, filters]);


    const parentProject = (filterProjectId && projects) 
        ? projects.find(p => p.id === filterProjectId) 
        : null;

    const handleExpandAll = () => {
        const allExpanded = displayLibrary.reduce((acc, sp) => {
            acc[sp.id] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setExpandedStates(allExpanded);
    };

    const handleCollapseAll = () => {
        setExpandedStates({});
    };
    
    const handleToggleExpand = (subProjectId: string) => {
        setExpandedStates(prev => ({ ...prev, [subProjectId]: !prev[subProjectId] }));
    };

    const handleToggleSelection = (subProjectId: string) => {
        setSelectedSubProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subProjectId)) {
                newSet.delete(subProjectId);
            } else {
                newSet.add(subProjectId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedSubProjects.size === displayLibrary.length) {
            setSelectedSubProjects(new Set());
        } else {
            setSelectedSubProjects(new Set(displayLibrary.map(sp => sp.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (!supabase || !fetchData) return;
        const message = `您确定要删除选中的 ${selectedSubProjects.size} 个子项目吗？数据库的级联删除规则将自动删除所有关联的文章。`;
        if (window.confirm(message)) {
            const selectedIds = Array.from(selectedSubProjects);
            const { error } = await supabase
                .from('keyword_library')
                .delete()
                .in('id', selectedIds);

            if (error) {
                alert(`删除子项目时出错: ${error.message}`);
            } else {
                await fetchData();
                setSelectedSubProjects(new Set());
                alert("选中的子项目已成功删除。");
            }
        }
    };

    const escapeCsvField = (field: string | undefined): string => {
        if (field === undefined || field === null) {
            return '""';
        }
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return `"${stringField}"`;
    };

    const formatSubProjectDataAsCsv = (subProjectsToExport: KeywordSubProject[]): string => {
        const header = [
            'Level 1 Keyword', 'Level 1 Type', 'Level 1 PageType',
            'Level 2 Keyword', 'Level 2 Type', 'LSI Keyword'
        ];
        let csvContent = header.join(',') + '\n';

        subProjectsToExport.forEach(sp => {
            sp.keywords.forEach(l1 => {
                l1.children.forEach(l2 => {
                    if (l2.lsi.length > 0) {
                        l2.lsi.forEach(lsi => {
                            const row = [
                                escapeCsvField(l1.keyword),
                                escapeCsvField(l1.type),
                                escapeCsvField(l1.pageType),
                                escapeCsvField(l2.keyword),
                                escapeCsvField(l2.type),
                                escapeCsvField(lsi.text),
                            ];
                            csvContent += row.join(',') + '\n';
                        });
                    } else {
                        const row = [
                            escapeCsvField(l1.keyword),
                            escapeCsvField(l1.type),
                            escapeCsvField(l1.pageType),
                            escapeCsvField(l2.keyword),
                            escapeCsvField(l2.type),
                            escapeCsvField(''),
                        ];
                        csvContent += row.join(',') + '\n';
                    }
                });
            });
        });
        return csvContent;
    };


    const handleExportSelected = () => {
        if (!keywordLibrary) return;
        const selectedIds = Array.from(selectedSubProjects);
        const subProjectsToExport = keywordLibrary
            .filter(sp => selectedIds.includes(sp.id));
        
        const csvContent = formatSubProjectDataAsCsv(subProjectsToExport);
        downloadCSV(csvContent, `sub-projects-export-${new Date().toISOString().split('T')[0]}.csv`);
        setSelectedSubProjects(new Set());
    };

    if (!keywordLibrary || sourceLibrary.length === 0) {
        return (
            <div className="mt-8 text-center text-gray-500">
                {filterProjectId ? (
                     <p>此母项目下没有找到子项目。</p>
                ) : (
                    <>
                        <p>您保存的关键词子项目将显示在此处。</p>
                        <p className="text-sm">转到“关键词地图”生成器来创建和保存您的第一组内容。</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="mt-8 space-y-6 pb-20">
            {parentProject && (
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h2 className="text-lg font-semibold text-white">
                        正在显示子项目: <span className="text-blue-400">{parentProject.name}</span>
                    </h2>
                    <Button variant="secondary" onClick={onClearFilter}>清除筛选</Button>
                </div>
            )}
            
            <FilterBar 
                onFilter={setFilters}
                onReset={() => setFilters({ category: '', pageType: '', userBehavior: '' })}
            />
            
            <div className="flex items-center justify-between gap-2 mb-4 -mt-2">
                <div className="flex items-center gap-4">
                    <Checkbox
                        id="select-all-sub-projects"
                        checked={displayLibrary.length > 0 && selectedSubProjects.size === displayLibrary.length}
                        isIndeterminate={selectedSubProjects.size > 0 && selectedSubProjects.size < displayLibrary.length}
                        onChange={handleSelectAll}
                    />
                    <label htmlFor="select-all-sub-projects" className="text-white font-medium">全选</label>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={handleExpandAll}>全部展开</Button>
                    <Button size="sm" variant="secondary" onClick={handleCollapseAll}>全部折叠</Button>
                </div>
            </div>

            {displayLibrary.length > 0 ? (
                 displayLibrary.map(subProject => (
                    <SubProjectCard 
                        key={subProject.id} 
                        subProject={subProject} 
                        isExpanded={!!expandedStates[subProject.id]}
                        onToggleExpand={() => handleToggleExpand(subProject.id)}
                        isSelected={selectedSubProjects.has(subProject.id)}
                        onToggleSelection={handleToggleSelection}
                    />
                ))
            ) : (
                 <div className="text-center py-10 text-gray-500">
                    <p>没有子项目符合您的筛选条件。</p>
                </div>
            )}

            {selectedSubProjects.size > 0 && (
                 <div className="fixed bottom-6 right-8 bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700 flex items-center gap-4 z-50 animate-fade-in-up">
                    <span className="text-white font-semibold">{selectedSubProjects.size} 已选择</span>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedSubProjects(new Set())}>取消选择</Button>
                    <Button variant="primary" size="sm" onClick={handleExportSelected}>导出 (CSV)</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSelected()}>
                        <TrashIcon className="w-4 h-4 mr-1" /> 删除
                    </Button>
                </div>
            )}
        </div>
    );
};