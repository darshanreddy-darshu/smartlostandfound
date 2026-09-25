const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());


// ======================================================
// SUPABASE
// ======================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(
    supabaseUrl,
    supabaseKey
  );
}


// ======================================================
// HELPER
// ======================================================

function checkSupabase(res) {
  if (!supabase) {
    res.status(500).json({
      error: "Supabase is not configured on the backend.",
    });

    return false;
  }

  return true;
}


// ======================================================
// HOME / HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "Smart Lost & Found AI server is running",
    status: "online",
  });
});


// ======================================================
// GET LOST ITEMS
// ======================================================

app.get("/api/lost", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { data, error } = await supabase
      .from("lost_items")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Get lost items error:", error);

      return res.status(500).json({
        error: "Failed to fetch lost items.",
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// GET FOUND ITEMS
// ======================================================

app.get("/api/found", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { data, error } = await supabase
      .from("found_items")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Get found items error:", error);

      return res.status(500).json({
        error: "Failed to fetch found items.",
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// CLAIM FOUND ITEM
// ======================================================

app.post("/api/found/:id/claim", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { id } = req.params;

    // Check that the item exists
    const { data: item, error: findError } =
      await supabase
        .from("found_items")
        .select("*")
        .eq("id", id)
        .single();

    if (findError || !item) {
      return res.status(404).json({
        error: "Found item not found.",
      });
    }

    // Already returned
    if (item.returned === true) {
      return res.status(400).json({
        error: "This item has already been returned.",
      });
    }

    // Already being claimed
    if (item.claim_status === "pending") {
      return res.status(400).json({
        error: "This item already has a pending claim.",
      });
    }

    // Already verified
    if (item.claim_status === "verified") {
      return res.status(400).json({
        error: "This item has already been verified.",
      });
    }

    const { data, error } = await supabase
      .from("found_items")
      .update({
        claimed: true,
        claim_status: "pending",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Claim error:", error);

      return res.status(500).json({
        error: "Failed to submit claim.",
      });
    }

    res.json({
      success: true,
      message: "Claim request submitted successfully.",
      item: data,
    });
  } catch (error) {
    console.error("Claim server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// VERIFY CLAIM
// ======================================================

app.patch("/api/found/:id/verify", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { id } = req.params;

    const { data: item, error: findError } =
      await supabase
        .from("found_items")
        .select("*")
        .eq("id", id)
        .single();

    if (findError || !item) {
      return res.status(404).json({
        error: "Found item not found.",
      });
    }

    if (item.returned === true) {
      return res.status(400).json({
        error: "This item has already been returned.",
      });
    }

    if (item.claim_status !== "pending") {
      return res.status(400).json({
        error:
          "Only pending claims can be verified.",
      });
    }

    const { data, error } = await supabase
      .from("found_items")
      .update({
        claimed: true,
        claim_status: "verified",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Verification error:", error);

      return res.status(500).json({
        error: "Failed to verify claim.",
      });
    }

    res.json({
      success: true,
      message: "Claim verified successfully.",
      item: data,
    });
  } catch (error) {
    console.error("Verification server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// REJECT CLAIM
// ======================================================

app.patch("/api/found/:id/reject", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { id } = req.params;

    const { data: item, error: findError } =
      await supabase
        .from("found_items")
        .select("*")
        .eq("id", id)
        .single();

    if (findError || !item) {
      return res.status(404).json({
        error: "Found item not found.",
      });
    }

    if (item.returned === true) {
      return res.status(400).json({
        error: "This item has already been returned.",
      });
    }

    if (item.claim_status !== "pending") {
      return res.status(400).json({
        error:
          "Only pending claims can be rejected.",
      });
    }

    const { data, error } = await supabase
      .from("found_items")
      .update({
        claimed: false,
        claim_status: "rejected",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Reject claim error:", error);

      return res.status(500).json({
        error: "Failed to reject claim.",
      });
    }

    res.json({
      success: true,
      message: "Claim rejected.",
      item: data,
    });
  } catch (error) {
    console.error("Reject server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// MARK ITEM AS RETURNED
// ======================================================

app.patch("/api/found/:id/returned", async (req, res) => {
  try {
    if (!checkSupabase(res)) return;

    const { id } = req.params;

    const { data: item, error: findError } =
      await supabase
        .from("found_items")
        .select("*")
        .eq("id", id)
        .single();

    if (findError || !item) {
      return res.status(404).json({
        error: "Found item not found.",
      });
    }

    if (item.returned === true) {
      return res.status(400).json({
        error: "This item is already marked as returned.",
      });
    }

    if (item.claim_status !== "verified") {
      return res.status(400).json({
        error:
          "The claim must be verified before returning the item.",
      });
    }

    const { data, error } = await supabase
      .from("found_items")
      .update({
        claimed: true,
        claim_status: "verified",
        returned: true,
        returned_at: new Date().toISOString(),
        status: "returned",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Return item error:", error);

      return res.status(500).json({
        error: "Failed to mark item as returned.",
      });
    }

    res.json({
      success: true,
      message:
        "Item successfully marked as returned.",
      item: data,
    });
  } catch (error) {
    console.error("Returned server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// AI MATCH ANALYSIS
// ======================================================

app.post("/api/analyze-match", async (req, res) => {
  try {
    const { lostItem, foundItem } = req.body;

    if (!lostItem || !foundItem) {
      return res.status(400).json({
        error:
          "Both lostItem and foundItem are required.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error:
          "AI service is not configured. Use the built-in SmartMatch engine.",
      });
    }

    const prompt = `
You are the AI matching agent for a college Smart Lost & Found system.

Compare the LOST item with the FOUND item.

LOST ITEM:
Name: ${lostItem.item_name || ""}
Description: ${lostItem.description || ""}
Location: ${lostItem.location || ""}
Date: ${lostItem.lost_date || ""}
Time: ${lostItem.lost_time || ""}
Characteristics: ${lostItem.characteristics || ""}

FOUND ITEM:
Name: ${foundItem.item_name || ""}
Description: ${foundItem.description || ""}
Location: ${foundItem.location || ""}
Date: ${foundItem.found_date || ""}
Time: ${foundItem.found_time || ""}
Characteristics: ${foundItem.characteristics || ""}

Analyze:
- Item/name similarity
- Description similarity
- Location similarity
- Identifying characteristics
- Date relationship
- Time relationship

Return ONLY valid JSON:

{
  "match_score": 0,
  "confidence": "LOW",
  "reason": "Short explanation."
}

match_score must be an integer from 0 to 100.

confidence must be exactly:
LOW
MEDIUM
HIGH
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt,
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        response.status,
        responseText
      );

      return res.status(500).json({
        error: "OpenAI API request failed.",
      });
    }

    const data = JSON.parse(responseText);

    const aiText =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    let result;

    try {
      result = JSON.parse(aiText);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON.",
      });
    }

    const score = Math.max(
      0,
      Math.min(
        100,
        Number(result.match_score) || 0
      )
    );

    const confidence =
      ["LOW", "MEDIUM", "HIGH"].includes(
        result.confidence
      )
        ? result.confidence
        : "LOW";

    res.json({
      match_score: score,
      confidence,
      reason:
        result.reason ||
        "No detailed explanation was provided.",
    });
  } catch (error) {
    console.error("AI server error:", error);

    res.status(500).json({
      error: "Internal server error.",
    });
  }
});


// ======================================================
// START SERVER
// ======================================================

const PORT = 3001;

app.listen(PORT, () => {
  console.log(
    `Smart Lost & Found AI server running on http://localhost:${PORT}`
  );

  console.log(
    supabase
      ? "Supabase connection configured."
      : "WARNING: Supabase is NOT configured."
  );

  console.log(
    process.env.OPENAI_API_KEY
      ? "OpenAI API key loaded."
      : "OpenAI API key not configured - local SmartMatch can still work."
  );
});