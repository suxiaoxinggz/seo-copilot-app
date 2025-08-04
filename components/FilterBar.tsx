import React, { useState } from 'react';
import Select from './ui/Select';
import Button from './ui/Button';

export interface FilterState {
    category: string;
    pageType: string;
    userBehavior: string;
}

interface FilterBarProps {
    onFilter: (filters: FilterState) => void;
    onReset: () => void;
}

const CATEGORY_TAGS = ['引流型', '对比型', '转化型'];
const PAGE_TYPE_TAGS = ['产品详情类', '文章类', '聚合类'];
const USER_BEHAVIOR_TAGS = ['认知型', '决策型', '信任型', '行动型'];


const FilterBar: React.FC<FilterBarProps> = ({ onFilter, onReset }) => {
    const [localFilters, setLocalFilters] = useState<FilterState>({
        category: '',
        pageType: '',
        userBehavior: '',
    });

    const handleApply = () => {
        onFilter(localFilters);
    };

    const handleReset = () => {
        setLocalFilters({ category: '', pageType: '', userBehavior: '' });
        onReset();
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: keyof FilterState) => {
        setLocalFilters(prev => ({ ...prev, [field]: e.target.value }));
    };

    return (
        <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 mb-6 flex items-end flex-wrap gap-4">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                    label="分类标签"
                    value={localFilters.category}
                    onChange={(e) => handleSelectChange(e, 'category')}
                >
                    <option value="">所有分类</option>
                    {CATEGORY_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </Select>
                <Select
                    label="页面类型标签"
                    value={localFilters.pageType}
                    onChange={(e) => handleSelectChange(e, 'pageType')}
                >
                    <option value="">所有页面类型</option>
                    {PAGE_TYPE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </Select>
                <Select
                    label="用户行为阶段标签"
                    value={localFilters.userBehavior}
                    onChange={(e) => handleSelectChange(e, 'userBehavior')}
                >
                    <option value="">所有行为</option>
                    {USER_BEHAVIOR_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </Select>
            </div>
            <div className="flex-shrink-0 flex gap-2 ml-auto">
                <Button variant="secondary" onClick={handleReset}>重置</Button>
                <Button variant="primary" onClick={handleApply}>筛选</Button>
            </div>
        </div>
    );
};

export default FilterBar;