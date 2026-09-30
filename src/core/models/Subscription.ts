import mongoose from "mongoose";

const { Schema } = mongoose;
const SubscriptionSchema=new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,unique:true,index:true},
  planCode:{type:String,required:true},
  status:{type:String,enum:["trial","active","past_due","paused","cancelled"],default:"trial",index:true},
  provider:{type:String,enum:["mercadopago","manual"],default:"mercadopago"},
  providerSubscriptionId:String,
  currentPeriodEnd:Date,
  vehicleLimit:{type:Number,min:1}
},{timestamps:true});
export const Subscription=mongoose.models.Subscription||mongoose.model("Subscription",SubscriptionSchema);
