import { UserButton, useUser, SignedOut, SignInButton, SignedIn } from "@clerk/clerk-react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          <Link to="/customers/home-page" className="text-slate-800 font-medium text-sm shrink-0">
            Sân Bóng Pro
          </Link>
          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm sân, địa chỉ..."
                className="w-full pl-8 pr-3 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SignedIn>
              <span className="text-slate-600 text-sm hidden sm:inline">{user?.firstName}</span>
              <UserButton afterSignOutUrl="/auth" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
                  Đăng nhập
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
