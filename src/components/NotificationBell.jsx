import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

function NotificationBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const wrapperRef = useRef(null);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("global-match-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_alerts",
        },
        async () => {
          await loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  async function loadNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("match_alerts")
        .select(`
          *,
          lost_items (
            id,
            item_name,
            user_id
          ),
          found_items (
            id,
            item_name,
            user_id
          )
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(20);

      if (error) {
        console.error(
          "Notification loading error:",
          error
        );

        setLoading(false);
        return;
      }

      const privateAlerts = (data || []).filter(
        (alert) => {
          const lostOwner =
            alert.lost_items?.user_id;

          const foundOwner =
            alert.found_items?.user_id;

          return (
            lostOwner === user.id ||
            foundOwner === user.id
          );
        }
      );

      setAlerts(privateAlerts);
    } catch (error) {
      console.error(
        "Notification error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const unreadCount = alerts.filter(
    (alert) => !alert.is_read
  ).length;

  async function markAsRead(alertId) {
    const { error } = await supabase
      .from("match_alerts")
      .update({
        is_read: true,
      })
      .eq("id", alertId);

    if (error) {
      console.error(
        "Could not mark notification as read:",
        error
      );
      return;
    }

    setAlerts((previous) =>
      previous.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              is_read: true,
            }
          : alert
      )
    );
  }

  async function markAllAsRead() {
    const unreadIds = alerts
      .filter((alert) => !alert.is_read)
      .map((alert) => alert.id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("match_alerts")
      .update({
        is_read: true,
      })
      .in("id", unreadIds);

    if (error) {
      console.error(
        "Could not mark notifications as read:",
        error
      );
      return;
    }

    setAlerts((previous) =>
      previous.map((alert) => ({
        ...alert,
        is_read: true,
      }))
    );
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";

    return new Date(
      timestamp
    ).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <div
      ref={wrapperRef}
      className="notification-wrapper"
    >
      <button
        type="button"
        className="notification-bell"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        aria-label="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">

          <div className="notification-header">
            <div>
              <strong>
                Notifications
              </strong>

              <span>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">

            {loading ? (
              <div className="notification-empty">
                Loading notifications...
              </div>
            ) : alerts.length === 0 ? (
              <div className="notification-empty">
                <Bell size={28} />

                <strong>
                  No notifications
                </strong>

                <span>
                  SmartMatch alerts will appear here.
                </span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`notification-item ${
                    !alert.is_read
                      ? "unread"
                      : ""
                  }`}
                  onClick={() => {
                    if (!alert.is_read) {
                      markAsRead(alert.id);
                    }
                  }}
                >
                  <div className="notification-icon">
                    <Sparkles size={18} />
                  </div>

                  <div className="notification-content">

                    <div className="notification-title">
                      {alert.match_score >= 90
                        ? "Your item may have been found!"
                        : "Possible SmartMatch found"}
                    </div>

                    <p>
                      {alert.alert_message}
                    </p>

                    <small>
                      {formatTime(
                        alert.created_at
                      )}
                    </small>

                    <Link
                      to="/matches"
                      className="notification-action"
                      onClick={() =>
                        setOpen(false)
                      }
                    >
                      View SmartMatch
                    </Link>

                  </div>

                  {!alert.is_read && (
                    <span className="notification-dot" />
                  )}
                </div>
              ))
            )}

          </div>

        </div>
      )}
    </div>
  );
}

export default NotificationBell;