import React, { useState, useEffect, useMemo } from 'react';
import { 
    signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, onAuthStateChanged 
} from "firebase/auth";
import { 
    collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, limit, where, 
    updateDoc, increment, addDoc, deleteDoc, serverTimestamp, getDocs 
} from "firebase/firestore";
import { 
    Search, Ticket, PlusCircle, User, Trash2, Building2, CheckCircle2, 
    Clock, Loader2, AlertTriangle, XCircle, Ban, ShieldCheck, 
    X, Repeat, LogOut, MapPin, History, Settings, Bell, Star, MessageSquare, ArrowLeft, 
    Image as ImageIcon, Info, DownloadCloud, Heart, Copy, Hash, QrCode, Camera, Award, Upload, PenSquare, Calendar, Megaphone, CreditCard, Database, LogIn, Mail, CalendarDays, Eye, Phone, Save, PartyPopper
} from 'lucide-react';

import { auth, db, APP_ID } from './firebase';

const generateShortId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// --- KOMPONENTY POMOCNICZE ---

const TicketTimer = ({ ticket, userName, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(600); 
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!ticket.activatedAt) return;
        if (ticket.status === 'expired') { setIsExpired(true); return; }
        
        const calculateTime = () => {
            const now = new Date().getTime();
            let start;
            if (ticket.activatedAt.toMillis) start = ticket.activatedAt.toMillis();
            else if (ticket.activatedAt.seconds) start = ticket.activatedAt.seconds * 1000;
            else start = new Date(ticket.activatedAt).getTime();
            
            const diff = Math.floor((now - start) / 1000);
            const remaining = 600 - diff; 
            
            if (remaining <= 0) { 
                setTimeLeft(0); 
                setIsExpired(true); 
                if (onExpire && ticket.status !== 'expired') onExpire(); 
            } else { 
                setTimeLeft(remaining); 
            }
        };
        
        calculateTime(); 
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [ticket]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60) < 10 ? '0' : ''}${s % 60}`;

    // 1. ZMIANA: Obsługa wykorzystanego biletu
    if (ticket.hasEntered) {
        return (
            <div className="bg-green-900/20 border-2 border-green-500 p-6 rounded-xl text-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <PartyPopper className="w-12 h-12 mx-auto mb-2 text-green-400 animate-bounce"/>
                <div className="text-xl font-black uppercase tracking-widest text-white mb-1">Wykorzystano</div>
                <div className="text-sm text-green-400 font-bold">Miłej zabawy!</div>
            </div>
        );
    }

    if (isExpired) return <div className="bg-slate-950 text-red-500 p-6 rounded-xl text-center border-2 border-red-900/50"><Ban className="w-12 h-12 mx-auto mb-2" /><div className="text-xl font-black uppercase tracking-widest">Bilet Wygasł</div></div>;
    
    return <div className="relative overflow-hidden rounded-xl bg-slate-950 border-2 border-green-500 p-4 text-center shadow-[0_0_30px_rgba(34,197,94,0.3)]"><div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(34,197,94,0.5)_50%,transparent_75%)] bg-[length:20px_20px] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div><div className="relative z-10"><div className="text-xs text-green-400 font-bold uppercase tracking-widest mb-1 animate-pulse">Pokaż Ochronie</div><div className="text-5xl font-mono font-black text-white tracking-tighter tabular-nums mb-2">{formatTime(timeLeft)}</div><div className="flex justify-center gap-2"><div className="bg-slate-900/80 border border-slate-700 rounded px-2 py-1 inline-block text-center min-w-[80px]"><div className="text-[10px] text-slate-400 uppercase">Gość</div><div className="text-sm font-bold text-white truncate max-w-[120px]">{userName || 'Klubowicz'}</div></div><div className="bg-slate-900/80 border border-slate-700 rounded px-2 py-1 inline-block text-center min-w-[80px]"><div className="text-[10px] text-slate-400 uppercase">Kod</div><div className="text-sm font-mono font-bold text-purple-400">{ticket.shortId || '---'}</div></div></div></div></div>;
};

const NotificationsModal = ({ notifications, onClose, onMarkRead }) => (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end animate-in slide-in-from-right duration-300"><div className="w-full max-w-xs bg-slate-900 h-full border-l border-slate-800 flex flex-col"><div className="p-4 border-b border-slate-800 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><Bell className="w-5 h-5 text-purple-500"/> Powiadomienia</h3><button onClick={onClose}><X className="w-6 h-6 text-slate-500"/></button></div><div className="flex-1 overflow-y-auto p-4 space-y-3">{notifications.length === 0 && <div className="text-slate-500 text-center text-sm mt-10">Brak nowych powiadomień.</div>}{notifications.map(n => (<div key={n.id} className={`p-3 rounded-xl border ${n.read ? 'bg-slate-950/50 border-slate-800 opacity-60' : 'bg-slate-800 border-purple-500/30'}`}><div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-white">{n.clubName || 'System'}</span></div><p className="text-sm text-slate-300">{n.message}</p>{!n.read && <button onClick={() => onMarkRead(n.id)} className="text-[10px] text-purple-400 mt-2 font-bold hover:underline">Oznacz jako przeczytane</button>}</div>))}</div></div></div>);
const InfoModal = ({ title, content, onClose }) => (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in zoom-in duration-200"><div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative"><button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button><h3 className="text-xl font-bold text-white mb-4">{title}</h3><div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">{content}</div></div></div>);
const ReviewModal = ({ ticket, onClose, onSubmit }) => { const [rating, setRating] = useState(0); const [hover, setHover] = useState(0); const handleSubmit = (e) => { e.preventDefault(); onSubmit(ticket, rating, new FormData(e.target).get('comment')); }; return (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in duration-200"><div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl"><div className="text-center mb-6"><h3 className="text-xl font-bold text-white mb-1">Jak było?</h3></div><form onSubmit={handleSubmit} className="space-y-6"><div className="flex justify-center gap-2">{[1,2,3,4,5].map(s=>(<button key={s} type="button" onClick={()=>setRating(s)} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(rating)}><Star className={`w-8 h-8 ${s<=(hover||rating)?'text-yellow-400 fill-yellow-400':'text-slate-600'}`}/></button>))}</div><textarea name="comment" placeholder="Komentarz..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white"/><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold">Pomiń</button><button type="submit" disabled={!rating} className="flex-1 bg-purple-600 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold">Wyślij</button></div></form></div></div>); };

const GatekeeperView = ({ eventId, eventTitle, onClose, appId }) => {
    const [attendees, setAttendees] = useState([]);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ total: 0, entered: 0 });
    const [scanning, setScanning] = useState(false);
    useEffect(() => {
        const ref = collection(db, 'artifacts', appId, 'public', 'data', `events/${eventId}/attendees`);
        const q = query(ref, orderBy('fullName'));
        const unsub = onSnapshot(q, (snap) => { const list = snap.docs.map(d => ({ id: d.id, ...d.data() })); setAttendees(list); setStats({ total: list.length, entered: list.filter(p => p.hasEntered).length }); });
        return () => unsub();
    }, [eventId, appId]);

    // FIX: Aktualizacja biletu użytkownika po wejściu
    const handleCheckIn = async (pid, status, uid) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `events/${eventId}/attendees`, pid), { hasEntered: !status, enteredAt: !status ? serverTimestamp() : null });
        
        if (uid) {
             try {
                const ticketsRef = collection(db, 'artifacts', appId, 'users', uid, 'tickets');
                const q = query(ticketsRef, where("eventId", "==", eventId));
                const snapshot = await getDocs(q);
                snapshot.forEach(async (doc) => {
                    await updateDoc(doc.ref, { hasEntered: !status });
                });
                if(!status) {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'main'), { points: increment(10) });
                }
            } catch(e) { console.log("Błąd aktualizacji biletu", e); }
        }
    };

    const handleScan = () => { setScanning(true); setTimeout(() => { if (attendees.length > 0) { const random = attendees[Math.floor(Math.random() * attendees.length)]; setSearch(random.shortId || random.fullName); } setScanning(false); }, 2000); };
    const filtered = attendees.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()) || (p.shortId && p.shortId.includes(search.toUpperCase())));
    return (<div className="fixed inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-300"><div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-10"><div><div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1"><ShieldCheck className="w-4 h-4"/> Bramka</div><h3 className="text-lg font-black text-white leading-none">{eventTitle}</h3></div><button onClick={onClose}><LogOut className="w-5 h-5 text-slate-400" /></button></div><div className="grid grid-cols-2 gap-px bg-slate-800 border-b border-slate-800"><div className="bg-slate-900 p-3 text-center"><div className="text-xs text-slate-500 uppercase font-bold">Lista</div><div className="text-xl font-black text-white">{stats.total}</div></div><div className="bg-slate-900 p-3 text-center"><div className="text-xs text-slate-500 uppercase font-bold">Weszło</div><div className="text-xl font-black text-green-400">{stats.entered}</div></div></div><div className="p-4 bg-slate-950 border-b border-slate-800 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nazwisko lub KOD..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-white focus:border-purple-500 focus:outline-none font-bold uppercase"/></div><button onClick={handleScan} className="bg-purple-600 text-white px-4 rounded-xl hover:bg-purple-500 flex items-center justify-center"><QrCode className="w-6 h-6"/></button></div>{scanning && (<div className="absolute inset-0 bg-black z-20 flex flex-col items-center justify-center"><div className="w-64 h-64 border-2 border-purple-500 rounded-3xl relative flex items-center justify-center overflow-hidden"><div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent animate-pulse"></div><Camera className="w-12 h-12 text-purple-500 opacity-50"/><div className="absolute top-0 left-0 w-full h-1 bg-purple-500 animate-[scan_1.5s_infinite]"></div></div><p className="text-white mt-4 font-bold animate-pulse">Skanowanie biletu...</p><button onClick={() => setScanning(false)} className="mt-8 text-slate-500 text-sm">Anuluj</button><style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }`}</style></div>)}<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950">{filtered.map(p => (<div key={p.id} className={`border rounded-xl p-4 flex justify-between items-center ${p.hasEntered ? 'bg-green-900/10 border-green-500/30' : 'bg-slate-900 border-slate-800'}`}><div><div className="font-bold text-white text-lg">{p.fullName}</div><div className="flex gap-3 text-xs text-slate-500 mt-1"><span className="flex items-center gap-1"><Hash className="w-3 h-3"/> {p.shortId || '---'}</span><span>{p.phone}</span></div></div><button onClick={() => handleCheckIn(p.id, p.hasEntered, p.userId)} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${p.hasEntered ? 'bg-green-500 text-black' : 'bg-slate-800 text-slate-300 border border-slate-600'}`}>{p.hasEntered ? "Wszedł" : "Wpuść"}</button></div>))}</div></div>);
};

const LoginModal = ({ onClose, onLogin }) => {
    const [type, setType] = useState('user'); 
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await onLogin(email, password, isRegister, type);
            onClose();
        } catch (err) {
            setError("Błąd logowania/rejestracji. Sprawdź dane.");
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in zoom-in duration-200">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-800 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X/></button>
                
                <div className="flex gap-4 mb-6 border-b border-slate-800 pb-2">
                    <button onClick={() => setType('user')} className={`flex-1 pb-2 text-sm font-bold ${type==='user' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}>Dla Klubowicza</button>
                    <button onClick={() => setType('club')} className={`flex-1 pb-2 text-sm font-bold ${type==='club' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500'}`}>Dla Klubu</button>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">{isRegister ? 'Załóż konto' : 'Zaloguj się'}</h2>
                <p className="text-slate-400 text-sm mb-6">{type === 'user' ? 'Zbieraj bilety i obserwuj kluby.' : 'Zarządzaj swoim klubem.'}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500"/>
                        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 text-white"/>
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-500"/>
                        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Hasło" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 text-white"/>
                    </div>
                    {error && <div className="text-red-500 text-xs">{error}</div>}
                    <button disabled={loading} className={`w-full py-3 rounded-xl font-bold text-white ${type==='user' ? 'bg-purple-600' : 'bg-pink-600'}`}>
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : (isRegister ? 'Zarejestruj się' : 'Zaloguj się')}
                    </button>
                </form>
                <div className="mt-4 text-center text-xs text-slate-500">
                    {isRegister ? 'Masz już konto? ' : 'Nie masz konta? '}
                    <button onClick={() => setIsRegister(!isRegister)} className="text-white underline font-bold">
                        {isRegister ? 'Zaloguj się' : 'Zarejestruj się'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- GŁÓWNY KOMPONENT ---

export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('browse'); 
    const [showLoginModal, setShowLoginModal] = useState(false);
    
    const [events, setEvents] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState('all');
    const [showNotifications, setShowNotifications] = useState(false);
    const [viewedClub, setViewedClub] = useState(null);
    const [reviewTicket, setReviewTicket] = useState(null);
    const [infoModal, setInfoModal] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [followedClubs, setFollowedClubs] = useState([]);
    const [showDataForm, setShowDataForm] = useState(false);
    const [pendingEvent, setPendingEvent] = useState(null);
    const [activationState, setActivationState] = useState({});
    const [addEventForm, setAddEventForm] = useState({ title: '', date: '', freeUntil: '', description: '', ticketLimit: '100', imageUrl: '', regulations: '', fbLink: '', isRecurring: false, notify: true, is18Plus: false });
    const [editingEventId, setEditingEventId] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [clubProfile, setClubProfile] = useState(null);
    const [loadingClub, setLoadingClub] = useState(false);
    const [gatekeeperEvent, setGatekeeperEvent] = useState(null);
    const [managerReviews, setManagerReviews] = useState([]);
    const [managerFollowersCount, setManagerFollowersCount] = useState(0);
    const [managerTab, setManagerTab] = useState('events');
    const [userRole, setUserRole] = useState('guest');
    const [allClubs, setAllClubs] = useState([]);
    const [isPublishing, setIsPublishing] = useState(false);
    
    const [clubLogo, setClubLogo] = useState(null);
    const [clubBanner, setClubBanner] = useState(null);
    
    const [adminSelectedClub, setAdminSelectedClub] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const profileRef = doc(db, 'artifacts', APP_ID, 'users', currentUser.uid, 'profile', 'main');
                const profileDoc = await getDoc(profileRef);
                if (profileDoc.exists()) {
                    const data = profileDoc.data();
                    setUserProfile(data);
                    if (currentUser.email && currentUser.email.toLowerCase() === 'admin@wlotka.pl') setUserRole('admin');
                    else if (data.role === 'manager') setUserRole('manager');
                    else setUserRole('user');
                } else {
                    setUserRole('user');
                }
            } else {
                setUser(null);
                setUserRole('guest');
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsubEvents = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), (s) => { setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>new Date(a.date)-new Date(b.date))); });
        const unsubAllClubs = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clubs'), (s) => { setAllClubs(s.docs.map(d => ({ id: d.id, ...d.data() }))); });
        return () => { unsubEvents(); unsubAllClubs(); };
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubTickets = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets'), (s) => { setMyTickets(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>new Date(b.claimedAt?.seconds*1000)-new Date(a.claimedAt?.seconds*1000))); });
        const unsubProfile = onSnapshot(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'profile', 'main'), (s) => { if(s.exists()) setUserProfile(s.data()); });
        const unsubNotif = onSnapshot(query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(20)), (s) => { setNotifications(s.docs.map(d => ({ id: d.id, ...d.data() }))); });
        const unsubFollows = onSnapshot(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'follows'), (s) => { setFollowedClubs(s.docs.map(d => d.data().clubId)); });
        return () => { unsubTickets(); unsubProfile(); unsubNotif(); unsubFollows(); };
    }, [user]);

    useEffect(() => {
        if (!user || userRole !== 'manager') return;
        setLoadingClub(true);
        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clubs'), where("managerId", "==", user.uid));
        const unsubClub = onSnapshot(q, (s) => {
            if (!s.empty) {
                const d = s.docs[0]; 
                setClubProfile({ id: d.id, ...d.data() });
                if(d.data().logoUrl) setClubLogo(d.data().logoUrl);
                if(d.data().bannerUrl) setClubBanner(d.data().bannerUrl);
                setManagerFollowersCount(d.data().followersCount || 0);
                onSnapshot(query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reviews'), where("clubId", "==", d.id)), (rs) => {
                        const r = rs.docs.map(rd => rd.data());
                        r.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                        setManagerReviews(r);
                });
            } else setClubProfile(null);
            setLoadingClub(false);
        });
        return () => { unsubClub(); };
    }, [user, userRole]);

    const handleAuthAction = async (email, password, isRegister, type) => {
        let userCred;
        if (isRegister) {
            userCred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'artifacts', APP_ID, 'users', userCred.user.uid, 'profile', 'main'), { 
                role: type === 'club' ? 'manager' : 'user', 
                email: email, 
                createdAt: serverTimestamp() 
            });
        } else {
            userCred = await signInWithEmailAndPassword(auth, email, password);
        }
    };

    const handleLogout = async () => { await signOut(auth); setView('browse'); };

    const handleToggleFollow = async (cid) => {
        if (!user) return setShowLoginModal(true);
        if (followedClubs.includes(cid)) {
            const q = query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'follows'), where("clubId", "==", cid));
            const s = await getDocs(q); s.forEach(async d => await deleteDoc(d.ref));
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', cid), { followersCount: increment(-1) });
        } else {
            await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'follows'), { clubId: cid, createdAt: serverTimestamp() });
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', cid), { followersCount: increment(1) });
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1000000) { alert("Plik jest za duży! Maksymalny rozmiar to 1MB."); return; }
        const reader = new FileReader();
        reader.onloadend = () => { setAddEventForm(prev => ({ ...prev, imageUrl: reader.result })); };
        reader.readAsDataURL(file);
    };

    const handleClubFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1000000) { alert("Plik jest za duży! Maksymalny rozmiar to 1MB."); return; }
        const reader = new FileReader();
        reader.onloadend = () => { 
            if(type === 'logo') setClubLogo(reader.result);
            if(type === 'banner') setClubBanner(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setIsPublishing(true);
        try {
            const eventData = {
                ...addEventForm,
                managerId: user.uid,
                clubId: clubProfile.id,
                clubName: clubProfile.name, 
                city: clubProfile.city, 
                updatedAt: serverTimestamp()
            };

            if (editingEventId) {
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'events', editingEventId), eventData);
                alert("Zaktualizowano imprezę!"); setEditingEventId(null);
            } else {
                const loops = addEventForm.isRecurring ? 4 : 1; const base = new Date(addEventForm.date);
                const evs = [];
                for(let i=0;i<loops;i++) { 
                    const d = new Date(base); d.setDate(base.getDate()+(i*7)); 
                    evs.push({ 
                        ...eventData, 
                        date: d.toISOString().split('T')[0], 
                        claimedCount: 0, 
                        ticketLimit: parseInt(addEventForm.ticketLimit), 
                        createdAt: serverTimestamp() 
                    }); 
                }
                await Promise.all(evs.map(ev => addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), ev)));
                if (addEventForm.notify) alert(`Wysłano powiadomienie PUSH do ${managerFollowersCount} fanów!`);
                else alert("Opublikowano!");
            }
            setAddEventForm({ title: '', date: '', freeUntil: '', description: '', ticketLimit: '100', imageUrl: '', regulations: '', fbLink: '', isRecurring: false, notify: true, is18Plus: false });
        } catch (err) {
            console.error(err);
            alert("Błąd publikacji: " + err.message);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleEditEventClick = (ev) => {
        setAddEventForm({ title: ev.title, date: ev.date, freeUntil: ev.freeUntil, description: ev.description, ticketLimit: ev.ticketLimit, imageUrl: ev.imageUrl, regulations: ev.regulations || '', fbLink: '', isRecurring: false, notify: false, is18Plus: ev.is18Plus || false });
        setEditingEventId(ev.id); window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingEventId(null);
        setAddEventForm({ title: '', date: '', freeUntil: '', description: '', ticketLimit: '100', imageUrl: '', regulations: '', fbLink: '', isRecurring: false, notify: true, is18Plus: false });
    };

    const handleUpdateClubProfile = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', clubProfile.id), { 
            name: fd.get('name'), 
            city: fd.get('city'), 
            address: fd.get('address'), 
            nip: fd.get('nip'),
            phone: fd.get('phone'),
            logoUrl: clubLogo,
            bannerUrl: clubBanner
        });
        alert("Zapisano dane klubu!");
    };

    const handleRequestRenewal = async (plan) => {
        if (confirm(`Czy na pewno chcesz przedłużyć pakiet ${plan}? Administrator musi zatwierdzić płatność.`)) {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', clubProfile.id), { renewalStatus: 'pending', requestedPlan: plan, renewalRequestedAt: serverTimestamp() });
            alert("Zgłoszenie wysłane!");
        }
    };

    const handleApproveRenewal = async (club) => {
        if (confirm(`Zatwierdzić wpłatę dla klubu ${club.name}?`)) {
            let baseDate = new Date();
            if (club.subscriptionValidUntil && new Date(club.subscriptionValidUntil) > baseDate) baseDate = new Date(club.subscriptionValidUntil);
            baseDate.setDate(baseDate.getDate() + 30);
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', club.id), { subscriptionValidUntil: baseDate.toISOString(), subscription: 'active', renewalStatus: null, plan: club.requestedPlan });
            alert("Zatwierdzono!");
        }
    };

    const handleAdminUpdateClub = async (id, data) => {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', id), data);
    };

    const handleAdminDeleteClub = async (id) => {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', id));
        setAdminSelectedClub(null);
    };

    const handleViewClub = async (id) => { const d = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', id)); if(d.exists()) { setViewedClub({ id: d.id, ...d.data() }); setView('club-profile'); } };
    
    const initiateClaimTicket = (ev) => { 
        if(!user) return setShowLoginModal(true); 
        if(myTickets.some(t=>t.eventId===ev.id)) return; 
        if(ev.ticketLimit&&(ev.claimedCount||0)>=ev.ticketLimit) return alert("Brak miejsc"); 
        
        if (ev.is18Plus) {
            if (!userProfile?.birthDate) {
                alert("Ta impreza jest od 18 lat. Uzupełnij datę urodzenia w profilu.");
                setView('profile');
                setShowDataForm(true);
                return;
            }
            if (calculateAge(userProfile.birthDate) < 18) {
                alert("Niestety, ta impreza jest tylko dla pełnoletnich.");
                return;
            }
        }

        if(!userProfile?.fullName){
            setPendingEvent(ev);
            setShowDataForm(true);
        } else {
            executeClaim(ev,userProfile);
        } 
    };

    const executeClaim = async (ev, prof) => { 
        const sid = generateShortId(); 
        let cName = ev.clubName;
        let cCity = ev.city;
        if (!cName || !cCity) {
             const foundClub = allClubs.find(c=>c.id===ev.clubId) || viewedClub;
             if(foundClub) {
                 cName = foundClub.name;
                 cCity = foundClub.city;
             }
        }

        await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets'), { 
            eventId: ev.id, 
            clubId: ev.clubId, 
            clubName: cName || 'Klub', 
            eventName: ev.title, 
            date: ev.date, 
            freeUntil: ev.freeUntil, 
            city: cCity || 'Miasto', 
            claimedAt: serverTimestamp(), 
            activatedAt: null, 
            status: 'fresh', 
            shortId: sid 
        }); 
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'events', ev.id), { claimedCount: increment(1) }); 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', `events/${ev.id}/attendees`), { userId: user.uid, fullName: prof.fullName, phone: prof.phone, email: prof.email, shortId: sid, claimedAt: serverTimestamp(), hasEntered: false }); 
        setView('my-tickets'); 
    };

    const handleSaveProfile = async (e) => { 
        e.preventDefault(); 
        const fd = new FormData(e.target); 
        const np = { fullName: fd.get('fullName'), phone: fd.get('phone'), email: fd.get('email'), birthDate: fd.get('birthDate'), points: 0, updatedAt: serverTimestamp() }; 
        await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'profile', 'main'), np, {merge: true}); 
        setShowDataForm(false); 
        if(pendingEvent){
            if (pendingEvent.is18Plus && calculateAge(np.birthDate) < 18) {
                alert("Zapisano dane, ale nie masz 18 lat. Nie możesz pobrać tego biletu.");
                setPendingEvent(null);
            } else {
                executeClaim(pendingEvent,np);
                setPendingEvent(null);
            }
        } 
    };
    const handleSubmitReview = async (t, r, c) => { await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reviews'), { clubId: events.find(e=>e.id===t.eventId)?.clubId||'unknown', eventId: t.eventId, userId: user.uid, userName: userProfile?.fullName||'Anonim', rating: r, comment: c, createdAt: serverTimestamp() }); await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets', t.id), { hasReview: true }); setReviewTicket(null); alert("Dzięki!"); };
    const handleRegisterClub = async (e) => { e.preventDefault(); const fd = new FormData(e.target); await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clubs'), { name: fd.get('name'), city: fd.get('city'), nip: fd.get('nip'), address: fd.get('address'), phone: fd.get('phone'), managerId: user.uid, status: 'pending', subscription: 'none', followersCount: 0, createdAt: serverTimestamp() }); alert("Wysłano!"); };
    const handleDeleteEvent = async (id) => { if(confirm("Usunąć?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'events', id)); };
    const handleAdminVerify = async (id, s) => { if(confirm("Status?")) await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clubs', id), { status: s }); };
    const handleSeedData = async () => { 
        const t = new Date().toISOString().split('T')[0]; 
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), { title: "Sobotnia Gorączka", clubName: "Show", city: "Białystok", date: t, freeUntil: "23:00", description: "Demo.", ticketLimit: 50, managerId: "demo", clubId: "demo", claimedCount: 45, imageUrl: "https://images.unsplash.com/photo-1516450360452-631a46db6d8e?auto=format&fit=crop&q=80&w=1740", createdAt: serverTimestamp() });
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clubs'), { name: "Klub Testowy (Demo)", city: "Warszawa", status: 'pending', managerId: "demo", createdAt: serverTimestamp() });
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'clubs'), { name: "Klub Wygasły (Demo)", city: "Kraków", status: 'verified', subscription: 'active', renewalStatus: 'pending', requestedPlan: 'Pro', managerId: "demo", createdAt: serverTimestamp() });
        alert("Załadowano dane DEMO! Odśwież widok."); 
    };
    const requestActivation = (id) => setActivationState(p => ({ ...p, [id]: 'confirm' }));
    const cancelActivation = (id) => setActivationState(p => ({ ...p, [id]: 'idle' }));
    const confirmActivation = async (id) => { setActivationState(p => ({ ...p, [id]: 'processing' })); await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets', id), { activatedAt: serverTimestamp(), status: 'active' }); setActivationState(p => ({ ...p, [id]: 'idle' })); };
    const handleTicketExpired = async (id) => { try { await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets', id), { status: 'expired' }); } catch (e) {} };
    const handleRemoveTicket = async (t) => { if (t.activatedAt || t.status === 'expired') { alert("Zablokowane."); return; } if(confirm("Usunąć?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tickets', t.id)); };
    const handleDuplicateEvent = async (ev) => { const newEvent = { ...ev }; delete newEvent.id; newEvent.title = `${ev.title} (Kopia)`; newEvent.createdAt = serverTimestamp(); await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), newEvent); alert("Skopiowano!"); };

    const uniqueCities = useMemo(() => ['all', ...Array.from(new Set(events.map(e => e.city).filter(Boolean)))], [events]);
    const unreadNotifications = notifications.filter(n => !n.read).length;

    // --- WIDOKI ---
    const renderProfileView = () => (
        <div className="space-y-6 pb-20">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-300">{userProfile?.fullName ? userProfile.fullName.charAt(0) : <User/>}</div>
                <h2 className="text-xl font-bold text-white">{userProfile?.fullName || 'Gość'}</h2>
                
                <p className="text-sm text-slate-500">{userRole === 'manager' ? 'Konto: Manager' : 'Konto: Klubowicz'}</p>
                
                <div className="flex justify-center gap-4 mt-4">
                    <div className="text-center">
                        <div className="text-xl font-black text-purple-400 flex items-center gap-1 justify-center"><Award className="w-4 h-4"/> {userProfile?.points || 0}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Punkty</div>
                    </div>
                </div>
                <button onClick={() => setShowDataForm(true)} className="mt-6 text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 mx-auto"><Settings className="w-3 h-3"/> Edytuj Dane</button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase">Twoja Rola</div>
                <div className="p-4 flex items-center justify-between text-white">
                    <span className="flex items-center gap-2">
                        {userRole === 'admin' && <ShieldCheck className="w-5 h-5 text-red-500"/>}
                        {userRole === 'manager' && <Building2 className="w-5 h-5 text-pink-500"/>}
                        {userRole === 'user' && <User className="w-5 h-5 text-green-500"/>}
                        {userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager Klubu' : 'Klubowicz'}
                    </span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Aktywna</span>
                </div>
            </div>
            <button onClick={handleLogout} className="w-full py-4 text-red-500 text-sm font-bold border border-slate-800 rounded-xl hover:bg-slate-900">Wyloguj się</button>
        </div>
    );

    const renderClubProfile = () => { 
        if(!viewedClub) return <div>Błąd</div>; 
        const evs = events.filter(e=>e.clubId===viewedClub.id); 
        const isFollowing = followedClubs.includes(viewedClub.id); 
        return (<div className="pb-20">
            <div className="h-48 relative bg-slate-800">
                {viewedClub.bannerUrl ? (
                    <img src={viewedClub.bannerUrl} className="w-full h-full object-cover opacity-80" alt="Baner" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-purple-600 to-indigo-900"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                <button onClick={() => setView('browse')} className="absolute top-4 left-4 bg-black/30 p-2 rounded-full text-white backdrop-blur"><ArrowLeft className="w-6 h-6"/></button>
            </div>

            <div className="px-6 -mt-16 relative">
                <div className="flex justify-between items-end">
                    <div className="w-28 h-28 bg-slate-900 rounded-3xl border-4 border-slate-950 flex items-center justify-center shadow-xl overflow-hidden">
                        {viewedClub.logoUrl ? (
                            <img src={viewedClub.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <Building2 className="w-12 h-12 text-white"/>
                        )}
                    </div>
                    <button onClick={() => handleToggleFollow(viewedClub.id)} className={`flex flex-col items-center gap-1 text-xs font-bold mb-2 ${isFollowing ? 'text-pink-500' : 'text-slate-400'}`}><Heart className={`w-8 h-8 ${isFollowing ? 'fill-current animate-bounce' : ''}`}/>{isFollowing ? 'Obserwujesz' : 'Obserwuj'}</button>
                </div>
                
                <div className="mt-3">
                    <h2 className="text-3xl font-black text-white leading-tight">{viewedClub.name}</h2>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-6 font-medium"><MapPin className="w-4 h-4"/> {viewedClub.city}, {viewedClub.address}</div>
                    
                    <div className="flex gap-4 mb-8">
                        <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-center flex-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Fanów</div>
                            <div className="text-2xl font-black text-white">{viewedClub.followersCount||0}</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-center flex-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Imprezy</div>
                            <div className="text-2xl font-black text-white">{evs.length}</div>
                        </div>
                    </div>

                    <h3 className="font-bold text-white mb-4 text-lg">Nadchodzące Wydarzenia</h3>
                    <div className="space-y-4">
                        {evs.length === 0 && <div className="text-slate-500 text-sm italic">Brak nadchodzących imprez.</div>}
                        {evs.map(ev=>(
                            <div key={ev.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-white text-lg mb-1">{ev.title}</div>
                                    <div className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded inline-block">{ev.date} • {ev.freeUntil}</div>
                                </div>
                                <button onClick={() => initiateClaimTicket(ev)} className="bg-white text-black text-xs font-bold px-4 py-3 rounded-xl hover:bg-slate-200 transition-transform active:scale-95">Pobierz</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>); 
    };

    const renderManagerView = () => {
        if (!clubProfile) return (
            <div className="space-y-6 pb-20"><div className="text-center space-y-2 mt-8"><div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3"><Building2 className="w-10 h-10 text-white" /></div><h2 className="text-3xl font-black text-white">Partnerzy wlotka.pl</h2><p className="text-slate-400 text-sm">Zarejestruj swój klub.</p></div><form onSubmit={handleRegisterClub} className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mt-4"><input required name="name" placeholder="Nazwa Klubu" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" /><input required name="city" placeholder="Miasto" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" /><input required name="address" placeholder="Ulica i numer" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" /><input required name="nip" placeholder="NIP Firmy" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" /><input required name="phone" placeholder="Telefon Kontaktowy" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none" /><button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl mt-2 shadow-lg">Wyślij zgłoszenie</button></form><button onClick={handleLogout} className="w-full mt-4 py-2 text-slate-500 text-xs">Wyloguj</button></div>
        );
        if (clubProfile.status === 'pending') return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4"><div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 animate-pulse mb-4"><Clock className="w-10 h-10"/></div><h2 className="text-2xl font-bold text-white">Weryfikacja</h2><p className="text-slate-400 mt-2">Admin sprawdza Twoje zgłoszenie.</p><button onClick={handleLogout} className="mt-8 text-slate-500">Wyloguj</button></div>;
        if (clubProfile.status === 'rejected') return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-4 pb-20"><XCircle className="w-12 h-12 text-red-500" /><div><h2 className="text-2xl font-bold text-white">Odrzucono</h2></div><button onClick={handleLogout} className="text-slate-500">Wyloguj</button></div>;
        if (clubProfile.subscription !== 'active') return <div className="space-y-6 pb-20"><div className="text-center mt-4"><h2 className="text-2xl font-bold text-white mb-2">Wybierz Abonament</h2></div><div className="bg-slate-900 p-6 rounded-2xl border border-slate-800"><h3 className="text-lg font-bold text-white">Standard</h3><div className="text-3xl font-black text-white mt-2">199 zł</div><button onClick={() => handleRequestRenewal('Standard')} className="w-full mt-6 bg-slate-800 text-white py-3 rounded-xl border border-slate-700">Wybieram</button></div><button onClick={handleLogout} className="w-full py-4 text-slate-500 text-xs">Wyloguj</button></div>;
        
        return (
            <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div><div className="text-[10px] text-slate-500 uppercase font-bold">Twój Klub</div><div className="font-bold text-white text-lg">{clubProfile.name}</div></div>
                    <div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-bold">Obserwujących</div><div className="text-sm text-pink-400 font-bold flex items-center justify-end gap-1">{managerFollowersCount} <Heart className="w-3 h-3 fill-current"/></div></div>
                </div>

                <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 mb-4">
                    <button onClick={() => setManagerTab('events')} className={`flex-1 py-2 text-xs font-bold rounded ${managerTab === 'events' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Wydarzenia</button>
                    <button onClick={() => setManagerTab('reviews')} className={`flex-1 py-2 text-xs font-bold rounded ${managerTab === 'reviews' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Opinie</button>
                    <button onClick={() => setManagerTab('settings')} className={`flex-1 py-2 text-xs font-bold rounded ${managerTab === 'settings' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Ustawienia</button>
                </div>

                {managerTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400"/> Profil Klubu</h3>
                            <form onSubmit={handleUpdateClubProfile} className="space-y-3">
                                <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Nazwa</label><input name="name" defaultValue={clubProfile.name} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm"/></div>
                                <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Miasto</label><input name="city" defaultValue={clubProfile.city} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm"/></div>
                                <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Adres</label><input name="address" defaultValue={clubProfile.address} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm"/></div>
                                <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">NIP</label><input name="nip" defaultValue={clubProfile.nip} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm"/></div>
                                <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Telefon</label><input name="phone" defaultValue={clubProfile.phone} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white text-sm"/></div>
                                
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold pl-1 block mb-1">Logo Klubu</label>
                                        <label className="block bg-slate-950 border border-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-800 text-center">
                                            <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400"/>
                                            <span className="text-[10px] text-slate-500">{clubLogo ? "Zmień" : "Wgraj"}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleClubFileSelect(e, 'logo')} className="hidden" />
                                        </label>
                                        {clubLogo && <img src={clubLogo} className="w-10 h-10 mt-2 rounded object-cover border border-slate-700 mx-auto"/>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase font-bold pl-1 block mb-1">Baner (Tło)</label>
                                        <label className="block bg-slate-950 border border-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-800 text-center">
                                            <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400"/>
                                            <span className="text-[10px] text-slate-500">{clubBanner ? "Zmień" : "Wgraj"}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleClubFileSelect(e, 'banner')} className="hidden" />
                                        </label>
                                        {clubBanner && <img src={clubBanner} className="w-full h-10 mt-2 rounded object-cover border border-slate-700"/>}
                                    </div>
                                </div>

                                <button className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm mt-2">Zapisz Zmiany</button>
                            </form>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                             <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-pink-500"/> Twój Abonament</h3>
                             <div className="flex justify-between items-center mb-4"><span className="text-slate-400 text-sm">Status:</span><span className="text-green-400 font-bold uppercase text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Aktywny</span></div>
                             <div className="bg-slate-950 p-3 rounded-lg mb-4 text-center border border-slate-800"><div className="text-[10px] text-slate-500 uppercase font-bold">Ważny do</div><div className="text-xl font-mono font-bold text-white">{clubProfile.subscriptionValidUntil ? new Date(clubProfile.subscriptionValidUntil).toLocaleDateString() : '---'}</div></div>
                             
                             {clubProfile.renewalStatus === 'pending' ? (
                                 <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg text-center text-yellow-400 text-sm font-bold">
                                     Oczekiwanie na zatwierdzenie płatności przez Admina.
                                 </div>
                             ) : (
                                 <div className="grid grid-cols-2 gap-3"><button onClick={() => handleRequestRenewal('Standard')} className="bg-slate-800 text-white py-3 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700">Przedłuż (199zł)</button><button onClick={() => handleRequestRenewal('Pro')} className="bg-white text-black py-3 rounded-xl text-xs font-bold hover:bg-slate-200">Przedłuż PRO (499zł)</button></div>
                             )}
                        </div>
                        <button onClick={handleLogout} className="w-full py-3 text-red-500 text-sm border border-slate-800 rounded-xl hover:bg-slate-900">Wyloguj się</button>
                    </div>
                )}

                {managerTab === 'reviews' && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl animate-in fade-in">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-lg"><MessageSquare className="w-5 h-5 text-yellow-500"/> Opinie Gości</h3>
                        {managerReviews.length === 0 && <p className="text-slate-500 text-sm italic text-center py-8">Nikt jeszcze nie ocenił Twoich imprez.</p>}
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {managerReviews.map((r, i) => (
                                <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-lg">{r.rating} <Star className="w-4 h-4 fill-current"/></div>
                                        <div className="text-[10px] text-slate-500">{r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : ''}</div>
                                    </div>
                                    <p className="text-slate-300 text-sm italic mb-2">"{r.comment || 'Brak komentarza'}"</p>
                                    <div className="text-xs text-slate-500 font-bold flex items-center gap-1"><User className="w-3 h-3"/> {r.userName}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {managerTab === 'events' && (
                    <>
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-lg">
                                {editingEventId ? <PenSquare className="w-5 h-5 text-yellow-400"/> : <PlusCircle className="w-5 h-5 text-pink-500"/>} 
                                {editingEventId ? "Edytuj Imprezę" : "Kreator Imprez"}
                            </h3>

                            <form onSubmit={handleAddEvent} className="space-y-4">
                                <div className="space-y-3">
                                    <input required name="title" value={addEventForm.title} onChange={e=>setAddEventForm({...addEventForm, title: e.target.value})} placeholder="Nazwa Imprezy" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white font-bold" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Data</label><input required type="date" name="date" value={addEventForm.date} onChange={e=>setAddEventForm({...addEventForm, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white" /></div>
                                        <div><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Free Wjazd Do</label><input required type="time" name="freeUntil" value={addEventForm.freeUntil} onChange={e=>setAddEventForm({...addEventForm, freeUntil: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white" /></div>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2 border-t border-slate-800">
                                    <div className="relative">
                                        <label className="block bg-slate-950 border border-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-800 transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-400 flex items-center gap-2"><Upload className="w-4 h-4"/> {addEventForm.imageUrl ? "Zmień zdjęcie" : "Wgraj plik z dysku"}</span>
                                                <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-1 rounded">Max 2MB</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                        </label>
                                    </div>
                                    {addEventForm.imageUrl && (<div className="h-32 rounded-lg overflow-hidden border border-slate-700 relative group"><img src={addEventForm.imageUrl} className="w-full h-full object-cover opacity-80"/><div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold bg-black/50">Podgląd</div></div>)}
                                    
                                    <textarea required name="description" value={addEventForm.description} onChange={e=>setAddEventForm({...addEventForm, description: e.target.value})} rows="3" placeholder="Opis wydarzenia..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white" />
                                    <textarea name="regulations" value={addEventForm.regulations} onChange={e=>setAddEventForm({...addEventForm, regulations: e.target.value})} rows="2" placeholder="Regulamin / Zasady (Opcjonalne)..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white" />
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <div className="flex-1"><label className="text-[10px] text-slate-500 uppercase font-bold pl-1">Limit Biletów</label><input required type="number" name="ticketLimit" value={addEventForm.ticketLimit} onChange={e=>setAddEventForm({...addEventForm, ticketLimit: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white" /></div>
                                    <div className="flex-[2] flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 mt-5"><input type="checkbox" checked={addEventForm.isRecurring} onChange={e=>setAddEventForm({...addEventForm, isRecurring: e.target.checked})} id="isRecurring" className="w-5 h-5 accent-purple-600" /><label htmlFor="isRecurring" className="text-sm text-slate-300 cursor-pointer flex items-center gap-1"><Repeat className="w-3 h-3 text-slate-500"/> Cykliczna (4 tyg)</label></div>
                                </div>
                                
                                {/* WERYFIKACJA 18+ CHECKBOX */}
                                <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30 flex items-center gap-3 mt-2">
                                     <div className="bg-red-500/20 p-2 rounded-full"><Ban className="w-5 h-5 text-red-400"/></div>
                                     <div>
                                         <div className="text-sm font-bold text-white">Ograniczenie wiekowe</div>
                                         <div className="text-xs text-slate-400">Tylko dla osób pełnoletnich (18+)</div>
                                     </div>
                                     <input type="checkbox" checked={addEventForm.is18Plus} onChange={e => setAddEventForm({...addEventForm, is18Plus: e.target.checked})} className="w-6 h-6 accent-red-500 ml-auto cursor-pointer" />
                                </div>

                                {!editingEventId && (
                                    <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30 flex items-center gap-3 mt-2">
                                         <div className="bg-purple-500/20 p-2 rounded-full"><Megaphone className="w-5 h-5 text-purple-400"/></div>
                                         <div>
                                             <div className="text-sm font-bold text-white">Powiadom fanów i byłych gości</div>
                                             <div className="text-xs text-slate-400">Wyślij PUSH do bazy {managerFollowersCount} osób</div>
                                         </div>
                                         <input type="checkbox" checked={addEventForm.notify} onChange={e => setAddEventForm({...addEventForm, notify: e.target.checked})} className="w-6 h-6 accent-purple-500 ml-auto cursor-pointer" />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {editingEventId && <button type="button" onClick={handleCancelEdit} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">Anuluj</button>}
                                    <button disabled={isPublishing} className={`flex-[2] font-bold py-3 rounded-xl hover:brightness-110 transition-all text-white flex items-center justify-center gap-2 ${editingEventId ? 'bg-yellow-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'}`}>
                                        {isPublishing && <Loader2 className="w-4 h-4 animate-spin"/>}
                                        {editingEventId ? "Zapisz Zmiany" : (isPublishing ? "Publikowanie..." : "Opublikuj")}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="space-y-3">
                            {events.filter(e => e.managerId === user.uid).map(ev => (
                                <div key={ev.id} className={`p-4 rounded-xl border ${editingEventId === ev.id ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-slate-900 border-slate-800'}`}>
                                    <div className="flex justify-between mb-2"><div className="font-bold text-white">{ev.title}</div><div className="text-slate-500">{ev.claimedCount}/{ev.ticketLimit}</div></div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => setGatekeeperEvent(ev)} className="bg-slate-800 hover:bg-slate-700 text-green-400 py-2 rounded-lg text-xs font-bold border border-slate-700">Bramka</button>
                                        <button onClick={() => handleDuplicateEvent(ev)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 py-2 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center"><Copy className="w-4 h-4"/></button>
                                        <button onClick={() => handleEditEventClick(ev)} className="bg-slate-800 hover:bg-slate-700 text-yellow-400 py-2 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center"><PenSquare className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteEvent(ev.id)} className="bg-slate-800 hover:bg-red-900/50 text-red-400 py-2 rounded-lg text-xs font-bold border border-slate-700">Usuń</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderAdminView = () => { 
        const pending = allClubs.filter(c=>c.status==='pending'); 
        const renewals = allClubs.filter(c=>c.renewalStatus==='pending');
        const verified = allClubs.filter(c=>c.status!=='pending');
        const allEvents = events; 

        return (
            <div className="space-y-6 pb-20">
                {/* ADMIN INSPECTOR MODAL */}
                {adminSelectedClub && (
                    <AdminClubInspector 
                        club={adminSelectedClub} 
                        events={events.filter(e => e.clubId === adminSelectedClub.id)}
                        onClose={() => setAdminSelectedClub(null)}
                        onDeleteEvent={handleDeleteEvent}
                        onUpdateClub={handleAdminUpdateClub}
                        onDeleteClub={handleAdminDeleteClub}
                    />
                )}

                <div className="bg-red-900/50 border border-red-500 p-2 mb-4 text-[10px] font-mono text-red-200 rounded">
                    DEBUG: {user?.email} | Role: {userRole} | Clubs: {allClubs.length} | Events: {allEvents.length}
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-600 text-white p-2 rounded-lg"><ShieldCheck className="w-6 h-6"/></div>
                        <h2 className="text-2xl font-bold text-white">Panel Admina</h2>
                    </div>
                    <button onClick={handleLogout} className="text-slate-500 text-xs border border-slate-800 p-2 rounded">Wyloguj</button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                         <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Narzędzia Deweloperskie</h3>
                         <button onClick={handleSeedData} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Database className="w-4 h-4"/> Załaduj Dane Demo (Wszystko)</button>
                    </div>

                    {renewals.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Płatności i Przedłużenia ({renewals.length})</h3>
                            {renewals.map(c => (
                                <div key={c.id} className="bg-slate-900 border border-pink-500/30 p-4 rounded-xl mb-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => setAdminSelectedClub(c)}>
                                    <div className="flex justify-between items-start">
                                        <div><div className="text-white font-bold text-lg">{c.name}</div><div className="text-slate-400 text-sm">Plan: {c.requestedPlan}</div></div>
                                        <div className="text-xs bg-pink-900/50 text-pink-200 px-2 py-1 rounded">Czeka na wpłatę</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleApproveRenewal(c); }} className="w-full mt-3 bg-pink-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-pink-500">Zatwierdź wpłatę (+30 dni)</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-3">Oczekujące Kluby ({pending.length})</h3>
                        {pending.length === 0 && <div className="text-slate-500 text-sm">Brak nowych zgłoszeń.</div>}
                        {pending.map(c=>(<div key={c.id} className="bg-slate-900 border border-yellow-500/30 p-4 rounded-xl mb-3 cursor-pointer hover:bg-slate-800 transition" onClick={() => setAdminSelectedClub(c)}><div className="text-white font-bold text-lg">{c.name}</div><div className="text-slate-400 text-sm">{c.city}</div><div className="grid grid-cols-2 gap-3 mt-3"><button onClick={(e)=>{ e.stopPropagation(); handleAdminVerify(c.id, 'rejected'); }} className="bg-slate-800 text-red-400 py-2 rounded-lg text-sm font-bold">Odrzuć</button><button onClick={(e)=>{ e.stopPropagation(); handleAdminVerify(c.id, 'verified'); }} className="bg-green-600 text-white py-2 rounded-lg text-sm font-bold">Zatwierdź</button></div></div>))}
                    </div>
                    
                    <div>
                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3">Zarządzanie Wydarzeniami ({allEvents.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-2">
                            {allEvents.map(ev => (
                                <div key={ev.id} className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800">
                                    <div>
                                        <div className="text-white text-xs font-bold">{ev.title}</div>
                                        <div className="text-slate-500 text-[10px]">
                                            {ev.clubName || allClubs.find(c => c.id === ev.clubId)?.name || 'Nieznany Klub'} ({ev.date})
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteEvent(ev.id)} className="text-red-500 hover:bg-red-900/30 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-green-500 uppercase tracking-wider mb-3">Zweryfikowane Kluby ({verified.length})</h3>
                         {verified.map(c=>(<div key={c.id} onClick={() => setAdminSelectedClub(c)} className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-3 flex justify-between items-center cursor-pointer hover:border-slate-600 transition"><div><div className="text-white font-bold">{c.name}</div><div className="text-slate-500 text-xs">{c.city}</div></div><div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 flex items-center gap-2">{c.status} <Eye className="w-3 h-3"/></div></div>))}
                    </div>
                </div>
            </div>
        ); 
    };

    const renderUserView = () => {
        const filtered = events.filter(e => (e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.clubName.toLowerCase().includes(searchTerm.toLowerCase())) && (selectedCity==='all' || e.city===selectedCity) && (selectedCity!=='following'||followedClubs.includes(e.clubId)));
        if (view === 'browse') return (
            <div className="space-y-4 pb-20">
                <div className="flex items-center justify-center mb-4"><span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">wlotka.pl</span></div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{uniqueCities.map(c=>(<button key={c} onClick={()=>setSelectedCity(c)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedCity===c?'bg-white text-black':'bg-slate-800 text-slate-400'}`}>{c==='all'?'Wszystkie':c}</button>))}<button onClick={()=>setSelectedCity('following')} className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${selectedCity==='following'?'bg-pink-600 text-white':'bg-slate-800 text-slate-400'}`}><Heart className="w-3 h-3 fill-current"/> Obserwowane</button></div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Szukaj..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-white"/></div>
                
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                        <div className="text-slate-500 text-sm">Brak aktywnych imprez.</div>
                        <button onClick={handleSeedData} className="text-xs border border-slate-800 px-3 py-2 rounded bg-slate-900 text-slate-400 hover:text-white transition-colors">Załaduj Dane Demo (Gość)</button>
                    </div>
                ) : (
                    <div className="space-y-6">{filtered.map(ev=>{ const tk=ev.claimedCount||0; const lm=ev.ticketLimit||100; const pc=Math.min((tk/lm)*100,100); const so=tk>=lm; const has=myTickets.some(t=>t.eventId===ev.id); return (<div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg relative group"><div className="h-48 bg-slate-800 relative overflow-hidden">{ev.imageUrl?<img src={ev.imageUrl} className="w-full h-full object-cover opacity-80"/>:<div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900"></div>}<div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div><div className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full text-xs font-bold text-pink-300 border border-white/10 flex items-center gap-1"><Clock className="w-3 h-3"/> Free do {ev.freeUntil}</div>
                    {/* 18+ BADGE */}
                    {ev.is18Plus && <div className="absolute top-3 left-3 bg-red-600/90 text-white px-2 py-1 rounded-lg text-xs font-black border border-red-500 flex items-center gap-1"><Ban className="w-3 h-3"/> 18+</div>}
                    
                    <div className="absolute bottom-3 left-3 right-3"><div className="flex justify-between items-end"><div onClick={()=>handleViewClub(ev.clubId)} className="cursor-pointer"><div className="font-bold text-white text-2xl mb-1 text-shadow">{ev.title}</div><div className="flex items-center gap-2 text-slate-300 text-xs font-medium"><Building2 className="w-3 h-3"/> {ev.clubName || allClubs.find(c=>c.id===ev.clubId)?.name} • {ev.city || allClubs.find(c=>c.id===ev.clubId)?.city} <button onClick={(e)=>{e.stopPropagation(); handleToggleFollow(ev.clubId)}} className="ml-2"><Heart className={`w-4 h-4 ${followedClubs.includes(ev.clubId)?'fill-pink-500 text-pink-500':'text-slate-400'}`}/></button></div></div>
                    
                    {/* INFO BUTTON WITH DESCRIPTION */}
                    {(ev.description || ev.regulations) && (
                        <button 
                            onClick={(e)=>{
                                e.stopPropagation(); 
                                setInfoModal({
                                    title: ev.title,
                                    content: (
                                        <div className="space-y-4">
                                            {ev.description && (
                                                <div>
                                                    <div className="text-xs font-bold text-purple-400 uppercase mb-1">O Wydarzeniu</div>
                                                    <p className="text-slate-300 leading-relaxed whitespace-pre-line">{ev.description}</p>
                                                </div>
                                            )}
                                            {ev.regulations && (
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1 pt-4 border-t border-slate-800">Regulamin / Zasady</div>
                                                    <p className="text-slate-400 text-xs italic whitespace-pre-line">{ev.regulations}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            }} 
                            className="bg-white/10 p-2 rounded-full backdrop-blur hover:bg-white/20 transition-colors"
                        >
                            <Info className="w-4 h-4 text-white"/>
                        </button>
                    )}
                    </div></div></div><div className="p-4"><div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4"><div className={`h-full rounded-full ${so?'bg-red-500':'bg-gradient-to-r from-green-400 to-emerald-500'}`} style={{width:`${pc}%`}}></div></div><button onClick={(e)=>{e.stopPropagation(); initiateClaimTicket(ev)}} disabled={has||so} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${has?'bg-slate-800 text-slate-500':so?'bg-slate-800 text-red-400 cursor-not-allowed':'bg-white text-black'}`}>{has?"Bilet w portfelu":so?"Brak miejsc":"Pobierz"}</button></div></div>); })}</div>
                )}
            </div>
        );
        
        if (view === 'my-tickets') {
            const active = myTickets.filter(t=>t.status!=='expired'); const history = myTickets.filter(t=>t.status==='expired');
            return (<div className="space-y-6 pb-20"><div className="space-y-4"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Ticket className="w-5 h-5 text-pink-500"/> Aktywne</h2>{active.length===0&&<div className="text-slate-500 text-sm italic bg-slate-900/50 p-4 rounded-lg">Brak aktywnych wejściówek.</div>}{active.map(t=>(<div key={t.id} className={`bg-slate-800 rounded-xl p-4 border-l-4 relative overflow-hidden shadow-lg ${t.activatedAt?'border-green-500':'border-pink-500'}`}><div className="flex justify-between mb-2"><span className="text-white font-bold text-lg">{t.clubName}</span><span className="text-slate-400 text-sm bg-slate-900 px-2 py-1 rounded">{t.date}</span></div><div className="text-slate-300 text-sm mb-6">{t.eventName} • {t.city}</div><div className="bg-slate-900 p-2 rounded-xl">{t.activatedAt?<TicketTimer ticket={t} userName={userProfile?.fullName} onExpire={()=>handleTicketExpired(t.id)}/>:(<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center"><button onClick={()=>requestActivation(t.id)} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg shadow-lg">AKTYWUJ</button>{activationState[t.id]==='confirm' && <div className="space-y-3 animate-in fade-in mt-2"><p className="text-white text-sm font-bold">Potwierdzasz?</p><div className="flex gap-2"><button onClick={()=>cancelActivation(t.id)} className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-xs">Nie</button><button onClick={()=>confirmActivation(t.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold">Tak</button></div></div>}</div>)}</div>{!t.activatedAt && <button onClick={()=>handleRemoveTicket(t)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400 p-2"><Trash2 className="w-4 h-4"/></button>}</div>))}</div><div className="space-y-3 pt-4 border-t border-slate-800"><h2 className="text-lg font-bold text-slate-400 flex items-center gap-2"><History className="w-4 h-4"/> Historia</h2>{history.map(t=>(<div key={t.id} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center hover:bg-slate-900 transition-all"><div><div className="font-bold text-white text-sm">{t.clubName}</div><div className="text-xs text-slate-500">{t.date}</div></div>{t.hasReview?<div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Oceniono</div>:<button onClick={()=>setReviewTicket(t)} className="text-xs bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-3 py-1 rounded font-bold hover:bg-yellow-500/30">Oceń</button>}</div>))}</div></div>);
        }
    };

    if (loadingClub || userRole === 'loading') return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4"/>
            <div className="text-sm font-bold">Ładowanie wlotka.pl...</div>
            <button onClick={() => {signOut(auth); setView('browse');}} className="mt-8 text-xs text-slate-600 underline">Anuluj</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30">
            {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleAuthAction} />}
            {showDataForm && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200"><h3 className="text-xl font-bold text-white mb-2">Twoje Dane</h3><p className="text-sm text-slate-400 mb-4">Uzupełnij profil, aby pobierać bilety.</p><form onSubmit={handleSaveProfile} className="space-y-3"><input name="fullName" defaultValue={userProfile?.fullName} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" placeholder="Imię i Nazwisko" /><input name="phone" defaultValue={userProfile?.phone} required type="tel" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" placeholder="Telefon" /><input name="email" defaultValue={userProfile?.email} required type="email" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" placeholder="Email" /><div className="relative"><CalendarDays className="absolute left-3 top-3 w-5 h-5 text-slate-500"/><input name="birthDate" defaultValue={userProfile?.birthDate} required type="date" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-white" /></div><div className="flex gap-3 mt-4"><button type="button" onClick={() => setShowDataForm(false)} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold">Anuluj</button><button type="submit" className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">Zapisz</button></div></form></div></div>}
            {gatekeeperEvent && <GatekeeperView eventId={gatekeeperEvent.id} eventTitle={gatekeeperEvent.title} onClose={() => setGatekeeperEvent(null)} appId={APP_ID} />}
            {showNotifications && <NotificationsModal notifications={notifications} onClose={() => setShowNotifications(false)} onMarkRead={(id) => updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'notifications', id), {read:true})} />}
            {reviewTicket && <ReviewModal ticket={reviewTicket} onClose={() => setReviewTicket(null)} onSubmit={handleSubmitReview} />}
            {infoModal && <InfoModal title={infoModal.title} content={infoModal.content} onClose={() => setInfoModal(null)} />}

            <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md px-4 py-4 border-b border-slate-800 flex justify-between items-center shadow-sm">
                <div className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 cursor-pointer" onClick={() => setView('browse')}>wlotka.pl</div>
                <div className="flex items-center gap-3">
                    {userRole === 'user' && (<button onClick={() => setShowNotifications(true)} className="relative text-slate-400 hover:text-white transition-colors"><Bell className="w-6 h-6" />{unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white border border-slate-950">{unreadNotifications}</span>}</button>)}
                    {userRole !== 'user' && userRole !== 'guest' && <div className="text-[10px] font-bold bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase tracking-wider">Tryb {userRole}</div>}
                    {!user && <button onClick={() => setShowLoginModal(true)} className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-bold hover:bg-slate-200 transition">Zaloguj</button>}
                </div>
            </div>
            
            <div className="p-4 max-w-md mx-auto min-h-[85vh]">
                {userRole === 'admin' && renderAdminView()}
                {userRole === 'manager' && renderManagerView()}
                {(userRole === 'user' || userRole === 'guest') && (view === 'profile' ? (user ? renderProfileView() : null) : view === 'club-profile' ? renderClubProfile() : view === 'my-tickets' ? (user ? renderUserView() : null) : renderUserView())}
            </div>

            {(userRole === 'user' || userRole === 'guest') && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-800 px-6 py-2 flex justify-between items-center backdrop-blur-xl max-w-md mx-auto pb-safe z-30">
                    <button onClick={() => setView('browse')} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'browse' || view === 'club-profile' ? 'text-purple-400' : 'text-slate-600'}`}><Search className="w-6 h-6"/><span className="text-[10px] font-medium">Odkrywaj</span></button>
                    <button onClick={() => user ? setView('my-tickets') : setShowLoginModal(true)} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'my-tickets' ? 'text-purple-400' : 'text-slate-600'}`}><div className="relative"><Ticket className="w-6 h-6"/>{myTickets.filter(t=>t.status!=='expired').length>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-slate-950"></span>}</div><span className="text-[10px] font-medium">Bilety</span></button>
                    <button onClick={() => user ? setView('profile') : setShowLoginModal(true)} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${view === 'profile' ? 'text-purple-400' : 'text-slate-600'}`}><User className="w-6 h-6"/><span className="text-[10px] font-medium">Konto</span></button>
                </div>
            )}
        </div>
    );
}