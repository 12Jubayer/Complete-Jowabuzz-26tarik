import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import WinnerBoardModal from '../components/WinnerBoardModal';

const WinnerBoardContext = createContext(null);

export function WinnerBoardProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openWinnerBoard = useCallback(() => setOpen(true), []);
  const closeWinnerBoard = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      open,
      openWinnerBoard,
      closeWinnerBoard,
    }),
    [open, openWinnerBoard, closeWinnerBoard],
  );

  return (
    <WinnerBoardContext.Provider value={value}>
      {children}
      <WinnerBoardModal open={open} onClose={closeWinnerBoard} />
    </WinnerBoardContext.Provider>
  );
}

export function useWinnerBoard() {
  const context = useContext(WinnerBoardContext);
  if (!context) {
    throw new Error('useWinnerBoard must be used within WinnerBoardProvider');
  }
  return context;
}

export default WinnerBoardContext;
