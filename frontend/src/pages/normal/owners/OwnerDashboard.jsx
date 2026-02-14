import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { MapPin, Plus, Loader2, Building2, ImagePlus, Clock, Trash2 } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const defaultSlot = () => ({ start_time: "17:00", end_time: "18:00", type: "normal", price: "" });

const OwnerDashboard = () => {
  const { user } = useUser();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    field_name: "",
    province: "",
    district: "",
    ward: "",
    street_address: "",
    description: "",
    slots: [defaultSlot()],
  });
  const [imageFiles, setImageFiles] = useState([]);

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

  useEffect(() => {
    fetchFields();
  }, [user?.id]);

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

  const addSlot = () => {
    setForm((prev) => ({ ...prev, slots: [...prev.slots, defaultSlot()] }));
  };
  const setSlot = (index, key, value) => {
    setForm((prev) => {
      const next = prev.slots.map((s, i) =>
        i === index ? { ...s, [key]: value } : s
      );
      return { ...prev, slots: next };
    });
  };
  const removeSlot = (index) => {
    setForm((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const slots = form.slots
        .filter((s) => s.start_time && s.end_time && s.price !== "" && Number(s.price) >= 0)
        .map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          type: s.type || "normal",
          price: Number(s.price),
        }));

      const data = new FormData();
      data.append("clerk_user_id", user.id);
      data.append("field_name", form.field_name);
      data.append("province", form.province);
      data.append("district", form.district || "");
      data.append("ward", form.ward);
      data.append("street_address", form.street_address);
      data.append("description", form.description || "");
      data.append("slots", JSON.stringify(slots));
      imageFiles.forEach((file) => data.append("images", file));

      await axios.post(`${API_BASE}/fields`, data);
      setForm({
        field_name: "",
        province: "",
        district: "",
        ward: "",
        street_address: "",
        description: "",
        slots: [defaultSlot()],
      });
      setImageFiles([]);
      setShowForm(false);
      await fetchFields();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Có lỗi khi tạo sân.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";
  const labelClass = "block text-slate-700 text-sm font-medium mb-1";

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Sân của tôi</h1>
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
            console.log(f)
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                <div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium text-slate-800">{f.field_name}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {f.street_address}, {f.ward}, {f.district}, {f.province}
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
              </li>
            )
          })}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-800">Thêm sân</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tỉnh/Thành *</label>
                  <input
                    type="text"
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="Hà Nội"
                  />
                </div>
                <div>
                  <label className={labelClass}>Quận/Huyện</label>
                  <input
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Thanh Xuân"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Phường/Xã *</label>
                <input
                  type="text"
                  name="ward"
                  value={form.ward}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Thanh Trì"
                />
              </div>
              <div>
                <label className={labelClass}>Địa chỉ *</label>
                <input
                  type="text"
                  name="street_address"
                  value={form.street_address}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Đường Phạm Tu, số 10"
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Khung giờ & giá</label>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="text-emerald-600 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" /> Thêm slot
                  </button>
                </div>
                <div className="space-y-3">
                  {form.slots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => setSlot(i, "start_time", e.target.value)}
                          className="w-25 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => setSlot(i, "end_time", e.target.value)}
                          className="w-25 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <select
                        value={slot.type}
                        onChange={(e) => setSlot(i, "type", e.target.value)}
                        className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="normal">Thường</option>
                        <option value="peak">Cao điểm</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={slot.price}
                        onChange={(e) => setSlot(i, "price", e.target.value)}
                        className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                        placeholder="Giá (VNĐ)"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        className="p-1.5 text-slate-400 hover:text-red-500 shrink-0"
                        title="Xóa slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Slot có giá hợp lệ sẽ được lưu. Có thể bỏ trống nếu chưa có giá.
                </p>
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
                      Đang tạo...
                    </>
                  ) : (
                    "Tạo sân"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
