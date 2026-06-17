import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Loader2, Tag, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const OwnerServicesList = () => {
  const { user } = useUser();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchServices = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/services/owner/services/list`, {
        params: { clerk_user_id: user.id },
      });
      setServices(res.data.services || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      toast.error("Không thể lấy danh sách dịch vụ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user?.id]);

  const handleDelete = async (serviceId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) return;

    try {
      setDeletingId(serviceId);
      await axios.delete(`${API_BASE}/services/${serviceId}`, {
        data: { clerk_user_id: user?.id },
      });
      setServices(services.filter((s) => s.id !== serviceId));
      toast.success("Xóa dịch vụ thành công.");
    } catch (err) {
      console.error("Error deleting service:", err);
      toast.error(err.response?.data?.message || "Lỗi khi xóa dịch vụ.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Dịch vụ của tôi
        </h2>
        {loading && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
          Đang tải danh sách dịch vụ...
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
          Chưa có dịch vụ nào. Thêm dịch vụ trong chi tiết sân.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800">{service.service_name}</h3>
                  {service.fields && (
                    <p className="text-sm text-slate-500 mt-1">
                      Sân: {service.fields.field_name}
                    </p>
                  )}
                  {service.description && (
                    <p className="text-sm text-slate-600 mt-1">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-medium text-emerald-600">
                      {(service.price || 0).toLocaleString("vi-VN")} VNĐ
                    </span>
                    {service.unit && (
                      <span className="text-slate-500">
                        / {service.unit}
                      </span>
                    )}
                    <span className="text-slate-500">
                      Có sẵn: {service.quantity_available}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        service.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {service.status === "active" ? "Hoạt động" : "Tắt"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deletingId === service.id}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                    title="Xóa"
                  >
                    {deletingId === service.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerServicesList;
