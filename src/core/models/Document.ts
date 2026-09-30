import mongoose from "mongoose";

const { Schema } = mongoose;

const DocumentSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  ownerType:{type:String,enum:["driver","vehicle","organization"],required:true},
  ownerId:{type:Schema.Types.ObjectId,required:true,index:true},
  kind:{type:String,required:true,index:true},
  url:{type:String,required:true},
  storagePublicId:String,
  resourceType:String,
  bytes:{type:Number,min:0},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
  expiresAt:{type:Date,index:true},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  reviewedAt:Date,
  rejectionReason:String
},{timestamps:true});

export const Document=mongoose.models.Document||mongoose.model("Document",DocumentSchema);
