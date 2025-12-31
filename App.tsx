
import React, { useState, useEffect, useMemo } from 'react';
import { DINOSAURS, INITIAL_STATE } from './constants';
import { DinosaurType, Rarity, User, Dinosaur, FriendRequest } from './types';
import { PixelDino } from './components/PixelDino';

type Screen = 'MURAL' | 'SHOP' | 'ALBUM' | 'PROFILE' | 'FRIENDS' | 'VIEW_PROFILE';
type AuthMode = 'LOGIN' | 'REGISTER';
type ShopTab = 'GERAL' | 'LIMITADO';
type SocialTab = 'MEUS_AMIGOS' | 'PEDIDOS' | 'BUSCAR';

const App: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  
  // --- Game State ---
  const [money, setMoney] = useState(0);
  const [ownedDinos, setOwnedDinos] = useState<Record<DinosaurType, number[]>>(INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>);
  const [activeScreen, setActiveScreen] = useState<Screen>('MURAL');
  const [shopTab, setShopTab] = useState<ShopTab>('GERAL');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [selectedDino, setSelectedDino] = useState<Dinosaur | null>(null);
  const [shopDinoDetail, setShopDinoDetail] = useState<Dinosaur | null>(null);
  
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
    return (Object.entries(ownedDinos) as [DinosaurType, number[]][]).reduce((acc, [type, serials]) => {
      const dino = DINOSAURS[type];
      return acc + (dino.incomePerSecond * (serials as number[]).length);
    }, 0);
  }, [ownedDinos]);

  const pendingRequestsCount = currentUser?.friendRequests?.length || 0;

  // --- Helpers ---
  const triggerNotification = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => setShowNotification(null), 3000);
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
      }
    }
  }, []);

  // Polling para novos pedidos de amizade (simulado)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      const latest = getAllUsers().find(u => u.id === currentUser.id);
      if (latest && JSON.stringify(latest.friendRequests) !== JSON.stringify(currentUser.friendRequests)) {
        setCurrentUser(latest);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const updatedUser = { ...currentUser, money, ownedDinos };
      localStorage.setItem('dino_session', JSON.stringify(updatedUser));
      saveToStorage(updatedUser);
    }
  }, [money, ownedDinos]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      setMoney(prev => prev + totalIncome);
    }, 1000);
    return () => clearInterval(timer);
  }, [totalIncome, currentUser]);

  // --- Social Logic ---
  const sendFriendRequest = (targetId: string) => {
    if (!currentUser) return;
    if (targetId === currentUser.id) return triggerNotification("VOCÊ NÃO PODE SER SEU AMIGO!");
    
    const users = getAllUsers();
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) return triggerNotification("USUÁRIO NÃO ENCONTRADO!");

    if (targetUser.friendRequests.some(r => r.fromId === currentUser.id)) {
      return triggerNotification("PEDIDO JÁ ENVIADO!");
    }
    if (currentUser.friends.includes(targetId)) {
      return triggerNotification("VOCÊS JÁ SÃO AMIGOS!");
    }

    const newRequest: FriendRequest = {
      fromId: currentUser.id,
      fromUsername: currentUser.username
    };

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
      // Adicionar aos amigos de ambos
      if (!updatedMe.friends.includes(requestId)) updatedMe.friends.push(requestId);
      if (!otherUser.friends.includes(updatedMe.id)) otherUser.friends.push(updatedMe.id);
      
      // Remover pedido
      updatedMe.friendRequests = updatedMe.friendRequests.filter(r => r.fromId !== requestId);
      
      saveToStorage(otherUser);
      setCurrentUser(updatedMe);
      saveToStorage(updatedMe);
      triggerNotification("AMIZADE ACEITA!");
    }
  };

  const rejectFriendRequest = (requestId: string) => {
    if (!currentUser) return;
    const updatedMe = { ...currentUser };
    updatedMe.friendRequests = updatedMe.friendRequests.filter(r => r.fromId !== requestId);
    setCurrentUser(updatedMe);
    saveToStorage(updatedMe);
    triggerNotification("PEDIDO RECUSADO.");
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
    triggerNotification("AMIGO REMOVIDO.");
  };

  // --- Auth Handlers ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getAllUsers();
    if (authMode === 'REGISTER') {
      if (users.some((u: User) => u.username.toLowerCase() === authForm.username.toLowerCase())) {
        return triggerNotification("USUÁRIO JÁ EXISTE!");
      }
      if (users.some((u: User) => u.email.toLowerCase() === authForm.email.toLowerCase())) {
        return triggerNotification("E-MAIL JÁ CADASTRADO!");
      }
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 6).toUpperCase(),
        username: authForm.username,
        displayName: authForm.username,
        email: authForm.email,
        passwordHash: authForm.password,
        createdAt: new Date().toISOString(),
        avatarType: 'VELOCIRAPTOR',
        money: 100,
        ownedDinos: INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>,
        friends: [],
        friendRequests: []
      };
      saveToStorage(newUser);
      triggerNotification("CONTA CRIADA!");
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
        localStorage.setItem('dino_session', JSON.stringify(user));
        triggerNotification(`BEM-VINDO!`);
      } else {
        triggerNotification("DADOS INVÁLIDOS!");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dino_session');
    setCurrentUser(null);
    setActiveScreen('MURAL');
    setIsEditingProfile(false);
  };

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
      const currentSerials = (prev[dino.id] as number[]) || [];
      return { ...prev, [dino.id]: [...currentSerials, serial] };
    });
    setShopDinoDetail(null);
    triggerNotification(`${dino.name}${serial > 0 ? ` #${serial}` : ''} ADQUIRIDO!`);
  };

  const getRarityStyles = (rarity: Rarity) => {
    switch (rarity) {
      case 'LENDARIO': return { text: 'text-yellow-400', bg: 'bg-yellow-900', border: 'border-white', label: 'LENDÁRIO' };
      case 'EPICO': return { text: 'text-purple-400', bg: 'bg-purple-900', border: 'border-yellow-500', label: 'ÉPICO' };
      case 'RARO': return { text: 'text-blue-400', bg: 'bg-blue-900', border: 'border-blue-500', label: 'RARO' };
      default: return { text: 'text-gray-400', bg: 'bg-gray-700', border: 'border-neutral-600', label: 'COMUM' };
    }
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

  // --- UI Components ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
        <div className="w-full max-w-sm bg-neutral-900 pixel-border p-8 text-center">
          <div className="flex justify-center mb-6">
            <PixelDino type="TREX" size={100} className="animate-bounce" />
          </div>
          <h1 className="text-lg text-yellow-500 mb-8 uppercase tracking-tighter">DINO PIXEL TYCOON</h1>
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'REGISTER' && (
              <div className="text-left">
                <label className="text-[7px] text-neutral-500 block mb-1 uppercase">Nome de Usuário</label>
                <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 uppercase text-white" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required />
              </div>
            )}
            <div className="text-left">
              <label className="text-[7px] text-neutral-500 block mb-1 uppercase">{authMode === 'LOGIN' ? 'E-mail ou Usuário' : 'E-mail'}</label>
              <input type="text" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 text-white" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
            </div>
            <div className="text-left">
              <label className="text-[7px] text-neutral-500 block mb-1 uppercase">Senha</label>
              <input type="password" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 text-white" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            </div>
            <button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 text-[9px] font-bold border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all">
              {authMode === 'LOGIN' ? 'ENTRAR NO PARQUE' : 'CRIAR CADASTRADOR'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="mt-8 text-[7px] text-neutral-500 hover:text-white uppercase transition-colors">
            {authMode === 'LOGIN' ? 'Não tem conta? Registre-se' : 'Já possui conta? Faça login'}
          </button>
        </div>
        {showNotification && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-red-900 border-2 border-white px-4 py-2 text-[8px] z-[100] animate-pulse">
            {showNotification}
          </div>
        )}
      </div>
    );
  }

  const renderDinoModal = (dino: Dinosaur, isShop: boolean) => {
    if (!dino) return null;
    const styles = getRarityStyles(dino.rarity);
    const isOwnedGeneral = !dino.isLimited && (ownedDinos[dino.id] as number[]).length > 0;
    const stock = marketStock[dino.id] || 0;
    const close = isShop ? () => setShopDinoDetail(null) : () => setSelectedDino(null);

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={close}>
        <div className="bg-neutral-900 pixel-border w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
          <button onClick={close} className="absolute -top-4 -right-4 bg-red-600 text-white w-8 h-8 flex items-center justify-center border-2 border-black font-bold">X</button>
          <div className="flex flex-col items-center gap-6">
            <div className={`p-8 bg-neutral-800 border-4 ${styles.border}`}>
               <PixelDino type={dino.id} size={100} />
            </div>
            <div className="text-center space-y-3">
              <span className={`text-[6px] px-2 py-1 ${styles.bg} ${styles.text} uppercase font-bold`}>{styles.label}</span>
              <h3 className="text-lg text-white uppercase">{dino.name}</h3>
              <p className="text-[7px] text-neutral-400 leading-relaxed px-2 uppercase">{dino.description}</p>
            </div>
            <div className="w-full space-y-4 pt-4 border-t border-neutral-800">
              <div className="flex justify-between items-center text-[8px] uppercase">
                <span className="text-neutral-500">Custo:</span>
                <span className="text-yellow-500 font-bold">${dino.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[8px] uppercase">
                <span className="text-neutral-500">Renda:</span>
                <span className="text-green-500 font-bold">+${dino.incomePerSecond}/s</span>
              </div>
              {dino.isLimited && isShop && (
                <div className="flex justify-between items-center text-[8px] uppercase">
                  <span className="text-neutral-500">Estoque:</span>
                  <span className="text-orange-500 font-bold">{stock} UN.</span>
                </div>
              )}
              {isShop && (
                <button 
                  onClick={() => buyDino(dino)}
                  disabled={isOwnedGeneral || (dino.isLimited && stock <= 0)}
                  className={`w-full py-4 text-[10px] font-bold border-b-4 ${
                    isOwnedGeneral ? 'bg-neutral-700 opacity-50 cursor-not-allowed border-neutral-800' :
                    (dino.isLimited && stock <= 0) ? 'bg-red-900 opacity-50 cursor-not-allowed border-red-950' :
                    money >= dino.price ? 'bg-green-600 border-green-900 hover:bg-green-500 active:border-b-0 active:translate-y-1' : 'bg-neutral-800 border-neutral-950 opacity-50'
                  }`}
                >
                  {isOwnedGeneral ? 'JÁ POSSUI' : (dino.isLimited && stock <= 0) ? 'ESGOTADO' : `CONFIRMAR COMPRA`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSocialScreen = () => {
    const allUsers = getAllUsers();
    const filteredUsers = searchQuery.length >= 2 
      ? allUsers.filter(u => 
          u.id !== currentUser.id && 
          (u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.id === searchQuery.toUpperCase())
        )
      : [];

    const myFriends = allUsers.filter(u => currentUser.friends.includes(u.id));

    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
        <h2 className="text-xl text-pink-400 mb-4 uppercase tracking-widest">Social Hub</h2>
        
        <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setSocialTab('MEUS_AMIGOS')} className={`flex-1 min-w-[100px] py-3 text-[7px] font-bold tracking-widest ${socialTab === 'MEUS_AMIGOS' ? 'bg-pink-600 text-black shadow-inner' : 'text-neutral-500'}`}>AMIGOS</button>
          <button onClick={() => setSocialTab('PEDIDOS')} className={`flex-1 min-w-[100px] py-3 text-[7px] font-bold tracking-widest relative ${socialTab === 'PEDIDOS' ? 'bg-purple-600 text-black shadow-inner' : 'text-neutral-500'}`}>
            PEDIDOS {pendingRequestsCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[5px] w-3 h-3 flex items-center justify-center rounded-full">{pendingRequestsCount}</span>}
          </button>
          <button onClick={() => setSocialTab('BUSCAR')} className={`flex-1 min-w-[100px] py-3 text-[7px] font-bold tracking-widest ${socialTab === 'BUSCAR' ? 'bg-blue-600 text-black shadow-inner' : 'text-neutral-500'}`}>BUSCAR</button>
        </div>

        <div className="w-full bg-neutral-900 pixel-border p-6 min-h-[400px]">
          {socialTab === 'BUSCAR' && (
            <div className="space-y-6">
              <input 
                className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] focus:outline-none focus:border-pink-500 uppercase text-white" 
                placeholder="NOME OU ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <div className="space-y-4">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <div key={u.id} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingUser(u); setActiveScreen('VIEW_PROFILE'); }}>
                      <PixelDino type={u.avatarType} size={32} />
                      <div>
                        <p className="text-[8px] uppercase font-bold text-white">{u.username}</p>
                        <p className="text-[6px] text-neutral-500">ID: {u.id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => sendFriendRequest(u.id)}
                      disabled={currentUser.friends.includes(u.id)}
                      className="bg-green-700 hover:bg-green-600 text-[6px] p-2 border-b-2 border-green-900 active:translate-y-0.5"
                    >
                      {currentUser.friends.includes(u.id) ? "AMIGO" : "PEDIR AMIZADE"}
                    </button>
                  </div>
                )) : searchQuery.length >= 2 ? (
                  <p className="text-[7px] text-neutral-600 text-center py-10 uppercase">Nenhum resultado.</p>
                ) : (
                  <p className="text-[7px] text-neutral-600 text-center py-10 uppercase italic">Digite pelo menos 2 caracteres...</p>
                )}
              </div>
            </div>
          )}

          {socialTab === 'MEUS_AMIGOS' && (
            <div className="space-y-4">
              {myFriends.length > 0 ? myFriends.map(f => (
                <div key={f.id} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewingUser(f); setActiveScreen('VIEW_PROFILE'); }}>
                    <PixelDino type={f.avatarType} size={32} />
                    <div>
                      <p className="text-[8px] uppercase font-bold text-white">{f.username}</p>
                      <p className="text-[6px] text-neutral-500">STATUS: ONLINE</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setViewingUser(f); setActiveScreen('VIEW_PROFILE'); }} className="bg-blue-700 text-[5px] p-2 border-b-2 border-blue-900 uppercase">Ver</button>
                    <button onClick={() => removeFriend(f.id)} className="bg-red-800 text-[5px] p-2 border-b-2 border-red-950 uppercase">Banir</button>
                  </div>
                </div>
              )) : (
                <p className="text-[7px] text-neutral-600 text-center py-10 uppercase italic">Você ainda não tem amigos.</p>
              )}
            </div>
          )}

          {socialTab === 'PEDIDOS' && (
            <div className="space-y-4">
              {currentUser.friendRequests.length > 0 ? currentUser.friendRequests.map(r => (
                <div key={r.fromId} className="bg-neutral-800 p-4 flex items-center justify-between border-2 border-neutral-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center border border-neutral-700">?</div>
                    <div>
                      <p className="text-[8px] uppercase font-bold text-white">{r.fromUsername}</p>
                      <p className="text-[6px] text-purple-400">PEDIDO DE AMIZADE</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptFriendRequest(r.fromId)} className="bg-green-700 text-[5px] p-2 border-b-2 border-green-900 uppercase font-bold">ACEITAR</button>
                    <button onClick={() => rejectFriendRequest(r.fromId)} className="bg-red-800 text-[5px] p-2 border-b-2 border-red-950 uppercase font-bold">RECUSAR</button>
                  </div>
                </div>
              )) : (
                <p className="text-[7px] text-neutral-600 text-center py-10 uppercase italic">Nenhuma solicitação pendente.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderViewProfile = () => {
    if (!viewingUser) return null;
    const income = (Object.entries(viewingUser.ownedDinos) as [DinosaurType, number[]][]).reduce((acc, [type, serials]) => {
      const dino = DINOSAURS[type];
      return acc + (dino.incomePerSecond * serials.length);
    }, 0);

    return (
      <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
        <button onClick={() => setActiveScreen('FRIENDS')} className="self-start text-[8px] text-pink-500 hover:text-white uppercase mb-4 tracking-tighter">&lt; VOLTAR SOCIAL</button>
        
        <div className="w-full bg-neutral-900 pixel-border p-8 flex flex-col items-center gap-6 shadow-2xl mb-8">
           <div className="p-6 bg-neutral-800 border-4 border-pink-500 rounded-full">
             <PixelDino type={viewingUser.avatarType} size={80} />
           </div>
           <div className="text-center">
             <h3 className="text-lg uppercase text-white tracking-widest">{viewingUser.username}</h3>
             <p className="text-[7px] text-neutral-500 uppercase mt-2">CAPITAL: ${viewingUser.money.toLocaleString()}</p>
             <p className="text-[7px] text-green-500 uppercase mt-1">RENDA: ${income}/s</p>
           </div>
        </div>

        <h2 className="text-md text-yellow-500 uppercase mb-4 tracking-widest">Território de {viewingUser.username}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {(Object.entries(viewingUser.ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => {
            const dino = DINOSAURS[type];
            return serials.map((serial, idx) => (
              <div key={`${type}-${idx}`} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex flex-col items-center gap-2">
                 <PixelDino type={type} size={40} />
                 <p className="text-[6px] text-white uppercase truncate w-full text-center font-bold">{dino.name}</p>
                 {dino.isLimited && <p className="text-[5px] text-orange-400">SÉRIE #{serial}</p>}
              </div>
            ));
          })}
        </div>
        {/* Added explicit cast to prevent "unknown" property errors on .length */}
        {Object.values(viewingUser.ownedDinos).every(s => (s as number[]).length === 0) && (
          <p className="text-[8px] text-neutral-600 uppercase italic py-10">Este jogador não possui dinossauros.</p>
        )}
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
              <p className="text-[7px] text-neutral-500 uppercase">Escolha seu Avatar</p>
              <div className="grid grid-cols-4 gap-4">
                {(Object.keys(DINOSAURS) as DinosaurType[]).map(type => (
                  <div 
                    key={type} 
                    onClick={() => setEditForm({...editForm, avatarType: type})}
                    className={`p-2 border-2 cursor-pointer transition-all ${editForm.avatarType === type ? 'border-blue-500 bg-neutral-800 scale-110' : 'border-neutral-800 grayscale opacity-50'}`}
                  >
                    <PixelDino type={type} size={40} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[7px] text-neutral-500 uppercase block">Nova Senha (Opcional)</label>
              <input 
                type="password"
                className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] focus:outline-none focus:border-blue-500 text-white" 
                placeholder="DEIXE EM BRANCO PARA MANTER..."
                value={editForm.password}
                onChange={e => setEditForm({...editForm, password: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                onClick={handleSaveProfile} 
                className="bg-blue-600 hover:bg-blue-500 text-white border-b-4 border-blue-900 py-4 text-[8px] uppercase font-bold active:border-b-0 active:translate-y-1"
               >
                 SALVAR
               </button>
               <button 
                onClick={() => setIsEditingProfile(false)} 
                className="bg-neutral-800 hover:bg-neutral-700 text-white border-b-4 border-neutral-950 py-4 text-[8px] uppercase font-bold active:border-b-0 active:translate-y-1"
               >
                 CANCELAR
               </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
        <h2 className="text-xl text-blue-400 mb-4 uppercase tracking-widest">Seu Perfil</h2>
        <div className="w-full bg-neutral-900 pixel-border p-10 flex flex-col items-center gap-8 shadow-2xl">
          <div className="p-8 bg-neutral-800 border-8 border-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <PixelDino type={currentUser.avatarType} size={100} />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl uppercase text-white tracking-widest">{currentUser.username}</h3>
            <p className="text-[8px] text-neutral-500">IDENTIFICADOR: {currentUser.id}</p>
            <p className="text-[7px] text-blue-500">MUNDO DINO DESDE: {new Date(currentUser.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div className="w-full pt-8 border-t border-neutral-800 grid grid-cols-2 gap-4">
            <div className="bg-neutral-800 p-4 text-center border-2 border-neutral-700">
              <p className="text-[6px] text-neutral-500 mb-2 uppercase">Espécies Coletadas</p>
              <p className="text-sm font-bold text-purple-400">{(Object.entries(ownedDinos) as [DinosaurType, number[]][]).filter(([_, s]) => s.length > 0).length}</p>
            </div>
            <div className="bg-neutral-800 p-4 text-center border-2 border-neutral-700">
              <p className="text-[6px] text-neutral-500 mb-2 uppercase">Renda Mensal Est.</p>
              <p className="text-sm font-bold text-green-400">${totalIncome * 30}</p>
            </div>
          </div>

          <div className="w-full space-y-4">
            <button 
              onClick={() => {
                setEditForm({ avatarType: currentUser.avatarType, password: '' });
                setIsEditingProfile(true);
              }} 
              className="w-full bg-blue-700 hover:bg-blue-600 text-white border-b-4 border-blue-900 py-5 text-[9px] uppercase font-bold active:border-b-0 active:translate-y-1 transition-all"
            >
              EDITAR PERFIL
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full bg-red-900/40 text-red-500 border-4 border-red-900 py-5 text-[10px] uppercase font-bold hover:bg-red-900/60 active:scale-95 transition-all shadow-xl"
            >
              ENCERRAR SESSÃO
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 bg-neutral-950">
      <div className="sticky top-0 bg-neutral-900 border-b-4 border-black p-4 z-50 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="flex flex-col">
              <span className="text-[6px] text-neutral-500 uppercase tracking-tighter">Capital</span>
              <span className="text-xs text-yellow-500 font-bold tracking-widest">${money.toLocaleString()}</span>
           </div>
           <div className="h-8 w-[2px] bg-neutral-800" />
           <div className="flex flex-col">
              <span className="text-[6px] text-neutral-500 uppercase tracking-tighter">Renda</span>
              <span className="text-[10px] text-green-500 font-bold tracking-widest">${totalIncome}/s</span>
           </div>
        </div>
        <button onClick={() => { setActiveScreen('PROFILE'); setIsEditingProfile(false); }} className={`w-14 h-14 rounded-full border-4 ${activeScreen === 'PROFILE' ? 'border-blue-500 bg-neutral-700' : 'border-yellow-600 bg-neutral-800 hover:scale-105'} transition-all flex items-center justify-center overflow-hidden`}>
           <PixelDino type={currentUser?.avatarType || 'VELOCIRAPTOR'} size={42} />
        </button>
      </div>

      <main className="mt-8 container mx-auto px-4 max-w-6xl">
        {activeScreen === 'MURAL' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl text-yellow-400 mb-4 uppercase tracking-widest">Território</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
              {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => {
                const dino = DINOSAURS[type];
                return (serials as number[]).map((serial, idx) => (
                  <div key={`${type}-${idx}`} onClick={() => setSelectedDino(dino)} className={`bg-neutral-800 p-6 pixel-border flex flex-col items-center relative group cursor-pointer hover:bg-neutral-700 transition-colors ${dino.rarity === 'EPICO' ? 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' : dino.rarity === 'LENDARIO' ? 'shadow-[0_0_20px_rgba(255,255,255,0.4)]' : ''}`}>
                    <div className="animate-bounce mb-4"><PixelDino type={type} size={80} /></div>
                    <div className="text-center space-y-1">
                      <p className="text-[9px] uppercase font-bold text-white">{dino.name}</p>
                      <p className="text-[7px] text-green-400">+${dino.incomePerSecond}/s</p>
                      {dino.isLimited && <p className="text-[7px] text-orange-500 font-bold bg-black/40 px-2 py-0.5 inline-block">SÉRIE #{serial}</p>}
                    </div>
                  </div>
                ));
              })}
            </div>
            {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).every(([_, serials]) => serials.length === 0) && (
              <div className="text-center py-32 opacity-20 uppercase">
                <p className="text-[12px]">Parque Vazio. Visite a loja!</p>
              </div>
            )}
          </div>
        )}

        {activeScreen === 'SHOP' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl text-green-400 mb-4 uppercase tracking-widest">Genética & Drops</h2>
            <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6">
              <button onClick={() => setShopTab('GERAL')} className={`flex-1 py-3 text-[8px] font-bold tracking-widest ${shopTab === 'GERAL' ? 'bg-green-600 text-black shadow-inner' : 'text-neutral-500 hover:text-white'}`}>GERAIS</button>
              <button onClick={() => setShopTab('LIMITADO')} className={`flex-1 py-3 text-[8px] font-bold tracking-widest ${shopTab === 'LIMITADO' ? 'bg-orange-600 text-black shadow-inner' : 'text-neutral-500 hover:text-white'}`}>LIMITADOS</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {(shopTab === 'GERAL' ? Object.values(DINOSAURS).filter(d => !d.isLimited) : Object.values(DINOSAURS).filter(d => d.isLimited && (marketStock[d.id] ?? 0) > 0)).map((dino) => (
                <div key={dino.id} onClick={() => setShopDinoDetail(dino)} className={`bg-neutral-800 p-4 border-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-neutral-700 transition-all ${getRarityStyles(dino.rarity).border} relative group shadow-lg`}>
                  <div className="p-2 bg-neutral-900 group-hover:scale-110 transition-transform"><PixelDino type={dino.id} size={56} /></div>
                  <div className="text-center w-full overflow-hidden">
                    <h3 className="text-[7px] uppercase font-bold truncate text-white">{dino.name}</h3>
                    <p className="text-[9px] text-yellow-500 mt-2 font-bold">${dino.price.toLocaleString()}</p>
                  </div>
                  {!dino.isLimited && (ownedDinos[dino.id] as number[]).length > 0 && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <span className="text-[8px] text-white uppercase font-bold tracking-tighter">POSSUÍDO</span>
                    </div>
                  )}
                  {dino.isLimited && (
                    <div className="absolute -top-3 -right-3 bg-orange-600 text-white text-[5px] p-2 border-2 border-black font-bold uppercase shadow-xl rotate-12">
                      DROP: {marketStock[dino.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeScreen === 'ALBUM' && (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl text-purple-400 mb-4 uppercase tracking-widest">Enciclopédia</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 w-full">
              {/* Fix: Explicitly type serials as number[] to resolve 'unknown' property error at line 531 */}
              {(Object.values(DINOSAURS) as Dinosaur[]).map((dino) => {
                const serials: number[] = (ownedDinos[dino.id] as number[]) || [];
                const isOwned = serials.length > 0;
                return (
                  <div key={dino.id} className={`p-4 border-4 flex flex-col items-center transition-all ${isOwned ? 'bg-neutral-800 border-yellow-500 scale-105' : 'bg-neutral-900 opacity-20 border-neutral-800 grayscale'}`}>
                     <PixelDino type={dino.id} size={48} />
                     <p className="text-[7px] mt-4 text-center uppercase tracking-tighter text-white">{isOwned ? dino.name : '???'}</p>
                     {isOwned && dino.isLimited && <p className="text-[5px] text-orange-400 mt-1">{serials.length} UN.</p>}
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

      {selectedDino && renderDinoModal(selectedDino, false)}
      {shopDinoDetail && renderDinoModal(shopDinoDetail, true)}

      {showNotification && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 bg-neutral-900 border-4 border-white px-8 py-4 text-[10px] z-[200] animate-bounce shadow-[0_0_30px_rgba(0,0,0,0.8)] uppercase font-bold tracking-widest text-yellow-500">
          {showNotification}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t-4 border-black flex h-24 z-50 px-2 gap-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {[
          { id: 'MURAL', color: 'bg-yellow-600', label: 'MURAL', badge: 0 },
          { id: 'SHOP', color: 'bg-green-600', label: 'GENÉTICA', badge: 0 },
          { id: 'ALBUM', color: 'bg-purple-600', label: 'ÁLBUM', badge: 0 },
          { id: 'FRIENDS', color: 'bg-pink-600', label: 'REDE', badge: pendingRequestsCount },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveScreen(tab.id as Screen); setIsEditingProfile(false); }} className={`flex-1 flex flex-col items-center justify-center gap-2 relative transition-all ${activeScreen === tab.id ? 'bg-neutral-800 scale-105 border-t-4 border-white' : 'opacity-50 hover:opacity-100 hover:bg-neutral-800/50'}`}>
            <div className={`w-8 h-8 ${tab.color} border-2 border-black pixel-shadow transform ${activeScreen === tab.id ? 'scale-110 rotate-3' : ''}`}>
              {tab.badge > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[6px] w-4 h-4 flex items-center justify-center border border-black font-bold">{tab.badge}</span>}
            </div>
            <span className={`text-[7px] font-bold tracking-tighter ${activeScreen === tab.id ? 'text-white' : 'text-neutral-500'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
