import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side image proxy — fetches any URL server-to-server (no CORS) and
 * streams it back to the browser. Used by the media lightbox so that the
 * canvas drawImage/toBlob flow doesn't get a "tainted canvas" error.
 *
 * Usage: GET /api/media-proxy?url=<encoded-url>
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      // Forward cookies/auth if needed in future — bare fetch is fine for public pre-signed GCS
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow canvas drawImage on the result
        "Access-Control-Allow-Origin": "*",
        // Cache aggressively — the proxied image doesn't change
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[media-proxy] fetch error:", err);
    return NextResponse.json(
      { error: "Proxy fetch failed", detail: err.message },
      { status: 500 }
    );
  }
}
