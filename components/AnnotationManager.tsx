'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MessageSquarePlus, Trash2, User, Calendar } from 'lucide-react';
import { addAnnotation, getAnnotations, deleteAnnotation } from '@/app/actions';
import { toast } from 'sonner';

interface Annotation {
  id: number;
  text: string;
  date: Date;
  user: { name: string | null; email: string };
}

export default function AnnotationManager({ campaignId }: { campaignId: number }) {
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Data ophalen bij laden
  useEffect(() => {
    loadNotes();
  }, [campaignId]);

  const loadNotes = async () => {
    const data = await getAnnotations(campaignId);
    setNotes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;

    setLoading(true);
    try {
      await addAnnotation(campaignId, date, text);
      setText('');
      toast.success('Annotation added');
      loadNotes(); // Herlaad de lijst
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Sure?")) return;
      await deleteAnnotation(id);
      loadNotes();
      toast.success("Deletec");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. INPUT FORMULIER */}
      <div className="lg:col-span-1 bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl h-fit">
        <h3 className="text-neutral-200 font-semibold mb-4 flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-blue-500"/>
            New Annotation
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-xs text-neutral-500 uppercase font-bold block mb-1">Date</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                />
            </div>
            
            <div>
                <label className="text-xs text-neutral-500 uppercase font-bold block mb-1">Note</label>
                <textarea 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    placeholder="Bijv: Payout verhoogd naar €40..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none min-h-[100px]"
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black font-medium py-2 rounded text-sm hover:bg-neutral-200 transition disabled:opacity-50"
            >
                {loading ? 'Opslaan...' : 'Add'}
            </button>
        </form>
      </div>

      {/* 2. TIJDLIJN OVERZICHT */}
      <div className="lg:col-span-2 bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl max-h-[500px] overflow-y-auto custom-scrollbar">
        <h3 className="text-neutral-200 font-semibold mb-4">History</h3>
        
        {notes.length === 0 ? (
            <p className="text-neutral-500 text-sm italic">No annotations yet for this campaign.</p>
        ) : (
            <div className="relative border-l border-neutral-800 ml-3 space-y-6">
                {notes.map((note) => (
                    <div key={note.id} className="ml-6 relative group">
                        {/* Bolletje op de tijdlijn */}
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-neutral-800 border-2 border-neutral-600 group-hover:border-blue-500 transition-colors"></div>
                        
                        <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg hover:border-neutral-700 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                                        <Calendar size={12}/>
                                        {format(new Date(note.date), 'dd MMM yyyy', { locale: nl })}
                                    </span>
                                    <span className="text-neutral-600 text-xs">•</span>
                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                        <User size={12}/>
                                        {note.user.name || note.user.email}
                                    </span>
                                </div>
                                <button onClick={() => handleDelete(note.id)} className="text-neutral-600 hover:text-red-500 transition">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
                                {note.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}