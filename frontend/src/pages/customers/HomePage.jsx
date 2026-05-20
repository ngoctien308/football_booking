import { MapPin, Clock, Star, Users, ArrowRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const HomePage = () => {
  const [fields, setFields] = useState([]);
  const [fieldNameText, setFieldNameText] = useState("");
  const [addressText, setAddressText] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = bookingDate === todayStr;
  const bookingDateLabel = isToday
    ? "hôm nay"
    : `ngày ${new Date(`${bookingDate}T00:00:00`).toLocaleDateString("vi-VN")}`;

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/fields", {
          params: {
            ...(fieldNameText.trim() ? { field_name: fieldNameText.trim() } : {}),
            ...(addressText.trim() ? { address: addressText.trim() } : {}),
            ...(desiredTime ? { start_time: desiredTime } : {}),
            ...(bookingDate ? { booking_date: bookingDate } : {}),
          },
        });
        setFields(res.data?.fields || []);
      } catch (err) {
        console.error("Error fetching fields:", err);
        setFields([]);
      }
    };
    fetchFields();
  }, [fieldNameText, addressText, desiredTime, bookingDate]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-8 md:mb-10">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] text-emerald-500 uppercase mb-3">
            Football Booking
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            BEST PITCHES{" "}
            <span className="block md:inline text-emerald-500">
              ONLY
            </span>
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-500 max-w-xl mx-auto">
            Chọn sân đẹp nhất gần bạn, slot 1.5 giờ từ 06:00-23:00, đặt nhanh chỉ với vài bước.
          </p>
        </div>

        {/* Content card */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-sm p-4 md:p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left highlight / map card */}
            <div className="lg:w-[32%]">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 text-left relative overflow-hidden h-full">
                <p className="text-xs font-semibold text-emerald-500 tracking-[0.18em] uppercase mb-2">
                  Location
                </p>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3 leading-snug">
                  Sân bóng quanh bạn
                </h2>
                <div className="flex items-start gap-2 text-slate-600 text-xs md:text-sm mb-4">
                  <MapPin className="w-4 h-4 mt-0.5 text-emerald-500" />
                  <p>
                    Chọn sân theo khu vực, xem đánh giá và số slot còn lại trong ngày.
                  </p>
                </div>
                <div className="mt-auto space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Slot cố định 1.5 giờ, từ 06:00 đến 23:00.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Phù hợp đặt cho đội, lớp, hội nhóm đá bóng.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right list + filters */}
            <div className="lg:flex-1 space-y-5">
              {/* Filter bar */}
              <div className="bg-white rounded-full shadow-sm border border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 text-xs md:text-sm">
                <div className="flex-1 flex flex-wrap items-center gap-3 md:gap-4 min-w-0">
                  <div className="flex-1 min-w-[180px] flex items-center gap-2 border-slate-200 md:border-r md:pr-4">
                    <Search className="w-4 h-4 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={fieldNameText}
                      onChange={(e) => setFieldNameText(e.target.value)}
                      placeholder="Tên sân..."
                      className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs md:text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] hidden md:flex items-center gap-2 border-slate-200 md:border-r md:pr-4">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={addressText}
                      onChange={(e) => setAddressText(e.target.value)}
                      placeholder="Địa chỉ..."
                      className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs md:text-sm"
                    />
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-slate-500 text-xs md:basis-full lg:basis-auto">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <div className="flex items-center gap-2">
                      <span>Giờ:</span>
                      <input
                        type="time"
                        value={desiredTime}
                        onChange={(e) => setDesiredTime(e.target.value)}
                        className="bg-transparent outline-none text-slate-700"
                        step={60}
                      />
                      <span className="ml-2">Ngày:</span>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="bg-transparent outline-none text-slate-700"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFieldNameText("");
                    setAddressText("");
                    setDesiredTime("");
                    setBookingDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="self-end md:self-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs md:text-sm font-semibold hover:bg-slate-800 transition"
                >
                  Reset
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="md:hidden grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-2 text-xs col-span-2">
                  <Search className="w-4 h-4 text-emerald-500 shrink-0" />
                  <input
                    type="text"
                    value={fieldNameText}
                    onChange={(e) => setFieldNameText(e.target.value)}
                    placeholder="Tên sân..."
                    className="bg-transparent outline-none text-slate-700 w-full"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-2 text-xs col-span-2">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="Địa chỉ..."
                    className="bg-transparent outline-none text-slate-700 w-full"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-2 text-xs">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <input
                    type="time"
                    value={desiredTime}
                    onChange={(e) => setDesiredTime(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 w-full"
                    step={60}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-2 text-xs">
                  <span className="text-slate-500 shrink-0">Ngày</span>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="bg-transparent outline-none text-slate-700 w-full"
                  />
                </div>
              </div>

              {/* Field cards */}
              {fields.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">
                  Hiện chưa có sân phù hợp với từ khóa của bạn.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                  {fields.map((field) => {
                    const canBook = field.status === "active" && (field.remaining_slots || 0) > 0;
                    const rating = field.average_rating || 0;

                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => navigate(`/customers/fields/${field.id}`)}
                        className="group text-left bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-emerald-400/80 hover:shadow-[0_18px_45px_rgba(16,185,129,0.25)] transition transform hover:-translate-y-0.5 focus:outline-none"
                      >
                        <div className="relative h-36 md:h-40 overflow-hidden">
                          <img
                            src={
                              field.primary_image ||
                              "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80&auto=format&fit=crop"
                            }
                            alt={field?.field_name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            onError={(e) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80&auto=format&fit=crop";
                            }}
                          />
                          {rating > 0 && (
                            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur text-xs font-semibold text-amber-300">
                              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                              <span>{rating.toFixed(1)}</span>
                            </div>
                          )}
                          {field.review_count > 0 && (
                            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-white/80 text-[11px] text-slate-700">
                              {field.review_count} đánh giá
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 md:p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-xs md:text-sm font-semibold text-slate-900 tracking-tight uppercase line-clamp-1">
                                {field.field_name}
                              </h3>
                              <div className="mt-1 flex items-start gap-1.5 text-[11px] md:text-xs text-slate-500">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                                <span className="line-clamp-2">{field.address}</span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold shrink-0 ${
                                field.status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {field.status === "active" ? "Đang mở" : "Tạm dừng"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>
                                Còn{" "}
                                <span className="font-semibold">
                                  {field.remaining_slots || 0}
                                </span>{" "}
                                slot {bookingDateLabel}
                              </span>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1 font-semibold ${
                                canBook ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              <span>{canBook ? "Đặt ngay" : "Hết slot"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;




