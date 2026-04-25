import { Outlet, NavLink, Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

const OwnerLayout = () => {
  const navLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200">
          <Link to="/owners" className="text-slate-900 font-semibold text-sm">
            Sân Bóng Pro · Chủ sân
          </Link>
        </div>

        <nav className="p-3 space-y-1">
          <NavLink to="/owners" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/owners/stats" className={navLinkClass}>
            Thống kê
          </NavLink>
          <NavLink to="/owners/messages" className={navLinkClass}>
            Tin nhắn
          </NavLink>
        </nav>

        <div className="mt-auto p-3 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">Tài khoản</p>
          <UserButton afterSignOutUrl="/auth" />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;
