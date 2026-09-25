import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function ContactAgent() {
  const [searchParams] = useSearchParams();

  const lostItemId = searchParams.get("lost");
  const foundItemId = searchParams.get("found");

  const [currentUser, setCurrentUser] = useState(null);
  const [lostItem, setLostItem] = useState(null);
  const [foundItem, setFoundItem] = useState(null);
  const [requests, setRequests] = useState([]);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPage();
  }, [lostItemId, foundItemId]);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("You must be logged in to contact another user.");
        setLoading(false);
        return;
      }

      const user = session.user;
      setCurrentUser(user);

      const { data: lost, error: lostError } = await supabase
        .from("lost_items")
        .select("*")
        .eq("id", lostItemId)
        .single();

      if (lostError) throw lostError;

      const { data: found, error: foundError } = await supabase
        .from("found_items")
        .select("*")
        .eq("id", foundItemId)
        .single();

      if (foundError) throw foundError;

      setLostItem(lost);
      setFoundItem(found);

      if (lost.user_id === user.id) {
        setName(user.user_metadata?.full_name || "");
      }

      const { data: requestData, error: requestError } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("lost_item_id", lostItemId)
        .eq("found_item_id", foundItemId)
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      setRequests(requestData || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load contact information.");
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!currentUser || !lostItem || !foundItem) {
      setError("Unable to verify the users involved in this match.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    if (lostItem.user_id === foundItem.user_id) {
      setError("You cannot contact yourself through this match.");
      return;
    }

    // Only the owner of the LOST item can initiate the request.
    if (currentUser.id !== lostItem.user_id) {
      setError(
        "Only the owner of the lost item can start this contact request."
      );
      return;
    }

    const receiverId = foundItem.user_id;

    if (!receiverId) {
      setError("The owner of the found item could not be identified.");
      return;
    }

    if (receiverId === currentUser.id) {
      setError("You cannot contact yourself.");
      return;
    }

    const alreadyPending = requests.some(
      (request) =>
        request.requester_id === currentUser.id &&
        request.receiver_id === receiverId &&
        request.status === "pending"
    );

    if (alreadyPending) {
      setError("You already have a pending request for this match.");
      return;
    }

    setSending(true);

    try {
      const { data, error: insertError } = await supabase
        .from("contact_requests")
        .insert([
          {
            lost_item_id: lostItem.id,
            found_item_id: foundItem.id,
            requester_name: name.trim(),
            requester_message: message.trim(),
            requester_id: currentUser.id,
            receiver_id: receiverId,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setRequests((previous) => [data, ...previous]);
      setMessage("");

      setSuccess(
        "Contact request sent successfully. The other user can now respond to your request."
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send contact request.");
    } finally {
      setSending(false);
    }
  }

  async function updateRequest(requestId, newStatus) {
    setError("");
    setSuccess("");

    try {
      const { data: updatedRequest, error: updateError } = await supabase
        .from("contact_requests")
        .update({
          status: newStatus,
        })
        .eq("id", requestId)
        .eq("receiver_id", currentUser.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRequests((previous) =>
        previous.map((request) =>
          request.id === requestId ? updatedRequest : request
        )
      );

      setSuccess(
        newStatus === "accepted"
          ? "Contact request accepted. Private chat is now available."
          : "Contact request declined."
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update the request.");
    }
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading contact request...</p>
        </div>
      </div>
    );
  }

  if (error && (!lostItem || !foundItem)) {
    return (
      <div className="page-shell">
        <div className="case-card error-card">
          <XCircle size={42} />

          <h2>Unable to open contact request</h2>

          <p>{error}</p>

          <Link to="/matches" className="primary-button">
            <ArrowLeft size={18} />
            Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const isLostOwner = currentUser?.id === lostItem?.user_id;
  const isFoundOwner = currentUser?.id === foundItem?.user_id;

  return (
    <div className="page-shell contact-page">
      <div className="contact-container">

        <Link to="/matches" className="back-link">
          <ArrowLeft size={18} />
          Back to SmartMatch
        </Link>

        <div className="contact-header">
          <div className="eyebrow">
            <ShieldCheck size={16} />
            PRIVATE CONTACT CHANNEL
          </div>

          <h1>Contact the Other User</h1>

          <p>
            This conversation is limited to the two users involved in this
            potential match.
          </p>
        </div>

        {error && (
          <div className="alert error-alert">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert success-alert">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <div className="match-overview">

          <div className="item-panel">
            <div className="panel-label">LOST ITEM</div>

            {lostItem?.image_url && (
              <img
                src={lostItem.image_url}
                alt={lostItem.item_name}
                className="item-image"
              />
            )}

            <h2>{lostItem?.item_name}</h2>

            <p>
              {lostItem?.description || "No description provided."}
            </p>

            <div className="item-meta">
              <span>
                {lostItem?.location || "Unknown location"}
              </span>

              <span>
                {lostItem?.lost_date || "Unknown date"}
              </span>
            </div>
          </div>

          <div className="match-divider">
            <div className="match-line"></div>

            <div className="match-icon">
              <MessageCircle size={22} />
            </div>

            <div className="match-line"></div>
          </div>

          <div className="item-panel">
            <div className="panel-label">FOUND ITEM</div>

            {foundItem?.image_url && (
              <img
                src={foundItem.image_url}
                alt={foundItem.item_name}
                className="item-image"
              />
            )}

            <h2>{foundItem?.item_name}</h2>

            <p>
              {foundItem?.description || "No description provided."}
            </p>

            <div className="item-meta">
              <span>
                {foundItem?.location || "Unknown location"}
              </span>

              <span>
                {foundItem?.found_date || "Unknown date"}
              </span>
            </div>
          </div>
        </div>

        {isLostOwner && !isFoundOwner && (
          <form className="contact-form" onSubmit={sendRequest}>

            <div className="form-heading">
              <MessageCircle size={22} />

              <div>
                <h2>Send Contact Request</h2>

                <p>
                  Your message will be sent to the person who reported the
                  matching found item.
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Your Name</label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Message</label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe why you believe this is your item..."
                rows={6}
                maxLength={1000}
              />

              <div className="character-count">
                {message.length}/1000
              </div>
            </div>

            <button
              type="submit"
              className="primary-button send-button"
              disabled={sending}
            >
              {sending ? (
                <>
                  <div className="button-spinner"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Contact Request
                </>
              )}
            </button>
          </form>
        )}

        {isFoundOwner && !isLostOwner && (
          <div className="receiver-notice">
            <ShieldCheck size={24} />

            <div>
              <h3>Someone may have found their item</h3>

              <p>
                You are the owner of the found report. Any contact request
                from the lost-item owner will appear below.
              </p>
            </div>
          </div>
        )}

        {requests.length > 0 && (
          <section className="requests-section">

            <div className="section-heading">
              <h2>Contact Requests</h2>
              <span>{requests.length}</span>
            </div>

            <div className="requests-list">

              {requests.map((request) => {

                const isReceiver =
                  request.receiver_id === currentUser?.id;

                const isParticipant =
                  request.requester_id === currentUser?.id ||
                  request.receiver_id === currentUser?.id;

                return (
                  <div className="request-card" key={request.id}>

                    <div className="request-top">

                      <div>
                        <h3>{request.requester_name}</h3>

                        <div className="request-date">
                          <Clock size={14} />
                          {formatDate(request.created_at)}
                        </div>
                      </div>

                      <div
                        className={`request-status status-${request.status}`}
                      >
                        {request.status === "pending" && (
                          <Clock size={14} />
                        )}

                        {request.status === "accepted" && (
                          <CheckCircle size={14} />
                        )}

                        {request.status === "declined" && (
                          <XCircle size={14} />
                        )}

                        {request.status}
                      </div>
                    </div>

                    <div className="request-message">
                      {request.requester_message}
                    </div>

                    {isReceiver && request.status === "pending" && (
                      <div className="request-actions">

                        <button
                          type="button"
                          className="accept-button"
                          onClick={() =>
                            updateRequest(request.id, "accepted")
                          }
                        >
                          <CheckCircle size={17} />
                          Accept
                        </button>

                        <button
                          type="button"
                          className="decline-button"
                          onClick={() =>
                            updateRequest(request.id, "declined")
                          }
                        >
                          <XCircle size={17} />
                          Decline
                        </button>

                      </div>
                    )}

                    {request.status === "accepted" &&
                      isParticipant && (
                        <div className="accepted-area">

                          <div className="accepted-message">
                            <CheckCircle size={17} />
                            Contact request accepted.
                          </div>

                          <Link
                            to={`/chat?request=${request.id}`}
                            className="chat-button"
                          >
                            <MessageCircle size={18} />
                            Open Private Chat
                          </Link>

                        </div>
                      )}

                  </div>
                );
              })}

            </div>
          </section>
        )}

        {requests.length === 0 && isFoundOwner && (
          <div className="empty-requests">
            <Clock size={30} />

            <h3>No contact requests yet</h3>

            <p>
              If the lost-item owner wants to contact you, their request will
              appear here.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .page-shell {
          min-height: 100vh;
          padding: 40px 20px 80px;
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
        }

        .contact-container {
          width: min(1100px, 100%);
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #51483c;
          text-decoration: none;
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          margin-bottom: 35px;
        }

        .back-link:hover {
          color: #8b4d32;
        }

        .contact-header {
          margin-bottom: 35px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #8b4d32;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
        }

        .contact-header h1 {
          margin: 0;
          font-family: "Fraunces", serif;
          font-size: clamp(38px, 6vw, 62px);
          line-height: 1;
          font-weight: 600;
        }

        .contact-header p {
          max-width: 650px;
          margin-top: 18px;
          color: #71685b;
          font-size: 16px;
          line-height: 1.7;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 18px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-size: 14px;
        }

        .error-alert {
          background: rgba(139, 77, 50, 0.10);
          border: 1px solid rgba(139, 77, 50, 0.25);
          color: #7a3f29;
        }

        .success-alert {
          background: rgba(78, 91, 61, 0.11);
          border: 1px solid rgba(78, 91, 61, 0.25);
          color: #4e5b3d;
        }

        .match-overview {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 25px;
          align-items: stretch;
          margin-bottom: 30px;
        }

        .item-panel {
          background: rgba(255, 252, 245, 0.85);
          border: 1px solid rgba(91, 76, 58, 0.15);
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 12px 35px rgba(52, 43, 32, 0.07);
        }

        .panel-label {
          color: #8b4d32;
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }

        .item-image {
          width: 100%;
          height: 190px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .item-panel h2 {
          margin: 0 0 10px;
          font-family: "Fraunces", serif;
          font-size: 26px;
        }

        .item-panel p {
          color: #71685b;
          line-height: 1.6;
          font-size: 14px;
        }

        .item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .item-meta span {
          padding: 7px 10px;
          border-radius: 8px;
          background: #eee6d8;
          color: #655c50;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
        }

        .match-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .match-line {
          width: 1px;
          flex: 1;
          min-height: 30px;
          background: rgba(91, 76, 58, 0.2);
        }

        .match-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #8b4d32;
          color: white;
          box-shadow: 0 8px 25px rgba(139, 77, 50, 0.22);
        }

        .contact-form {
          background: #fffdf8;
          border: 1px solid rgba(91, 76, 58, 0.16);
          border-radius: 18px;
          padding: 30px;
          box-shadow: 0 12px 35px rgba(52, 43, 32, 0.07);
          margin-bottom: 30px;
        }

        .form-heading {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 28px;
        }

        .form-heading > svg {
          color: #8b4d32;
          margin-top: 3px;
        }

        .form-heading h2 {
          margin: 0;
          font-family: "Fraunces", serif;
          font-size: 27px;
        }

        .form-heading p {
          margin: 7px 0 0;
          color: #71685b;
          font-size: 14px;
        }

        .form-group {
          position: relative;
          margin-bottom: 22px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
          color: #4f483e;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(91, 76, 58, 0.2);
          background: #f8f3e9;
          color: #29261f;
          border-radius: 11px;
          padding: 13px 15px;
          outline: none;
          font: inherit;
          transition: 0.2s ease;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 140px;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #8b4d32;
          box-shadow: 0 0 0 3px rgba(139, 77, 50, 0.08);
        }

        .character-count {
          position: absolute;
          right: 10px;
          bottom: 8px;
          color: #93897a;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 10px;
          padding: 13px 19px;
          background: #8b4d32;
          color: white;
          text-decoration: none;
          cursor: pointer;
          font: inherit;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .primary-button:hover {
          transform: translateY(-2px);
        }

        .primary-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .send-button {
          width: 100%;
        }

        .button-spinner,
        .loading-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-state {
          min-height: 70vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 15px;
          color: #71685b;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
          border-color: rgba(139,77,50,0.2);
          border-top-color: #8b4d32;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .receiver-notice {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          background: rgba(78, 91, 61, 0.08);
          border: 1px solid rgba(78, 91, 61, 0.18);
          padding: 22px;
          border-radius: 15px;
          margin-bottom: 30px;
          color: #4e5b3d;
        }

        .receiver-notice h3 {
          margin: 0 0 6px;
          font-family: "Fraunces", serif;
          font-size: 21px;
        }

        .receiver-notice p {
          margin: 0;
          color: #68705a;
          line-height: 1.5;
          font-size: 14px;
        }

        .requests-section {
          margin-top: 35px;
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .section-heading h2 {
          margin: 0;
          font-family: "Fraunces", serif;
          font-size: 29px;
        }

        .section-heading span {
          display: grid;
          place-items: center;
          min-width: 27px;
          height: 27px;
          padding: 0 7px;
          border-radius: 50px;
          background: #8b4d32;
          color: white;
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
        }

        .requests-list {
          display: grid;
          gap: 15px;
        }

        .request-card {
          background: #fffdf8;
          border: 1px solid rgba(91, 76, 58, 0.15);
          border-radius: 15px;
          padding: 22px;
        }

        .request-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
        }

        .request-top h3 {
          margin: 0;
          font-family: "Fraunces", serif;
          font-size: 20px;
        }

        .request-date {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          color: #93897a;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
        }

        .request-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 50px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 10px;
          text-transform: uppercase;
        }

        .status-pending {
          background: #f2ead8;
          color: #806c42;
        }

        .status-accepted {
          background: rgba(78,91,61,0.11);
          color: #4e5b3d;
        }

        .status-declined {
          background: rgba(139,77,50,0.10);
          color: #8b4d32;
        }

        .request-message {
          margin-top: 18px;
          padding: 15px;
          border-radius: 10px;
          background: #f7f1e7;
          color: #554d42;
          line-height: 1.6;
          font-size: 14px;
        }

        .request-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .accept-button,
        .decline-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 9px;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          border: 1px solid transparent;
        }

        .accept-button {
          background: #4e5b3d;
          color: white;
        }

        .decline-button {
          background: transparent;
          color: #8b4d32;
          border-color: rgba(139,77,50,0.25);
        }

        .accepted-area {
          margin-top: 15px;
        }

        .accepted-message {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4e5b3d;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .chat-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 17px;
          border-radius: 10px;
          background: #8b4d32;
          color: white;
          text-decoration: none;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .chat-button:hover {
          transform: translateY(-2px);
          background: #713c27;
          box-shadow: 0 8px 20px rgba(139,77,50,0.20);
        }

        .empty-requests {
          text-align: center;
          padding: 55px 20px;
          border: 1px dashed rgba(91,76,58,0.22);
          border-radius: 15px;
          color: #807769;
        }

        .empty-requests h3 {
          margin: 12px 0 6px;
          font-family: "Fraunces", serif;
          font-size: 22px;
          color: #403b34;
        }

        .empty-requests p {
          margin: 0;
          font-size: 14px;
        }

        .case-card {
          width: min(600px, calc(100% - 40px));
          margin: 100px auto;
          padding: 35px;
          text-align: center;
          background: #fffdf8;
          border-radius: 18px;
          border: 1px solid rgba(91,76,58,0.15);
        }

        .case-card h2 {
          font-family: "Fraunces", serif;
        }

        .case-card p {
          color: #71685b;
          line-height: 1.6;
          margin-bottom: 25px;
        }

        .error-card {
          color: #8b4d32;
        }

        @media (max-width: 800px) {
          .match-overview {
            grid-template-columns: 1fr;
          }

          .match-divider {
            flex-direction: row;
          }

          .match-line {
            width: auto;
            height: 1px;
            min-height: 0;
            flex: 1;
          }

          .match-icon {
            flex-shrink: 0;
          }
        }

        @media (max-width: 600px) {
          .page-shell {
            padding: 25px 14px 60px;
          }

          .contact-form,
          .item-panel {
            padding: 20px;
          }

          .contact-header h1 {
            font-size: 40px;
          }

          .request-top {
            flex-direction: column;
          }

          .request-actions {
            flex-direction: column;
          }

          .accept-button,
          .decline-button {
            justify-content: center;
          }

          .chat-button {
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  );
}