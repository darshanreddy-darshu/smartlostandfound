import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";

import {
  calculateCosineSimilarity,
  similarityToPercentage,
} from "../lib/imageSimilarity";

// ============================================================
// TEXT SIMILARITY
// ============================================================

function textSimilarity(a = "", b = "") {
  const wordsA = new Set(
    String(a)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  );

  const wordsB = new Set(
    String(b)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  );

  if (!wordsA.size || !wordsB.size) {
    return 0;
  }

  let common = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      common++;
    }
  }

  return Math.round(
    (common / Math.max(wordsA.size, wordsB.size)) * 100
  );
}

// ============================================================
// LOCATION SIMILARITY
// ============================================================

function locationSimilarity(a = "", b = "") {
  const first = String(a).toLowerCase().trim();
  const second = String(b).toLowerCase().trim();

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 100;
  }

  return textSimilarity(first, second);
}

// ============================================================
// DATE SIMILARITY
// ============================================================

function dateSimilarity(lostDate, foundDate) {
  if (!lostDate || !foundDate) {
    return 0;
  }

  const lost = new Date(lostDate);
  const found = new Date(foundDate);

  if (
    Number.isNaN(lost.getTime()) ||
    Number.isNaN(found.getTime())
  ) {
    return 0;
  }

  const difference =
    Math.abs(found - lost) /
    (1000 * 60 * 60 * 24);

  if (difference === 0) {
    return 100;
  }

  if (difference <= 1) {
    return 90;
  }

  if (difference <= 3) {
    return 70;
  }

  if (difference <= 7) {
    return 45;
  }

  return 20;
}

// ============================================================
// TIME SIMILARITY
// ============================================================

function timeSimilarity(lostTime, foundTime) {
  if (!lostTime || !foundTime) {
    return 0;
  }

  const [lostHour, lostMinute] =
    String(lostTime).split(":").map(Number);

  const [foundHour, foundMinute] =
    String(foundTime).split(":").map(Number);

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

  if (difference <= 30) {
    return 100;
  }

  if (difference <= 60) {
    return 85;
  }

  if (difference <= 120) {
    return 65;
  }

  if (difference <= 240) {
    return 40;
  }

  return 15;
}

// ============================================================
// ANALYZE MATCH
// ============================================================

function analyzeMatch(lost, found) {
  let visualScore = 0;

  if (
    Array.isArray(lost.image_fingerprint) &&
    Array.isArray(found.image_fingerprint) &&
    lost.image_fingerprint.length > 0 &&
    found.image_fingerprint.length > 0 &&
    lost.image_fingerprint.length ===
      found.image_fingerprint.length
  ) {
    try {
      const similarity =
        calculateCosineSimilarity(
          lost.image_fingerprint,
          found.image_fingerprint
        );

      visualScore =
        similarityToPercentage(similarity);
    } catch (error) {
      console.error(
        "Visual similarity error:",
        error
      );
    }
  }

  const descriptionScore =
    textSimilarity(
      `${lost.item_name || ""} ${
        lost.description || ""
      } ${lost.characteristics || ""}`,
      `${found.item_name || ""} ${
        found.description || ""
      } ${found.characteristics || ""}`
    );

  const locationScore =
    locationSimilarity(
      lost.location,
      found.location
    );

  const dateScore =
    dateSimilarity(
      lost.lost_date,
      found.found_date
    );

  const timeScore =
    timeSimilarity(
      lost.lost_time,
      found.found_time
    );

  const finalScore = Math.round(
    visualScore * 0.45 +
      descriptionScore * 0.25 +
      locationScore * 0.15 +
      dateScore * 0.08 +
      timeScore * 0.07
  );

  return {
    visualScore,
    descriptionScore,
    locationScore,
    dateScore,
    timeScore,
    finalScore,
  };
}

// ============================================================
// MYSTERY MATCH
// ============================================================

function MysteryMatch() {
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [revealed, setRevealed] =
    useState(false);

  const [selectedMatch, setSelectedMatch] =
    useState(null);

  const [hasPrivateMatch, setHasPrivateMatch] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD ONLY MATCHES INVOLVING CURRENT USER
  // ==========================================================

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    setError("");
    setSelectedMatch(null);
    setHasPrivateMatch(false);

    try {
      // ========================================================
      // GET CURRENT USER
      // ========================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setLostItems([]);
        setFoundItems([]);
        return;
      }

      // ========================================================
      // LOAD ALL REPORTS
      // ========================================================
      //
      // We still load reports from different users because
      // SmartMatch must compare User A's lost item with
      // User B's found item.
      //
      // PRIVACY FILTERING happens after ownership is known.
      //

      const [
        { data: lostData, error: lostError },
        { data: foundData, error: foundError },
      ] = await Promise.all([
        supabase
          .from("lost_items")
          .select("*"),

        supabase
          .from("found_items")
          .select("*"),
      ]);

      if (lostError) {
        throw lostError;
      }

      if (foundError) {
        throw foundError;
      }

      const allLost =
        lostData || [];

      const allFound =
        foundData || [];

      // ========================================================
      // FIND ONLY MATCHES WHERE CURRENT USER OWNS ONE SIDE
      // ========================================================

      const privateLostItems =
        allLost.filter(
          (item) =>
            item.user_id === user.id
        );

      const privateFoundItems =
        allFound.filter(
          (item) =>
            item.user_id === user.id
        );

      /*
       * If the user owns neither a lost nor found report,
       * there is no private MysteryMatch to show.
       */

      if (
        privateLostItems.length === 0 &&
        privateFoundItems.length === 0
      ) {
        setLostItems([]);
        setFoundItems([]);
        setSelectedMatch(null);
        setHasPrivateMatch(false);
        return;
      }

      // ========================================================
      // GENERATE PRIVATE MATCHES
      // ========================================================

      const allMatches = [];

      // --------------------------------------------------------
      // CURRENT USER'S LOST ITEMS
      // against OTHER USERS' FOUND ITEMS
      // --------------------------------------------------------

      for (const lost of privateLostItems) {
        if (!lost.user_id) {
          continue;
        }

        for (const found of allFound) {
          if (!found.user_id) {
            continue;
          }

          // Never match the same user against themselves
          if (
            lost.user_id ===
            found.user_id
          ) {
            continue;
          }

          // Don't show returned items
          if (
            String(
              found.status || ""
            ).toLowerCase() ===
              "returned" ||
            String(
              found.claim_status || ""
            ).toLowerCase() ===
              "returned"
          ) {
            continue;
          }

          const scores =
            analyzeMatch(
              lost,
              found
            );

          // Only meaningful matches
          if (scores.finalScore < 55) {
            continue;
          }

          allMatches.push({
            lost,
            found,
            scores,
            viewerRole: "lost-owner",
          });
        }
      }

      // --------------------------------------------------------
      // CURRENT USER'S FOUND ITEMS
      // against OTHER USERS' LOST ITEMS
      // --------------------------------------------------------

      for (const found of privateFoundItems) {
        if (!found.user_id) {
          continue;
        }

        for (const lost of allLost) {
          if (!lost.user_id) {
            continue;
          }

          // Never match the same user against themselves
          if (
            lost.user_id ===
            found.user_id
          ) {
            continue;
          }

          // Don't show resolved found items
          if (
            String(
              found.status || ""
            ).toLowerCase() ===
              "returned" ||
            String(
              found.claim_status || ""
            ).toLowerCase() ===
              "returned"
          ) {
            continue;
          }

          const scores =
            analyzeMatch(
              lost,
              found
            );

          // Only meaningful matches
          if (scores.finalScore < 55) {
            continue;
          }

          allMatches.push({
            lost,
            found,
            scores,
            viewerRole: "found-owner",
          });
        }
      }

      // ========================================================
      // REMOVE DUPLICATES
      // ========================================================

      const uniqueMatches =
        allMatches.filter(
          (match, index, array) =>
            index ===
            array.findIndex(
              (other) =>
                other.lost.id ===
                  match.lost.id &&
                other.found.id ===
                  match.found.id
            )
        );

      // ========================================================
      // SORT BY SCORE
      // ========================================================

      uniqueMatches.sort(
        (a, b) =>
          b.scores.finalScore -
          a.scores.finalScore
      );

      // ========================================================
      // IMPORTANT FINAL PRIVACY CHECK
      // ========================================================
      //
      // Even after generating matches, verify that the
      // current user owns one side.
      //

      const userPrivateMatches =
        uniqueMatches.filter(
          (match) =>
            match.lost.user_id ===
              user.id ||
            match.found.user_id ===
              user.id
        );

      setLostItems(privateLostItems);
      setFoundItems(privateFoundItems);

      if (
        userPrivateMatches.length > 0
      ) {
        setSelectedMatch(
          userPrivateMatches[0]
        );

        setHasPrivateMatch(true);
      } else {
        setSelectedMatch(null);
        setHasPrivateMatch(false);
      }

    } catch (error) {
      console.error(
        "Mystery Match loading error:",
        error
      );

      setError(
        "Unable to load your private mystery match."
      );

      setSelectedMatch(null);
      setHasPrivateMatch(false);

    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  const confidence = useMemo(() => {
    if (!selectedMatch) {
      return "UNKNOWN";
    }

    const score =
      selectedMatch.scores.finalScore;

    if (score >= 75) {
      return "HIGH";
    }

    if (score >= 50) {
      return "MEDIUM";
    }

    return "LOW";
  }, [selectedMatch]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="form-page">
        <div className="form-container">

          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
            }}
          >

            <Brain size={42} />

            <h2>
              AI is searching for your
              mystery match...
            </h2>

            <p>
              Comparing your reports with
              other users' reports.
            </p>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="form-page">
        <div className="form-container">

          <Link
            to="/home"
            className="back-link"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
            }}
          >

            <Brain size={46} />

            <h1>
              Mystery Match
            </h1>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="submit-button"
              onClick={loadItems}
              style={{
                marginTop: "20px",
              }}
            >
              Try Again
            </button>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================================
  // NO PERSONAL REPORTS
  // ==========================================================

  if (
    lostItems.length === 0 &&
    foundItems.length === 0
  ) {
    return (
      <div className="form-page">
        <div className="form-container">

          <Link
            to="/home"
            className="back-link"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
            }}
          >

            <Sparkles size={46} />

            <h1>
              Mystery Match
            </h1>

            <p>
              You don't have a lost or found
              report yet. Once you create one,
              SmartMatch can search for a
              possible connection with another
              user.
            </p>

            <Link
              to="/report-lost"
              className="submit-button"
              style={{
                display: "inline-block",
                textDecoration: "none",
                marginTop: "20px",
              }}
            >
              Report a Lost Item
            </Link>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================================
  // NO PRIVATE MATCH
  // ==========================================================

  if (
    !hasPrivateMatch ||
    !selectedMatch
  ) {
    return (
      <div className="form-page">
        <div className="form-container">

          <Link
            to="/home"
            className="back-link"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <div
            style={{
              textAlign: "center",
              padding: "70px 20px",
            }}
          >

            <Sparkles size={48} />

            <p className="eyebrow">
              PRIVATE AI SEARCH
            </p>

            <h1>
              No mystery match yet
            </h1>

            <p
              style={{
                maxWidth: "620px",
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              SmartMatch checked your reports
              against other users' reports,
              but no sufficiently strong
              connection was found yet.
            </p>

            <p
              style={{
                marginTop: "14px",
                opacity: 0.7,
                fontSize: "14px",
              }}
            >
              Other users' private matches are
              never shown here.
            </p>

            <Link
              to="/matches"
              className="submit-button"
              style={{
                display: "inline-block",
                textDecoration: "none",
                marginTop: "24px",
              }}
            >
              View SmartMatch Dashboard
            </Link>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================================
  // SELECTED MATCH
  // ==========================================================

  const {
    lost,
    found,
    scores,
  } = selectedMatch;

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div className="form-page">

      <div
        className="form-container"
        style={{
          maxWidth: "1000px",
        }}
      >

        {/* BACK */}

        <Link
          to="/home"
          className="back-link"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        {/* HEADER */}

        <div
          className="form-header"
          style={{
            textAlign: "center",
          }}
        >

          <div className="form-icon">
            <Sparkles size={28} />
          </div>

          <p className="eyebrow">
            PRIVATE AI MYSTERY MATCH
          </p>

          <h1>
            Can AI find your connection?
          </h1>

          <p>
            We compared your report with
            reports from other users using
            AI photo fingerprints,
            descriptions, locations and timing.
          </p>

          <div
            style={{
              marginTop: "14px",
              fontSize: "13px",
              opacity: 0.7,
            }}
          >
            🔒 This mystery match is visible
            only to the owners of the matched
            reports.
          </div>

        </div>

        {/* MYSTERY CARDS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginTop: "30px",
          }}
        >

          {/* LOST */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "20px",
              background: "#ffffff",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >

              <strong>
                LOST ITEM
              </strong>

              {revealed ? (
                <Eye size={19} />
              ) : (
                <EyeOff size={19} />
              )}

            </div>

            {revealed &&
            lost.image_url ? (
              <img
                src={lost.image_url}
                alt={lost.item_name}
                style={{
                  width: "100%",
                  height: "230px",
                  objectFit: "cover",
                  borderRadius: "14px",
                  marginBottom: "16px",
                }}
              />
            ) : (
              <div
                style={{
                  height: "230px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #111827, #374151)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "50px",
                  marginBottom: "16px",
                }}
              >
                ?
              </div>
            )}

            {revealed && (
              <>
                <h3>
                  {lost.item_name}
                </h3>

                <p>
                  {lost.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  <MapPin size={16} />
                  {lost.location}
                </div>
              </>
            )}

          </div>

          {/* FOUND */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "20px",
              background: "#ffffff",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >

              <strong>
                FOUND ITEM
              </strong>

              {revealed ? (
                <Eye size={19} />
              ) : (
                <EyeOff size={19} />
              )}

            </div>

            {revealed &&
            found.image_url ? (
              <img
                src={found.image_url}
                alt={found.item_name}
                style={{
                  width: "100%",
                  height: "230px",
                  objectFit: "cover",
                  borderRadius: "14px",
                  marginBottom: "16px",
                }}
              />
            ) : (
              <div
                style={{
                  height: "230px",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, #111827, #374151)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "50px",
                  marginBottom: "16px",
                }}
              >
                ?
              </div>
            )}

            {revealed && (
              <>
                <h3>
                  {found.item_name}
                </h3>

                <p>
                  {found.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "12px",
                  }}
                >
                  <MapPin size={16} />
                  {found.location}
                </div>
              </>
            )}

          </div>

        </div>

        {/* REVEAL BUTTON */}

        {!revealed && (
          <button
            type="button"
            className="submit-button"
            onClick={() =>
              setRevealed(true)
            }
            style={{
              marginTop: "25px",
            }}
          >

            <Sparkles
              size={19}
              style={{
                verticalAlign: "middle",
                marginRight: "8px",
              }}
            />

            Reveal Mystery Match

          </button>
        )}

        {/* RESULTS */}

        {revealed && (
          <div
            style={{
              marginTop: "30px",
            }}
          >

            {/* CONFIDENCE */}

            <div
              style={{
                textAlign: "center",
                padding: "25px",
                borderRadius: "18px",
                background: "#f3f4f6",
                marginBottom: "22px",
              }}
            >

              <CheckCircle2 size={38} />

              <p
                className="eyebrow"
                style={{
                  marginTop: "12px",
                }}
              >
                MATCH CONFIDENCE
              </p>

              <h1
                style={{
                  fontSize: "52px",
                  margin: "5px 0",
                }}
              >
                {scores.finalScore}%
              </h1>

              <strong>
                {confidence} CONFIDENCE
              </strong>

            </div>

            {/* SCORE BREAKDOWN */}

            <h2>
              Why did AI make this match?
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >

              <ScoreCard
                icon={<Brain size={20} />}
                title="AI Visual"
                score={scores.visualScore}
              />

              <ScoreCard
                icon={<Sparkles size={20} />}
                title="Description"
                score={scores.descriptionScore}
              />

              <ScoreCard
                icon={<MapPin size={20} />}
                title="Location"
                score={scores.locationScore}
              />

              <ScoreCard
                icon={<Calendar size={20} />}
                title="Date"
                score={scores.dateScore}
              />

              <ScoreCard
                icon={<Clock size={20} />}
                title="Time"
                score={scores.timeScore}
              />

            </div>

            {/* AI EXPLANATION */}

            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                borderRadius: "16px",
                border:
                  "1px solid #e5e7eb",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >

                <Zap size={20} />

                <strong>
                  AI Match Explanation
                </strong>

              </div>

              <p
                style={{
                  lineHeight: 1.7,
                  marginTop: "12px",
                }}
              >
                The system found a{" "}
                <strong>
                  {scores.visualScore}%
                </strong>{" "}
                visual similarity between the
                item photos. Text descriptions had
                a{" "}
                <strong>
                  {scores.descriptionScore}%
                </strong>{" "}
                similarity, while location and
                timing were also considered.
              </p>

              <p
                style={{
                  fontSize: "13px",
                  opacity: 0.7,
                  marginTop: "12px",
                }}
              >
                AI similarity is a matching aid,
                not proof of ownership. Users
                should verify identifying details
                before returning an item.
              </p>

            </div>

            {/* ACTION */}

            <Link
              to="/matches"
              className="submit-button"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: "22px",
              }}
            >
              View Full Match Dashboard
            </Link>

          </div>
        )}

      </div>

    </div>
  );
}

// ============================================================
// SCORE CARD
// ============================================================

function ScoreCard({
  icon,
  title,
  score,
}) {
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "14px",
        background: "#f9fafb",
        border:
          "1px solid #e5e7eb",
      }}
    >

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >

        {icon}

        <span>
          {title}
        </span>

      </div>

      <strong
        style={{
          fontSize: "26px",
        }}
      >
        {score}%
      </strong>

    </div>
  );
}

export default MysteryMatch;