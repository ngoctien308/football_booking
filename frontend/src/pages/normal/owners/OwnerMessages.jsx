import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:3000/api";

const OwnerMessages = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const loadConversations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/messages/conversations/owner/${user.id}`);
      const rows = res.data?.conversations || [];
      setConversations(rows);
      if (!activeId && rows.length > 0) setActiveId(rows[0].id);
    } catch (err) {
      console.error("Error loading owner conversations:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi tải danh sách cuộc trò chuyện.");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!user?.id || !conversationId) return;
    setLoadingMessages(true);
    try {
      const res = await axios.get(`${API_BASE}/messages/${conversationId}`, {
        params: { clerk_user_id: user.id },
      });
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
      toast.error(err.response?.data?.message || "Có lỗi khi tải tin nhắn.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const send = async () => {
    if (!user?.id || !activeId) return;
    const cleaned = String(text || "").trim();
    if (!cleaned) return;
    try {
      setSending(true);
      const res = await axios.post(`${API_BASE}/messages/${activeId}`, {
        clerk_user_id: user.id,
        content: cleaned,
      });
      const inserted = res.data?.message;
      if (inserted) setMessages((prev) => [...prev, inserted]);
      setText("");
      // refresh list preview (last_message)
      await loadConversations();
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err.response?.data?.message || "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Tin nhắn</h1>
        <p className="text-slate-500 text-sm mt-0.5">Trao đổi với khách đặt sân.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
          Đang tải...
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
          Chưa có cuộc trò chuyện nào.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-medium text-slate-800">
              Cuộc trò chuyện
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                      active ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-800">
                      {c.field?.field_name || "Sân"} · {c.customer?.name || "Khách"}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {c.last_message || "Chưa có tin nhắn"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-medium text-slate-800">
                {activeConversation?.field?.field_name || "Sân"}
              </div>
              {activeConversation?.customer?.email && (
                <div className="text-xs text-slate-500">{activeConversation.customer.email}</div>
              )}
            </div>

            <div className="p-4 bg-slate-50 flex-1 overflow-y-auto space-y-2">
              {loadingMessages ? (
                <p className="text-sm text-slate-500">Đang tải tin nhắn...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có tin nhắn.</p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_role === "owner";
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

            <div className="p-3 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button
                type="button"
                disabled={sending}
                onClick={send}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {sending ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default OwnerMessages;

