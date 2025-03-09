import mongoose from "mongoose"

const playSchema = new mongoose.Schema({
  awayPts: { default: null, min: 0, type: Number },
  detail: { default: null, type: String },
  down: { default: null, max: 4, min: 1, type: Number },
  epAfter: { default: null, type: Number },
  epBefore: { default: null, type: Number },
  homePts: { default: null, min: 0, type: Number },
  location: { default: null, type: String },
  possession: { default: null, type: String },
  quarter: { default: null, max: 5, min: 1, type: Number }, // 5 for OT
  timeLeftInQuarter: { default: null, max: 900, min: 0, type: Number }, // seconds
  ydsUntil1st: { default: null, type: Number },
})

const playByPlaySchema = new mongoose.Schema(
  {
    pfr: { required: true, type: String, unique: true },
    plays: { required: true, type: [playSchema] },
    result: { required: true, type: Number },
    season: { required: true, type: Number },
  },
  { collection: "PlayByPlay" },
)

export default mongoose.models.PlayByPlay || mongoose.model("PlayByPlay", playByPlaySchema)
