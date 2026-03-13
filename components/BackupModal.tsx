import React, { useState } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface BackupModalProps {
  onClose: () => void;
  userId: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onClose, userId }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleBackup = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      // Fetch Clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId);

      if (clientsError) throw clientsError;

      // Fetch Contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId);

      if (contractsError) throw contractsError;

      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        clients: clients || [],
        contracts: contracts || []
      };

      const fileName = `agicred_backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonString = JSON.stringify(backupData, null, 2);

      if (Capacitor.isNativePlatform()) {
        try {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
          
          await Share.share({
            title: 'Backup Agicred',
            text: 'Aqui está o seu arquivo de backup.',
            url: result.uri,
            dialogTitle: 'Compartilhar ou Salvar Backup'
          });
        } catch (fsError) {
          console.error('Erro ao salvar arquivo no dispositivo:', fsError);
          throw new Error('Erro ao salvar arquivo no dispositivo.');
        }
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setStatus('success');
      setMessage('BACKUP REALIZADO COM SUCESSO!');
    } catch (error: any) {
      console.error('Backup error:', error);
      setStatus('error');
      setMessage('ERRO AO REALIZAR BACKUP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus('idle');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.clients || !data.contracts) {
        throw new Error('FORMATO DE ARQUIVO INVÁLIDO');
      }

      // ID Remapping to avoid collisions and RLS issues
      const idMap: Record<string, string> = {};
      
      const clientsToInsert = data.clients.map((c: any) => {
        const newId = crypto.randomUUID();
        idMap[c.id] = newId;
        
        return {
          id: newId,
          user_id: userId,
          full_name: c.full_name,
          cpf: c.cpf,
          birth_date: c.birth_date,
          phone: c.phone,
          address: c.address,
          city: c.city,
          workplace: c.workplace,
          created_at: c.created_at || new Date().toISOString()
        };
      });

      const contractsToInsert = data.contracts.map((c: any) => {
        // Only import contracts if the client exists in the backup
        if (!idMap[c.client_id]) return null;

        return {
          id: crypto.randomUUID(),
          user_id: userId,
          client_id: idMap[c.client_id], // Use the new client ID
          capital: c.capital,
          interest_rate: c.interest_rate,
          months: c.months,
          monthly_interest: c.monthly_interest,
          total_interest: c.total_interest,
          total_amount: c.total_amount,
          paid_amount: c.paid_amount,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status,
          created_at: c.created_at || new Date().toISOString()
        };
      }).filter((c: any) => c !== null);

      // Insert Clients (using insert instead of upsert since IDs are new)
      const { error: clientsError } = await supabase
        .from('clients')
        .insert(clientsToInsert);

      if (clientsError) throw clientsError;

      // Insert Contracts
      const { error: contractsError } = await supabase
        .from('contracts')
        .insert(contractsToInsert);

      if (contractsError) throw contractsError;

      setStatus('success');
      setMessage('DADOS RESTAURADOS COM NOVOS IDs!');
    } catch (error: any) {
      console.error('Restore error:', error);
      setStatus('error');
      setMessage('ERRO AO RESTAURAR: ' + error.message);
    } finally {
      setLoading(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in">
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] primary-gradient z-[120]" />
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">BACKUP & RESTAURAÇÃO</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm border border-slate-100">
                <Download size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase">EXPORTAR DADOS</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">BAIXE UMA CÓPIA DOS SEUS DADOS</p>
              </div>
            </div>
            <button
              onClick={handleBackup}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
              FAZER BACKUP
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase">IMPORTAR DADOS</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">RESTAURE DADOS DE UM ARQUIVO</p>
              </div>
            </div>
            <label className="w-full bg-white border border-slate-200 text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              SELECIONAR ARQUIVO
              <input type="file" accept=".json" onChange={handleRestore} className="hidden" disabled={loading} />
            </label>
          </div>

          {status === 'success' && (
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wide border border-emerald-100">
              <CheckCircle size={14} />
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wide border border-rose-100">
              <AlertCircle size={14} />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
