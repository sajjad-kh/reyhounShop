import './index.css';
import { Router } from './components/Router';
import ErrorBoundary from './components/ErrorBoundary';
import { TourPicker } from './components/tour/TourPicker';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <ErrorBoundary>
      <Router />
      <TourPicker />
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </ErrorBoundary>
  );
}

export default App;