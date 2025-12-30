import { PaletteContext } from './PaletteContext';
import { usePaletteState } from '../hooks/usePaletteState';

export function PaletteProvider({ children }) {
  const paletteState = usePaletteState();

  return (
    <PaletteContext.Provider value={paletteState}>
      {children}
    </PaletteContext.Provider>
  );
}
