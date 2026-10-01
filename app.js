import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update, push, onValue, runTransaction, query, orderByChild, equalTo 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Verified Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAQaGn_6AhqTIwTR5rvGuMh2d1YOBjOCqw",
    authDomain: "mine-rush-f580a.firebaseapp.com",
    projectId: "mine-rush-f580a",
    storageBucket: "mine-rush-f580a.firebasestorage.app",
    messagingSenderId: "250630688178",
    appId: "1:250630688178:web:9f42ff370b129930a028ab",
    measurementId: "G-4CDWDL6Z1J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Web Audio Sound Engine
const SoundFX = {
    ctx: null,
    init: function() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playClick: function() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.04);
    },
    playCoin: function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [1800, 2400].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.14, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.25);
        });
    },
    playSuccess: function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.15, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.35);
        });
    },
    playPowerUp: function() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.7);
    }
};

// Core State
const State = {
    user: null,
    userId: null,
    coins: 0,
    inr: 0,
    usdt: 0,
    miningEndTime: 0,
    miningAdsWatched: 0,
    firstMiningCompleted: false,
    admin: {
        rates: { coin_to_inr: 100, coin_to_usdt: 9000 },
        mining: { ads_required: 5, session_duration_ms: 3600000 },
        exchange: { ads_required: 1, min_swap_coins: 100 },
        withdrawals: { min_upi_inr: 50, min_ton_usdt: 5 },
        referral: { reward_coins: 200 }
    },
    selectedPayoutMethod: 'UPI',
    pendingAdReward: null,
    lastAdWatchTime: 0
};

window.App = {
    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCodeParam = urlParams.get('ref') || urlParams.get('startapp') || '';
        if (refCodeParam) {
            const refInput = document.getElementById('signup-ref-code');
            if (refInput) refInput.value = refCodeParam.replace('ref_', '').trim();
        }

        this.listenToAdminSettings();

        onAuthStateChanged(auth, (user) => {
            const authModal = document.getElementById('modal-auth');
            const authCard = document.getElementById('auth-cyber-card');
            const appWrapper = document.getElementById('app');

            if (user) {
                State.user = user;
                State.userId = user.uid;

                if (authModal.classList.contains('open')) {
                    authCard.classList.add('auth-exit-anim');
                    setTimeout(() => {
                        authModal.classList.remove('open');
                        authCard.classList.remove('auth-exit-anim');
                        appWrapper.classList.add('app-revealed');
                    }, 380);
                } else {
                    authModal.classList.remove('open');
                    appWrapper.classList.add('app-revealed');
                }
                this.attachUserSession();
            } else {
                State.user = null;
                State.userId = null;
                appWrapper.classList.remove('app-revealed');
                authModal.classList.add('open');
            }
        });

        this.startMiningClock();
        document.body.addEventListener('click', () => SoundFX.init(), { once: true });
    },

    listenToAdminSettings: function() {
        onValue(ref(database, 'admin_settings'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.rates) State.admin.rates = { ...State.admin.rates, ...data.rates };
                if (data.mining) State.admin.mining = { ...State.admin.mining, ...data.mining };
                if (data.exchange) State.admin.exchange = { ...State.admin.exchange, ...data.exchange };
                if (data.withdrawals) State.admin.withdrawals = { ...State.admin.withdrawals, ...data.withdrawals };
                if (data.referral) State.admin.referral = { ...State.admin.referral, ...data.referral };
            }
            this.updateAdminDynamicUI();
        });
    },

    updateAdminDynamicUI: function() {
        document.getElementById('rate-badge').innerText = `${State.admin.rates.coin_to_inr} Coins = ₹1`;
        document.getElementById('swap-req-ad-text').innerText = `Requires ${State.admin.exchange.ads_required} Ad`;
        document.getElementById('payout-min-upi-text').innerText = `Min ₹${State.admin.withdrawals.min_upi_inr} (INR)`;
        document.getElementById('payout-min-ton-text').innerText = `Min $${State.admin.withdrawals.min_ton_usdt} (TON Net)`;
        this.updateMiningUI();
    },

    switchAuthTab: function(tab) {
        SoundFX.playClick();
        if (tab === 'signup') {
            document.getElementById('auth-signup-view').style.display = 'block';
            document.getElementById('auth-login-view').style.display = 'none';
            document.getElementById('tab-btn-signup').classList.add('active');
            document.getElementById('tab-btn-login').classList.remove('active');
        } else {
            document.getElementById('auth-signup-view').style.display = 'none';
            document.getElementById('auth-login-view').style.display = 'block';
            document.getElementById('tab-btn-signup').classList.remove('active');
            document.getElementById('tab-btn-login').classList.add('active');
        }
    },

    togglePasswordVisibility: function(inputId) {
        SoundFX.playClick();
        const input = document.getElementById(inputId);
        input.type = input.type === 'password' ? 'text' : 'password';
    },

    handleRegister: async function() {
        SoundFX.playClick();
        const email = document.getElementById('signup-email').value.trim();
        const pass = document.getElementById('signup-password').value.trim();
        const confirmPass = document.getElementById('signup-confirm-password').value.trim();
        const refCode = document.getElementById('signup-ref-code').value.trim();

        if (!email || !email.includes('@')) {
            this.toast("Please enter a valid email address", "error");
            return;
        }
        if (pass.length < 6) {
            this.toast("Password must be at least 6 characters", "error");
            return;
        }
        if (pass !== confirmPass) {
            this.toast("Passwords do not match", "error");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            await set(ref(database, `users/${user.uid}`), {
                uid: user.uid,
                email: email,
                coins: 100,
                welcomeBonusClaimed: true,
                inr_balance: 0,
                usdt_balance: 0,
                miningEndTime: 0,
                miningAdsWatched: 0,
                firstMiningCompleted: false,
                referredBy: refCode || 'DIRECT',
                createdAt: Date.now()
            });

            if (refCode && refCode !== 'DIRECT') {
                await set(ref(database, `referral_bindings/${user.uid}`), {
                    referrerUid: refCode,
                    userUid: user.uid,
                    userEmail: email,
                    status: 'Pending First Mining',
                    createdAt: Date.now()
                });
            }

            SoundFX.playSuccess();
            document.getElementById('modal-welcome').classList.add('open');
            this.toast("Account created successfully!", "success");
        } catch (error) {
            this.toast(error.message.replace("Firebase: ", ""), "error");
        }
    },

    handleLogin: async function() {
        SoundFX.playClick();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value.trim();

        if (!email || !pass) {
            this.toast("Please enter email & password", "error");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            SoundFX.playSuccess();
            this.toast("Welcome back!", "success");
        } catch (error) {
            this.toast(error.message.replace("Firebase: ", ""), "error");
        }
    },

    handleForgotPassword: async function() {
        SoundFX.playClick();
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            this.toast("Enter your email above to reset password", "info");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            this.toast("Password reset email sent! Check your inbox.", "success");
        } catch (error) {
            this.toast(error.message.replace("Firebase: ", ""), "error");
        }
    },

    handleSignOut: async function() {
        SoundFX.playClick();
        await signOut(auth);
        this.closeModals();
        this.toast("Signed out successfully", "info");
    },

    closeWelcomeModal: function() {
        SoundFX.playCoin();
        document.getElementById('modal-welcome').classList.remove('open');
    },

    attachUserSession: function() {
        const uid = State.userId;
        const email = State.user.email;

        document.getElementById('user-display-name').innerText = email.split('@')[0];
        document.getElementById('user-display-tag').innerText = `RIG ACTIVE`;
        document.getElementById('profile-email-display').innerText = email;
        document.getElementById('profile-uid-display').innerText = `UID: ${uid}`;

        const origin = window.location.origin + window.location.pathname;
        const refLink = `${origin}?ref=${uid}`;
        document.getElementById('user-ref-link-display').innerText = refLink;

        const userRef = ref(database, `users/${uid}`);
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                State.coins = parseFloat(data.coins) || 0;
                State.inr = parseFloat(data.inr_balance) || 0;
                State.usdt = parseFloat(data.usdt_balance) || 0;
                State.miningEndTime = parseInt(data.miningEndTime) || 0;
                State.miningAdsWatched = parseInt(data.miningAdsWatched) || 0;
                State.firstMiningCompleted = data.firstMiningCompleted || false;

                this.renderBalances();
                this.updateMiningUI();
            }
        });

        this.listenToReferralStats();
        this.listenToTasks();
        this.listenToHistory();
    },

    renderBalances: function() {
        document.getElementById('home-coin-balance').innerText = Math.floor(State.coins).toLocaleString();
        document.getElementById('wallet-coins-val').innerText = Math.floor(State.coins).toLocaleString();
        document.getElementById('home-inr-balance').innerText = `₹ ${State.inr.toFixed(2)}`;
        document.getElementById('wallet-inr-val').innerText = `₹ ${State.inr.toFixed(2)}`;
        document.getElementById('home-usdt-balance').innerText = `$ ${State.usdt.toFixed(2)}`;
        document.getElementById('wallet-usdt-val').innerText = `$ ${State.usdt.toFixed(2)}`;
    },

    // ================= 3-WAY ADMOB DISPATCHER =================
    triggerRewardedAd: function() {
        const now = Date.now();
        if (now - State.lastAdWatchTime < 5000) {
            this.toast("Please wait a few seconds before next ad", "info");
            return;
        }

        const target = State.pendingAdReward;
        this.toast("Loading AdMob ad...", "info");

        // CASE 1: Mining -> Calls Rewarded Ad
        if (target && target.type === 'mining') {
            if (window.AndroidBridge && typeof window.AndroidBridge.showRewardedAd === 'function') {
                window.AndroidBridge.showRewardedAd();
                return;
            }
        }
        // CASE 2: Tasks & Swap -> Calls Rewarded Interstitial Ad
        else if (target && (target.type === 'coins' || target.type === 'swap')) {
            const tag = target.type === 'coins' ? `coins_${target.amount}_${target.title}` : 'swap';
            if (window.AndroidBridge && typeof window.AndroidBridge.showRewardedInterstitialAd === 'function') {
                window.AndroidBridge.showRewardedInterstitialAd(tag);
                return;
            }
        }

        // Fallback Simulator (Browser testing ke liye)
        this.showAdMobSimulator();
    },

    showAdMobSimulator: function() {
        const existing = document.getElementById('admob-test-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'admob-test-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #040711; z-index: 99999; display: flex; flex-direction: column;
            align-items: center; justify-content: space-between; padding: 25px 20px;
            animation: viewFadeIn 0.25s ease;
        `;

        modal.innerHTML = `
            <div style="width:100%; display:flex; justify-content:space-between; align-items:center; color:#FFF;">
                <div style="background:rgba(0,242,254,0.18); color:#00F2FE; border:1px solid rgba(0,242,254,0.3); border-radius:8px; padding:4px 10px; font-size:11px; font-weight:800;">
                    ADMOB SPONSOR
                </div>
                <div id="admob-timer-badge" style="background:#FFD200; color:#000; padding:4px 12px; border-radius:12px; font-size:12px; font-weight:800;">
                    Reward in 15s
                </div>
            </div>
            <div style="text-align:center; color:#FFF; display:flex; flex-direction:column; align-items:center; gap:14px;">
                <div style="width:84px; height:84px; border-radius:24px; background:linear-gradient(135deg, #00F2FE, #8B5CF6); display:flex; align-items:center; justify-content:center; font-size:42px; box-shadow:0 0 35px rgba(0,242,254,0.35);">
                    🎬
                </div>
                <h3 style="font-size:20px; font-weight:800;">Google AdMob Rewarded Ad</h3>
                <p style="font-size:13px; color:#94A3B8; max-width:280px; line-height:1.5;">
                    Please watch this video completely to claim your coins or power up your cloud rig.
                </p>
            </div>
            <div style="width:100%;">
                <div style="width:100%; height:5px; background:rgba(255,255,255,0.1); border-radius:4px; margin-bottom:12px; overflow:hidden;">
                    <div id="admob-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #00F2FE, #8B5CF6); transition:width 1s linear;"></div>
                </div>
                <button id="admob-close-btn" disabled style="width:100%; padding:15px; border-radius:16px; border:none; font-weight:800; font-size:14px; background:#162238; color:#64748B; cursor:not-allowed;">
                    Please wait 15s to claim reward...
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        let timeLeft = 15;
        const timerBadge = document.getElementById('admob-timer-badge');
        const progressBar = document.getElementById('admob-progress-bar');
        const closeBtn = document.getElementById('admob-close-btn');

        const interval = setInterval(() => {
            timeLeft--;
            const progress = ((15 - timeLeft) / 15) * 100;
            progressBar.style.width = `${progress}%`;

            if (timeLeft > 0) {
                timerBadge.innerText = `Reward in ${timeLeft}s`;
                closeBtn.innerText = `Please wait ${timeLeft}s to claim reward...`;
            } else {
                clearInterval(interval);
                timerBadge.innerText = "Reward Granted! ✅";
                timerBadge.style.background = "#10B981";
                timerBadge.style.color = "#FFF";

                closeBtn.disabled = false;
                closeBtn.innerText = "Claim Reward & Close";
                closeBtn.style.background = "linear-gradient(135deg, #00F2FE, #3B82F6)";
                closeBtn.style.color = "#040711";
                closeBtn.style.cursor = "pointer";

                closeBtn.onclick = () => {
                    modal.remove();
                    window.onNativeAdRewarded(State.pendingAdReward ? State.pendingAdReward.type : 'mining');
                };
            }
        }, 1000);
    },

    handleMiningAction: async function() {
        SoundFX.playClick();
        const now = Date.now();
        if (State.miningEndTime > now) {
            this.toast("Quantum Rig is currently mining!", "info");
            return;
        }

        const requiredAds = State.admin.mining.ads_required;
        if (State.miningAdsWatched < requiredAds) {
            State.pendingAdReward = { type: 'mining' };
            this.triggerRewardedAd();
            return;
        }

        SoundFX.playPowerUp();
        const duration = State.admin.mining.session_duration_ms;
        await update(ref(database, `users/${State.userId}`), {
            miningStartTime: now,
            miningEndTime: now + duration,
            miningAdsWatched: 0
        });

        if (!State.firstMiningCompleted) {
            await update(ref(database, `users/${State.userId}`), { firstMiningCompleted: true });
            this.processReferralCommission();
        }

        this.toast("Rig Online! Turbofans & Cloud Core active.", "success");
    },

    processReferralCommission: async function() {
        const bindingSnap = await get(ref(database, `referral_bindings/${State.userId}`));
        if (bindingSnap.exists()) {
            const binding = bindingSnap.val();
            if (binding.status === 'Pending First Mining') {
                const referrerUid = binding.referrerUid;
                const reward = State.admin.referral.reward_coins || 200;

                await runTransaction(ref(database, `users/${referrerUid}/coins`), (curr) => {
                    return (parseFloat(curr) || 0) + reward;
                });

                await push(ref(database, `users/${referrerUid}/coin_history`), {
                    amount: reward,
                    reason: `Referral Reward: ${State.user.email.slice(0, 4)}*** completed 1st mining`,
                    timestamp: Date.now()
                });

                await update(ref(database, `referral_bindings/${State.userId}`), {
                    status: 'Qualified',
                    rewardedCoins: reward,
                    qualifiedAt: Date.now()
                });
            }
        }
    },

    startMiningClock: function() {
        setInterval(() => {
            const now = Date.now();
            const timerText = document.getElementById('mining-timer-display');
            const rigCard = document.getElementById('mining-rig-wrapper');
            const led = document.getElementById('rig-status-led');
            const stateLabel = document.getElementById('rig-state-label');
            const hashVal = document.getElementById('rig-hashrate-val');
            const laserBar = document.getElementById('rig-progress-laser');

            if (State.miningEndTime > now) {
                const remaining = State.miningEndTime - now;
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timerText.innerText = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

                rigCard.classList.add('active-rig');
                led.classList.add('active');
                stateLabel.innerText = "MINING (ACTIVE)";
                stateLabel.style.color = "var(--accent-green)";

                const liveHash = (48.4 + Math.random() * 2.2).toFixed(1);
                hashVal.innerText = `${liveHash} MH/s`;

                const progress = (1 - (remaining / State.admin.mining.session_duration_ms)) * 100;
                laserBar.style.width = `${progress}%`;

                if (Math.floor(remaining / 1000) % 2 === 0) {
                    this.spawnMiningParticle();
                    runTransaction(ref(database, `users/${State.userId}/coins`), (curr) => {
                        return (parseFloat(curr) || 0) + 0.3;
                    });
                }
            } else {
                timerText.innerText = "01:00:00";
                rigCard.classList.remove('active-rig');
                led.classList.remove('active');
                stateLabel.innerText = "STANDBY";
                stateLabel.style.color = "var(--accent-cyan)";
                hashVal.innerText = "0.0 MH/s";
                laserBar.style.width = "0%";
            }
        }, 1000);
    },

    spawnMiningParticle: function() {
        const container = document.getElementById('sparkle-container');
        if (!container) return;
        const particle = document.createElement('div');
        particle.className = 'sparkle-coin';
        particle.innerText = '+0.15 🪙';
        particle.style.left = `${25 + Math.random() * 50}%`;
        particle.style.top = `${30 + Math.random() * 30}%`;
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 1600);
    },

    updateMiningUI: function() {
        const now = Date.now();
        const btnLabel = document.getElementById('btn-mine-label');
        const reqAds = State.admin.mining.ads_required;
        document.getElementById('mining-ads-status').innerText = `ADS: ${State.miningAdsWatched}/${reqAds}`;

        if (State.miningEndTime > now) {
            btnLabel.innerText = "Rig Power Active (Turbofans ON)";
            document.getElementById('btn-mine-action').disabled = true;
        } else if (State.miningAdsWatched < reqAds) {
            btnLabel.innerText = `Watch Ads to Power Up (${State.miningAdsWatched}/${reqAds})`;
            document.getElementById('btn-mine-action').disabled = false;
        } else {
            btnLabel.innerText = "Start 1-Hour Quantum Mining";
            document.getElementById('btn-mine-action').disabled = false;
        }
    },

    watchTaskAd: function(rewardCoins, title) {
        SoundFX.playClick();
        State.pendingAdReward = { type: 'coins', amount: rewardCoins, title: title };
        this.triggerRewardedAd();
    },

    creditCoins: async function(amount, reason) {
        State.lastAdWatchTime = Date.now();
        await runTransaction(ref(database, `users/${State.userId}/coins`), (curr) => {
            return (parseFloat(curr) || 0) + amount;
        });
        push(ref(database, `users/${State.userId}/coin_history`), {
            amount: amount,
            reason: reason,
            timestamp: Date.now()
        });
        SoundFX.playCoin();
        this.toast(`+${amount} Coins Credited!`, "success");
    },

    calculateSwapPreview: function() {
        const amount = parseFloat(document.getElementById('swap-coins-input').value) || 0;
        const target = document.getElementById('swap-target-currency').value;
        const out = document.getElementById('swap-output-preview');

        if (target === 'INR') out.value = `₹ ${(amount / State.admin.rates.coin_to_inr).toFixed(2)}`;
        else out.value = `$ ${(amount / State.admin.rates.coin_to_usdt).toFixed(3)}`;
    },

    triggerCoinExchange: async function() {
        SoundFX.playClick();
        const coinsToSwap = parseFloat(document.getElementById('swap-coins-input').value) || 0;
        const minSwap = State.admin.exchange.min_swap_coins;

        if (coinsToSwap < minSwap) {
            this.toast(`Minimum swap is ${minSwap} Coins`, "error");
            return;
        }
        if (coinsToSwap > State.coins) {
            this.toast("Insufficient coin balance", "error");
            return;
        }

        if (State.admin.exchange.ads_required > 0) {
            this.toast("Watch required AdMob ad before swapping...", "info");
            State.pendingAdReward = { type: 'swap', coinsToSwap: coinsToSwap };
            this.triggerRewardedAd();
            return;
        }

        await this.executeSwap(coinsToSwap);
    },

    executeSwap: async function(coinsToSwap) {
        const target = document.getElementById('swap-target-currency').value;
        await runTransaction(ref(database, `users/${State.userId}`), (u) => {
            if (!u || u.coins < coinsToSwap) return;
            u.coins -= coinsToSwap;
            if (target === 'INR') u.inr_balance = (parseFloat(u.inr_balance) || 0) + (coinsToSwap / State.admin.rates.coin_to_inr);
            else u.usdt_balance = (parseFloat(u.usdt_balance) || 0) + (coinsToSwap / State.admin.rates.coin_to_usdt);
            return u;
        });

        document.getElementById('swap-coins-input').value = '';
        document.getElementById('swap-output-preview').value = '';
        SoundFX.playCoin();
        this.toast("Coins swapped successfully!", "success");
    },

    openWithdrawModal: function() {
        SoundFX.playClick();
        document.getElementById('modal-withdraw').classList.add('open');
        this.selectPayoutMethod('UPI');
    },

    selectPayoutMethod: function(method) {
        SoundFX.playClick();
        State.selectedPayoutMethod = method;
        const tabUpi = document.getElementById('tab-upi');
        const tabTon = document.getElementById('tab-ton');
        const labelDest = document.getElementById('withdraw-label-dest');
        const inputDest = document.getElementById('withdraw-dest-input');
        const warning = document.getElementById('ton-warning');

        inputDest.value = '';
        document.getElementById('withdraw-amount-input').value = '';

        if (method === 'UPI') {
            tabUpi.classList.add('selected');
            tabTon.classList.remove('selected');
            labelDest.innerText = "YOUR UPI ID";
            inputDest.placeholder = "e.g. mobile@paytm or name@okhdfcbank";
            warning.style.display = "none";
        } else {
            tabTon.classList.add('selected');
            tabUpi.classList.remove('selected');
            labelDest.innerText = "USDT (TON NETWORK) WALLET ADDRESS";
            inputDest.placeholder = "UQ... or EQ... (TON Address)";
            warning.style.display = "block";
        }
    },

    submitPayoutRequest: async function() {
        SoundFX.playClick();
        const dest = document.getElementById('withdraw-dest-input').value.trim();
        const amount = parseFloat(document.getElementById('withdraw-amount-input').value) || 0;
        const method = State.selectedPayoutMethod;
        const minUpi = State.admin.withdrawals.min_upi_inr;
        const minTon = State.admin.withdrawals.min_ton_usdt;

        if (!dest || amount <= 0) {
            this.toast("Enter valid details & amount", "error");
            return;
        }

        if (method === 'UPI') {
            if (amount < minUpi) {
                this.toast(`Minimum UPI withdrawal is ₹${minUpi}`, "error");
                return;
            }
            if (amount > State.inr) {
                this.toast("Insufficient INR balance. Swap coins first.", "error");
                return;
            }
        } else {
            if (amount < minTon) {
                this.toast(`Minimum USDT (TON) withdrawal is $${minTon}`, "error");
                return;
            }
            if (amount > State.usdt) {
                this.toast("Insufficient USDT balance. Swap coins first.", "error");
                return;
            }
        }

        await runTransaction(ref(database, `users/${State.userId}`), (u) => {
            if (!u) return;
            if (method === 'UPI') u.inr_balance -= amount;
            else u.usdt_balance -= amount;
            return u;
        });

        await push(ref(database, 'withdrawals'), {
            userId: State.userId,
            userEmail: State.user.email,
            amount: amount,
            method: method === 'UPI' ? 'UPI' : 'USDT_TON',
            network: method === 'UPI' ? 'Bank' : 'TON',
            destination: dest,
            status: 'Pending',
            timestamp: Date.now()
        });

        this.closeModals();
        SoundFX.playSuccess();
        this.toast("Withdrawal submitted! Processed in 12-24h.", "success");
    },

    listenToHistory: function() {
        const q = query(ref(database, 'withdrawals'), orderByChild('userId'), equalTo(State.userId));
        onValue(q, (snapshot) => {
            const c = document.getElementById('tx-history-container');
            c.innerHTML = '';
            const data = snapshot.val();
            if (!data) {
                c.innerHTML = `<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px;">No withdrawal requests yet</p>`;
                return;
            }
            Object.values(data).sort((a,b) => b.timestamp - a.timestamp).forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                const isUpi = item.method === 'UPI';
                const badgeClass = item.status === 'Approved' ? 'status-approved' : (item.status === 'Rejected' ? 'status-rejected' : 'status-pending');
                el.innerHTML = `
                    <div>
                        <div style="font-size:13px; font-weight:800;">${item.method === 'UPI' ? '🇮🇳 UPI Transfer' : '💎 USDT (TON)'}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${new Date(item.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:14px; font-weight:800;">${isUpi ? '₹' : '$'}${item.amount}</div>
                        <span class="status-pill ${badgeClass}">${item.status}</span>
                    </div>
                `;
                c.appendChild(el);
            });
        });
    },

    listenToReferralStats: function() {
        const q = query(ref(database, 'referral_bindings'), orderByChild('referrerUid'), equalTo(State.userId));
        onValue(q, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                document.getElementById('ref-invited-count').innerText = "0";
                document.getElementById('ref-qualified-count').innerText = "0";
                document.getElementById('ref-commission-val').innerText = "0 C";
                return;
            }
            const list = Object.values(data);
            const totalInvited = list.length;
            const qualified = list.filter(item => item.status === 'Qualified').length;
            const totalEarned = qualified * (State.admin.referral.reward_coins || 200);

            document.getElementById('ref-invited-count').innerText = totalInvited;
            document.getElementById('ref-qualified-count').innerText = qualified;
            document.getElementById('ref-commission-val').innerText = `${totalEarned} C`;
        });
    },

    listenToTasks: function() {
        onValue(ref(database, 'tasks'), (snap) => {
            const c = document.getElementById('tasks-container');
            c.innerHTML = '';
            const tasks = snap.val();
            if (!tasks) {
                c.innerHTML = `<p style="font-size:12px; color:var(--text-muted); text-align:center; padding:20px;">No new tasks available today.</p>`;
                return;
            }
            Object.keys(tasks).forEach(id => {
                const t = tasks[id];
                const card = document.createElement('div');
                card.className = 'task-card';

                let instructionsHtml = '';
                if (t.instructions && Array.isArray(t.instructions)) {
                    instructionsHtml = `<div class="task-steps-box">` + 
                        t.instructions.map((step, idx) => `
                            <div class="step-row">
                                <div class="step-num">${idx + 1}</div>
                                <div>${step}</div>
                            </div>
                        `).join('') + `</div>`;
                }

                card.innerHTML = `
                    <div class="task-card-top">
                        <img class="task-icon" src="${t.logoUrl || 'https://via.placeholder.com/48'}">
                        <div class="task-info">
                            <div class="task-name">${t.name}</div>
                            <div class="task-meta">
                                <span style="color:var(--accent-gold); font-weight:800;">+${t.reward || 100} Coins</span>
                                <span style="color:var(--text-muted);">⏱️ ~2 mins</span>
                            </div>
                        </div>
                    </div>
                    ${instructionsHtml}
                    <button class="btn-primary" onclick="SoundFX.playClick(); window.open('${t.link || '#'}', '_blank')">Complete Task</button>
                `;
                c.appendChild(card);
            });
        });
    },

    switchTab: function(viewId) {
        SoundFX.playClick();
        document.querySelectorAll('.section-view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId)?.classList.add('active');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        const idx = ['view-home', 'view-tasks', 'view-watch', 'view-wallet', 'view-refer'].indexOf(viewId);
        if (idx >= 0) document.querySelectorAll('.bottom-nav .nav-tab')[idx].classList.add('active');
    },

    copyReferralLink: function() {
        SoundFX.playClick();
        const origin = window.location.origin + window.location.pathname;
        const link = `${origin}?ref=${State.userId}`;
        navigator.clipboard.writeText(link).then(() => {
            SoundFX.playCoin();
            this.toast("Unique invite link copied to clipboard!", "success");
        }).catch(() => {
            this.toast(`Code: ${State.userId}`, "info");
        });
    },

    openProfileModal: function() {
        SoundFX.playClick();
        document.getElementById('modal-profile').classList.add('open');
    },

    openSupportLink: function() {
        SoundFX.playClick();
        window.open("https://t.me/MiningFatherhelp", "_blank");
    },

    closeModals: function() {
        SoundFX.playClick();
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    },

    toast: function(msg, type = 'info') {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
        t.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    }
};

// ================= UNIVERSAL REWARD RECEIVER =================
window.onNativeAdRewarded = async function(rawTarget) {
    State.lastAdWatchTime = Date.now();
    const reward = State.pendingAdReward;
    State.pendingAdReward = null;

    // 1. Mining Reward Handler
    if (rawTarget === 'mining' || (reward && reward.type === 'mining')) {
        const reqMiningAds = State.admin.mining.ads_required;
        if (State.miningEndTime <= Date.now() && State.miningAdsWatched < reqMiningAds) {
            await runTransaction(ref(database, `users/${State.userId}/miningAdsWatched`), (curr) => {
                return (parseInt(curr) || 0) + 1;
            });
            SoundFX.playCoin();
            App.toast("Ad Completed! Power step added.", "success");
        }
    }
    // 2. Coin Swap Reward Handler
    else if (rawTarget === 'swap' || (reward && reward.type === 'swap')) {
        const coinsToSwap = parseFloat(document.getElementById('swap-coins-input').value) || 0;
        await App.executeSwap(coinsToSwap);
    }
    // 3. Task Rewarded Interstitial Coins Handler
    else if (rawTarget && typeof rawTarget === 'string' && rawTarget.startsWith('coins_')) {
        const parts = rawTarget.split('_');
        const coins = parseFloat(parts[1]) || 50;
        const title = parts.slice(2).join(' ') || 'AdMob Video';
        await App.creditCoins(coins, title);
    }
    else if (reward && reward.type === 'coins') {
        await App.creditCoins(reward.amount || 50, reward.title || "AdMob Video Ad");
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
