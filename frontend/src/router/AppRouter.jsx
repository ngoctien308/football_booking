import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AuthLayout from '../layouts/AuthLayout';
import ChooseRole from '../pages/normal/ChooseRole';
import AfterSignUp from '../pages/normal/AfterSignUp';

const AppRouter = () => {
  return (
     <BrowserRouter>
      <Routes>
        {/* ADMIN */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* AUTH */}        
        <Route path="/auth" element={<AuthLayout />}>          
        </Route>

        <Route path='/choose-role' element={<ChooseRole />} />
        <Route path='/after-signup' element={<AfterSignUp />} />

        {/* ============================================== */}
        {/* CUSTOMERS */}
        <Route path="/customers" element={<CustomerLayout />}>
        </Route>

        {/* OWNERS */}
        <Route path="/owners" element={<OwnerLayout />}>
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/auth" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter