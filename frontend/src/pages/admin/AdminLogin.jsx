import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Shield } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/admin/login`, { email, password });
      localStorage.setItem("admin_token", res.data.token);
      toast.success("Đăng nhập admin thành công.");
      navigate("/admin/accounts");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="mx-auto w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mt-3">Admin Login</h1>
          <p className="text-slate-500 text-sm mt-1">Đăng nhập để quản lý tài khoản</p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

