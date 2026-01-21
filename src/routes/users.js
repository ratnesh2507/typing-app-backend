import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

/* =====================================================
   Sync user on login
   POST /users/sync
===================================================== */
router.post("/sync", async (req, res) => {
  const { clerkId, username, email } = req.body;

  if (!clerkId || !username) {
    return res.status(400).json({ error: "Missing user data" });
  }

  try {
    const { error } = await supabase.from("users").upsert(
      {
        id: clerkId,
        username,
        email: email ?? null,
      },
      { onConflict: "id" },
    );

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("[USERS] Sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

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
