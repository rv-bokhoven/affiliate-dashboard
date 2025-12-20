// components/DashboardSkeleton.tsx
import { Skeleton } from './ui/Skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. De KPI Kaarten (Rij van 4) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#171717] border border-[#262626] rounded-xl p-6 h-[120px] flex flex-col justify-between">
            <Skeleton className="h-4 w-24 mb-2" /> {/* Titel */}
            <div className="flex items-end gap-3">
              <Skeleton className="h-8 w-32" />    {/* Getal */}
              <Skeleton className="h-5 w-12" />    {/* Badge */}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Grafiek & Zijbalk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        
        {/* Grafiek (Links, groot) */}
        <div className="lg:col-span-2 bg-[#171717] border border-[#262626] rounded-xl p-6 flex flex-col">
          <div className="flex justify-between mb-6">
             <Skeleton className="h-6 w-48" /> {/* Titel */}
             <div className="flex gap-2">
                <Skeleton className="h-8 w-16" /> {/* Knopjes */}
                <Skeleton className="h-8 w-16" />
             </div>
          </div>
          {/* Het grafiek vlak */}
          <Skeleton className="w-full flex-1 rounded-lg" />
        </div>

        {/* Zijbalk (Rechts, smal) */}
        <div className="lg:col-span-1 bg-[#171717] border border-[#262626] rounded-xl p-6 flex flex-col">
          <Skeleton className="h-6 w-40 mb-6" /> {/* Titel */}
          
          <div className="space-y-4">
             {/* Nep lijstjes */}
             {[...Array(6)].map((_, i) => (
               <div key={i} className="flex justify-between items-center">
                 <div className="flex gap-3 items-center">
                    <Skeleton className="h-6 w-6 rounded-full" /> {/* Nummer rondje */}
                    <div className="space-y-1">
                       <Skeleton className="h-4 w-32" /> {/* Offer naam */}
                       <Skeleton className="h-3 w-20" /> {/* Subtekst */}
                    </div>
                 </div>
                 <Skeleton className="h-5 w-16" /> {/* Bedrag rechts */}
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}