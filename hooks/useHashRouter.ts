
import { useState, useEffect, useCallback } from 'react';

const parseHash = (hash: string) => {
  const path = hash.substring(1) || '/'; // Remove # and default to /
  const [route = 'landing', ...params] = path.split('/').filter(Boolean);
  return { route, params };
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
