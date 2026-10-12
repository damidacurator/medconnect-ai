import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { PatientDashboard } from '@/pages/PatientDashboard';
import { DoctorDashboard } from '@/pages/DoctorDashboard';
import { InstitutionDashboard } from '@/pages/InstitutionDashboard';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/patient/*" element={<PatientDashboard />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/doctor/*" element={<DoctorDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/institution/*" element={<InstitutionDashboard />} />
        <Route path="/institution" element={<InstitutionDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
