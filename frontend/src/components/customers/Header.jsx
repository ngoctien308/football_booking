import { UserButton, useUser, SignedOut, SignInButton, SignedIn } from "@clerk/clerk-react";
import { Search } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const Header = () => {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          <Link to="/customers/home-page" className="text-slate-800 font-medium text-sm shrink-0">
            <svg width="100" height="80" viewBox="0 0 220 80" xmlns="http://www.w3.org/2000/svg">
              {/* <!-- Background --> */}
              <rect x="0" y="0" width="90" height="80" rx="15" fill="#0B7A3B" />

              {/* <!-- Football field lines --> */}
              <rect x="20" y="15" width="50" height="50" rx="5" fill="none" stroke="white" stroke-width="2" />
              <line x1="45" y1="15" x2="45" y2="65" stroke="white" stroke-width="2" />
              <circle cx="45" cy="40" r="8" fill="none" stroke="white" stroke-width="2" />

              {/* <!-- Football --> */}
              <circle cx="45" cy="40" r="4" fill="white" />
            </svg>
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <SignedIn>
              <NavLink
                to="/customers/bookings"
                className={({ isActive }) =>
                  `hidden sm:inline text-xs font-medium px-2 py-1 rounded-lg ${isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:text-emerald-600"
                  }`
                }
              >
                Lịch đặt của tôi
              </NavLink>
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
