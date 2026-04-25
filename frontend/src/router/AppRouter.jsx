import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerLayout from '../layouts/CustomerLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import AdminLayout from '../layouts/AdminLayout';
import AuthLayout from '../layouts/AuthLayout';
import ChooseRole from '../pages/ChooseRole';
import AfterSignUp from '../pages/AfterSignUp';
import HomePage from '../pages/customers/HomePage';
import FieldDetail from '../pages/customers/FieldDetail';
import CustomerBookings from '../pages/customers/CustomerBookings';
import OwnerDashboard from '../pages/owners/OwnerDashboard';
import OwnerMessages from '../pages/owners/OwnerMessages';
import OwnerFieldDetail from '../pages/owners/OwnerFieldDetail';
import OwnerStatsDashboard from '../pages/owners/OwnerStatsDashboard';
import AdminAccounts from '../pages/admin/AdminAccounts';
import AdminLogin from '../pages/admin/AdminLogin';

const AppRouter = () => {
  return (
     <BrowserRouter>
      <Routes>
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
          <Route path="stats" element={<OwnerStatsDashboard />} />
          <Route path="messages" element={<OwnerMessages />} />
          <Route path="fields/:id" element={<OwnerFieldDetail />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="accounts" element={<AdminAccounts />} />
        </Route>

        {/* DEFAULT */}
        <Route path="*" element={<Navigate to="/auth" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter
