import { useMemo } from 'react';

export default function useShareLink(shareState) {
  const shareHash = useMemo(() => {
    try {
      const json = JSON.stringify(shareState);
      const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : '';
      return encoded ? `#palette=${encoded}` : '';
    } catch (err) {
      console.warn('Failed to build share hash', err);
      return '';
    }
  }, [shareState]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shareHash) return '';
    return `${window.location.origin}${window.location.pathname}${shareHash}`;
  }, [shareHash]);

  return { shareHash, shareUrl };
}
