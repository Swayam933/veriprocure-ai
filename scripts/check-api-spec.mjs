const BASE = "https://devnode.telegraphprotocol.com";

// Let's test what /engine/v1/ask options are or check swagger/docs/openapi
try {
  const res = await fetch(`${BASE}/openapi.json`);
  console.log("openapi.json:", res.status);
  if (res.ok) {
    const spec = await res.json();
    console.log("Paths:", Object.keys(spec.paths || {}));
    if (spec.paths["/engine/v1/ask"]) {
      console.log("/engine/v1/ask spec:", JSON.stringify(spec.paths["/engine/v1/ask"], null, 2));
    }
  }
} catch (e) {
  console.log("openapi error:", e.message);
}

try {
  const res = await fetch(`${BASE}/docs`);
  console.log("/docs:", res.status);
} catch (e) {
  console.log("/docs error:", e.message);
}

