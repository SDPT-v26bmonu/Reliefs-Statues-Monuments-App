import React, { useState, useEffect } from 'react';
import {
  Search,
  Box,
  Plus,
  Check,
  Layers,
  SlidersHorizontal,
  ArrowRight,
  Images,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  MapPin,
  X,
} from 'lucide-react';
import {
  MONUMENTS,
  REGIONAL_COLLECTIONS,
  DATASET_STATS,
  getRegionDisplayName,
} from '../data/monuments';
import { Monument, MonumentCategory, Sestiere } from '../types';
import { getCategoryPinTheme } from './VeniceGoogleMap';
import { ArtworkImage } from './ArtworkImage';

interface CollectionScreenProps {
  onSelectMonument: (monument: Monument) => void;
  onToggleRoute: (id: string) => void;
  savedRouteIds: string[];
  onOpenFilter: () => void;
  onOpenGisMap: () => void;
  onNavigateToSupport?: (collectionId: string) => void;
  initialCategory?: MonumentCategory | 'All';
  initialSearchQuery?: string;
  selectedSestiere?: Sestiere | 'All';
  onClearSestiere?: () => void;
  onlyWithNotes?: boolean;
  onlyMultiPhoto?: boolean;
  only3D?: boolean;
}

type CollectionFilterTab = MonumentCategory | 'All' | 'Collections';

const PAGE_SIZE = 48;

export const CollectionScreen: React.FC<CollectionScreenProps> = ({
  onSelectMonument,
  onToggleRoute,
  savedRouteIds,
  onOpenFilter,
  onOpenGisMap,
  onNavigateToSupport,
  initialCategory = 'All',
  initialSearchQuery = '',
  selectedSestiere = 'All',
  onClearSestiere,
  onlyWithNotes = false,
  onlyMultiPhoto = false,
  only3D = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeCategory, setActiveCategory] = useState<CollectionFilterTab>(initialCategory);
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeCategory, selectedSestiere, onlyWithNotes, onlyMultiPhoto, only3D]);

  const filteredMonuments = MONUMENTS.filter((m) => {
    if (
      activeCategory !== 'All' &&
      activeCategory !== 'Collections' &&
      m.category !== activeCategory
    ) {
      return false;
    }
    if (
      selectedSestiere !== 'All' &&
      m.rawRegion !== selectedSestiere &&
      m.regionDisplay !== selectedSestiere
    ) {
      return false;
    }
    if (onlyWithNotes && !m.generalNotes) return false;
    if (onlyMultiPhoto && m.galleryImages.length <= 1) return false;
    if (only3D && !m.has3DModel) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        m.title.toLowerCase().includes(q) ||
        m.surveyCode.toLowerCase().includes(q) ||
        m.arcgisGlobalId.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.sestiere.toLowerCase().includes(q) ||
        m.rawRegion.toLowerCase().includes(q) ||
        m.regionDisplay.toLowerCase().includes(q) ||
        m.locationName.toLowerCase().includes(q) ||
        (m.generalNotes || '').toLowerCase().includes(q) ||
        (m.artist || '').toLowerCase().includes(q) ||
        m.originalFilenames.some((fn) => fn.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const displayedMonuments = filteredMonuments.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredMonuments.length - displayedMonuments.length);

  const filterTabs: CollectionFilterTab[] = ['All', 'Collections', 'Statues', 'Reliefs', 'Monuments'];

  return (
    <div className="pt-4 pb-24 px-4 sm:px-6 max-w-2xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-[#b91c1c] uppercase mb-1">
            PRESERVENICE VENICE SURVEY123 ARCHIVE
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            Venice Heritage Collection
          </h1>
          <p className="text-xs text-[#6b7280] mt-1">
            {activeCategory === 'Collections'
              ? `${REGIONAL_COLLECTIONS.length} regional collections across Venice (${MONUMENTS.length} artworks)`
              : `${filteredMonuments.length} of ${MONUMENTS.length} ArcGIS Survey123 artworks across ${DATASET_STATS.regionsCount} Venice regions`}
          </p>
        </div>

        <button
          onClick={onOpenGisMap}
          className="shrink-0 flex items-center gap-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] active:scale-95 text-[#111827] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#e5e7eb] transition cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-[#b91c1c]" />
          <span>GIS Map</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by artwork ID, region, field notes, or Survey123 GUID..."
            className="w-full bg-[#f9fafb] hover:bg-[#f3f4f6] focus:bg-white text-base sm:text-sm text-[#111827] placeholder-[#6b7280] rounded-xl pl-10 pr-4 py-2.5 border border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#b91c1c]/30 focus:border-[#b91c1c] transition"
          />
        </div>

        <button
          onClick={onOpenFilter}
          className="w-10 h-10 rounded-xl bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#e5e7eb] active:scale-95 flex items-center justify-center transition text-[#b91c1c] shrink-0 cursor-pointer"
          title="Filter Parameters"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Category & Collections Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
        {filterTabs.map((cat) => {
          const isSelected = activeCategory === cat;
          if (cat === 'Collections') {
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory('Collections')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#b91c1c] text-white shadow-xs'
                    : 'bg-[#b91c1c]/10 text-[#b91c1c] border border-[#b91c1c]/25 hover:bg-[#b91c1c]/20'
                }`}
              >
                Collections ({REGIONAL_COLLECTIONS.length})
              </button>
            );
          }

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-[#eceef0] text-[#45464d] hover:bg-[#e0e3e5]'
              }`}
            >
              {cat}
            </button>
          );
        })}

        {activeCategory !== 'Collections' && selectedSestiere !== 'All' && (
          <button
            type="button"
            onClick={() => onClearSestiere?.()}
            className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-[#fee2e2] text-[#b91c1c] border border-[#b91c1c]/25 flex items-center gap-1 cursor-pointer shrink-0"
            title="Clear region filter"
          >
            <span>Region: {getRegionDisplayName(selectedSestiere)}</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Collections View */}
      {activeCategory === 'Collections' ? (
        <div className="space-y-4">
          <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 text-xs sm:text-sm text-[#374151] leading-relaxed">
            Collections bring together Venice’s public artworks based on location, historical significance, and other shared characteristics. Make a lasting impact by donating to a collection, helping fund the preservation and restoration of multiple related artworks while protecting Venice’s cultural heritage for future generations.
          </div>

          {REGIONAL_COLLECTIONS.map((col) => {
            const isExpanded = expandedCollectionId === col.id;
            return (
              <div
                key={col.id}
                className={`bg-white rounded-3xl overflow-hidden transition duration-200 ${
                  isExpanded
                    ? 'border-2 border-[#b91c1c] shadow-lg'
                    : 'border border-[#e5e7eb] shadow-sm hover:shadow-md'
                }`}
              >
                {/* Collection Tile Header */}
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-44 sm:h-auto sm:w-56 shrink-0 bg-[#f3f4f6]">
                    <ArtworkImage
                      src={col.imageUrl}
                      alt={col.title}
                      surveyCode={col.regionDisplay}
                      regionLabel={`${col.artworks.length} artworks`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#b91c1c]">
                          {col.subtitle}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-lg text-[#111827] leading-snug">
                        {col.title}
                      </h3>
                      <p className="text-xs text-[#45464d] mt-1.5 leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#f2f4f6] flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {col.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] bg-[#eceef0] text-[#45464d] px-2 py-0.5 rounded-full"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setExpandedCollectionId(isExpanded ? null : col.id)
                        }
                        className="bg-black hover:bg-[#191c1e] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <span>{isExpanded ? 'Close Collection' : 'Select Collection'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Collection Dropdown */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-[#e5e7eb] animate-in slide-in-from-top-2 duration-200">
                    {/* Transparent Red "Donate to Collection" Box */}
                    <button
                      onClick={() => onNavigateToSupport?.(col.id)}
                      className="w-full bg-[#b91c1c]/10 hover:bg-[#b91c1c]/15 text-[#b91c1c] border border-[#b91c1c]/20 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer mb-4"
                    >
                      <span className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 shrink-0" />
                        <span>Donate to Collection</span>
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>

                    {/* All Artwork Types & Locations */}
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-3">
                      Artwork Types &amp; Locations ({col.artworks.length})
                    </h4>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {col.artworks.map((artwork, idx) => {
                        const pinTheme = getCategoryPinTheme(artwork.category);
                        return (
                          <div
                            key={artwork.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f9fafb] border border-[#e5e7eb] hover:border-[#b91c1c]/40 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-6 h-6 rounded-full ${pinTheme.bg} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-display font-bold text-xs text-[#111827] truncate">
                                    {artwork.title}
                                  </span>
                                  <span
                                    className={`${pinTheme.bg} text-white text-[9px] font-bold px-2 py-0.5 rounded-full`}
                                  >
                                    {artwork.category}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mt-0.5 truncate">
                                  <MapPin className="w-3 h-3 text-[#b91c1c] shrink-0" />
                                  <span className="truncate">
                                    {artwork.locationName} • {artwork.coordinates.formatted}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => onSelectMonument(artwork)}
                              className="text-xs font-bold text-[#b91c1c] hover:underline shrink-0 cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : filteredMonuments.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 text-center">
          <p className="font-display font-bold text-base text-[#111827]">
            No Matching Survey123 Artworks
          </p>
          <p className="text-xs text-[#6b7280] mt-1">
            {only3D
              ? `Only ${DATASET_STATS.with3DModelCount} of ${DATASET_STATS.totalArtworks} Survey123 records currently report _3d_model_captured = "Yes".`
              : 'Try adjusting your search query or filters.'}
          </p>
        </div>
      ) : (
        /* Monument Cards Grid */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedMonuments.map((monument) => {
              const isInRoute = savedRouteIds.includes(monument.id);
              const pinTheme = getCategoryPinTheme(monument.category);
              return (
                <div
                  key={monument.id}
                  className="bg-white rounded-3xl overflow-hidden border border-[#e2e8f0] shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="relative h-48 w-full bg-[#e0e3e5] overflow-hidden group">
                    <ArtworkImage
                      src={monument.imageUrl}
                      alt={monument.title}
                      surveyCode={monument.surveyCode}
                      regionLabel={monument.regionDisplay}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className={`${pinTheme.bg} text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs`}>
                        {monument.category}
                      </span>

                      <div className="flex items-center gap-1">
                        {monument.galleryImages.length > 1 && (
                          <span className="bg-black/75 text-white backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <Images className="w-3 h-3" />
                            <span>{monument.galleryImages.length}</span>
                          </span>
                        )}
                        {monument.has3DModel && (
                          <span className="bg-[#0284c7] text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                            <Box className="w-3 h-3" />
                            <span>3D</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="bg-white/90 text-[#191c1e] backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-mono font-medium">
                        {monument.coordinates.formatted}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-[#b91c1c] uppercase tracking-wider">
                        {monument.regionDisplay} • {monument.surveyCode}
                      </div>
                      <h3 className="font-display font-bold text-base text-[#111827] leading-snug mt-1">
                        {monument.title}
                      </h3>
                      <div className="text-[11px] text-[#6b7280] font-medium mt-0.5">
                        {monument.artist
                          ? `${monument.artist}${monument.year ? ` (${monument.year})` : ''}`
                          : `Recorded ${monument.creationDate.split(' ')[0]} • ${monument.creator}`}
                      </div>
                      <p className="text-xs text-[#4b5563] line-clamp-2 mt-2 leading-relaxed">
                        {monument.generalNotes
                          ? `Field Note: "${monument.generalNotes}"`
                          : 'No additional field notes recorded in Survey123.'}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#f3f4f6] flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggleRoute(monument.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isInRoute
                            ? 'bg-[#10b981] text-white'
                            : 'bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111827]'
                        }`}
                      >
                        {isInRoute ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Route</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 text-[#b91c1c]" />
                            <span>Route</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onSelectMonument(monument)}
                        className="flex items-center gap-1 text-xs font-bold text-[#b91c1c] hover:underline cursor-pointer"
                      >
                        <span>View Record</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-3 bg-[#111827] hover:bg-black text-white rounded-full text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
              >
                Load More Artworks ({remainingCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

