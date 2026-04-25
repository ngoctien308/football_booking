import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token") || "";
    if (!token) {
      setLoading(false);
      navigate("/admin/login");
      return;
    }

    setLoading(true);
    axios
      .get(`${API_BASE}/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAdmin(res.data.admin))
      .catch(() => {
        localStorage.removeItem("admin_token");
        navigate("/admin/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const navLinkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center gap-2 text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full">
          <p className="text-sm font-semibold text-slate-900">Bạn chưa đăng nhập admin.</p>
          <p className="text-sm text-slate-500 mt-1">Vui lòng đăng nhập để tiếp tục.</p>
          <div className="mt-4 flex justify-end">
            <Link
              to="/admin/login"
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Đến trang admin login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200">
          <p className="text-slate-900 font-semibold text-sm">Admin</p>
          <p className="text-xs text-slate-500 mt-1">Quản trị hệ thống</p>
        </div>

        <nav className="p-3 space-y-1">
          <NavLink to="/admin/accounts" className={navLinkClass}>
            Tài khoản
          </NavLink>
        </nav>

        <div className="mt-auto p-3 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">{admin.email}</p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("admin_token");
              navigate("/admin/login");
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
