import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

// Helper to compute range for pagination
function getRange(page = 1, limit = 10) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return [from, to];
}

// ---------------- GLOBAL LEADERBOARD ----------------
router.get("/global", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_global")
      .select("*")
      .order("avg_wpm", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GLOBAL BEST PERFORMANCE ----------------
router.get("/global-best", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_global_best")
      .select("*")
      .order("best_wpm", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GLOBAL AVERAGE PERFORMANCE ----------------
router.get("/global-avg", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_global_avg")
      .select("*")
      .order("avg_wpm", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ALL RACES ----------------
router.get("/admin/race/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_per_race")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PER-RACE LEADERBOARD ----------------
router.get("/race/:raceId", async (req, res) => {
  const { raceId } = req.params;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_per_race")
      .select("*")
      .eq("race_id", raceId)
      .order("wpm", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- WEEKLY LEADERBOARD ----------------
router.get("/weekly", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [from, to] = getRange(page, limit);

    const { data, error } = await supabase
      .from("leaderboard_weekly")
      .select("*")
      .order("avg_wpm", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
