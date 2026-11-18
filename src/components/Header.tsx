import React from 'react';
import { 
  Layers, 
  Search, 
  SlidersHorizontal, 
  User, 
  Landmark, 
  SquareAsterisk, 
  Scan
} from 'lucide-react';
import { MonumentCategory } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: MonumentCategory | 'All';
  onSelectCategory: (cat: MonumentCategory | 'All') => void;
  onOpenFilter: () => void;
  onOpenGisMap: () => void;
  onNavigateTab?: (tab: 'explore' | 'collection' | 'lens' | 'routes' | 'support' | 'settings') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onOpenFilter,
  onOpenGisMap,
  onNavigateTab,
}) => {
  return (
    <header className="bg-white border-b border-[#e5e7eb] max-w-4xl mx-auto w-full pt-3 pb-4 px-4 sm:px-6">
      {/* Top Banner matching official PreserVenice website format */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        {/* Left: PreserVenice Official Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/assets/aistudio/pv_logo_60_588922ef.png" 
            alt="PreserVenice" 
            className="h-12 sm:h-14 w-auto object-contain cursor-pointer"
            onClick={() => onNavigateTab?.('explore')}
          />
        </div>

        {/* Right: PreserVenice Official Mission Statement in Italics */}
        <div className="text-xs sm:text-sm text-[#111827] italic font-serif leading-relaxed max-w-md text-left md:text-right">
          <p>
            PreserVenice is a non-profit organization devoted to the preservation and restoration of public art in Venice, Italy.
          </p>
        </div>
      </div>

      {/* PreserVenice Website (Left) & About (Right-aligned) */}
      <div className="flex items-center justify-between gap-4 pt-1 pb-0.5 text-xs">
        <a
          href="https://preservenice.org/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#b91c1c] hover:underline"
        >
          PreserVenice Website
        </a>
        <a
          href="https://preservenice.org/about.html"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#b91c1c] hover:underline text-right"
        >
          About
        </a>
      </div>

      {/* Primary Red Horizontal Divider Rule */}
      <div className="border-t-2 border-[#b91c1c] my-3"></div>

      {/* Search Bar & GIS Cartography Launch */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
        {/* Search Input */}
        <div className="relative flex-1 flex items-center">
          <div className="absolute left-3.5 text-[#9ca3af] pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search statues, monuments, reliefs, or GIS coordinates..."
            className="w-full bg-[#f9fafb] hover:bg-[#f3f4f6] focus:bg-white text-base sm:text-sm text-[#111827] placeholder-[#6b7280] rounded-xl pl-10 pr-10 py-2.5 border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition"
          />
          <button
            onClick={onOpenFilter}
            className="absolute right-2.5 w-7 h-7 rounded-lg hover:bg-black/5 active:scale-95 flex items-center justify-center transition"
            aria-label="Filter Options"
            title="Filter by Sestiere, Era, Material"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#b91c1c]" />
          </button>
        </div>

        {/* GIS Cartography Button */}
        <button
          onClick={onOpenGisMap}
          className="shrink-0 flex items-center justify-center gap-2 bg-[#b91c1c] hover:bg-[#991b1b] active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Layers className="w-4 h-4 text-white" />
          <span>Interactive GIS Map</span>
        </button>
      </div>

      {/* Category Pills (Statues, Monuments, Reliefs, Surveys) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
        <button
          onClick={() => onSelectCategory(selectedCategory === 'Statues' ? 'All' : 'Statues')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
            selectedCategory === 'Statues'
              ? 'bg-[#000000] text-white shadow-xs'
              : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] border border-[#e5e7eb]'
          }`}
        >
          <User className="w-3.5 h-3.5 text-[#0284c7]" />
          <span>Statues</span>
        </button>

        <button
          onClick={() => onSelectCategory(selectedCategory === 'Monuments' ? 'All' : 'Monuments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
            selectedCategory === 'Monuments'
              ? 'bg-[#000000] text-white shadow-xs'
              : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] border border-[#e5e7eb]'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-[#b91c1c]" />
          <span>Monuments</span>
        </button>

        <button
          onClick={() => onSelectCategory(selectedCategory === 'Reliefs' ? 'All' : 'Reliefs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
            selectedCategory === 'Reliefs'
              ? 'bg-[#000000] text-white shadow-xs'
              : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] border border-[#e5e7eb]'
          }`}
        >
          <SquareAsterisk className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>Reliefs</span>
        </button>

        <button
          onClick={() => onSelectCategory(selectedCategory === 'Surveys' ? 'All' : 'Surveys')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
            selectedCategory === 'Surveys'
              ? 'bg-[#000000] text-white shadow-xs'
              : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] border border-[#e5e7eb]'
          }`}
        >
          <Scan className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Surveys / 3D Scans</span>
        </button>
      </div>
    </header>
  );
};
