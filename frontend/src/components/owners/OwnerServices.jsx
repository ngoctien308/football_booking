import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const OwnerServices = ({ fieldId }) => {
  const { user } = useUser();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    service_name: "",
    description: "",
    price: "",
    quantity_available: "1",
    unit: "",
  });

  const fetchServices = async () => {
    if (!fieldId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/services/field/${fieldId}`);
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
  }, [fieldId]);

  const resetForm = () => {
    setForm({
      service_name: "",
      description: "",
      price: "",
      quantity_available: "1",
      unit: "",
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.service_name.trim() || !form.price) {
      toast.error("Vui lòng nhập tên dịch vụ và giá.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        clerk_user_id: user?.id,
        field_id: fieldId,
        service_name: form.service_name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        quantity_available: parseInt(form.quantity_available) || 1,
        unit: form.unit.trim() || null,
      };

      if (editingService) {
        const res = await axios.put(
          `${API_BASE}/services/${editingService.id}`,
          payload
        );
        setServices(
          services.map((s) => (s.id === editingService.id ? res.data.service : s))
        );
        toast.success("Cập nhật dịch vụ thành công.");
      } else {
        const res = await axios.post(`${API_BASE}/services`, payload);
        setServices([...services, res.data.service]);
        toast.success("Tạo dịch vụ thành công.");
      }

      resetForm();
    } catch (err) {
      console.error("Error submitting service:", err);
      toast.error(
        err.response?.data?.message || "Lỗi khi lưu dịch vụ."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (service) => {
    setForm({
      service_name: service.service_name,
      description: service.description || "",
      price: service.price,
      quantity_available: service.quantity_available || 1,
      unit: service.unit || "",
    });
    setEditingService(service);
    setShowForm(true);
  };

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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">Dịch vụ đi kèm</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            <Plus className="w-5 h-5" />
            Thêm dịch vụ
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">
            {editingService ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên dịch vụ *
              </label>
              <input
                type="text"
                value={form.service_name}
                onChange={(e) =>
                  setForm({ ...form, service_name: e.target.value })
                }
                placeholder="VD: Bắt cá cứu cánh, Nước ngọt lạnh..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Mô tả chi tiết về dịch vụ..."
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá (VNĐ) *
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  placeholder="0"
                  step="1000"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn vị
                </label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                  placeholder="VD: cái, bộ, chai..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số lượng có sẵn
              </label>
              <input
                type="number"
                value={form.quantity_available}
                onChange={(e) =>
                  setForm({ ...form, quantity_available: e.target.value })
                }
                placeholder="1"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {submitting ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Chưa có dịch vụ nào. Hãy thêm dịch vụ mới!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">{service.service_name}</h4>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="font-medium">
                    {(service.price || 0).toLocaleString("vi-VN")} VNĐ
                    {service.unit && ` / ${service.unit}`}
                  </span>
                  <span>Có sẵn: {service.quantity_available}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
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
                  onClick={() => handleEdit(service)}
                  className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition"
                  title="Chỉnh sửa"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerServices;
