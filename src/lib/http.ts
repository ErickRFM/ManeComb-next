import { NextResponse } from "next/server";

const PUBLIC_MESSAGES:Record<string,string>={
  UNAUTHORIZED:"Correo o contraseña incorrectos.",
  FORBIDDEN:"No tienes permiso para realizar esta operación.",
  RATE_LIMITED:"Demasiados intentos. Espera unos minutos antes de volver a intentar.",
  RATE_LIMIT_UNAVAILABLE:"El servicio está temporalmente no disponible. Intenta nuevamente en unos momentos."
};

function response(error:string,status:number){
  return NextResponse.json({error,message:PUBLIC_MESSAGES[error]}, {status});
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (message === "UNAUTHORIZED") return response(message,401);
  if (message === "FORBIDDEN") return response(message,403);
  if (message === "RATE_LIMITED") return response(message,429);
  if (message === "RATE_LIMIT_UNAVAILABLE") return response(message,503);
  if (["VEHICLE_CAPACITY_UNAVAILABLE","VEHICLE_CAPACITY_BUSY"].includes(message)) return NextResponse.json({ error: message }, { status: 503 });
  if (["SUBSCRIPTION_INACTIVE","SUBSCRIPTION_EXPIRED","SUBSCRIPTION_PLAN_INVALID"].includes(message)) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message === "VEHICLE_LIMIT_REACHED") return NextResponse.json({ error: message }, { status: 409 });
  if (message.startsWith("Invalid journey transition")) return NextResponse.json({ error: message }, { status: 409 });
  return NextResponse.json({ error: message }, { status: 400 });
}
