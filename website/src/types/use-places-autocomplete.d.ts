declare module 'use-places-autocomplete' {
  interface Suggestion {
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }

  interface UsePlacesAutocompleteResult {
    ready: boolean;
    value: string;
    suggestions: {
      status: string;
      data: Suggestion[];
    };
    setValue: (value: string, shouldFetchData?: boolean) => void;
    clearSuggestions: () => void;
  }

  export default function usePlacesAutocomplete(config?: {
    requestOptions?: Record<string, unknown>;
    debounce?: number;
    cache?: number | boolean;
    cacheKey?: string;
    defaultValue?: string;
    initOnMount?: boolean;
    [key: string]: unknown;
  }): UsePlacesAutocompleteResult;

  export function getGeocode(args: { address?: string; placeId?: string }): Promise<google.maps.GeocoderResult[]>;
  export function getLatLng(result: google.maps.GeocoderResult): { lat: number; lng: number };
}
