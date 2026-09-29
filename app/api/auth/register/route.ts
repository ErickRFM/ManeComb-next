import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { connectDb } from "@/src/lib/db";
import { apiError } from "@/src/lib/http";
import { createSessionForUser, SESSION_COOKIE } from "@/src/lib/auth";
import { Organization } from "@/src/core/models/Organization";
import { User } from "@/src/core/models/User";
import { enqueueOutboxEvent } from "@/src/core/services/outbox";

const RegisterSchema = z.object({
  organizationName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128)
});
export const runtime = "nodejs";

export async function POST(request: Request) {
  let organizationId: string | null = null;
  try {
    const input = RegisterSchema.parse(await request.json());
    await connectDb();
    const slugBase = input.organizationName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const organization = await Organization.create({ name: input.organizationName, slug: slugBase + "-" + randomBytes(3).toString("hex") });
    organizationId = String(organization._id);
    const user = await User.create({
      organizationId: organization._id,
      email: input.email.toLowerCase(),
      passwordHash: await hash(input.password, 12),
      name: input.name,
      roles: ["owner"],
      channel: "company_portal"
    });
    const session = await createSessionForUser(user);
    await enqueueOutboxEvent("email.send", {
      to: user.email,
      subject: "Bienvenido a ManeComb",
      html: "<h1>Bienvenido a ManeComb</h1><p>Tu empresa ya está lista para comenzar la configuración.</p>"
    }, organizationId);
    const response = NextResponse.json({ organizationId, userId: String(user._id) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expiresAt
    });
    return response;
  } catch (error) {
    if (organizationId) await Organization.deleteOne({ _id: organizationId }).catch(() => undefined);
    return apiError(error);
  }
}
