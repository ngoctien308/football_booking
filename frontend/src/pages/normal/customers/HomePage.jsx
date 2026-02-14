import { MapPin, Clock, CheckCircle2, XCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const HomePage = () => {
  const [fields, setFields] = useState([]);
  const navigate = useNavigate();

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

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
        {hasHalfStar && (
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 opacity-50" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-amber-400 fill-none" />
        ))}
      </div>
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Danh sách sân</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tìm và đặt sân phù hợp</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {fields.map((field) => (
          <div
            key={field.id}
            onClick={() => navigate(`/customers/fields/${field.id}`)}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-300 transition cursor-pointer flex flex-col"
          >
            <div className="h-36 bg-slate-200 relative">
              {field.primary_image ? (
                <img
                  src={field.primary_image}
                  alt={field?.field_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80";
                  }}
                />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80"
                  alt={field?.field_name}
                  className="w-full h-full object-cover"
                />
              )}
              <span
                className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                  field.status === "active" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"
                }`}
              >
                {field.status === "active" ? "Mở cửa" : "Tạm đóng"}
              </span>
            </div>
            <div className="p-3 flex flex-col flex-1 justify-between">
              <h2 className="font-medium text-slate-800">{field.field_name}</h2>
              <div className="flex items-start gap-2 text-slate-500 text-sm mt-1">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="line-clamp-2">
                  {field.street_address}, {field.ward}, {field.district}, {field.province}
                </span>
              </div>
              
              {/* Review trung bình */}
              <div className="flex items-center gap-2 mt-2">
                {renderStars(field.average_rating || 0)}
                <span className="text-sm text-slate-600">
                  {field.average_rating > 0 ? field.average_rating.toFixed(1) : "Chưa có đánh giá"}
                </span>
                {field.review_count > 0 && (
                  <span className="text-xs text-slate-400">({field.review_count})</span>
                )}
              </div>

              {/* Số slot còn lại */}
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>
                  Còn {field.remaining_slots || 0} slot
                </span>
              </div>
              
              <button
                disabled={field.status !== "active" || (field.remaining_slots || 0) === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (field.status === "active" && (field.remaining_slots || 0) > 0) {
                    navigate(`/customers/fields/${field.id}`);
                  }
                }}
                className={`mt-3 w-full py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 ${
                  field.status === "active" && (field.remaining_slots || 0) > 0
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {field.status === "active" && (field.remaining_slots || 0) > 0 ? (
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
