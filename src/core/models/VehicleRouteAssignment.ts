import mongoose from "mongoose";

const { Schema } = mongoose;

export const VEHICLE_ROUTE_ASSIGNMENT_STATES = [
  "AVAILABLE","SCHEDULED","ACTIVE","COMPLETED","CANCELLED","EXPIRED"
] as const;

const VehicleRouteAssignmentSchema = new Schema({
  organizationId:{type:Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
  vehicleId:{type:Schema.Types.ObjectId,ref:"Vehicle",required:true,index:true},
  routeId:{type:Schema.Types.ObjectId,ref:"Route",required:true,index:true},
  status:{type:String,enum:VEHICLE_ROUTE_ASSIGNMENT_STATES,default:"AVAILABLE",index:true},
  priority:{type:Number,min:0,default:100},
  selectableByDriver:{type:Boolean,default:true},
  scheduledFrom:{type:Date,default:null},
  scheduledUntil:{type:Date,default:null},
  assignedBy:{type:Schema.Types.ObjectId,ref:"User",default:null},
  assignedAt:{type:Date,default:Date.now},
  activatedAt:{type:Date,default:null},
  completedAt:{type:Date,default:null},
  cancelledAt:{type:Date,default:null},
  routeRevision:{type:Number,min:0,default:0},
  activationVersion:{type:Number,min:0,default:0}
},{timestamps:true});

VehicleRouteAssignmentSchema.index({organizationId:1,vehicleId:1,routeId:1},{unique:true});
VehicleRouteAssignmentSchema.index({organizationId:1,vehicleId:1,status:1,priority:1});
VehicleRouteAssignmentSchema.index({organizationId:1,routeId:1,status:1});
VehicleRouteAssignmentSchema.index(
  {organizationId:1,vehicleId:1},
  {unique:true,partialFilterExpression:{status:"ACTIVE"},name:"one_active_route_per_vehicle"}
);

export const VehicleRouteAssignment =
  mongoose.models.VehicleRouteAssignment ||
  mongoose.model("VehicleRouteAssignment",VehicleRouteAssignmentSchema);
