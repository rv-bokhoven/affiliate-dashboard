import React from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: React.ReactNode; // Mag tekst zijn of een JSX element (zoals de campaign badge)
  actions?: React.ReactNode;  // Knoppen rechtsboven (filters, add buttons)
  children: React.ReactNode;
}

export default function PageContainer({ title, subtitle, actions, children }: PageContainerProps) {
  return (
    <main className="min-h-screen bg-neutral-950 p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION - Altijd hetzelfde op elke pagina */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-neutral-800">
          <div>
            <h1 className="text-xl font-bold text-neutral-100 tracking-tight">{title}</h1>
            {subtitle && <div className="text-neutral-400 text-sm mt-1">{subtitle}</div>}
          </div>
          
          {/* Action Area (Filters, Buttons) */}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* CONTENT SECTION */}
        <div>
          {children}
        </div>

      </div>
    </main>
  );
}