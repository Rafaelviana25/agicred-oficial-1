import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { UserProfile, Client, Contract } from '../types';
import { scheduleContractNotifications } from '../services/localNotifications';
import UpgradeModal from '../components/UpgradeModal';
import { BackupModal } from '../components/BackupModal';
import { 
  Users, 
  FileText, 
  Plus, 
  AlertCircle,
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  User,
  X,
  Crown,
  FileCheck,
  Calendar as CalendarIcon,
  Zap,
  Clock,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  Edit2,
  Save,
  ArrowRight,
  History,
  CheckCircle,
  Banknote,
  Percent,
  Wallet,
  Coins,
  RefreshCw,
  TrendingUp,
  Info,
  Timer,
  Database,
  Bell,
  Check,
  BarChart3,
  FileBarChart,
  Volume2,
  VolumeX,
  Smartphone,
  Search,
  Mail,
  Settings,
  Globe,
  Filter
} from 'lucide-react';

import { AgicredLogo } from '../components/AgicredLogo';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface DashboardProps {
  userProfile: UserProfile | null;
  onUpgradeSuccess: () => void;
}

const DatePickerPopup = ({ selectedDate, onDateSelect, onClose }: { selectedDate: string, onDateSelect: (date: string) => void, onClose: () => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate + 'T12:00:00'));
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="fixed modal-safe z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 w-[280px] animate-in fade-in zoom-in duration-200 uppercase font-black text-slate-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"><ChevronLeft size={16}/></button>
          <span className="text-[11px] font-black uppercase tracking-widest text-violet-600">{months[month]} {year}</span>
          <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"><ChevronRight size={16}/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {daysShort.map(d => <div key={d} className="text-[9px] text-slate-400 font-black tracking-wider">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <div key={i} className="h-8 flex items-center justify-center">
              {d && (
                <button 
                  type="button"
                  onClick={() => {
                    const newDate = new Date(year, month, d);
                    onDateSelect(newDate.toISOString().split('T')[0]);
                    onClose();
                  }}
                  className={`w-7 h-7 text-[10px] rounded-xl transition-all font-black ${new Date(selectedDate + 'T12:00:00').getDate() === d && new Date(selectedDate + 'T12:00:00').getMonth() === month ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  {d}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const OverdueNotification = ({ count, onClick, onClose }: { count: number, onClick: () => void, onClose: () => void }) => {
  const [width, setWidth] = useState(100);

  useEffect(() => {
    const widthTimer = setTimeout(() => setWidth(0), 50);
    const timer = setTimeout(onClose, 5000);

    return () => {
      clearTimeout(widthTimer);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <motion.div 
      initial={{ y: -100, x: '-50%', opacity: 0 }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      exit={{ y: -100, x: '-50%', opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed toast-safe left-1/2 z-[9999] w-[92%] max-w-sm"
    >
      <div 
        className="relative group cursor-pointer overflow-hidden rounded-3xl shadow-2xl border border-rose-400/30 bg-rose-600 p-5 flex items-center gap-4 active:scale-95 transition-transform"
        onClick={onClick}
      >
        {/* Background Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        
        <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <AlertTriangle size={36} className="text-white" strokeWidth={2.5} />
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1">
            ATENÇÃO!!!
          </h4>
          <p className="text-rose-100 text-[11px] font-bold leading-tight">
            {count === 1 ? (
              <>EXISTE <span className="text-white">1 CONTRATO VENCIDO</span>, CLIQUE PARA VISUALIZAR.</>
            ) : (
              <>EXISTEM <span className="text-white">{count} CONTRATOS VENCIDOS</span>, CLIQUE PARA VISUALIZA-LOS.</>
            )}
          </p>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-black/10 hover:bg-black/20 text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1.5 bg-rose-900/40 w-full">
          <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className="h-full bg-white"
          />
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ userProfile, onUpgradeSuccess }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'contracts' | 'overdue' | 'settled'>(() => {
    const hash = window.location.hash.replace('#', '');
    return ['overview', 'clients', 'contracts', 'overdue', 'settled'].includes(hash) ? hash as any : 'overview';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'clients', 'contracts', 'overdue', 'settled'].includes(hash)) {
        setActiveTab(hash as any);
      } else if (!hash) {
        setActiveTab('overview');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: 'overview' | 'clients' | 'contracts' | 'overdue' | 'settled') => {
    window.location.hash = tab;
    setActiveTab(tab);
  };
  const [showBackup, setShowBackup] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showOverdueNotification, setShowOverdueNotification] = useState(false);
  const [dismissedNotification, setDismissedNotification] = useState(false);

  useEffect(() => { if (userProfile) fetchData(); }, [userProfile]);

  const fetchData = async () => {
    const { data: clData } = await supabase.from('clients').select('*').eq('user_id', userProfile?.id).order('full_name', { ascending: true });
    const { data: coData } = await supabase.from('contracts').select('*').eq('user_id', userProfile?.id).order('created_at', { ascending: false });
    if (clData) setClients(clData || []);
    
    if (coData) {
        const mergedContracts = coData.map(c => {
            const localHistory = localStorage.getItem(`payment_history_${c.id}`);
            if (localHistory) {
                try {
                    const parsed = JSON.parse(localHistory);
                    // Merge local history with DB history (local takes precedence if DB is missing keys)
                    return { ...c, payment_history: { ...(c.payment_history || {}), ...parsed } };
                } catch (e) {
                    return c;
                }
            }
            return c;
        });
        setContracts(mergedContracts);
    }
    
    if (selectedContract) {
       const updated = coData?.find(c => c.id === selectedContract.id);
       if (updated) {
           // Also merge for selected contract
           const localHistory = localStorage.getItem(`payment_history_${updated.id}`);
           let finalUpdated = updated;
           if (localHistory) {
                try {
                    const parsed = JSON.parse(localHistory);
                    finalUpdated = { ...updated, payment_history: { ...(updated.payment_history || {}), ...parsed } };
                } catch (e) {}
           }
           setSelectedContract(finalUpdated);
       }
       else setSelectedContract(null);
    }
  };

  useEffect(() => {
    if (contracts.length > 0 && clients.length > 0) {
      scheduleContractNotifications(contracts, clients, userProfile?.pro_expires_at);
    }
  }, [contracts, clients, userProfile?.pro_expires_at]);

  const getInstallmentDueDate = (c: Contract, installmentIndex: number) => {
    const firstDueDate = new Date(c.end_date + 'T12:00:00');
    if (c.months > 1) {
      firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
    }
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + installmentIndex);
    return dueDate;
  };

  const getOverdueStatus = (c: Contract) => {
    if (c.status === 'paid') return null;
    
    const monthlyValue = Number(c.monthly_interest) || 0;
    if (monthlyValue <= 0) return null;

    const totalPaid = Number(c.paid_amount || 0);
    const installmentsFullyPaid = Math.floor(Math.round(totalPaid * 100) / Math.round(monthlyValue * 100));
    
    if (installmentsFullyPaid >= c.months) return null;

    // Vencimento da próxima parcela a ser paga
    const dueDate = getInstallmentDueDate(c, installmentsFullyPaid);
    
    const now = new Date();
    now.setHours(12, 0, 0, 0); 

    // Se a data atual for igual ou maior que a data de vencimento, está vencido
    if (now.getTime() >= dueDate.getTime()) {
      const diffTime = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return { 
        diffDays: daysOverdue, 
        referenceDate: dueDate, 
        installmentNumber: installmentsFullyPaid + 1 
      };
    }
    
    return null;
  };

  const overdueContracts = contracts.filter(c => getOverdueStatus(c) !== null);
  const settledContracts = contracts.filter(c => c.status === 'paid');

  useEffect(() => {
    if (overdueContracts.length > 0 && !dismissedNotification) {
      const timer = setTimeout(() => {
        setShowOverdueNotification(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowOverdueNotification(false);
    }
  }, [overdueContracts.length, dismissedNotification]);

  const handlePendingSaleClick = (contract: Contract) => {
    setSelectedContract(contract);
  };

  const handleOpenContractModal = (clientId?: string) => {
    setPreselectedClientId(clientId || null);
    setShowContractModal(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) {
      fetchData();
    }
  };

  const isPro = userProfile?.is_pro && (!userProfile.pro_expires_at || new Date(userProfile.pro_expires_at) > new Date());
  
  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "EXPIRADO";

    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));

    if (months > 0) {
      return `${months} MÊS${months > 1 ? 'ES' : ''} E ${days} DIA${days !== 1 ? 'S' : ''}`;
    }
    return `${days} DIA${days !== 1 ? 'S' : ''}`;
  };

  const clientLimit = isPro ? 999999 : 3;
  const canAddClient = isPro || clients.length < clientLimit;

  return (
    <div className="flex h-full overflow-hidden flex-col lg:flex-row uppercase font-bold text-slate-900">
      <AnimatePresence>
        {showOverdueNotification && (
          <OverdueNotification 
            count={overdueContracts.length} 
            onClick={() => {
              handleTabChange('overdue');
              setShowOverdueNotification(false);
              setDismissedNotification(true);
            }}
            onClose={() => {
              setShowOverdueNotification(false);
              setDismissedNotification(true);
            }}
          />
        )}
      </AnimatePresence>
      <aside className="w-56 xl:w-64 glass-panel border-r border-slate-200 hidden lg:flex flex-col text-slate-500 z-50">
        <div className="p-6 xl:p-8 flex flex-col gap-1">
          <AgicredLogo textClassName="text-xl xl:text-2xl text-slate-900" />
        </div>
        <nav className="flex-1 px-[15px] pt-[7px] pb-[15px] -mt-[19px] -ml-[1px] mr-[1px] -mb-[8px] space-y-1 xl:space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="INICIO" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
          <SidebarItem icon={<Users size={20} />} label="CLIENTES" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} />
          <SidebarItem icon={<AlertCircle size={20} />} label="VENCIDOS" active={activeTab === 'overdue'} onClick={() => handleTabChange('overdue')} />
          <SidebarItem icon={<FileText size={20} />} label="CONTRATOS" active={activeTab === 'contracts'} onClick={() => handleTabChange('contracts')} />
          <SidebarItem icon={<History size={20} />} label="LIQUIDADOS" active={activeTab === 'settled'} onClick={() => handleTabChange('settled')} />
          
          <button 
            onClick={handleOpenContractModal}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-[8px] font-black tracking-wider uppercase text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 hover:opacity-90"
          >
            <Plus size={20} />
            <span className="text-xs">NOVA OPERAÇÃO</span>
          </button>

          <button 
            onClick={() => setShowClientModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-[8px] font-black tracking-wider uppercase text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:opacity-90"
          >
            <Plus size={20} />
            <span className="text-xs">NOVO CLIENTE</span>
          </button>
        </nav>
        <div className="p-4 xl:p-6 mt-auto space-y-4">
          <div className={`px-3 py-1.5 xl:py-2.5 rounded-lg flex flex-col items-center justify-center gap-1 ${isPro ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <div className="flex items-center gap-2">
              {isPro ? <Crown size={14} className="fill-violet-700" /> : <User size={14} />}
              <span className="text-[10px] xl:text-xs font-black tracking-widest uppercase">{isPro ? 'CONTA PRO' : 'CONTA GRÁTIS'}</span>
            </div>
            {isPro && userProfile?.pro_expires_at && (
              <div className="text-[8px] xl:text-[10px] text-center w-full mt-1 border-t border-violet-200 pt-1">
                <p>INÍCIO: {userProfile.pro_started_at ? new Date(userProfile.pro_started_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                <p>TÉRMINO: {new Date(userProfile.pro_expires_at).toLocaleDateString('pt-BR')}</p>
                <p className="font-black text-black">RESTAM: {getRemainingTime(userProfile.pro_expires_at)}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full bg-slate-50">
        <header className="px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 z-40 relative">
          <div className="flex items-center gap-4">
            <AgicredLogo className="lg:hidden" textClassName="text-xl text-slate-900" />
          </div>
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 group">
            <div className="text-right flex flex-col items-end">
              <p className="text-[14px] font-black text-slate-900 uppercase leading-none flex items-center gap-1">
                {userProfile?.full_name?.split(' ')[0]}
                {isPro && <Crown size={12} className="text-violet-600 fill-violet-600 ml-[7px] w-[12px] h-[12px]" />}
              </p>
              <p className={`text-[11px] leading-[11.5px] font-black tracking-widest uppercase mt-1 ${isPro ? 'text-violet-600' : 'text-emerald-600'}`}>{isPro ? 'CONTA PRO' : 'CONTA GRÁTIS'}</p>
            </div>
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-sm ${isPro ? 'bg-violet-50 border-violet-200 text-violet-600' : 'bg-white border-slate-200 text-slate-600'}`}>
              <User size={16} />
            </div>
          </button>
        </header>

        {!isPro && activeTab === 'overview' && (
          <button 
            onClick={() => setShowUpgrade(true)}
            className="w-full primary-gradient text-white py-2 flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all z-30 relative border-b border-violet-400/20"
          >
            <Crown size={14} className="text-white fill-white" />
            <span className="text-[9px] font-black tracking-[0.3em]">Ativar conta PRO</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto pb-32 pt-0 no-scrollbar">
           {activeTab === 'overview' ? (
             <OverviewView 
               contracts={contracts} 
               clients={clients} 
               handleTabChange={handleTabChange} 
               onAddClient={() => {
                 if (canAddClient) {
                   setShowClientModal(true);
                 } else {
                   setShowUpgrade(true);
                 }
               }}
               onAddContract={() => {
                 handleOpenContractModal();
               }}
               onSelectContract={handlePendingSaleClick}
             />
             ) : (
              <div className="max-w-7xl mx-auto px-3 lg:px-8 pt-6 space-y-6">
                {activeTab === 'clients' && (
                  <>
                    {!canAddClient && (
                      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 lg:p-6 shadow-lg text-white relative overflow-hidden mb-6">
                        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                          <Crown size={100} />
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-base lg:text-lg font-black tracking-tight mb-2 flex items-center gap-2"><Crown size={20} className="fill-white"/> Limite atingido</h3>
                          <p className="text-[11px] lg:text-xs font-medium opacity-90 mb-4 leading-relaxed max-w-2xl">
                            Você atingiu o limite de 3 clientes do plano grátis. Faça o upgrade para adicionar mais clientes e ter acesso ilimitado ao sistema Agicred.
                          </p>
                          <button onClick={() => setShowUpgrade(true)} className="bg-white text-violet-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-violet-50 transition-all active:scale-95 flex items-center gap-2">
                            Quero ser PRO <ArrowRight size={16}/>
                          </button>
                        </div>
                      </div>
                    )}
                    <ClientsSection 
                      clients={clients
                        .filter(c => c.full_name.toUpperCase().startsWith(clientSearch.toUpperCase()))
                        .sort((a, b) => a.full_name.localeCompare(b.full_name))
                      } 
                      searchValue={clientSearch}
                      onSearchChange={setClientSearch}
                      onAdd={() => {
                        if (canAddClient) {
                          setShowClientModal(true);
                        } else {
                          setShowUpgrade(true);
                        }
                      }} 
                      onSelect={setSelectedClient} 
                      onDelete={handleDeleteClient} 
                      canAdd={canAddClient}
                    />
                    <button
                      onClick={() => {
                        if (canAddClient) {
                          setShowClientModal(true);
                        } else {
                          setShowUpgrade(true);
                        }
                      }}
                      className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-14 h-14 lg:w-16 lg:h-16 bg-violet-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-violet-700 transition-all active:scale-95 z-50 hover:rotate-90"
                    >
                      <Plus size={28} />
                    </button>
                  </>
                )}
                {activeTab === 'contracts' && (
                  <>
                    <ContractsSection 
                      contracts={contracts} 
                      clients={clients} 
                      onSelectContract={setSelectedContract} 
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      currentYear={currentYear}
                      setCurrentYear={setCurrentYear}
                    />
                    <button
                      onClick={handleOpenContractModal}
                      className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-14 h-14 lg:w-16 lg:h-16 bg-violet-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-violet-700 transition-all active:scale-95 z-50 hover:rotate-90"
                    >
                      <Plus size={28} />
                    </button>
                  </>
                )}
                {activeTab === 'overdue' && <OverdueSection contracts={overdueContracts} clients={clients} onSelectContract={setSelectedContract} getOverdueStatus={getOverdueStatus} />}
                {activeTab === 'settled' && <SettledSection settledContracts={settledContracts} clients={clients} onSelectContract={setSelectedContract} />}
             </div>
           )}
        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-3 pb-[38px] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
           <MobileTab label="INICIO" active={activeTab === 'overview'} onClick={() => handleTabChange('overview')} icon={<LayoutDashboard size={26}/>} />
           <MobileTab label="CLIENTES" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} icon={<Users size={26}/>} />
           <MobileTab label="CONTRATOS" active={activeTab === 'contracts'} onClick={() => handleTabChange('contracts')} icon={<FileText size={26}/>} />
           <MobileTab label="LIQUIDADOS" active={activeTab === 'settled'} onClick={() => handleTabChange('settled')} icon={<History size={26}/>} />
           <MobileTab label="VENCIDOS" active={activeTab === 'overdue'} onClick={() => handleTabChange('overdue')} icon={<AlertCircle size={26}/>} hasBadge={overdueContracts.length > 0} className="p-0 mx-0 mt-0" />
        </nav>
      </main>

      {showClientModal && userProfile && <ClientModal userId={userProfile.id} onClose={() => setShowClientModal(false)} onSuccess={fetchData} />}
      {showContractModal && userProfile && <ContractModal userId={userProfile.id} clients={clients} onClose={() => { setShowContractModal(false); setPreselectedClientId(null); }} onSuccess={fetchData} initialClientId={preselectedClientId} />}
      {selectedClient && (
        <ClientDetailsModal 
          client={selectedClient} 
          contracts={contracts.filter(c => c.client_id === selectedClient.id)} 
          onClose={() => setSelectedClient(null)} 
          onSuccess={fetchData} 
          onSelectContract={(c: Contract) => {
            setSelectedContract(c);
          }}
          onAddContract={(clientId: string) => {
            handleOpenContractModal(clientId);
          }}
        />
      )}
      {selectedContract && <ContractDetailsModal contract={selectedContract} client={clients.find(c => c.id === selectedContract.client_id)} onClose={() => setSelectedContract(null)} onSuccess={fetchData} />}
      {showProfile && userProfile && <UserProfileModal user={userProfile} contracts={contracts} clients={clients} onClose={() => setShowProfile(false)} onUpgradeRequest={() => { setShowUpgrade(true); }} onBackupRequest={() => { setShowBackup(true); }} onRefresh={onUpgradeSuccess} />}
      {showUpgrade && userProfile && <UpgradeModal user={userProfile} onClose={() => setShowUpgrade(false)} onSuccess={() => { fetchData(); onUpgradeSuccess(); }} />}
      {showBackup && userProfile && <BackupModal userId={userProfile.id} onClose={() => setShowBackup(false)} />}
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-[8px] font-black tracking-wider uppercase ${active ? 'bg-slate-100 text-violet-600 shadow-sm border border-slate-200' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}>
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);

const MobileTab = ({ icon, label, active, onClick, hasBadge, className = "" }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all outline-none mb-[-21px] ${active ? 'text-violet-600' : 'text-slate-400'} ${className}`}>
    <div className="relative flex items-center justify-center">
      {icon}
      {hasBadge && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>}
    </div>
    <span className={`text-[9px] font-black tracking-widest uppercase transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const SummaryModal = ({ category, contracts, clients, onClose }: any) => {
  if (!category) return null;

  let title = '';
  let colorClass = '';
  let data: { clientName: string, value: number }[] = [];

  const clientTotals: Record<string, number> = {};

  contracts.forEach((c: any) => {
    const clientId = c.client_id;
    let value = 0;

    switch (category) {
      case 'loaned':
        value = Number(c.capital) || 0;
        break;
      case 'capitalToReceive':
        value = (Number(c.capital) || 0) - (c.status === 'paid' ? (Number(c.capital) || 0) : 0);
        break;
      case 'interestReceived':
        value = c.status === 'paid' ? (Number(c.total_interest) || 0) : (Number(c.paid_amount) || 0);
        break;
      case 'interestToReceive':
        value = (Number(c.total_interest) || 0) - (c.status === 'paid' ? (Number(c.total_interest) || 0) : (Number(c.paid_amount) || 0));
        break;
    }

    if (value > 0) {
      clientTotals[clientId] = (clientTotals[clientId] || 0) + value;
    }
  });

  data = Object.entries(clientTotals).map(([clientId, value]) => {
    const client = clients.find((cl: any) => cl.id === clientId);
    return {
      clientName: client?.full_name || 'CLIENTE DESCONHECIDO',
      value
    };
  }).sort((a, b) => b.value - a.value);

  switch (category) {
    case 'loaned':
      title = 'CAPITAL EMPRESTADO';
      colorClass = 'text-rose-600';
      break;
    case 'capitalToReceive':
      title = 'CAPITAL A RECEBER';
      colorClass = 'text-blue-600';
      break;
    case 'interestReceived':
      title = 'JUROS JÁ RECEBIDOS';
      colorClass = 'text-emerald-600';
      break;
    case 'interestToReceive':
      title = 'JUROS A RECEBER';
      colorClass = 'text-violet-600';
      break;
  }

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 pt-0 lg:pt-10 z-[110] overflow-y-auto uppercase font-black text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-5 lg:p-6 space-y-4 animate-in shadow-2xl relative min-h-[450px] border border-slate-200 bg-white flex flex-col">
        <div className="flex justify-between items-center mb-2 px-1">
           <h3 className={`text-sm font-black uppercase tracking-tighter ${colorClass}`}>{title}</h3>
           <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all active:scale-90"><X size={18}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {data.length > 0 ? data.map((item, idx) => (
            <div key={idx} className="glass-panel p-3 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50">
               <span className="text-[10px] font-black text-slate-700 truncate pr-2">{item.clientName}</span>
               <span className={`text-[12px] font-black shrink-0 ${colorClass}`}>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )) : (
            <div className="p-6 text-center"><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">NENHUM REGISTRO</p></div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-center px-1 mt-auto">
           <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">TOTAL</span>
           <span className={`text-[16px] font-black tracking-tighter ${colorClass}`}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

const OverviewView = ({ contracts, clients, handleTabChange, onAddClient, onAddContract, onSelectContract }: any) => {
  const [selectedSummaryCategory, setSelectedSummaryCategory] = useState<'loaned' | 'capitalToReceive' | 'interestReceived' | 'interestToReceive' | null>(null);
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const monthsNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getContractMonthInfo = (c: any) => {
    const firstDueDate = new Date(c.end_date + 'T12:00:00');
    if (c.months > 1) {
      firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
    }

    for (let i = 0; i < c.months; i++) {
       const dueDate = new Date(firstDueDate);
       dueDate.setMonth(dueDate.getMonth() + i);
       if (dueDate.getMonth() === currentMonthIdx && dueDate.getFullYear() === currentYear) {
          const installmentValue = Number(c.monthly_interest) || 0;
          const paidAmount = Number(c.paid_amount) || 0;
          const isThisInstallmentPaid = paidAmount >= ((i + 1) * installmentValue);
          return { dueDate, isThisInstallmentPaid, installmentIndex: i };
       }
    }
    return null;
  };

  const activeInMonth = contracts.filter((c: any) => {
    if (c.status === 'paid') return false;
    const info = getContractMonthInfo(c);
    return info && !info.isThisInstallmentPaid;
  }).map((c: any) => ({ ...c, displayDate: getContractMonthInfo(c)?.dueDate }));

  const paidInMonth = contracts.filter((c: any) => {
    if (c.status === 'paid') {
      const endDate = new Date(c.end_date + 'T12:00:00');
      return endDate.getMonth() === currentMonthIdx && endDate.getFullYear() === currentYear;
    }
    const info = getContractMonthInfo(c);
    return info && info.isThisInstallmentPaid;
  }).map((c: any) => {
    const info = getContractMonthInfo(c);
    let displayDate = info?.dueDate || new Date(c.end_date + 'T12:00:00');
    
    if (info && c.payment_history && c.payment_history[info.installmentIndex]) {
        displayDate = new Date(c.payment_history[info.installmentIndex] + 'T12:00:00');
    }
    
    return { ...c, displayDate };
  });

  const totalPaidInMonth = paidInMonth.reduce((acc: number, c: any) => {
    if (c.status === 'paid') return acc + (Number(c.total_amount) || 0);
    return acc + (Number(c.monthly_interest) || 0);
  }, 0);
  const totalPendingInMonth = activeInMonth.reduce((acc: number, c: any) => acc + (Number(c.monthly_interest) || 0), 0);
  const totalLoaned = contracts.reduce((acc: number, c: any) => acc + (Number(c.capital) || 0), 0);
  
  // JUROS JÁ RECEBIDOS
  const totalInterestReceived = contracts.reduce((acc: number, c: any) => {
    if (c.status === 'paid') {
      return acc + (Number(c.total_interest) || 0);
    }
    return acc + (Number(c.paid_amount) || 0);
  }, 0);

  // CAPITAL JÁ RECEBIDO
  const totalCapitalReceived = contracts.reduce((acc: number, c: any) => {
    if (c.status === 'paid') {
      return acc + (Number(c.capital) || 0);
    }
    return acc + 0;
  }, 0);

  const totalInterestGenerated = contracts.reduce((acc: number, c: any) => acc + (Number(c.total_interest) || 0), 0);
  
  // CAPITAL A RECEBER = (capital emprestado) - (capital recebido)
  const totalToReceive = totalLoaned - totalCapitalReceived;
  
  // JUROS A RECEBER
  const totalInterestToReceive = totalInterestGenerated - totalInterestReceived;

  return (
    <div className="animate-in fade-in duration-500 uppercase font-black text-slate-900 pb-12">
      {selectedSummaryCategory && (
        <SummaryModal 
          category={selectedSummaryCategory} 
          contracts={contracts} 
          clients={clients} 
          onClose={() => setSelectedSummaryCategory(null)} 
        />
      )}
      <div className="px-3 pt-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4">
          <div onClick={() => setSelectedSummaryCategory('loaned')} className="glass-panel pt-3 pb-5 px-4 rounded-2xl border-2 border-rose-500 transition-all hover:bg-slate-50 flex flex-col justify-center text-center shadow-sm cursor-pointer active:scale-95">
            <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2 -mt-1 truncate">CAPITAL EMPRESTADO</p>
            <h4 className="text-[16px] md:text-[20px] lg:text-[26px] font-black text-rose-500 tracking-tight leading-none truncate">
              R$ {totalLoaned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div onClick={() => setSelectedSummaryCategory('capitalToReceive')} className="glass-panel pt-3 pb-5 px-4 rounded-2xl border-2 border-blue-500 transition-all hover:bg-slate-50 flex flex-col justify-center text-center shadow-sm cursor-pointer active:scale-95">
            <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2 -mt-1 truncate">CAPITAL A RECEBER</p>
            <h4 className="text-[16px] md:text-[20px] lg:text-[26px] font-black text-blue-500 tracking-tight leading-none truncate">
              R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div onClick={() => setSelectedSummaryCategory('interestReceived')} className="glass-panel pt-3 pb-5 px-4 rounded-2xl border-2 border-emerald-500 transition-all hover:bg-slate-50 flex flex-col justify-center text-center shadow-sm cursor-pointer active:scale-95">
            <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2 -mt-1 truncate">JUROS JÁ RECEBIDOS</p>
            <h4 className="text-[16px] md:text-[20px] lg:text-[26px] font-black text-emerald-500 tracking-tight leading-none truncate">
              R$ {totalInterestReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div onClick={() => setSelectedSummaryCategory('interestToReceive')} className="glass-panel pt-3 pb-5 px-4 rounded-2xl border-2 border-violet-500 transition-all hover:bg-slate-50 flex flex-col justify-center text-center shadow-sm cursor-pointer active:scale-95">
            <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2 -mt-1 truncate">JUROS A RECEBER</p>
            <h4 className="text-[16px] md:text-[20px] lg:text-[26px] font-black text-violet-500 tracking-tight leading-none truncate">
              R$ {totalInterestToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>
      </div>

      <div className="py-8 px-6 grid grid-cols-2 gap-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2 -mt-[20px] mx-0">
          <p className="text-slate-500 text-[10px] lg:text-xs font-black tracking-[0.2em] uppercase">PAGOS ESTE MÊS</p>
          <h2 className="text-2xl lg:text-4xl font-black text-emerald-500 tracking-tighter flex items-center justify-center">
            <span className="text-sm lg:text-lg mr-1 font-bold text-emerald-500">R$</span>
            {totalPaidInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="text-center space-y-2 -mt-[20px] ml-0">
          <p className="text-slate-500 text-[10px] lg:text-xs font-black tracking-[0.2em] uppercase">PENDENTE ESTE MÊS</p>
          <h2 className="text-2xl lg:text-4xl font-black text-rose-500 tracking-tighter flex items-center justify-center">
            <span className="text-sm lg:text-lg mr-1 font-bold text-rose-500">R$</span>
            {totalPendingInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      <div className="px-5 space-y-6 max-w-7xl mx-auto pb-24">
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <button onClick={onAddContract} className="primary-gradient text-white py-4 lg:py-5 rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all hover:shadow-violet-500/25">
            <Plus size={18} /> <span className="text-[9px] lg:text-xs font-black uppercase tracking-widest">NOVO CONTRATO</span>
          </button>
          <button onClick={onAddClient} className="bg-emerald-500 text-white py-4 lg:py-5 rounded-full flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-emerald-600">
            <Users size={18} className="text-white" /> <span className="text-[9px] lg:text-xs font-black uppercase tracking-widest">NOVO CLIENTE</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200">
            <div className="px-[20px] pt-[7px] pb-[10px] border-b border-slate-200 flex justify-between items-center bg-slate-50/50 mx-0">
              <h3 className="text-rose-500 text-[12px] lg:text-sm font-black tracking-tighter uppercase">
                CONTRATOS PENDENTES - <span className="text-slate-900">{monthsNames[currentMonthIdx].toUpperCase()}</span>
              </h3>
              <span className="text-[10px] lg:text-xs bg-rose-500/10 text-rose-500 px-3 py-1 rounded-full font-black border border-rose-500/20">{activeInMonth.length}</span>
            </div>
            <div className="divide-y divide-slate-200">
              {activeInMonth.length > 0 ? activeInMonth.slice(0, 10).map((c: any) => (
                <ContractListItem key={c.id} c={c} clientName={clients.find((cl: any) => cl.id === c.client_id)?.full_name} onSelect={onSelectContract} colorClass="text-rose-500" displayDate={c.displayDate} />
              )) : (
                <div className="py-12 text-center"><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">SEM VENDAS PARA ESTE MÊS</p></div>
              )}
            </div>
            <button onClick={() => handleTabChange('contracts')} className="w-full bg-slate-50 pt-[10px] pb-[16px] -mb-[9px] mt-0 ml-0 mr-0 text-slate-600 font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] border-t border-slate-200 hover:bg-slate-100 transition-colors">VER TODAS AS VENDAS</button>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200">
            <div className="px-[20px] pt-[7px] pb-[10px] border-b border-slate-200 flex justify-between items-center bg-slate-50/50 mx-0">
              <h3 className="text-emerald-500 text-[12px] lg:text-sm font-black tracking-tighter uppercase">
                CONTRATOS PAGOS - <span className="text-slate-900">{monthsNames[currentMonthIdx].toUpperCase()}</span>
              </h3>
              <span className="text-[10px] lg:text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-black border border-emerald-500/20">{paidInMonth.length}</span>
            </div>
            <div className="divide-y divide-slate-200">
              {paidInMonth.length > 0 ? paidInMonth.slice(0, 10).map((c: any) => (
                <ContractListItem key={c.id} c={c} clientName={clients.find((cl: any) => cl.id === c.client_id)?.full_name} onSelect={onSelectContract} colorClass="text-emerald-500" isPaid={true} displayDate={c.displayDate} />
              )) : (
                <div className="py-12 text-center"><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">NENHUM RECEBIMENTO ESTE MÊS</p></div>
              )}
            </div>
            <button onClick={() => handleTabChange('settled')} className="w-full bg-slate-50 pt-[10px] pb-[16px] -mb-[9px] mt-0 ml-0 mr-0 text-slate-600 font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] border-t border-slate-200 hover:bg-slate-100 transition-colors">VER HISTÓRICO DE PAGOS</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContractListItem: React.FC<{ c: any; clientName?: string; onSelect: (c: any) => void; colorClass: string, isPaid?: boolean, displayDate?: Date }> = ({ c, clientName, onSelect, colorClass, isPaid, displayDate }) => {
  const valueToShow = Number((isPaid && c.status === 'paid') ? c.total_amount : c.monthly_interest) || 0;
  return (
    <div onClick={() => onSelect(c)} className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between mb-1.5 pl-0 text-[20px]">
        <span className="text-[12px] font-black text-slate-900 uppercase truncate max-w-[190px] group-hover:text-violet-600 transition-colors">
          {isPaid && <CheckCircle size={9} className="inline mr-1.5 text-emerald-500"/>}
          {clientName}
        </span>
        <p className={`text-[13px] font-black ${colorClass}`}>R$ {valueToShow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="flex justify-between items-center">
         <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <CalendarIcon size={9}/> {displayDate ? displayDate.toLocaleDateString('pt-BR') : new Date(c.end_date + 'T12:00:00').toLocaleDateString()}
         </div>
         <span className={`text-[10px] font-black group-hover:underline ${isPaid ? 'text-black' : 'text-violet-600'}`}>
            {isPaid ? 'LIQUIDADO' : 'VER DETALHES'}
         </span>
      </div>
    </div>
  );
};

const ClientsSection = ({ clients, onAdd, onSelect, onDelete, searchValue, onSearchChange }: any) => (
  <div className="space-y-3 animate-in fade-in duration-500 uppercase font-black text-slate-900">
    <div className="bg-slate-50/95 backdrop-blur-sm flex items-center justify-between gap-4 px-5 mt-[-9px] mb-0 pt-[6px] pb-[9px] mx-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col shrink-0">
          <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tighter">CLIENTES CADASTRADOS</h3>
          <span className="text-[9px] text-violet-600 font-black tracking-widest uppercase">{clients.length} CLIENTES</span>
        </div>
        
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="PESQUISAR..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-violet-500 transition-all"
          />
          {searchValue && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {clients.map((c: Client) => (
        <div key={c.id} onClick={() => onSelect(c)} className="glass-panel p-3 rounded-xl shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-all cursor-pointer border border-slate-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0"><User size={16} /></div>
            <div className="overflow-hidden">
              <h4 className="font-black text-slate-900 text-[11px] uppercase leading-tight truncate group-hover:text-violet-600 transition-colors">{c.full_name}</h4>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5 truncate">{c.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={12} className="text-slate-400" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SettledSection = ({ settledContracts, clients, onSelectContract }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('date-desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'date-desc', label: 'DATA MAIS RECENTE' },
    { value: 'date-asc', label: 'DATA MAIS ANTIGA' },
    { value: 'name-asc', label: 'NOME (A-Z)' },
    { value: 'name-desc', label: 'NOME (Z-A)' },
    { value: 'value-desc', label: 'VALOR MAIOR' },
    { value: 'value-asc', label: 'VALOR MENOR' },
  ];

  const filteredAndSortedContracts = [...settledContracts]
    .filter((c: any) => {
      const client = clients.find((cl: any) => cl.id === c.client_id);
      const searchLower = searchTerm.toLowerCase();
      const clientName = client?.full_name?.toLowerCase() || '';
      const amountStr = c.total_amount.toString();
      const dateStr = new Date(c.end_date + 'T12:00:00').toLocaleDateString();
      
      return clientName.includes(searchLower) || amountStr.includes(searchLower) || dateStr.includes(searchLower);
    })
    .sort((a: any, b: any) => {
      const clientA = clients.find((cl: any) => cl.id === a.client_id)?.full_name || '';
      const clientB = clients.find((cl: any) => cl.id === b.client_id)?.full_name || '';
      
      switch (sortOption) {
        case 'name-asc': return clientA.localeCompare(clientB);
        case 'name-desc': return clientB.localeCompare(clientA);
        case 'date-desc': return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
        case 'date-asc': return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        case 'value-desc': return b.total_amount - a.total_amount;
        case 'value-asc': return a.total_amount - b.total_amount;
        default: return 0;
      }
    });

  return (
  <div className="space-y-2 lg:space-y-3 animate-in fade-in duration-500 uppercase font-black text-slate-900 pb-20 w-full">
    <div className="bg-slate-50/95 backdrop-blur-sm flex justify-between items-center pl-[-2px] pr-[5px] mb-[7px] mr-[2px] ml-[-2px] pb-0 mt-[-28px] h-6">
      <h3 className="text-[12px] lg:text-sm font-black text-emerald-600 uppercase tracking-tighter leading-[11px] pl-[5px]">LIQUIDADOS</h3>
      <span className="text-[10px] lg:text-xs text-emerald-600 font-black tracking-widest leading-[11px] pl-[2px]">{settledContracts.length} TÍTULOS</span>
    </div>

    <div className="flex flex-row gap-2 mb-0 mt-[7px] pr-[4px] pl-0 h-[34px]">
      <div className="relative w-[43px] h-[35px] mt-[-1px] mb-0 ml-0 flex items-center justify-center bg-white border border-slate-200 rounded-xl shrink-0" ref={filterRef}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full h-full flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
        >
          <Filter className="h-4 w-4" />
        </button>
        
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden"
            >
              <div className="py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortOption(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-colors ${
                      sortOption === option.value 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder=""
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all uppercase tracking-widest"
        />
      </div>
    </div>

    <div className="flex flex-col gap-1.5 lg:gap-3">
      {filteredAndSortedContracts.map((c: any) => {
        const client = clients.find((cl: any) => cl.id === c.client_id);
        return (
          <div 
            key={c.id} 
            onClick={() => onSelectContract(c)}
            className="glass-panel px-3 py-3 lg:px-6 lg:py-5 rounded-2xl shadow-sm border-emerald-200 flex items-center justify-between group hover:bg-slate-50 transition-all border-l-4 border-l-emerald-500 cursor-pointer overflow-hidden relative"
          >
             <div className="flex-1 min-w-0 pr-2 lg:pr-4">
                <div className="flex items-center gap-1.5 lg:gap-2">
                   <h4 className="text-[11px] lg:text-sm font-black text-slate-900 uppercase tracking-tighter truncate group-hover:text-emerald-600 transition-colors leading-none">{client?.full_name}</h4>
                   <div className="w-4 h-4 lg:w-5 lg:h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                   </div>
                </div>
                <div className="mt-1.5 lg:mt-2 flex items-center gap-2 lg:gap-3">
                   <p className="text-[8px] lg:text-[10px] text-slate-500 uppercase font-black tracking-widest">PAGO EM {new Date(c.end_date + 'T12:00:00').toLocaleDateString()}</p>
                   <span className="text-slate-400">|</span>
                   <p className="text-[8px] lg:text-[10px] text-slate-500 font-black uppercase tracking-widest">TÍTULO LIQUIDADO</p>
                </div>
             </div>
             
             <div className="flex flex-col items-end shrink-0">
                <p className="text-[12px] lg:text-base font-black text-slate-900 tracking-tighter leading-none">R$ {c.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <span className="text-[8px] lg:text-[10px] text-emerald-600 font-black mt-1.5 lg:mt-2 uppercase group-hover:underline">VER RECIBO</span>
             </div>
          </div>
        );
      })}
    </div>
  </div>
);
};

const ContractsSection = ({ contracts, clients, onSelectContract, currentMonth, setCurrentMonth, currentYear, setCurrentYear }: any) => {
  const monthsAbbr = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  
  const filteredContractsWithInfo = contracts.filter((c: Contract) => {
    const firstDueDate = new Date(c.end_date + 'T12:00:00');
    if (c.months > 1) {
      firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
    }
    for (let i = 0; i < c.months; i++) {
       const dueDate = new Date(firstDueDate);
       dueDate.setMonth(dueDate.getMonth() + i);
       if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          return true;
       }
    }
    return false;
  }).map((c: Contract) => {
    let activeInstallment = 0;
    let dueDateThisMonth = '';
    const firstDueDate = new Date(c.end_date + 'T12:00:00');
    if (c.months > 1) {
      firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
    }
    for (let i = 0; i < c.months; i++) {
       const d = new Date(firstDueDate);
       d.setMonth(d.getMonth() + i);
       if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          activeInstallment = i + 1;
          dueDateThisMonth = d.toLocaleDateString('pt-BR');
          break;
       }
    }
    const installmentValue = Number(c.monthly_interest) || 0;
    const paidAmount = Number(c.paid_amount) || 0;
    const isThisInstallmentPaid = paidAmount >= (activeInstallment * installmentValue);
    
    return { ...c, activeInstallment, dueDateThisMonth, isThisInstallmentPaid };
  });

  return (
    <div className="space-y-3 animate-in fade-in duration-500 uppercase font-black pb-10 text-slate-900">
      <div className="glass-panel pt-3.5 px-3.5 pb-[9px] rounded-3xl shadow-sm mx-auto w-full mt-[-25px]">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">LISTAGEM DE TÍTULOS</h3>
          <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-xl">
             <button onClick={() => setCurrentYear(currentYear - 1)} className="p-0.5 hover:bg-slate-200 rounded transition-all text-slate-500 hover:text-slate-900"><ChevronLeft size={14} /></button>
             <span className="text-[12px] font-black text-slate-900 tracking-widest min-w-[32px] text-center">{currentYear}</span>
             <button onClick={() => setCurrentYear(currentYear + 1)} className="p-0.5 hover:bg-slate-200 rounded transition-all text-slate-500 hover:text-slate-900"><ChevronRight size={14} /></button>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-1 w-full overflow-hidden h-[43px] pr-[1px]">
          {monthsAbbr.map((m, idx) => (
            <button 
              key={m}
              onClick={() => setCurrentMonth(idx)}
              className={`flex-1 h-10 flex items-center justify-center rounded-xl text-[9px] font-black transition-all border uppercase ${currentMonth === idx ? 'bg-violet-600 text-white border-violet-600 shadow-lg scale-105 z-10' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200 hover:bg-slate-100'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-[6px] pt-3 border-t border-slate-200 flex flex-col gap-2 px-1">
          {(() => {
            let totalMesAReceber = 0;
            let parcelasRecebidas = 0;
            let capitalRecebido = 0;

            filteredContractsWithInfo.forEach((c: any) => {
              const monthlyInterest = Number(c.monthly_interest) || 0;
              totalMesAReceber += monthlyInterest;

              if (c.status === 'paid' || c.isThisInstallmentPaid) {
                parcelasRecebidas += monthlyInterest;
              }

              const paidAmt = Number(c.paid_amount) || 0;
              const totalInt = Number(c.total_interest) || 0;
              capitalRecebido += Math.max(0, paidAmt - totalInt);
            });

            const totalMesRecebido = parcelasRecebidas + capitalRecebido;

            return (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-black tracking-widest uppercase">TOTAL DO MÊS A RECEBER</span>
                  <span className="text-[12px] font-black text-slate-900 tracking-tighter">
                    R$ {totalMesAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-emerald-600 font-black tracking-widest uppercase">TOTAL DO MÊS RECEBIDO</span>
                  <span className="text-[12px] font-black text-emerald-600 tracking-tighter mb-[-6px]">
                    R$ {totalMesRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col items-end mt-1 space-y-1">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">PARCELAS</span>
                      <span className="text-[11px] font-black text-slate-700 w-[75px] text-right">R$ {parcelasRecebidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">CAPITAL</span>
                      <span className="text-[11px] font-black text-slate-700 w-[75px] text-right mb-0">R$ {capitalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="space-y-2 pt-1">
         {filteredContractsWithInfo.map((c: any) => {
           const client = clients.find((cl: any) => cl.id === c.client_id);
           const isSettled = c.status === 'paid' || c.isThisInstallmentPaid;
           
           return (
             <div 
               key={c.id} 
               onClick={() => onSelectContract(c)}
               className="glass-panel px-5 py-4 rounded-2xl shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-all cursor-pointer border border-slate-200"
             >
                <div className="flex items-center gap-3.5 overflow-hidden">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isSettled ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {isSettled ? <CheckCircle size={20}/> : <User size={20}/>}
                   </div>
                   <div className="overflow-hidden">
                      <h4 className={`font-black text-[11px] uppercase leading-tight truncate ${isSettled ? 'text-slate-500' : 'text-slate-900'}`}>{client?.full_name || 'CLIENTE'}</h4>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">PARC. {c.activeInstallment}/{c.months}</p>
                   </div>
                </div>
                <div className="text-right shrink-0 ml-4 leading-tight">
                   <p className={`text-[12px] font-black ${isSettled ? 'text-slate-500' : 'text-slate-900'}`}>R$ {c.monthly_interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   <p className={`text-[9px] font-black uppercase tracking-widest ${isSettled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isSettled ? 'LIQUIDADO' : c.dueDateThisMonth}
                   </p>
                </div>
             </div>
           );
         })}
      </div>
    </div>
  );
};

const OverdueSection = ({ contracts, clients, onSelectContract, getOverdueStatus }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'name-asc', label: 'NOME (A-Z)' },
    { value: 'name-desc', label: 'NOME (Z-A)' },
    { value: 'value-desc', label: 'VALOR MAIOR' },
    { value: 'value-asc', label: 'VALOR MENOR' },
  ];

  const filteredAndSortedContracts = [...contracts]
    .filter((c: any) => {
      const client = clients.find((cl: any) => cl.id === c.client_id);
      const searchLower = searchTerm.toLowerCase();
      const clientName = client?.full_name?.toLowerCase() || '';
      const amountStr = c.total_amount.toString();
      const dateStr = new Date(c.start_date + 'T12:00:00').toLocaleDateString();
      
      return clientName.includes(searchLower) || amountStr.includes(searchLower) || dateStr.includes(searchLower);
    })
    .sort((a: any, b: any) => {
      const clientA = clients.find((cl: any) => cl.id === a.client_id)?.full_name || '';
      const clientB = clients.find((cl: any) => cl.id === b.client_id)?.full_name || '';
      
      switch (sortOption) {
        case 'name-asc': return clientA.localeCompare(clientB);
        case 'name-desc': return clientB.localeCompare(clientA);
        case 'value-desc': return b.total_amount - a.total_amount;
        case 'value-asc': return a.total_amount - b.total_amount;
        default: return 0;
      }
    });

  return (
  <div className="space-y-2 lg:space-y-3 animate-in fade-in duration-500 uppercase font-black text-slate-900 pb-20 w-full">
     <div className="bg-slate-50/95 backdrop-blur-sm flex justify-between items-center pl-[-2px] pr-[5px] mb-[7px] mr-[2px] ml-[-2px] pb-0 mt-[-28px] h-6">
        <h4 className="text-[12px] lg:text-sm font-black text-rose-600 uppercase tracking-tighter leading-[11px] pl-[5px]">INADIMPLENTES</h4>
        <span className="text-[10px] lg:text-xs text-rose-600 font-black tracking-widest leading-[11px] pl-[2px]">{contracts.length} TÍTULOS</span>
     </div>

     <div className="flex flex-row gap-2 mb-0 mt-[7px] pr-[4px] pl-0 h-[34px]">
      <div className="relative w-[43px] h-[35px] mt-[-1px] mb-0 ml-0 flex items-center justify-center bg-white border border-slate-200 rounded-xl shrink-0" ref={filterRef}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full h-full flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
        >
          <Filter className="h-4 w-4" />
        </button>
        
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden"
            >
              <div className="py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortOption(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-colors ${
                      sortOption === option.value 
                        ? 'bg-rose-50 text-rose-600' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder=""
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all uppercase tracking-widest"
        />
      </div>
    </div>
     
     {contracts.length === 0 ? (
       <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200 shadow-sm"><CheckCircle size={32}/></div>
          <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">CARTEIRA EM DIA</p>
       </div>
     ) : (
       <div className="flex flex-col gap-1.5 lg:gap-3">
          {filteredAndSortedContracts.map((c: any) => {
            const client = clients.find((cl: any) => cl.id === c.client_id);
            const status = getOverdueStatus(c);
            
            return (
              <div 
                key={c.id} 
                className="glass-panel px-3 py-3 lg:px-6 lg:py-5 rounded-2xl shadow-sm border-rose-200 flex items-center justify-between group hover:bg-slate-50 transition-all border-l-4 border-l-rose-500 cursor-pointer overflow-hidden relative"
              >
                 <div onClick={() => onSelectContract(c)} className="flex-1 min-w-0 pr-2 lg:pr-4">
                    <div className="flex items-center gap-1.5 lg:gap-2">
                       <h4 className="text-[11px] lg:text-sm font-black text-slate-900 uppercase tracking-tighter truncate group-hover:text-rose-600 transition-colors leading-none">{client?.full_name}</h4>
                       <span className="text-rose-600 font-black text-[8px] lg:text-[10px] uppercase tracking-widest bg-rose-100 px-1.5 py-0.5 lg:px-2 lg:py-0.5 rounded-md border border-rose-200 shrink-0">
                          {status?.diffDays}D
                       </span>
                    </div>
                    <div className="mt-1.5 lg:mt-2 flex items-center gap-2 lg:gap-3">
                       <p className="text-[8px] lg:text-[10px] text-slate-500 uppercase font-black tracking-widest">PARC. #{status?.installmentNumber}</p>
                       <span className="text-slate-400">|</span>
                       <p className="text-[8px] lg:text-[10px] text-slate-500 font-black uppercase tracking-widest">DÍVIDA: R$ {(Number(c.total_amount) - Number(c.paid_amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right leading-none">
                       <p className="text-[12px] lg:text-base font-black text-rose-600 tracking-tighter">R$ {c.monthly_interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const msg = encodeURIComponent(`Olá ${client?.full_name}, identificamos uma pendência em seu título na AGICRED de R$ ${c.monthly_interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Por favor, entre em contato.`);
                        window.open(`https://wa.me/${client?.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                      }}
                      className="w-9 h-9 lg:w-12 lg:h-12 bg-slate-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-slate-200"
                    >
                       <Phone className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    </button>
                 </div>
              </div>
            );
          })}
       </div>
     )}
  </div>
);
};

const ClientDetailsModal = ({ client, contracts, onClose, onSuccess, onSelectContract, onAddContract }: { client: Client, contracts: Contract[], onClose: () => void, onSuccess: () => void, onSelectContract: (c: Contract) => void, onAddContract: (clientId: string) => void }) => {
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...client });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const { error } = await supabase.from('clients').update({
      full_name: editForm.full_name,
      cpf: editForm.cpf,
      birth_date: editForm.birth_date,
      phone: editForm.phone,
      address: editForm.address,
      city: editForm.city,
      workplace: editForm.workplace
    }).eq('id', client.id);
    setUpdating(false);
    if (!error) {
      setIsEditing(false);
      onSuccess();
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    setUpdating(false);
    if (!error) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 pt-0 lg:pt-10 z-[105] overflow-y-auto uppercase font-black text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-6 lg:p-8 space-y-6 animate-in shadow-2xl border border-slate-200 bg-white">
        <div className="flex justify-between items-center pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm border border-slate-200"><User size={20}/></div>
            <div>
               <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">{client.full_name}</h2>
               <p className="text-[8px] text-violet-600 font-black tracking-[0.1em] mt-1 uppercase">DADOS DO CORRENTISTA</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-slate-200 rounded-lg"><Edit2 size={16}/></button>
            <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-rose-600 transition-colors bg-slate-100 hover:bg-rose-100 rounded-lg"><Trash2 size={16}/></button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 rounded-lg"><X size={18}/></button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
             <InputWrapper label="NOME COMPLETO" value={editForm.full_name} onChange={(v: string) => setEditForm({...editForm, full_name: v.toUpperCase()})} />
             <div className="grid grid-cols-2 gap-3">
                <InputWrapper label="CPF" value={editForm.cpf} onChange={(v: string) => setEditForm({...editForm, cpf: v})} />
                <InputWrapper label="NASCIMENTO" type="date" value={editForm.birth_date} onChange={(v: string) => setEditForm({...editForm, birth_date: v})} />
             </div>
             <div className="grid grid-cols-2 gap-3">
                <InputWrapper label="WHATSAPP" value={editForm.phone} onChange={(v: string) => setEditForm({...editForm, phone: v})} />
                <InputWrapper label="CIDADE" value={editForm.city} onChange={(v: string) => setEditForm({...editForm, city: v.toUpperCase()})} />
             </div>
             <InputWrapper label="ENDEREÇO" value={editForm.address} onChange={(v: string) => setEditForm({...editForm, address: v.toUpperCase()})} />
             <InputWrapper label="TRABALHO" value={editForm.workplace} onChange={(v: string) => setEditForm({...editForm, workplace: v.toUpperCase()})} />
             <button type="submit" disabled={updating} className="w-full primary-gradient text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 hover:shadow-violet-500/25">
               {updating ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
             </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
               <InfoItem icon={<CreditCard />} label="CPF / ID" value={client.cpf || 'NÃO INFORMADO'} />
               <InfoItem icon={<CalendarIcon />} label="NASCIMENTO" value={client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'NÃO INFORMADO'} />
               <InfoItem icon={<Phone />} label="WHATSAPP" value={client.phone || 'NÃO INFORMADO'} />
               <InfoItem icon={<Briefcase />} label="TRABALHO" value={client.workplace || 'NÃO INFORMADO'} />
               <InfoItem icon={<MapPin />} label="LOCALIZAÇÃO" value={`${client.address || ''} ${client.city || ''}`.trim() || 'NÃO INFORMADO'} />
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-500 tracking-widest uppercase flex items-center gap-2">TÍTULOS VINCULADOS</h3>
                <button 
                  onClick={() => onAddContract(client.id)} 
                  className="bg-violet-600 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 transition-all hover:bg-violet-700"
                >
                  <Plus size={12}/> NOVO CONTRATO
                </button>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                {contracts.length > 0 ? contracts.map(c => (
                  <div key={c.id} onClick={() => onSelectContract(c)} className="p-3.5 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between group">
                    <div className={`space-y-1 ${c.status === 'paid' ? 'line-through opacity-60' : ''}`}>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest -mt-0.5 pb-[1px]">CAPITAL: R$ {c.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest pb-[1px]">JUROS: R$ {c.total_interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-[#6608ff] font-black uppercase tracking-widest">TOTAL DO CONTRATO: R$ {c.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">DATA DE CRIAÇÃO: {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {c.status === 'overdue' && (
                        <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest">
                          ATIVO
                        </div>
                      )}
                      <div className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 
                        c.status === 'overdue' ? 'bg-rose-100 text-rose-600' : 
                        'bg-slate-200 text-black'
                      }`}>
                        {c.status === 'active' ? 'ATIVO' : c.status === 'paid' ? 'LIQUIDADO' : 'VENCIDO'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center"><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">NENHUM REGISTRO</p></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ContractDetailsModal = ({ contract, client, onClose, onSuccess }: { contract: Contract, client?: Client, onClose: () => void, onSuccess: () => void }) => {
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPartialPay, setShowPartialPay] = useState(false);
  const [partialValue, setPartialValue] = useState('');
  const [editingPaymentDate, setEditingPaymentDate] = useState<{index: number, date: string} | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const savedNotes = localStorage.getItem(`contract_notes_${contract.id}`);
    if (savedNotes) setNotes(savedNotes);
  }, [contract.id]);

  const handleSaveNotes = (newNotes: string) => {
    setNotes(newNotes);
    localStorage.setItem(`contract_notes_${contract.id}`, newNotes);
  };
  
  const firstDueDate = new Date(contract.end_date + 'T12:00:00');
  if (contract.months > 1) {
    firstDueDate.setMonth(firstDueDate.getMonth() - (contract.months - 1));
  }

  const [editForm, setEditForm] = useState({ 
    capital: contract.capital, 
    interest_rate: contract.interest_rate, 
    interest_amount: '',
    months: contract.months, 
    start_date: contract.start_date,
    due_date: firstDueDate.toISOString().split('T')[0]
  });

  const updatePaymentDate = async (index: number, newDate: string) => {
    if (!newDate) return;
    setUpdating(true);
    const currentHistory = contract.payment_history || {};
    const newHistory = { ...currentHistory, [index]: newDate };
    
    const { error } = await supabase.from('contracts').update({
        payment_history: newHistory
    }).eq('id', contract.id);
    
    if (error) {
        // Fallback to local storage
        try {
            const localHistory = localStorage.getItem(`payment_history_${contract.id}`);
            const parsed = localHistory ? JSON.parse(localHistory) : {};
            const updatedLocal = { ...parsed, [index]: newDate };
            localStorage.setItem(`payment_history_${contract.id}`, JSON.stringify(updatedLocal));
            
            // Manually update local state to reflect change immediately
            const updatedContract = { ...contract, payment_history: { ...currentHistory, ...updatedLocal } };
            // We need to update the contracts list in parent component, but here we only have onSuccess callback
            // onSuccess triggers fetchData which will read from localStorage
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
    }
    
    setUpdating(false);
    setEditingPaymentDate(null);
    onSuccess();
  };

  const monthlyInterestOnly = Number(contract.monthly_interest) || 0;
  const totalPaid = Number(contract.paid_amount || 0);
  // Use integer math (cents) to avoid floating point errors
  const installmentsPaidCount = monthlyInterestOnly > 0 
    ? Math.floor(Math.round(totalPaid * 100) / Math.round(monthlyInterestOnly * 100)) 
    : 0;
  
  const totalRemainingDebt = Number(contract.total_amount) - totalPaid;
  const remainingInstallmentsCount = Math.max(0, Number(contract.months) - installmentsPaidCount);
  const remainingInterestTotal = remainingInstallmentsCount * monthlyInterestOnly;
  const remainingCapitalTotal = Math.max(0, totalRemainingDebt - remainingInterestTotal);
  
  const abatementValue = parseFloat(partialValue || '0') || 0;
  const projectedDebt = Math.max(0, totalRemainingDebt - abatementValue);

  const handleUpdate = async () => {
    setUpdating(true);
    let m_int = 0;
    let total_int = 0;
    const capital = Number(editForm.capital) || 0;
    const months = Number(editForm.months) || 0;

    if (editForm.interest_amount) {
      total_int = Number(editForm.interest_amount) || 0;
      m_int = months > 0 ? total_int / months : total_int;
    } else {
      m_int = capital * ((Number(editForm.interest_rate) || 0) / 100);
      total_int = m_int * months;
    }
    const t_amt = capital + total_int;
    
    const endDate = new Date(editForm.due_date + 'T12:00:00');
    if (months > 1) {
      endDate.setMonth(endDate.getMonth() + months - 1);
    }
    
    const calculated_interest_rate = editForm.interest_amount 
      ? (capital > 0 ? (m_int / capital) * 100 : 0) 
      : (Number(editForm.interest_rate) || 0);

    const { error } = await supabase.from('contracts').update({
      capital: capital,
      interest_rate: calculated_interest_rate,
      months: months,
      monthly_interest: m_int,
      total_interest: total_int,
      total_amount: t_amt,
      start_date: editForm.start_date,
      end_date: endDate.toISOString().split('T')[0]
    }).eq('id', contract.id);

    setUpdating(false);
    if (!error) {
      setIsEditing(false);
      onSuccess();
    }
  };

  const toggleInstallmentPayment = async (index: number, currentlyPaid: boolean) => {
    const isNextToPay = index === installmentsPaidCount;
    const isLastPaid = index === installmentsPaidCount - 1;

    if (!currentlyPaid && !isNextToPay) return;
    if (currentlyPaid && !isLastPaid) return;

    setUpdating(true);
    const currentPaidAmount = Number(contract.paid_amount || 0);
    let newPaidAmount = currentlyPaid 
      ? currentPaidAmount - monthlyInterestOnly 
      : currentPaidAmount + monthlyInterestOnly;

    newPaidAmount = Math.max(0, Math.min(Number(contract.total_amount), newPaidAmount));
    const isFullyPaid = newPaidAmount >= (Number(contract.total_amount) - 0.01);
    
    const updates: any = {
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'paid' : 'active'
    };

    if (isFullyPaid) {
      // Do not change end_date to preserve installment due dates
    }

    // First update the critical fields (amount, status)
    const { error } = await supabase.from('contracts').update(updates).eq('id', contract.id);
    
    if (!error) {
        // Try to update payment history separately
        // This prevents the main update from failing if the column doesn't exist
        let historyUpdated = false;
        const currentHistory = contract.payment_history || {};
        const newHistory = { ...currentHistory };
        
        if (!currentlyPaid) {
            // Marking as paid -> add today's date
            newHistory[index] = new Date().toISOString().split('T')[0];
        } else {
            // Marking as unpaid -> remove date
            delete newHistory[index];
        }

        try {
            const { error: histError } = await supabase.from('contracts').update({
                payment_history: newHistory
            }).eq('id', contract.id);
            
            if (!histError) historyUpdated = true;
        } catch (err) {
            console.warn('Could not update payment history (column likely missing)', err);
        }

        if (!historyUpdated) {
            // Fallback to local storage
            try {
                const localHistory = localStorage.getItem(`payment_history_${contract.id}`);
                const parsed = localHistory ? JSON.parse(localHistory) : {};
                
                if (!currentlyPaid) {
                    parsed[index] = new Date().toISOString().split('T')[0];
                } else {
                    delete parsed[index];
                }
                
                localStorage.setItem(`payment_history_${contract.id}`, JSON.stringify(parsed));
            } catch (e) {
                console.error('Failed to save to localStorage', e);
            }
        }
    }

    setUpdating(false);
    if (!error) onSuccess();
  };

  const markAsPaid = async () => {
    setUpdating(true);
    const { error } = await supabase.from('contracts').update({ 
      status: 'paid',
      paid_amount: Number(contract.total_amount)
    }).eq('id', contract.id);
    setUpdating(false);
    if (!error) { onSuccess(); onClose(); }
  };

  const handlePartialPayment = async () => {
    const value = parseFloat(partialValue);
    if (isNaN(value) || value <= 0) return;

    setUpdating(true);
    const currentPaid = Number(contract.paid_amount || 0);
    const newPaidAmount = Math.min(Number(contract.total_amount), currentPaid + value);
    const isFullyPaid = newPaidAmount >= (Number(contract.total_amount) - 0.01);

    const { error } = await supabase.from('contracts').update({
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'paid' : 'active'
    }).eq('id', contract.id);

    setUpdating(false);
    if (!error) {
      setShowPartialPay(false);
      setPartialValue('');
      onSuccess();
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);
      
      if (error) {
        console.error("Erro Supabase ao excluir contrato:", error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Exceção ao excluir contrato:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 pt-0 lg:pt-10 z-[110] overflow-y-auto uppercase font-black text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-5 lg:p-6 space-y-4 animate-in shadow-2xl relative min-h-[450px] border border-slate-200 bg-white">
        {showPartialPay && (
          <div className="absolute inset-x-0 top-0 bottom-0 bg-white/98 backdrop-blur-md z-[120] p-6 flex flex-col animate-in fade-in duration-300 rounded-b-3xl lg:rounded-3xl overflow-y-auto no-scrollbar pb-10 text-slate-900">
             <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-2.5 text-blue-600">
                   <Wallet size={20} />
                   <h3 className="text-sm font-black uppercase tracking-tighter">PAGAMENTO PARCIAL</h3>
                </div>
                <button onClick={() => {setShowPartialPay(false); setPartialValue('');}} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all active:scale-90"><X size={18}/></button>
             </div>
             
             <div className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1">
                      <Info size={14} className="text-blue-600" /> RESUMO DOS SALDOS ATIVOS
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center px-2 py-1.5">
                         <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">JUROS VIGENTES ({remainingInstallmentsCount} PARC.)</span>
                         <span className="text-[12px] font-black text-rose-600 tracking-tighter">R$ {remainingInterestTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center px-[20px] pt-[10px] pb-[6px] mt-[9px] ml-[-2px] mr-0">
                         <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">CAPITAL VIGENTE (PRINCIPAL)</span>
                         <span className="text-[12px] font-black text-slate-900 tracking-tighter leading-[14px]">R$ {remainingCapitalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-100 rounded-xl border border-blue-200 text-[16px] mt-[-2px] ml-[59px] pl-[19px] pb-[15px] pr-[22px] pt-[8px]">
                         <span className="text-[11px] text-blue-600 font-black uppercase tracking-widest">DÍVIDA ATUAL (SOMA TOTAL)</span>
                         <span className="text-[12px] font-black text-blue-700 tracking-tighter leading-none">R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-1 relative">
                   <label className="text-[10px] font-black text-slate-500 ml-4 tracking-widest uppercase mb-1 block flex items-center gap-2">
                     <Coins size={12} className="text-emerald-600"/> INFORME O VALOR DO ABATIMENTO
                   </label>
                   <div className="relative group max-w-xs">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-base group-focus-within:text-blue-600 transition-colors">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        inputMode="decimal"
                        autoFocus
                        className="w-full pl-12 pr-4 py-3 glass-input bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black outline-none focus:ring-1 focus:ring-blue-500 shadow-sm transition-all text-slate-900 placeholder:text-slate-400" 
                        placeholder="0,00" 
                        value={partialValue} 
                        onChange={(e) => setPartialValue(e.target.value)} 
                      />
                   </div>
                   <p className="text-[8px] text-slate-400 font-bold ml-5 mt-2 uppercase tracking-widest leading-relaxed">
                     O VALOR INFORMADO SERÁ ABATIDO DIRETAMENTE DO SALDO TOTAL DEVEDOR.
                   </p>
                </div>

                {abatementValue > 0 && (
                   <div className="bg-emerald-100 p-4 rounded-3xl border border-emerald-200 space-y-2 animate-in zoom-in-95 duration-200 shadow-sm">
                      <h4 className="text-[8px] font-black text-emerald-600 tracking-widest uppercase flex items-center gap-1.5"><TrendingUp size={12}/> PROJEÇÃO DA DÍVIDA PÓS-PAGAMENTO</h4>
                      <div className="space-y-1 pt-1">
                         <div className="flex justify-between items-center text-[8px] font-bold text-slate-500">
                            <span>SALDO DEVEDOR ATUAL</span>
                            <span>R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         </div>
                         <div className="flex justify-between items-center text-[8px] font-bold text-rose-600">
                            <span>MENOS ABATIMENTO</span>
                            <span>- R$ {abatementValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         </div>
                         <div className="flex justify-between items-center pt-2 mt-2 border-t border-emerald-200">
                            <span className="text-[9px] text-emerald-800 font-black uppercase">SALDO REMANESCENTE</span>
                            <span className="text-[14px] font-black text-emerald-700 tracking-tighter">R$ {projectedDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                         </div>
                      </div>
                   </div>
                )}

                <button 
                  onClick={handlePartialPayment} 
                  disabled={updating || abatementValue <= 0} 
                  className="w-full bg-blue-600 text-white h-16 rounded-[2rem] font-black text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] active:scale-95 disabled:opacity-30 mt-4"
                >
                  {updating ? <RefreshCw className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} 
                  {updating ? 'EFETUANDO BAIXA...' : 'CONFIRMAR ABATIMENTO'}
                </button>
             </div>
          </div>
        )}

        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="flex-1 overflow-hidden">
             <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600">
                <FileCheck size={16} />
                <p className="text-[10px] font-black tracking-[0.2em] uppercase">TÍTULO ID: #{contract.id.slice(0, 8)}</p>
             </div>
             <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-tight truncate">{client?.full_name}</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <button onClick={() => setIsEditing(!isEditing)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all border shadow-sm ${isEditing ? 'bg-emerald-500 text-white border-emerald-500' : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'}`}><Edit2 size={16}/></button>
            <button type="button" onClick={handleDelete} disabled={updating} className="w-9 h-9 flex items-center justify-center text-rose-600 bg-rose-100 rounded-xl hover:bg-rose-200 transition-all border border-rose-200 shadow-sm">
              {updating ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16}/>}
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all bg-slate-100 rounded-xl border border-slate-200 shadow-sm"><X size={18}/></button>
          </div>
        </div>

        {isEditing ? (
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-emerald-200 space-y-3">
             <h3 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-2"><Edit2 size={12}/> AJUSTAR PARÂMETROS</h3>
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">CAPITAL</label>
                   <input type="number" step="0.01" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.capital} onChange={e => setEditForm({...editForm, capital: Number(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">TAXA (%)</label>
                   <input type="number" step="0.1" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.interest_rate} onChange={e => setEditForm({...editForm, interest_rate: Number(e.target.value) || 0, interest_amount: ''})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">JUROS (R$)</label>
                   <input type="number" step="0.01" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.interest_amount} onChange={e => setEditForm({...editForm, interest_amount: e.target.value, interest_rate: 0})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">PRAZO (M)</label>
                   <input type="number" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.months} onChange={e => setEditForm({...editForm, months: Number(e.target.value) || 1})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">INÍCIO</label>
                   <input type="date" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[7px] font-black text-slate-500 ml-2 tracking-widest uppercase">VENCIMENTO</label>
                   <input type="date" className="w-full px-3 py-2 glass-input bg-white border border-slate-200 rounded-xl font-black text-[10px] outline-none text-slate-900" value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
                </div>
             </div>
             <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 border border-slate-200 py-2.5 rounded-xl font-black text-[8px] uppercase text-slate-500 hover:bg-slate-200">CANCELAR</button>
                <button type="button" onClick={handleUpdate} disabled={updating} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600">
                   <Save size={12}/> SALVAR
                </button>
             </div>
          </div>
        ) : (
          <>
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group bg-white">
               <div className="absolute top-0 right-0 p-2 opacity-5 text-slate-900"><Coins size={40}/></div>
               <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2 -mt-2">MONTANTE TOTAL DO CONTRATO</p>
               <div className="flex items-baseline gap-1.5">
                  <span className="text-emerald-600 text-sm font-black">R$</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{contract.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                  <span className="text-[9px] font-black text-violet-600 tracking-widest uppercase">TAXA: {contract.interest_rate}% A.M.</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
               <div className="glass-panel p-3 rounded-2xl border border-violet-200 flex flex-col items-center text-center shadow-sm bg-white">
                  <span className="text-[10px] text-violet-500 font-black tracking-widest mb-1 uppercase">CAPITAL BASE</span>
                  <span className="text-[16px] font-black text-violet-600 uppercase">R$ {contract.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="glass-panel p-3 rounded-2xl border border-rose-200 flex flex-col items-center text-center shadow-sm bg-white">
                  <span className="text-[10px] text-rose-500 font-black tracking-widest mb-1 uppercase">TOTAL JUROS</span>
                  <span className="text-[16px] font-black text-rose-600 uppercase">R$ {contract.total_interest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="glass-panel p-3 rounded-2xl border border-emerald-200 flex flex-col items-center text-center shadow-sm bg-white">
                  <span className="text-[10px] text-emerald-600 font-black tracking-widest mb-1 uppercase">VALOR JÁ PAGO</span>
                  <span className="text-[16px] font-black text-emerald-600 uppercase">R$ {Number(contract.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="glass-panel p-3 rounded-2xl border border-blue-200 flex flex-col items-center text-center shadow-sm bg-white">
                  <span className="text-[10px] text-blue-500 font-black tracking-widest mb-1 uppercase">SALDO RESTANTE</span>
                  <span className="text-[16px] font-black text-blue-600 uppercase">R$ {totalRemainingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase flex items-center gap-1.5"><Clock size={12}/> VENCIMENTOS MENSALIDADE</h3>
                  <span className="text-[8px] font-black text-slate-400 uppercase">{contract.months} MESES</span>
               </div>
               <div className="pr-1 space-y-1.5">
                  {Array.from({ length: Number(contract.months) }).map((_, i) => {
                     const firstDueDate = new Date(contract.end_date + 'T12:00:00');
                     if (contract.months > 1) {
                       firstDueDate.setMonth(firstDueDate.getMonth() - (contract.months - 1));
                     }
                     const dueDate = new Date(firstDueDate);
                     dueDate.setMonth(dueDate.getMonth() + i);
                     const isPaid = i < installmentsPaidCount;
                     const isLastPaid = i === installmentsPaidCount - 1;
                     const isNextToPay = i === installmentsPaidCount;
                     const canToggle = (isNextToPay && contract.status !== 'paid') || isLastPaid;

                     return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPaid ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200 shadow-sm'}`}>
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isPaid ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>{i + 1}</div>
                              <div>
                                 <p className="text-[12px] font-black text-slate-900 uppercase leading-none">PARCELA JUROS</p>
                                 <p className={`text-[10px] font-black uppercase mt-1.5 tracking-widest ${isPaid ? 'text-slate-500' : 'text-rose-500'}`}>VENC. {dueDate.toLocaleDateString('pt-BR')}</p>
                                 {isPaid && (
                                    editingPaymentDate?.index === i ? (
                                        <div onClick={e => e.stopPropagation()} className="mt-1 flex items-center gap-1">
                                            <input 
                                                type="date" 
                                                value={editingPaymentDate.date} 
                                                onChange={e => setEditingPaymentDate({ ...editingPaymentDate, date: e.target.value })}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') updatePaymentDate(i, editingPaymentDate.date);
                                                    if (e.key === 'Escape') setEditingPaymentDate(null);
                                                }}
                                                className="text-[8px] font-black bg-white border border-violet-200 rounded px-1 py-0.5 text-violet-600 outline-none w-24 shadow-sm"
                                                autoFocus
                                            />
                                            <button onClick={() => updatePaymentDate(i, editingPaymentDate.date)} className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center hover:bg-emerald-200 transition-colors">
                                                <Check size={10} />
                                            </button>
                                            <button onClick={() => setEditingPaymentDate(null)} className="w-5 h-5 bg-rose-100 text-rose-600 rounded flex items-center justify-center hover:bg-rose-200 transition-colors">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div onClick={(e) => { e.stopPropagation(); setEditingPaymentDate({ index: i, date: contract.payment_history?.[i] || new Date().toISOString().split('T')[0] }) }} className="cursor-pointer hover:bg-slate-50 rounded px-1 -ml-1 transition-colors group/date w-fit">
                                            <p className="text-[10px] text-emerald-600 font-black uppercase mt-1.5 tracking-widest flex items-center gap-1">
                                                PAGO {contract.payment_history?.[i] ? new Date(contract.payment_history[i] + 'T12:00:00').toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')} 
                                                <Edit2 size={10} className="opacity-0 group-hover/date:opacity-50 transition-opacity"/>
                                            </p>
                                        </div>
                                    )
                                 )}
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <p className={`text-[11px] font-black ${isPaid ? 'text-emerald-600' : 'text-slate-500'}`}>R$ {monthlyInterestOnly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                              <button onClick={(e) => { e.stopPropagation(); if (canToggle) toggleInstallmentPayment(i, isPaid); }} disabled={!canToggle || updating} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isPaid ? 'bg-violet-600 text-white shadow-md' : canToggle ? 'bg-slate-50 text-emerald-600 border border-slate-100 shadow-sm hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}>
                                 {updating && (i === installmentsPaidCount || i === installmentsPaidCount - 1) ? <RefreshCw className="animate-spin" size={12}/> : isPaid ? <CheckCircle size={14}/> : <Coins size={14}/>}
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
            
            <div className="mt-4 space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase flex items-center gap-1.5"><FileText size={12}/> ANOTAÇÕES</label>
                <textarea 
                    className="w-full h-24 p-3 glass-input bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs text-slate-700 outline-none focus:ring-1 focus:ring-violet-500 resize-none placeholder:text-slate-400 uppercase"
                    value={notes}
                    onChange={(e) => handleSaveNotes(e.target.value)}
                />
            </div>
          </>
        )}

        <div className="pt-2 grid grid-cols-2 gap-2.5">
           <button onClick={() => setShowPartialPay(true)} disabled={updating || isEditing || contract.status === 'paid'} className="h-12 glass-panel border border-slate-200 text-blue-600 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-all hover:bg-slate-50 bg-white"><Wallet size={14}/> ABATE PARCIAL</button>
           {contract.status !== 'paid' ? (
             <button onClick={markAsPaid} disabled={updating || isEditing} className="h-12 primary-gradient text-white rounded-xl font-black text-[8px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-all hover:shadow-violet-500/25">LIQUIDAR TUDO</button>
           ) : (
              <button 
                onClick={async () => {
                  setUpdating(true);
                  const { error } = await supabase.from('contracts').update({ 
                    status: 'active',
                    paid_amount: 0
                  }).eq('id', contract.id);
                  setUpdating(false);
                  if (!error) { onSuccess(); onClose(); }
                }} 
                disabled={updating || isEditing} 
                className="h-12 bg-emerald-100 text-emerald-600 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-2 border border-emerald-200 hover:bg-emerald-200 transition-all cursor-pointer active:scale-95 w-full"
              >
                <CheckCircle2 size={16}/> PAGO
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

const ClientModal = ({ userId, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({ full_name: '', cpf: '', birth_date: '', phone: '', address: '', city: '', workplace: '' });
  const [saving, setSaving] = useState(false);

  const applyCPFMask = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const applyPhoneMask = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    
    const payload: any = { ...form, user_id: userId };
    if (!payload.birth_date) {
      delete payload.birth_date;
    }
    
    const { error } = await supabase.from('clients').insert(payload);
    setSaving(false); 
    if (!error) { 
      onSuccess(); 
      onClose(); 
    } else {
      alert('Erro ao registrar cliente: ' + error.message);
    }
  };
  
  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 pt-0 lg:pt-10 z-[100] overflow-y-auto uppercase font-bold text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-6 lg:p-8 space-y-5 animate-in shadow-2xl border border-slate-200 bg-white">
        <div className="flex justify-between items-center">
           <div><h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">NOVO CLIENTE</h2><p className="text-[9px] text-violet-600 font-black tracking-[0.2em] mt-1 uppercase">SISTEMA AGICRED</p></div>
           <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors bg-slate-100 rounded-xl shrink-0 hover:bg-slate-200"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-black">
           <InputWrapper label="NOME COMPLETO" value={form.full_name} onChange={(v: string) => setForm({...form, full_name: v.toUpperCase()})} />
           <div className="grid grid-cols-2 gap-3">
              <InputWrapper label="CPF" value={form.cpf} onChange={(v: string) => setForm({...form, cpf: applyCPFMask(v)})} inputMode="numeric" />
              <InputWrapper label="NASCIMENTO" type="date" value={form.birth_date} onChange={(v: string) => setForm({...form, birth_date: v})} />
           </div>
           <div className="grid grid-cols-2 gap-3">
              <InputWrapper label="WHATSAPP" value={form.phone} onChange={(v: string) => setForm({...form, phone: applyPhoneMask(v)})} inputMode="numeric" />
              <InputWrapper label="CIDADE" value={form.city} onChange={(v: string) => setForm({...form, city: v.toUpperCase()})} />
           </div>
           <InputWrapper label="LOGRADOURO" value={form.address} onChange={(v: string) => setForm({...form, address: v.toUpperCase()})} />
           <InputWrapper label="TRABALHO" value={form.workplace} onChange={(v: string) => setForm({...form, workplace: v.toUpperCase()})} />
           <button type="submit" disabled={saving} className="w-full primary-gradient text-white py-4 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl mt-4 active:scale-95 transition-all hover:shadow-violet-500/25">
              {saving ? 'PROCESSANDO...' : 'REGISTRAR CLIENTE'}
           </button>
        </form>
      </div>
    </div>
  );
};

const ContractModal = ({ userId, clients, onClose, onSuccess, initialClientId }: any) => {
  const defaultDueDate = new Date();
  defaultDueDate.setMonth(defaultDueDate.getMonth() + 1);

  const [form, setForm] = useState({ 
    client_id: initialClientId || '', 
    capital: '', 
    interest_rate: '', 
    interest_amount: '',
    months: '', 
    start_date: new Date().toISOString().split('T')[0],
    due_date: defaultDueDate.toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const dueDateRef = useRef<HTMLDivElement>(null);
  
  let m_int = 0;
  let total_int = 0;
  const capital = Number(form.capital) || 0;
  const months = Number(form.months) || 0;

  if (form.interest_amount) {
    m_int = Number(form.interest_amount) || 0;
    total_int = m_int * months;
  } else {
    m_int = capital * ((Number(form.interest_rate) || 0) / 100);
    total_int = m_int * months;
  }
  const t_amt = capital + total_int;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) return;
    setSaving(true);
    
    // Calcula a data final baseada na data de vencimento da primeira parcela
    const endDate = new Date(form.due_date + 'T12:00:00');
    if (months > 1) {
      endDate.setMonth(endDate.getMonth() + months - 1);
    }
    
    const calculated_interest_rate = form.interest_amount 
      ? (capital > 0 ? (m_int / capital) * 100 : 0) 
      : (Number(form.interest_rate) || 0);

    const { error } = await supabase.from('contracts').insert({
      user_id: userId, 
      client_id: form.client_id, 
      capital: capital, 
      interest_rate: calculated_interest_rate, 
      months: months, 
      monthly_interest: m_int, 
      total_interest: total_int, 
      total_amount: t_amt, 
      start_date: form.start_date, 
      end_date: endDate.toISOString().split('T')[0], 
      status: 'active'
    });
    setSaving(false); 
    if (!error) { onSuccess(); onClose(); }
  };

  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 pt-0 lg:pt-10 z-[120] overflow-y-auto uppercase font-bold text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-6 lg:p-8 space-y-5 animate-in shadow-2xl border border-slate-200 bg-white">
        <div className="flex justify-between items-center px-1">
           <div><h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">NOVA OPERAÇÃO</h2><p className="text-[9px] text-violet-600 font-black tracking-[0.2em] mt-1 uppercase">EMISSÃO DE TÍTULO</p></div>
           <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors bg-slate-100 rounded-xl shrink-0 hover:bg-slate-200"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-black">
           <div className="space-y-1">
             <label className="text-[7px] font-black text-slate-500 ml-1 tracking-widest uppercase">CLIENTE</label>
             <select 
               required 
               className="w-full px-5 py-3.5 glass-input bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-900 font-black text-[10px] appearance-none" 
               onChange={e => setForm({...form, client_id: e.target.value})}
               value={form.client_id}
             >
                  <option value="" className="text-slate-400">SELECIONE</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id} className="text-slate-900">{c.full_name}</option>)}
             </select>
           </div>
           <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                 <InputWrapper label="CAPITAL (R$)" type="number" step="0.01" value={form.capital} onChange={(v: string) => setForm({...form, capital: v})} inputMode="decimal" />
              </div>
              <div className="col-span-4">
                 <InputWrapper label="JUROS (R$)" type="number" step="0.01" value={form.interest_amount} onChange={(v: string) => setForm({...form, interest_amount: v, interest_rate: ''})} inputMode="decimal" />
                 {form.interest_amount && (
                   <p className="text-[10px] text-violet-600 font-black uppercase tracking-widest leading-[12px] h-[21px] mt-[3px] -mb-[23px] pb-0 pt-0 pl-[28px]">
                     ({(capital > 0 ? (Number(form.interest_amount) / capital) * 100 : 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                   </p>
                 )}
              </div>
              <div className="col-span-3">
                 <InputWrapper label="TAXA (%)" type="number" step="0.1" value={form.interest_rate} onChange={(v: string) => setForm({...form, interest_rate: v, interest_amount: ''})} inputMode="decimal" />
              </div>
           </div>
           <div className="flex gap-2">
              <div className="w-1/4">
                 <InputWrapper label="PRAZO (M)" type="number" value={form.months} onChange={(v: string) => setForm({...form, months: v})} inputMode="numeric" />
              </div>
              <div className="flex-1 space-y-1 relative" ref={dateRef}>
                <label className="text-[7px] font-black text-slate-500 ml-1 tracking-widest uppercase whitespace-nowrap">DATA DE INÍCIO</label>
                <div onClick={() => { setShowDatePicker(!showDatePicker); setShowDueDatePicker(false); }} className="w-full px-5 py-3.5 glass-input bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 text-[10px] cursor-pointer flex items-center justify-between shadow-inner">
                  {new Date(form.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  <CalendarIcon size={14} className="text-violet-600 ml-[9px] mr-[-12px]" />
                </div>
                {showDatePicker && <DatePickerPopup selectedDate={form.start_date} onDateSelect={(d) => setForm({...form, start_date: d})} onClose={() => setShowDatePicker(false)} />}
              </div>
              <div className="flex-1 space-y-1 relative" ref={dueDateRef}>
                <label className="text-[7px] font-black text-slate-500 ml-1 tracking-widest uppercase whitespace-nowrap">DATA DE VENCIMENTO</label>
                <div onClick={() => { setShowDueDatePicker(!showDueDatePicker); setShowDatePicker(false); }} className="w-full px-5 py-3.5 glass-input bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 text-[10px] cursor-pointer flex items-center justify-between shadow-inner">
                  {new Date(form.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  <CalendarIcon size={14} className="text-violet-600 ml-[9px] mr-[-12px]" />
                </div>
                {showDueDatePicker && <DatePickerPopup selectedDate={form.due_date} onDateSelect={(d) => setForm({...form, due_date: d})} onClose={() => setShowDueDatePicker(false)} />}
              </div>
           </div>

           {(Number(form.months) > 0) && (
             <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center px-1">
                   <h3 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase flex items-center gap-1.5"><Clock size={14}/> PROJEÇÃO DE PAGAMENTOS</h3>
                   <span className="text-[8px] font-black text-slate-500 uppercase">{form.months} MESES</span>
                </div>
                <div className="pr-1 space-y-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                   {Array.from({ length: Number(form.months) }).map((_, i) => {
                      const dueDate = new Date(form.due_date + 'T12:00:00');
                      dueDate.setMonth(dueDate.getMonth() + i);
                      return (
                         <div key={i} className="flex items-center justify-between p-2.5 glass-panel rounded-xl border border-slate-200 shadow-sm transition-all hover:border-violet-500/30 bg-white">
                            <div className="flex items-center gap-2.5">
                               <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-900 border border-slate-300">{i + 1}</div>
                               <div>
                                  <p className="text-[9px] font-black text-slate-900 uppercase leading-none">PARCELA JUROS</p>
                                  <p className="text-[8px] text-violet-600 font-black uppercase mt-0.5 tracking-widest">
                                    INÍCIO: {new Date(form.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </p>
                                  <p className="text-[8px] text-red-500 font-black uppercase mt-0.5 tracking-widest">
                                    VENCIMENTO: {dueDate.toLocaleDateString('pt-BR')}
                                  </p>
                               </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-600 whitespace-nowrap">R$ {m_int.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         </div>
                      );
                   })}
                </div>
                <div className="p-4 glass-panel border border-slate-200 rounded-2xl space-y-2 shadow-sm bg-white">
                   <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 font-black tracking-widest">CAPITAL INICIAL</span><span className="text-[10px] font-black text-slate-900">R$ {(Number(form.capital) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                   <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 font-black tracking-widest">TOTAL EM JUROS</span><span className="text-[10px] font-black text-rose-600">R$ {total_int.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                   <div className="flex justify-between items-center pt-2 border-t border-slate-200"><span className="text-[10px] text-slate-900 font-black uppercase tracking-[0.1em]">MONTANTE FINAL</span><span className="text-[14px] font-black text-emerald-600 tracking-tighter">R$ {t_amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                </div>
             </div>
           )}

           <button type="submit" disabled={saving} className="w-full primary-gradient text-white py-3 rounded-full font-black text-[11px] uppercase tracking-[0.3em] shadow-xl mt-2 active:scale-95 transition-all hover:shadow-violet-500/25">
              {saving ? 'PROCESSANDO...' : 'CONFIRMAR OPERAÇÃO'}
           </button>
        </form>
      </div>
    </div>
  );
};

const InputWrapper = ({ label, type = "text", value, onChange, placeholder, step, inputMode }: any) => (
  <div className="space-y-1 text-slate-900">
    <label className="text-[7px] font-black text-slate-500 ml-1 tracking-widest uppercase whitespace-nowrap">{label}</label>
    <input 
      type={type} 
      step={step} 
      inputMode={inputMode}
      className="w-full px-5 py-3.5 glass-input bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-900 text-[10px] uppercase shadow-inner placeholder:text-slate-400 transition-all focus:bg-white focus:border-violet-500" 
      placeholder={placeholder} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

const InfoItem = ({ icon, label, value }: any) => (
  <div className="flex items-center gap-3 text-slate-900">
    <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
      {/* Fix: added generic <any> to React.ReactElement to permit 'size' prop in cloneElement */}
      {React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}
    </div>
    <div className="flex flex-col">
      <p className="text-[7px] text-slate-500 font-black tracking-widest uppercase leading-tight mb-0.5">{label}</p>
      <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">{value}</p>
    </div>
  </div>
);

const UserProfileModal = ({ user, contracts, clients, onClose, onUpgradeRequest, onBackupRequest, onRefresh }: { user: UserProfile, contracts: Contract[], clients: Client[], onClose: () => void, onUpgradeRequest: () => void, onBackupRequest: () => void, onRefresh: () => void }) => {
  const [showProMessage, setShowProMessage] = useState(false);
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(localStorage.getItem('local_notifications_enabled') === 'true');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notifTime, setNotifTime] = useState(localStorage.getItem('notif_time') || '09:00');
  const [notifSound, setNotifSound] = useState(localStorage.getItem('notif_sound') !== 'false');
  const [notifVib, setNotifVib] = useState(localStorage.getItem('notif_vib') !== 'false');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setLocalNotificationsEnabled(localStorage.getItem('local_notifications_enabled') === 'true');
    rescheduleNotifications();
  }, []);

  const rescheduleNotifications = () => {
    console.log("Solicitando reagendamento de notificações...");
    import('../services/localNotifications').then(({ scheduleContractNotifications }) => {
      scheduleContractNotifications(contracts, clients, user?.pro_expires_at);
    });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNotifTime(val);
    localStorage.setItem('notif_time', val);
    rescheduleNotifications();
  };

  const toggleSound = () => {
    const val = !notifSound;
    setNotifSound(val);
    localStorage.setItem('notif_sound', val.toString());
    rescheduleNotifications();
  };

  const toggleVib = () => {
    const val = !notifVib;
    setNotifVib(val);
    localStorage.setItem('notif_vib', val.toString());
    rescheduleNotifications();
  };

  const isPro = user.is_pro && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());

  const generateReport = async () => {
    if (!user.is_pro) {
      setShowProMessage(true);
      return;
    }
    
    setGeneratingReport(true);
    try {
      const doc = new jsPDF();
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR');
      
      // Header
      doc.setFillColor(124, 58, 237); // Violet-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('AGICRED', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('RELATÓRIO GERAL DETALHADO', 20, 32);
      
      doc.setFontSize(12);
      doc.text(user.full_name, 190, 15, { align: 'right' });
      doc.setFontSize(10);
      doc.text(user.email, 190, 22, { align: 'right' });
      doc.text(user.phone, 190, 29, { align: 'right' });
      doc.text(`Data: ${dateStr}`, 190, 36, { align: 'right' });
      
      // Calculate Stats
      const totalLoaned = contracts.reduce((acc, c) => acc + Number(c.capital), 0);
      const totalInterestGenerated = contracts.reduce((acc, c) => acc + Number(c.total_interest), 0);
      const totalInterestReceived = contracts.reduce((acc, c) => {
        if (c.status === 'paid') return acc + Number(c.total_interest);
        return acc + (Number(c.paid_amount) || 0);
      }, 0);
      const totalCapitalReceived = contracts.reduce((acc, c) => {
         if (c.status === 'paid') return acc + Number(c.capital);
         return acc;
      }, 0);
      const totalToReceive = totalLoaned - totalCapitalReceived;
      const interestToReceive = totalInterestGenerated - totalInterestReceived;
      
      // Chart Section (Pie Chart) - Improved Rendering
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO FINANCEIRO', 20, 55);
      
      const startY = 65;
      const pieX = 60;
      const pieY = 90;
      const pieRadius = 25;
      
      const data = [
        { label: 'Capital Emprestado', value: totalLoaned, color: [139, 92, 246] }, // Violet
        { label: 'Capital a Receber', value: totalToReceive, color: [59, 130, 246] }, // Blue
        { label: 'Juros Recebidos', value: totalInterestReceived, color: [16, 185, 129] }, // Emerald
        { label: 'Juros a Receber', value: interestToReceive, color: [244, 63, 94] } // Rose
      ];
      
      const totalValue = data.reduce((acc, item) => acc + item.value, 0);
      let startAngle = 0;
      
      // Draw Pie Chart with Arcs
      if (totalValue > 0) {
        data.forEach(item => {
          if (item.value <= 0) return;
          const sliceAngle = (item.value / totalValue) * 2 * Math.PI;
          const endAngle = startAngle + sliceAngle;
          
          // Draw slice using many small lines to simulate arc
          const points: any[] = [[pieX, pieY]]; // Start at center
          const step = 0.05; // Resolution
          
          for (let a = startAngle; a < endAngle; a += step) {
             points.push([
               pieX + pieRadius * Math.cos(a),
               pieY + pieRadius * Math.sin(a)
             ]);
          }
          // Ensure the last point is exactly at endAngle
          points.push([
             pieX + pieRadius * Math.cos(endAngle),
             pieY + pieRadius * Math.sin(endAngle)
          ]);
          
          // Convert to PDF lines format
          // doc.lines expects relative coordinates from the first point, which is annoying.
          // Instead, we can construct a path string or use triangles fan.
          // Simpler approach for jsPDF: use lines with 'F' (fill) and absolute coords if possible, 
          // but doc.lines uses relative.
          // Let's use the raw PDF construction for circles or a polyfill approach.
          // Actually, constructing a polygon is easier.
          
          const polyPoints = points.map(p => ({ x: p[0], y: p[1] }));
          
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
          
          // Construct path manually
          // Move to center
          let path = ` ${pieX.toFixed(2)} ${ (297 - pieY).toFixed(2) } m`; // PDF uses bottom-left origin usually, but jsPDF abstracts this. 
          // Wait, jsPDF has a context-like API? No, standard API.
          // Let's use lines() with correct relative mapping.
          
          const lines = points.slice(1).map((p, i) => {
             const prev = i === 0 ? [pieX, pieY] : points[i];
             return [p[0] - prev[0], p[1] - prev[1]];
          });
          
          doc.lines(lines, pieX, pieY, [1, 1], 'F', true);
          
          startAngle = endAngle;
        });
      } else {
         doc.setDrawColor(200, 200, 200);
         doc.circle(pieX, pieY, pieRadius, 'S');
         doc.text('Sem dados', pieX - 10, pieY);
      }
      
      // Legend
      let legendY = 65;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      data.forEach(item => {
         doc.setFillColor(item.color[0], item.color[1], item.color[2]);
         doc.rect(100, legendY, 4, 4, 'F');
         doc.text(`${item.label}: R$ ${item.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 108, legendY + 3);
         legendY += 8;
      });
      
      let currentY = startY + 65;
      
      // Helper to calculate installments
      const getInstallments = (c: Contract) => {
        const installments = [];
        const monthlyVal = Number(c.monthly_interest);
        const paidTotal = Number(c.paid_amount || 0);
        const paidInstallmentsCount = Math.floor(Math.round(paidTotal * 100) / Math.round(monthlyVal * 100));
        
        const firstDueDate = new Date(c.end_date + 'T12:00:00');
        if (c.months > 1) firstDueDate.setMonth(firstDueDate.getMonth() - (c.months - 1));
        
        for (let i = 0; i < c.months; i++) {
          const dueDate = new Date(firstDueDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          const isPaid = i < paidInstallmentsCount || c.status === 'paid';
          let status = isPaid ? 'PAGO' : 'PENDENTE';
          
          // Check overdue
          if (!isPaid) {
             const now = new Date();
             now.setHours(12,0,0,0);
             if (now > dueDate) status = 'VENCIDO';
          }
          
          let payDate = '-';
          if (isPaid && c.payment_history && c.payment_history[i]) {
             payDate = new Date(c.payment_history[i] + 'T12:00:00').toLocaleDateString('pt-BR');
          } else if (isPaid && c.status === 'paid') {
             payDate = new Date(c.end_date + 'T12:00:00').toLocaleDateString('pt-BR'); // Fallback
          }

          installments.push({
            number: i + 1,
            dueDate: dueDate.toLocaleDateString('pt-BR'),
            value: monthlyVal,
            status,
            payDate
          });
        }
        return installments;
      };

      // Group by Client and Sort
      const clientsWithContracts = clients.map(client => {
         const clientContracts = contracts.filter(c => c.client_id === client.id);
         
         // Calculate Remaining Balance for Client
         let remCapital = 0;
         let remInterest = 0;
         let remTotal = 0;
         let hasOverdue = false;
         
         clientContracts.forEach(c => {
             const installments = getInstallments(c);
             if (installments.some(i => i.status === 'VENCIDO')) hasOverdue = true;
             
             if (c.status === 'paid') return;
             
             const totalAmt = Number(c.total_amount);
             const paidAmt = Number(c.paid_amount) || 0;
             const totalInt = Number(c.total_interest);
             const cap = Number(c.capital);
             
             const remaining = totalAmt - paidAmt;
             remTotal += remaining;
             
             // Interest first logic
             const paidInt = Math.min(paidAmt, totalInt);
             const paidCap = Math.max(0, paidAmt - totalInt);
             
             remInterest += (totalInt - paidInt);
             remCapital += (cap - paidCap);
         });

         return { 
            client, 
            contracts: clientContracts, 
            stats: { remCapital, remInterest, remTotal },
            hasOverdue
         };
      })
      .filter(g => g.contracts.length > 0 || g.stats.remTotal > 0)
      .sort((a, b) => {
          // Sort: Clients without overdue first, Clients WITH overdue last
          if (a.hasOverdue && !b.hasOverdue) return 1;
          if (!a.hasOverdue && b.hasOverdue) return -1;
          return a.client.full_name.localeCompare(b.client.full_name);
      });

      if (clientsWithContracts.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALHAMENTO POR CLIENTE', 20, currentY);
        currentY += 10;
        
        clientsWithContracts.forEach(group => {
           if (currentY > 230) { doc.addPage(); currentY = 20; }
           
           // Client Header
           // If overdue, use a reddish background to highlight, otherwise gray
           const headerColor = group.hasOverdue ? [254, 226, 226] : [243, 244, 246]; // Red-100 vs Gray-100
           
           doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
           doc.rect(14, currentY - 6, 182, 24, 'F'); 
           
           doc.setFontSize(11);
           doc.setFont('helvetica', 'bold');
           doc.setTextColor(17, 24, 39);
           
           const overdueLabel = group.hasOverdue ? ' (POSSUI VENCIMENTOS)' : '';
           const nameColor = group.hasOverdue ? [220, 38, 38] : [17, 24, 39];
           
           doc.setTextColor(nameColor[0], nameColor[1], nameColor[2]);
           doc.text(`CLIENTE: ${group.client.full_name}${overdueLabel}`, 20, currentY);
           
           doc.setFontSize(8);
           doc.setFont('helvetica', 'normal');
           doc.setTextColor(17, 24, 39);
           doc.text(`CPF: ${group.client.cpf || '-'} | TEL: ${group.client.phone || '-'}`, 20, currentY + 5);
           
           // Client Stats
           doc.setFont('helvetica', 'bold');
           doc.setTextColor(100, 100, 100);
           doc.text('A PAGAR:', 20, currentY + 12);
           
           doc.setTextColor(139, 92, 246); // Violet
           doc.text(`CAPITAL: R$ ${group.stats.remCapital.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 40, currentY + 12);
           
           doc.setTextColor(244, 63, 94); // Rose
           doc.text(`JUROS: R$ ${group.stats.remInterest.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 90, currentY + 12);
           
           doc.setTextColor(17, 24, 39); // Black
           doc.text(`TOTAL: R$ ${group.stats.remTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 140, currentY + 12);
           
           currentY += 25;
           
           // List contracts
           const sortedContracts = group.contracts.sort((a, b) => {
               // Sort contracts: Overdue ones last within the client too, or first?
               // Usually user wants to see problems first or last. User said "VENCIDO IRÁ PARA O FINAL".
               // Let's put overdue contracts at the end of the client's list too.
               const aInst = getInstallments(a);
               const bInst = getInstallments(b);
               const aOver = aInst.some(i => i.status === 'VENCIDO');
               const bOver = bInst.some(i => i.status === 'VENCIDO');
               if (aOver && !bOver) return 1;
               if (!aOver && bOver) return -1;
               return 0;
           });

           if (sortedContracts.length === 0) {
               doc.setFontSize(8);
               doc.setFont('helvetica', 'italic');
               doc.setTextColor(100, 100, 100);
               doc.text('(Sem contratos ativos)', 20, currentY);
               currentY += 10;
           }
           
           sortedContracts.forEach(c => {
               if (currentY > 250) { doc.addPage(); currentY = 20; }
               
               const installments = getInstallments(c);
               const isOverdue = installments.some(i => i.status === 'VENCIDO');
               const isPaid = c.status === 'paid';
               
               let statusColor = [139, 92, 246]; // Violet (Active)
               let statusText = 'ATIVO';
               
               if (isPaid) {
                  statusColor = [16, 185, 129]; // Green
                  statusText = 'LIQUIDADO';
               } else if (isOverdue) {
                  statusColor = [220, 38, 38]; // Red
                  statusText = 'VENCIDO';
               }
               
               doc.setFontSize(9);
               doc.setFont('helvetica', 'bold');
               doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
               doc.text(`CONTRATO (${statusText}) - Início: ${new Date(c.start_date).toLocaleDateString('pt-BR')} | Valor: R$ ${Number(c.capital).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, currentY);
               doc.setTextColor(0, 0, 0);
               currentY += 5;
               
               autoTable(doc, {
                 startY: currentY,
                 head: [['#', 'Vencimento', 'Valor', 'Status', 'Data Pagamento']],
                 body: installments.map(inst => [
                   inst.number,
                   inst.dueDate,
                   `R$ ${inst.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                   inst.status,
                   inst.payDate
                 ]),
                 styles: { fontSize: 8, cellPadding: 2 },
                 headStyles: { fillColor: statusColor as [number, number, number], fontSize: 8 },
                 columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 35 }
                 },
                 margin: { left: 20 }
               });
               currentY = (doc as any).lastAutoTable.finalY + 10;
           });
           
           currentY += 5; // Spacing between clients
        });
      }
      
      const safeFileName = user.full_name ? user.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'usuario';
      const fileName = `relatorio_geral_${safeFileName}_${dateStr.replace(/\//g, '-')}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          const pdfBase64 = doc.output('datauristring').split(',')[1];
          const result = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Documents,
          });
          
          await Share.share({
            title: 'Relatório Geral',
            text: 'Aqui está o seu relatório geral.',
            url: result.uri,
            dialogTitle: 'Compartilhar ou Salvar Relatório'
          });
        } catch (fsError) {
          console.error('Erro ao salvar arquivo no dispositivo:', fsError);
          alert('Erro ao salvar arquivo no dispositivo.');
        }
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };
  
  const handleLogout = async () => { 
    try {
      await supabase.auth.signOut(); 
    } catch (e) {
      console.error(e);
    }
    onClose(); 
  };

  const getRemainingProTime = () => {
    if (!user.pro_expires_at) return null;
    const now = new Date();
    const expires = new Date(user.pro_expires_at);
    if (expires <= now) return 'EXPIRADO';

    let months = expires.getMonth() - now.getMonth() + (12 * (expires.getFullYear() - now.getFullYear()));
    let days = expires.getDate() - now.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(expires.getFullYear(), expires.getMonth(), 0);
      days += prevMonth.getDate();
    }

    const parts = [];
    if (months > 0) parts.push(`${months} MÊS${months > 1 ? 'ES' : ''}`);
    if (days > 0) parts.push(`${days} DIA${days > 1 ? 'S' : ''}`);

    return parts.length > 0 ? parts.join(' E ') : 'MENOS DE 1 DIA';
  };

  const remainingTime = getRemainingProTime();

  return (
    <div className="fixed modal-safe bg-slate-900/50 backdrop-blur-sm flex items-start lg:items-start justify-center p-0 lg:p-4 lg:pt-10 z-[100] overflow-y-auto uppercase font-bold text-slate-900">
      <div className="glass-panel rounded-b-3xl lg:rounded-3xl w-full lg:max-w-2xl p-6 lg:p-8 space-y-5 animate-in shadow-2xl border border-slate-200 bg-white">
        <div className="flex justify-between items-start">
          <div className="flex flex-col text-slate-900">
            <h3 className="text-[13px] font-black text-slate-900 tracking-tighter uppercase leading-tight">
              {user.full_name}
              {user.display_id && <span className="text-slate-400 ml-2 font-bold text-[10px]">ID:{user.display_id}</span>}
            </h3>
            {user.is_pro ? (
              <div className="flex flex-col">
                <span className="text-violet-600 text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-1 mt-0.5">
                  VERSÃO PRO <Crown size={12} className="fill-violet-600" />
                </span>
                {user.pro_expires_at && (
                  <div className="text-[10px] text-slate-500 font-black tracking-[0.1em] uppercase mt-1 border-t border-slate-100 pt-1">
                    <p>INÍCIO: {user.pro_started_at ? new Date(user.pro_started_at).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    <p>TÉRMINO: {new Date(user.pro_expires_at).toLocaleDateString('pt-BR')}</p>
                    <p className="font-black text-violet-800">RESTAM: {remainingTime || 'EXPIRADO'}</p>
                    <div className="flex justify-start mt-2">
                      <button 
                        type="button" 
                        onClick={onUpgradeRequest}
                        className="bg-violet-600 text-white pt-[6px] pb-[5px] pl-[14px] pr-[15px] rounded-xl text-[9px] leading-[14px] font-bold uppercase tracking-widest hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 h-[31px] w-[154px] mt-0 mb-[-1px]"
                      >
                        Renovação de Plano
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-emerald-600 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">
                VERSÃO GRÁTIS
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors bg-slate-100 rounded-xl shrink-0 hover:bg-slate-200"><X size={20}/></button>
        </div>
        <div className="mt-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">E-mail</p>
            <p className="text-[12px] font-bold text-slate-900 truncate lowercase">{user.email}</p>
          </div>

          <div className="h-px bg-slate-50 w-full" />

          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">CPF</p>
            <p className="text-[12px] font-bold text-slate-900">
              {user.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
            </p>
          </div>

          <div className="h-px bg-slate-50 w-full" />

          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Contatos</p>
            <p className="text-[12px] font-bold text-slate-900">
              {user.phone.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
            </p>
          </div>
        </div>
        {!user.is_pro && <button type="button" onClick={onUpgradeRequest} className="mx-auto px-8 primary-gradient text-white py-2.5 rounded-full font-black text-[9px] uppercase tracking-[0.3em] shadow-xl hover:shadow-violet-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"><Crown size={14}/> ATIVAR PRO</button>}
        <div className="space-y-2">
          <button 
            type="button" 
            onClick={isPro ? onBackupRequest : () => setShowProMessage(true)} 
            className={`w-full h-[52px] rounded-full font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-start px-6 gap-2 border ${isPro ? 'bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200 active:scale-95 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
          >
            <Database size={16}/> BACKUP DE DADOS
          </button>

          <button 
            type="button" 
            onClick={generateReport} 
            disabled={generatingReport}
            className={`w-full h-[52px] rounded-full font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-start px-6 gap-2 border ${isPro ? 'bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200 active:scale-95 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
          >
            {generatingReport ? <RefreshCw size={16} className="animate-spin"/> : <FileBarChart size={16}/>} RELATÓRIO GERAL
          </button>
          
          <div className={`w-full h-[52px] rounded-full font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-between px-6 border box-border ${isPro ? 'bg-slate-100 text-slate-600 shadow-sm border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100'} lg:hidden`}>
            <div className="flex items-center gap-2">
              <Bell size={16}/> NOTIFICAÇÕES
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                disabled={!isPro || !localNotificationsEnabled}
                onClick={(e) => { e.stopPropagation(); setShowNotificationSettings(!showNotificationSettings); }}
                className={`p-1 rounded-full transition-colors ${isPro && localNotificationsEnabled ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-300 cursor-not-allowed'}`}
              >
                <Settings size={16} />
              </button>
              <button 
                type="button"
                onClick={isPro ? async (e) => {
                  e.stopPropagation();
                  const newState = !localNotificationsEnabled;
                  setLocalNotificationsEnabled(newState);
                  localStorage.setItem('local_notifications_enabled', newState.toString());
                  
                  import('../services/localNotifications').then(({ setupLocalNotifications, scheduleContractNotifications }) => {
                    if (newState) {
                      setupLocalNotifications().then(() => {
                        scheduleContractNotifications(contracts, clients, user?.pro_expires_at);
                      });
                    } else {
                      scheduleContractNotifications(contracts, clients, user?.pro_expires_at);
                    }
                  });
                } : () => setShowProMessage(true)}
                className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${isPro && localNotificationsEnabled ? 'bg-violet-500' : 'bg-slate-300'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isPro && localNotificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {isPro && localNotificationsEnabled && showNotificationSettings && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4 mt-0 ml-[24px] pt-[10px] pl-[16px] pr-[18px] pb-0 w-[263px] h-[227.594px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Horário do Aviso</span>
                  </div>
                  <input 
                    type="time" 
                    value={notifTime}
                    onChange={handleTimeChange}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-violet-500"
                  />
                </div>
                
                <div className="h-px bg-slate-200 w-full"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    {notifSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span className="text-[9px] font-black uppercase tracking-widest">Som da Notificação</span>
                  </div>
                  <button 
                    type="button"
                    onClick={toggleSound}
                    className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${notifSound ? 'bg-violet-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${notifSound ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="h-px bg-slate-200 w-full"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Smartphone size={16} className={notifVib ? 'animate-pulse' : ''} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Vibração</span>
                  </div>
                  <button 
                    type="button"
                    onClick={toggleVib}
                    className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${notifVib ? 'bg-violet-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${notifVib ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowNotificationSettings(false)}
                  className="w-full mt-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {showProMessage && !user.is_pro && (
            <p className="text-[8px] text-rose-500 font-black tracking-widest uppercase text-center animate-in fade-in slide-in-from-top-1">ESSA FUNÇÃO É PARA VERSÃO PRO</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 mt-4 mb-2">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              SUPORTE: <span className="lowercase font-bold text-slate-400">agicred.gestaodecredito@gmail.com</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              ACESSO WEB: <a href="https://agicred-9wto.onrender.com" target="_blank" rel="noopener noreferrer" className="lowercase font-bold text-violet-500 hover:text-violet-600 transition-colors">https://agicred-9wto.onrender.com</a>
            </span>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="w-full text-slate-400 hover:text-rose-600 transition-colors font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 pt-2"><LogOut size={16}/> SAIR DA CONTA</button>
      </div>
    </div>
  );
};

export default Dashboard;