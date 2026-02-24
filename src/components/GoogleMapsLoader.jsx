import { useEffect, useState } from 'react';

let isLoaded = false;
let isLoading = false;
let loadPromise = null;

export function useLoadGoogleMaps() {
  const [loaded, setLoaded] = useState(isLoaded);

  useEffect(() => {
    if (isLoaded) {
      setLoaded(true);
      return;
    }

    if (isLoading) {
      loadPromise?.then(() => setLoaded(true));
      return;
    }

    isLoading = true;
    loadPromise = (async () => {
      try {
        // Fetch API key from backend
        const response = await fetch('/.netlify/functions/getGoogleMapsKey');
        const { apiKey } = await response.json();
        
        if (!apiKey) {
          console.warn('GOOGLE_MAPS_API_KEY not available - location autocomplete will not work');
          isLoading = false;
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          isLoaded = true;
          isLoading = false;
          setLoaded(true);
        };
        script.onerror = () => {
          console.error('Failed to load Google Maps API');
          isLoading = false;
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        isLoading = false;
      }
    })();
    
    loadPromise.then(() => setLoaded(true));
  }, []);

  return loaded;
}