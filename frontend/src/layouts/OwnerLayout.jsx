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
        <div className="flex items-center gap-3">
          <Link
            to="/owners/messages"
            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            Tin nhắn
          </Link>
          <UserButton afterSignOutUrl="/auth" />
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default OwnerLayout;
