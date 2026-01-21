import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/* =====================================================
   User race history (Dashboard / PastResults)
   GET /races/user/:identifier?limit=20

   identifier can be:
   - clerk_id (preferred)
   - username (legacy fallback)
===================================================== */
router.get("/user/:identifier", async (req, res) => {
  const { identifier } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  try {
    /* ---------------------------------------------
       1️⃣ Try clerk_id first (primary identity)
    --------------------------------------------- */
    let { data, error } = await supabase
      .from("race_participants")
      .select(
        `
        race_id,
        wpm,
        accuracy,
        finished,
        disqualified,
        finish_time,
        cheat_flags
      `,
      )
      .eq("clerk_id", identifier)
      .order("finish_time", { ascending: false })
      .limit(limit);

    if (error) throw error;

    /* ---------------------------------------------
       2️⃣ Fallback to username (legacy data)
    --------------------------------------------- */
    if (!data || data.length === 0) {
      const fallback = await supabase
        .from("race_participants")
        .select(
          `
          race_id,
          wpm,
          accuracy,
          finished,
          disqualified,
          finish_time,
          cheat_flags
        `,
        )
        .eq("username", identifier)
        .order("finish_time", { ascending: false })
        .limit(limit);

      if (fallback.error) throw fallback.error;

      data = fallback.data;
    }

    res.json(data);
  } catch (err) {
    console.error("[RACES] User history error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Single race details (unchanged)
   GET /races/:raceId/details
===================================================== */
router.get("/:raceId/details", async (req, res) => {
  const { raceId } = req.params;

  try {
    // --- Fetch race meta ---
    const { data: race, error: raceError } = await supabase
      .from("races")
      .select("*")
      .eq("id", raceId)
      .single();

    if (raceError) throw raceError;

    // --- Fetch participants ---
    const { data: participants, error: participantsError } = await supabase
      .from("race_participants")
      .select(
        `
        clerk_id,
        username,
        wpm,
        accuracy,
        chars_typed,
        correct_chars,
        finished,
        disqualified,
        finish_time,
        cheat_flags
      `,
      )
      .eq("race_id", raceId)
      .order("wpm", { ascending: false });

    if (participantsError) throw participantsError;

    res.json({ race, participants });
  } catch (err) {
    console.error("[RACES] Race details error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
