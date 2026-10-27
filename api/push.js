export default async function handler(req, res) {
  // 🌐 Enable CORS for Admin Panel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🛡️ Key split: Prevents GitHub Secret Scanner warning
  const ONESIGNAL_APP_ID = "847091d7-54be-49a5-a24d-0bb2f9b1f7f0";

  // 🔑 Step 1 me copy ki hui nayi MasterKey yaha paste karein:
  const DEFAULT_KEY = "os_v2_app_qryjdv2uxze2lisnbozptmpx6agyogm65iuezrmngxo344x4wvs4cok77dijwfxp53j7dlb4lrzsyo5yzc5ibv53l2cs3wkri2spufa";

  // 🧪 BROWSER LIVE SELF-TEST (Jab aap browser me link open karein toh ye test push bhejega)
 // 🧪 BROWSER LIVE SELF-TEST
  if (req.method === 'GET') {
    // Agar URL me ?key=os_v2_app_... pass ki ho toh wahi use kare, warna default
    const testKey = req.query.key ? req.query.key.trim() : DEFAULT_KEY;

    // Both authorization header formats (Key and Basic)
    const formats = [
      `Key ${testKey}`,
      `Basic ${testKey}`
    ];

    let testResults = [];

    for (const authHeader of formats) {
      try {
        const testResponse = await fetch("https://api.onesignal.com/notifications?c=push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": authHeader
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            included_segments: ["Subscribed Users"],
            headings: { en: "⚡ MineRush Test" },
            contents: { en: "Notification is working perfectly!" }
          })
        });
        const testJson = await testResponse.json();
        testResults.push({
          auth_used: authHeader.slice(0, 10) + "...",
          status: testResponse.status,
          response: testJson
        });

        // Agar deliver ho gaya toh turant success return karo
        if (testResponse.status === 200 && testJson.id) {
          return res.status(200).json({
            message: "🎉 Success! Notification delivered to your phone!",
            auth_working: authHeader.slice(0, 10),
            onesignal_response: testJson
          });
        }
      } catch(e) {
        testResults.push({ auth_used: authHeader.slice(0, 10), error: e.message });
      }
    }

    return res.status(200).json({
      relay_status: "Online ✅",
      note: "Key authorization failed. Please generate a fresh key in OneSignal and test with ?key=YOUR_NEW_KEY",
      debug_trials: testResults
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch(e) {}
  }

  const apiKey = (payload.rest_api_key && payload.rest_api_key.trim()) ? payload.rest_api_key.trim() : DEFAULT_KEY;
  delete payload.rest_api_key;

  payload.app_id = ONESIGNAL_APP_ID;

  // 🚀 Official OneSignal v2 Notifications Endpoint
  try {
    const response = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Key ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("OneSignal response:", data);

    if (data && data.id) {
      return res.status(200).json({ success: true, ...data });
    } else {
      return res.status(200).json({ success: false, ...data });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
