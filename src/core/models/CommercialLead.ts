import mongoose from "mongoose";

const { Schema } = mongoose;
const CommercialLeadSchema=new Schema({
  name:{type:String,required:true},
  email:{type:String,required:true,lowercase:true,index:true},
  phone:String,
  fleetSize:Number,
  message:String,
  source:{type:String,default:"web"},
  status:{type:String,enum:["new","contacted","qualified","won","lost"],default:"new",index:true}
},{timestamps:true});
export const CommercialLead=mongoose.models.CommercialLead||mongoose.model("CommercialLead",CommercialLeadSchema);
