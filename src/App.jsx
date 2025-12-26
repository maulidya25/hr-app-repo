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
  Navigation,
  Fingerprint,
  Briefcase
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'hr-connect-pro-v3';

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
        console.error(err);
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
      setStatusMsg({ type: 'success', text: 'Berhasil!' });
      setTimeout(() => { setStatusMsg(null); setView('home'); }, 1500);
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Terjadi kesalahan' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
        </div>
        <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Sistem Memuat</p>
      </div>
    </div>
  );

  const LoginView = () => {
    const [form, setForm] = useState({ company: '', nik: '', pass: '' });
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-[2.5rem] shadow-2xl shadow-indigo-200 flex items-center justify-center mb-6 relative group overflow-hidden">
               <div className="absolute inset-0 bg-white opacity-10 group-hover:scale-150 transition-transform duration-700 rounded-full"></div>
               <Fingerprint size={48} className="text-white relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">HR Connect</h1>
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-[0.2em]">Platinum Hub</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input 
                className="w-full bg-white border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-700 placeholder:text-slate-300 font-bold shadow-sm"
                placeholder="ID Perusahaan"
                onChange={e => setForm({...form, company: e.target.value})}
              />
            </div>
            <div className="relative">
              <input 
                className="w-full bg-white border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-700 placeholder:text-slate-300 font-bold shadow-sm"
                placeholder="Nomor Induk Karyawan"
                onChange={e => setForm({...form, nik: e.target.value})}
              />
            </div>
            <div className="relative">
              <input 
                type="password"
                className="w-full bg-white border border-slate-100 p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-700 placeholder:text-slate-300 font-bold shadow-sm"
                placeholder="Kata Sandi"
                onChange={e => setForm({...form, pass: e.target.value})}
              />
            </div>
            <button 
              onClick={() => {
                if(!form.nik) return;
                const mock = { name: 'Raka Aliansyah', nik: form.nik, company: form.company, leave: 14, dept: 'Product Design' };
                setProfile(mock);
                localStorage.setItem('hr_session', JSON.stringify(mock));
                setView('home');
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all tracking-wider text-sm mt-6"
            >
              AUTENTIKASI SEKARANG
            </button>
          </div>
          
          <p className="mt-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">Build v3.1.0-Stable</p>
        </div>
      </div>
    );
  };

  const HomeView = () => (
    <div className="min-h-screen bg-[#FDFDFF] pb-24 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="bg-white px-7 pt-14 pb-20 rounded-b-[4rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full -mr-28 -mt-28 blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50 rounded-full -ml-10 -mb-10 blur-2xl opacity-40"></div>
        
        <div className="flex justify-between items-center relative z-10 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-indigo-200">
              {profile?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Dashboard</p>
              <h2 className="text-2xl font-black text-slate-900 leading-none">{profile?.name}</h2>
              <p className="text-indigo-600 text-xs font-bold mt-1.5 flex items-center gap-1.5 italic">
                <Briefcase size={12} strokeWidth={3} /> {profile?.dept}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
             <button className="relative p-4 bg-slate-50 rounded-[1.25rem] border border-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              <Bell size={20} />
              <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
            </button>
            <button onClick={() => { localStorage.clear(); setView('login'); }} className="p-4 bg-slate-50 rounded-[1.25rem] border border-slate-100 text-slate-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Info Card (Glass) */}
        <div className="absolute left-7 right-7 -bottom-8 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[2.5rem] p-7 shadow-2xl shadow-indigo-100 flex items-center justify-between text-white border-t border-white/10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-[1.75rem] backdrop-blur-xl flex items-center justify-center border border-white/20">
              <Calendar size={32} className="text-indigo-200" />
            </div>
            <div>
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Sisa Cuti Tahunan</p>
              <p className="text-3xl font-black tracking-tight">{profile?.leave} <span className="text-sm font-medium opacity-50 tracking-normal">Hari</span></p>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
            <ChevronRight size={24} className="text-white/60" />
          </div>
        </div>
      </div>

      {/* Grid Navigation */}
      <div className="mt-16 px-7 grid grid-cols-2 gap-5">
        {[
          { id: 'attendance', label: 'Attendance', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'leave', label: 'Cuti & Izin', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50' },
          { id: 'ot', label: 'Overtime', icon: Timer, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'permission', label: 'Izin Khusus', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { id: 'correction', label: 'Koreksi', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          { id: 'approval', label: 'Approval', icon: UserCheck, color: 'text-slate-600', bg: 'bg-slate-100' }
        ].map(menu => (
          <button 
            key={menu.id} 
            onClick={() => setView(menu.id)}
            className="bg-white p-7 rounded-[3rem] border border-slate-50 flex flex-col items-center gap-4 transition-all active:scale-[0.94] shadow-sm hover:shadow-md group"
          >
            <div className={`${menu.bg} ${menu.color} p-5 rounded-[1.75rem] group-hover:rotate-6 transition-transform duration-300`}>
              <menu.icon size={28} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-black text-slate-800 tracking-tight uppercase">{menu.label}</span>
          </button>
        ))}
      </div>

      {/* History Section */}
      <div className="px-7 mt-12">
        <div className="flex justify-between items-end mb-8">
          <div>
             <h3 className="text-xl font-black text-slate-900 tracking-tight">Riwayat Aktivitas</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Laporan Real-time</p>
          </div>
          <p className="text-indigo-600 text-xs font-black uppercase tracking-wider mb-1 cursor-pointer">Arsip</p>
        </div>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="bg-white rounded-[3rem] p-12 text-center border-2 border-dashed border-slate-100">
              <p className="text-slate-300 font-bold italic">Belum ada aktivitas tercatat...</p>
            </div>
          ) : (
            activities.slice(0, 5).map(act => (
              <div key={act.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 flex items-center justify-between shadow-sm hover:translate-x-1 transition-transform">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${
                    act.type.includes('IN') ? 'bg-emerald-50 text-emerald-600' : 
                    act.type.includes('OUT') ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {act.type.includes('IN') ? <CheckCircle2 size={24} /> : 
                     act.type.includes('OUT') ? <LogOut size={24} /> : <Calendar size={24} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{act.type}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {act.timestamp?.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • 
                      {act.timestamp?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border ${
                    act.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const FormHeader = ({ title }) => (
    <header className="bg-white/80 backdrop-blur-md px-7 py-7 border-b border-slate-100 flex items-center gap-5 sticky top-0 z-50">
      <button onClick={() => setView('home')} className="p-4 bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-transform">
        <ChevronLeft size={24} strokeWidth={3} />
      </button>
      <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
    </header>
  );

  const AttendanceView = () => (
    <div className="min-h-screen bg-[#FDFDFF] animate-in slide-in-from-right duration-500">
      <FormHeader title="Presensi Kehadiran" />
      <div className="p-7 flex flex-col gap-8">
        <div className="w-full bg-white p-10 rounded-[4rem] shadow-sm border border-slate-100 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"></div>
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center mb-8 rotate-6 group-hover:rotate-0 transition-transform duration-500">
            <MapPin size={40} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-3">Koordinat GPS Aktif</p>
          <p className="font-black text-slate-800 text-2xl tracking-tight mb-2">
            {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Mengambil Data..."}
          </p>
          <div className="inline-flex items-center gap-3 px-8 py-3 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
             <Navigation size={16} className="text-indigo-600 animate-pulse" />
             <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Jarak: <span className="text-indigo-600">{distance || '0'} m</span></span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check IN', { coords: location, dist: distance })}
            className="group relative bg-indigo-600 hover:bg-indigo-700 text-white p-10 rounded-[3.5rem] shadow-2xl shadow-indigo-100 flex items-center justify-between overflow-hidden transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <div className="relative z-10 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Mulai Shift</p>
              <h4 className="text-3xl font-black tracking-tight">ABSEN MASUK</h4>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/20"><CheckCircle2 size={40} /></div>
          </button>

          <button 
            disabled={!location || loading}
            onClick={() => submitActivity('Check OUT', { coords: location, dist: distance })}
            className="group relative bg-slate-900 hover:bg-black text-white p-10 rounded-[3.5rem] shadow-2xl shadow-slate-100 flex items-center justify-between overflow-hidden transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <div className="relative z-10 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Akhiri Shift</p>
              <h4 className="text-3xl font-black tracking-tight">ABSEN PULANG</h4>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10"><LogOut size={40} /></div>
          </button>
        </div>
      </div>
    </div>
  );

  const GenericForm = ({ title, icon: Icon, type, fields, colorClass, buttonColor }) => {
    const [formData, setFormData] = useState({});
    return (
      <div className="min-h-screen bg-[#FDFDFF] animate-in slide-in-from-right duration-500">
        <FormHeader title={title} />
        <div className="p-7">
          <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-50 space-y-8">
            <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
              <div className={`p-5 rounded-[2rem] ${colorClass} text-white shadow-xl`}><Icon size={32} /></div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Workflow Pengajuan</p>
                <p className="font-black text-2xl text-slate-800 tracking-tight">{title}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {fields.map(f => (
                <div key={f.name}>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-3 tracking-[0.2em]">{f.label}</label>
                  {f.type === 'select' ? (
                    <div className="relative">
                      <select 
                        className="w-full p-5 bg-slate-50 border border-slate-50 rounded-[1.75rem] outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm font-black text-slate-700 appearance-none"
                        onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                      >
                        {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" />
                    </div>
                  ) : f.type === 'textarea' ? (
                    <textarea 
                      className="w-full p-6 bg-slate-50 border border-slate-50 rounded-[1.75rem] outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm font-bold text-slate-600 h-40 resize-none placeholder:text-slate-300"
                      placeholder={f.placeholder}
                      onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                    />
                  ) : (
                    <input 
                      type={f.type}
                      className="w-full p-5 bg-slate-50 border border-slate-50 rounded-[1.75rem] outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-sm font-black text-slate-700"
                      onChange={e => setFormData({...formData, [f.name]: e.target.value})}
                    />
                  )}
                </div>
              ))}
              <button 
                onClick={() => submitActivity(type, formData)}
                className={`w-full ${buttonColor} text-white font-black py-6 rounded-[2.5rem] shadow-2xl transition-all active:scale-[0.97] mt-6 tracking-[0.2em] text-sm uppercase`}
              >
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white relative shadow-[0_0_100px_rgba(0,0,0,0.1)] overflow-x-hidden font-sans selection:bg-indigo-100">
      {statusMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[340px] px-4 animate-in fade-in slide-in-from-top-12 duration-500">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-[10px] font-black tracking-[0.2em] border backdrop-blur-lg ${
            statusMsg.type === 'success' ? 'bg-indigo-600/90 text-white border-indigo-400' : 
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
          title="Pengajuan Cuti" 
          icon={Calendar} 
          type="Leave" 
          colorClass="bg-rose-500"
          buttonColor="bg-rose-500 shadow-rose-100"
          fields={[
            { name: 'reason', label: 'Alasan Cuti', type: 'select', options: ['Sakit', 'Cuti Tahunan', 'Cuti Menikah', 'Keperluan Penting', 'Duka Cita'] },
            { name: 'start', label: 'Mulai Tanggal', type: 'date' },
            { name: 'end', label: 'Akhir Tanggal', type: 'date' },
            { name: 'note', label: 'Catatan Rinci', type: 'textarea', placeholder: 'Jelaskan alasan pengajuan Anda secara detail...' }
          ]}
        />
      )}

      {view === 'ot' && (
        <GenericForm 
          title="Lembur (Overtime)" 
          icon={Timer} 
          type="Overtime" 
          colorClass="bg-blue-600"
          buttonColor="bg-blue-600 shadow-blue-100"
          fields={[
            { name: 'category', label: 'Jenis Lembur', type: 'select', options: ['After Shift (OUT OT)', 'Before Shift (IN OT)', 'Hari Libur (Holiday)'] },
            { name: 'time_from', label: 'Waktu Mulai', type: 'time' },
            { name: 'time_to', label: 'Waktu Selesai', type: 'time' },
            { name: 'activity', label: 'Daftar Pekerjaan', type: 'textarea', placeholder: 'Apa saja yang dikerjakan saat lembur?' }
          ]}
        />
      )}

      {['permission', 'correction', 'approval'].includes(view) && (
        <div className="min-h-screen bg-[#FDFDFF]">
          <FormHeader title="Modul Pengembangan" />
          <div className="p-12 flex flex-col items-center justify-center text-center gap-8 mt-20">
            <div className="w-40 h-40 bg-slate-50 rounded-[4rem] flex items-center justify-center text-slate-200 relative">
               <div className="absolute inset-0 border-2 border-dashed border-slate-100 rounded-[4rem] animate-spin-slow"></div>
               <ClipboardList size={80} />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-2xl tracking-tight">Segera Hadir</h4>
              <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">Kami sedang mengoptimalkan fitur ini untuk memberikan pengalaman terbaik bagi Anda.</p>
            </div>
            <button onClick={() => setView('home')} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-xs tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">KEMBALI KE BERANDA</button>
          </div>
        </div>
      )}
    </div>
  );
}
