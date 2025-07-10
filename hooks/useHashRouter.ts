
import { useState, useEffect, useCallback } from 'react';

const parseHash = (hash: string) => {
  const path = hash.substring(1) || '/'; // Remove # and default to /
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { route: 'landing', params: [] };
  }

  // Handle compound routes
  if (segments.length >= 2) {
    const compoundRoute = segments[0] + '-' + segments[1];
    const knownCompoundRoutes = ['quote-debug', 'auth-debug', 'admin-dashboard'];

    if (knownCompoundRoutes.includes(compoundRoute)) {
      return { route: compoundRoute, params: segments.slice(2) };
    }
  }

  const [route, ...params] = segments;
  const result = { route, params };
  console.log('Parsed route:', result, 'from hash:', hash);
  return result;
};

export const useHashRouter = () => {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((route: string) => {
    console.log('Navigating to:', route);
    window.location.hash = `#/${route}`;
  }, []);

  useEffect(() => {
    console.log('Hash changed:', hash);
  }, [hash]);

  const result = parseHash(hash);
  console.log('useHashRouter result:', result);
  return { ...result, navigate };
};
