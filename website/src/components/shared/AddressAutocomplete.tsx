/**
 * AddressAutocomplete - Google Places API powered address autocomplete
 * @crossref:used-in[AddCustomerForm]
 * @crossref:uses[usePlacesAutocomplete, Google Places API]
 * 
 * Provides address suggestions as user types and auto-fills
 * Vietnamese address fields (street, city, district, ward)
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X, Check } from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, details?: AddressDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface AddressDetails {
  street: string;
  city: string;
  district: string;
  ward: string;
  fullAddress: string;
  lat?: number;
  lng?: number;
}

// Vietnamese address component mapping
const ADDRESS_TYPE_MAP: Record<string, keyof AddressDetails> = {
  street_number: 'street',
  route: 'street',
  subpremise: 'street',
  premise: 'street',
  locality: 'city',           // Thành phố trực thuộc TW
  administrative_area_level_1: 'city', // Tỉnh/Thành phố
  administrative_area_level_2: 'district', // Quận/Huyện/Thành phố trực thuộc tỉnh
  sublocality_level_1: 'district', // Quận
  sublocality: 'ward',        // Phường/Xã
  neighborhood: 'ward',
  postal_code: 'postalCode' as keyof AddressDetails,
};

// Common Vietnamese city normalizations
const CITY_NORMALIZATIONS: Record<string, string[]> = {
  'Hồ Chí Minh': ['Ho Chi Minh City', 'TP HCM', 'TP. Hồ Chí Minh', 'Sài Gòn', 'Saigon'],
  'Hà Nội': ['Ha Noi', 'Hanoi', 'HN'],
  'Đà Nẵng': ['Da Nang', 'Danang'],
  'Hải Phòng': ['Hai Phong', 'Haiphong'],
  'Cần Thơ': ['Can Tho'],
  'Khánh Hòa': ['Nha Trang', 'Khanh Hoa'],
  'Bình Dương': ['Binh Duong', 'Thu Dau Mot'],
  'Đồng Nai': ['Dong Nai', 'Bien Hoa', 'Biên Hòa'],
  'Bà Rịa - Vũng Tàu': ['Ba Ria Vung Tau', 'Vung Tau', 'Vũng Tàu', 'Bà Rịa'],
  'Lâm Đồng': ['Lam Dong', 'Da Lat', 'Đà Lạt'],
};

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Nhập địa chỉ...',
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Load Google Places Script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      setScriptError('Google Places API key not configured');
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[data-google-places]')) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=vi&region=VN`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-places', 'true');
    
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => setScriptError('Failed to load Google Places API');
    
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it might be used by other components
    };
  }, []);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      // Allow addresses from any country (no restriction)
      types: ['address'],
    },
    debounce: 300,
    cache: 86400, // 24 hours
    initOnMount: isScriptLoaded,
  });

  // Sync external value
  useEffect(() => {
    if (value !== inputValue) {
      setValue(value, false);
    }
  }, [value, setValue]);

  // Debug logging
  useEffect(() => {
    console.log('[AddressAutocomplete] Status:', status, 'Data count:', data.length, 'Ready:', ready, 'Script loaded:', isScriptLoaded);
  }, [status, data, ready, isScriptLoaded]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('[AddressAutocomplete] Input changed:', newValue);
    setValue(newValue);
    onChange(newValue);
    setShowSuggestions(true);
  };

  // Parse address components from Google Places result
  const parseAddressComponents = async (placeId: string, description: string): Promise<AddressDetails> => {
    try {
      const results = await getGeocode({ placeId });
      const place = results[0];
      const addressComponents = place.address_components;
      
      const details: AddressDetails = {
        street: '',
        city: '',
        district: '',
        ward: '',
        fullAddress: description,
      };

      // Extract lat/lng
      const { lat, lng } = await getLatLng(place);
      details.lat = lat;
      details.lng = lng;

      // Parse address components
      const streetParts: string[] = [];
      
      addressComponents.forEach((component: { types: string[]; long_name: string; short_name: string }) => {
        const types = component.types;
        const longName = component.long_name;

        types.forEach((type: string) => {
          const mappedKey = ADDRESS_TYPE_MAP[type];
          
          if (mappedKey === 'street') {
            // Build street address from parts
            if (type === 'street_number') {
              streetParts.unshift(longName);
            } else if (type === 'route') {
              streetParts.push(longName);
            } else if (type === 'subpremise' || type === 'premise') {
              streetParts.push(longName);
            }
          } else if (mappedKey === 'city') {
            details.city = normalizeCityName(longName);
          } else if (mappedKey === 'district') {
            details.district = normalizeDistrictName(longName);
          } else if (mappedKey === 'ward') {
            details.ward = normalizeWardName(longName);
          }
        });
      });

      // Join street parts
      details.street = streetParts.join(', ');
      
      // Fallback: if no street parts, use the description before the first comma
      if (!details.street && description.includes(',')) {
        details.street = description.split(',')[0];
      }

      return details;
    } catch (error) {
      console.error('Error parsing address:', error);
      return {
        street: description.split(',')[0] || '',
        city: '',
        district: '',
        ward: '',
        fullAddress: description,
      };
    }
  };

  // Normalize city name to match VIET_CITIES
  const normalizeCityName = (name: string): string => {
    // Check direct matches first
    for (const [standard, variations] of Object.entries(CITY_NORMALIZATIONS)) {
      if (variations.some(v => name.toLowerCase().includes(v.toLowerCase())) || 
          name.toLowerCase().includes(standard.toLowerCase())) {
        return standard;
      }
    }
    return name;
  };

  // Normalize district name
  const normalizeDistrictName = (name: string): string => {
    // Remove common prefixes and normalize
    return name
      .replace(/^Quận\s+/i, '')
      .replace(/^Huyện\s+/i, '')
      .replace(/^Thành phố\s+/i, '')
      .replace(/^Thị xã\s+/i, '')
      .trim();
  };

  // Normalize ward name
  const normalizeWardName = (name: string): string => {
    // Remove common prefixes and normalize
    return name
      .replace(/^Phường\s+/i, '')
      .replace(/^Xã\s+/i, '')
      .replace(/^Thị trấn\s+/i, '')
      .trim();
  };

  // Handle suggestion selection
  const handleSelect = async (suggestion: typeof data[0]) => {
    const { place_id, description } = suggestion;
    
    console.log('[AddressAutocomplete] Selected:', description, 'Place ID:', place_id);
    
    setValue(description, false);
    clearSuggestions();
    setShowSuggestions(false);
    
    try {
      const details = await parseAddressComponents(place_id, description);
      console.log('[AddressAutocomplete] Parsed details:', details);
      onChange(description, details);
    } catch (error) {
      console.error('[AddressAutocomplete] Error parsing address:', error);
      // Still update the street field even if parsing fails
      onChange(description, undefined);
    }
  };

  // Clear input
  const handleClear = () => {
    setValue('');
    onChange('');
    clearSuggestions();
    inputRef.current?.focus();
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (scriptError) {
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
        />
        <p className="mt-1 text-xs text-red-500">{scriptError}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Input with icon */}
      <div className="relative" ref={inputRef}>
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled || !ready}
          className={`
            w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl 
            text-sm text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 
            transition-all
            ${disabled || !ready ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}
          `}
        />

        {/* Clear button */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Loading indicator */}
        {!ready && !scriptError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && status === 'OK' && data.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-2 max-h-72 overflow-y-auto">
            {data.map((suggestion, index) => (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`
                  w-full px-4 py-3 text-left flex items-start gap-3 
                  transition-colors hover:bg-orange-50
                  ${index !== data.length - 1 ? 'border-b border-gray-50' : ''}
                `}
              >
                <div className="mt-0.5 p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {suggestion.structured_formatting?.secondary_text || suggestion.description}
                  </p>
                </div>
                <Check className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && status === 'ZERO_RESULTS' && inputValue.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-[100]">
          <div className="flex items-center gap-3 text-gray-500">
            <Search className="w-5 h-5" />
            <p className="text-sm">Không tìm thấy địa chỉ phù hợp</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
