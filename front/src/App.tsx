import { Router } from './components/Router';
import ErrorBoundary from './components/ErrorBoundary';
import { TourPicker } from './components/tour/TourPicker';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';

function App() {
  const { state } = useAuth();
  return (
    <ErrorBoundary key={state.user?.id ?? 'guest'}>
      <Router />
      <TourPicker />
      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{ top: 80, overflow: 'visible' }}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: '0',
          },
        }}
      />
    </ErrorBoundary>
  );
}

export default App;