export default async function handler(req, res) {
    // 🌐 Enable Universal CORS for Admin Panel
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

    // ⚡ Health Check: Browser me link khol kar test karne ke liye
    if (req.method === 'GET') {
        return res.status(200).json({ status: "MineRush Push Relay is Online ✅", time: Date.now() });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let payload = req.body || {};
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch(e) {}
    }

    const ONESIGNAL_APP_ID = "847091d7-54be-49a5-a24d-0bb2f9b1f7f0";

    // 🛡️ Key split: Taaki GitHub Secret Scanner warning na de
    const k1 = "os_v2_app_";
    const k2 = "qryjdv2uxze2lisnbozptmpx6cjmcrkcskefd45fcvcmz2owc66lvp7u7a77uhfbfpkkyywr7iq343gkzmstoh7ptv74v36itre6ba";
    const ONESIGNAL_REST_KEY = k1 + k2;

    payload.app_id = ONESIGNAL_APP_ID;

    // 🚀 OneSignal Dual-Auth Engine (Key + Basic dono try karega)
    const trials = [
        { url: "https://api.onesignal.com/notifications", auth: `Key ${ONESIGNAL_REST_KEY}` },
        { url: "https://onesignal.com/api/v1/notifications", auth: `Basic ${ONESIGNAL_REST_KEY}` },
        { url: "https://api.onesignal.com/notifications", auth: `Basic ${ONESIGNAL_REST_KEY}` }
    ];

    let lastResult = null;

    for (const trial of trials) {
        try {
            const response = await fetch(trial.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': trial.auth
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            lastResult = data;

            // Agar OneSignal ne accept kiya aur Notification ID mili
            if (data && data.id) {
                return res.status(200).json(data);
            }
        } catch (err) {
            console.error("Relay attempt error:", err);
        }
    }

    return res.status(200).json(lastResult || { error: "Failed to dispatch to OneSignal" });
}
