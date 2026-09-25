import { useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  Upload,
  Search,
  Brain,
} from "lucide-react";

import { supabase } from "../services/supabase";
import { generateImageFingerprint } from "../lib/imageFingerprint";
import SmartMatchLoader from "../components/SmartMatchLoader";

function ReportLost() {
  const [form, setForm] = useState({
    itemName: "",
    description: "",
    location: "",
    lostDate: "",
    lostTime: "",
    characteristics: "",
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      alert("Please upload an item photo.");
      return;
    }

    setLoading(true);
    setStatusMessage("Verifying your account...");

    try {
      /* --------------------------------
         1. Get current logged-in user
      -------------------------------- */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session || !session.user) {
        setLoading(false);

        alert(
          "Your login session has expired. Please login again."
        );

        return;
      }

      const user = session.user;

      console.log("AUTH USER ID:", user.id);
      console.log("AUTH USER EMAIL:", user.email);

      /* --------------------------------
         2. Upload image
      -------------------------------- */

      setStatusMessage("Uploading item photo...");

      const fileName = `${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(fileName, image);

      if (uploadError) {
        throw uploadError;
      }

      /* --------------------------------
         3. Get public image URL
      -------------------------------- */

      setStatusMessage(
        "Preparing image for SmartMatch..."
      );

      const { data: publicUrlData } = supabase.storage
        .from("item-images")
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      console.log("Image uploaded:", imageUrl);

      /* --------------------------------
         4. Generate AI fingerprint
      -------------------------------- */

      setStatusMessage(
        "AI is analyzing the photo..."
      );

      const imageFingerprint =
        await generateImageFingerprint(imageUrl);

      console.log(
        "AI fingerprint generated:",
        imageFingerprint.length
      );

      /* --------------------------------
         5. Save report with user ID
      -------------------------------- */

      setStatusMessage(
        "Saving your lost item report..."
      );

      const lostItem = {
        user_id: user.id,
        item_name: form.itemName,
        description: form.description,
        location: form.location,
        lost_date: form.lostDate,
        lost_time: form.lostTime,
        characteristics: form.characteristics,
        image_url: imageUrl,
        image_fingerprint: imageFingerprint,
        status: "lost",
      };

      console.log(
        "Saving lost item:",
        lostItem
      );

      /*
       * IMPORTANT:
       * No .select() after insert.
       */

      const { error: insertError } = await supabase
        .from("lost_items")
        .insert([lostItem]);

      if (insertError) {
        console.error(
          "DATABASE INSERT ERROR:",
          insertError
        );

        throw insertError;
      }

      console.log(
        "LOST ITEM SAVED SUCCESSFULLY"
      );

      /* --------------------------------
         6. Success
      -------------------------------- */

      setStatusMessage(
        "Lost item submitted successfully!"
      );

      alert(
        "Lost item submitted successfully!\nAI photo fingerprint generated."
      );

      setForm({
        itemName: "",
        description: "",
        location: "",
        lostDate: "",
        lostTime: "",
        characteristics: "",
      });

      setImage(null);

      const fileInput =
        document.getElementById("lost-image");

      if (fileInput) {
        fileInput.value = "";
      }

      setStatusMessage("");

    } catch (error) {
      console.error(
        "Lost item submission error:",
        error
      );

      setStatusMessage("");

      alert(
        `Something went wrong.\n\n${
          error.message || "Please try again."
        }`
      );

    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------
     SMARTMATCH LOADER
  -------------------------------- */

  if (loading) {
    return (
      <SmartMatchLoader
        text={
          statusMessage ||
          "Processing your report..."
        }
      />
    );
  }

  return (
    <div className="form-page">
      <div className="form-container">

        <Link
          to="/"
          className="back-link"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        {/* ================= HEADER ================= */}

        <div className="form-header">

          <div className="form-icon">
            <Search size={26} />
          </div>

          <p className="eyebrow">
            REPORT LOST ITEM
          </p>

          <h1>
            What did you lose?
          </h1>

          <p>
            Tell us about the item you lost so our
            matching system can help find it.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "#f3f4f6",
              fontSize: "13px",
            }}
          >
            <Brain size={17} />

            <span>
              AI Photo Fingerprint enabled
            </span>
          </div>

        </div>

        {/* ================= FORM ================= */}

        <form onSubmit={handleSubmit}>

          {/* IMAGE */}

          <div className="form-group">

            <label>
              Item Photo
            </label>

            <label
              htmlFor="lost-image"
              className="upload-box"
            >
              <Upload size={28} />

              <span>
                {image
                  ? image.name
                  : "Click to upload a photo"}
              </span>

              <small>
                PNG, JPG or JPEG
              </small>

            </label>

            <input
              id="lost-image"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImage(e.target.files[0])
              }
              hidden
            />

          </div>

          {/* ITEM NAME */}

          <div className="form-group">

            <label>
              Item Name
            </label>

            <input
              type="text"
              name="itemName"
              placeholder="e.g. Black AirPods"
              value={form.itemName}
              onChange={handleChange}
              required
            />

          </div>

          {/* DESCRIPTION */}

          <div className="form-group">

            <label>
              Description
            </label>

            <textarea
              name="description"
              placeholder="Describe the item you lost..."
              value={form.description}
              onChange={handleChange}
              required
            />

          </div>

          {/* LOCATION */}

          <div className="form-group">

            <label>
              Where did you lose it?
            </label>

            <input
              type="text"
              name="location"
              placeholder="e.g. MSRIT Library"
              value={form.location}
              onChange={handleChange}
              required
            />

          </div>

          {/* DATE + TIME */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Date
              </label>

              <input
                type="date"
                name="lostDate"
                value={form.lostDate}
                onChange={handleChange}
                required
              />

            </div>

            <div className="form-group">

              <label>
                Approximate Time
              </label>

              <input
                type="time"
                name="lostTime"
                value={form.lostTime}
                onChange={handleChange}
                required
              />

            </div>

          </div>

          {/* CHARACTERISTICS */}

          <div className="form-group">

            <label>
              Identifying Characteristics
            </label>

            <textarea
              name="characteristics"
              placeholder="Scratches, stickers, unique marks, color, etc."
              value={form.characteristics}
              onChange={handleChange}
            />

          </div>

          {/* AI STATUS */}

          {statusMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f3f4f6",
                fontSize: "14px",
              }}
            >

              <Brain size={18} />

              <span>
                {statusMessage}
              </span>

            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading
              ? statusMessage || "Processing..."
              : "Find My Item"}
          </button>

        </form>

      </div>
    </div>
  );
}

export default ReportLost;