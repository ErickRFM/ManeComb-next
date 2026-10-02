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
  mimeType:String,
  fileName:String,
  status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
  expiresAt:{type:Date,index:true},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  reviewedAt:Date,
  rejectionReason:String,
  reviewNotes:{type:String,default:""},
  reviewVersion:{type:Number,min:0,default:0},
  version:{type:Number,min:1,default:1},
  replacesDocumentId:{type:Schema.Types.ObjectId,ref:"Document",default:null,index:true},
  supersededByDocumentId:{type:Schema.Types.ObjectId,ref:"Document",default:null,index:true},
  deletedAt:{type:Date,default:null,index:true},
  deletedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  deleteReason:{type:String,default:""},
  assetDeletedAt:{type:Date,default:null},
  assetDeletionError:{type:String,default:""},
  assetDeletionAttempts:{type:Number,min:0,default:0}
},{timestamps:true});

DocumentSchema.index({organizationId:1,ownerType:1,ownerId:1,kind:1,version:-1});
DocumentSchema.index({organizationId:1,deletedAt:1,supersededByDocumentId:1,createdAt:-1});

export const Document=mongoose.models.Document||mongoose.model("Document",DocumentSchema);
