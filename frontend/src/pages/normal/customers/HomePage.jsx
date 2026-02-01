import { MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

const HomePage = () => {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/fields");
        setFields(res.data?.fields || []);
      } catch (err) {
        console.error("Error fetching fields:", err);
      }
    };
    fetchFields();
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Danh sách sân</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tìm và đặt sân phù hợp</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div
            key={field.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 transition"
          >
            <div className="h-36 bg-slate-200 relative">
              <img
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80"
                alt={field?.field_name}
                className="w-full h-full object-cover"
              />
              <span
                className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                  field.status === "active" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"
                }`}
              >
                {field.status === "active" ? "Mở cửa" : "Tạm đóng"}
              </span>
            </div>
            <div className="p-4">
              <h2 className="font-medium text-slate-800">{field.field_name}</h2>
              <div className="flex items-start gap-2 text-slate-500 text-sm mt-1">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="line-clamp-2">
                  {field.street_address}, {field.ward}, {field.district}, {field.province}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Còn slot</span>
              </div>
              <button
                disabled={field.status !== "active"}
                className={`mt-3 w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                  field.status === "active"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {field.status === "active" ? (
                  <>Đặt sân <CheckCircle2 className="w-4 h-4" /></>
                ) : (
                  <>Hết chỗ <XCircle className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default HomePage;
