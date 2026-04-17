/**
 * AddressAutocomplete - Google Places API powered address autocomplete
 * Uses REST API directly to bypass AutocompleteService restrictions
 * 
 * Provides address suggestions as user types and auto-fills
 * Vietnamese address fields (street, city, district, ward)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, X, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
  locality: 'city',
  administrative_area_level_1: 'city',
  administrative_area_level_2: 'district',
  sublocality_level_1: 'district',
  sublocality: 'ward',
  neighborhood: 'ward',
  postal_code: 'postalCode' as keyof AddressDetails
};

// Common Vietnamese city normalizations
const CITY_NORMALIZATIONS: Record<string, string[]> = {
  'Hồ Chí Minh': ['Ho Chi Minh City', 'TP HCM', 'TP. Hồ Chí Minh', 'Sài Gòn', 'Saigon', 'Thành phố Hồ Chí Minh', 'Thành phố'],
  'Hà Nội': ['Ha Noi', 'Hanoi', 'HN', 'Thành phố Hà Nội'],
  'Đà Nẵng': ['Da Nang', 'Danang', 'Thành phố Đà Nẵng'],
  'Hải Phòng': ['Hai Phong', 'Haiphong', 'Thành phố Hải Phòng'],
  'Cần Thơ': ['Can Tho', 'Thành phố Cần Thơ'],
  'Khánh Hòa': ['Nha Trang', 'Khanh Hoa', 'Thành phố Nha Trang'],
  'Bình Dương': ['Binh Duong', 'Thu Dau Mot', 'Tỉnh Bình Dương'],
  'Đồng Nai': ['Dong Nai', 'Bien Hoa', 'Biên Hòa', 'Tỉnh Đồng Nai'],
  'Bà Rịa - Vũng Tàu': ['Ba Ria Vung Tau', 'Vung Tau', 'Vũng Tàu', 'Bà Rịa', 'Tỉnh Bà Rịa Vũng Tàu'],
  'Lâm Đồng': ['Lam Dong', 'Da Lat', 'Đà Lạt', 'Thành phố Đà Lạt', 'Tỉnh Lâm Đồng']
};

// Suggestion interface
interface AddressSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Nhập địa chỉ...',
  disabled = false
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get API key
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  // Check API key on mount
  useEffect(() => {
    if (!apiKey) {
      setError('Google Places API key not configured. Please set VITE_GOOGLE_PLACES_API_KEY');
      console.error('[AddressAutocomplete] VITE_GOOGLE_PLACES_API_KEY not set');
    }
  }, []);

  // Sync external value
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Fetch suggestions from backend proxy (which calls Google Places API)
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!apiKey) return;
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[AddressAutocomplete] Fetching suggestions for:', input);

      const data = await apiFetch<{status: string;predictions?: AddressSuggestion[];error_message?: string;}>(
        '/Places/autocomplete',
        { params: { input, types: 'address', language: 'vi' } }
      );

      if (data.status === 'OK' && data.predictions) {
        setSuggestions(data.predictions);
        console.log('[AddressAutocomplete] Got', data.predictions.length, 'suggestions');
      } else if (data.status === 'ZERO_RESULTS') {
        setSuggestions([]);
      } else {
        console.error('[AddressAutocomplete] API error:', data.status, data.error_message);
        setSuggestions([]);
      }
    } catch (err) {
      console.error('[AddressAutocomplete] Fetch error:', err);
      setError('Failed to fetch suggestions. Please try again.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setShowSuggestions(true);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Parse address components from Google Places result using REST API
  const parseAddressComponents = async (placeId: string, description: string): Promise<AddressDetails | null> => {
    try {
      console.log('[AddressAutocomplete] Fetching place details for:', placeId);

      // Use the backend proxy to get place details
      const data = await apiFetch<{
        result?: {
          address_components: Array<{types: string[];long_name: string;short_name: string;}>;
          geometry?: {location?: {lat: number;lng: number;};};
        };
        status: string;
      }>('/Places/details', { params: { place_id: placeId } });

      if (data.status !== 'OK' || !data.result) {
        console.error('[AddressAutocomplete] Place details error:', data.status);
        return null;
      }

      const addressComponents = data.result.address_components;

      const details: AddressDetails = {
        street: '',
        city: '',
        district: '',
        ward: '',
        fullAddress: description
      };

      // Extract lat/lng
      if (data.result.geometry?.location) {
        details.lat = data.result.geometry.location.lat;
        details.lng = data.result.geometry.location.lng;
      }

      // Parse address components
      const streetParts: string[] = [];

      addressComponents.forEach((component) => {
        const types = component.types;
        const longName = component.long_name;

        types.forEach((type: string) => {
          const mappedKey = ADDRESS_TYPE_MAP[type];

          if (mappedKey === 'street') {
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
        fullAddress: description
      };
    }
  };

  // Normalize city name
  const normalizeCityName = (name: string): string => {
    for (const [standard, variations] of Object.entries(CITY_NORMALIZATIONS)) {
      if (variations.some((v) => name.toLowerCase().includes(v.toLowerCase())) ||
      name.toLowerCase().includes(standard.toLowerCase())) {
        return standard;
      }
    }
    return name;
  };

  // Normalize district name
  const normalizeDistrictName = (name: string): string => {
    return name.
    replace(/^Quận\s+/i, '').
    replace(/^Huyện\s+/i, '').
    replace(/^Thành phố\s+/i, '').
    replace(/^Thị xã\s+/i, '').
    trim();
  };

  // Normalize ward name
  const normalizeWardName = (name: string): string => {
    return name.
    replace(/^Phường\s+/i, '').
    replace(/^Xã\s+/i, '').
    replace(/^Thị trấn\s+/i, '').
    trim();
  };

  // Handle suggestion selection
  const handleSelect = async (suggestion: AddressSuggestion) => {
    const { place_id, description } = suggestion;

    console.log('[AddressAutocomplete] Selected:', description, 'Place ID:', place_id);

    setShowSuggestions(false);
    setSuggestions([]);

    try {
      // Update input value immediately for better UX
      setInputValue(description);

      // Parse address components
      const details = await parseAddressComponents(place_id, description);
      console.log('[AddressAutocomplete] Parsed details:', details);

      // Call onChange ONCE with both address and details
      // This ensures all values (street, city, district, ward) are set together
      onChange(description, details || undefined);
    } catch (error) {
      console.error('[AddressAutocomplete] Error parsing address:', error);
      // If parsing fails, at least set the street
      onChange(description);
    }
  };

  // Clear input
  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the input or dropdown
      const target = e.target as HTMLElement;
      const isInputClick = inputRef.current?.contains(target);
      const isDropdownClick = dropdownRef.current?.contains(target);

      if (!isInputClick && !isDropdownClick) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Error state
  if (error) {
    return (
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            title={inputValue || placeholder} // Show full address on hover
            className="w-full pl-10 pr-4 py-3 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all" />
          
        </div>
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>
          {error.includes('API key') &&
          <p className="text-xs text-red-500 mt-1">

          </p>
          }
        </div>
      </div>);

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
          onFocus={() => inputValue.length >= 3 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled || !apiKey}
          title={inputValue || placeholder} // Show full address on hover
          className={`
            w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl 
            text-sm text-gray-900 placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 
            transition-all
            ${disabled || !apiKey ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}
          `} />
        

        {/* Clear button */}
        {inputValue &&
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
          
            <X className="w-4 h-4" />
          </button>
        }

        {/* Loading indicator */}
        {isLoading &&
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          </div>
        }
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 &&
      <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-2 max-h-72 overflow-y-auto">
            {suggestions.map((suggestion, index) =>
          <button
            key={suggestion.place_id}
            type="button"
            onClick={() => handleSelect(suggestion)}
            className={`
                  w-full px-4 py-3 text-left flex items-start gap-3 
                  transition-colors hover:bg-orange-50
                  ${index !== suggestions.length - 1 ? 'border-b border-gray-50' : ''}
                `}>
            
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
          )}
          </div>
        </div>
      }

      {/* No results message */}
      {showSuggestions && !isLoading && inputValue.length >= 3 && suggestions.length === 0 &&
      <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-[100]">
          <div className="flex items-center gap-3 text-gray-500">
            <Search className="w-5 h-5" />
            <p className="text-sm"></p>
          </div>
        </div>
      }
    </div>);

}

export default AddressAutocomplete;