import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function CommunitySearch() {
  const [lostItems, setLostItems] = useState([]);
  const [sightings, setSightings] = useState([]);

  const [selectedLostItem, setSelectedLostItem] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [sightingDate, setSightingDate] = useState(today);
  const [sightingTime, setSightingTime] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    loadLostItems();
    loadSightings();
  }, []);

  async function loadLostItems() {
    const { data, error } = await supabase
      .from("lost_items")
      .select("*")
      .eq("status", "lost")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setLostItems(data || []);
  }

  async function loadSightings() {
    const { data, error } = await supabase
      .from("item_sightings")
      .select(`
        *,
        lost_items (
          item_name,
          image_url,
          location
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setSightings(data || []);
  }

  async function submitSighting(event) {
    event.preventDefault();

    if (!selectedLostItem) {
      setStatus("Please select the lost item.");
      return;
    }

    if (!reporterName.trim()) {
      setStatus("Please enter your name.");
      return;
    }

    if (!message.trim()) {
      setStatus("Please describe what you saw.");
      return;
    }

    if (!location.trim()) {
      setStatus("Please enter where you saw it.");
      return;
    }

    if (!sightingDate) {
      setStatus("Please select the sighting date.");
      return;
    }

    if (!sightingTime) {
      setStatus("Please select the sighting time.");
      return;
    }

    setStatus("submitting");

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExtension =
          imageFile.name.split(".").pop() || "jpg";

        const fileName = `sightings/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(uploadError);
          setStatus("Photo upload failed.");
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("item_sightings")
        .insert({
          lost_item_id: selectedLostItem,
          reporter_name: reporterName.trim(),
          message: message.trim(),
          location: location.trim(),
          sighting_date: sightingDate,
          sighting_time: sightingTime,
          image_url: imageUrl,
        });

      if (error) {
        console.error(error);
        setStatus("Failed to submit sighting.");
        return;
      }

      setStatus("success");

      setSelectedLostItem("");
      setReporterName("");
      setMessage("");
      setLocation("");
      setSightingDate(today);
      setSightingTime("");
      setImageFile(null);

      const fileInput = document.getElementById(
        "sighting-image"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadSightings();
    } catch (error) {
      console.error(error);
      setStatus("Something went wrong.");
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Date unavailable";

    return new Date(`${dateString}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(timeString) {
    if (!timeString) return "Time unavailable";

    const [hours, minutes] = timeString.split(":");

    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="community-page">
      <div className="community-container">

        {/* BACK */}
        <Link to="/" className="back-link community-back">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* HERO */}
        <section className="community-hero">
          <div className="community-hero-content">
            <div className="community-eyebrow">
              <Users size={12} />
              CAMPUS COMMUNITY NETWORK
            </div>

            <h1>
              Help someone find
              <br />
              what they lost.
            </h1>

            <p>
              Saw a lost item somewhere on campus? Report the
              sighting and help connect it with the person
              searching for it.
            </p>

            <div className="community-hero-stats">
              <div>
                <strong>{lostItems.length}</strong>
                <span>Active lost reports</span>
              </div>

              <div>
                <strong>{sightings.length}</strong>
                <span>Community sightings</span>
              </div>
            </div>
          </div>

          <div className="community-orbit">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="orbit orbit-three"></div>

            <div className="community-orbit-card">
              <Eye size={20} />
              <strong>See something?</strong>
              <span>Report it →</span>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section className="community-main-grid">

          {/* REPORT FORM */}
          <div className="community-form-card">

            <div className="community-card-header">
              <div className="community-card-icon">
                <Eye size={17} />
              </div>

              <div>
                <span>COMMUNITY REPORT</span>
                <h2>Report a sighting</h2>
              </div>
            </div>

            <form onSubmit={submitSighting}>

              {/* LOST ITEM */}
              <div className="community-form-group">
                <label>Which lost item did you see?</label>

                <select
                  value={selectedLostItem}
                  onChange={(event) =>
                    setSelectedLostItem(event.target.value)
                  }
                >
                  <option value="">
                    Select a lost item
                  </option>

                  {lostItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} — {item.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* NAME */}
              <div className="community-form-group">
                <label>Your name</label>

                <input
                  type="text"
                  value={reporterName}
                  onChange={(event) =>
                    setReporterName(event.target.value)
                  }
                  placeholder="Enter your name"
                  maxLength={60}
                />
              </div>

              {/* MESSAGE */}
              <div className="community-form-group">
                <label>What did you see?</label>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  placeholder="Example: I saw a black wallet near the library entrance around 2 PM."
                  maxLength={500}
                />
              </div>

              {/* LOCATION */}
              <div className="community-form-group">
                <label>Where did you see it?</label>

                <input
                  type="text"
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  placeholder="Example: Library entrance"
                  maxLength={120}
                />
              </div>

              {/* DATE + TIME */}
              <div className="community-date-time-grid">

                <div className="community-form-group">
                  <label>Sighting date</label>

                  <div className="community-input-icon">
                    <Clock3 size={15} />

                    <input
                      type="date"
                      value={sightingDate}
                      onChange={(event) =>
                        setSightingDate(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="community-form-group">
                  <label>Sighting time</label>

                  <div className="community-input-icon">
                    <Clock3 size={15} />

                    <input
                      type="time"
                      value={sightingTime}
                      onChange={(event) =>
                        setSightingTime(event.target.value)
                      }
                    />
                  </div>
                </div>

              </div>

              {/* IMAGE */}
              <div className="community-form-group">
                <label>Optional photo</label>

                <label
                  htmlFor="sighting-image"
                  className="community-upload-box"
                >
                  <Camera size={17} />

                  <div>
                    <strong>
                      {imageFile
                        ? imageFile.name
                        : "Add a photo"}
                    </strong>

                    <span>
                      Helps AI and other users verify the
                      sighting.
                    </span>
                  </div>
                </label>

                <input
                  id="sighting-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(
                      event.target.files?.[0] || null
                    )
                  }
                  hidden
                />
              </div>

              {/* STATUS */}
              {status !== "idle" &&
                status !== "submitting" &&
                status !== "success" &&
                !status.startsWith("Please") && (
                  <div className="community-error">
                    {status}
                  </div>
                )}

              {status.startsWith("Please") && (
                <div className="community-error">
                  {status}
                </div>
              )}

              {status === "success" && (
                <div className="community-success">
                  <CheckCircle2 size={18} />

                  <div>
                    <strong>Sighting submitted</strong>
                    <p>
                      Your sighting has been added to the
                      community recovery feed.
                    </p>
                  </div>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                className="community-submit-button"
                disabled={status === "submitting"}
              >
                <Send size={15} />

                {status === "submitting"
                  ? "Submitting Sighting..."
                  : "Submit Sighting"}
              </button>

            </form>
          </div>

          {/* RIGHT SIDE */}
          <div className="community-side">

            <div className="community-step-card">
              <div className="community-step-number">
                01
              </div>

              <div>
                <strong>Select a lost item</strong>
                <p>
                  Choose the report that matches what you
                  saw.
                </p>
              </div>
            </div>

            <div className="community-step-card">
              <div className="community-step-number">
                02
              </div>

              <div>
                <strong>Describe the sighting</strong>
                <p>
                  Tell the community where and when you saw
                  it.
                </p>
              </div>
            </div>

            <div className="community-step-card">
              <div className="community-step-number">
                03
              </div>

              <div>
                <strong>Help recover it</strong>
                <p>
                  Your report becomes part of the item's
                  recovery journey.
                </p>
              </div>
            </div>

            {/* AI CARD */}
            <div className="community-ai-card">
              <div className="community-ai-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <span>AI-ASSISTED RECOVERY</span>

                <h3>Recovery trail</h3>

                <p>
                  Community sightings can provide
                  additional evidence for matching lost
                  items.
                </p>
              </div>

              <div className="community-trail">

                <div className="trail-step">
                  <span>01</span>
                  <div>
                    <strong>Lost item</strong>
                    <small>Original report</small>
                  </div>
                </div>

                <div className="trail-line"></div>

                <div className="trail-step">
                  <span>02</span>
                  <div>
                    <strong>Sighting</strong>
                    <small>Community report</small>
                  </div>
                </div>

                <div className="trail-line"></div>

                <div className="trail-step">
                  <span>03</span>
                  <div>
                    <strong>Recovery</strong>
                    <small>Possible new lead</small>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* RECENT SIGHTINGS */}
        <section className="community-feed">

          <div className="community-feed-header">
            <div>
              <span>COMMUNITY ACTIVITY</span>
              <h2>Recent sightings</h2>
            </div>

            <div className="community-count">
              {sightings.length} reports
            </div>
          </div>

          {sightings.length === 0 ? (
            <div className="community-empty">
              <Eye size={22} />

              <strong>No sightings yet</strong>

              <p>
                Be the first person to help someone recover
                a lost item.
              </p>
            </div>
          ) : (
            <div className="community-sighting-grid">

              {sightings.map((sighting) => (
                <div
                  className="community-sighting-card"
                  key={sighting.id}
                >

                  {sighting.image_url ? (
                    <img
                      src={sighting.image_url}
                      alt={sighting.lost_items?.item_name || "Sighting"}
                      className="community-sighting-image"
                    />
                  ) : (
                    <div className="community-sighting-placeholder">
                      <Eye size={25} />
                    </div>
                  )}

                  <div className="community-sighting-content">

                    <div className="community-sighting-status">
                      <span>
                        <CheckCircle2 size={12} />
                        ACTIVE SIGHTING
                      </span>
                    </div>

                    <h3>
                      {sighting.lost_items?.item_name ||
                        "Lost item"}
                    </h3>

                    <p className="community-sighting-message">
                      "{sighting.message}"
                    </p>

                    <div className="community-sighting-meta">

                      <div>
                        <Users size={14} />
                        {sighting.reporter_name}
                      </div>

                      <div>
                        <MapPin size={14} />
                        {sighting.location}
                      </div>

                      <div>
                        <Clock3 size={14} />
                        {formatDate(sighting.sighting_date)}
                        {" • "}
                        {formatTime(sighting.sighting_time)}
                      </div>

                    </div>

                    <div className="community-sighting-footer">
                      <span>
                        Community lead
                      </span>

                      <MessageCircle size={15} />
                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default CommunitySearch;