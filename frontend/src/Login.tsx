import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Fingerprint, ChevronRight, Lock, Binary } from 'lucide-react';
import { api } from './lib/api';
import { useAuthStore } from './lib/store'; // <--- 1. Importando a memória global

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'ACCESS_GRANTED' | 'ACCESS_DENIED'>('IDLE');
  
  // <--- 2. Pegando a função que autoriza a entrada no sistema
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('SCANNING');

    try {
      // Simula tempo de processamento criptográfico (efeito visual)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await api.post('/auth/login', { username, password });
      
      if (response.status === 200) {
        setStatus('ACCESS_GRANTED');
        console.log("Credenciais Válidas:", response.data);
        
        // <--- 3. O PULO DO GATO:
        // Aguarda 1 segundo para você ver a mensagem verde e então troca a tela
        setTimeout(() => {
            login(response.data); 
        }, 1000);
      }
    } catch (error) {
      console.error("Falha na autenticação", error);
      setStatus('ACCESS_DENIED');
      setTimeout(() => setStatus('IDLE'), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-arasaka-bg flex items-center justify-center p-4 relative overflow-hidden font-sans text-arasaka-text">
      
      {/* --- EFEITOS DE FUNDO (ATMOSFERA) --- */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(0deg,transparent_24%,rgba(220,38,38,0.3)_25%,rgba(220,38,38,0.3)_26%,transparent_27%,transparent_74%,rgba(220,38,38,0.3)_75%,rgba(220,38,38,0.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(220,38,38,0.3)_25%,rgba(220,38,38,0.3)_26%,transparent_27%,transparent_74%,rgba(220,38,38,0.3)_75%,rgba(220,38,38,0.3)_76%,transparent_77%,transparent)] bg-[length:50px_50px]" />
      <div className="absolute inset-0 animate-scanline bg-gradient-to-b from-transparent via-arasaka-primary/5 to-transparent pointer-events-none h-32" />
      
      {/* --- CARTÃO DE LOGIN --- */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-arasaka-surface border border-arasaka-border relative z-10 shadow-[0_0_50px_rgba(220,38,38,0.15)] backdrop-blur-sm"
      >
        {/* Cabeçalho */}
        <div className="bg-black/50 border-b border-arasaka-primary/30 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-arasaka-primary">
            <ShieldAlert size={24} strokeWidth={1.5} />
            <span className="font-display font-bold tracking-[0.2em] text-xl">ARASAKA</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-arasaka-muted font-mono">
            <Binary size={12} />
            <span>SECURE.NET.V2</span>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-display text-white tracking-widest uppercase">
              Verificação de Identidade
            </h2>
            <p className="text-arasaka-muted text-xs font-mono border-l-2 border-arasaka-primary pl-3 ml-10 text-left">
              AVISO: O acesso não autorizado a este sistema é uma violação de Classe 5. As contra-medidas são letais.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Input Usuário */}
            <div className="space-y-1">
              <label className="text-[10px] text-arasaka-primary font-bold font-mono tracking-wider uppercase">
                ID Corporativo
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-arasaka-border p-3 text-white font-mono text-sm focus:border-arasaka-primary focus:outline-none focus:ring-1 focus:ring-arasaka-primary transition-all pl-10 placeholder-arasaka-muted/30"
                  placeholder="ARASAKA-ID..."
                />
                <Fingerprint className="absolute left-3 top-3 text-arasaka-muted group-focus-within:text-arasaka-primary transition-colors" size={18} />
              </div>
            </div>

            {/* Input Senha */}
            <div className="space-y-1">
              <label className="text-[10px] text-arasaka-primary font-bold font-mono tracking-wider uppercase">
                Chave de Acesso
              </label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-arasaka-border p-3 text-white font-mono text-sm focus:border-arasaka-primary focus:outline-none focus:ring-1 focus:ring-arasaka-primary transition-all pl-10 placeholder-arasaka-muted/30"
                  placeholder="••••••••••••"
                />
                <Lock className="absolute left-3 top-3 text-arasaka-muted group-focus-within:text-arasaka-primary transition-colors" size={18} />
              </div>
            </div>

            {/* Botão de Ação */}
            <button 
              disabled={status === 'SCANNING' || status === 'ACCESS_GRANTED'}
              type="submit" 
              className={`
                w-full p-4 font-bold font-display tracking-widest transition-all flex items-center justify-center gap-2 group relative overflow-hidden
                ${status === 'ACCESS_DENIED' ? 'bg-red-900/80 text-white border-red-500' : 'bg-arasaka-primary hover:bg-arasaka-accent text-black'}
                ${status === 'ACCESS_GRANTED' ? 'bg-green-600 text-white' : ''}
              `}
            >
              {status === 'SCANNING' ? (
                <span className="animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full animate-bounce"/>
                  DESCRIPTOGRAFANDO...
                </span>
              ) : status === 'ACCESS_DENIED' ? (
                <span className="flex items-center gap-2">
                  <ShieldAlert size={18} /> ACESSO NEGADO
                </span>
              ) : status === 'ACCESS_GRANTED' ? (
                <span className="flex items-center gap-2">
                   ACESSO AUTORIZADO
                </span>
              ) : (
                <>
                  INICIAR UPLINK <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé Status */}
        <div className="bg-black p-2 border-t border-arasaka-border flex justify-between text-[10px] font-mono text-arasaka-muted uppercase px-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Node: MANAUS-01
          </span>
          <span className={status === 'ACCESS_GRANTED' ? 'text-green-500 font-bold' : status === 'ACCESS_DENIED' ? 'text-red-500 font-bold' : 'text-arasaka-primary animate-pulse'}>
            STATUS: {status === 'IDLE' ? 'AGUARDANDO INPUT' : status}
          </span>
        </div>
      </motion.div>
    </div>
  );
}