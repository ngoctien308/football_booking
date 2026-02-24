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
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-800">Danh sách sân</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tìm và đặt sân phù hợp</p>
      </div>

      <div className="space-y-3">
        {fields.map((field) => {
          const canBook = field.status === "active" && (field.remaining_slots || 0) > 0;
          return (
            <div
              key={field.id}
              onClick={() => navigate(`/customers/fields/${field.id}`)}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition cursor-pointer overflow-hidden"
            >
              <div className="p-3 flex gap-3">
                <div className="w-24 h-20 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={field.primary_image || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80"}
                    alt={field?.field_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=80";
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-medium text-slate-800 truncate">{field.field_name}</h2>
                      <div className="flex items-start gap-2 text-slate-500 text-sm mt-1">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{field.address}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                        field.status === "active" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"
                      }`}
                    >
                      {field.status === "active" ? "Mở cửa" : "Tạm đóng"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      {renderStars(field.average_rating || 0)}
                      <span className="text-sm text-slate-600">
                        {field.average_rating > 0 ? field.average_rating.toFixed(1) : "Chưa có đánh giá"}
                      </span>
                      {field.review_count > 0 && (
                        <span className="text-xs text-slate-400">({field.review_count})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Còn {field.remaining_slots || 0} slot hôm nay</span>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      disabled={!canBook}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canBook) navigate(`/customers/fields/${field.id}`);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 ${
                        canBook
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {canBook ? (
                        <>
                          Đặt sân <CheckCircle2 className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Hết chỗ <XCircle className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default HomePage;
