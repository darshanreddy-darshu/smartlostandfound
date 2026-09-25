import { useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  Upload,
  Package,
  Brain,
} from "lucide-react";

import { supabase } from "../services/supabase";
import { generateImageFingerprint } from "../lib/imageFingerprint";
import SmartMatchLoader from "../components/SmartMatchLoader";

function ReportFound() {
  const [form, setForm] = useState({
    itemName: "",
    description: "",
    location: "",
    foundDate: "",
    foundTime: "",
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
         2. Upload image to Supabase
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

      console.log(
        "Found item image uploaded:",
        imageUrl
      );

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
         5. Save found item
      -------------------------------- */

      setStatusMessage(
        "Saving your found item report..."
      );

      const foundItem = {
        user_id: user.id,
        item_name: form.itemName,
        description: form.description,
        location: form.location,
        found_date: form.foundDate,
        found_time: form.foundTime,
        characteristics: form.characteristics,
        image_url: imageUrl,
        image_fingerprint: imageFingerprint,
        status: "found",
        claim_status: "available",
      };

      console.log(
        "Saving found item:",
        foundItem
      );

      /*
       * IMPORTANT:
       * Do not use .select() here.
       * This avoids triggering SELECT RLS
       * immediately after the INSERT.
       */

      const { error: insertError } = await supabase
        .from("found_items")
        .insert([foundItem]);

      if (insertError) {
        console.error(
          "DATABASE INSERT ERROR:",
          insertError
        );

        throw insertError;
      }

      console.log(
        "FOUND ITEM SAVED SUCCESSFULLY"
      );

      /* --------------------------------
         6. Success
      -------------------------------- */

      setStatusMessage(
        "Found item submitted successfully!"
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );

      alert(
        "Found item submitted successfully!\nAI photo fingerprint generated."
      );

      setForm({
        itemName: "",
        description: "",
        location: "",
        foundDate: "",
        foundTime: "",
        characteristics: "",
      });

      setImage(null);

      setStatusMessage("");

      const fileInput =
        document.getElementById("found-image");

      if (fileInput) {
        fileInput.value = "";
      }

    } catch (error) {
      console.error(
        "Found item submission error:",
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
     SmartMatch loading screen
  -------------------------------- */

  if (loading) {
    return (
      <SmartMatchLoader
        text={
          statusMessage ||
          "Processing your found item..."
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

        <div className="form-header">

          <div className="form-icon">
            <Package size={26} />
          </div>

          <p className="eyebrow">
            REPORT FOUND ITEM
          </p>

          <h1>
            What did you find?
          </h1>

          <p>
            Tell us about the item you found so our
            matching system can help locate its owner.
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

        <form onSubmit={handleSubmit}>

          {/* IMAGE */}

          <div className="form-group">

            <label>
              Item Photo
            </label>

            <label
              htmlFor="found-image"
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
              id="found-image"
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
              placeholder="Describe the item you found..."
              value={form.description}
              onChange={handleChange}
              required
            />

          </div>

          {/* LOCATION */}

          <div className="form-group">

            <label>
              Where did you find it?
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
                name="foundDate"
                value={form.foundDate}
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
                name="foundTime"
                value={form.foundTime}
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
              : "Find Owner"}
          </button>

        </form>

      </div>
    </div>
  );
}

export default ReportFound;