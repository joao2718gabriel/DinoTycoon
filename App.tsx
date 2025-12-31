
import React, { useState, useEffect, useMemo } from 'react';
import { DINOSAURS, INITIAL_STATE } from './constants';
import { DinosaurType, Rarity, User, Dinosaur, FriendRequest, DeployedDino } from './types';
import { PixelDino } from './components/PixelDino';

type Screen = 'TERRITORIO' | 'SHOP' | 'ALBUM' | 'PROFILE' | 'FRIENDS' | 'VIEW_PROFILE';
type AuthMode = 'LOGIN' | 'REGISTER';
type ShopTab = 'GERAL' | 'LIMITADO';
type SocialTab = 'MEUS_AMIGOS' | 'PEDIDOS' | 'BUSCAR';

interface OfflineReport {
  seconds: number;
  profit: number;
  incomePerSec: number;
}

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  
  // --- Game State ---
  const [money, setMoney] = useState(0);
  const [ownedDinos, setOwnedDinos] = useState<Record<DinosaurType, number[]>>(INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>);
  const [territoryDinos, setTerritoryDinos] = useState<DeployedDino[]>([]);
  const [activeScreen, setActiveScreen] = useState<Screen>('TERRITORIO');
  const [shopTab, setShopTab] = useState<ShopTab>('GERAL');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [selectedTerritoryDino, setSelectedTerritoryDino] = useState<DeployedDino | null>(null);
  const [shopDinoDetail, setShopDinoDetail] = useState<Dinosaur | null>(null);
  const [showDeployList, setShowDeployList] = useState(false);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  
  // --- Market State ---
  const [marketStock, setMarketStock] = useState<Record<string, number>>({});
  
  // --- Social State ---
  const [socialTab, setSocialTab] = useState<SocialTab>('MEUS_AMIGOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // --- Profile Edit State ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ avatarType: 'VELOCIRAPTOR' as DinosaurType, password: '' });

  // --- Derived Data ---
  const totalIncome = useMemo(() => {
    return territoryDinos.reduce((acc, deployed) => {
      const dino = DINOSAURS[deployed.type];
      return acc + (dino?.incomePerSecond || 0);
    }, 0);
  }, [territoryDinos]);

  const pendingRequestsCount = currentUser?.friendRequests?.length || 0;

  // --- Helpers ---
  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 4000);
  };

  const getAllUsers = (): User[] => JSON.parse(localStorage.getItem('dino_users') || '[]');

  const saveToStorage = (user: User) => {
    const users = getAllUsers();
    const index = users.findIndex((u: User) => u.id === user.id);
    if (index > -1) users[index] = user;
    else users.push(user);
    localStorage.setItem('dino_users', JSON.stringify(users));
  };

  const updateMarketStock = (dinoId: string, newStock: number) => {
    const stock = { ...marketStock, [dinoId]: newStock };
    setMarketStock(stock);
    localStorage.setItem('dino_market_stock', JSON.stringify(stock));
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  // --- Offline Earnings Calculation ---
  const calculateOfflineEarnings = (user: User) => {
    if (!user.lastActiveAt) return;
    
    const lastActive = new Date(user.lastActiveAt).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastActive) / 1000);
    
    // Mínimo de 30 segundos offline para gerar relatório, máximo de 24 horas (opcional)
    if (diffSeconds >= 30) {
      const income = (user.territoryDinos || []).reduce((acc, deployed) => {
        const dino = DINOSAURS[deployed.type];
        return acc + (dino?.incomePerSecond || 0);
      }, 0);
      
      const profit = diffSeconds * income;
      if (profit > 0) {
        setOfflineReport({
          seconds: diffSeconds,
          profit: profit,
          incomePerSec: income
        });
        setMoney(prev => prev + profit);
      }
    }
  };

  // --- Syncing ---
  useEffect(() => {
    const savedStock = localStorage.getItem('dino_market_stock');
    if (savedStock) {
      setMarketStock(JSON.parse(savedStock));
    } else {
      const initialStock: Record<string, number> = {};
      Object.values(DINOSAURS).forEach(d => {
        if (d.isLimited) initialStock[d.id] = d.initialStock || 0;
      });
      setMarketStock(initialStock);
      localStorage.setItem('dino_market_stock', JSON.stringify(initialStock));
    }

    const session = localStorage.getItem('dino_session');
    if (session) {
      const user = JSON.parse(session);
      const latestUser = getAllUsers().find(u => u.id === user.id);
      if (latestUser) {
        setCurrentUser(latestUser);
        setMoney(latestUser.money);
        setOwnedDinos(latestUser.ownedDinos);
        setTerritoryDinos(latestUser.territoryDinos || []);
        calculateOfflineEarnings(latestUser);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const updatedUser = { 
        ...currentUser, 
        money, 
        ownedDinos, 
        territoryDinos,
        lastActiveAt: new Date().toISOString() 
      };
      localStorage.setItem('dino_session', JSON.stringify(updatedUser));
      saveToStorage(updatedUser);
    }
  }, [money, ownedDinos, territoryDinos]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      setMoney(prev => prev + totalIncome);
    }, 1000);
    return () => clearInterval(timer);
  }, [totalIncome, currentUser]);

  // --- Auth Handlers ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getAllUsers();
    if (authMode === 'REGISTER') {
      const usernameLower = authForm.username.toLowerCase();
      const emailLower = authForm.email.toLowerCase();

      if (users.some((u: User) => u.username.toLowerCase() === usernameLower)) {
        return triggerNotification("ESTE NOME DE USUÁRIO JÁ ESTÁ EM USO!");
      }
      if (users.some((u: User) => u.email.toLowerCase() === emailLower)) {
        return triggerNotification("ESTE E-MAIL JÁ ESTÁ EM USO!");
      }

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        username: authForm.username,
        displayName: authForm.username,
        email: authForm.email,
        passwordHash: authForm.password,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        avatarType: 'VELOCIRAPTOR',
        money: 100,
        ownedDinos: INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>,
        territoryDinos: [],
        friends: [],
        friendRequests: []
      };
      saveToStorage(newUser);
      triggerNotification("CONTA CRIADA COM SUCESSO!");
      setAuthMode('LOGIN');
    } else {
      const loginInput = authForm.email.toLowerCase();
      const user = users.find((u: User) => 
        (u.email.toLowerCase() === loginInput || u.username.toLowerCase() === loginInput) && 
        u.passwordHash === authForm.password
      );
      if (user) {
        setCurrentUser(user);
        setMoney(user.money);
        setOwnedDinos(user.ownedDinos);
        setTerritoryDinos(user.territoryDinos || []);
        localStorage.setItem('dino_session', JSON.stringify(user));
        calculateOfflineEarnings(user);
        triggerNotification(`BEM-VINDO DE VOLTA!`);
      } else {
        triggerNotification("DADOS INVÁLIDOS!");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dino_session');
    setCurrentUser(null);
    setActiveScreen('TERRITORIO');
    setIsEditingProfile(false);
    setOfflineReport(null);
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    const updatedUser = { 
      ...currentUser, 
      avatarType: editForm.avatarType,
      passwordHash: editForm.password || currentUser.passwordHash
    };
    setCurrentUser(updatedUser);
    saveToStorage(updatedUser);
    localStorage.setItem('dino_session', JSON.stringify(updatedUser));
    setIsEditingProfile(false);
    triggerNotification("PERFIL ATUALIZADO!");
  };

  // --- Territory Logic ---
  const deployDino = (type: DinosaurType, serial: number) => {
    if (territoryDinos.length >= 5) return triggerNotification("TERRITÓRIO LOTADO! (MÁX 5)");
    const isAlreadyDeployed = territoryDinos.some(d => d.type === type && d.serial === serial);
    if (isAlreadyDeployed) return triggerNotification("ESTE DINO JÁ ESTÁ NO TERRITÓRIO!");

    const newDeployed: DeployedDino = {
      instanceId: Math.random().toString(36).substr(2, 9),
      type,
      serial
    };

    setTerritoryDinos(prev => [...prev, newDeployed]);
    setShowDeployList(false);
    triggerNotification(`${DINOSAURS[type].name} ALOCADO!`);
  };

  const undeployDino = (instanceId: string) => {
    setTerritoryDinos(prev => prev.filter(d => d.instanceId !== instanceId));
    setSelectedTerritoryDino(null);
    triggerNotification("REMOVIDO DO TERRITÓRIO.");
  };

  // --- Shop Logic ---
  const buyDino = (dino: Dinosaur) => {
    if (money < dino.price) return triggerNotification("DINHEIRO INSUFICIENTE!");
    let serial = 0;
    if (dino.isLimited) {
      const currentStock = marketStock[dino.id] || 0;
      if (currentStock <= 0) return triggerNotification("ESGOTADO!");
      serial = (dino.initialStock || 0) - currentStock + 1;
      updateMarketStock(dino.id, currentStock - 1);
    }
    setMoney(prev => prev - dino.price);
    setOwnedDinos(prev => {
      const currentSerials = prev[dino.id] || [];
      return { ...prev, [dino.id]: [...currentSerials, serial] };
    });
    setShopDinoDetail(null);
    triggerNotification(`${dino.name} ADQUIRIDO!`);
  };

  const getRarityStyles = (rarity: Rarity) => {
    switch (rarity) {
      case 'LENDARIO': return { text: 'text-yellow-400', bg: 'bg-yellow-900', border: 'border-white', label: 'LENDÁRIO' };
      case 'EPICO': return { text: 'text-purple-400', bg: 'bg-purple-900', border: 'border-yellow-500', label: 'ÉPICO' };
      case 'RARO': return { text: 'text-blue-400', bg: 'bg-blue-900', border: 'border-blue-500', label: 'RARO' };
      default: return { text: 'text-gray-400', bg: 'bg-gray-700', border: 'border-neutral-600', label: 'COMUM' };
    }
  };

  // --- Social Logic ---
  const sendFriendRequest = (targetId: string) => {
    if (!currentUser) return;
    const users = getAllUsers();
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) return triggerNotification("USUÁRIO NÃO ENCONTRADO!");
    if (targetUser.friendRequests.some(r => r.fromId === currentUser.id)) return triggerNotification("PEDIDO JÁ ENVIADO!");
    const newRequest: FriendRequest = { fromId: currentUser.id, fromUsername: currentUser.username };
    targetUser.friendRequests.push(newRequest);
    saveToStorage(targetUser);
    triggerNotification("PEDIDO ENVIADO!");
  };

  const acceptFriendRequest = (requestId: string) => {
    if (!currentUser) return;
    const users = getAllUsers();
    const otherUser = users.find(u => u.id === requestId);
    const updatedMe = { ...currentUser };
    if (otherUser) {
      if (!updatedMe.friends.includes(requestId)) updatedMe.friends.push(requestId);
      if (!otherUser.friends.includes(updatedMe.id)) otherUser.friends.push(updatedMe.id);
      updatedMe.friendRequests = updatedMe.friendRequests.filter(r => r.fromId !== requestId);
      saveToStorage(otherUser);
      setCurrentUser(updatedMe);
      saveToStorage(updatedMe);
      triggerNotification("AMIZADE ACEITA!");
    }
  };

  const removeFriend = (friendId: string) => {
    if (!currentUser) return;
    const users = getAllUsers();
    const otherUser = users.find(u => u.id === friendId);
    const updatedMe = { ...currentUser };
    updatedMe.friends = updatedMe.friends.filter(id => id !== friendId);
    if (otherUser) {
      otherUser.friends = otherUser.friends.filter(id => id !== updatedMe.id);
      saveToStorage(otherUser);
    }
    setCurrentUser(updatedMe);
    saveToStorage(updatedMe);
  };

  // --- UI Components ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
        <div className="w-full max-sm bg-neutral-900 pixel-border p-8 text-center">
          <div className="flex justify-center mb-6">
            <PixelDino type="TREX" size={100} className="animate-bounce" />
          </div>
          <h1 className="text-lg text-yellow-500 mb-8 uppercase tracking-tighter">DINO PIXEL TYCOON</h1>
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'REGISTER' && (
              <div className="text-left">
                <label className="text-[7px] text-neutral-500 block mb-1 uppercase tracking-tighter">Nome de Usuário</label>
                <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 uppercase text-white" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required />
              </div>
            )}
            <div className="text-left">
              <label className="text-[7px] text-neutral-500 block mb-1 uppercase tracking-tighter">{authMode === 'LOGIN' ? 'E-mail ou Usuário' : 'E-mail'}</label>
              <input type="text" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 text-white" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
            </div>
            <div className="text-left">
              <label className="text-[7px] text-neutral-500 block mb-1 uppercase tracking-tighter">Senha</label>
              <input type="password" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 text-white" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            </div>
            <button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 text-[9px] font-bold border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all">
              {authMode === 'LOGIN' ? 'ENTRAR' : 'CADASTRAR'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="mt-8 text-[7px] text-neutral-500 hover:text-white uppercase transition-colors">
            {authMode === 'LOGIN' ? 'Não tem conta? Registre-se' : 'Já possui conta? Faça login'}
          </button>
        </div>
        {showNotification && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-neutral-900 border-4 border-white px-8 py-4 text-[10px] z-[100] animate-bounce text-yellow-500 uppercase font-bold text-center max-w-[80vw]">
            {showNotification}
          </div>
        )}
      </div>
    );
  }

  const renderTerritoryScreen = () => {
    const slots = [0, 1, 2, 3, 4];
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-xl text-yellow-400 mb-2 uppercase tracking-widest">Território</h2>
          <p className="text-[7px] text-neutral-500 uppercase tracking-tighter">Até 5 dinossauros ativos para gerar renda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full max-w-4xl">
          {slots.map(i => {
            const deployed = territoryDinos[i];
            return (
              <div 
                key={i} 
                className={`h-48 pixel-border flex flex-col items-center justify-center relative transition-all ${deployed ? 'bg-neutral-800 cursor-pointer hover:bg-neutral-700' : 'bg-neutral-900/50 border-2 border-dashed border-neutral-800'}`}
                onClick={() => deployed ? setSelectedTerritoryDino(deployed) : setShowDeployList(true)}
              >
                {deployed ? (
                  <>
                    <div className="animate-bounce mb-4">
                      <PixelDino type={deployed.type} size={64} />
                    </div>
                    <p className="text-[7px] uppercase font-bold text-white text-center px-1 font-pixel tracking-tighter">{DINOSAURS[deployed.type].name}</p>
                    <p className="text-[6px] text-green-400 mt-1 font-bold">+R$ {DINOSAURS[deployed.type].incomePerSecond}/s</p>
                    {deployed.serial > 0 && <span className="absolute top-2 right-2 text-[5px] text-orange-400 font-bold">#{deployed.serial}</span>}
                  </>
                ) : (
                  <div className="flex flex-col items-center opacity-30">
                    <span className="text-2xl mb-2 text-neutral-500">+</span>
                    <span className="text-[6px] uppercase tracking-tighter">Vazio</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProfileScreen = () => {
    if (!currentUser) return null;

    if (isEditingProfile) {
      return (
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
          <h2 className="text-xl text-blue-400 mb-4 uppercase tracking-widest">Editar Perfil</h2>
          <div className="w-full bg-neutral-900 pixel-border p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-[8px] text-neutral-500 uppercase block tracking-tighter font-bold">Escolha seu Avatar</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {(Object.keys(DINOSAURS) as DinosaurType[]).map(type => (
                  <div 
                    key={type} 
                    onClick={() => setEditForm({...editForm, avatarType: type})}
                    className={`p-2 border-2 cursor-pointer transition-all flex items-center justify-center ${editForm.avatarType === type ? 'border-blue-500 bg-neutral-800 scale-105 shadow-lg shadow-blue-500/20' : 'border-neutral-800 opacity-40 grayscale'}`}
                  >
                    <PixelDino type={type} size={32} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[8px] text-neutral-500 uppercase block tracking-tighter font-bold">Alterar Senha</label>
              <input 
                type="password"
                className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] focus:outline-none focus:border-blue-500 text-white" 
                placeholder="NOVA SENHA..."
                value={editForm.password}
                onChange={e => setEditForm({...editForm, password: e.target.value})}
              />
              <p className="text-[6px] text-neutral-600 uppercase">Deixe em branco para não alterar.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                onClick={handleSaveProfile} 
                className="bg-blue-600 hover:bg-blue-500 text-white border-b-4 border-blue-900 py-4 text-[8px] uppercase font-bold active:border-b-0 active:translate-y-1 transition-all"
               >
                 SALVAR
               </button>
               <button 
                onClick={() => setIsEditingProfile(false)} 
                className="bg-neutral-800 hover:bg-neutral-700 text-white border-b-4 border-neutral-950 py-4 text-[8px] uppercase font-bold active:border-b-0 active:translate-y-1 transition-all"
               >
                 CANCELAR
               </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
         <div className="w-full bg-neutral-900 pixel-border p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
           <div className="p-4 bg-neutral-800 border-4 border-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.2)]">
             <PixelDino type={currentUser.avatarType} size={80} />
           </div>
           <div className="text-center md:text-left flex-1">
             <h3 className="text-lg uppercase text-white tracking-widest">{currentUser.username}</h3>
             <p className="text-[6px] text-neutral-500 tracking-tighter mt-1 uppercase font-bold">ID: {currentUser.id}</p>
             <p className="text-[7px] text-blue-400 uppercase font-bold tracking-widest mt-1">{currentUser.email}</p>
           </div>
           <div className="flex flex-col gap-2 w-full md:w-auto">
            <button 
              onClick={() => {
                setEditForm({ avatarType: currentUser.avatarType, password: '' });
                setIsEditingProfile(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white border-b-4 border-blue-900 py-3 px-6 text-[7px] uppercase font-bold active:border-b-0 active:translate-y-1 transition-all"
            >
              EDITAR PERFIL
            </button>
            <button 
              onClick={handleLogout} 
              className="bg-red-900/40 text-red-500 border-4 border-red-900 py-3 px-6 text-[7px] uppercase font-bold hover:bg-red-900/60 active:scale-95 transition-all"
            >
              LOGOUT
            </button>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900 pixel-border p-6 flex flex-col items-center">
              <span className="text-[7px] text-neutral-500 uppercase mb-2 font-bold">Capital Total</span>
              <span className="text-md text-yellow-500 font-bold">R$ {formatCurrency(money)}</span>
            </div>
            <div className="bg-neutral-900 pixel-border p-6 flex flex-col items-center">
              <span className="text-[7px] text-neutral-500 uppercase mb-2 font-bold">Renda por Segundo</span>
              <span className="text-md text-green-500 font-bold">+R$ {totalIncome}/s</span>
            </div>
         </div>

         <div className="space-y-4">
           <h2 className="text-md text-purple-400 uppercase tracking-widest font-bold px-2">Minha Coleção</h2>
           <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {(Object.values(DINOSAURS) as Dinosaur[]).map((dino) => {
                const serials: number[] = (ownedDinos[dino.id] as number[]) || [];
                const isOwned = serials.length > 0;
                if (!isOwned) return null;
                return (
                  <div key={dino.id} className="p-4 bg-neutral-900 border-4 border-neutral-800 flex flex-col items-center shadow-lg">
                     <PixelDino type={dino.id} size={40} />
                     <p className="text-[6px] mt-4 text-center uppercase tracking-tighter text-white font-bold">{dino.name}</p>
                     <p className="text-[5px] text-yellow-500 mt-1 font-bold">{serials.length} UN.</p>
                  </div>
                );
              })}
           </div>
         </div>
      </div>
    );
  };

  const renderViewProfile = () => {
    if (!viewingUser) return null;
    const income = (viewingUser.territoryDinos || []).reduce((acc, deployed) => {
      const dino = DINOSAURS[deployed.type];
      return acc + (dino?.incomePerSecond || 0);
    }, 0);

    return (
      <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
        <button onClick={() => setActiveScreen('FRIENDS')} className="self-start text-[8px] text-pink-500 hover:text-white uppercase mb-4 tracking-tighter font-bold">&lt; VOLTAR SOCIAL</button>
        <div className="w-full bg-neutral-900 pixel-border p-8 flex flex-col items-center gap-6 mb-8">
           <div className="p-6 bg-neutral-800 border-4 border-pink-500 rounded-full shadow-lg"><PixelDino type={viewingUser.avatarType} size={80} /></div>
           <div className="text-center">
             <h3 className="text-lg uppercase text-white tracking-widest font-pixel">{viewingUser.username}</h3>
             <p className="text-[7px] text-neutral-500 uppercase mt-2 font-bold">CAPITAL: R$ {formatCurrency(viewingUser.money)}</p>
             <p className="text-[7px] text-green-500 uppercase mt-1 font-bold">RENDA: R$ {income}/s</p>
           </div>
        </div>
        <h2 className="text-md text-yellow-500 uppercase mb-4 tracking-widest font-bold">Território de {viewingUser.username}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
          {(viewingUser.territoryDinos || []).map((deployed, idx) => (
            <div key={`${deployed.type}-${idx}`} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex flex-col items-center gap-2 shadow-inner">
               <PixelDino type={deployed.type} size={40} />
               <p className="text-[6px] text-white uppercase text-center font-bold tracking-tighter">{DINOSAURS[deployed.type].name}</p>
            </div>
          ))}
          {(viewingUser.territoryDinos || []).length === 0 && <p className="col-span-full text-center text-[7px] text-neutral-500 py-10 uppercase italic font-bold">Território vazio.</p>}
        </div>
      </div>
    );
  };

  const renderSocialScreen = () => {
    const allUsers = getAllUsers();
    const filteredUsers = searchQuery.length >= 2 
      ? allUsers.filter(u => u.id !== currentUser.id && (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.id === searchQuery.toUpperCase()))
      : [];
    const myFriends = allUsers.filter(u => currentUser.friends.includes(u.id));

    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
        <h2 className="text-xl text-pink-400 mb-4 uppercase tracking-widest font-bold">Social Hub</h2>
        <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6">
          <button onClick={() => setSocialTab('MEUS_AMIGOS')} className={`flex-1 py-3 text-[7px] font-bold tracking-tighter transition-all ${socialTab === 'MEUS_AMIGOS' ? 'bg-pink-600 text-black shadow-inner' : 'text-neutral-500'}`}>AMIGOS</button>
          <button onClick={() => setSocialTab('PEDIDOS')} className={`flex-1 py-3 text-[7px] font-bold tracking-tighter relative transition-all ${socialTab === 'PEDIDOS' ? 'bg-purple-600 text-black shadow-inner' : 'text-neutral-500'}`}>PEDIDOS {pendingRequestsCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[5px] w-3 h-3 flex items-center justify-center border border-black font-bold animate-pulse">!</span>}</button>
          <button onClick={() => setSocialTab('BUSCAR')} className={`flex-1 py-3 text-[7px] font-bold tracking-tighter transition-all ${socialTab === 'BUSCAR' ? 'bg-blue-600 text-black shadow-inner' : 'text-neutral-500'}`}>BUSCAR</button>
        </div>
        <div className="w-full bg-neutral-900 pixel-border p-6 min-h-[400px]">
          {socialTab === 'BUSCAR' && (
            <div className="space-y-6">
              <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] focus:outline-none focus:border-pink-500 uppercase text-white font-bold" placeholder="NOME OU ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <div className="space-y-4">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700 hover:border-pink-500 transition-colors">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingUser(u); setActiveScreen('VIEW_PROFILE'); }}>
                      <PixelDino type={u.avatarType} size={32} />
                      <div><p className="text-[8px] uppercase font-bold text-white tracking-tighter">{u.username}</p><p className="text-[6px] text-neutral-500">ID: {u.id}</p></div>
                    </div>
                    <button onClick={() => sendFriendRequest(u.id)} disabled={currentUser.friends.includes(u.id)} className="bg-green-700 hover:bg-green-600 text-[6px] p-2 border-b-2 border-green-900 active:translate-y-1 active:border-b-0 font-bold transition-all uppercase">{currentUser.friends.includes(u.id) ? "AMIGO" : "PEDIR"}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {socialTab === 'MEUS_AMIGOS' && (
            <div className="space-y-4">
              {myFriends.map(f => (
                <div key={f.id} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700 hover:border-pink-500 transition-colors">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingUser(f); setActiveScreen('VIEW_PROFILE'); }}>
                    <PixelDino type={f.avatarType} size={32} />
                    <div><p className="text-[8px] uppercase font-bold text-white tracking-tighter">{f.username}</p><p className="text-[6px] text-green-500 font-bold">ONLINE</p></div>
                  </div>
                  <button onClick={() => removeFriend(f.id)} className="bg-red-800 hover:bg-red-700 text-[5px] p-2 border-b-2 border-red-950 uppercase font-bold active:translate-y-1 active:border-b-0 transition-all">Banir</button>
                </div>
              ))}
            </div>
          )}
          {socialTab === 'PEDIDOS' && (
            <div className="space-y-4">
              {currentUser.friendRequests.map(r => (
                <div key={r.fromId} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700">
                  <p className="text-[8px] uppercase font-bold text-white tracking-tighter">{r.fromUsername}</p>
                  <div className="flex gap-2">
                    <button onClick={() => acceptFriendRequest(r.fromId)} className="bg-green-700 hover:bg-green-600 text-[5px] p-2 border-b-2 border-green-900 uppercase font-bold transition-all active:translate-y-1 active:border-b-0">Sim</button>
                    <button className="bg-red-900 hover:bg-red-800 text-[5px] p-2 border-b-2 border-red-950 uppercase font-bold transition-all active:translate-y-1 active:border-b-0">Não</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDinoModal = (dino: Dinosaur) => {
    if (!dino) return null;
    const styles = getRarityStyles(dino.rarity);
    const isOwnedGeneral = !dino.isLimited && (ownedDinos[dino.id] || []).length > 0;
    const stock = marketStock[dino.id] || 0;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShopDinoDetail(null)}>
        <div className="bg-neutral-900 pixel-border w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShopDinoDetail(null)} className="absolute -top-4 -right-4 bg-red-600 text-white w-8 h-8 flex items-center justify-center border-2 border-black font-bold shadow-xl">X</button>
          <div className="flex flex-col items-center gap-6">
            <div className={`p-8 bg-neutral-800 border-4 ${styles.border} transition-transform hover:scale-105`}><PixelDino type={dino.id} size={100} /></div>
            <div className="text-center space-y-3">
              <span className={`text-[6px] px-2 py-1 ${styles.bg} ${styles.text} uppercase font-bold border border-black`}>{styles.label}</span>
              <h3 className="text-lg text-white uppercase tracking-widest">{dino.name}</h3>
              <p className="text-[7px] text-neutral-400 leading-relaxed px-2 uppercase tracking-tighter font-bold">{dino.description}</p>
            </div>
            <div className="w-full space-y-4 pt-4 border-t border-neutral-800">
              <div className="flex justify-between items-center text-[8px] uppercase tracking-tighter"><span className="text-neutral-500 font-bold">Custo:</span><span className="text-yellow-500 font-bold">R$ {dino.price.toLocaleString()}</span></div>
              <div className="flex justify-between items-center text-[8px] uppercase tracking-tighter"><span className="text-neutral-500 font-bold">Renda:</span><span className="text-green-500 font-bold">+R$ {dino.incomePerSecond}/s</span></div>
              {dino.isLimited && <div className="flex justify-between items-center text-[8px] uppercase tracking-tighter"><span className="text-neutral-500 font-bold">Estoque:</span><span className="text-orange-500 font-bold">{stock} UN.</span></div>}
              <button 
                onClick={() => buyDino(dino)}
                disabled={isOwnedGeneral || (dino.isLimited && stock <= 0) || money < dino.price}
                className={`w-full py-4 text-[10px] font-bold border-b-4 transition-all ${isOwnedGeneral ? 'bg-neutral-700 opacity-50 cursor-not-allowed border-neutral-800 text-neutral-400' : money >= dino.price ? 'bg-green-600 border-green-900 hover:bg-green-500 text-white active:translate-y-1 active:border-b-0' : 'bg-neutral-800 opacity-50 border-neutral-950 text-neutral-500'}`}
              >
                {isOwnedGeneral ? 'JÁ POSSUI' : (dino.isLimited && stock <= 0) ? 'ESGOTADO' : `CONFIRMAR COMPRA`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOfflineModal = () => {
    if (!offlineReport) return null;
    return (
      <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6">
        <div className="bg-neutral-900 pixel-border w-full max-w-sm p-8 text-center flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
          <div className="p-6 bg-neutral-800 border-4 border-green-500 rounded-lg animate-pulse">
            <PixelDino type="TREX" size={80} />
          </div>
          <h2 className="text-lg text-green-400 uppercase tracking-widest font-bold">BEM-VINDO DE VOLTA!</h2>
          <div className="space-y-4 w-full bg-neutral-800 p-6 border-2 border-neutral-700 shadow-inner">
             <div className="flex justify-between items-center text-[8px] uppercase font-bold"><span className="text-neutral-500">Tempo Fora:</span><span className="text-white">{formatTime(offlineReport.seconds)}</span></div>
             <div className="flex justify-between items-center text-[8px] uppercase font-bold"><span className="text-neutral-500">Renda Ativa:</span><span className="text-blue-400">R$ {offlineReport.incomePerSec}/s</span></div>
             <div className="h-[2px] bg-neutral-700 w-full" />
             <div className="flex flex-col gap-2 mt-4">
                <span className="text-[7px] text-neutral-500 uppercase font-bold tracking-tighter">Você acumulou:</span>
                <span className="text-lg text-yellow-500 font-bold tracking-widest">R$ {formatCurrency(offlineReport.profit)}</span>
             </div>
          </div>
          <button 
            onClick={() => setOfflineReport(null)}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 text-[10px] font-bold border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all uppercase shadow-lg"
          >
            COLETAR LUCROS
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 bg-neutral-950">
      <div className="sticky top-0 bg-neutral-900 border-b-4 border-black p-4 z-50 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="flex flex-col"><span className="text-[6px] text-neutral-500 uppercase tracking-tighter font-bold">Capital</span><span className="text-xs text-yellow-500 font-bold tracking-widest">R$ {formatCurrency(money)}</span></div>
           <div className="h-8 w-[2px] bg-neutral-800" />
           <div className="flex flex-col"><span className="text-[6px] text-neutral-500 uppercase tracking-tighter font-bold">Renda Ativa</span><span className="text-[10px] text-green-500 font-bold tracking-widest">R$ {totalIncome}/s</span></div>
        </div>
        <button onClick={() => { setActiveScreen('PROFILE'); setIsEditingProfile(false); }} className={`w-14 h-14 rounded-full border-4 shadow-inner transition-all ${activeScreen === 'PROFILE' ? 'border-blue-500 bg-neutral-700' : 'border-yellow-600 bg-neutral-800 hover:scale-110'} flex items-center justify-center overflow-hidden`}>
           <PixelDino type={currentUser?.avatarType || 'VELOCIRAPTOR'} size={42} />
        </button>
      </div>

      <main className="mt-8 container mx-auto px-4 max-w-6xl">
        {activeScreen === 'TERRITORIO' && renderTerritoryScreen()}
        
        {activeScreen === 'SHOP' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl text-green-400 mb-4 uppercase tracking-widest font-bold">Genética & Drops</h2>
            <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6 shadow-md">
              <button onClick={() => setShopTab('GERAL')} className={`flex-1 py-3 text-[8px] font-bold tracking-widest transition-all ${shopTab === 'GERAL' ? 'bg-green-600 text-black shadow-inner' : 'text-neutral-500 hover:text-white'}`}>GERAIS</button>
              <button onClick={() => setShopTab('LIMITADO')} className={`flex-1 py-3 text-[8px] font-bold tracking-widest transition-all ${shopTab === 'LIMITADO' ? 'bg-orange-600 text-black shadow-inner' : 'text-neutral-500 hover:text-white'}`}>LIMITADOS</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {(shopTab === 'GERAL' ? Object.values(DINOSAURS).filter(d => !d.isLimited) : Object.values(DINOSAURS).filter(d => d.isLimited && (marketStock[d.id] ?? 0) > 0)).map((dino) => (
                <div key={dino.id} onClick={() => setShopDinoDetail(dino)} className={`bg-neutral-800 p-4 border-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-neutral-700 transition-all ${getRarityStyles(dino.rarity).border} relative group shadow-lg`}>
                  <div className="p-2 bg-neutral-900 group-hover:scale-110 transition-transform"><PixelDino type={dino.id} size={56} /></div>
                  <div className="text-center w-full overflow-hidden">
                    <h3 className="text-[7px] uppercase font-bold truncate text-white tracking-tighter">{dino.name}</h3>
                    <p className="text-[9px] text-yellow-500 mt-2 font-bold tracking-widest">R$ {dino.price.toLocaleString()}</p>
                  </div>
                  {!dino.isLimited && (ownedDinos[dino.id] || []).length > 0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center border-4 border-neutral-700"><span className="text-[8px] text-white uppercase font-bold tracking-tighter opacity-100">POSSUÍDO</span></div>}
                  {dino.isLimited && <div className="absolute -top-3 -right-3 bg-orange-600 text-white text-[5px] p-2 border-2 border-black font-bold uppercase rotate-12 shadow-xl">DROP: {marketStock[dino.id]}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeScreen === 'ALBUM' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl text-purple-400 mb-4 uppercase tracking-widest font-bold">Sua Coleção</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 w-full">
              {(Object.values(DINOSAURS) as Dinosaur[]).map((dino) => {
                const serials: number[] = (ownedDinos[dino.id] as number[]) || [];
                const isOwned = serials.length > 0;
                return (
                  <div key={dino.id} className={`p-4 border-4 flex flex-col items-center transition-all shadow-lg ${isOwned ? 'bg-neutral-800 border-yellow-500 scale-105' : 'bg-neutral-900 opacity-20 border-neutral-800 grayscale'}`}>
                     <PixelDino type={dino.id} size={48} />
                     <p className="text-[7px] mt-4 text-center uppercase tracking-tighter text-white font-bold">{isOwned ? dino.name : '???'}</p>
                     {isOwned && <p className="text-[5px] text-neutral-400 mt-1 font-bold">{serials.length}x</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeScreen === 'FRIENDS' && renderSocialScreen()}
        {activeScreen === 'VIEW_PROFILE' && renderViewProfile()}
        {activeScreen === 'PROFILE' && renderProfileScreen()}
      </main>

      {shopDinoDetail && renderDinoModal(shopDinoDetail)}
      {offlineReport && renderOfflineModal()}

      {showNotification && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 bg-neutral-900 border-4 border-white px-8 py-4 text-[10px] z-[200] animate-bounce shadow-2xl text-yellow-500 text-center max-w-[80vw] uppercase font-bold tracking-widest">
          {showNotification}
        </div>
      )}

      {/* Modal Seleção Coleção para Alocação no Território */}
      {showDeployList && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-neutral-900 pixel-border w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b-2 border-neutral-800 flex justify-between items-center shadow-lg">
              <h3 className="text-[10px] text-yellow-500 uppercase font-bold tracking-widest">Selecione para Alocar</h3>
              <button onClick={() => setShowDeployList(false)} className="text-red-500 text-[10px] font-bold hover:text-red-400 transition-colors">FECHAR</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 gap-4 no-scrollbar">
              {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => 
                serials.map((serial, idx) => {
                  const isAlreadyDeployed = territoryDinos.some(d => d.type === type && d.serial === serial);
                  return (
                    <div 
                      key={`${type}-${serial}-${idx}`}
                      className={`p-4 border-2 transition-all flex flex-col items-center gap-2 cursor-pointer shadow-inner ${isAlreadyDeployed ? 'opacity-30 grayscale cursor-not-allowed border-neutral-800' : 'bg-neutral-800 border-neutral-700 hover:border-yellow-500 active:scale-95'}`}
                      onClick={() => !isAlreadyDeployed && deployDino(type, serial)}
                    >
                      <PixelDino type={type} size={40} />
                      <p className="text-[6px] text-white uppercase text-center font-bold tracking-tighter">{DINOSAURS[type].name}</p>
                      {serial > 0 && <p className="text-[5px] text-orange-400 font-bold">#{serial}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTerritoryDino && (
        <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedTerritoryDino(null)}>
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-xs text-center flex flex-col items-center gap-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <PixelDino type={selectedTerritoryDino.type} size={100} />
            <div>
              <h3 className="text-md uppercase text-white tracking-widest font-pixel">{DINOSAURS[selectedTerritoryDino.type].name}</h3>
              <p className="text-[7px] text-green-500 mt-2 font-bold uppercase tracking-tighter font-bold">Rendimento: R$ {DINOSAURS[selectedTerritoryDino.type].incomePerSecond}/s</p>
              {selectedTerritoryDino.serial > 0 && <p className="text-[6px] text-orange-400 mt-1 uppercase font-bold font-bold">Série: #{selectedTerritoryDino.serial}</p>}
            </div>
            <button 
              onClick={() => undeployDino(selectedTerritoryDino.instanceId)}
              className="w-full bg-red-900 hover:bg-red-800 text-white py-4 text-[9px] uppercase font-bold border-b-4 border-red-950 transition-all active:border-b-0 active:translate-y-1 shadow-md"
            >
              REMOVER DO TERRITÓRIO
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t-4 border-black flex h-24 z-50 px-2 gap-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {[
          { id: 'TERRITORIO', color: 'bg-yellow-600', label: 'TERRITÓRIO', badge: 0 },
          { id: 'SHOP', color: 'bg-green-600', label: 'GENÉTICA', badge: 0 },
          { id: 'ALBUM', color: 'bg-purple-600', label: 'COLEÇÃO', badge: 0 },
          { id: 'FRIENDS', color: 'bg-pink-600', label: 'SOCIAL', badge: pendingRequestsCount },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveScreen(tab.id as Screen); setIsEditingProfile(false); }} className={`flex-1 flex flex-col items-center justify-center gap-2 relative transition-all border-b-4 ${activeScreen === tab.id ? 'bg-neutral-800 border-white scale-105' : 'opacity-50 hover:opacity-100 border-transparent'}`}>
            <div className={`w-8 h-8 ${tab.color} border-2 border-black pixel-shadow transform transition-transform ${activeScreen === tab.id ? 'scale-110 rotate-2' : ''}`}>
              {tab.badge > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[6px] w-4 h-4 flex items-center justify-center border border-black font-bold shadow-md">!</span>}
            </div>
            <span className={`text-[7px] font-bold tracking-tighter uppercase ${activeScreen === tab.id ? 'text-white' : 'text-neutral-500'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
