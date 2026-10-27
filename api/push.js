export default async function handler(req, res) {
    // Enable CORS for Admin Panel
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ONESIGNAL_REST_KEY = "os_v2_app_qryjdv2uxze2lisnbozptmpx6cjmcrkcskefd45fcvcmz2owc66lvp7u7a77uhfbfpkkyywr7iq343gkzmstoh7ptv74v36itre6ba";

    // 🚀 OneSignal Multi-Auth Matrix (Basic & Key dono formats test karega)
    const authHeaders = [
        `Basic ${ONESIGNAL_REST_KEY}`,
        `Key ${ONESIGNAL_REST_KEY}`
    ];

    const endpoints = [
        "https://api.onesignal.com/notifications",
        "https://onesignal.com/api/v1/notifications"
    ];

    let lastResult = null;

    for (const authHeader of authHeaders) {
        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": authHeader
                    },
                    body: JSON.stringify(req.body)
                });

                const data = await response.json();
                lastResult = data;

                // Agar OneSignal ne accept karke ID return ki
                if (data && data.id && (!data.errors || data.recipients > 0)) {
                    return res.status(200).json(data);
                }
            } catch (e) {
                console.error("Relay attempt error:", e);
            }
        }
    }

    return res.status(200).json(lastResult || { error: "Failed to dispatch notification" });
}
