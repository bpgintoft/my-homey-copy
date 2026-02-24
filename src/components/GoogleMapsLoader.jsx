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
    loadPromise = new Promise((resolve) => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.warn('GOOGLE_MAPS_API_KEY not set - location autocomplete will not work');
        isLoading = false;
        resolve();
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
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        isLoading = false;
        resolve();
      };
      document.head.appendChild(script);
    });
  }, []);

  return loaded;
}