'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import PageContainer from './PageContainer';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus, Save, Shield, Users, KeyRound } from 'lucide-react';

interface Member { id: number; email: string; role: string; }
interface Campaign { 
  id: number; 
  name: string; 
  type: string; 
  logo?: string | null; 
  members: Member[];
}

interface SettingsManagerProps {
  campaign: Campaign;
}

export default function SettingsManager({ campaign }: SettingsManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState(campaign.name);
  const [logo, setLogo] = useState(campaign.logo || '');
  const [type, setType] = useState(campaign.type);
  const [members, setMembers] = useState<Member[]>(campaign.members);
  
  // Member Input State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState(''); // <--- NIEUW: Wachtwoord state

  // --- ACTIONS ---

  const handleUpdateDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_details',
          campaignId: campaign.id,
          data: { name, logo, type }
        })
      });
      if (res.ok) {
        toast.success('Project instellingen opgeslagen');
        router.refresh();
      } else throw new Error();
    } catch (e) { toast.error('Opslaan mislukt'); } finally { setLoading(false); }
  };

  const handleAddMember = async () => {
    // Validatie: Email én Wachtwoord zijn nu verplicht
    if (!newEmail || !newPassword) {
        toast.error('Vul een email en een wachtwoord in');
        return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_member',
          campaignId: campaign.id,
          data: { 
              email: newEmail, 
              password: newPassword, // <--- We sturen het wachtwoord mee
              role: 'MEMBER' 
          }
        })
      });

      if (res.ok) {
        const newMember = await res.json();
        setMembers([...members, newMember]);
        
        // Reset velden
        setNewEmail('');
        setNewPassword('');
        
        toast.success('Gebruiker aangemaakt en toegevoegd!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Kon lid niet toevoegen');
      }
    } catch (e) { toast.error('Error'); }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Toegang intrekken?')) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove_member',
          campaignId: campaign.id,
          data: { memberId }
        })
      });
      if (res.ok) {
        setMembers(members.filter(m => m.id !== memberId));
        toast.success('Lid verwijderd');
      }
    } catch (e) { toast.error('Error'); }
  };

  const handleDeleteProject = async () => {
    const confirmation = prompt(`Typ "${campaign.name}" om dit project te verwijderen. DIT KAN NIET ONGEDAAN GEMAAKT WORDEN.`);
    if (confirmation !== campaign.name) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_project', campaignId: campaign.id })
      });
      if (res.ok) {
        toast.success('Project verwijderd');
        window.location.href = '/'; 
      }
    } catch (e) { toast.error('Verwijderen mislukt'); }
  };

  const inputClass = "w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors placeholder:text-neutral-700";

  return (
    <PageContainer title="Project Settings" subtitle={`Beheer instellingen voor ${campaign.name}`}>
      
      <div className="max-w-4xl space-y-8">
        
        {/* 1. GENERAL SETTINGS */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
                <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
                    <Shield size={18} className="text-neutral-500" />
                    General Information
                </h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase mb-2 block">Project Name</label>
                        <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase mb-2 block">Campaign Type</label>
                        <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
                            <option value="PAID">Paid Advertising</option>
                            <option value="SEO">SEO / Organic</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase mb-2 block">Logo URL (Square)</label>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                             <input type="text" className={inputClass} value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://example.com/logo.png" />
                             <p className="text-[10px] text-neutral-500 mt-1">Plak een directe link naar een afbeelding (.png, .jpg).</p>
                        </div>
                        {/* Preview */}
                        <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs text-neutral-600">Logo</span>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex justify-end">
                <button onClick={handleUpdateDetails} disabled={loading} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-200 transition-colors">
                    {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                </button>
            </div>
        </div>

        {/* 2. ACCESS & MEMBERS */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
                    <Users size={18} className="text-neutral-500" />
                    Team & Access
                </h3>
            </div>
            <div className="p-6">
                
                {/* Add Member Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-end">
                    <div>
                        <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Nieuwe Gebruiker Email</label>
                        <input 
                            type="email" 
                            placeholder="colleague@example.com" 
                            className={inputClass} 
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                        />
                    </div>
                    <div>
                         <label className="text-xs font-medium text-neutral-500 uppercase mb-1.5 block">Wachtwoord</label>
                         <div className="flex gap-2">
                            <input 
                                type="text" // Type text zodat je ziet wat je aanmaakt
                                placeholder="Wachtwoord123" 
                                className={inputClass} 
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                            <button onClick={handleAddMember} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 border border-neutral-700 shrink-0">
                                <UserPlus size={16} /> Toevoegen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="border border-neutral-800 rounded-lg overflow-hidden">
                    {members.length === 0 ? (
                        <div className="p-8 text-center text-neutral-500 text-sm">Geen extra leden. Jij bent de enige admin.</div>
                    ) : (
                        <table className="w-full text-left text-sm text-neutral-400">
                            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-300">
                                <tr>
                                    <th className="p-3 font-medium">Email</th>
                                    <th className="p-3 font-medium">Role</th>
                                    <th className="p-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {members.map(member => (
                                    <tr key={member.id} className="hover:bg-neutral-800/30">
                                        <td className="p-3 text-neutral-200">{member.email}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">{member.role}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => handleRemoveMember(member.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

        {/* 3. DANGER ZONE */}
        <div className="border border-red-900/30 bg-red-950/10 rounded-xl overflow-hidden">
            <div className="p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-neutral-500 mb-4">
                    Het verwijderen van een project is definitief. Alle offers, statistieken en logs worden verwijderd.
                </p>
                <button onClick={handleDeleteProject} className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
                    <Trash2 size={16} /> Delete Project
                </button>
            </div>
        </div>

      </div>
    </PageContainer>
  );
}