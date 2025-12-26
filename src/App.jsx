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
  User, 
  LogOut,
  ChevronRight,
  ClipboardList,
  UserCheck,
  Bell,
  Navigation
} from 'lucide-react';

// --- Konfigurasi Firebase Anda ---
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hr-connect-pro-v2';

// Lokasi Kantor (Mock)
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

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const saved = localStorage.getItem('hr_session');
      if (saved && u) {
        setProfile(JSON.parse(saved));
        setView('home');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator && (view === 'attendance' || view === 'home')) {
      const watchId = navigator.geolocation.watchPosition((pos) => {
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(userLoc);
        const d = calculateDistance(userLoc.lat, userLoc.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
        setDistance(d);
      }, null, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [view]);

  useEffect(() => {
    if (!user || !profile) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setActivities(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
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
      setStatusMsg({ type: 'info', text: 'Memproses...' });
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'activity_logs'), {
        type,
        ...data,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      setStatusMsg({ type: 'success', text: 'Berhasil dikirim' });
      setTimeout(() => { setStatusMsg(null); setView('home'); }, 1500);
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Gagal mengirim data' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Memuat aplikasi...</p>
      </div>
    </div>
  );

  const LoginView = () => {
    const [form, setForm] = useState({ company: '', nik: '', pass: '' });
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-[2.5rem] shadow-2xl shadow-blue-200 flex items-center justify-center mb-8 rotate-3">
            <LayoutDashboard size={40} className="text-white -rotate-3" />
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">HR CONNECT</h1>
            <p className="text-slate-400 font-medium">Professional Workforce Management</p>
          </div>
          
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100">
              <input 
                className="w-full bg-transparent p-4 outline-none text-slate-700 placeholder:text-slate-300 font-medium"
                placeholder="ID Perusahaan"
                onChange={e => setForm({...form, company: e.target.value})}
              />
            </div>
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100">
              <input 
                className="w-full bg-transparent p-4 outline-none text-slate-700 placeholder:text-slate-300 font-medium"
                placeholder="NIK Karyawan"
                onChange={e => setForm({...form, nik: e.target.value})}
              />
            </div>
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100">
              <input 
                type="password"
                className="w-full bg-transparent p-4 outline-none text-slate-700 placeholder:text-slate-300 font-medium"
                placeholder="Kata Sandi"
                onChange={e => setForm({...form, pass: e.target.value})}
              />
            </div>
            <button 
              onClick={() => {
                if(!form.nik) return;
                const mock = { name: 'Ahmad Fauzi', nik: form.nik, company: form.company, leave: 14, dept: 'Operasional' };
                setProfile(mock);
                localStorage.setItem('hr_session', JSON.stringify(mock));
                setView('home');
              }}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-3xl shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
              MASUK KE SISTEM
            </button>
          </div>
        </div>
        <p className="p-8 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">v2.0.4 Platinum Edition</p>
      </div>
    );
  };

  const HomeView = () => (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header */}
      <div className="bg-white px-6 pt-12 pb-24 rounded-b-[3.5rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50"></div>
        
        <div className="flex justify-between items-center relative z-10 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {profile?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Selamat Bekerja,</p>
              <h2 className="text-xl font-black text-slate-800">{profile?.name}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Bell size={20} className="text-slate-400" />
              <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
            </div>
            <button onClick={() => { localStorage.clear(); setView('login'); }} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Cuti Highlight Card */}
        <div className="absolute left-6 right-6 -bottom-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-6 shadow-2xl shadow-blue-200 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
              <Calendar size={28} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Sisa Cuti Tahunan</p>
              <p className="text-3xl font-black">{profile?.leave} <span className="text-sm font-medium opacity-70 tracking-normal">Hari</span></p>
            </div>
          </div>
          <button className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Grid Menu */}
      <div className="mt-20 px-6 grid grid-cols-2 gap-4">
        {[
          { id: 'attendance', label: 'Attendance', desc: 'In & Out', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'correction', label: 'Correction', desc: 'Lupa Absen', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { id: 'leave', label: 'Leave', desc: 'Izin & Cuti', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50' },
          { id: 'ot', label: 'Overtime', desc: 'Lembur', icon: Timer, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { id: 'permission', label: 'Permission', desc: 'Izin Khusus', icon: ClipboardList, color: 'text-cyan-500', bg: 'bg-cyan-50' },
          { id: 'approval', label: 'Approval', desc: 'Persetujuan', icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50' }
        ].map(menu => (
          <button 
            key={menu.id} 
            onClick={() => setView(menu.id)}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-start gap-4 transition-all active:scale-95 hover:shadow-md group"
          >
            <div className={`${menu.bg} ${menu.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
              <menu.icon size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{menu.label}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{menu.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent History */}
      <div className="px-6 mt-10 pb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800">Aktivitas Terbaru</h3>
          <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Lihat Semua</p>
        </div>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">Belum ada riwayat aktivitas</p>
            </div>
          ) : (
            activities.slice(0, 5).map(act => (
              <div key={act.id} className="bg-white p-5 rounded-3xl border border-slate-50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    act.type.includes('IN') ? 'bg-emerald-50 text-emerald-600' : 
                    act.type.includes('OUT') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {act.type.includes('IN') ? <CheckCircle2 size={20} /> : 
                     act.type.includes('OUT') ? <LogOut size={20} /> : <Calendar size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800">{act.type}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {act.timestamp?.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • 
                      {act.timestamp?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  act.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {act.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const FormHeader = ({ title }) => (
    <header className="bg-white px-6 py-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-50">
      <button onClick={() => setView('home')} className="p-3 bg-slate-50 rounded-2xl text-slate-400">
        <ChevronLeft size={20} strokeWidth={3} />
      </button>
      <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
    </header>
  );

  const AttendanceView = () => (
    <div className="min-h-screen bg-[#F8FAFC]">
      <FormHeader title="Pencatatan Kehadiran" />
      <div className="p-6 flex flex-col items-center gap-8">
        <div className="w-full bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 rotate-3">
            <MapPin size={36} strokeWidth={2.5} />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Lokasi Terdeteksi</p>
          <p className="font-black text-slate-800 text-lg">
            {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Mengunci GPS..."}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Navigation size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-500">Jarak: <span className="text-blue-600">{distance || '0'} meter</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 w-full gap-4">
          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check IN', { coords: location, dist: distance })}
            className="group relative bg-emerald-500 hover:bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-emerald-100 flex items-center justify-between overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 text-left mb-1">Mulai Bekerja</p>
              <h4 className="text-2xl font-black">ABSEN MASUK</h4>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl relative z-10"><CheckCircle2 size={32} /></div>
          </button>

          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check OUT', { coords: location, dist: distance })}
            className="group relative bg-rose-500 hover:bg-rose-600 text-white p-8 rounded-[2.5rem] shadow-xl shadow-rose-100 flex items-center justify-between overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="relative z-10 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Selesai Bekerja</p>
              <h4 className="text-2xl font-black">ABSEN PULANG</h4>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl relative z-10"><LogOut size={32} /></div>
          </button>
        </div>
      </div>
    </div>
  );

  const GenericForm = ({ title, icon: Icon, type, fields, colorClass, buttonColor }) => {
    const [formData, setFormData] = useState({});
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <FormHeader title={title} />
        <div className="p-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-4 rounded-2xl ${colorClass} text-white shadow-lg`}><Icon size={24} /></div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Formulir</p>
                <p className="font-black text-slate-800">{title}</p>
              </div>
            </div>
            
            <div className="space-y-5">
              {fields.map(f => (
                <div key={f.name}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block mb-2 tracking-widest">{f.label}</label>
                  {f.type === 'select' ? (
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-slate-700 appearance-none"
                      onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                    >
                      {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium text-slate-700 h-32 resize-none"
                      placeholder={f.placeholder}
                      onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                    />
                  ) : (
                    <input 
                      type={f.type}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-slate-700"
                      onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                    />
                  )}
                </div>
              ))}
              <button 
                onClick={() => submitActivity(type, formData)}
                className={`w-full ${buttonColor} text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-[0.98] mt-4 tracking-widest`}
              >
                KIRIM PENGAJUAN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white relative shadow-2xl overflow-x-hidden font-sans">
      {statusMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[320px] px-4 animate-in fade-in slide-in-from-top-10 duration-500">
          <div className={`px-8 py-4 rounded-3xl shadow-2xl flex items-center justify-center gap-3 text-sm font-black tracking-wide border backdrop-blur-md ${
            statusMsg.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 
            statusMsg.type === 'info' ? 'bg-slate-900/90 text-white border-slate-700' : 'bg-rose-500/90 text-white border-rose-400'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {statusMsg.text.toUpperCase()}
          </div>
        </div>
      )}
      
      {view === 'login' && <LoginView />}
      {view === 'home' && <HomeView />}
      {view === 'attendance' && <AttendanceView />}
      
      {view === 'leave' && (
        <GenericForm 
          title="Leave Request" 
          icon={Calendar} 
          type="Leave" 
          colorClass="bg-rose-500"
          buttonColor="bg-rose-500 shadow-rose-200"
          fields={[
            { name: 'reason', label: 'Jenis Cuti', type: 'select', options: ['Sakit', 'Cuti Tahunan', 'Cuti Menikah', 'Keperluan Penting'] },
            { name: 'start', label: 'Tanggal Mulai', type: 'date' },
            { name: 'end', label: 'Tanggal Akhir', type: 'date' },
            { name: 'note', label: 'Keterangan Tambahan', type: 'textarea', placeholder: 'Tulis detail alasan Anda...' }
          ]}
        />
      )}

      {view === 'ot' && (
        <GenericForm 
          title="Overtime Request" 
          icon={Timer} 
          type="Overtime" 
          colorClass="bg-indigo-600"
          buttonColor="bg-indigo-600 shadow-indigo-200"
          fields={[
            { name: 'category', label: 'Tipe Lembur', type: 'select', options: ['After Shift (OUT OT)', 'Before Shift (IN OT)', 'Holiday OT'] },
            { name: 'time_from', label: 'Dari Jam', type: 'time' },
            { name: 'time_to', label: 'Sampai Jam', type: 'time' },
            { name: 'activity', label: 'Aktivitas Pekerjaan', type: 'textarea', placeholder: 'Jelaskan apa yang dikerjakan saat lembur...' }
          ]}
        />
      )}

      {['permission', 'correction', 'approval'].includes(view) && (
        <div className="min-h-screen bg-[#F8FAFC]">
          <FormHeader title="Menu Dalam Pengembangan" />
          <div className="p-10 flex flex-col items-center justify-center text-center gap-6 mt-20">
            <div className="w-32 h-32 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-300">
              <ClipboardList size={64} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-lg">Halaman Belum Tersedia</h4>
              <p className="text-slate-400 text-sm mt-2">Fitur ini sedang dalam tahap pengembangan oleh tim IT.</p>
            </div>
            <button onClick={() => setView('home')} className="bg-slate-900 text-white px-10 py-4 rounded-3xl font-bold">KEMBALI KE BERANDA</button>
          </div>
        </div>
      )}
    </div>
  );
}
