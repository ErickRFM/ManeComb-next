import { expect, it } from "vitest";
import { authErrorMessage } from "@/src/lib/auth-errors";

it("maps internal auth codes to user-safe messages",()=>{
  expect(authErrorMessage({error:"RATE_LIMIT_UNAVAILABLE"})).not.toContain("RATE_LIMIT_UNAVAILABLE");
  expect(authErrorMessage({error:"UNAUTHORIZED"})).toBe("Correo o contraseña incorrectos.");
});

it("prefers an explicit public API message",()=>{
  expect(authErrorMessage({error:"RATE_LIMIT_UNAVAILABLE",message:"Servicio temporalmente no disponible"})).toBe("Servicio temporalmente no disponible");
});

it("does not leak unknown backend errors",()=>{
  expect(authErrorMessage({error:"MongoServerSelectionError"},"No fue posible acceder")).toBe("No fue posible acceder");
});
