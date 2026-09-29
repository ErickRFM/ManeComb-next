import { Schema, model, models } from "mongoose";

const AppReleaseSchema=new Schema({
  platform:{type:String,enum:["android"],required:true,unique:true,index:true},
  latestVersion:{type:String,required:true},
  minimumVersion:{type:String,required:true},
  latestVersionCode:{type:Number,min:1},
  minimumVersionCode:{type:Number,min:1},
  downloadUrl:{type:String,required:true},
  notes:{type:String,default:""},
  forceUpdate:{type:Boolean,default:false},
  publishedAt:{type:Date,default:Date.now},
  updatedBy:{type:Schema.Types.ObjectId,ref:"User",default:null}
},{timestamps:true});

export const AppRelease=models.AppRelease||model("AppRelease",AppReleaseSchema);
