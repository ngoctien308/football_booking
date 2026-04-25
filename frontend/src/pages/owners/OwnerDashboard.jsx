import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Plus, Loader2, Building2, ImagePlus, Clock, Trash2, Check, X, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:3000/api";

const OwnerDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [form, setForm] = useState({
    field_name: "",
    address: "",
    description: "",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [bookingSearchName, setBookingSearchName] = useState("");
  const [bookingSearchPhone, setBookingSearchPhone] = useState("");
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [showAllBookings, setShowAllBookings] = useState(false);

  const fetchFields = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/fields/owner/${user.id}`);
      setFields(res.data.fields || []);
    } catch (err) {
      console.error(err);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerBookings = async (filters = {}) => {
    if (!user?.id) return;
    setLoadingBookings(true);
    try {
      const res = await axios.get(`${API_BASE}/bookings/owner/${user.id}`, { params: filters });
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error(err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchFields();
    fetchOwnerBookings();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setShowAllBookings(false);
    const timeout = setTimeout(() => {
      const name = bookingSearchName.trim();
      const phone = bookingSearchPhone.trim();
      const payment_status = bookingPaymentStatus.trim();
      const status = bookingStatus.trim();
      fetchOwnerBookings({
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(payment_status ? { payment_status } : {}),
        ...(status ? { status } : {}),
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [user?.id, bookingSearchName, bookingSearchPhone, bookingPaymentStatus, bookingStatus]);

  const visibleBookings = showAllBookings ? bookings : bookings.slice(0, 5);

  const handleUpdateBookingStatus = async (bookingId, status) => {
    if (!user?.id) return;
    try {
      setUpdatingBookingId(bookingId);
      await axios.patch(`${API_BASE}/bookings/${bookingId}/status`, {
        clerk_user_id: user.id,
        status,
      });
      const name = bookingSearchName.trim();
      const phone = bookingSearchPhone.trim();
      const payment_status = bookingPaymentStatus.trim();
      const statusFilter = bookingStatus.trim();
      await fetchOwnerBookings({
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(payment_status ? { payment_status } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      toast.success(status === "approved" ? "Đã xác nhận đặt sân." : "Đã từ chối đặt sân.");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Có lỗi khi cập nhật trạng thái đặt sân.");
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onImageChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setImageFiles((prev) => [...prev, ...files].slice(0, 10));
  };
  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("clerk_user_id", user.id);
      data.append("field_name", form.field_name);
      data.append("address", form.address);
      data.append("description", form.description || "");
      if (editingField?.status) {
        data.append("status", editingField.status);
      }
      imageFiles.forEach((file) => data.append("images", file));

      if (editingField) {
        await axios.put(`${API_BASE}/fields/${editingField.id}`, data);
        toast.success("Đã cập nhật sân.");
      } else {
        await axios.post(`${API_BASE}/fields`, data);
        toast.success("Đã tạo sân mới.");
      }
      setForm({
        field_name: "",
        address: "",
        description: "",
      });
      setImageFiles([]);
      setShowForm(false);
      setEditingField(null);
      await fetchFields();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Có lỗi khi lưu sân.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";
  const labelClass = "block text-slate-700 text-sm font-medium mb-1";
  const getStatusBadgeClass = (status) => {
    if (status === "approved") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    if (status === "cancelled") return "bg-slate-100 text-slate-600";
    return "bg-amber-100 text-amber-700";
  };
  const getStatusText = (status) => {
    if (status === "approved") return "Đã xác nhận";
    if (status === "rejected") return "Từ chối";
    if (status === "cancelled") return "Đã hủy";
    return "Đang chờ";
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white mb-20">
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-slate-900">Sân của tôi</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Thêm sân
        </button>
        </div>

        {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : fields.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm mb-4">Chưa có sân. Thêm sân đầu tiên.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Thêm sân
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {fields.map((f) => {
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                onClick={() => navigate(`/owners/fields/${f.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium text-slate-800">{f.field_name}</h2>
                      <p className="text-slate-500 text-sm mt-0.5">
                        {f.address}
                      </p>
                      {f.description && (
                        <p className="text-slate-600 text-sm mt-1 line-clamp-2">{f.description}</p>
                      )}
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${f.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                          }`}
                      >
                        {f.status === "active" ? "Hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    {f.image_url && f.image_url.length > 0 ? (
                      <img
                        src={'http://localhost:3000' + f.image_url}
                        alt={f.field_name}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                        <ImagePlus className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingField(f);
                        setForm({
                          field_name: f.field_name || "",
                          address: f.address || "",
                          description: f.description || "",
                        });
                        setImageFiles([]);
                        setShowForm(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFieldToDelete(f);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        )}

        <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Yêu cầu đặt sân</h2>
          {loadingBookings && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={bookingSearchName}
                onChange={(e) => setBookingSearchName(e.target.value)}
                placeholder="Tìm theo tên khách..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <input
              value={bookingSearchPhone}
              onChange={(e) => setBookingSearchPhone(e.target.value)}
              placeholder="Tìm theo SĐT..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">Trạng thái xác nhận</option>
              <option value="approved">Đã xác nhận</option>
              <option value="rejected">Đã từ chối</option>
              <option value="pending">Chưa xác nhận</option>
            </select>
            <select
              value={bookingPaymentStatus}
              onChange={(e) => setBookingPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
            >
              <option value="">Trạng thái thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setBookingSearchName("");
                setBookingSearchPhone("");
                setBookingStatus("");
                setBookingPaymentStatus("");
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {!loadingBookings && bookings.length > 5 && (
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => setShowAllBookings((v) => !v)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {showAllBookings ? "Thu gọn" : "Xem đầy đủ"}
            </button>
          </div>
        )}
        {loadingBookings ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            Đang tải danh sách đặt sân...
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            Chưa có yêu cầu đặt sân nào.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map((booking) => (
              <div key={booking.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    {booking.field?.field_name || "San"} - {booking.booking_date}
                  </p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                  <p>
                    Khách: {booking.customer?.name || booking.contact_name || "Khách hàng"} ({booking.customer?.email || "Không có email"})
                  </p>
                  <p>
                    Khung giờ: {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
                  </p>
                  <p>Số điện thoại: {booking.contact_phone}</p>
                  <p>Giá: {Number(booking.total_price || 0).toLocaleString("vi-VN")}d</p>
                </div>

                {booking.note && <p className="mt-2 text-sm text-slate-500">Ghi chú: {booking.note}</p>}
                {booking.payment_status && <p className="mt-2 text-sm text-slate-600">Thanh toán: <span className="font-semibold">{booking.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</span></p>}

                {booking.status === "pending" && (
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      type="button"
                      disabled={updatingBookingId === booking.id}
                      onClick={() => handleUpdateBookingStatus(booking.id, "rejected")}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={updatingBookingId === booking.id}
                      onClick={() => handleUpdateBookingStatus(booking.id, "approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Xác nhận
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>

      {/* Modal xác nhận xóa sân */}
        {fieldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-sm w-full p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Xóa sân?</h2>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa sân <span className="font-semibold">{fieldToDelete.field_name}</span>? Tất cả
              booking, tin nhắn và đánh giá liên quan sẽ bị xóa theo.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFieldToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs sm:text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!user?.id || !fieldToDelete) return;
                  try {
                    await axios.delete(`${API_BASE}/fields/${fieldToDelete.id}`, {
                      data: { clerk_user_id: user.id },
                    });
                    toast.success("Đã xóa sân.");
                    setFieldToDelete(null);
                    await fetchFields();
                  } catch (err) {
                    console.error(err);
                    toast.error(err.response?.data?.message || "Có lỗi khi xóa sân.");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-medium hover:bg-rose-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
        )}

        {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-800">
                {editingField ? "Sửa sân" : "Thêm sân"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Tên sân *</label>
                <input
                  type="text"
                  name="field_name"
                  value={form.field_name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="VD: Sân Tuấn Phong"
                />
              </div>
              <div>
                <label className={labelClass}>Địa chỉ *</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="VD: Đường Phạm Tu, số 10, Thanh Trì, Thanh Xuân, Hà Nội"
                />
              </div>
              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  className={inputClass}
                  placeholder="Mô tả ngắn về sân..."
                />
              </div>

              <div>
                <label className={labelClass}>Ảnh sân (tối đa 10, JPEG/PNG/GIF/WebP, &lt; 5MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={onImageChange}
                  className="block w-full text-sm text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium"
                />
                {imageFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {imageFiles.map((file, i) => (
                      <div
                        key={i}
                        className="relative inline-block w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl text-xs"
                          title="Xóa"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800">
                Slot đặt sân được hệ thống tự tạo mặc định từ <b>06:00–23:00</b> (1.5 giờ/slot). Giá cố định:{" "}
                <b>500.000đ</b> (thường) và <b>900.000đ</b> (cao điểm 17h–19h).
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingField ? "Đang lưu..." : "Đang tạo..."}
                    </>
                  ) : (
                    editingField ? "Lưu thay đổi" : "Tạo sân"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
