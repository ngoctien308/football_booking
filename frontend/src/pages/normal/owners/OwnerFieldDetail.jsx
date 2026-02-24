import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { MapPin, Clock, Star, ChevronLeft } from "lucide-react";

const API_BASE = "http://localhost:3000/api";

const OwnerFieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(`${API_BASE}/fields/${id}`);
        setData(res.data);
        if (res.data.images && res.data.images.length > 0) {
          setActiveImage(res.data.images[0].image_url);
        }
      } catch (err) {
        console.error("Error fetching field detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
        {hasHalfStar && (
          <Star className="w-4 h-4 fill-amber-400 text-amber-400 opacity-50" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-amber-400 fill-none" />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-sm text-slate-500">Đang tải...</p>
      </main>
    );
  }

  if (!data || !data.field) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-slate-600 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <p className="text-sm text-red-500">Không tìm thấy sân.</p>
      </main>
    );
  }

  const { field, images = [], reviews = [], time_slots = [] } = data;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-slate-600"
      >
        <ChevronLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Ảnh & thông tin sân */}
        <div className="p-4 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
            <div className="rounded-lg overflow-hidden bg-slate-100 h-56 md:h-64">
              <img
                src={
                  activeImage ||
                  images[0]?.image_url ||
                  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"
                }
                alt={field.field_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80";
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-semibold text-slate-800">
                {field.field_name}
              </h1>
              <div className="flex items-start gap-2 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>{field.address}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {renderStars(field.average_rating || 0)}
                <span className="text-sm text-slate-700">
                  {field.average_rating > 0
                    ? field.average_rating.toFixed(1)
                    : "Chưa có đánh giá"}
                </span>
                {field.review_count > 0 && (
                  <span className="text-xs text-slate-400">
                    ({field.review_count} đánh giá)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Còn {field.remaining_slots || 0} slot trống trong ngày hôm nay</span>
              </div>
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(img.image_url)}
                  className={`h-16 w-24 rounded-md overflow-hidden border ${
                    activeImage === img.image_url
                      ? "border-emerald-500"
                      : "border-slate-200"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt="thumb"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mô tả & Slot */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Mô tả sân
            </h2>
            <p className="text-sm text-slate-600 whitespace-pre-line">
              {field.description || "Chưa có mô tả cho sân này."}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Khung giờ & giá
            </h2>
            {time_slots.length === 0 ? (
              <p className="text-sm text-slate-500">
                Chưa cấu hình khung giờ cho sân này.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {time_slots.map((slot) => (
                  <div
                    key={`${slot.start_time}-${slot.end_time}`}
                    className="flex items-center justify-between text-xs sm:text-sm text-slate-700"
                  >
                    <span>
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}{" "}
                      ({slot.type === "peak" ? "Cao điểm" : "Thường"})
                    </span>
                    <span className="font-medium text-emerald-600">
                      {Number(slot.price).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feedback */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Đánh giá ({field.review_count || 0})
            </h2>
          </div>

          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-slate-100 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-800">
                        {review.customer_name || "Khách hàng"}
                      </span>
                      {renderStars(review.rating || 0)}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(review.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-xs sm:text-sm text-slate-600">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default OwnerFieldDetail;

