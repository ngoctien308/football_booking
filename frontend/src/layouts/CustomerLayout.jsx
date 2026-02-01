import { Outlet } from "react-router-dom";
import Header from "../components/customers/Header";

const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <Outlet />
    </div>
  );
};

export default CustomerLayout;