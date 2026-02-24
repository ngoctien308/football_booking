import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AuthLayout from '../layouts/AuthLayout';
import ChooseRole from '../pages/normal/ChooseRole';
import AfterSignUp from '../pages/normal/AfterSignUp';
import HomePage from '../pages/normal/customers/HomePage';
import FieldDetail from '../pages/normal/customers/FieldDetail';
import CustomerBookings from '../pages/normal/customers/CustomerBookings';
import OwnerDashboard from '../pages/normal/owners/OwnerDashboard';
import OwnerMessages from '../pages/normal/owners/OwnerMessages';
import OwnerFieldDetail from '../pages/normal/owners/OwnerFieldDetail';

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
        <Route path="/customers/" element={<CustomerLayout />}>
          <Route path='home-page' element={<HomePage />} />
          <Route path='fields/:id' element={<FieldDetail />} />
          <Route path='bookings' element={<CustomerBookings />} />
        </Route>

        {/* OWNERS */}
        <Route path="/owners" element={<OwnerLayout />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="messages" element={<OwnerMessages />} />
          <Route path="fields/:id" element={<OwnerFieldDetail />} />
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/auth" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter