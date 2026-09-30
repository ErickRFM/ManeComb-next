import mongoose from "mongoose";

const { Schema } = mongoose;
const ManualPaymentSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  amountMxn:{type:Number,required:true,min:0},
  receiptUrl:{type:String,required:true},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  reviewedAt:Date,
  note:String
},{timestamps:true});
export const ManualPayment=mongoose.models.ManualPayment||mongoose.model("ManualPayment",ManualPaymentSchema);
