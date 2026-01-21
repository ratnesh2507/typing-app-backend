import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/* =====================================================
   User race history (Dashboard / PastResults)
   GET /races/user/:clerkId?limit=20
===================================================== */
router.get("/user/:clerkId", async (req, res) => {
  const { clerkId } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const { data, error } = await supabase
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
      .eq("clerk_id", clerkId)
      .order("finish_time", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("[RACES] User history error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Single race details (PastRaceDetailsPage)
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

    res.json({
      race,
      participants,
    });
  } catch (err) {
    console.error("[RACES] Race details error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
