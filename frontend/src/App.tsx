import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { AnimatedBackground } from './components/layout/AnimatedBackground';

function App() {
  return (
    <BrowserRouter>
      <AnimatedBackground />
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#212824',
          color: '#F2EEE6',
          border: '1px solid #38443D',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          fontSize: '13px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }
      }} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
