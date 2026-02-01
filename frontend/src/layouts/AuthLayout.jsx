import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const AuthLayout = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/auth/me/" + user.id);
        setCurrentUser(res.data.currentUser);
      } catch (err) {
        if (err.response?.status === 404) {
          navigate("/choose-role");
          return;
        }
        console.error("Error fetching current user:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 text-center border-b border-slate-100">
          <h1 className="text-xl font-semibold text-slate-800">
            Sân Bóng <span className="text-emerald-600">Pro</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Đặt sân nhanh – Quản lý dễ</p>
        </div>

        <div className="p-6">
          <SignedOut>
            <div className="space-y-3">
              <SignInButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </button>
              </SignInButton>
              <button
                onClick={() => navigate("/choose-role")}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition"
              >
                <UserPlus className="w-4 h-4" />
                Đăng ký
              </button>
            </div>
            <p className="mt-4 text-center text-slate-500 text-xs">
              Đăng ký để chọn vai trò <span className="text-slate-400">Người đặt sân</span> hoặc <span className="text-slate-400">Chủ sân</span>.
            </p>
          </SignedOut>

          <SignedIn>
            <div className="flex flex-col items-center">
              {loadingUser ? (
                <div className="py-8 flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-slate-500 text-sm">Đang tải...</p>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 text-sm mb-3">Xin chào, {user?.firstName}!</p>
                  <UserButton afterSignOutUrl="/auth" />
                  <SignOutButton>
                    <button className="mt-4 w-full py-2.5 text-slate-500 text-sm hover:text-slate-700">
                      Đăng xuất
                    </button>
                  </SignOutButton>
                  <div className="w-full mt-4 space-y-2">
                    {currentUser?.role === "customer" && (
                      <Link
                        to="/customers/home-page"
                        className="block w-full py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 text-center"
                      >
                        Vào trang đặt sân
                      </Link>
                    )}
                    {currentUser?.role === "owner" && (
                      <Link
                        to="/owners"
                        className="block w-full py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 text-center"
                      >
                        Quản lý sân
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
