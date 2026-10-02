import mongoose from "mongoose";

const { Schema } = mongoose;
const IncidentSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", default: null, index:true },
  driverId: { type: Schema.Types.ObjectId, ref: "User", default: null, index:true },
  routeId: { type: Schema.Types.ObjectId, ref: "Route", default: null, index:true },
  reporterId: { type: Schema.Types.ObjectId, ref: "User", default: null, index:true },
  title:{type:String,default:"",trim:true},
  type: { type: String, enum: ["traffic","mechanical","accident","police","robbery","medical","sos","other"], required: true },
  severity:{type:String,enum:["low","medium","high","critical"],default:"medium",index:true},
  status: { type: String, enum: ["open","acknowledged","resolved"], default: "open", index: true },
  source:{type:String,enum:["manual","sos","camera","system"],default:"manual",index:true},
  message: String,
  latitude: Number,
  longitude: Number,
  locationState:{type:String,enum:["fresh","stale","missing"],default:"missing"},
  locationSourceTimestamp:{type:Date,default:null},
  resolvedAt: Date
}, { timestamps: true });
IncidentSchema.index({organizationId:1,status:1,severity:1,createdAt:-1});
IncidentSchema.index({organizationId:1,vehicleId:1,createdAt:-1});
IncidentSchema.index({organizationId:1,routeId:1,createdAt:-1});
export const Incident = mongoose.models.Incident || mongoose.model("Incident", IncidentSchema);
