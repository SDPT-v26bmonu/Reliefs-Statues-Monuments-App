import React from 'react';
import { ChevronRight, Star, MapPin, Clock, Route, ArrowRight, Compass } from 'lucide-react';
import { CURATED_TRAILS } from '../data/routes';
import { getRegionDisplayName } from '../data/monuments';
import { CuratedTrail } from '../types';
import { ArtworkImage } from './ArtworkImage';

interface CuratedTrailsProps {
  onViewAllTrails: () => void;
  onExploreTrail: (trail: CuratedTrail) => void;
}

export const CuratedTrails: React.FC<CuratedTrailsProps> = ({
  onViewAllTrails,
  onExploreTrail,
}) => {
  return (
    <section className="px-4 sm:px-6 max-w-2xl mx-auto w-full mb-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-[#b91c1c] uppercase">
            NARRATIVE EXPEDITIONS
          </div>
          <h2 className="font-display text-xl font-bold text-[#111827] tracking-tight">
            Popular Curated Trails
          </h2>
        </div>

        <button
          onClick={onViewAllTrails}
          className="text-xs font-bold text-[#b91c1c] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>View All ({CURATED_TRAILS.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Scroll Trail Cards */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory">
        {CURATED_TRAILS.map((trail) => (
          <div
            key={trail.id}
            className="w-[84vw] max-w-[340px] shrink-0 bg-white rounded-3xl overflow-hidden border border-[#e5e7eb] shadow-sm snap-start flex flex-col hover:shadow-md transition duration-200"
          >
            {/* Card Image Module */}
            <div className="relative h-44 w-full bg-[#f3f4f6] overflow-hidden">
              <ArtworkImage
                src={trail.imageUrl}
                alt={trail.title}
                surveyCode={trail.number}
                regionLabel={trail.sestieriCovered.map(getRegionDisplayName).join(' • ') || 'Venice'}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="bg-black/85 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider">
                  {trail.number}
                </span>

                {trail.rating !== undefined ? (
                  <span className="bg-white/95 text-[#111827] backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <Star className="w-3 h-3 fill-[#b91c1c] text-[#b91c1c]" />
                    <span>{trail.rating} ({trail.reviewsCount})</span>
                  </span>
                ) : (
                  <span className="bg-white/95 text-[#111827] backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs">
                    {trail.sestieriCovered.map(getRegionDisplayName).join(' • ') || 'Venice'}
                  </span>
                )}
              </div>

              {/* Bottom Featured Loop Badge */}
              {trail.featuredBadge && (
                <div className="absolute bottom-3 left-3">
                  <span className="bg-[#b91c1c] text-white px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-sm">
                    {trail.featuredBadge}
                  </span>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#111827] leading-snug">
                  {trail.title}
                </h3>
                <p className="text-xs text-[#4b5563] mt-1.5 line-clamp-2 leading-relaxed">
                  {trail.description}
                </p>

                {/* Metrics Row */}
                <div className="flex items-center gap-3 mt-3 text-xs text-[#111827] font-semibold">
                  <div className="flex items-center gap-1">
                    <Route className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span>{trail.distanceKm} km</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#6b7280]" />
                    <span>~{trail.estimatedMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#b91c1c]" />
                    <span>{trail.stopsCount} stops</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {trail.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        tag.includes('Vaporetto')
                          ? 'bg-[#fee2e2] text-[#b91c1c]'
                          : 'bg-[#f3f4f6] text-[#4b5563]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onExploreTrail(trail)}
                className="mt-4 w-full bg-black hover:bg-[#191c1e] active:scale-[0.98] transition text-white py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Explore Route</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
