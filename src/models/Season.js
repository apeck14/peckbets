import mongoose from "mongoose"

import { recordSchema } from "./Game.js"

const gameSchema = new mongoose.Schema({
  opponent: { required: true, type: String },
  pfr: { required: true, type: String },
  record: { required: true, type: recordSchema },
  result: { required: true, type: Number },
  week: { max: 18, min: 1, required: true, type: Number },
})

const seasonSchema = new mongoose.Schema(
  {
    id: { required: true, type: String, unique: true, uppercase: true }, // "TEAM-SEASON"
    regularSeason: { required: true, type: [gameSchema] },
    season: { max: 2025, min: 1999, required: true, type: Number },
    team: { required: true, type: String },
  },
  { collection: "Seasons" },
)

export default mongoose.models.Season || mongoose.model("Season", seasonSchema)
