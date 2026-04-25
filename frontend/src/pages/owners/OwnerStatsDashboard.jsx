import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Loader2, BarChart3, Users, Star, CreditCard, Wallet } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const OwnerStatsDashboard = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [totals, setTotals] = useState({
    booking_count: 0,
    paid_count: 0,
    unpaid_count: 0,
    average_rating: 0,
    review_count: 0,
  });

  const fetchStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bookings/owner/${user.id}/stats`);
      setStats(res.data.stats || []);
      setTotals(res.data.totals || totals);
    } catch (err) {
      console.error(err);
      setStats([]);
      setTotals({
        booking_count: 0,
        paid_count: 0,
        unpaid_count: 0,
        average_rating: 0,
        review_count: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ratingText = useMemo(() => {
    const rating = Number(totals.average_rating || 0);
    const count = Number(totals.review_count || 0);
    if (count === 0) return "Chưa có đánh giá";
    return `${rating.toFixed(1)} / 5 (${count} đánh giá)`;
  }, [totals.average_rating, totals.review_count]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Dashboard thống kê</h1>
            <p className="text-sm text-slate-500">Tổng quan đặt sân, thanh toán và đánh giá theo từng sân</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Tổng lượt đặt sân" value={totals.booking_count} />
        <StatCard icon={CreditCard} label="Đã thanh toán" value={totals.paid_count} />
        <StatCard icon={Wallet} label="Chưa thanh toán" value={totals.unpaid_count} />
        <StatCard icon={Star} label="Điểm đánh giá TB" value={Number(totals.average_rating || 0).toFixed(1)} sub={ratingText} />
      </div>

      <div className="mt-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Theo từng sân</h2>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Chưa có dữ liệu thống kê.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Sân bóng</th>
                  <th className="text-right font-semibold px-4 py-3">Lượt đặt</th>
                  <th className="text-right font-semibold px-4 py-3">Đã thanh toán</th>
                  <th className="text-right font-semibold px-4 py-3">Chưa thanh toán</th>
                  <th className="text-right font-semibold px-4 py-3">Rating TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.map((row) => (
                  <tr key={row.field_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-800 font-medium">{row.field_name || "Sân"}</td>
                    <td className="px-4 py-3 text-right">{row.booking_count}</td>
                    <td className="px-4 py-3 text-right">{row.paid_count}</td>
                    <td className="px-4 py-3 text-right">{row.unpaid_count}</td>
                    <td className="px-4 py-3 text-right">
                      {Number(row.review_count || 0) === 0 ? "—" : Number(row.average_rating || 0).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerStatsDashboard;

