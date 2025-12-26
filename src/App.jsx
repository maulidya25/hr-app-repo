import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Clock, 
  MapPin, 
  Calendar, 
  Timer, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  Camera, 
  Upload, 
  User, 
  LogOut,
  ChevronRight,
  ClipboardList,
  UserCheck
} from 'lucide-react';

// --- Konfigurasi Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDgqxQ2IsGD-jSfZy8Yz2QsX4ZMFhThKNs",
  authDomain: "hrconnect-52be5.firebaseapp.com",
  projectId: "hrconnect-52be5",
  storageBucket: "hrconnect-52be5.firebasestorage.app",
  messagingSenderId: "491573447540",
  appId: "1:491573447540:web:a3fe2788dc20f675efba21",
  measurementId: "G-38TV1QKCYX"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hr-connect-pro-v1';

// Lokasi Kantor Mock (Jakarta)
const OFFICE_COORDS = { lat: -6.2088, lng: 106.8456 };

export default function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [activities, setActivities] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Logika Autentikasi (RULE 3: Autentikasi Sebelum Query)
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        // Coba gunakan custom token jika tersedia
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            // Jika token mismatch, lakukan fallback ke anonymous login
            console.warn("Custom token bermasalah, beralih ke login anonim:", tokenErr);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
        setAuthError(null);
      } catch (err) {
        console.error("Detail galat autentikasi:", err);
        if (err.code === 'auth/configuration-not-found') {
          setAuthError("Galat: Fitur 'Anonymous Auth' belum diaktifkan di Firebase Console.");
        } else {
          setAuthError(`Galat Autentikasi: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const saved = localStorage.getItem('hr_session');
        if (saved) {
          setProfile(JSON.parse(saved));
          setView('home');
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Pemantau Lokasi
  useEffect(() => {
    if ("geolocation" in navigator && (view === 'attendance' || view === 'home')) {
      const watchId = navigator.geolocation.watchPosition((pos) => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(userLoc);
        const d = calculateDistance(userLoc.lat, userLoc.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
        setDistance(d);
      }, (err) => console.warn("Galat GPS:", err), { enableHighAccuracy: true });
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [view]);

  // Sinkronisasi Firestore (Diproteksi dengan pengecekan user)
  useEffect(() => {
    if (!user || !profile) return;

    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setActivities(data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      }));
    }, (err) => {
      console.error("Galat Snapshot Firestore:", err);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c * 1000).toFixed(0);
  };

  const submitActivity = async (type, data) => {
    if (!user) return;
    try {
      setStatusMsg({ type: 'info', text: 'Mengirim data...' });
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs'), {
        type,
        ...data,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      setStatusMsg({ type: 'success', text: `Berhasil mengajukan ${type}` });
      setTimeout(() => { setStatusMsg(null); setView('home'); }, 2000);
    } catch (e) {
      console.error("Galat Pengiriman:", e);
      setStatusMsg({ type: 'error', text: 'Gagal mengirim data ke server.' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500 font-medium tracking-wide">Menghubungkan ke server...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-800 mb-2">Konfigurasi Bermasalah</h2>
        <p className="text-red-600 mb-6">{authError}</p>
        <div className="bg-white p-4 rounded-xl shadow-sm text-sm text-left border border-red-100">
          <p className="font-bold mb-2">Cara Memperbaiki:</p>
          <ol className="list-decimal ml-4 space-y-1 text-gray-700">
            <li>Buka <strong>Firebase Console</strong>.</li>
            <li>Pilih menu <strong>Authentication</strong> di sidebar.</li>
            <li>Klik tab <strong>Sign-in method</strong>.</li>
            <li>Klik <strong>Add new provider</strong>.</li>
            <li>Pilih <strong>Anonymous</strong> dan klik <strong>Enable</strong>.</li>
            <li>Simpan dan muat ulang aplikasi ini.</li>
          </ol>
        </div>
      </div>
    );
  }

  const LoginView = () => {
    const [form, setForm] = useState({ company: '', nik: '', pass: '' });
    return (
      <div className="min-h-screen bg-blue-700 flex flex-col p-8 items-center justify-center text-white">
        <div className="bg-white/10 p-4 rounded-3xl mb-6 backdrop-blur-md">
          <LayoutDashboard size={48} />
        </div>
        <h1 className="text-3xl font-black mb-2 text-center">HR CONNECT</h1>
        <p className="text-blue-100 mb-10 opacity-70 uppercase tracking-widest text-xs text-center">Employee Self Service</p>
        
        <div className="w-full max-w-sm space-y-4">
          <input 
            className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition placeholder-blue-200"
            placeholder="Company ID"
            value={form.company}
            onChange={e => setForm({...form, company: e.target.value})}
          />
          <input 
            className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition placeholder-blue-200"
            placeholder="NIK Karyawan"
            value={form.nik}
            onChange={e => setForm({...form, nik: e.target.value})}
          />
          <input 
            type="password"
            className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none focus:bg-white/20 transition placeholder-blue-200"
            placeholder="Password"
            value={form.pass}
            onChange={e => setForm({...form, pass: e.target.value})}
          />
          <button 
            onClick={() => {
              if(!form.nik || !form.company) return;
              const mock = { name: 'Karyawan Demo', nik: form.nik, company: form.company, leave: 12 };
              setProfile(mock);
              localStorage.setItem('hr_session', JSON.stringify(mock));
              setView('home');
            }}
            className="w-full bg-white text-blue-700 font-bold p-4 rounded-2xl shadow-xl active:scale-95 transition"
          >
            MASUK
          </button>
        </div>
      </div>
    );
  };

  const HomeView = () => (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-blue-600 p-6 pt-10 rounded-b-[3rem] text-white shadow-lg relative">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-blue-200 text-sm">Halo,</p>
            <h2 className="text-xl font-bold">{profile?.name}</h2>
            <p className="text-xs opacity-60 font-mono tracking-tighter mt-1">{profile?.nik} | {profile?.company}</p>
          </div>
          <button onClick={() => { localStorage.clear(); setView('login'); }} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"><LogOut size={20} /></button>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl flex items-center justify-between text-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Calendar size={24} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sisa Cuti Tahunan</p>
              <p className="text-2xl font-black text-blue-600">{profile?.leave} <span className="text-sm font-medium text-gray-400">Hari</span></p>
            </div>
          </div>
          <ChevronRight className="text-gray-300" />
        </div>
      </div>

      <div className="px-6 mt-12 grid grid-cols-2 gap-4">
        {[
          { id: 'attendance', label: 'Attendance', icon: Clock, color: 'bg-emerald-500' },
          { id: 'correction', label: 'Incorrect Absen', icon: AlertCircle, color: 'bg-amber-500' },
          { id: 'leave', label: 'Leave Request', icon: Calendar, color: 'bg-rose-500' },
          { id: 'ot', label: 'OT Request', icon: Timer, color: 'bg-indigo-500' },
          { id: 'permission', label: 'Permission', icon: ClipboardList, color: 'bg-cyan-500' },
          { id: 'approval', label: 'Approval', icon: UserCheck, color: 'bg-blue-500' }
        ].map(menu => (
          <button 
            key={menu.id} 
            onClick={() => setView(menu.id)}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition hover:shadow-md"
          >
            <div className={`${menu.color} p-4 rounded-2xl text-white shadow-md`}><menu.icon size={24} /></div>
            <span className="text-xs font-bold text-gray-600">{menu.label}</span>
          </button>
        ))}
      </div>

      <div className="px-6 mt-10">
        <h3 className="font-bold text-gray-800 mb-4">Aktivitas Terakhir</h3>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-3xl">Tidak ada aktivitas</div>
          ) : (
            activities.slice(0, 10).map(act => (
              <div key={act.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.type.includes('OUT') ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {act.type.includes('OUT') ? <LogOut size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{act.type}</p>
                    <p className="text-[10px] text-gray-400">{act.timestamp?.toDate().toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${act.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                  {act.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const AttendanceView = () => (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white p-5 border-b flex items-center gap-4">
        <button onClick={() => setView('home')} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ChevronLeft /></button>
        <h2 className="font-bold">Kehadiran</h2>
      </header>
      <div className="p-6 space-y-6 text-center">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full mx-auto flex items-center justify-center mb-4">
            <MapPin size={32} />
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Lokasi Anda</p>
          <p className="font-bold text-gray-800">{location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Mencari koordinat..."}</p>
          <div className="mt-4 p-2 bg-slate-50 rounded-2xl text-xs font-medium text-gray-500">
            Jarak ke Kantor: <span className="text-blue-600 font-bold">{distance || '--'} m</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check IN', { coords: location, dist: distance })}
            className="bg-emerald-500 text-white p-8 rounded-3xl shadow-lg active:scale-95 transition flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={32} />
            <span className="font-black">ABSEN IN</span>
          </button>
          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check OUT', { coords: location, dist: distance })}
            className="bg-orange-500 text-white p-8 rounded-3xl shadow-lg active:scale-95 transition flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <LogOut size={32} />
            <span className="font-black">ABSEN OUT</span>
          </button>
        </div>
      </div>
    </div>
  );

  const LeaveView = () => {
    const [form, setForm] = useState({ reason: 'Sakit', start: '', end: '', note: '' });
    const reasons = ['Sakit', 'Izin Permisi', 'Cuti Tahunan', 'Cuti Menikah', 'Cuti Melahirkan', 'Cuti Kedukaan', 'Cuti Ibadah'];
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white p-5 border-b flex items-center gap-4">
          <button onClick={() => setView('home')} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ChevronLeft /></button>
          <h2 className="font-bold">Pengajuan Cuti</h2>
        </header>
        <div className="p-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">Kategori</label>
              <select className="w-full mt-1 p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Mulai</label>
                <input type="date" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setForm({...form, start: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Sampai</label>
                <input type="date" className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setForm({...form, end: e.target.value})} />
              </div>
            </div>
            <textarea className="w-full p-3 bg-gray-50 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Catatan tambahan..." onChange={e => setForm({...form, note: e.target.value})} />
            <button disabled={loading} onClick={() => submitActivity('Leave Request', form)} className="w-full bg-rose-500 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50">AJUKAN</button>
          </div>
        </div>
      </div>
    );
  };

  const OTView = () => {
    const [form, setForm] = useState({ category: 'OUT OT', fromTime: '', toTime: '', activity: '' });
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white p-5 border-b flex items-center gap-4">
          <button onClick={() => setView('home')} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition"><ChevronLeft /></button>
          <h2 className="font-bold">Pengajuan Lembur</h2>
        </header>
        <div className="p-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4 border border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {['IN OT', 'OUT OT', 'Holiday'].map(cat => (
                <button key={cat} onClick={() => setForm({...form, category: cat})} className={`p-2 rounded-xl text-[10px] font-bold border transition ${form.category === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" className="p-3 bg-gray-50 border rounded-xl" onChange={e => setForm({...form, fromTime: e.target.value})} />
              <input type="time" className="p-3 bg-gray-50 border rounded-xl" onChange={e => setForm({...form, toTime: e.target.value})} />
            </div>
            <textarea className="w-full p-3 bg-gray-50 border rounded-xl h-20 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Deskripsi pekerjaan lembur..." onChange={e => setForm({...form, activity: e.target.value})} />
            <button disabled={loading} onClick={() => submitActivity('OT Request', form)} className="w-full bg-indigo-600 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-50">KIRIM PENGAJUAN</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white relative shadow-2xl overflow-x-hidden">
      {statusMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[320px] px-4">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusMsg.type === 'success' ? 'bg-green-600 text-white' : 
            statusMsg.type === 'info' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {statusMsg.text}
          </div>
        </div>
      )}
      
      {view === 'login' && <LoginView />}
      {view === 'home' && <HomeView />}
      {view === 'attendance' && <AttendanceView />}
      {view === 'leave' && <LeaveView />}
      {view === 'ot' && <OTView />}
      {view === 'permission' && (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
          <ClipboardList size={64} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium mb-6 font-semibold">Fitur Izin Khusus sedang dalam tahap pengembangan.</p>
          <button onClick={() => setView('home')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200">Kembali</button>
        </div>
      )}
      {view === 'correction' && (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
          <AlertCircle size={64} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium mb-6 font-semibold">Fitur Koreksi Absen segera hadir.</p>
          <button onClick={() => setView('home')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200">Kembali</button>
        </div>
      )}
      {view === 'approval' && (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
          <UserCheck size={64} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium mb-6 font-semibold">Menu Persetujuan akan segera tersedia.</p>
          <button onClick={() => setView('home')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200">Kembali</button>
        </div>
      )}
    </div>
  );
}