import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side Proxy for ComfyUI Cloud API
 * Resolves CORS issues and protects the X-Api-Key by keeping it on the server.
 */

const COMFY_URL = "https://cloud.comfy.org";
// This should be in your .env.local as COMFY_API_KEY
const API_KEY = process.env.COMFY_API_KEY || process.env.NEXT_PUBLIC_COMFY_API_KEY || "";

async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${COMFY_URL}/api/${path}${req.nextUrl.search}`;

  const body = req.method !== "GET" && req.method !== "HEAD" 
    ? await req.text() 
    : undefined;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
      },
      body,
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error(`[Comfy Proxy Error] ${req.method} ${url}:`, error);
    return NextResponse.json(
      { error: "Failed to proxy request to ComfyUI", detail: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function POST(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function DELETE(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function PUT(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}
