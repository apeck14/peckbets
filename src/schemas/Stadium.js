import mongoose from "mongoose"

const stadiumSchema = new mongoose.Schema(
  {
    city: { required: true, type: String },
    from: { required: true, type: Number },
    name: { required: true, type: String },
    pfr: { required: true, type: String, unique: true },
    state: { required: true, type: String },
    teams: { required: true, type: [String] },
    timezone: { required: true, type: String },
    to: { required: true, type: Number },
  },
  { collection: "Stadiums" },
)

export default mongoose.models.Stadium || mongoose.model("Stadium", stadiumSchema)
