import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Clock, MapPin } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const statusBadgeClass = (status) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-rose-100 text-rose-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-700";
};

const statusText = (status) => {
  if (status === "approved") return "Đã xác nhận";
  if (status === "rejected") return "Bị từ chối";
  if (status === "cancelled") return "Đã hủy";
  return "Đang chờ";
};

const CustomerBookings = () => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [filterBookingDate, setFilterBookingDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [showAllBookings, setShowAllBookings] = useState(false);

  const fetchBookings = async (filters = {}) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bookings/customer/${user.id}`, { params: filters });
      setBookings(res.data?.bookings || []);
    } catch (err) {
      console.error("Error loading customer bookings:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi tải lịch đặt sân.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    setShowAllBookings(false);
    fetchBookings({
      ...(filterBookingDate ? { booking_date: filterBookingDate } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterPaymentStatus ? { payment_status: filterPaymentStatus } : {}),
    });
  }, [user?.id, filterBookingDate, filterStatus, filterPaymentStatus]);

  const visibleBookings = showAllBookings ? bookings : bookings.slice(0, 5);

  const handlePay = async (bookingId) => {
    if (!user?.id) return;
    try {
      setPayingId(bookingId);
      const res = await axios.post(`${API_BASE}/bookings/${bookingId}/checkout`, {
        clerk_user_id: user.id,
      });
      const url = res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Không tạo được phiên thanh toán Stripe.");
      }
    } catch (err) {
      console.error("Error paying booking:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi tạo thanh toán Stripe.");
    } finally {
      setPayingId(null);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!user?.id) return;
    const ok = window.confirm("Bạn muốn hủy lịch đặt này? (Chỉ hủy được khi chủ sân chưa duyệt)");
    if (!ok) return;

    try {
      setCancellingId(bookingId);
      const res = await axios.patch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        clerk_user_id: user.id,
      });

      const updated = res.data?.booking;
      if (updated) {
        setBookings((prev) =>
          prev.map((b) => (b.id === Number(bookingId) ? { ...b, ...updated } : b))
        );
      } else {
        await fetchBookings({
          ...(filterBookingDate ? { booking_date: filterBookingDate } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(filterPaymentStatus ? { payment_status: filterPaymentStatus } : {}),
        });
      }

      toast.success("Đã hủy lịch đặt.");
    } catch (err) {
      console.error("Error cancelling booking:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi hủy lịch đặt.");
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const bookingId = params.get("booking_id");

    if (!paymentStatus || !bookingId) return;

    const finalizePayment = async () => {
      try {
        if (paymentStatus === "success") {
          const res = await axios.patch(`${API_BASE}/bookings/${bookingId}/pay`, {
            clerk_user_id: user.id,
            payment_method: "stripe",
          });

          const updated = res.data?.booking;
          if (updated) {
            setBookings((prev) =>
              prev.map((b) => (b.id === Number(bookingId) ? { ...b, ...updated } : b))
            );
          } else {
            await fetchBookings({
              ...(filterBookingDate ? { booking_date: filterBookingDate } : {}),
              ...(filterStatus ? { status: filterStatus } : {}),
              ...(filterPaymentStatus ? { payment_status: filterPaymentStatus } : {}),
            });
          }

          toast.success("Thanh toán thành công.");
        } else if (paymentStatus === "cancel") {
          toast.error("Bạn đã hủy thanh toán.");
        }
      } catch (err) {
        console.error("Error finalizing Stripe payment:", err);
        toast.error(err.response?.data?.message || "Có lỗi khi cập nhật trạng thái thanh toán.");
      } finally {
        navigate("/customers/bookings", { replace: true });
      }
    };

    finalizePayment();
  }, [location.search, user?.id, navigate]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Lịch đặt sân</h1>
            <p className="text-sm text-slate-500 mt-1">Theo dõi và thanh toán các lịch đặt đã được duyệt.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="date"
              value={filterBookingDate}
              onChange={(e) => setFilterBookingDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">Trạng thái</option>
              <option value="pending">Đang chờ</option>
              <option value="approved">Đã xác nhận</option>
              <option value="rejected">Bị từ chối</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">Trạng thái thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFilterBookingDate("");
                setFilterStatus("");
                setFilterPaymentStatus("");
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {!loading && bookings.length > 5 && (
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowAllBookings((v) => !v)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {showAllBookings ? "Thu gọn" : "Xem tất cả"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            Đang tải lịch đặt sân...
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            Bạn chưa có slot đặt sân nào.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((booking) => (
              <div key={booking.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {booking.field?.field_name || "Sân"} - {booking.booking_date}
                    </p>
                    {booking.field?.address && (
                      <div className="flex items-start gap-1 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 mt-0.5" />
                        <span className="line-clamp-1">{booking.field.address}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(
                      booking.status
                    )}`}
                  >
                    {statusText(booking.status)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                  <p className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>
                      {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
                    </span>
                  </p>
                  <p>
                    Giá:{" "}
                    <span className="font-medium">
                      {Number(booking.total_price || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </p>
                  <p>Số điện thoại: {booking.contact_phone}</p>
                  <p>Ngày đặt: {new Date(booking.created_at).toLocaleString("vi-VN")}</p>
                </div>

                {booking.note && <p className="mt-2 text-sm text-slate-500">Ghi chú: {booking.note}</p>}

                <div className="mt-3 flex items-center justify-between gap-2 text-xs sm:text-sm text-slate-600">
                  <span>
                    Thanh toán:{" "}
                    <span className="font-medium">
                      {booking.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {booking.status === "approved" && booking.payment_status !== "paid" && (
                      <button
                        type="button"
                        disabled={payingId === booking.id}
                        onClick={() => handlePay(booking.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {payingId === booking.id ? "Đang chuyển tới Stripe..." : "Thanh toán"}
                      </button>
                    )}
                    {booking.status === "pending" && (
                      <button
                        type="button"
                        disabled={cancellingId === booking.id}
                        onClick={() => handleCancel(booking.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs sm:text-sm font-medium hover:bg-rose-100 disabled:opacity-60"
                      >
                        {cancellingId === booking.id ? "Đang hủy..." : "Hủy lịch"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerBookings;

