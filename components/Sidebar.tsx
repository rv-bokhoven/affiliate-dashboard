'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, Tags, Wallet, PenLine, ClipboardList, 
  ChevronsUpDown, Check, Settings, LogOut, Menu, X, MousePointerClick, 
  Activity 
} from 'lucide-react';
import { setActiveCampaign, logout } from '@/app/actions';

interface Campaign { 
  id: number; 
  name: string; 
  type: string; 
  logo?: string | null; 
}

interface User {
    name: string | null;
    email: string;
    role: string;
}

interface SidebarProps { 
    campaigns: Campaign[]; 
    activeCampaignId: number; 
    user: User;
    currentRole: string; 
}

export default function Sidebar({ campaigns, activeCampaignId, user, currentRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // States
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); 

  const activeProject = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];

  const handleSwitch = async (id: number) => {
    await setActiveCampaign(id.toString());
    const params = new URLSearchParams(searchParams);
    params.set('campaignId', id.toString());
    router.push(`/?${params.toString()}`);
    router.refresh();
    setDropdownOpen(false);
    setMobileMenuOpen(false); 
  };

  const handleLogout = async () => {
      await logout();
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const navItem = (path: string, icon: React.ReactNode, label: string) => {
    const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
    return (
      <Link 
        href={path} 
        onClick={handleLinkClick} 
        className={`group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50'}`}
      >
        <span className={`${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`}>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  const displayName = user.name || user.email.split('@')[0];
  const displayRole = user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Team Member';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <>
        {/* --- MOBILE TOGGLE BUTTON --- */}
        <button 
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-400 hover:text-white shadow-lg"
        >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* --- MOBILE OVERLAY --- */}
        {isMobileMenuOpen && (
            <div 
                className="fixed inset-0 bg-black/60 z-[40] md:hidden backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        {/* --- SIDEBAR --- */}
        <aside className={`
            w-64 h-screen bg-neutral-900 border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-50
            transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0
        `}>
        
        {/* --- SYSTEEM LOGO --- */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-800/50 mt-14 md:mt-0 shrink-0">
            <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <Activity size={18} className="text-white" strokeWidth={3} />
                </div>
                <span className="font-bold text-m tracking-tight">Tedlytics</span>
            </div>
        </div>

        {/* HEADER (PROJECT SWITCHER) */}
        <div className="p-4 border-b border-neutral-800/50"> 
            <div className="relative">
                <button onClick={() => setDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-900 border border-neutral-800 text-white px-3 py-2 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center font-bold shrink-0 overflow-hidden border border-neutral-700">
                            {activeProject?.logo ? (
                                <img src={activeProject.logo} alt={activeProject.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{activeProject?.name?.charAt(0).toUpperCase() || '?'}</span>
                            )}
                        </div>
                        
                        <div className="text-left truncate">
                            <p className="text-sm font-semibold leading-none truncate">{activeProject?.name || 'Geen Project'}</p>
                            <p className="text-xs text-neutral-500 mt-1 truncate group-hover:text-neutral-400">{activeProject?.type || '-'} Project</p>
                        </div>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-neutral-500 shrink-0 ml-2" />
                </button>
                
                {/* DROPDOWN */}
                {isDropdownOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                            <p className="text-xs font-medium text-neutral-500 px-2 py-1.5 uppercase tracking-wider">Projects</p>
                            {campaigns.length === 0 ? (
                                <div className="px-2 py-2 text-xs text-neutral-500">Geen projecten gevonden.</div>
                            ) : (
                                campaigns.map(c => (
                                    <button key={c.id} onClick={() => handleSwitch(c.id)} className={`w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors ${c.id === activeCampaignId ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                                        <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-medium overflow-hidden text-white">
                                            {c.logo ? <img src={c.logo} alt={c.name} className="w-full h-full object-cover" /> : c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate flex-1 text-left">{c.name}</span>
                                        {c.id === activeCampaignId && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
        
        {/* NAV */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="px-3 text-xs font-medium text-neutral-500 mb-2 mt-2 uppercase tracking-wider">Platform</p>
            {navItem('/', <LayoutDashboard size={18} />, 'Overview')}
            
            {/* AANPASSING: Verberg traffic als het SEO is */}
            {activeProject?.type !== 'SEO' && (
                navItem('/traffic', <MousePointerClick size={18} />, 'Traffic')
            )}
            
            {navItem('/offers', <Tags size={18} />, 'Offers')}
            <p className="px-3 text-xs font-medium text-neutral-500 mb-2 mt-6 uppercase tracking-wider">Tools</p>
            {navItem('/input', <PenLine size={18} />, 'Daily Input')}
            {navItem('/finance', <Wallet size={18} />, 'Revshare')}
            {navItem('/logs', <ClipboardList size={18} />, 'Logs')}
            
            {/* CHECK OP ROL */}
            {currentRole === 'ADMIN' && (
                navItem('/settings', <Settings size={18} />, 'Settings')
            )}
        </nav>
        
        {/* FOOTER USER */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950">
            <div 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-red-900/10 hover:border-red-900/20 border border-transparent transition-colors cursor-pointer group"
                title="Klik om uit te loggen"
            >
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 group-hover:bg-red-900/20 group-hover:text-red-400 transition-colors">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-200 truncate group-hover:text-white">{displayName}</p>
                <p className="text-xs text-neutral-500 truncate group-hover:text-red-400 transition-colors">{displayRole}</p>
            </div>
            <LogOut size={16} className="text-neutral-500 group-hover:text-red-500 transition-colors" />
            </div>
        </div>
        </aside>
    </>
  );
}