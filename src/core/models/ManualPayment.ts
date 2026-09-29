import mongoose from "mongoose";

const { Schema } = mongoose;

const ManualPaymentSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  planCode:{type:String,required:true,index:true},
  amountMxn:{type:Number,required:true,min:0},
  expectedAmountMxn:{type:Number,required:true,min:0},
  currency:{type:String,enum:["MXN"],default:"MXN"},
  periodMonths:{type:Number,enum:[1],default:1},
  receiptUrl:{type:String,required:true},
  idempotencyKey:{type:String,required:true},
  status:{type:String,enum:["pending","approved","rejected"],default:"pending",index:true},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  reviewedAt:Date,
  note:String
},{timestamps:true});

ManualPaymentSchema.index({organizationId:1,idempotencyKey:1},{unique:true});

export const ManualPayment=mongoose.models.ManualPayment||mongoose.model("ManualPayment",ManualPaymentSchema);
