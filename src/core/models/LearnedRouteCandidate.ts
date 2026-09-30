import mongoose from "mongoose";

const { Schema } = mongoose;
const PointSchema=new Schema({latitude:Number,longitude:Number},{_id:false});
const CandidateSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  routeId:{type:Schema.Types.ObjectId,ref:"Route",default:null,index:true},
  geometry:[PointSchema],
  sampleCount:{type:Number,default:0},
  confidence:{type:Number,min:0,max:1},
  status:{type:String,enum:["candidate","approved","rejected"],default:"candidate",index:true},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  reviewedAt:Date
},{timestamps:true});
export const LearnedRouteCandidate=mongoose.models.LearnedRouteCandidate||mongoose.model("LearnedRouteCandidate",CandidateSchema);
