import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { MapPin, Clock, Star, ChevronLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const OwnerFieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingReviewId, setReplyingReviewId] = useState(null);

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

  const handleDeleteImage = async () => {
    if (!user?.id || !imageToDelete) return;
    try {
      setDeletingImage(true);
      await axios.delete(`${API_BASE}/fields/images/${imageToDelete.id}`, {
        data: { clerk_user_id: user.id },
      });

      const nextImages = (data?.images || []).filter((img) => img.id !== imageToDelete.id);
      setData((prev) => ({
        ...prev,
        images: nextImages,
      }));

      if (activeImage === imageToDelete.image_url) {
        setActiveImage(nextImages[0]?.image_url || null);
      }

      setImageToDelete(null);
      toast.success("Đã xóa ảnh sân.");
    } catch (err) {
      console.error("Error deleting image:", err);
      toast.error(err.response?.data?.message || "Không thể xóa ảnh.");
    } finally {
      setDeletingImage(false);
    }
  };

  const handleReplyReview = async (reviewId) => {
    if (!user?.id) return;
    try {
      setReplyingReviewId(reviewId);
      const owner_reply = (replyDrafts[reviewId] ?? "").trim();
      const res = await axios.put(`${API_BASE}/reviews/${reviewId}/reply`, {
        clerk_user_id: user.id,
        owner_reply,
      });

      setData((prev) => ({
        ...prev,
        reviews: res.data?.reviews || prev?.reviews || [],
        field: prev?.field
          ? {
              ...prev.field,
              average_rating: res.data?.average_rating ?? prev.field.average_rating,
              review_count: res.data?.review_count ?? prev.field.review_count,
            }
          : prev?.field,
      }));

      toast.success("ÄÃ£ gá»­i pháº£n há»“i.");
    } catch (err) {
      console.error("Error replying review:", err);
      toast.error(err.response?.data?.message || "KhÃ´ng thá»ƒ pháº£n há»“i Ä‘Ã¡nh giÃ¡.");
    } finally {
      setReplyingReviewId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-sm text-slate-500">Đang tải...</p>
        </main>
      </div>
    );
  }

  if (!data || !data.field) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-white">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-slate-600 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>
          <p className="text-sm text-red-500">Không tìm thấy sân.</p>
        </main>
      </div>
    );
  }

  const { field, images = [], reviews = [], time_slots = [] } = data;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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

            {images.length > 0 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {images.map((img) => (
                  <div key={img.id} className="relative">
                    <button
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
                    <button
                      type="button"
                      onClick={() => setImageToDelete(img)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-700"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

                    {review.owner_reply && (
                      <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                        <p className="text-xs font-medium text-emerald-800">Chủ sân phản hồi</p>
                        <p className="text-xs sm:text-sm text-emerald-900 mt-0.5">
                          {review.owner_reply}
                        </p>
                        {review.owner_reply_at && (
                          <p className="text-[11px] text-emerald-700/80 mt-1">
                            {new Date(review.owner_reply_at).toLocaleString("vi-VN")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-2">
                      <textarea
                        rows={2}
                        value={replyDrafts[review.id] ?? review.owner_reply ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [review.id]: e.target.value,
                          }))
                        }
                        placeholder="Phản hồi"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={replyingReviewId === review.id}
                          onClick={() => handleReplyReview(review.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {replyingReviewId === review.id ? "Đang gửi..." : "Trả lời"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal xác nhận xóa ảnh */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-sm w-full p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Xóa ảnh sân?</h2>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa ảnh này? Sân phải còn ít nhất 1 ảnh.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs sm:text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletingImage}
                onClick={handleDeleteImage}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs sm:text-sm font-medium hover:bg-rose-700 disabled:opacity-60"
              >
                {deletingImage ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerFieldDetail;
