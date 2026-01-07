import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

router.get("/:userId/races", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("leaderboard_per_race")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
