

import React, { useMemo } from 'react';
import { RenderLevel1Node, RenderLevel2Node, RenderLsiNode, SelectedKeywords } from '../types';
import { ChevronDownIcon, WandIcon } from './icons';
import Button from './ui/Button';
import Checkbox from './ui/Checkbox';

type Translations = Record<string, string>;

const LsiPill: React.FC<{ lsi: RenderLsiNode; isSelected: boolean; onToggle: () => void; translation?: string; }> = ({ lsi, isSelected, onToggle, translation }) => (
    <div className={`rounded-full transition-all duration-300 ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        <label htmlFor={lsi.id} className="flex items-center space-x-2 px-3 py-1.5 text-sm cursor-pointer">
            <Checkbox id={lsi.id} checked={isSelected} onChange={onToggle} />
            <div className="flex flex-col text-left">
                <span>{lsi.text}</span>
                {translation && <span className="text-xs text-cyan-300 opacity-90 mt-0.5">{translation}</span>}
            </div>
        </label>
    </div>
);

const Level2Component: React.FC<{
    level1Node: RenderLevel1Node;
    level2Node: RenderLevel2Node;
    onGenerateLsi: (level1Node: RenderLevel1Node, level2NodeId: string) => Promise<void>;
    selectedKeywords: SelectedKeywords;
    onSelectionChange: (id: string, checked: boolean) => void;
    translations: Translations;
}> = ({ level1Node, level2Node, onGenerateLsi, selectedKeywords, onSelectionChange, translations }) => {
    const [isLsiLoading, setIsLsiLoading] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(true);

    const handleLsiGeneration = async () => {
        setIsLsiLoading(true);
        try {
            await onGenerateLsi(level1Node, level2Node.id);
        } catch (error) {
            console.error("LSI generation failed for node:", level2Node.id, error);
        } finally {
            setIsLsiLoading(false);
        }
    };
    
    const { isChecked, isIndeterminate } = useMemo(() => {
        const lsiIds = level2Node.lsi.map(l => l.id);
        if (lsiIds.length === 0) {
            return { isChecked: !!selectedKeywords[level2Node.id], isIndeterminate: false };
        }
        const selectedCount = lsiIds.filter(id => selectedKeywords[id]).length;
        return {
            isChecked: selectedCount === lsiIds.length,
            isIndeterminate: selectedCount > 0 && selectedCount < lsiIds.length,
        };
    }, [level2Node, selectedKeywords]);


    return (
        <div className="ml-4 mt-3 pl-4 border-l-2 border-gray-700">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Checkbox
                        id={level2Node.id}
                        checked={isChecked}
                        isIndeterminate={isIndeterminate}
                        onChange={(e) => onSelectionChange(level2Node.id, e.target.checked)}
                    />
                    <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center text-left hover:bg-gray-700/50 p-1 rounded-md">
                        <ChevronDownIcon className={`w-5 h-5 mr-2 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        <div>
                            <h4 className="font-semibold text-lg text-teal-300">{level2Node.keyword}</h4>
                            {translations[level2Node.id] && <p className="text-sm text-cyan-400 mt-1">{translations[level2Node.id]}</p>}
                            <p className="text-sm text-gray-400 mt-1">{level2Node.type}</p>
                        </div>
                    </button>
                 </div>
                 <Button onClick={handleLsiGeneration} isLoading={isLsiLoading} size="sm" variant="secondary">
                     <WandIcon className="w-4 h-4 mr-2" />
                     {level2Node.lsi && level2Node.lsi.length > 0 ? '补充LSI' : '生成LSI'}
                 </Button>
            </div>
            {isExpanded && (
                <div className="mt-3 pl-6 flex flex-wrap gap-2">
                    {level2Node.lsi.map(lsi => (
                        <LsiPill 
                            key={lsi.id} 
                            lsi={lsi} 
                            isSelected={!!selectedKeywords[lsi.id]}
                            onToggle={() => onSelectionChange(lsi.id, !selectedKeywords[lsi.id])}
                            translation={translations[lsi.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const KeywordMapNode: React.FC<{
    level1Node: RenderLevel1Node;
    onGenerateLsi: (level1Node: RenderLevel1Node, level2NodeId: string) => Promise<void>;
    selectedKeywords: SelectedKeywords;
    onSelectionChange: (id: string, checked: boolean) => void;
    translations: Translations;
    onTranslate: (level1NodeId: string) => void;
    isTranslating: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}> = ({ level1Node, onGenerateLsi, selectedKeywords, onSelectionChange, translations, onTranslate, isTranslating, isExpanded, onToggleExpand }) => {
    const typeColor = level1Node.type === '引流型' ? 'bg-blue-900/50 text-blue-300' :
                      level1Node.type === '对比型' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-green-900/50 text-green-300';
    
    const { isChecked, isIndeterminate } = useMemo(() => {
        const childIds = level1Node.children.flatMap(l2 => [l2.id, ...l2.lsi.map(lsi => lsi.id)]);
        if (childIds.length === 0) {
            return { isChecked: !!selectedKeywords[level1Node.id], isIndeterminate: false };
        }
        const selectedCount = childIds.filter(id => selectedKeywords[id]).length;
        return {
            isChecked: selectedCount === childIds.length,
            isIndeterminate: selectedCount > 0 && selectedCount < childIds.length,
        };
    }, [level1Node, selectedKeywords]);

    const isAnyChildSelected = useMemo(() => {
        return Object.keys(selectedKeywords).some(key => key.startsWith(level1Node.id) && selectedKeywords[key]);
    }, [selectedKeywords, level1Node.id]);

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                        id={level1Node.id}
                        checked={isChecked}
                        isIndeterminate={isIndeterminate}
                        onChange={(e) => onSelectionChange(level1Node.id, e.target.checked)}
                        className="mt-3"
                    />
                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                             <button onClick={onToggleExpand} className="flex-1 flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                                <div className="text-left">
                                    <h3 className="font-bold text-xl text-sky-300">{level1Node.keyword}</h3>
                                    {translations[level1Node.id] && <p className="text-sm text-cyan-400 mt-1">{translations[level1Node.id]}</p>}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeColor}`}>{level1Node.type}</span>
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-600 text-gray-300">{level1Node.pageType}</span>
                                    </div>
                                </div>
                                <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                             </button>
                        </div>
                    </div>
                </div>
                 <div className="ml-4 flex-shrink-0">
                    <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => onTranslate(level1Node.id)}
                        isLoading={isTranslating}
                        disabled={isTranslating || !isAnyChildSelected}
                        className="px-3 py-1.5 text-xs"
                    >
                        翻译
                    </Button>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-2">
                    {level1Node.children.map(level2 => (
                        <Level2Component
                            key={level2.id}
                            level1Node={level1Node}
                            level2Node={level2}
                            onGenerateLsi={onGenerateLsi}
                            selectedKeywords={selectedKeywords}
                            onSelectionChange={onSelectionChange}
                            translations={translations}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default KeywordMapNode;