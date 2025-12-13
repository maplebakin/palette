import { useEffect } from 'react';

// Sync Tailwind's class-based dark mode onto document + body to prevent theme flash.
export default function useDarkClassSync(isDark) {
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    targets.forEach((node) => node?.classList.toggle('dark', isDark));
    return () => targets.forEach((node) => node?.classList.remove('dark'));
  }, [isDark]);
}
