import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const AfterSignUp = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const role = localStorage.getItem("roleForNewAccount");
    if (!role || !user?.id) {
      if (!role) navigate("/choose-role");
      return;
    }

    if (role !== "customer" && role !== "owner") {
      navigate("/choose-role");
      return;
    }

    const addAccount = async () => {
      try {
        const res = await axios.post(`${API_BASE}/auth/signup`, {
          clerk_user_id: user.id,
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress,
          role,
        });
        if (res.status === 200 || res.status === 201) {
          localStorage.removeItem("roleForNewAccount");
          setStatus("done");
          navigate(`/${role}s`);
          return;
        }
        setStatus("error");
      } catch (err) {
        console.error("Error adding account:", err);
        setStatus("error");
      }
    };

    addAccount();
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 text-sm">Đang tạo tài khoản...</p>
          </>
        )}
        {status === "error" && (
          <p className="text-slate-700 text-sm">
            Có lỗi khi tạo tài khoản.{" "}
            <button type="button" className="text-emerald-600 font-medium underline" onClick={() => navigate("/choose-role")}>
              Thử lại
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AfterSignUp;
