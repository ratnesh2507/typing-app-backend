import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/* =====================================================
   User stats (Dashboard header, profile, analytics)
   GET /users/:clerkId/stats
===================================================== */
router.get("/:clerkId/stats", async (req, res) => {
  const { clerkId } = req.params;

  try {
    const { data, error } = await supabase
      .from("race_participants")
      .select(
        `
        wpm,
        accuracy,
        finished,
        disqualified
      `,
      )
      .eq("clerk_id", clerkId);

    if (error) throw error;

    const totalRaces = data.length;
    const finishedRaces = data.filter((r) => r.finished && !r.disqualified);

    const bestWpm = finishedRaces.length
      ? Math.max(...finishedRaces.map((r) => r.wpm))
      : 0;

    const avgWpm = finishedRaces.length
      ? Math.round(
          finishedRaces.reduce((s, r) => s + r.wpm, 0) / finishedRaces.length,
        )
      : 0;

    const avgAccuracy = finishedRaces.length
      ? Math.round(
          finishedRaces.reduce((s, r) => s + r.accuracy, 0) /
            finishedRaces.length,
        )
      : 0;

    res.json({
      totalRaces,
      finishedRaces: finishedRaces.length,
      bestWpm,
      avgWpm,
      avgAccuracy,
    });
  } catch (err) {
    console.error("[USERS] Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
