import { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CustomerPhoto } from '@/types/customer';

/**
 * Photo Gallery - Before/after dental photos
 * @crossref:used-in[CustomerProfile]
 */

interface PhotoGalleryProps {
  readonly photos: readonly CustomerPhoto[];
}

function PhotoPlaceholder({ label, type }: { readonly label: string; readonly type: 'before' | 'after' }) {
  return (
    <div className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-2 ${
      type === 'before' ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'
    }`}>
      <Camera className={`w-8 h-8 ${type === 'before' ? 'text-amber-400' : 'text-emerald-400'}`} />
      <span className="text-xs text-gray-500 text-center px-2">{label}</span>
    </div>
  );
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'before' | 'after'>('all');

  const filteredPhotos = filter === 'all' ? photos : photos.filter((p) => p.type === filter);

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < filteredPhotos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Photo Gallery</h3>
          <span className="text-xs text-gray-400">({photos.length} photos)</span>
        </div>
        <div className="flex gap-1">
          {(['all', 'before', 'after'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No photos found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {filteredPhotos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => setSelectedIndex(idx)}
              className="group relative"
            >
              <PhotoPlaceholder label={photo.label} type={photo.type} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors" />
              <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                photo.type === 'before'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {photo.type}
              </span>
              <span className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
                {photo.date}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedIndex !== null && filteredPhotos[selectedIndex] && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={handlePrev}
            disabled={selectedIndex === 0}
            className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <PhotoPlaceholder
              label={filteredPhotos[selectedIndex].label}
              type={filteredPhotos[selectedIndex].type}
            />
            <div className="mt-4 text-center">
              <p className="font-medium text-gray-900">{filteredPhotos[selectedIndex].label}</p>
              <p className="text-sm text-gray-500 mt-1">{filteredPhotos[selectedIndex].date}</p>
            </div>
          </div>
          <button
            onClick={handleNext}
            disabled={selectedIndex === filteredPhotos.length - 1}
            className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
