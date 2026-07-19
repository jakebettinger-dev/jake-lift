"use strict";
const { useState, useEffect, useMemo, useCallback, useRef } = React;
/* ---------- palette & type ---------- */
const c = {
    bg: "#0F1218", surface: "#171B24", surfaceHi: "#1F2530", line: "#2A313E",
    text: "#E8ECF2", dim: "#8A94A6", faint: "#5A6473",
    accent: "#F5B93B", good: "#34D399", bad: "#F2637E", water: "#4EA8DE", remind: "#B694F5",
};
const fDisp = "'Barlow Condensed', system-ui, sans-serif";
const fBody = "'Inter', system-ui, sans-serif";
const PROGRAM = {
    1: { name: "Push · Schouders", ex: [
            ["Shoulder Press (machine)", 4, "8–10"], ["Incline Chest Press", 3, "8–12"],
            ["Side Lateral Raise (dumbbell)", 4, "12–15"], ["Cable Lateral Raise", 3, "12–15"],
            ["Triceps Pushdown", 3, "10–12"], ["Cable Crunch", 3, "12–15"]
        ] },
    2: { name: "Pull · Rug", ex: [
            ["Lat Pulldown", 4, "8–12"], ["Seated Cable Row", 3, "8–12"],
            ["Rear Delt Fly (machine)", 4, "12–15"], ["Face Pull", 3, "15–20"],
            ["Biceps Curl (dumbbell)", 3, "10–12"], ["Ab Crunch Machine", 3, "12–15"]
        ] },
    3: { name: "Benen", ex: [
            ["Leg Press", 4, "10–12"], ["Romanian Deadlift", 3, "8–10"],
            ["Leg Curl", 3, "10–12"], ["Leg Extension", 3, "12–15"],
            ["Standing Calf Raise", 4, "12–15"], ["Cable Crunch", 3, "12–15"]
        ] },
    4: { name: "Schouders · Armen", ex: [
            ["Seated Dumbbell Shoulder Press", 4, "8–10"], ["Side Lateral Raise (dumbbell)", 4, "12–15"],
            ["Rear Delt Fly (cable)", 3, "12–15"], ["Cable Upright Row", 3, "12–15"],
            ["Triceps Overhead Extension", 3, "10–12"], ["Biceps Cable Curl", 3, "10–12"],
            ["Ab Crunch Machine", 3, "12–15"]
        ] },
    5: { name: "Schouders · Abs +", optional: true, ex: [
            ["Seated Dumbbell Shoulder Press", 4, "8–10"], ["Cable Lateral Raise", 4, "12–15"],
            ["Side Lateral Raise (dumbbell)", 3, "12–15"], ["Rear Delt Fly (machine)", 3, "12–15"],
            ["Cable Crunch", 3, "12–15"], ["Ab Crunch Machine", 3, "12–15"]
        ] },
    6: { name: "Armen · Abs +", optional: true, ex: [
            ["Biceps Curl (dumbbell)", 4, "10–12"], ["Triceps Pushdown", 4, "10–12"],
            ["Biceps Cable Curl", 3, "12–15"], ["Triceps Overhead Extension", 3, "10–12"],
            ["Weighted Decline Sit-up", 3, "12–15"], ["Cable Crunch", 3, "12–15"]
        ] },
};
const DEFAULT_HABITS = ["Getraind", "Genoeg eiwit", "7+ uur slaap", "10k stappen", "Water gehaald"];
/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const mondayOf = (d) => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; };
const parseISO = (s) => { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); };
const shortDay = (s) => parseISO(s).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const longDay = (s) => parseISO(s).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const dow = (s) => parseISO(s).toLocaleDateString("nl-NL", { weekday: "short" });
const fmtUpdated = (s) => { try {
    return "Bijgewerkt " + new Date(s).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
catch {
    return "";
} };
const nl = (n) => n.toLocaleString("nl-NL");
const store = {
    get(k, fb) { try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : fb;
    }
    catch {
        return fb;
    } },
    set(k, v) { try {
        localStorage.setItem(k, JSON.stringify(v));
    }
    catch { } },
};
const topSet = (sets) => {
    const valid = sets.filter((s) => s.w !== "" && s.r !== "");
    if (!valid.length)
        return null;
    return valid.reduce((best, s) => { const w = +s.w, r = +s.r; if (!best || w > best.w || (w === best.w && r > best.r))
        return { w, r }; return best; }, null);
};
const sessionVolume = (s) => s.exercises.reduce((t, e) => t + e.sets.reduce((a, x) => a + (+x.w) * (+x.r), 0), 0);
/* ---------- tiny SVG line chart ---------- */
function LineChart({ values, color, height }) {
    height = height || 180;
    if (!values || values.length < 2)
        return React.createElement("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center", color: c.faint, fontSize: 12 } }, "Nog te weinig data voor een grafiek");
    const W = 320, H = 180, P = { l: 6, r: 6, t: 14, b: 10 };
    const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1, n = values.length;
    const x = (i) => P.l + (i / (n - 1)) * (W - P.l - P.r);
    const y = (v) => P.t + (1 - (v - min) / range) * (H - P.t - P.b);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return (React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: { display: "block" } },
        React.createElement("line", { x1: P.l, y1: y(max), x2: W - P.r, y2: y(max), stroke: c.line, strokeWidth: "1" }),
        React.createElement("line", { x1: P.l, y1: y(min), x2: W - P.r, y2: y(min), stroke: c.line, strokeWidth: "1" }),
        React.createElement("text", { x: P.l, y: y(max) - 4, fill: c.faint, fontSize: "9" }, nl(max)),
        React.createElement("text", { x: P.l, y: y(min) + 11, fill: c.faint, fontSize: "9" }, nl(min)),
        React.createElement("polyline", { points: pts, fill: "none", stroke: color, strokeWidth: "2.4", strokeLinejoin: "round", strokeLinecap: "round" }),
        values.map((v, i) => React.createElement("circle", { key: i, cx: x(i), cy: y(v), r: "3", fill: color }))));
}
/* ================================================================== */
function App() {
    const [tab, setTab] = useState("train");
    const [workouts, setWorkouts] = useState(() => store.get("gymtracker:workouts", []));
    const [habits, setHabits] = useState(() => { var _a; const h = store.get("gymtracker:habits", null); return h && ((_a = h.list) === null || _a === void 0 ? void 0 : _a.length) ? h : { list: DEFAULT_HABITS.map((n, i) => ({ id: "h" + i, name: n })), log: {} }; });
    const [bw, setBw] = useState(() => store.get("gymtracker:bodyweight", []));
    const [notes, setNotes] = useState(() => store.get("gymtracker:notes", []));
    const [water, setWater] = useState(() => store.get("gymtracker:water", {}));
    const [shopping, setShopping] = useState(() => store.get("gymtracker:shopping", []));
    const [reminders, setReminders] = useState(() => store.get("gymtracker:reminders", []));
    const initSettings = store.get("gymtracker:settings", { extraDays: false, waterGoal: 2500 });
    const [extraDays, setExtraDays] = useState(!!initSettings.extraDays);
    const [waterGoal, setWaterGoal] = useState(initSettings.waterGoal || 2500);
    const initDraft = store.get("gymtracker:draft", null);
    const [day, setDay] = useState(initDraft ? initDraft.day : 1);
    const [draft, setDraft] = useState(initDraft ? initDraft.draft : null);
    const [order, setOrder] = useState(initDraft ? initDraft.order : null);
    const [toast, setToast] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [customName, setCustomName] = useState("");
    const [bwInput, setBwInput] = useState("");
    const fileRef = useRef(null);
    const [sync, setSync] = useState(() => store.get("gymtracker:sync", { owner: "", repo: "", token: "", path: "data.json", auto: false }));
    const [syncStatus, setSyncStatus] = useState("");
    const syncMeta = useRef(store.get("gymtracker:sync-meta", { savedAt: 0, sha: null }));
    const applyingRemote = useRef(false);
    const syncReady = useRef(false);
    const pushTimer = useRef(null);
    const pushing = useRef(false);
    const pushPending = useRef(false);
    const saveSync = (patch) => { const merged = { ...sync, ...patch }; setSync(merged); store.set("gymtracker:sync", merged); };
    useEffect(() => { if (!draft)
        initDay(1); }, []);
    const toastMsg = (m) => { setToast(m); setTimeout(() => setToast(""), 1900); };
    const saveSettings = (patch) => store.set("gymtracker:settings", { extraDays, waterGoal, ...patch });
    function initDay(dn) {
        const dr = {}, ord = [];
        PROGRAM[dn].ex.forEach(([name, sets]) => { dr[name] = Array.from({ length: sets }, () => ({ w: "", r: "" })); ord.push(name); });
        setDraft(dr);
        setOrder(ord);
        store.set("gymtracker:draft", { day: dn, draft: dr, order: ord });
    }
    const persistDraft = (dr, ord, dn = day) => store.set("gymtracker:draft", { day: dn, draft: dr, order: ord });
    const pickDay = (dn) => { setDay(dn); initDay(dn); };
    function toggleExtra(v) { setExtraDays(v); saveSettings({ extraDays: v }); if (!v && day > 4) {
        setDay(1);
        initDay(1);
    } }
    function changeGoal(v) { const g = Math.max(500, Math.min(8000, v || 2500)); setWaterGoal(g); saveSettings({ waterGoal: g }); }
    function updateSet(ex, i, f, val) { setDraft(p => { const n = { ...p, [ex]: p[ex].map((s, j) => j === i ? { ...s, [f]: val } : s) }; persistDraft(n, order); return n; }); }
    function stepSet(ex, i, f, delta) { setDraft(p => { const cur = p[ex][i][f]; const base = cur === "" ? 0 : +cur; const val = Math.max(0, +(base + delta).toFixed(2)); const n = { ...p, [ex]: p[ex].map((s, j) => j === i ? { ...s, [f]: String(val) } : s) }; persistDraft(n, order); return n; }); }
    function addSet(ex) { setDraft(p => { const n = { ...p, [ex]: [...p[ex], { w: "", r: "" }] }; persistDraft(n, order); return n; }); }
    function removeSet(ex) { setDraft(p => { if (p[ex].length <= 1)
        return p; const n = { ...p, [ex]: p[ex].slice(0, -1) }; persistDraft(n, order); return n; }); }
    function addCustom() { const nm = customName.trim(); if (!nm || draft[nm]) {
        setCustomName("");
        return;
    } const nd = { ...draft, [nm]: [{ w: "", r: "" }, { w: "", r: "" }, { w: "", r: "" }] }; const no = [...order, nm]; setDraft(nd); setOrder(no); setCustomName(""); persistDraft(nd, no); }
    function saveWorkout() {
        const exercises = order.map(name => ({ name, sets: draft[name].filter(s => s.w !== "" && s.r !== "") })).filter(e => e.sets.length);
        if (!exercises.length) {
            toastMsg("Log eerst minstens één set");
            return;
        }
        const session = { id: Date.now(), date: today(), day, dayName: PROGRAM[day].name, exercises };
        const next = [...workouts, session];
        setWorkouts(next);
        store.set("gymtracker:workouts", next);
        initDay(day);
        toastMsg("Training opgeslagen 💪");
    }
    function addWater(ml) { const t = today(); const val = Math.max(0, (water[t] || 0) + ml); const n = { ...water, [t]: val }; setWater(n); store.set("gymtracker:water", n); }
    function addShop(text) { const t = text.trim(); if (!t)
        return; const n = [{ id: Date.now(), text: t, done: false }, ...shopping]; setShopping(n); store.set("gymtracker:shopping", n); }
    function toggleShop(id) { const n = shopping.map(x => x.id === id ? { ...x, done: !x.done } : x); setShopping(n); store.set("gymtracker:shopping", n); }
    function deleteShop(id) { const n = shopping.filter(x => x.id !== id); setShopping(n); store.set("gymtracker:shopping", n); }
    function clearChecked() { const n = shopping.filter(x => !x.done); setShopping(n); store.set("gymtracker:shopping", n); }
    function addReminder(text, due) { const t = text.trim(); if (!t)
        return; const n = [{ id: Date.now(), text: t, created: today(), due: due || null, done: false, completed: null }, ...reminders]; setReminders(n); store.set("gymtracker:reminders", n); }
    function toggleReminder(id) { const n = reminders.map(x => x.id === id ? { ...x, done: !x.done, completed: !x.done ? today() : null } : x); setReminders(n); store.set("gymtracker:reminders", n); }
    function deleteReminder(id) { const n = reminders.filter(x => x.id !== id); setReminders(n); store.set("gymtracker:reminders", n); }
    function addNote() { const n = [{ id: Date.now(), text: "", updated: new Date().toISOString() }, ...notes]; setNotes(n); store.set("gymtracker:notes", n); }
    function updateNote(id, text) { const n = notes.map(x => x.id === id ? { ...x, text, updated: new Date().toISOString() } : x); setNotes(n); store.set("gymtracker:notes", n); }
    function deleteNote(id) { const note = notes.find(x => x.id === id); if (note && note.text.trim()) {
        let ok = true;
        try {
            ok = window.confirm("Deze notitie verwijderen?");
        }
        catch { }
        if (!ok)
            return;
    } const n = notes.filter(x => x.id !== id); setNotes(n); store.set("gymtracker:notes", n); }
    function addBw() { const v = parseFloat(bwInput.replace(",", ".")); if (!v)
        return; const next = [...bw.filter(e => e.date !== today()), { date: today(), kg: v }].sort((a, b) => a.date.localeCompare(b.date)); setBw(next); store.set("gymtracker:bodyweight", next); setBwInput(""); toastMsg("Gewicht opgeslagen"); }
    function exportData() {
        const payload = { app: "jake-lift", version: 2, exported: new Date().toISOString(), workouts, habits, bodyweight: bw, notes, water, shopping, reminders, settings: { extraDays, waterGoal } };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jake-lift-backup-${today()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toastMsg("Back-up gedownload ↓");
    }
    function handleFile(e) {
        var _a;
        const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        e.target.value = "";
        if (!file)
            return;
        let ok = true;
        try {
            ok = window.confirm("Dit vervangt je huidige data door de back-up. Doorgaan?");
        }
        catch { }
        if (!ok)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            var _a;
            try {
                const d = JSON.parse(reader.result);
                if (Array.isArray(d.workouts)) {
                    setWorkouts(d.workouts);
                    store.set("gymtracker:workouts", d.workouts);
                }
                if ((_a = d.habits) === null || _a === void 0 ? void 0 : _a.list) {
                    setHabits(d.habits);
                    store.set("gymtracker:habits", d.habits);
                }
                if (Array.isArray(d.bodyweight)) {
                    setBw(d.bodyweight);
                    store.set("gymtracker:bodyweight", d.bodyweight);
                }
                if (Array.isArray(d.notes)) {
                    setNotes(d.notes);
                    store.set("gymtracker:notes", d.notes);
                }
                if (d.water && typeof d.water === "object") {
                    setWater(d.water);
                    store.set("gymtracker:water", d.water);
                }
                if (Array.isArray(d.shopping)) {
                    setShopping(d.shopping);
                    store.set("gymtracker:shopping", d.shopping);
                }
                if (Array.isArray(d.reminders)) {
                    setReminders(d.reminders);
                    store.set("gymtracker:reminders", d.reminders);
                }
                if (d.settings) {
                    setExtraDays(!!d.settings.extraDays);
                    setWaterGoal(d.settings.waterGoal || 2500);
                    store.set("gymtracker:settings", d.settings);
                }
                setShowSettings(false);
                toastMsg("Back-up geladen ✓");
            }
            catch {
                toastMsg("Kon dit bestand niet lezen");
            }
        };
        reader.readAsText(file);
    }
    /* ---- GitHub sync ---- */
    function collectData() { return { app: "jake-lift", version: 2, savedAt: Date.now(), workouts, habits, bodyweight: bw, notes, water, shopping, reminders, settings: { extraDays, waterGoal } }; }
    function applyData(d) {
        var _a;
        if (Array.isArray(d.workouts)) {
            setWorkouts(d.workouts);
            store.set("gymtracker:workouts", d.workouts);
        }
        if ((_a = d.habits) === null || _a === void 0 ? void 0 : _a.list) {
            setHabits(d.habits);
            store.set("gymtracker:habits", d.habits);
        }
        if (Array.isArray(d.bodyweight)) {
            setBw(d.bodyweight);
            store.set("gymtracker:bodyweight", d.bodyweight);
        }
        if (Array.isArray(d.notes)) {
            setNotes(d.notes);
            store.set("gymtracker:notes", d.notes);
        }
        if (d.water && typeof d.water === "object") {
            setWater(d.water);
            store.set("gymtracker:water", d.water);
        }
        if (Array.isArray(d.shopping)) {
            setShopping(d.shopping);
            store.set("gymtracker:shopping", d.shopping);
        }
        if (Array.isArray(d.reminders)) {
            setReminders(d.reminders);
            store.set("gymtracker:reminders", d.reminders);
        }
        if (d.settings) {
            setExtraDays(!!d.settings.extraDays);
            setWaterGoal(d.settings.waterGoal || 2500);
            store.set("gymtracker:settings", d.settings);
        }
    }
    const b64encode = (s) => btoa(unescape(encodeURIComponent(s)));
    const b64decode = (b) => decodeURIComponent(escape(atob(b.replace(/\s/g, ""))));
    const ghHeaders = () => ({ Authorization: "Bearer " + sync.token, Accept: "application/vnd.github+json" });
    const ghUrl = () => `https://api.github.com/repos/${sync.owner}/${sync.repo}/contents/${sync.path || "data.json"}`;
    async function ghGet() {
        // Bypass the browser HTTP cache (GitHub sends Cache-Control: private, max-age=60),
        // otherwise we'd read a stale sha and every PUT would 409. Cache-buster + no-store.
        const res = await fetch(ghUrl() + "?nc=" + Date.now(), { headers: ghHeaders(), cache: "no-store" });
        if (res.status === 404)
            return { sha: null, data: null };
        if (!res.ok)
            throw new Error(res.status === 401 ? "token ongeldig" : ("GitHub " + res.status));
        const j = await res.json();
        return { sha: j.sha, data: JSON.parse(b64decode(j.content)) };
    }
    const configured = () => sync.owner && sync.repo && sync.token;
    async function pushToGitHub(silent) {
        var _a;
        if (!configured()) {
            if (!silent)
                setSyncStatus("Vul eerst gebruikersnaam, repo en token in.");
            return;
        }
        // Serialize pushes: if one is already running, mark that another is needed and bail.
        if (pushing.current) {
            pushPending.current = true;
            return;
        }
        pushing.current = true;
        try {
            if (!silent)
                setSyncStatus("Bezig met opslaan…");
            const payload = collectData();
            const str = JSON.stringify(payload, null, 2);
            let lastErr = "onbekende fout";
            // Retry on sha-conflict (409/422): re-fetch the current sha and try again.
            for (let attempt = 0; attempt < 3; attempt++) {
                let sha = null;
                try {
                    sha = (await ghGet()).sha;
                }
                catch (_) { }
                const body = { message: "Jake.Lift " + new Date().toISOString(), content: b64encode(str) };
                if (sha)
                    body.sha = sha;
                const res = await fetch(ghUrl(), { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
                if (res.ok) {
                    const j = await res.json();
                    syncMeta.current = { savedAt: payload.savedAt, sha: ((_a = j.content) === null || _a === void 0 ? void 0 : _a.sha) || null };
                    store.set("gymtracker:sync-meta", syncMeta.current);
                    setSyncStatus("Opgeslagen op GitHub · " + new Date().toLocaleTimeString("nl-NL"));
                    return;
                }
                const t = await res.text();
                lastErr = res.status + " " + t.slice(0, 90);
                if (res.status !== 409 && res.status !== 422)
                    break; // only conflicts are worth retrying
            }
            throw new Error(lastErr);
        }
        catch (e) {
            setSyncStatus("Fout bij opslaan: " + e.message);
        }
        finally {
            pushing.current = false;
            if (pushPending.current) {
                pushPending.current = false;
                pushToGitHub(true);
            } // flush the queued change with fresh data
        }
    }
    async function pullFromGitHub(silent) {
        if (!configured()) {
            if (!silent)
                setSyncStatus("Vul eerst gebruikersnaam, repo en token in.");
            return;
        }
        try {
            if (!silent)
                setSyncStatus("Bezig met ophalen…");
            const { sha, data } = await ghGet();
            if (!data) {
                if (!silent)
                    setSyncStatus("Nog geen data op GitHub — sla eerst een keer op.");
                return;
            }
            if (silent && data.savedAt && data.savedAt <= (syncMeta.current.savedAt || 0))
                return;
            applyingRemote.current = true;
            applyData(data);
            syncMeta.current = { savedAt: data.savedAt || Date.now(), sha };
            store.set("gymtracker:sync-meta", syncMeta.current);
            setTimeout(() => { applyingRemote.current = false; }, 700);
            if (!silent)
                setSyncStatus("Opgehaald van GitHub · " + new Date().toLocaleTimeString("nl-NL"));
        }
        catch (e) {
            setSyncStatus("Fout bij ophalen: " + e.message);
        }
    }
    async function forceRefresh() {
        try {
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
            if (window.caches) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        }
        catch (_) { }
        location.replace(location.pathname.replace(/[?#].*$/, "") + "?r=" + Date.now());
    }
    useEffect(() => { (async () => { if (sync.auto && configured()) {
        await pullFromGitHub(true);
    } syncReady.current = true; })(); }, []);
    useEffect(() => {
        if (!syncReady.current || applyingRemote.current)
            return;
        if (!sync.auto || !configured())
            return;
        if (pushTimer.current)
            clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => { pushToGitHub(true); }, 2500);
        return () => { if (pushTimer.current)
            clearTimeout(pushTimer.current); };
    }, [workouts, habits, bw, notes, water, shopping, reminders, extraDays, waterGoal, sync.auto]);
    const lastSessionTop = useCallback((ex) => { for (let i = workouts.length - 1; i >= 0; i--) {
        const f = workouts[i].exercises.find(e => e.name === ex);
        if (f)
            return topSet(f.sets);
    } return null; }, [workouts]);
    const bestEver = useCallback((ex) => { let best = null; workouts.forEach(wk => wk.exercises.forEach(e => { if (e.name !== ex)
        return; const t = topSet(e.sets); if (t && (!best || t.w > best.w || (t.w === best.w && t.r > best.r)))
        best = t; })); return best; }, [workouts]);
    const weekStats = useMemo(() => { const mon = iso(mondayOf(new Date())); const wk = workouts.filter(w => w.date >= mon); return { count: wk.length, vol: Math.round(wk.reduce((t, s) => t + sessionVolume(s), 0)) }; }, [workouts]);
    const last7 = useMemo(() => { const out = []; for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(iso(d));
    } return out; }, []);
    function toggleHabit(hid, d) { setHabits(p => { const day = { ...(p.log[d] || {}) }; day[hid] = !day[hid]; const n = { ...p, log: { ...p.log, [d]: day } }; store.set("gymtracker:habits", n); return n; }); }
    function addHabit(name) { const nm = name.trim(); if (!nm)
        return; setHabits(p => { const n = { ...p, list: [...p.list, { id: "h" + Date.now(), name: nm }] }; store.set("gymtracker:habits", n); return n; }); }
    function removeHabit(hid) { setHabits(p => { const n = { ...p, list: p.list.filter(h => h.id !== hid) }; store.set("gymtracker:habits", n); return n; }); }
    const streakOf = useCallback((hid) => { var _a; let s = 0; for (let i = 0;; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = iso(d);
        if ((_a = habits.log[key]) === null || _a === void 0 ? void 0 : _a[hid])
            s++;
        else if (i === 0)
            continue;
        else
            break;
    } return s; }, [habits]);
    if (!draft)
        return React.createElement("div", { style: { color: c.dim, padding: 40, textAlign: "center" } }, "Laden\u2026");
    const days = extraDays ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
    const waterToday = water[today()] || 0;
    const navPadBottom = "calc(10px + env(safe-area-inset-bottom))";
    return (React.createElement("div", { style: { maxWidth: 480, margin: "0 auto", position: "relative", minHeight: "100vh", color: c.text } },
        React.createElement("div", { style: { padding: "calc(16px + env(safe-area-inset-top)) 18px 14px", borderBottom: `1px solid ${c.line}` } },
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" } },
                React.createElement("div", null,
                    React.createElement("div", { style: { fontFamily: fDisp, fontSize: 26, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1 } },
                        "JAKE",
                        React.createElement("span", { style: { color: c.accent } }, "."),
                        "LIFT"),
                    React.createElement("div", { style: { color: c.faint, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 } }, "Basic Fit \u00B7 schouders + abs")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
                    React.createElement(WeekBadge, { count: weekStats.count, vol: weekStats.vol }),
                    React.createElement("button", { onClick: () => setShowSettings(true), style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10, width: 36, height: 36, fontSize: 17, cursor: "pointer", color: c.dim } }, "\u2699\uFE0F")))),
        React.createElement("div", { style: { padding: `16px 14px calc(96px + env(safe-area-inset-bottom))`, minHeight: 380 } },
            tab === "train" && React.createElement(React.Fragment, null,
                React.createElement(WaterCard, { ml: waterToday, goal: waterGoal, addWater: addWater }),
                React.createElement(TrainTab, { day: day, days: days, pickDay: pickDay, order: order, draft: draft, updateSet: updateSet, stepSet: stepSet, addSet: addSet, removeSet: removeSet, lastSessionTop: lastSessionTop, bestEver: bestEver, customName: customName, setCustomName: setCustomName, addCustom: addCustom, saveWorkout: saveWorkout })),
            tab === "progress" && React.createElement(ProgressTab, { workouts: workouts, bw: bw, bwInput: bwInput, setBwInput: setBwInput, addBw: addBw }),
            tab === "calendar" && React.createElement(CalendarTab, { workouts: workouts, water: water, reminders: reminders, habits: habits, waterGoal: waterGoal }),
            tab === "lists" && React.createElement(ListsTab, { notes: notes, addNote: addNote, updateNote: updateNote, deleteNote: deleteNote, shopping: shopping, addShop: addShop, toggleShop: toggleShop, deleteShop: deleteShop, clearChecked: clearChecked, reminders: reminders, addReminder: addReminder, toggleReminder: toggleReminder, deleteReminder: deleteReminder }),
            tab === "habits" && React.createElement(HabitsTab, { habits: habits, last7: last7, toggleHabit: toggleHabit, addHabit: addHabit, removeHabit: removeHabit, streakOf: streakOf })),
        showSettings && (React.createElement("div", { onClick: () => setShowSettings(false), style: { position: "fixed", inset: 0, background: "rgba(8,10,14,.72)", display: "flex", alignItems: "flex-end", zIndex: 20 } },
            React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", background: c.surface, borderTop: `1px solid ${c.line}`, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: `18px 18px calc(24px + env(safe-area-inset-bottom))` } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 } },
                    React.createElement("div", { style: { fontFamily: fDisp, fontSize: 21, fontWeight: 600 } }, "Instellingen"),
                    React.createElement("button", { onClick: () => setShowSettings(false), style: { background: "none", border: "none", color: c.dim, cursor: "pointer", fontSize: 18 } }, "\u2715")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10 } },
                    React.createElement("div", { style: { paddingRight: 12 } },
                        React.createElement("div", { style: { fontWeight: 600, fontSize: 14 } }, "Extra trainingsdagen"),
                        React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginTop: 2 } }, "Voegt dag 5 & 6 toe")),
                    React.createElement(Toggle, { on: extraDays, onClick: () => toggleExtra(!extraDays) })),
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 12 } },
                    React.createElement("div", { style: { paddingRight: 12 } },
                        React.createElement("div", { style: { fontWeight: 600, fontSize: 14 } }, "Water-doel per dag"),
                        React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginTop: 2 } }, "In milliliter")),
                    React.createElement("input", { value: waterGoal, onChange: (e) => changeGoal(parseInt(e.target.value.replace(/\D/g, "")) || 0), inputMode: "numeric", style: { width: 90, textAlign: "center", background: c.surfaceHi, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, height: 38, fontFamily: fDisp, fontSize: 17, fontWeight: 600, outline: "none" } })),
                React.createElement("div", { style: { background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12, padding: 14, marginBottom: 12 } },
                    React.createElement("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 3 } }, "Synchroniseren via GitHub"),
                    React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 } }, "Sla je data op in een priv\u00E9 GitHub-repo om hem op meerdere apparaten te gebruiken. Je token blijft alleen op dit apparaat."),
                    React.createElement("input", { value: sync.owner, onChange: (e) => saveSync({ owner: e.target.value.trim() }), placeholder: "GitHub-gebruikersnaam", autoCapitalize: "none", autoCorrect: "off", style: { ...inputStyle(1), width: "100%", marginBottom: 8 } }),
                    React.createElement("input", { value: sync.repo, onChange: (e) => saveSync({ repo: e.target.value.trim() }), placeholder: "Data-repo (bijv. jake-lift-data)", autoCapitalize: "none", autoCorrect: "off", style: { ...inputStyle(1), width: "100%", marginBottom: 8 } }),
                    React.createElement("input", { type: "password", value: sync.token, onChange: (e) => saveSync({ token: e.target.value.trim() }), placeholder: "Token (github_pat_\u2026)", autoCapitalize: "none", autoCorrect: "off", style: { ...inputStyle(1), width: "100%", marginBottom: 10 } }),
                    React.createElement("div", { style: { display: "flex", gap: 9, marginBottom: 11 } },
                        React.createElement("button", { onClick: () => pushToGitHub(false), style: { flex: 1, background: c.accent, color: "#1a1500", border: "none", borderRadius: 10, padding: 11, cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "\u2191 Opslaan"),
                        React.createElement("button", { onClick: () => pullFromGitHub(false), style: { flex: 1, background: c.surfaceHi, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, padding: 11, cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "\u2193 Ophalen")),
                    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, "Automatisch synchroniseren"),
                            React.createElement("div", { style: { color: c.faint, fontSize: 11 } }, "Opslaan bij wijziging, ophalen bij opstarten")),
                        React.createElement(Toggle, { on: sync.auto, onClick: () => saveSync({ auto: !sync.auto }) })),
                    syncStatus && React.createElement("div", { style: { color: c.dim, fontSize: 11.5, marginTop: 10 } }, syncStatus)),
                React.createElement("div", { style: { background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12, padding: 14 } },
                    React.createElement("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 3 } }, "Back-up van je data"),
                    React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginBottom: 12, lineHeight: 1.5 } }, "Verhuis je data van/naar de Claude-versie via dit bestand. Maak regelmatig een back-up \u2014 bij het wissen van Safari-data raak je hem anders kwijt."),
                    React.createElement("div", { style: { display: "flex", gap: 9 } },
                        React.createElement("button", { onClick: exportData, style: { flex: 1, background: c.accent, color: "#1a1500", border: "none", borderRadius: 10, padding: 11, cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "\u2193 Exporteren"),
                        React.createElement("button", { onClick: () => { var _a; return (_a = fileRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, style: { flex: 1, background: c.surfaceHi, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, padding: 11, cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "\u2191 Importeren")),
                    React.createElement("input", { ref: fileRef, type: "file", accept: "application/json,.json", onChange: handleFile, style: { display: "none" } })),
                React.createElement("div", { style: { background: c.bg, border: `1px solid ${c.line}`, borderRadius: 12, padding: 14 } },
                    React.createElement("div", { style: { fontWeight: 600, fontSize: 14, marginBottom: 3 } }, "App vernieuwen"),
                    React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginBottom: 12, lineHeight: 1.5 } }, "Wist de cache en herlaadt de nieuwste versie. Handig als de app na een update oud gedrag of een foutmelding blijft tonen. Je data blijft behouden."),
                    React.createElement("button", { onClick: forceRefresh, style: { width: "100%", background: c.surfaceHi, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, padding: 11, cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "\u21BB Cache wissen en herladen"))))),
        toast && (React.createElement("div", { style: { position: "fixed", bottom: "calc(90px + env(safe-area-inset-bottom))", left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 30 } },
            React.createElement("div", { style: { background: c.accent, color: "#1a1500", fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 999, boxShadow: "0 8px 24px rgba(0,0,0,.4)" } }, toast))),
        React.createElement("div", { style: { position: "fixed", bottom: 0, left: 0, right: 0, background: c.surface, borderTop: `1px solid ${c.line}`, display: "flex", padding: `8px 4px ${navPadBottom}`, zIndex: 10 } },
            React.createElement("div", { style: { display: "flex", width: "100%", maxWidth: 480, margin: "0 auto" } }, [["train", "Vandaag", "🏋️"], ["progress", "Voortgang", "📈"], ["calendar", "Kalender", "📅"], ["lists", "Lijsten", "✅"], ["habits", "Gewoontes", "🔥"]].map(([id, label, emo]) => {
                const on = tab === id;
                return React.createElement("button", { key: id, onClick: () => setTab(id), style: { flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0", color: on ? c.accent : c.faint, opacity: on ? 1 : 0.65 } },
                    React.createElement("span", { style: { fontSize: 19, filter: on ? "none" : "grayscale(0.3)" } }, emo),
                    React.createElement("span", { style: { fontSize: 10, fontWeight: on ? 600 : 500 } }, label));
            })))));
}
/* ================= WATER ================= */
function WaterCard({ ml, goal, addWater }) {
    const pct = Math.min(100, Math.round(ml / goal * 100));
    const glasses = Math.round(ml / 250);
    return (React.createElement("div", { style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, marginBottom: 16 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } },
            React.createElement("span", { style: { fontWeight: 600, fontSize: 14.5 } }, "\uD83D\uDCA7 Water vandaag"),
            React.createElement("span", { style: { fontFamily: fDisp, fontSize: 18, fontWeight: 700 } },
                nl(ml),
                " ",
                React.createElement("span", { style: { color: c.faint, fontSize: 13 } },
                    "/ ",
                    nl(goal),
                    " ml"))),
        React.createElement("div", { style: { height: 9, background: c.bg, borderRadius: 999, overflow: "hidden", marginBottom: 12 } },
            React.createElement("div", { style: { width: `${pct}%`, height: "100%", background: c.water, borderRadius: 999, transition: "width .25s" } })),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("button", { onClick: () => addWater(250), style: waterBtn }, "+ Glas 250"),
            React.createElement("button", { onClick: () => addWater(500), style: waterBtn }, "+ Fles 500"),
            React.createElement("button", { onClick: () => addWater(-250), style: { width: 42, background: c.bg, color: c.dim, border: `1px solid ${c.line}`, borderRadius: 10, padding: "10px 0", cursor: "pointer", fontSize: 15 } }, "\u2212")),
        React.createElement("div", { style: { color: c.faint, fontSize: 11, marginTop: 8 } },
            pct,
            "% van je doel \u00B7 ",
            glasses,
            " ",
            glasses === 1 ? "glas" : "glazen")));
}
const waterBtn = { flex: 1, background: c.bg, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, padding: 10, cursor: "pointer", fontWeight: 600, fontSize: 13 };
function Toggle({ on, onClick }) {
    return React.createElement("button", { onClick: onClick, style: { width: 46, height: 27, borderRadius: 999, border: "none", cursor: "pointer", background: on ? c.good : c.line, position: "relative", flexShrink: 0 } },
        React.createElement("span", { style: { position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left .15s" } }));
}
function WeekBadge({ count, vol }) {
    return React.createElement("div", { style: { textAlign: "right" } },
        React.createElement("div", { style: { fontFamily: fDisp, fontSize: 30, fontWeight: 700, lineHeight: 1, color: count >= 4 ? c.good : c.text } },
            count,
            React.createElement("span", { style: { color: c.faint, fontSize: 18 } }, "/4")),
        React.createElement("div", { style: { color: c.faint, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" } }, "deze week"),
        vol > 0 && React.createElement("div", { style: { color: c.dim, fontSize: 11, marginTop: 2 } },
            nl(vol),
            " kg volume"));
}
/* ================= TRAIN ================= */
function TrainTab({ day, days, pickDay, order, draft, updateSet, stepSet, addSet, removeSet, lastSessionTop, bestEver, customName, setCustomName, addCustom, saveWorkout }) {
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${days.length},1fr)`, gap: 7, marginBottom: 16 } }, days.map(d => {
            const on = day === d, opt = PROGRAM[d].optional;
            return (React.createElement("button", { key: d, onClick: () => pickDay(d), style: { background: on ? c.accent : c.surface, color: on ? "#1a1500" : opt ? c.faint : c.dim, border: `1px solid ${on ? c.accent : c.line}`, borderRadius: 12, padding: "9px 2px", cursor: "pointer", fontFamily: fDisp, fontWeight: 600, fontSize: 16 } },
                "D",
                d));
        })),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 2 } },
            React.createElement("div", { style: { fontFamily: fDisp, fontSize: 22, fontWeight: 600 } }, PROGRAM[day].name),
            PROGRAM[day].optional && React.createElement("span", { style: { background: c.surfaceHi, color: c.faint, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 7px", borderRadius: 999 } }, "optioneel")),
        React.createElement("div", { style: { color: c.faint, fontSize: 12, marginBottom: 16 } },
            order.length,
            " oefeningen \u00B7 tik +/- of typ je gewicht en reps"),
        order.map(ex => {
            const prog = PROGRAM[day].ex.find(e => e[0] === ex);
            const target = prog ? prog[2] : null;
            const prev = lastSessionTop(ex), best = bestEver(ex), cur = topSet(draft[ex]);
            let flag = null;
            if (cur && prev) {
                if (cur.w > prev.w || (cur.w === prev.w && cur.r > prev.r))
                    flag = "beat";
                else if (cur.w === prev.w && cur.r === prev.r)
                    flag = "match";
            }
            const isPR = cur && best && (cur.w > best.w || (cur.w === best.w && cur.r > best.r));
            return (React.createElement("div", { key: ex, style: { background: c.surface, border: `1px solid ${flag === "beat" || isPR ? c.good : c.line}`, borderRadius: 14, padding: 13, marginBottom: 11 } },
                React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 } },
                    React.createElement("div", { style: { flex: 1, paddingRight: 8 } },
                        React.createElement("div", { style: { fontWeight: 600, fontSize: 14.5, lineHeight: 1.25 } }, ex),
                        React.createElement("div", { style: { color: c.faint, fontSize: 11.5, marginTop: 2 } },
                            target ? `doel ${target} reps` : "extra oefening",
                            prev && React.createElement("span", null,
                                " \u00B7 vorige keer ",
                                React.createElement("span", { style: { color: c.dim } },
                                    prev.w,
                                    "kg \u00D7 ",
                                    prev.r)))),
                    isPR ? React.createElement("span", { style: { background: "rgba(245,185,59,.14)", color: c.accent, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999 } }, "\uD83C\uDFC6 PR")
                        : flag === "beat" ? React.createElement("span", { style: { background: "rgba(52,211,153,.14)", color: c.good, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999 } }, "\u25B2 beter")
                            : flag === "match" ? React.createElement("span", { style: { color: c.dim, fontSize: 10.5, fontWeight: 600 } }, "= vorige") : null),
                draft[ex].map((s, i) => React.createElement(SetRow, { key: i, n: i + 1, s: s, onW: v => updateSet(ex, i, "w", v), onR: v => updateSet(ex, i, "r", v), stepW: d => stepSet(ex, i, "w", d), stepR: d => stepSet(ex, i, "r", d) })),
                React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
                    React.createElement(MiniBtn, { onClick: () => addSet(ex) }, "+ set"),
                    draft[ex].length > 1 && React.createElement(MiniBtn, { onClick: () => removeSet(ex), dim: true }, "\u2212 set"))));
        }),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 4, marginBottom: 18 } },
            React.createElement("input", { value: customName, onChange: e => setCustomName(e.target.value), onKeyDown: e => e.key === "Enter" && addCustom(), placeholder: "+ eigen oefening", style: inputStyle(1) }),
            React.createElement("button", { onClick: addCustom, style: { background: c.surfaceHi, color: c.dim, border: `1px solid ${c.line}`, borderRadius: 10, padding: "0 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "Toevoegen")),
        React.createElement("button", { onClick: saveWorkout, style: { width: "100%", background: c.accent, color: "#1a1500", border: "none", borderRadius: 14, padding: 15, cursor: "pointer", fontFamily: fDisp, fontWeight: 700, fontSize: 19, letterSpacing: 0.5 } }, "TRAINING OPSLAAN")));
}
function SetRow({ n, s, onW, onR, stepW, stepR }) {
    const done = s.w !== "" && s.r !== "";
    return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 7 } },
        React.createElement("div", { style: { width: 18, color: done ? c.good : c.faint, fontSize: 12, fontWeight: 600, textAlign: "center" } }, done ? "✓" : n),
        React.createElement(Stepper, { value: s.w, unit: "kg", onChange: onW, onStep: stepW, step: 2.5 }),
        React.createElement(Stepper, { value: s.r, unit: "rep", onChange: onR, onStep: stepR, step: 1 }));
}
function Stepper({ value, unit, onChange, onStep, step }) {
    return React.createElement("div", { style: { display: "flex", alignItems: "center", flex: 1, background: c.bg, border: `1px solid ${c.line}`, borderRadius: 10, overflow: "hidden" } },
        React.createElement("button", { onClick: () => onStep(-step), style: stepBtn }, "\u2212"),
        React.createElement("div", { style: { flex: 1, position: "relative" } },
            React.createElement("input", { value: value, onChange: e => onChange(e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")), inputMode: "decimal", placeholder: "0", style: { width: "100%", background: "none", border: "none", outline: "none", color: c.text, textAlign: "center", fontFamily: fDisp, fontSize: 19, fontWeight: 600, padding: "7px 0 7px 8px" } }),
            React.createElement("span", { style: { position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: c.faint, fontSize: 9.5, textTransform: "uppercase" } }, unit)),
        React.createElement("button", { onClick: () => onStep(step), style: stepBtn }, "+"));
}
const stepBtn = { background: c.surfaceHi, color: c.dim, border: "none", cursor: "pointer", width: 32, height: 34, fontSize: 16 };
function MiniBtn({ children, onClick, dim }) {
    return React.createElement("button", { onClick: onClick, style: { background: "none", color: dim ? c.faint : c.dim, border: `1px solid ${c.line}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 } }, children);
}
/* ================= PROGRESS ================= */
function ProgressTab({ workouts, bw, bwInput, setBwInput, addBw }) {
    const exList = useMemo(() => { const set = new Set(); workouts.forEach(w => w.exercises.forEach(e => set.add(e.name))); return [...set]; }, [workouts]);
    const [sel, setSel] = useState("");
    useEffect(() => { if (!sel && exList.length)
        setSel(exList[0]); }, [exList, sel]);
    const data = useMemo(() => { if (!sel)
        return []; return workouts.filter(w => w.exercises.some(e => e.name === sel)).map(w => { const ex = w.exercises.find(e => e.name === sel); const t = topSet(ex.sets); return { date: w.date, kg: t ? t.w : 0, reps: t ? t.r : 0 }; }); }, [sel, workouts]);
    const best = data.reduce((m, d) => Math.max(m, d.kg), 0);
    const latest = data.length ? data[data.length - 1] : null;
    return (React.createElement("div", null,
        React.createElement(SectionTitle, null, "Voortgang per oefening"),
        !exList.length ? React.createElement(Empty, null,
            "Nog geen data. Log je eerste training op ",
            React.createElement("b", null, "Vandaag"),
            " en je progressie verschijnt hier.") : React.createElement(React.Fragment, null,
            React.createElement("select", { value: sel, onChange: e => setSel(e.target.value), style: { width: "100%", background: c.surface, color: c.text, border: `1px solid ${c.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 600, marginBottom: 14 } }, exList.map(e => React.createElement("option", { key: e, value: e }, e))),
            React.createElement("div", { style: { display: "flex", gap: 9, marginBottom: 14 } },
                React.createElement(Stat, { label: "Beste set", value: `${best} kg`, accent: true }),
                React.createElement(Stat, { label: "Laatste", value: latest ? `${latest.kg} kg × ${latest.reps}` : "–" }),
                React.createElement(Stat, { label: "Sessies", value: data.length })),
            React.createElement("div", { style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, padding: 12 } },
                React.createElement(LineChart, { values: data.map(d => d.kg), color: c.accent }),
                data.length >= 2 && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", color: c.faint, fontSize: 10, marginTop: 4 } },
                    React.createElement("span", null, shortDay(data[0].date)),
                    React.createElement("span", null, shortDay(data[data.length - 1].date)))),
            React.createElement("div", { style: { color: c.faint, fontSize: 11, textAlign: "center", marginTop: 8 } }, "Lijn = zwaarste set per training. Elke sessie proberen te stijgen = groei.")),
        React.createElement(SectionTitle, { style: { marginTop: 26 } }, "Lichaamsgewicht"),
        React.createElement("div", { style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, padding: 14 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
                React.createElement("span", { style: { fontSize: 17 } }, "\u2696\uFE0F"),
                React.createElement("input", { value: bwInput, onChange: e => setBwInput(e.target.value), onKeyDown: e => e.key === "Enter" && addBw(), inputMode: "decimal", placeholder: "Gewicht in kg", style: inputStyle(1) }),
                React.createElement("button", { onClick: addBw, style: { background: c.surfaceHi, color: c.dim, border: `1px solid ${c.line}`, borderRadius: 10, padding: "0 14px", height: 40, cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "Log")),
            bw.length >= 2 && React.createElement("div", { style: { marginTop: 12 } },
                React.createElement(LineChart, { values: bw.map(e => e.kg), color: c.good, height: 110 })),
            bw.length === 1 && React.createElement("div", { style: { color: c.faint, fontSize: 12, marginTop: 10 } },
                "Laatste: ",
                bw[0].kg,
                " kg \u2014 log nog een keer voor een grafiek."))));
}
/* ================= CALENDAR ================= */
function CalendarTab({ workouts, water, reminders, habits, waterGoal }) {
    const now = new Date();
    const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
    const [sel, setSel] = useState(today());
    const cells = useMemo(() => { const first = new Date(ym.y, ym.m, 1); const offset = (first.getDay() + 6) % 7; const dim = new Date(ym.y, ym.m + 1, 0).getDate(); const arr = []; for (let i = 0; i < offset; i++)
        arr.push(null); for (let d = 1; d <= dim; d++)
        arr.push(iso(new Date(ym.y, ym.m, d))); return arr; }, [ym]);
    const dataFor = useCallback((date) => { const wos = workouts.filter(w => w.date === date); const ml = water[date] || 0; const created = reminders.filter(r => r.created === date); const done = reminders.filter(r => r.completed === date); const due = reminders.filter(r => r.due === date); const habitsDone = Object.values(habits.log[date] || {}).filter(Boolean).length; return { wos, ml, created, done, due, habitsDone }; }, [workouts, water, reminders, habits]);
    const shiftMonth = (d) => setYm(p => { const m = p.m + d; return { y: p.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
    const monthLabel = new Date(ym.y, ym.m, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
    const detail = dataFor(sel);
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } },
            React.createElement("button", { onClick: () => shiftMonth(-1), style: navBtn }, "\u2039"),
            React.createElement("div", { style: { fontFamily: fDisp, fontSize: 20, fontWeight: 600, textTransform: "capitalize" } }, monthLabel),
            React.createElement("button", { onClick: () => shiftMonth(1), style: navBtn }, "\u203A")),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 } }, ["ma", "di", "wo", "do", "vr", "za", "zo"].map(d => React.createElement("div", { key: d, style: { textAlign: "center", color: c.faint, fontSize: 10, textTransform: "uppercase" } }, d))),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 } }, cells.map((date, i) => {
            if (!date)
                return React.createElement("div", { key: i });
            const d = dataFor(date);
            const isToday = date === today(), isSel = date === sel;
            const hasRem = d.created.length || d.done.length || d.due.length;
            return React.createElement("button", { key: date, onClick: () => setSel(date), style: { aspectRatio: "1", background: isSel ? c.surfaceHi : c.surface, border: `1px solid ${isSel ? c.accent : isToday ? c.dim : c.line}`, borderRadius: 10, cursor: "pointer", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 } },
                React.createElement("span", { style: { fontFamily: fDisp, fontSize: 15, fontWeight: 600, color: isToday ? c.accent : c.text, lineHeight: 1 } }, parseInt(date.slice(-2))),
                React.createElement("span", { style: { display: "flex", gap: 2, height: 5 } },
                    d.wos.length > 0 && React.createElement(Dot, { color: c.accent }),
                    d.ml > 0 && React.createElement(Dot, { color: c.water }),
                    hasRem > 0 && React.createElement(Dot, { color: c.remind })));
        })),
        React.createElement("div", { style: { display: "flex", gap: 12, margin: "12px 2px 16px", flexWrap: "wrap" } },
            React.createElement(Legend, { color: c.accent, label: "training" }),
            React.createElement(Legend, { color: c.water, label: "water" }),
            React.createElement(Legend, { color: c.remind, label: "herinnering" })),
        React.createElement("div", { style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, padding: 15 } },
            React.createElement("div", { style: { fontFamily: fDisp, fontSize: 19, fontWeight: 600, textTransform: "capitalize", marginBottom: 12 } }, longDay(sel)),
            React.createElement(DetailRow, { emo: "\uD83C\uDFCB\uFE0F", label: "Training" }, detail.wos.length ? detail.wos.map(w => React.createElement("div", { key: w.id, style: { color: c.text, fontSize: 13 } },
                w.dayName,
                " \u00B7 ",
                w.exercises.length,
                " oef. \u00B7 ",
                nl(Math.round(sessionVolume(w))),
                " kg volume")) : React.createElement("span", { style: { color: c.faint, fontSize: 13 } }, "Geen training")),
            React.createElement(DetailRow, { emo: "\uD83D\uDCA7", label: "Water" },
                React.createElement("div", { style: { color: c.text, fontSize: 13, marginBottom: 6 } },
                    nl(detail.ml),
                    " / ",
                    nl(waterGoal),
                    " ml"),
                React.createElement("div", { style: { height: 7, background: c.bg, borderRadius: 999, overflow: "hidden" } },
                    React.createElement("div", { style: { width: `${Math.min(100, Math.round(detail.ml / waterGoal * 100))}%`, height: "100%", background: c.water } }))),
            React.createElement(DetailRow, { emo: "\uD83D\uDD14", label: "Herinneringen" },
                React.createElement("div", { style: { fontSize: 13 } },
                    React.createElement("div", { style: { color: c.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 } }, "Toegevoegd"),
                    detail.created.length ? detail.created.map(r => React.createElement("div", { key: r.id, style: { color: c.text } },
                        "+ ",
                        r.text)) : React.createElement("div", { style: { color: c.faint } }, "\u2014"),
                    React.createElement("div", { style: { color: c.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: "8px 0 3px" } }, "Afgevinkt"),
                    detail.done.length ? detail.done.map(r => React.createElement("div", { key: r.id, style: { color: c.good } },
                        "\u2713 ",
                        r.text)) : React.createElement("div", { style: { color: c.faint } }, "\u2014"))),
            React.createElement(DetailRow, { emo: "\u2705", label: "Gewoontes", last: true },
                React.createElement("span", { style: { color: detail.habitsDone ? c.text : c.faint, fontSize: 13 } },
                    detail.habitsDone,
                    " van ",
                    habits.list.length,
                    " afgevinkt")))));
}
const navBtn = { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10, width: 38, height: 38, color: c.dim, cursor: "pointer", fontSize: 20, lineHeight: 1 };
function Dot({ color }) { return React.createElement("span", { style: { width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" } }); }
function Legend({ color, label }) { return React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 5 } },
    React.createElement(Dot, { color: color }),
    React.createElement("span", { style: { color: c.faint, fontSize: 11 } }, label)); }
function DetailRow({ emo, label, children, last }) {
    return React.createElement("div", { style: { display: "flex", gap: 11, paddingBottom: last ? 0 : 13, marginBottom: last ? 0 : 13, borderBottom: last ? "none" : `1px solid ${c.line}` } },
        React.createElement("div", { style: { width: 20, flexShrink: 0, fontSize: 15 } }, emo),
        React.createElement("div", { style: { flex: 1 } },
            React.createElement("div", { style: { color: c.dim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 } }, label),
            children));
}
/* ================= LISTS ================= */
function ListsTab(props) {
    const [seg, setSeg] = useState("shopping");
    const segs = [["shopping", "Boodschappen", "🛒"], ["reminders", "Herinneringen", "🔔"], ["notes", "Notities", "📝"]];
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: 4, marginBottom: 16 } }, segs.map(([id, label, emo]) => { const on = seg === id; return React.createElement("button", { key: id, onClick: () => setSeg(id), style: { background: on ? c.accent : "transparent", color: on ? "#1a1500" : c.dim, border: "none", borderRadius: 9, padding: "9px 2px", cursor: "pointer", fontWeight: 600, fontSize: 12 } },
            emo,
            " ",
            label); })),
        seg === "shopping" && React.createElement(ShoppingTab, { ...props }),
        seg === "reminders" && React.createElement(RemindersTab, { ...props }),
        seg === "notes" && React.createElement(NotesTab, { notes: props.notes, addNote: props.addNote, updateNote: props.updateNote, deleteNote: props.deleteNote })));
}
function ShoppingTab({ shopping, addShop, toggleShop, deleteShop, clearChecked }) {
    const [txt, setTxt] = useState("");
    const open = shopping.filter(x => !x.done), done = shopping.filter(x => x.done);
    const submit = () => { addShop(txt); setTxt(""); };
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16 } },
            React.createElement("input", { value: txt, onChange: e => setTxt(e.target.value), onKeyDown: e => e.key === "Enter" && submit(), placeholder: "Voeg product toe\u2026", style: inputStyle(1) }),
            React.createElement("button", { onClick: submit, style: { background: c.accent, color: "#1a1500", border: "none", borderRadius: 10, width: 44, cursor: "pointer", fontSize: 20 } }, "+")),
        !shopping.length ? React.createElement(Empty, null, "Je boodschappenlijst is leeg. Typ hierboven een product en druk op enter.") : React.createElement(React.Fragment, null,
            open.map(it => React.createElement(ListItem, { key: it.id, text: it.text, done: false, onToggle: () => toggleShop(it.id), onDelete: () => deleteShop(it.id) })),
            done.length > 0 && React.createElement(React.Fragment, null,
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 2px 8px" } },
                    React.createElement("span", { style: { color: c.faint, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 } },
                        "In mandje (",
                        done.length,
                        ")"),
                    React.createElement("button", { onClick: clearChecked, style: { background: "none", border: "none", color: c.faint, fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Wis afgevinkte")),
                done.map(it => React.createElement(ListItem, { key: it.id, text: it.text, done: true, onToggle: () => toggleShop(it.id), onDelete: () => deleteShop(it.id) }))))));
}
function RemindersTab({ reminders, addReminder, toggleReminder, deleteReminder }) {
    const [txt, setTxt] = useState("");
    const [due, setDue] = useState("");
    const submit = () => { addReminder(txt, due || null); setTxt(""); setDue(""); };
    const sorted = [...reminders].sort((a, b) => { if (a.done !== b.done)
        return a.done ? 1 : -1; return (a.due || "9999").localeCompare(b.due || "9999"); });
    return (React.createElement("div", null,
        React.createElement("div", { style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: 12, marginBottom: 16 } },
            React.createElement("input", { value: txt, onChange: e => setTxt(e.target.value), onKeyDown: e => e.key === "Enter" && submit(), placeholder: "Waaraan wil je herinnerd worden?", style: { ...inputStyle(1), width: "100%", marginBottom: 9 } }),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("input", { type: "date", value: due, onChange: e => setDue(e.target.value), style: { flex: 1, background: c.bg, color: due ? c.text : c.faint, border: `1px solid ${c.line}`, borderRadius: 10, height: 40, padding: "0 12px", fontSize: 13, outline: "none" } }),
                React.createElement("button", { onClick: submit, style: { background: c.accent, color: "#1a1500", border: "none", borderRadius: 10, padding: "0 18px", height: 40, cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "+ Zet erbij"))),
        !reminders.length ? React.createElement(Empty, null, "Nog geen herinneringen. Voeg er een toe met eventueel een datum \u2014 je ziet ze terug in de kalender op de dag dat je ze toevoegt en afvinkt.") :
            sorted.map(r => {
                const overdue = r.due && !r.done && r.due < today();
                return (React.createElement("div", { key: r.id, style: { display: "flex", alignItems: "center", gap: 11, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 } },
                    React.createElement("button", { onClick: () => toggleReminder(r.id), style: checkBox(r.done) }, r.done && React.createElement("span", { style: { color: "#0F1218", fontSize: 13, fontWeight: 700 } }, "\u2713")),
                    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        React.createElement("div", { style: { fontSize: 13.5, color: r.done ? c.faint : c.text, textDecoration: r.done ? "line-through" : "none" } }, r.text),
                        r.due && React.createElement("div", { style: { fontSize: 11, color: overdue ? c.bad : c.faint, marginTop: 2 } },
                            overdue ? "Te laat · " : "Voor ",
                            shortDay(r.due))),
                    React.createElement("button", { onClick: () => deleteReminder(r.id), style: { background: "none", border: "none", color: c.faint, cursor: "pointer", fontSize: 15 } }, "\uD83D\uDDD1")));
            })));
}
function ListItem({ text, done, onToggle, onDelete }) {
    return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 11, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 } },
        React.createElement("button", { onClick: onToggle, style: checkBox(done) }, done && React.createElement("span", { style: { color: "#0F1218", fontSize: 13, fontWeight: 700 } }, "\u2713")),
        React.createElement("span", { style: { flex: 1, fontSize: 13.5, color: done ? c.faint : c.text, textDecoration: done ? "line-through" : "none" } }, text),
        React.createElement("button", { onClick: onDelete, style: { background: "none", border: "none", color: c.faint, cursor: "pointer", fontSize: 15 } }, "\uD83D\uDDD1"));
}
const checkBox = (on) => ({ width: 22, height: 22, borderRadius: 7, flexShrink: 0, cursor: "pointer", background: on ? c.good : "transparent", border: `1.5px solid ${on ? c.good : c.faint}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 });
/* ================= NOTES ================= */
function NotesTab({ notes, addNote, updateNote, deleteNote }) {
    return (React.createElement("div", null,
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } },
            React.createElement("span", { style: { color: c.faint, fontSize: 12 } },
                notes.length,
                " ",
                notes.length === 1 ? "notitie" : "notities"),
            React.createElement("button", { onClick: addNote, style: { background: c.accent, color: "#1a1500", border: "none", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontFamily: fDisp, fontWeight: 700, fontSize: 15 } }, "+ NIEUW")),
        !notes.length ? React.createElement(Empty, null,
            "Nog geen notities. Tik op ",
            React.createElement("b", null, "Nieuw"),
            " voor je eerste \u2014 bijvoorbeeld metingen, doelen of blessure-aandachtspunten.") :
            notes.map(n => (React.createElement("div", { key: n.id, style: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, marginBottom: 11 } },
                React.createElement(AutoTextarea, { value: n.text, onChange: t => updateNote(n.id, t), placeholder: "Schrijf hier\u2026" }),
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, borderTop: `1px solid ${c.line}`, paddingTop: 9 } },
                    React.createElement("span", { style: { color: c.faint, fontSize: 11 } }, n.text.trim() ? fmtUpdated(n.updated) : "Leeg"),
                    React.createElement("button", { onClick: () => deleteNote(n.id), style: { background: "none", border: "none", color: c.faint, cursor: "pointer", fontSize: 12, fontWeight: 600 } }, "\uD83D\uDDD1 Verwijderen")))))));
}
function AutoTextarea({ value, onChange, placeholder }) {
    const ref = useRef(null);
    const resize = () => { const el = ref.current; if (el) {
        el.style.height = "auto";
        el.style.height = Math.max(72, el.scrollHeight) + "px";
    } };
    useEffect(() => { resize(); }, [value]);
    return React.createElement("textarea", { ref: ref, value: value, onChange: e => onChange(e.target.value), onInput: resize, placeholder: placeholder, style: { width: "100%", background: "none", border: "none", outline: "none", color: c.text, fontFamily: fBody, fontSize: 14, lineHeight: 1.55, resize: "none", padding: 0, minHeight: 72 } });
}
/* ================= HABITS ================= */
function HabitsTab({ habits, last7, toggleHabit, addHabit, removeHabit, streakOf }) {
    const [newH, setNewH] = useState("");
    return (React.createElement("div", null,
        React.createElement(SectionTitle, null, "Gewoontes \u00B7 laatste 7 dagen"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr repeat(7,30px)", gap: 4, alignItems: "end", marginBottom: 8, paddingLeft: 2 } },
            React.createElement("div", null),
            last7.map(d => { const t = d === today(); return React.createElement("div", { key: d, style: { textAlign: "center", color: t ? c.accent : c.faint, fontSize: 9.5, fontWeight: t ? 700 : 500, textTransform: "uppercase" } }, dow(d).slice(0, 2)); })),
        habits.list.map(h => {
            const streak = streakOf(h.id);
            return (React.createElement("div", { key: h.id, style: { display: "grid", gridTemplateColumns: "1fr repeat(7,30px)", gap: 4, alignItems: "center", marginBottom: 7 } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 } },
                    React.createElement("button", { onClick: () => removeHabit(h.id), style: { background: "none", border: "none", color: c.faint, cursor: "pointer", padding: 0, fontSize: 13, flexShrink: 0 } }, "\u2715"),
                    React.createElement("span", { style: { fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, h.name),
                    streak > 1 && React.createElement("span", { style: { color: c.accent, fontSize: 11, fontWeight: 700, flexShrink: 0 } },
                        "\uD83D\uDD25",
                        streak)),
                last7.map(d => {
                    var _a;
                    const on = !!((_a = habits.log[d]) === null || _a === void 0 ? void 0 : _a[h.id]);
                    const t = d === today();
                    return (React.createElement("button", { key: d, onClick: () => toggleHabit(h.id, d), style: { height: 30, borderRadius: 8, cursor: "pointer", background: on ? c.good : c.surface, border: `1px solid ${on ? c.good : t ? c.dim : c.line}`, color: "#0F1218", fontSize: 14, fontWeight: 700, padding: 0 } }, on ? "✓" : ""));
                })));
        }),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 14 } },
            React.createElement("input", { value: newH, onChange: e => setNewH(e.target.value), onKeyDown: e => { if (e.key === "Enter") {
                    addHabit(newH);
                    setNewH("");
                } }, placeholder: "+ nieuwe gewoonte", style: inputStyle(1) }),
            React.createElement("button", { onClick: () => { addHabit(newH); setNewH(""); }, style: { background: c.surfaceHi, color: c.dim, border: `1px solid ${c.line}`, borderRadius: 10, padding: "0 14px", height: 40, cursor: "pointer", fontWeight: 600, fontSize: 13 } }, "Toevoegen")),
        React.createElement("div", { style: { color: c.faint, fontSize: 11, marginTop: 12, lineHeight: 1.5 } }, "Tik een vakje om af te vinken \u2014 ook voor eerdere dagen. \uD83D\uDD25 toont je streak. Eiwit rond 1,6\u20132 g per kg lichaamsgewicht is het belangrijkste voor spiergroei.")));
}
/* ================= small ui ================= */
function SectionTitle({ children, style }) { return React.createElement("div", { style: { fontFamily: fDisp, fontSize: 18, fontWeight: 600, marginBottom: 12, letterSpacing: 0.3, ...style } }, children); }
function Stat({ label, value, accent }) { return React.createElement("div", { style: { flex: 1, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: "11px 10px" } },
    React.createElement("div", { style: { fontFamily: fDisp, fontSize: 20, fontWeight: 700, color: accent ? c.accent : c.text, lineHeight: 1 } }, value),
    React.createElement("div", { style: { color: c.faint, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 } }, label)); }
function Empty({ children }) { return React.createElement("div", { style: { background: c.surface, border: `1px dashed ${c.line}`, borderRadius: 14, padding: "26px 18px", color: c.dim, fontSize: 13.5, textAlign: "center", lineHeight: 1.5 } }, children); }
const inputStyle = (flex) => ({ flex, minWidth: 0, background: c.bg, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10, padding: "0 12px", height: 40, fontSize: 13.5, fontFamily: fBody, outline: "none" });
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));
