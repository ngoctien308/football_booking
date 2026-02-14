import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Clock, Star, ChevronLeft, Edit2, Trash2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const FieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editingRating, setEditingRating] = useState(0);
  const [editingComment, setEditingComment] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/api/fields/${id}`);
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    if (myRating < 1 || myRating > 5) {
      alert("Vui lòng chọn số sao từ 1 đến 5");
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await axios.post("http://localhost:3000/api/reviews", {
        clerk_user_id: user.id,
        field_id: id,
        rating: myRating,
        comment: myComment,
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              field: {
                ...prev.field,
                average_rating: res.data.average_rating,
                review_count: res.data.review_count,
              },
              reviews: res.data.reviews || prev.reviews,
            }
          : prev
      );
      setMyComment("");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert(err.response?.data?.message || "Có lỗi khi gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartEdit = (review) => {
    setEditingReviewId(review.id);
    setEditingRating(review.rating || 0);
    setEditingComment(review.comment || "");
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditingRating(0);
    setEditingComment("");
  };

  const handleUpdateReview = async (reviewId) => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    if (editingRating < 1 || editingRating > 5) {
      alert("Vui lòng chọn số sao từ 1 đến 5");
      return;
    }
    try {
      setSubmittingEdit(true);
      const res = await axios.put(`http://localhost:3000/api/reviews/${reviewId}`, {
        clerk_user_id: user.id,
        rating: editingRating,
        comment: editingComment,
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              field: {
                ...prev.field,
                average_rating: res.data.average_rating,
                review_count: res.data.review_count,
              },
              reviews: res.data.reviews || prev.reviews,
            }
          : prev
      );
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating review:", err);
      alert(err.response?.data?.message || "Có lỗi khi sửa đánh giá.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId, fieldId) => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    const confirm = window.confirm("Bạn chắc chắn muốn xóa đánh giá này?");
    if (!confirm) return;

    try {
      const res = await axios.delete(`http://localhost:3000/api/reviews/${reviewId}`, {
        data: { clerk_user_id: user.id },
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              field: {
                ...prev.field,
                average_rating: res.data.average_rating,
                review_count: res.data.review_count,
              },
              reviews: res.data.reviews || prev.reviews,
            }
          : prev
      );
      if (editingReviewId === reviewId) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error("Error deleting review:", err);
      alert(err.response?.data?.message || "Có lỗi khi xóa đánh giá.");
    }
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
        {/* Ảnh sân */}
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
                <span>
                  {field.street_address}, {field.ward}, {field.district},{" "}
                  {field.province}
                </span>
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
                <span>Còn {field.remaining_slots || 0} slot trống</span>
              </div>
              <button
                className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Đặt sân
              </button>
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
                    key={slot.time_slot_id}
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

        {/* Đánh giá */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Đánh giá ({field.review_count || 0})
            </h2>
          </div>

          {/* Form đánh giá */}
          {isSignedIn ? (
            <form
              onSubmit={handleSubmitReview}
              className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/60"
            >
              <p className="text-xs font-medium text-slate-700">
                Đánh giá của bạn
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setMyRating(star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        (hoverRating || myRating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
                {myRating > 0 && (
                  <span className="ml-2 text-xs text-slate-600">
                    {myRating}/5
                  </span>
                )}
              </div>
              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                rows={3}
                placeholder="Chia sẻ trải nghiệm của bạn về sân này..."
                className="mt-1 w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-lg p-3 text-xs sm:text-sm text-slate-600 flex items-center justify-between gap-2">
              <span>Đăng nhập để đánh giá sân này.</span>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
              >
                Đăng nhập
              </button>
            </div>
          )}

          {/* Danh sách đánh giá */}
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {reviews.map((review) => {
                const isOwner =
                  isSignedIn && user?.id && review.clerk_user_id === user.id;
                const isEditing = editingReviewId === review.id;

                return (
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {new Date(review.created_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                        {isOwner && !isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(review)}
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700"
                            >
                              <Edit2 className="w-3 h-3" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteReview(review.id, review.field_id)
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {!isEditing && review.comment && (
                      <p className="text-xs sm:text-sm text-slate-600">
                        {review.comment}
                      </p>
                    )}

                    {isEditing && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEditingRating(star)}
                              className="p-0.5"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  editingRating >= star
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            </button>
                          ))}
                          <span className="ml-1 text-[11px] text-slate-600">
                            {editingRating}/5
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={editingComment}
                          onChange={(e) => setEditingComment(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={submittingEdit}
                            onClick={() => handleUpdateReview(review.id)}
                            className="px-3 py-1 rounded-lg text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {submittingEdit ? "Đang lưu..." : "Lưu"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default FieldDetail;

