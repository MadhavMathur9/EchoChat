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
          background: '#190B11',
          color: '#FFF1F5',
          border: '1px solid #3B1A27',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(159, 18, 57, 0.25)',
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
