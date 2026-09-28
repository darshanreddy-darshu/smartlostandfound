import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Package,
  Brain,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { supabase } from "../services/supabase";
import { generateImageFingerprint } from "../lib/imageFingerprint";
import SmartMatchLoader from "../components/SmartMatchLoader";

/* =========================================================
   TEXT SIMILARITY
========================================================= */

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textSimilarity(a, b) {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) return 0;
  if (first === second) return 1;

  const firstWords = new Set(first.split(" "));
  const secondWords = new Set(second.split(" "));

  let common = 0;

  firstWords.forEach((word) => {
    if (secondWords.has(word)) {
      common++;
    }
  });

  const total = new Set([
    ...firstWords,
    ...secondWords,
  ]).size;

  if (total === 0) return 0;

  return common / total;
}

/* =========================================================
   LOCATION SIMILARITY
========================================================= */

function locationSimilarity(a, b) {
  const first = normalizeText(a);
  const second = normalizeText(b);

  if (!first || !second) return 0;

  if (first === second) return 1;

  if (
    first.includes(second) ||
    second.includes(first)
  ) {
    return 0.9;
  }

  return textSimilarity(first, second);
}

/* =========================================================
   DATE SIMILARITY
========================================================= */

function dateSimilarity(lostDate, foundDate) {
  if (!lostDate || !foundDate) return 0;

  const lost = new Date(lostDate);
  const found = new Date(foundDate);

  if (
    Number.isNaN(lost.getTime()) ||
    Number.isNaN(found.getTime())
  ) {
    return 0;
  }

  const difference =
    Math.abs(lost.getTime() - found.getTime()) /
    (1000 * 60 * 60 * 24);

  if (difference === 0) return 1;
  if (difference <= 1) return 0.8;
  if (difference <= 3) return 0.5;
  if (difference <= 7) return 0.25;

  return 0;
}

/* =========================================================
   TIME SIMILARITY
========================================================= */

function timeSimilarity(lostTime, foundTime) {
  if (!lostTime || !foundTime) return 0;

  const [lostHour, lostMinute] = String(lostTime)
    .split(":")
    .map(Number);

  const [foundHour, foundMinute] = String(foundTime)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(lostHour) ||
    Number.isNaN(lostMinute) ||
    Number.isNaN(foundHour) ||
    Number.isNaN(foundMinute)
  ) {
    return 0;
  }

  const lostMinutes =
    lostHour * 60 + lostMinute;

  const foundMinutes =
    foundHour * 60 + foundMinute;

  const difference = Math.abs(
    lostMinutes - foundMinutes
  );

  if (difference <= 15) return 1;
  if (difference <= 30) return 0.8;
  if (difference <= 60) return 0.55;
  if (difference <= 180) return 0.25;

  return 0;
}

/* =========================================================
   VISUAL AI MATCH
========================================================= */

function analyzeVisualMatch(lostItem, foundItem) {
  if (
    !lostItem.image_fingerprint ||
    !foundItem.image_fingerprint
  ) {
    return null;
  }

  try {
    const lostFingerprint =
      lostItem.image_fingerprint;

    const foundFingerprint =
      foundItem.image_fingerprint;

    if (
      !Array.isArray(lostFingerprint) ||
      !Array.isArray(foundFingerprint)
    ) {
      return null;
    }

    if (
      lostFingerprint.length === 0 ||
      foundFingerprint.length === 0
    ) {
      return null;
    }

    if (
      lostFingerprint.length !==
      foundFingerprint.length
    ) {
      return null;
    }

    let dotProduct = 0;
    let lostMagnitude = 0;
    let foundMagnitude = 0;

    for (
      let i = 0;
      i < lostFingerprint.length;
      i++
    ) {
      const a = Number(lostFingerprint[i]);
      const b = Number(foundFingerprint[i]);

      dotProduct += a * b;
      lostMagnitude += a * a;
      foundMagnitude += b * b;
    }

    if (
      lostMagnitude === 0 ||
      foundMagnitude === 0
    ) {
      return null;
    }

    const similarity =
      dotProduct /
      (
        Math.sqrt(lostMagnitude) *
        Math.sqrt(foundMagnitude)
      );

    return Math.max(
      0,
      Math.min(100, similarity * 100)
    );
  } catch (error) {
    console.error(
      "Visual similarity failed:",
      error
    );

    return null;
  }
}

/* =========================================================
   FULL MATCH ANALYSIS
========================================================= */

function analyzeMatch(lostItem, foundItem) {
  const visualScore =
    analyzeVisualMatch(
      lostItem,
      foundItem
    );

  const descriptionScore =
    textSimilarity(
      `${lostItem.item_name} ${
        lostItem.description || ""
      } ${
        lostItem.characteristics || ""
      }`,
      `${foundItem.item_name} ${
        foundItem.description || ""
      } ${
        foundItem.characteristics || ""
      }`
    );

  const locationScore =
    locationSimilarity(
      lostItem.location,
      foundItem.location
    );

  const dateScore =
    dateSimilarity(
      lostItem.lost_date,
      foundItem.found_date
    );

  const timeScore =
    timeSimilarity(
      lostItem.lost_time,
      foundItem.found_time
    );

  let finalScore;

  if (visualScore !== null) {
    finalScore =
      visualScore * 0.3 +
      descriptionScore * 100 * 0.4 +
      locationScore * 100 * 0.15 +
      dateScore * 100 * 0.1 +
      timeScore * 100 * 0.05;
  } else {
    finalScore =
      descriptionScore * 100 * 0.55 +
      locationScore * 100 * 0.2 +
      dateScore * 100 * 0.15 +
      timeScore * 100 * 0.1;
  }

  return Math.round(
    Math.max(
      0,
      Math.min(100, finalScore)
    )
  );
}

/* =========================================================
   COMPONENT
========================================================= */

function ReportFound() {
  const [form, setForm] = useState({
    itemName: "",
    description: "",
    location: "",
    foundDate: "",
    foundTime: "",
    characteristics: "",
  });

  const [verificationCount, setVerificationCount] =
    useState(1);

  const [verificationQA, setVerificationQA] =
    useState([
      {
        question: "",
        answer: "",
      },
    ]);

  const [image, setImage] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /* =======================================================
     VERIFICATION QUESTIONS
  ======================================================= */

  function handleVerificationCountChange(e) {
    const count = Number(e.target.value);

    setVerificationCount(count);

    setVerificationQA((previous) => {
      const next = [...previous];

      while (next.length < count) {
        next.push({
          question: "",
          answer: "",
        });
      }

      return next.slice(0, count);
    });
  }

  function handleVerificationFieldChange(
    index,
    field,
    value
  ) {
    setVerificationQA((previous) =>
      previous.map((qa, i) =>
        i === index
          ? {
              ...qa,
              [field]: value,
            }
          : qa
      )
    );
  }

  /* =======================================================
     AUTOMATIC SMARTMATCH ALERT
  ======================================================= */

  async function createSmartMatchAlerts(
    foundItemId,
    foundItem
  ) {
    try {
      setStatusMessage(
        "Searching for possible lost-item matches..."
      );

      const {
        data: lostItems,
        error: lostError,
      } = await supabase
        .from("lost_items")
        .select("*");

      if (lostError) {
        console.error(
          "Lost item loading error:",
          lostError
        );

        return;
      }

      if (!lostItems || lostItems.length === 0) {
        console.log(
          "No lost reports available for matching."
        );

        return;
      }

      const possibleMatches = [];

      for (const lostItem of lostItems) {
        /*
         * Never match the same user with themselves.
         */
        if (
          !lostItem.user_id ||
          lostItem.user_id === foundItem.user_id
        ) {
          continue;
        }

        /*
         * Skip reports without a valid image fingerprint.
         */
        if (
          !lostItem.image_fingerprint ||
          !foundItem.image_fingerprint
        ) {
          continue;
        }

        const score =
          analyzeMatch(
            lostItem,
            foundItem
          );

        /*
         * Only create a notification for
         * strong/possible matches.
         */
        if (score >= 75) {
          possibleMatches.push({
            lostItem,
            score,
          });
        }
      }

      if (possibleMatches.length === 0) {
        console.log(
          "No strong SmartMatch found."
        );

        return;
      }

      /*
       * Load existing alerts so we don't
       * create duplicate notifications.
       */
      const {
        data: existingAlerts,
        error: existingError,
      } = await supabase
        .from("match_alerts")
        .select(
          "lost_item_id, found_item_id"
        );

      if (existingError) {
        console.error(
          "Existing alert loading error:",
          existingError
        );
      }

      const existing =
        existingAlerts || [];

      const newAlerts = [];

      for (const match of possibleMatches) {
        const alreadyExists =
          existing.some(
            (alert) =>
              alert.lost_item_id ===
                match.lostItem.id &&
              alert.found_item_id ===
                foundItemId
          );

        if (alreadyExists) {
          continue;
        }

        newAlerts.push({
          lost_item_id:
            match.lostItem.id,

          found_item_id:
            foundItemId,

          match_score:
            match.score,

          alert_message:
            `Your lost item "${match.lostItem.item_name}" may have been found. SmartMatch detected a ${match.score}% possible match with a found report.`,
        });
      }

      if (newAlerts.length === 0) {
        return;
      }

      const {
        error: alertInsertError,
      } = await supabase
        .from("match_alerts")
        .insert(newAlerts);

      if (alertInsertError) {
        console.error(
          "SmartMatch alert creation error:",
          alertInsertError
        );

        return;
      }

      console.log(
        `Created ${newAlerts.length} SmartMatch alert(s).`
      );
    } catch (error) {
      console.error(
        "Automatic SmartMatch error:",
        error
      );
    }
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      alert(
        "Please upload an item photo."
      );

      return;
    }

    const incompleteVerification =
      verificationQA.some(
        (qa) =>
          !qa.question.trim() ||
          !qa.answer.trim()
      );

    if (incompleteVerification) {
      alert(
        "Please fill in every verification question and its answer before submitting."
      );

      return;
    }

    setLoading(true);
    setStatusMessage(
      "Verifying your account..."
    );

    try {
      /* --------------------------------
         1. CURRENT USER
      -------------------------------- */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (
        !session ||
        !session.user
      ) {
        alert(
          "Your login session has expired. Please login again."
        );

        return;
      }

      const user =
        session.user;

      /* --------------------------------
         2. UPLOAD IMAGE
      -------------------------------- */

      setStatusMessage(
        "Uploading item photo..."
      );

      const fileName =
        `${Date.now()}-${image.name}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("item-images")
        .upload(
          fileName,
          image
        );

      if (uploadError) {
        throw uploadError;
      }

      /* --------------------------------
         3. PUBLIC IMAGE URL
      -------------------------------- */

      setStatusMessage(
        "Preparing image for SmartMatch..."
      );

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("item-images")
        .getPublicUrl(
          fileName
        );

      const imageUrl =
        publicUrlData.publicUrl;

      /* --------------------------------
         4. AI FINGERPRINT
      -------------------------------- */

      setStatusMessage(
        "AI is analyzing the photo..."
      );

      const imageFingerprint =
        await generateImageFingerprint(
          imageUrl
        );

      /* --------------------------------
         5. SAVE FOUND ITEM
      -------------------------------- */

      setStatusMessage(
        "Saving your found item report..."
      );

      const foundItem = {
        user_id: user.id,

        item_name:
          form.itemName,

        description:
          form.description,

        location:
          form.location,

        found_date:
          form.foundDate,

        found_time:
          form.foundTime,

        characteristics:
          form.characteristics,

        image_url:
          imageUrl,

        image_fingerprint:
          imageFingerprint,

        status:
          "found",

        claim_status:
          "available",

        verification_questions:
          verificationQA.map(
            (qa) =>
              qa.question.trim()
          ),

        verification_answers:
          verificationQA.map(
            (qa) =>
              qa.answer.trim()
          ),
      };

      const {
        data: insertedFoundItem,
        error: insertError,
      } = await supabase
        .from("found_items")
        .insert([
          foundItem,
        ])
        .select(
          "id, user_id, item_name, description, location, found_date, found_time, characteristics, image_url, image_fingerprint, claim_status"
        )
        .single();

      if (insertError) {
        console.error(
          "DATABASE INSERT ERROR:",
          insertError
        );

        throw insertError;
      }

      console.log(
        "FOUND ITEM SAVED:",
        insertedFoundItem
      );

      /* --------------------------------
         6. AUTOMATIC SMARTMATCH
      -------------------------------- */

      await createSmartMatchAlerts(
        insertedFoundItem.id,
        {
          ...foundItem,
          id: insertedFoundItem.id,
        }
      );

      /* --------------------------------
         7. SUCCESS
      -------------------------------- */

      setStatusMessage(
        "Found item submitted successfully!"
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            700
          )
      );

      alert(
        "Found item submitted successfully!\n\nSmartMatch has checked existing lost reports."
      );

      setForm({
        itemName: "",
        description: "",
        location: "",
        foundDate: "",
        foundTime: "",
        characteristics: "",
      });

      setVerificationCount(1);

      setVerificationQA([
        {
          question: "",
          answer: "",
        },
      ]);

      setImage(null);

      setStatusMessage("");

      const fileInput =
        document.getElementById(
          "found-image"
        );

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
          error.message ||
          "Please try again."
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

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

  /* =======================================================
     UI
  ======================================================= */

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
                setImage(
                  e.target.files[0]
                )
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

          {/* OWNERSHIP VERIFICATION */}

          <div
            className="form-group"
            style={{
              padding: "16px",
              borderRadius: "12px",
              border:
                "1px dashed rgba(91, 76, 58, 0.3)",
            }}
          >

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ShieldCheck size={16} />

              Set verification questions
              (required)
            </label>

            <p
              style={{
                fontSize: "12px",
                color: "#71685b",
                margin:
                  "4px 0 16px",
                lineHeight: 1.5,
              }}
            >
              Ask something only the real owner
              would know. Whoever claims this item
              must answer every question correctly.
            </p>

            <div
              style={{
                marginBottom: "18px",
              }}
            >

              <label
                style={{
                  marginBottom: "6px",
                }}
              >
                How many questions do you
                want to add?
              </label>

              <select
                value={verificationCount}
                onChange={
                  handleVerificationCountChange
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (n) => (
                    <option
                      key={n}
                      value={n}
                    >
                      {n} question
                      {n > 1
                        ? "s"
                        : ""}
                    </option>
                  )
                )}
              </select>

            </div>

            {verificationQA.map(
              (qa, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom:
                      index ===
                      verificationQA.length - 1
                        ? 0
                        : "16px",

                    paddingBottom:
                      index ===
                      verificationQA.length - 1
                        ? 0
                        : "16px",

                    borderBottom:
                      index ===
                      verificationQA.length - 1
                        ? "none"
                        : "1px solid rgba(91, 76, 58, 0.15)",
                  }}
                >

                  <label
                    style={{
                      fontSize: "11px",
                      marginBottom: "6px",
                      color: "#8b4d32",
                    }}
                  >
                    QUESTION {index + 1}
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. What sticker is on the laptop lid?"
                    value={qa.question}
                    onChange={(e) =>
                      handleVerificationFieldChange(
                        index,
                        "question",
                        e.target.value
                      )
                    }
                    required
                    style={{
                      marginBottom:
                        "10px",
                    }}
                  />

                  <input
                    type="text"
                    placeholder="The correct answer (only you will see this)"
                    value={qa.answer}
                    onChange={(e) =>
                      handleVerificationFieldChange(
                        index,
                        "answer",
                        e.target.value
                      )
                    }
                    required
                  />

                </div>
              )
            )}

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
              ? statusMessage ||
                "Processing..."
              : "Find Owner"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default ReportFound;