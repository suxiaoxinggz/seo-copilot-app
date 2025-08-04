
import React from 'react';
import { PublishedDestination, PublishingPlatform } from '../types';
import { GlobeAltIcon, CloudIcon, DatabaseIcon, PencilIcon } from './icons';

const platformBadgeInfo: Record<PublishingPlatform, { name: string, icon: React.ReactNode, colors: string }> = {
    [PublishingPlatform.WORDPRESS]: { name: 'WP', icon: <GlobeAltIcon className="w-3 h-3"/>, colors: 'bg-blue-500/20 text-blue-300' },
    [PublishingPlatform.CLOUDFLARE_R2]: { name: 'R2', icon: <CloudIcon className="w-3 h-3"/>, colors: 'bg-orange-500/20 text-orange-300' },
    [PublishingPlatform.SUPABASE]: { name: 'SB', icon: <DatabaseIcon className="w-3 h-3"/>, colors: 'bg-green-500/20 text-green-300' },
    [PublishingPlatform.GCS]: { name: 'GCS', icon: <CloudIcon className="w-3 h-3"/>, colors: 'bg-yellow-500/20 text-yellow-300' },
    [PublishingPlatform.S3]: { name: 'S3', icon: <CloudIcon className="w-3 h-3"/>, colors: 'bg-indigo-500/20 text-indigo-300' },
    [PublishingPlatform.CUSTOM]: { name: 'API', icon: <PencilIcon className="w-3 h-3"/>, colors: 'bg-gray-500/20 text-gray-300' },
};

const StatusBadgeGrid: React.FC<{ destinations: PublishedDestination[] }> = ({ destinations }) => {
    if (!destinations || destinations.length === 0) {
        return null;
    }

    const latestStatusByPlatform = new Map<PublishingPlatform, 'success' | 'failed'>();
    destinations.forEach(dest => {
        if (!latestStatusByPlatform.has(dest.platform) || dest.status === 'failed') {
            latestStatusByPlatform.set(dest.platform, dest.status);
        }
    });

    return (
        <div className="flex flex-wrap gap-1.5">
            {Array.from(latestStatusByPlatform.entries()).map(([platform, status]) => {
                const badgeInfo = platformBadgeInfo[platform];
                if (!badgeInfo) return null;

                const statusColor = status === 'success' ? 'border-green-400/50' : 'border-red-400/50';
                const statusSymbol = status === 'success' ? '✔' : '✖';
                
                return (
                    <span 
                        key={platform}
                        title={`${platform}: ${status}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${badgeInfo.colors} ${statusColor}`}
                    >
                        {badgeInfo.icon}
                        <span>{badgeInfo.name}</span>
                        <span className="font-mono">{statusSymbol}</span>
                    </span>
                );
            })}
        </div>
    );
};

export default StatusBadgeGrid;
