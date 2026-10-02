import mongoose from "mongoose";

const {Schema}=mongoose;
const IncidentEvidenceSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  incidentId:{type:Schema.Types.ObjectId,ref:"Incident",required:true,index:true},
  uploaderUserId:{type:Schema.Types.ObjectId,ref:"User",default:null,index:true},
  kind:{type:String,enum:["image","video","audio","document"],required:true},
  source:{type:String,enum:["manual","camera","system"],default:"manual",index:true},
  url:{type:String,required:true},
  storagePublicId:{type:String,required:true},
  resourceType:{type:String,required:true},
  bytes:{type:Number,min:1,required:true},
  mimeType:{type:String,required:true},
  fileName:{type:String,default:""},
  capturedAt:{type:Date,default:Date.now,index:true},
  aiMetadata:{type:Schema.Types.Mixed,default:null},
  deletedAt:{type:Date,default:null,index:true}
},{timestamps:true});
IncidentEvidenceSchema.index({organizationId:1,incidentId:1,deletedAt:1,capturedAt:-1});
export const IncidentEvidence=mongoose.models.IncidentEvidence||mongoose.model("IncidentEvidence",IncidentEvidenceSchema);
