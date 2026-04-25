import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Loader2, Shield, Search, Lock, Unlock, Trash2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>{children}</span>
);

const AdminAccounts = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  const token = () => localStorage.getItem("admin_token") || "";

  const filtered = useMemo(() => {
    if (!q.trim()) return accounts;
    const qq = q.trim().toLowerCase();
    return accounts.filter((a) => `${a.name || ""} ${a.email || ""} ${a.clerk_user_id || ""}`.toLowerCase().includes(qq));
  }, [accounts, q]);

  const fetchAccounts = async () => {
    const t = token();
    if (!t) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/accounts`, {
        headers: { Authorization: `Bearer ${t}` },
        params: { role: role || undefined },
      });
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không thể tải danh sách tài khoản.");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const setLock = async (accountId, locked) => {
    const t = token();
    if (!t) return;
    try {
      await axios.patch(
        `${API_BASE}/admin/accounts/${accountId}/lock`,
        { locked },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      toast.success(locked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không thể cập nhật khóa tài khoản.");
    }
  };

  const approveOwner = async (accountId, approved) => {
    const t = token();
    if (!t) return;
    try {
      await axios.patch(
        `${API_BASE}/admin/accounts/${accountId}/approve-owner`,
        { approved },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      toast.success(approved ? "Đã duyệt owner." : "Đã hủy duyệt owner.");
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không thể cập nhật duyệt owner.");
    }
  };

  const deleteAccount = async (accountId, hard) => {
    const t = token();
    if (!t) return;

    const ok = window.confirm(
      "Xóa vĩnh viễn tài khoản này? Dữ liệu liên quan (owner/fields/bookings/...) có thể bị xóa theo."
    );
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/admin/accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${t}` },
        params: { hard: "true" },
      });
      toast.success("Đã xóa vĩnh viễn.");
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Không thể xóa tài khoản.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Quản lý tài khoản</h1>
          <p className="text-sm text-slate-500">Duyệt owner, khóa tài khoản và xóa tài khoản</p>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên/email/clerk id..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
          >
            <option value="">Tất cả vai trò</option>
            <option value="customer">Customer</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={fetchAccounts}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải danh sách...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Không có tài khoản nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Người dùng</th>
                  <th className="text-left font-semibold px-4 py-3">Vai trò</th>
                  <th className="text-left font-semibold px-4 py-3">Trạng thái</th>
                  <th className="text-right font-semibold px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((a) => {
                  const isDeleted = !!a.deleted_at;
                  const isLocked = !!a.is_locked;
                  const isOwner = a.role === "owner";
                  const approved = !!a.owner_approved;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.name || "—"}</p>
                        <p className="text-xs text-slate-500">{a.email || "—"}</p>
                        <p className="text-xs text-slate-400">{a.clerk_user_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            a.role === "admin"
                              ? "bg-indigo-100 text-indigo-700"
                              : a.role === "owner"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                          }
                        >
                          {a.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        {isDeleted && <Badge className="bg-rose-100 text-rose-700">deleted</Badge>}
                        {isLocked && !isDeleted && <Badge className="bg-amber-100 text-amber-700">locked</Badge>}
                        {isOwner && !isDeleted && (
                          approved ? (
                            <Badge className="bg-emerald-100 text-emerald-700">owner approved</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">owner pending</Badge>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isOwner && !isDeleted && (
                            <button
                              type="button"
                              onClick={() => approveOwner(a.id, !approved)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              title="Duyệt owner"
                            >
                              {approved ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              {approved ? "Bỏ duyệt" : "Duyệt"}
                            </button>
                          )}

                          {!isDeleted && (
                            <button
                              type="button"
                              onClick={() => setLock(a.id, !isLocked)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                              title="Khóa/mở khóa"
                            >
                              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              {isLocked ? "Mở khóa" : "Khóa"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteAccount(a.id, true)}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-sm font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                            title="Xóa vĩnh viễn"
                          >
                            <Trash2 className="w-4 h-4" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;
