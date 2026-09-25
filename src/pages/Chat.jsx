import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request");

  const [currentUser, setCurrentUser] = useState(null);
  const [request, setRequest] = useState(null);

  const [lostItem, setLostItem] = useState(null);
  const [foundItem, setFoundItem] = useState(null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!requestId) {
      setError("No contact request was provided.");
      setLoading(false);
      return;
    }

    initializeChat();

    return () => {
      supabase.removeAllChannels();
    };
  }, [requestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /*
   * Refresh item status periodically.
   * This allows the other user to see
   * "Item Returned" / "Item Received"
   * without refreshing the page.
   */
  useEffect(() => {
    if (!request) return;

    const interval = setInterval(() => {
      loadItemStatus(request);
    }, 3000);

    return () => clearInterval(interval);
  }, [request]);

  async function initializeChat() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("You must be logged in to use private chat.");
        setLoading(false);
        return;
      }

      const user = session.user;
      setCurrentUser(user);

      const { data: requestData, error: requestError } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError) {
        throw requestError;
      }

      if (!requestData) {
        throw new Error("Contact request not found.");
      }

      const isParticipant =
        requestData.requester_id === user.id ||
        requestData.receiver_id === user.id;

      if (!isParticipant) {
        throw new Error(
          "You are not a participant in this private conversation."
        );
      }

      if (requestData.status !== "accepted") {
        throw new Error(
          "This private chat is available only after the contact request is accepted."
        );
      }

      setRequest(requestData);

      await loadItemStatus(requestData);
      await loadMessages(requestData.id);

      subscribeToMessages(requestData.id);
    } catch (err) {
      console.error("Chat initialization error:", err);
      setError(err.message || "Unable to open chat.");
    } finally {
      setLoading(false);
    }
  }

  async function loadItemStatus(contactRequest) {
    if (!contactRequest) return;

    try {
      const { data: lost, error: lostError } = await supabase
        .from("lost_items")
        .select("*")
        .eq("id", contactRequest.lost_item_id)
        .single();

      if (lostError) {
        console.error("Lost item status error:", lostError);
      } else {
        setLostItem(lost);
      }

      const { data: found, error: foundError } = await supabase
        .from("found_items")
        .select("*")
        .eq("id", contactRequest.found_item_id)
        .single();

      if (foundError) {
        console.error("Found item status error:", foundError);
      } else {
        setFoundItem(found);
      }
    } catch (err) {
      console.error("Unable to load item status:", err);
    }
  }

  async function loadMessages(contactRequestId) {
    const { data, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("contact_request_id", contactRequestId)
      .order("created_at", { ascending: true });

    if (messageError) {
      throw messageError;
    }

    setMessages(data || []);
  }

  function subscribeToMessages(contactRequestId) {
    const channel = supabase
      .channel(`private-chat-${contactRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contact_request_id=eq.${contactRequestId}`,
        },
        async (payload) => {
          console.log("New chat message received:", payload.new);

          await loadMessages(contactRequestId);
        }
      )
      .subscribe((status) => {
        console.log("Chat realtime status:", status);
      });

    return channel;
  }

  async function sendMessage(e) {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!currentUser || !request) {
      setError("Chat is not ready.");
      return;
    }

    if (request.status !== "accepted") {
      setError("This contact request has not been accepted.");
      return;
    }

    const caseClosed =
      lostItem?.status === "returned" &&
      foundItem?.status === "returned";

    if (caseClosed) {
      setError(
        "This case is closed because both users confirmed the item was returned."
      );
      return;
    }

    const receiverId =
      request.requester_id === currentUser.id
        ? request.receiver_id
        : request.requester_id;

    if (!receiverId) {
      setError("Unable to identify the other user.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data, error: sendError } = await supabase
        .from("messages")
        .insert([
          {
            contact_request_id: request.id,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            message: trimmedMessage,
          },
        ])
        .select()
        .single();

      if (sendError) {
        throw sendError;
      }

      setMessages((previous) => {
        const alreadyExists = previous.some(
          (item) => item.id === data.id
        );

        if (alreadyExists) {
          return previous;
        }

        return [...previous, data];
      });

      setMessage("");
    } catch (err) {
      console.error("Send message error:", err);
      setError(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  /*
   * LOST USER:
   * Confirms that they received their item.
   *
   * FOUND USER:
   * Confirms that they returned the item.
   */
  async function confirmItemStatus() {
    if (!currentUser || !request || !lostItem || !foundItem) {
      return;
    }

    setUpdatingStatus(true);
    setError("");
    setSuccess("");

    try {
      const isLostOwner = currentUser.id === lostItem.user_id;
      const isFoundOwner = currentUser.id === foundItem.user_id;

      if (!isLostOwner && !isFoundOwner) {
        throw new Error(
          "You are not the owner of either item in this case."
        );
      }

      /*
       * LOST OWNER
       * "I Received My Item"
       */
      if (isLostOwner && lostItem.status !== "returned") {
        const { data, error: updateError } = await supabase
          .from("lost_items")
          .update({
            status: "returned",
            returned_at: new Date().toISOString(),
          })
          .eq("id", lostItem.id)
          .eq("user_id", currentUser.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setLostItem(data);

        /*
         * Send a system-style message into the chat.
         */
        await sendSystemMessage(
          "The lost-item owner confirmed: I received my item."
        );

        setSuccess(
          "You confirmed that you received your item."
        );
      }

      /*
       * FOUND OWNER
       * "Item Returned"
       */
      if (isFoundOwner && foundItem.status !== "returned") {
        const { data, error: updateError } = await supabase
          .from("found_items")
          .update({
            status: "returned",
            returned_at: new Date().toISOString(),
          })
          .eq("id", foundItem.id)
          .eq("user_id", currentUser.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        setFoundItem(data);

        await sendSystemMessage(
          "The found-item owner confirmed: Item returned."
        );

        setSuccess(
          "You confirmed that the item was returned."
        );
      }

      /*
       * Refresh both records after updating.
       */
      await loadItemStatus(request);
    } catch (err) {
      console.error("Item status update error:", err);
      setError(
        err.message || "Unable to update the item status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function sendSystemMessage(systemText) {
    if (!request || !currentUser) return;

    const receiverId =
      request.requester_id === currentUser.id
        ? request.receiver_id
        : request.requester_id;

    if (!receiverId) return;

    const { data, error: systemMessageError } = await supabase
      .from("messages")
      .insert([
        {
          contact_request_id: request.id,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          message: systemText,
        },
      ])
      .select()
      .single();

    if (systemMessageError) {
      console.error(
        "System message error:",
        systemMessageError
      );
      return;
    }

    setMessages((previous) => {
      const alreadyExists = previous.some(
        (item) => item.id === data.id
      );

      if (alreadyExists) {
        return previous;
      }

      return [...previous, data];
    });
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }

  function formatTime(date) {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="chat-page">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Opening private chat...</p>
        </div>

        <style>{chatStyles}</style>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="chat-page">
        <div className="chat-error-card">
          <XCircle size={42} />

          <h2>Unable to open chat</h2>

          <p>{error}</p>

          <Link to="/matches" className="back-button">
            <ArrowLeft size={18} />
            Back to SmartMatch
          </Link>
        </div>

        <style>{chatStyles}</style>
      </div>
    );
  }

  const isLostOwner =
    currentUser?.id === lostItem?.user_id;

  const isFoundOwner =
    currentUser?.id === foundItem?.user_id;

  const lostReturned =
    lostItem?.status === "returned";

  const foundReturned =
    foundItem?.status === "returned";

  const caseClosed =
    lostReturned && foundReturned;

  const hasCurrentUserConfirmed =
    (isLostOwner && lostReturned) ||
    (isFoundOwner && foundReturned);

  return (
    <div className="chat-page">
      <div className="chat-wrapper">

        {/* TOP BAR */}
        <div className="chat-topbar">

          <Link to="/matches" className="chat-back">
            <ArrowLeft size={18} />
            Back
          </Link>

          <div className="chat-title-area">

            <div className="chat-icon">
              <MessageCircle size={21} />
            </div>

            <div>
              <div className="chat-label">
                PRIVATE CHAT
              </div>

              <h1>
                Lost & Found Conversation
              </h1>
            </div>

          </div>

          <div
            className={
              caseClosed
                ? "closed-badge"
                : "accepted-badge"
            }
          >
            {caseClosed ? (
              <>
                <CheckCircle size={14} />
                Case Closed
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Accepted
              </>
            )}
          </div>

        </div>

        {/* SECURITY NOTICE */}
        <div className="privacy-notice">

          <ShieldCheck size={18} />

          <div>
            <strong>
              Private conversation
            </strong>

            <span>
              Only the two users involved in this accepted
              contact request can access these messages.
            </span>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="chat-alert">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="chat-success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* RETURN STATUS PANEL */}
        <div
          className={
            caseClosed
              ? "return-status case-closed"
              : "return-status"
          }
        >

          <div className="return-status-header">

            <div className="return-status-icon">
              {caseClosed ? (
                <CheckCircle size={22} />
              ) : (
                <PackageCheck size={22} />
              )}
            </div>

            <div>

              <div className="return-status-label">
                ITEM RETURN STATUS
              </div>

              <h2>
                {caseClosed
                  ? "Case Closed"
                  : "Return Confirmation"}
              </h2>

            </div>

          </div>

          <div className="status-grid">

            {/* LOST USER STATUS */}
            <div
              className={
                lostReturned
                  ? "person-status completed"
                  : "person-status"
              }
            >

              <div className="status-person-icon">
                {lostReturned ? (
                  <CheckCircle size={18} />
                ) : (
                  <Clock size={18} />
                )}
              </div>

              <div className="status-person-content">

                <strong>
                  Lost Item
                </strong>

                <span>
                  {lostReturned
                    ? "Item Received"
                    : "Waiting for item to be received"}
                </span>

                {lostItem?.returned_at && (
                  <small>
                    {formatDate(lostItem.returned_at)}
                  </small>
                )}

              </div>

            </div>

            {/* FOUND USER STATUS */}
            <div
              className={
                foundReturned
                  ? "person-status completed"
                  : "person-status"
              }
            >

              <div className="status-person-icon">
                {foundReturned ? (
                  <CheckCircle size={18} />
                ) : (
                  <Clock size={18} />
                )}
              </div>

              <div className="status-person-content">

                <strong>
                  Found Item
                </strong>

                <span>
                  {foundReturned
                    ? "Item Returned"
                    : "Waiting for item to be returned"}
                </span>

                {foundItem?.returned_at && (
                  <small>
                    {formatDate(foundItem.returned_at)}
                  </small>
                )}

              </div>

            </div>

          </div>

          {/* CONFIRM BUTTON */}
          {!caseClosed && !hasCurrentUserConfirmed && (
            <button
              type="button"
              className="return-button"
              onClick={confirmItemStatus}
              disabled={updatingStatus}
            >

              {updatingStatus ? (
                <>
                  <div className="send-spinner"></div>
                  Updating...
                </>
              ) : (
                <>
                  <PackageCheck size={18} />

                  {isLostOwner
                    ? "I Received My Item"
                    : isFoundOwner
                    ? "Item Returned"
                    : "Confirm Return"}
                </>
              )}

            </button>
          )}

          {/* ALREADY CONFIRMED */}
          {!caseClosed && hasCurrentUserConfirmed && (
            <div className="already-confirmed">
              <CheckCircle size={18} />

              {isLostOwner
                ? "You confirmed that you received your item."
                : "You confirmed that the item was returned."}

              <span>
                Waiting for the other user to confirm.
              </span>
            </div>
          )}

          {/* CASE CLOSED */}
          {caseClosed && (
            <div className="case-closed-message">

              <CheckCircle size={24} />

              <div>
                <strong>
                  Item successfully returned
                </strong>

                <span>
                  Both users confirmed the return.
                  This Lost & Found case is now closed.
                </span>
              </div>

            </div>
          )}

        </div>

        {/* CHAT BOX */}
        <div className="chat-box">

          {/* CHAT HEADER */}
          <div className="chat-header">

            <div>

              <div className="request-label">
                CONTACT REQUEST
              </div>

              <div className="request-id">
                #{request.id.slice(0, 8)}
              </div>

            </div>

            <div
              className={
                caseClosed
                  ? "chat-status closed-chat-status"
                  : "chat-status"
              }
            >

              {caseClosed ? (
                <>
                  <CheckCircle size={14} />
                  Case Closed
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Accepted
                </>
              )}

            </div>

          </div>

          {/* MESSAGES */}
          <div className="messages-area">

            {messages.length === 0 ? (
              <div className="empty-chat">

                <div className="empty-chat-icon">
                  <MessageCircle size={30} />
                </div>

                <h3>
                  Start the conversation
                </h3>

                <p>
                  Send a message to communicate privately
                  about the lost or found item.
                </p>

              </div>
            ) : (
              <div className="messages-list">

                {messages.map((item) => {

                  const isMine =
                    item.sender_id === currentUser?.id;

                  const isSystemMessage =
                    item.message?.startsWith(
                      "The lost-item owner confirmed:"
                    ) ||
                    item.message?.startsWith(
                      "The found-item owner confirmed:"
                    );

                  if (isSystemMessage) {
                    return (
                      <div
                        key={item.id}
                        className="system-message"
                      >
                        <CheckCircle size={15} />
                        <span>{item.message}</span>
                        <small>
                          {formatTime(item.created_at)}
                        </small>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`message-row ${
                        isMine ? "mine" : "theirs"
                      }`}
                    >

                      <div
                        className={`message-bubble ${
                          isMine ? "mine" : "theirs"
                        }`}
                      >

                        <div className="message-text">
                          {item.message}
                        </div>

                        <div className="message-time">
                          <Clock size={11} />
                          {formatTime(item.created_at)}
                        </div>

                      </div>

                    </div>
                  );
                })}

                <div ref={messagesEndRef}></div>

              </div>
            )}

          </div>

          {/* MESSAGE INPUT */}
          {!caseClosed ? (
            <form
              className="message-form"
              onSubmit={sendMessage}
            >

              <div className="input-wrapper">

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  placeholder="Write a message..."
                  rows={2}
                  maxLength={1000}
                  disabled={sending}
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();

                      if (
                        !sending &&
                        message.trim()
                      ) {
                        sendMessage(e);
                      }
                    }

                  }}
                />

                <div className="character-count">
                  {message.length}/1000 characters
                </div>

              </div>

              <button
                type="submit"
                className="send-chat-button"
                disabled={
                  sending ||
                  !message.trim()
                }
              >

                {sending ? (
                  <div className="send-spinner"></div>
                ) : (
                  <Send size={18} />
                )}

                <span>
                  {sending ? "Sending..." : "Send"}
                </span>

              </button>

            </form>
          ) : (
            <div className="closed-chat-footer">
              <CheckCircle size={18} />
              <span>
                This conversation is closed because the item
                has been returned and confirmed by both users.
              </span>
            </div>
          )}

        </div>

        {/* FOOTER INFO */}
        <div className="chat-footer">

          <ShieldCheck size={15} />

          <span>
            Messages are connected to this specific contact request.
          </span>

          <span className="dot">
            •
          </span>

          <span>
            Other users cannot participate in this conversation.
          </span>

        </div>

      </div>

      <style>{chatStyles}</style>
    </div>
  );
}

const chatStyles = `
  .chat-page {
    min-height: 100vh;
    padding: 25px 20px 60px;
    background:
      radial-gradient(
        circle at 10% 10%,
        rgba(157, 111, 63, 0.10),
        transparent 30%
      ),
      radial-gradient(
        circle at 90% 80%,
        rgba(78, 91, 61, 0.10),
        transparent 30%
      ),
      #f4efe5;
    color: #2b2924;
    box-sizing: border-box;
  }

  .chat-wrapper {
    width: min(1050px, 100%);
    margin: 0 auto;
  }

  .chat-topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 20px;
    margin-bottom: 18px;
  }

  .chat-back {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #51483c;
    text-decoration: none;
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
  }

  .chat-back:hover {
    color: #8b4d32;
  }

  .chat-title-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chat-icon {
    width: 43px;
    height: 43px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #8b4d32;
    color: white;
  }

  .chat-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: #8b4d32;
    margin-bottom: 3px;
  }

  .chat-title-area h1 {
    margin: 0;
    font-family: "Fraunces", serif;
    font-size: 24px;
    font-weight: 600;
  }

  .accepted-badge,
  .closed-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 50px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
  }

  .accepted-badge {
    background: rgba(78, 91, 61, 0.10);
    color: #4e5b3d;
  }

  .closed-badge {
    background: #e7ddc9;
    color: #71452f;
  }

  .privacy-notice {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 15px;
    margin-bottom: 14px;
    border: 1px solid rgba(78, 91, 61, 0.17);
    border-radius: 10px;
    background: rgba(78, 91, 61, 0.06);
    color: #4e5b3d;
  }

  .privacy-notice > svg {
    flex-shrink: 0;
  }

  .privacy-notice div {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .privacy-notice strong {
    font-size: 12px;
  }

  .privacy-notice span {
    font-size: 12px;
    color: #69705c;
  }

  .chat-alert {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 15px;
    margin-bottom: 14px;
    border-radius: 10px;
    background: rgba(139, 77, 50, 0.10);
    border: 1px solid rgba(139, 77, 50, 0.22);
    color: #7a3f29;
    font-size: 13px;
  }

  .chat-success {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 15px;
    margin-bottom: 14px;
    border-radius: 10px;
    background: rgba(78, 91, 61, 0.09);
    border: 1px solid rgba(78, 91, 61, 0.20);
    color: #4e5b3d;
    font-size: 13px;
  }

  /* RETURN STATUS */

  .return-status {
    margin-bottom: 15px;
    padding: 20px;
    border-radius: 16px;
    background: #fffdf8;
    border: 1px solid rgba(91, 76, 58, 0.15);
    box-shadow: 0 10px 30px rgba(52, 43, 32, 0.05);
  }

  .return-status.case-closed {
    border-color: rgba(78, 91, 61, 0.30);
    background: rgba(78, 91, 61, 0.055);
  }

  .return-status-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 17px;
  }

  .return-status-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #eee6d8;
    color: #8b4d32;
  }

  .case-closed .return-status-icon {
    background: rgba(78, 91, 61, 0.12);
    color: #4e5b3d;
  }

  .return-status-label {
    color: #8b4d32;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    letter-spacing: 1.3px;
    margin-bottom: 3px;
  }

  .case-closed .return-status-label {
    color: #4e5b3d;
  }

  .return-status-header h2 {
    margin: 0;
    font-family: "Fraunces", serif;
    font-size: 23px;
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .person-status {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px;
    border-radius: 11px;
    background: #f8f3e9;
    border: 1px solid rgba(91, 76, 58, 0.12);
  }

  .person-status.completed {
    background: rgba(78, 91, 61, 0.08);
    border-color: rgba(78, 91, 61, 0.18);
  }

  .status-person-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #e8dfcf;
    color: #806c42;
  }

  .person-status.completed .status-person-icon {
    background: rgba(78, 91, 61, 0.13);
    color: #4e5b3d;
  }

  .status-person-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .status-person-content strong {
    font-size: 12px;
  }

  .status-person-content span {
    color: #71685b;
    font-size: 12px;
  }

  .status-person-content small {
    color: #93897a;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
  }

  .return-button {
    width: 100%;
    margin-top: 14px;
    min-height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 10px;
    background: #4e5b3d;
    color: white;
    cursor: pointer;
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    transition: 0.2s ease;
  }

  .return-button:hover:not(:disabled) {
    background: #3e4930;
    transform: translateY(-1px);
  }

  .return-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .already-confirmed {
    margin-top: 14px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(78, 91, 61, 0.08);
    color: #4e5b3d;
    font-size: 12px;
  }

  .already-confirmed span {
    color: #777060;
    width: 100%;
    margin-left: 25px;
  }

  .case-closed-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 14px;
    padding: 13px 15px;
    border-radius: 10px;
    background: rgba(78, 91, 61, 0.10);
    color: #4e5b3d;
  }

  .case-closed-message strong {
    display: block;
    font-size: 13px;
    margin-bottom: 3px;
  }

  .case-closed-message span {
    display: block;
    color: #68705a;
    font-size: 12px;
    line-height: 1.5;
  }

  /* CHAT */

  .chat-box {
    height: min(680px, 75vh);
    min-height: 520px;
    display: flex;
    flex-direction: column;
    background: #fffdf8;
    border: 1px solid rgba(91, 76, 58, 0.15);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 45px rgba(52, 43, 32, 0.08);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid rgba(91, 76, 58, 0.13);
    background: rgba(250, 246, 237, 0.8);
  }

  .request-label {
    color: #8b4d32;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    letter-spacing: 1.2px;
  }

  .request-id {
    margin-top: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    color: #51483c;
  }

  .chat-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    border-radius: 50px;
    background: #eee9dc;
    color: #4e5b3d;
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
  }

  .closed-chat-status {
    background: rgba(139, 77, 50, 0.09);
    color: #8b4d32;
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 25px 20px;
    background:
      radial-gradient(
        circle at 20% 20%,
        rgba(139, 77, 50, 0.025),
        transparent 30%
      ),
      #fffdf8;
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-row {
    display: flex;
    width: 100%;
  }

  .message-row.mine {
    justify-content: flex-end;
  }

  .message-row.theirs {
    justify-content: flex-start;
  }

  .message-bubble {
    max-width: min(70%, 550px);
    padding: 11px 13px 8px;
    border-radius: 13px;
  }

  .message-bubble.mine {
    background: #8b4d32;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message-bubble.theirs {
    background: #eee6d8;
    color: #38332b;
    border-bottom-left-radius: 4px;
  }

  .message-text {
    font-size: 14px;
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .message-time {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 5px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    opacity: 0.65;
  }

  .system-message {
    width: min(650px, 90%);
    margin: 8px auto;
    padding: 10px 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex-wrap: wrap;
    border-radius: 10px;
    background: rgba(78, 91, 61, 0.07);
    border: 1px solid rgba(78, 91, 61, 0.14);
    color: #4e5b3d;
    font-size: 11px;
    text-align: center;
  }

  .system-message small {
    color: #8b907e;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
  }

  .empty-chat {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
    color: #71685b;
  }

  .empty-chat-icon {
    width: 65px;
    height: 65px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #eee6d8;
    color: #8b4d32;
    margin-bottom: 15px;
  }

  .empty-chat h3 {
    margin: 0 0 7px;
    font-family: "Fraunces", serif;
    font-size: 24px;
    color: #3d382f;
  }

  .empty-chat p {
    max-width: 420px;
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
  }

  .message-form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    padding: 15px;
    border-top: 1px solid rgba(91, 76, 58, 0.13);
    background: #fffdf8;
  }

  .input-wrapper {
    position: relative;
  }

  .input-wrapper textarea {
    width: 100%;
    min-height: 68px;
    max-height: 160px;
    box-sizing: border-box;
    resize: vertical;
    border: 1px solid rgba(91, 76, 58, 0.20);
    border-radius: 11px;
    background: #f8f3e9;
    color: #29261f;
    padding: 13px 15px 25px;
    outline: none;
    font: inherit;
    font-size: 14px;
  }

  .input-wrapper textarea:focus {
    border-color: #8b4d32;
    box-shadow: 0 0 0 3px rgba(139, 77, 50, 0.08);
  }

  .input-wrapper textarea:disabled {
    opacity: 0.65;
  }

  .character-count {
    position: absolute;
    right: 10px;
    bottom: 7px;
    color: #93897a;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
  }

  .send-chat-button {
    min-width: 95px;
    border: 0;
    border-radius: 11px;
    background: #8b4d32;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    transition: 0.2s ease;
  }

  .send-chat-button:hover:not(:disabled) {
    background: #713c27;
    transform: translateY(-1px);
  }

  .send-chat-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .closed-chat-footer {
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 15px 20px;
    border-top: 1px solid rgba(78, 91, 61, 0.15);
    background: rgba(78, 91, 61, 0.06);
    color: #4e5b3d;
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
    text-align: center;
  }

  .send-spinner,
  .loading-spinner {
    width: 17px;
    height: 17px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: chatSpin 0.8s linear infinite;
  }

  @keyframes chatSpin {
    to {
      transform: rotate(360deg);
    }
  }

  .chat-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 12px;
    color: #83796b;
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    text-align: center;
  }

  .chat-footer svg {
    color: #4e5b3d;
  }

  .dot {
    opacity: 0.5;
  }

  .chat-loading {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #71685b;
    font-size: 14px;
  }

  .chat-loading .loading-spinner {
    width: 30px;
    height: 30px;
    border-color: rgba(139,77,50,0.2);
    border-top-color: #8b4d32;
  }

  .chat-error-card {
    width: min(550px, calc(100% - 30px));
    margin: 100px auto;
    padding: 35px;
    text-align: center;
    box-sizing: border-box;
    background: #fffdf8;
    border: 1px solid rgba(91,76,58,0.15);
    border-radius: 18px;
    color: #8b4d32;
    box-shadow: 0 18px 45px rgba(52,43,32,0.08);
  }

  .chat-error-card h2 {
    margin: 15px 0 8px;
    font-family: "Fraunces", serif;
    color: #302c26;
  }

  .chat-error-card p {
    color: #71685b;
    line-height: 1.6;
    font-size: 14px;
    margin-bottom: 25px;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 17px;
    border-radius: 10px;
    background: #8b4d32;
    color: white;
    text-decoration: none;
    font-size: 13px;
  }

  @media (max-width: 700px) {

    .chat-page {
      padding: 15px 10px 40px;
    }

    .chat-topbar {
      grid-template-columns: auto 1fr;
    }

    .accepted-badge,
    .closed-badge {
      display: none;
    }

    .chat-title-area h1 {
      font-size: 20px;
    }

    .chat-box {
      height: calc(100vh - 190px);
      min-height: 450px;
    }

    .message-bubble {
      max-width: 82%;
    }

    .message-form {
      grid-template-columns: 1fr;
    }

    .send-chat-button {
      min-height: 45px;
    }

    .privacy-notice div {
      display: block;
    }

    .privacy-notice span {
      display: block;
      margin-top: 3px;
    }

    .status-grid {
      grid-template-columns: 1fr;
    }

    .return-status {
      padding: 15px;
    }

    .closed-chat-footer {
      font-size: 9px;
    }
  }
`;