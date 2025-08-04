import React, { useContext } from 'react';
import { Page } from '../types';
import { WandIcon, SettingsIcon, DashboardIcon, DocumentIcon, ImageIcon, GlobeIcon, PublishIcon } from './icons';
import { AppContext } from '../context/AppContext';

interface SidebarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isComingSoon?: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, isComingSoon, onClick }) => (
    <button
        onClick={onClick}
        disabled={isComingSoon}
        className={`flex items-center justify-between w-full px-4 py-3 transition-colors duration-200 text-base ${
            isActive
                ? 'bg-blue-600 text-white rounded-lg shadow-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg'
        } ${isComingSoon ? 'cursor-not-allowed opacity-60' : ''}`}
    >
        <div className="flex items-center">
            <div className="w-5 h-5 mr-4">{icon}</div>
            <span>{label}</span>
        </div>
        {isComingSoon && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-700 text-gray-400">
                Soon
            </span>
        )}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage }) => {
    const context = useContext(AppContext);
    const { supabase, session } = context || {};

    const handleLogout = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
        }
    };
    
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700/50 flex flex-col shrink-0">
      <div className="h-24 flex flex-col justify-center px-6 border-b border-gray-700/50">
        <h1 className="text-2xl font-bold text-white">SEO Copilot</h1>
        <p className="text-sm text-gray-400">{session?.user?.email || '内容策略工具'}</p>
      </div>
      
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        <nav className="px-4 py-4">
            <h2 className="px-4 mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">流程导航</h2>
            <div className="space-y-1.5">
                <NavItem
                    icon={<DashboardIcon />}
                    label="控制台"
                    isActive={currentPage === 'dashboard'}
                    onClick={() => setPage('dashboard')}
                />
                <NavItem
                    icon={<WandIcon />}
                    label="关键词地图"
                    isActive={currentPage === 'keyword-map'}
                    onClick={() => setPage('keyword-map')}
                />
                <NavItem
                    icon={<DocumentIcon />}
                    label="大纲与文章"
                    isActive={currentPage === 'outline-article'}
                    onClick={() => setPage('outline-article')}
                />
                <NavItem
                    icon={<ImageIcon />}
                    label="图文加工"
                    isActive={currentPage === 'image-text'}
                    onClick={() => setPage('image-text')}
                />
                <NavItem
                    icon={<GlobeIcon />}
                    label="本地化"
                    isActive={currentPage === 'localization'}
                    isComingSoon={true}
                    onClick={() => setPage('localization')}
                />
                <NavItem
                    icon={<PublishIcon />}
                    label="发布"
                    isActive={currentPage === 'publish'}
                    isComingSoon={false}
                    onClick={() => setPage('publish')}
                />
            </div>
        </nav>

        <div className="px-4 py-4 mt-auto">
             <div className="py-4 border-t border-gray-700/50">
                <NavItem
                    icon={<SettingsIcon />}
                    label="Model Settings"
                    isActive={currentPage === 'settings'}
                    onClick={() => setPage('settings')}
                />
                 <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full mt-2 px-4 py-3 transition-colors duration-200 text-sm text-gray-400 hover:bg-red-900/50 hover:text-white rounded-lg"
                >
                    注销
                </button>
             </div>
             <p className="text-center text-xs text-gray-500 mt-4">版本 3.0.0-cloud</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;