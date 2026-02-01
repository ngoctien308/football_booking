import { Outlet } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

const OwnerLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/owners" className="text-slate-800 font-medium text-sm">
          Sân Bóng Pro · Chủ sân
        </Link>
        <UserButton afterSignOutUrl="/auth" />
      </header>
      <Outlet />
    </div>
  );
};

export default OwnerLayout;
