import { useState, useEffect } from 'react';

type HeroVersion = 'new' | 'original';

const HERO_VERSION_KEY = 'hero-section-version';

export const useHeroVersion = () => {
  const [version, setVersion] = useState<HeroVersion>(() => {
    const stored = localStorage.getItem(HERO_VERSION_KEY);
    return (stored as HeroVersion) || 'new';
  });

  useEffect(() => {
    localStorage.setItem(HERO_VERSION_KEY, version);
  }, [version]);

  const toggleVersion = () => {
    setVersion(prev => prev === 'new' ? 'original' : 'new');
  };

  return { version, setVersion, toggleVersion };
};
