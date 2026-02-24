import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin } from 'lucide-react';
import { useLoadGoogleMaps } from './GoogleMapsLoader';

export default function LocationAutocomplete({ value, onChange, placeholder = "Event location" }) {
  const isGoogleMapsLoaded = useLoadGoogleMaps();
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);
  const autocompleteService = useRef(null);

  // Initialize autocomplete service when Google Maps loads
  useEffect(() => {
    if (isGoogleMapsLoaded && window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isGoogleMapsLoaded]);

  // Sync external value with internal state
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input: val },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        }
      );
    }
  };

  const handleSelect = (description) => {
    setInputValue(description);
    onChange(description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={inputValue}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => {
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description;
            const secondaryText = suggestion.structured_formatting?.secondary_text || '';

            return (
              <button
                key={suggestion.place_id}
                onClick={() => handleSelect(suggestion.description)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{mainText}</div>
                  {secondaryText && (
                    <div className="text-sm text-gray-500 truncate">{secondaryText}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}