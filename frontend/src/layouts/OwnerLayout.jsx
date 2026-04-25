import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Loader2 } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const OwnerLayout = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    axios
      .get(`${API_BASE}/auth/me/${user.id}`)
      .then((res) => setCurrentUser(res.data.currentUser))
      .catch((err) => {
        if (err.response?.status === 404) navigate("/choose-role");
      })
      .finally(() => setLoadingUser(false));
  }, [user?.id, navigate]);

  const navLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center gap-2 text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (currentUser?.role !== "owner") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full">
          <p className="text-sm font-semibold text-slate-900">Bạn không có quyền truy cập trang Chủ sân.</p>
          <p className="text-sm text-slate-500 mt-1">Vui lòng đăng nhập đúng tài khoản hoặc chọn lại vai trò.</p>
          <div className="mt-4 flex justify-end">
            <Link
              to="/auth"
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Về trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.owner_approved === false) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full">
          <p className="text-sm font-semibold text-slate-900">Tài khoản Chủ sân đang chờ duyệt</p>
          <p className="text-sm text-slate-500 mt-1">Admin cần duyệt vai trò owner trước khi bạn có thể quản lý sân.</p>
          <div className="mt-4 flex justify-end">
            <UserButton afterSignOutUrl="/auth" />
          </div>
        </div>
      </div>
    );
  }

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
