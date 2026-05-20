import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Clock, Star, ChevronLeft, Edit2, Trash2 } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const FieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  // Booking UI
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [selectedStartTimes, setSelectedStartTimes] = useState(() => new Set());
  const [contactPhone, setContactPhone] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Chat UI
  const [showChat, setShowChat] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatText, setChatText] = useState("");

  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editingRating, setEditingRating] = useState(0);
  const [editingComment, setEditingComment] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = bookingDate === todayStr;
  const bookingDateLabel = isToday
    ? "hôm nay"
    : `ngày ${new Date(`${bookingDate}T00:00:00`).toLocaleDateString("vi-VN")}`;

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

  const fetchAvailability = async (dateStr) => {
    if (!id || !dateStr) return;
    setAvailabilityLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bookings/availability/${id}`, {
        params: { booking_date: dateStr },
      });
      setAvailability(res.data?.slots || []);
      setSelectedStartTimes(new Set());
    } catch (err) {
      console.error("Error fetching availability:", err);
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const openBooking = async () => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    setShowBooking(true);
    await fetchAvailability(bookingDate);
  };

  const openChat = async () => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }

    setShowChat(true);
    setLoadingChat(true);
    try {
      const convRes = await axios.post(`${API_BASE}/messages/conversations/by-field`, {
        clerk_user_id: user.id,
        field_id: Number(id),
      });
      const conv = convRes.data?.conversation || null;
      setConversation(conv);

      if (!conv?.id) {
        setMessages([]);
        return;
      }

      const msgRes = await axios.get(`${API_BASE}/messages/${conv.id}`, {
        params: { clerk_user_id: user.id },
      });
      setMessages(msgRes.data?.messages || []);
    } catch (err) {
      console.error("Error opening chat:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi mở cuộc trò chuyện.");
      setShowChat(false);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendChatMessage = async () => {
    if (!conversation?.id) return;
    const cleaned = String(chatText || "").trim();
    if (!cleaned) return;

    try {
      setSendingMessage(true);
      const res = await axios.post(`${API_BASE}/messages/${conversation.id}`, {
        clerk_user_id: user.id,
        content: cleaned,
      });
      const inserted = res.data?.message;
      if (inserted) {
        setMessages((prev) => [...prev, inserted]);
      }
      setChatText("");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err.response?.data?.message || "Không gửi được tin nhắn.");
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleSlot = (slot) => {
    if (!slot?.status.is_available) return;
    const start = slot.start_time;
    setSelectedStartTimes((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  };

  const handleCreateBooking = async () => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    if (!contactPhone || String(contactPhone).trim().length < 8) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }

    const chosen = availability.filter((s) => selectedStartTimes.has(s.start_time) && s.status.is_available);
    if (chosen.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 khung giờ còn trống.");
      return;
    }

    try {
      setCreatingBooking(true);
      await axios.post(`${API_BASE}/bookings`, {
        clerk_user_id: user.id,
        field_id: Number(id),
        booking_date: bookingDate,
        slots: chosen.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          price: Number(s.price) || 0,
        })),
        contact_phone: String(contactPhone).trim(),
        note: bookingNote || "",
      });
      toast.success("Đặt sân thành công! Yêu cầu đang chờ chủ sân xác nhận.");
      await fetchAvailability(bookingDate);
      setBookingNote("");
      setSelectedStartTimes(new Set());
    } catch (err) {
      console.error("Error creating booking:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi đặt sân.");
      await fetchAvailability(bookingDate);
    } finally {
      setCreatingBooking(false);
    }
  };

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
      toast.error("Vui lòng chọn số sao từ 1 đến 5");
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await axios.post(`${API_BASE}/reviews`, {
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
      toast.success("Đã gửi đánh giá.");
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi gửi đánh giá.");
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
      toast.error("Vui lòng chọn số sao từ 1 đến 5");
      return;
    }
    try {
      setSubmittingEdit(true);
      const res = await axios.put(`${API_BASE}/reviews/${reviewId}`, {
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
      toast.success("Đã cập nhật đánh giá.");
    } catch (err) {
      console.error("Error updating review:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi sửa đánh giá.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!isSignedIn || !user?.id) {
      navigate("/auth");
      return;
    }
    try {
      const res = await axios.delete(`${API_BASE}/reviews/${reviewId}`, {
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
      setReviewToDelete(null);
      toast.success("Đã xóa đánh giá.");
    } catch (err) {
      console.error("Error deleting review:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi xóa đánh giá.");
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
                  {field.address}
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
                <span>Còn {field.remaining_slots || 0} slot trống trong {bookingDateLabel}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={openBooking}
                >
                  Đặt sân
                </button>
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={openChat}
                >
                  Nhắn tin
                </button>
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
                              onClick={() => setReviewToDelete(review.id)}
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

                    {!isEditing &&
                      (Array.isArray(review.owner_replies) && review.owner_replies.length > 0
                        ? review.owner_replies
                        : review.owner_reply
                          ? [{ id: "legacy", reply: review.owner_reply, created_at: review.owner_reply_at }]
                          : []
                      ).map((r) => (
                        <div
                          key={r.id}
                          className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2"
                        >
                          <p className="text-xs font-medium text-emerald-800">Chủ sân phản hồi</p>
                          <p className="text-xs sm:text-sm text-emerald-900 mt-0.5">
                            {r.reply}
                          </p>
                          {r.created_at && (
                            <p className="text-[11px] text-emerald-700/80 mt-1">
                              {new Date(r.created_at).toLocaleString("vi-VN")}
                            </p>
                          )}
                        </div>
                      ))}

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

        {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Đặt sân</h2>
              <button
                type="button"
                onClick={() => setShowBooking(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Đóng
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1">Ngày</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={async (e) => {
                      const next = e.target.value;
                      setBookingDate(next);
                      await fetchAvailability(next);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="VD: 09xxxxxxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-1">Chọn khung giờ (1.5 giờ/slot)</label>
                {availabilityLoading ? (
                  <p className="text-sm text-slate-500">Đang tải lịch trống...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {availability.map((slot) => {
                      const selected = selectedStartTimes.has(slot.start_time);
                      const disabled = !slot.status.is_available;
                      return (
                        <button
                          key={`${slot.start_time}-${slot.end_time}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSlot(slot)}
                          className={`text-left px-3 py-2 rounded-lg border text-sm transition ${
                            disabled
                              ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                              : selected
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </span>
                            <span className="text-emerald-700 font-semibold">
                              {Number(slot.price || 0).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                          <div className="text-xs mt-0.5">
                            {slot.type === "peak" ? "Cao điểm (17h-19h)" : "Giờ thường"} {slot.status.message && `- ${slot.status.message}`}                          
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  placeholder="VD: đội mình đến trễ 10 phút..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-sm text-slate-600">
                  Đã chọn:{" "}
                  <span className="font-semibold text-slate-800">
                    {Array.from(selectedStartTimes).length}
                  </span>{" "}
                  slot
                </div>
                <button
                  type="button"
                  disabled={creatingBooking}
                  onClick={handleCreateBooking}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {creatingBooking ? "Đang đặt..." : "Xác nhận đặt sân"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Yêu cầu đặt sân sẽ ở trạng thái <span className="font-medium">Đang chờ</span> cho tới khi chủ sân xác nhận.
              </p>
            </div>
          </div>
        </div>
      )}

        {/* Chat modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Nhắn tin với chủ sân</h2>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Đóng
              </button>
            </div>

            <div className="p-5">
              {loadingChat ? (
                <p className="text-sm text-slate-500">Đang tải cuộc trò chuyện...</p>
              ) : (
                <>
                  <div className="h-72 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                    {messages.length === 0 ? (
                      <p className="text-sm text-slate-500">Chưa có tin nhắn. Hãy nhắn cho chủ sân.</p>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.sender_role === "customer";
                        return (
                          <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                isMine ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-700"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{m.content}</p>
                              <p className={`mt-1 text-[11px] ${isMine ? "text-emerald-50/90" : "text-slate-400"}`}>
                                {new Date(m.created_at).toLocaleString("vi-VN")}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendChatMessage();
                      }}
                    />
                    <button
                      type="button"
                      disabled={sendingMessage}
                      onClick={sendChatMessage}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {sendingMessage ? "Đang gửi..." : "Gửi"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Modal xác nhận xóa đánh giá */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-sm w-full p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Xóa đánh giá?</h2>
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs sm:text-sm hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReview(reviewToDelete)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs sm:text-sm font-medium hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default FieldDetail;
