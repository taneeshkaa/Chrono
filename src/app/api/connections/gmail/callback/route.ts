// src/app/api/connections/gmail/callback/route.ts

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/connections?error=no_code", process.env.NEXTAUTH_URL));
  }

  try {
    // Step 1: Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/connections/gmail/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.redirect(new URL("/connections?error=token_failed", process.env.NEXTAUTH_URL));
    }

    // Step 2: Fetch Google profile (we need both id and email)
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profile = await profileResponse.json();

    if (!profile.id || !profile.email) {
      return NextResponse.redirect(new URL("/connections?error=profile_failed", process.env.NEXTAUTH_URL));
    }

    // Step 3: Upsert into Connection model
    await prisma.connection.upsert({
      where: {
        provider_providerAccountId: {
          provider: "gmail",
          providerAccountId: profile.id,
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in                          // ← add this
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        connected: true,
        email: profile.email,
      },
      create: {
        userId: session.user.id,
        provider: "gmail",
        providerAccountId: profile.id,
        email: profile.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in                          // ← add this
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        connected: true,
      },
    });

    return NextResponse.redirect(new URL("/connections?success=gmail_connected", process.env.NEXTAUTH_URL));

  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(new URL("/connections?error=unknown", process.env.NEXTAUTH_URL));
  }
}