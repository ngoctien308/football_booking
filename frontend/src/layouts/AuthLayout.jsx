import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { Trophy, LogIn, UserPlus, CircleCheckBig } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AuthLayout = () => {
  const navigate = useNavigate();
  const { user } = useUser();  

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-4xl shadow-2xl overflow-hidden border border-white/20">
          
          {/* Header Section */}
          <div className="pt-10 pb-6 px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-bounce">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Sân Bóng <span className="text-green-600">Pro</span>
            </h1>
            <p className="mt-2 text-gray-500 font-medium">
              Đặt sân nhanh chóng - Thỏa mãn đam mê
            </p>
          </div>

          <div className="px-8 pb-10">
            {/* Signed out View */}
            <SignedOut>
              <div className="space-y-4">
                <SignInButton mode="modal">
                  <button className="cursor-pointer group relative w-full flex items-center justify-center gap-3 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-0.5 transition-all duration-200">
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Đăng Nhập Ngay
                  </button>
                </SignInButton>

                  <button onClick={() => navigate("/choose-role")} className="cursor-pointer w-full flex items-center justify-center gap-3 py-4 bg-white text-green-600 border-2 border-green-600 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all duration-200">
                    <UserPlus className="w-5 h-5" />
                    Đăng Ký Tài Khoản
                  </button>
              </div>

              {/* Quick Info */}
              <div className="mt-8 flex justify-center gap-4 text-xs text-gray-400 border-t pt-6">
                <div className="flex items-center gap-1">
                  <CircleCheckBig className="w-3 h-3" /> Xác nhận tức thì
                </div>
                <div className="flex items-center gap-1">
                  <CircleCheckBig className="w-3 h-3" /> Thanh toán an toàn
                </div>
              </div>
            </SignedOut>

            {/* Signed in View */}
            <SignedIn>
              <div className="flex flex-col items-center p-6 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-green-800 font-medium mb-4 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Xin chào {user?.firstName}!
                </p>
                <div className="scale-125 hover:scale-150 transition-transform duration-300">
                   <UserButton 
                    afterSignOutUrl="/" 
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-12 h-12 shadow-md"
                      }
                    }}
                   />
                </div>
                <button className="mt-6 w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition">
                  Đến Trang Đặt Sân
                </button>
              </div>
            </SignedIn>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center mt-6 text-white/80 text-sm">
          Bạn gặp khó khăn? <span className="underline font-semibold hover:text-white transition cursor-pointer">Hỗ trợ ngay</span>
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;