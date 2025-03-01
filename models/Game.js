import mongoose from "mongoose"

const qbSchema = new mongoose.Schema({
  id: { required: true, type: String },
  name: { required: true, type: String },
})

export const recordSchema = new mongoose.Schema({
  losses: { required: true, type: Number },
  streak: { required: true, type: Number }, // < 0 for loss streak, 0 for week 1, > 0 for win streak
  ties: { required: true, type: Number },
  wins: { required: true, type: Number },
})

const teamSchema = new mongoose.Schema({
  coach: { required: true, type: String },
  moneyline: { type: Number },
  qb: { required: true, type: qbSchema },
  record: { required: true, type: recordSchema },
  restDays: { required: true, type: Number },
  score: { min: 0, required: true, type: Number },
  spread: { type: Number },
  team: { required: true, type: String, uppercase: true },
})

export const idsSchema = new mongoose.Schema({
  espn: { type: String },
  ftn: { type: String },
  gsis: { type: String },
  id: { minLength: 12, required: true, type: String, unique: true },
  nflDetail: { type: String },
  pff: { type: String },
  pfr: { minLength: 10, required: true, type: String, unique: true },
  stadiumPfr: { required: true, type: String },
})

const weatherSchema = new mongoose.Schema({
  temp: { required: true, type: Number },
  wasClosedRoof: { required: true, type: Boolean },
  wind: { min: 0, required: true, type: Number },
})

// ESPN gives time in my timezone
// PFR gives it in local time of game

const gameSchema = new mongoose.Schema(
  {
    away: { required: true, type: teamSchema },
    dayOfWeek: { max: 6, min: 0, required: true, type: Number }, // Sunday: 0, Saturday: 6
    home: { required: true, type: teamSchema },
    ids: { required: true, type: idsSchema },
    localDate: { required: true, type: Date },
    over: { type: Number },
    overtime: { required: true, type: Boolean },
    result: { required: true, type: Number }, // > 0 = home win, < 0 = away win
    season: { max: 2025, min: 1999, required: true, type: Number },
    spreadLine: { type: Number },
    total: { required: true, type: Number },
    totalLine: { type: Number },
    type: { enum: ["REG", "DIV", "WC", "CON", "SB"], required: true, type: String },
    under: { type: Number },
    wasPlayedAtHome: { required: true, type: Boolean },
    weather: { required: true, type: weatherSchema },
    week: { min: 1, required: true, type: Number },
  },
  { collection: "Games" },
)

export default mongoose.models.Game || mongoose.model("Game", gameSchema)
