import { useState, useCallback } from 'react';
import Home from './pages/Home';
import Detail from './pages/Detail';

type View = { page: 'home' } | { page: 'detail'; changeId: string };

export default function App() {
  const [view, setView] = useState<View>({ page: 'home' });

  const navigateHome = useCallback(() => setView({ page: 'home' }), []);
  const navigateDetail = useCallback((changeId: string) => setView({ page: 'detail', changeId }), []);

  return view.page === 'home'
    ? <Home onSelect={navigateDetail} />
    : <Detail changeId={view.changeId} onBack={navigateHome} />;
}
