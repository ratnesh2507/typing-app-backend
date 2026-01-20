// routes/races.js
import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/**
 * GET /races/:raceId/details
 * Full details for a completed race
 */
router.get("/:raceId/details", async (req, res) => {
  const { raceId } = req.params;

  try {
    // 1️⃣ Fetch race metadata
    const { data: race, error: raceError } = await supabase
      .from("races")
      .select("id, room_id, text, started_at, finished_at")
      .eq("id", raceId)
      .single();

    if (raceError || !race) {
      return res.status(404).json({ error: "Race not found" });
    }

    // 2️⃣ Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from("race_participants")
      .select(
        `
        user_id,
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

    if (participantsError) {
      throw participantsError;
    }

    res.json({
      race: {
        ...race,
        total_players: participants.length,
      },
      participants,
    });
  } catch (err) {
    console.error("[RACE DETAILS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch race details" });
  }
});

export default router;
