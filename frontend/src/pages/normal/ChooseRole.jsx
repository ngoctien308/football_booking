import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Store, ArrowRight, LogIn, Loader2 } from "lucide-react";
import { SignUpButton, useUser } from "@clerk/clerk-react";
import axios from "axios";

const API_BASE = "http://localhost:3000/api";

const cardBase =
  "w-full p-6 rounded-xl border border-slate-200 bg-white text-left hover:border-emerald-400 hover:bg-slate-50/50 transition flex flex-col";

const ChooseRole = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const setRoleAndGo = (role) => {
    localStorage.setItem("roleForNewAccount", role);
  };

  const completeRegistration = async (role) => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, {
        clerk_user_id: user.id,
        name: user.fullName,
        email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress,
        role,
      });
      if (res.status === 200 || res.status === 201) navigate(`/${role}s`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Có lỗi khi hoàn tất đăng ký.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold text-slate-800">
            {user ? "Chọn vai trò để hoàn tất" : "Bạn đăng ký với vai trò nào?"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {user ? "Chọn một loại tài khoản để tiếp tục." : "Chọn một loại tài khoản bên dưới."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => completeRegistration("customer")}
                disabled={submitting}
                className={cardBase}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="font-medium text-slate-800">Người đặt sân</span>
                <span className="text-slate-500 text-sm mt-1">Tìm sân và đặt lịch nhanh.</span>
                <span className="mt-4 text-emerald-600 text-sm font-medium inline-flex items-center gap-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tiếp tục"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => completeRegistration("owner")}
                disabled={submitting}
                className={cardBase}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center mb-4">
                  <Store className="w-5 h-5 text-slate-600" />
                </div>
                <span className="font-medium text-slate-800">Chủ sân</span>
                <span className="text-slate-500 text-sm mt-1">Quản lý sân và lịch đặt.</span>
                <span className="mt-4 text-slate-600 text-sm font-medium inline-flex items-center gap-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tiếp tục"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </span>
              </button>
            </>
          ) : (
            <>
              <SignUpButton forceRedirectUrl="/after-signup">
                <button onClick={() => setRoleAndGo("customer")} className={cardBase}>
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="font-medium text-slate-800">Người đặt sân</span>
                  <span className="text-slate-500 text-sm mt-1">Tìm sân và đặt lịch nhanh.</span>
                  <span className="mt-4 text-emerald-600 text-sm font-medium inline-flex items-center gap-1">
                    Đăng ký <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </SignUpButton>
              <SignUpButton forceRedirectUrl="/after-signup">
                <button onClick={() => setRoleAndGo("owner")} className={cardBase}>
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center mb-4">
                    <Store className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="font-medium text-slate-800">Chủ sân</span>
                  <span className="text-slate-500 text-sm mt-1">Quản lý sân và lịch đặt.</span>
                  <span className="mt-4 text-slate-600 text-sm font-medium inline-flex items-center gap-1">
                    Đăng ký <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </SignUpButton>
            </>
          )}
        </div>

        {!user && (
          <p className="mt-6 text-center text-slate-500 text-sm">
            Đã có tài khoản?{" "}
            <Link to="/auth" className="text-emerald-600 font-medium inline-flex items-center gap-1 hover:underline">
              <LogIn className="w-4 h-4" /> Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ChooseRole;
