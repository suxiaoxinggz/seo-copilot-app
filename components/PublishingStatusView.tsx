
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { GlobeAltIcon, CloudIcon, DatabaseIcon, PencilIcon, CheckIcon } from './icons';
import { PublishingPlatform } from '../types';

const platformIcons: Record<PublishingPlatform, React.ReactNode> = {
    [PublishingPlatform.WORDPRESS]: <GlobeAltIcon className="w-5 h-5" />,
    [PublishingPlatform.CLOUDFLARE_R2]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.SUPABASE]: <DatabaseIcon className="w-5 h-5" />,
    [PublishingPlatform.GCS]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.S3]: <CloudIcon className="w-5 h-5" />,
    [PublishingPlatform.CUSTOM]: <PencilIcon className="w-5 h-5" />,
};

export const PublishingStatusView: React.FC = () => {
    const context = useContext(AppContext);

    const allPublishedItems = useMemo(() => {
        if (!context) return [];
        
        const { articles, postsToPublish, savedImageSets } = context;

        const combinedItems: any[] = [
            ...articles.map(a => ({...a, type: '文章'})),
            ...postsToPublish.map(p => ({...p, type: '待发布文章'})),
            ...savedImageSets.map(s => ({...s, name: s.name, type: '图片集'}))
        ];

        const history = combinedItems.flatMap(item => 
            (item.publishedDestinations || []).map((dest: any) => ({
                sourceId: item.id,
                sourceName: item.title || item.name,
                sourceType: item.type,
                ...dest,
            }))
        );

        return history.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    }, [context]);


    if (!context) return null;

    if (allPublishedItems.length === 0) {
        return (
             <div className="mt-8">
                <div className="text-center py-20 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                    <h2 className="text-2xl font-bold text-gray-400">发布状态日志</h2>
                    <p className="mt-2">所有发布任务的历史记录将显示在此处。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">发布历史记录</h2>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                <table className="w-full table-auto">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-400">状态</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-400">内容</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-400">平台</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-400">日志/链接</th>
                            <th className="p-3 text-left text-sm font-semibold text-gray-400">时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allPublishedItems.map((item, index) => (
                            <tr key={`${item.sourceId}-${index}`} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800">
                                <td className="p-3">
                                    {item.status === 'success' ? (
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-300">
                                            <CheckIcon className="w-4 h-4 mr-1"/> 成功
                                        </span>
                                    ) : (
                                         <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-300">
                                            失败
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <p className="font-semibold text-white truncate" title={item.sourceName}>{item.sourceName}</p>
                                    <p className="text-xs text-gray-500">{item.sourceType}</p>
                                </td>
                                 <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">{platformIcons[item.platform as PublishingPlatform]}</span>
                                        <span className="text-sm text-gray-300">{item.platform}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-sm text-gray-400">
                                    {item.status === 'success' && item.url ? (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                            {item.url}
                                        </a>
                                    ) : (
                                        <span className="text-red-400" title={item.log}>{item.log}</span>
                                    )}
                                </td>
                                <td className="p-3 text-sm text-gray-500">
                                    {new Date(item.publishedAt).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
