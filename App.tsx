
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DINOSAURS, INITIAL_STATE } from './constants';
import { DinosaurType, User, Dinosaur, DeployedDino, MarketListing } from './types';
import { PixelDino } from './components/PixelDino';
import { supabase } from './supabaseClient';

type Screen = 'TERRITORIO' | 'SHOP' | 'ALBUM' | 'PROFILE' | 'SOCIAL' | 'VIEW_PROFILE' | 'MARKETPLACE';
type AuthMode = 'LOGIN' | 'REGISTER';
type ShopTab = 'GERAL' | 'LIMITADO';
type SocialTab = 'AMIGOS' | 'PEDIDOS' | 'BUSCAR';
type MarketTab = 'COMPRAR' | 'MINHAS_VENDAS';

interface OfflineReport {
  seconds: number;
  profit: number;
  incomePerSec: number;
}

const App: React.FC = () => {
  // --- Refs de Controle ---
  const hasLoadedUser = useRef(false);

  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // --- Social State ---
  const [socialTab, setSocialTab] = useState<SocialTab>('AMIGOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [friendsList, setFriendsList] = useState<User[]>([]);

  // --- Market State ---
  const [marketStock, setMarketStock] = useState<Record<string, number>>({});
  const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
  const [marketTab, setMarketTab] = useState<MarketTab>('COMPRAR');
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellForm, setSellForm] = useState({ price: 0, dinoIdx: -1, type: '' as DinosaurType, serial: -1 });
  
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

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  // --- REFRESH MONEY: Fonte de Verdade Atômica ---
  const refreshBalance = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('users').select('money').eq('id', currentUser.id).maybeSingle();
    if (data) setMoney(Number(data.money));
  }, [currentUser]);

  // --- SAVE USER STATE: Nunca toca no Money ---
  const saveUserState = async (partial: {
    ownedDinos?: any;
    territoryDinos?: any;
  }) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const payload: any = {
        last_active_at: new Date().toISOString()
      };
      if (partial.ownedDinos !== undefined) payload.owned_dinos = partial.ownedDinos;
      if (partial.territoryDinos !== undefined) payload.territory_dinos = partial.territoryDinos;

      await supabase.from('users').update(payload).eq('id', currentUser.id);
    } catch (err) {
      console.error("Erro ao salvar progresso:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchMarketData = useCallback(async () => {
    const { data: listings } = await supabase.from('market_listings').select('*').order('created_at', { ascending: false });
    if (listings) {
      setMarketListings(listings.map((l: any) => ({
        id: l.id,
        sellerId: l.seller_id,
        sellerName: l.seller_name,
        dinoType: l.dino_type as DinosaurType,
        serial: l.serial,
        price: Number(l.price),
        createdAt: l.created_at
      })));
    }
    const { data: stock } = await supabase.from('market_global_stock').select('*');
    if (stock) {
      const stockMap: Record<string, number> = {};
      stock.forEach((s: any) => stockMap[s.dino_id] = s.stock);
      setMarketStock(stockMap);
    }
  }, []);

  // --- Carregamento de Sessão ---
  useEffect(() => {
    const init = async () => {
      if (hasLoadedUser.current) return;
      setIsLoading(true);
      const savedUserId = localStorage.getItem('dino_user_id');
      if (savedUserId) {
        const { data: user, error } = await supabase.from('users').select('*').eq('id', savedUserId).maybeSingle();
        if (user && !error) {
          hasLoadedUser.current = true;
          const loadedUser: User = {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            email: user.email,
            passwordHash: user.password_hash,
            createdAt: user.created_at,
            lastActiveAt: user.last_active_at,
            avatarType: user.avatar_type as DinosaurType,
            money: Number(user.money),
            ownedDinos: user.owned_dinos,
            territoryDinos: user.territory_dinos || [],
            friends: user.friends || [],
            friendRequests: user.friend_requests || []
          };
          setCurrentUser(loadedUser);
          setMoney(loadedUser.money);
          setOwnedDinos(loadedUser.ownedDinos);
          setTerritoryDinos(loadedUser.territoryDinos);
          setEditForm({ avatarType: loadedUser.avatarType, password: '' });
          
          if (user.last_active_at) {
            const lastActive = new Date(user.last_active_at).getTime();
            const now = Date.now();
            const diffSeconds = Math.floor((now - lastActive) / 1000);
            if (diffSeconds >= 30) {
              const income = (loadedUser.territoryDinos || []).reduce((acc, d) => acc + (DINOSAURS[d.type]?.incomePerSecond || 0), 0);
              const profit = diffSeconds * income;
              if (profit > 0) {
                setOfflineReport({ seconds: diffSeconds, profit, incomePerSec: income });
                const { data: newBalance } = await supabase.rpc('add_money_safe', { p_user_id: user.id, p_amount: profit });
                if (newBalance !== null) setMoney(Number(newBalance));
              }
            }
          }
          await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
        }
      }
      await fetchMarketData();
      setIsLoading(false);
    };
    init();
  }, [fetchMarketData]);

  // --- ATUALIZAÇÃO VISUAL POR SEGUNDO ---
  useEffect(() => {
    if (!currentUser || totalIncome <= 0) return;
    const visualTimer = setInterval(() => {
      setMoney(prev => prev + totalIncome);
    }, 1000);
    return () => clearInterval(visualTimer);
  }, [currentUser, totalIncome]);

  // --- CHECKPOINT DE RENDA (Backend Autoridade Máxima) ---
  useEffect(() => {
    if (!currentUser || totalIncome <= 0) return;

    const syncCheckpoint = setInterval(async () => {
      const amount = totalIncome * 10;
      // 1. Pede para o banco somar (Atômico)
      const { data: newBalance, error } = await supabase.rpc('add_money_safe', { 
        p_user_id: currentUser.id, 
        p_amount: amount 
      });

      // 2. Atualiza UI apenas com a resposta do banco (Corrige drift visual)
      if (!error && newBalance !== null) {
        setMoney(Number(newBalance));
      } else {
        await refreshBalance();
      }
    }, 10000);

    return () => clearInterval(syncCheckpoint);
  }, [currentUser, totalIncome, refreshBalance]);

  // --- Autosave Dinos/Território ---
  useEffect(() => {
    if (!currentUser || isLoading) return;
    const timeout = setTimeout(async () => {
      await saveUserState({ ownedDinos, territoryDinos });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [ownedDinos, territoryDinos, currentUser, isLoading]);

  // --- Heartbeat Timestamp ---
  useEffect(() => {
    if (!currentUser) return;
    const heartbeat = setInterval(async () => {
      await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', currentUser.id);
    }, 30000);
    return () => clearInterval(heartbeat);
  }, [currentUser]);

  // --- Social Logic ---
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase.from('users').select('id, username, avatarType:avatar_type, territoryDinos:territory_dinos').ilike('username', `%${searchQuery}%`).limit(10);
      if (data) setSearchResults(data.filter((u: any) => u.id !== currentUser?.id) as any);
    };
    const timer = setTimeout(searchUsers, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser || currentUser.friends.length === 0) {
        setFriendsList([]);
        return;
      }
      const { data } = await supabase.from('users').select('id, username, avatarType:avatar_type, territoryDinos:territory_dinos').in('id', currentUser.friends);
      if (data) setFriendsList(data as any);
    };
    if (activeScreen === 'SOCIAL') fetchFriends();
  }, [activeScreen, currentUser]);

  const sendFriendRequest = async (targetId: string) => {
    if (!currentUser) return;
    const { data: targetRaw } = await supabase.from('users').select('friend_requests').eq('id', targetId).maybeSingle();
    const target = targetRaw as any;
    if (target) {
      const requests = target.friend_requests || [];
      if (requests.some((r: any) => r.fromId === currentUser.id)) return triggerNotification("PEDIDO JÁ ENVIADO!");
      requests.push({ fromId: currentUser.id, fromUsername: currentUser.username });
      await supabase.from('users').update({ friend_requests: requests }).eq('id', targetId);
      triggerNotification("PEDIDO ENVIADO!");
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!currentUser) return;
    const { data: otherRaw } = await supabase.from('users').select('friends').eq('id', requestId).maybeSingle();
    const other = otherRaw as any;
    if (other) {
      const myFriends = [...currentUser.friends, requestId];
      const otherFriends = [...(other.friends || []), currentUser.id];
      const myRequests = currentUser.friendRequests.filter(r => r.fromId !== requestId);
      await supabase.from('users').update({ friends: myFriends, friend_requests: myRequests }).eq('id', currentUser.id);
      await supabase.from('users').update({ friends: otherFriends }).eq('id', requestId);
      setCurrentUser({ ...currentUser, friends: myFriends, friendRequests: myRequests });
      triggerNotification("AMIGO ADICIONADO!");
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!currentUser) return;
    const { data: otherRaw } = await supabase.from('users').select('friends').eq('id', friendId).maybeSingle();
    const other = otherRaw as any;
    const myFriends = currentUser.friends.filter(id => id !== friendId);
    await supabase.from('users').update({ friends: myFriends }).eq('id', currentUser.id);
    if (other) {
      const otherFriends = (other.friends || []).filter((id: string) => id !== currentUser.id);
      await supabase.from('users').update({ friends: otherFriends }).eq('id', friendId);
    }
    setCurrentUser({ ...currentUser, friends: myFriends });
    triggerNotification("AMIGO REMOVIDO.");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'REGISTER') {
      const { data: existing } = await supabase.from('users').select('id').or(`username.eq.${authForm.username},email.eq.${authForm.email}`).maybeSingle();
      if (existing) return triggerNotification("DADOS EM USO!");
      const userId = crypto.randomUUID();
      const newUser = { id: userId, username: authForm.username, display_name: authForm.username, email: authForm.email, password_hash: authForm.password, money: 150, owned_dinos: INITIAL_STATE.ownedDinos, territory_dinos: [], avatar_type: 'VELOCIRAPTOR', friends: [], friend_requests: [], created_at: new Date().toISOString(), last_active_at: new Date().toISOString() };
      const { error } = await supabase.from('users').insert(newUser);
      if (!error) { triggerNotification("CONTA CRIADA!"); setAuthMode('LOGIN'); }
      else triggerNotification("ERRO!");
    } else {
      const { data: userRaw } = await supabase.from('users').select('*').or(`email.eq.${authForm.email},username.eq.${authForm.email}`).eq('password_hash', authForm.password).maybeSingle();
      const user = userRaw as any;
      if (user) {
        const loadedUser: User = { id: user.id, username: user.username, displayName: user.display_name, email: user.email, passwordHash: user.password_hash, createdAt: user.created_at, lastActiveAt: user.last_active_at, avatarType: user.avatar_type as DinosaurType, money: Number(user.money), ownedDinos: user.owned_dinos, territoryDinos: user.territory_dinos || [], friends: user.friends || [], friendRequests: user.friend_requests || [] };
        await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', loadedUser.id);
        localStorage.setItem('dino_user_id', loadedUser.id);
        hasLoadedUser.current = true;
        setCurrentUser(loadedUser);
        setMoney(loadedUser.money);
        setOwnedDinos(loadedUser.ownedDinos);
        setTerritoryDinos(loadedUser.territoryDinos);
        setEditForm({ avatarType: loadedUser.avatarType, password: '' });
        triggerNotification(`BEM-VINDO!`);
      } else triggerNotification("INVÁLIDO!");
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', currentUser.id);
    }
    localStorage.removeItem('dino_user_id');
    hasLoadedUser.current = false;
    setCurrentUser(null);
    setActiveScreen('TERRITORIO');
    setOfflineReport(null);
  };

  const buyDino = async (dino: Dinosaur) => {
    if (money < dino.price) return triggerNotification("SEM CAPITAL!");
    if (!dino.isLimited && ownedDinos[dino.id]?.length > 0) return triggerNotification("JÁ POSSUI!");

    let serial = 0;
    if (dino.isLimited) {
      const { data: stockData } = await supabase.from('market_global_stock').select('stock').eq('dino_id', dino.id).maybeSingle();
      const currentStock = (stockData as any)?.stock ?? 0;
      if (currentStock <= 0) return triggerNotification("ESGOTADO!");
      serial = (dino.initialStock || 0) - currentStock + 1;
      await supabase.from('market_global_stock').update({ stock: currentStock - 1 }).eq('dino_id', dino.id);
      await fetchMarketData();
    }

    const { data: newBalance, error } = await supabase.rpc('add_money_safe', { 
      p_user_id: currentUser!.id, 
      p_amount: -dino.price 
    });

    if (error || newBalance === null) return triggerNotification("ERRO NA TRANSAÇÃO!");

    const nextOwned = JSON.parse(JSON.stringify(ownedDinos));
    nextOwned[dino.id] = [...(nextOwned[dino.id] || []), serial];
    
    setMoney(Number(newBalance));
    setOwnedDinos(nextOwned);
    await saveUserState({ ownedDinos: nextOwned });
    
    setShopDinoDetail(null);
    triggerNotification(`${dino.name} ADQUIRIDO!`);
  };

  const deployDino = async (type: DinosaurType, serial: number) => {
    if (territoryDinos.length >= 5) return triggerNotification("LOTAÇÃO MÁXIMA!");
    const nextTerritory = JSON.parse(JSON.stringify(territoryDinos));
    nextTerritory.push({ instanceId: Math.random().toString(36).substr(2, 9), type, serial });
    setTerritoryDinos(nextTerritory);
    setShowDeployList(false);
    await saveUserState({ territoryDinos: nextTerritory });
  };

  const undeployDino = async (instanceId: string) => {
    const nextTerritory = territoryDinos.filter(d => d.instanceId !== instanceId);
    setTerritoryDinos(nextTerritory);
    setSelectedTerritoryDino(null);
    await saveUserState({ territoryDinos: nextTerritory });
  };

  const buyFromMarket = async (listing: MarketListing) => {
    if (!currentUser || money < listing.price) return triggerNotification("SEM CAPITAL!");
    const { error: delError } = await supabase.from('market_listings').delete().eq('id', listing.id);
    if (delError) return;
    const { data: newBalance } = await supabase.rpc('add_money_safe', { p_user_id: currentUser.id, p_amount: -listing.price });
    await supabase.rpc('add_money_safe', { p_user_id: listing.sellerId, p_amount: listing.price });
    if (newBalance !== null) setMoney(Number(newBalance));
    const nextOwned = JSON.parse(JSON.stringify(ownedDinos));
    nextOwned[listing.dinoType] = [...(nextOwned[listing.dinoType] || []), listing.serial];
    setOwnedDinos(nextOwned);
    await saveUserState({ ownedDinos: nextOwned });
    await fetchMarketData();
    triggerNotification("MERCADO: COMPRADO!");
  };

  const handleMarketListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || sellForm.price <= 0) return triggerNotification("VALOR INVÁLIDO!");
    const newOwned = JSON.parse(JSON.stringify(ownedDinos));
    const typeSerials = [...newOwned[sellForm.type]];
    const removedSerial = typeSerials.splice(sellForm.dinoIdx, 1)[0];
    newOwned[sellForm.type] = typeSerials;
    const { error } = await supabase.from('market_listings').insert({ seller_id: currentUser.id, seller_name: currentUser.username, dino_type: sellForm.type, serial: removedSerial, price: sellForm.price });
    if (!error) {
      setOwnedDinos(newOwned);
      const nextTerritory = territoryDinos.filter(d => !(d.type === sellForm.type && d.serial === removedSerial));
      setTerritoryDinos(nextTerritory);
      await saveUserState({ ownedDinos: newOwned, territoryDinos: nextTerritory });
      await fetchMarketData();
      setShowSellModal(false);
      triggerNotification("ITEM LISTADO!");
    }
  };

  // --- Rendering UI ---
  if (isLoading && !currentUser) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-[10px] text-yellow-500 uppercase">Aguardando Conexão...</div>;

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
      <div className="w-full max-w-sm bg-neutral-900 pixel-border p-8 text-center">
        <PixelDino type="TREX" size={100} className="animate-bounce mb-6" />
        <h1 className="text-lg text-yellow-500 mb-8 uppercase tracking-tighter">DINO TYCOON</h1>
        <form onSubmit={handleAuth} className="space-y-6">
          {authMode === 'REGISTER' && (
            <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] text-white uppercase" placeholder="Usuário" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required />
          )}
          <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] text-white" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
          <input type="password" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] text-white" placeholder="Senha" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
          <button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 text-[9px] font-bold border-b-4 border-yellow-800">{authMode === 'LOGIN' ? 'ENTRAR' : 'CADASTRAR'}</button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="mt-8 text-[7px] text-neutral-500 hover:text-white uppercase underline">{authMode === 'LOGIN' ? 'Nova Conta' : 'Já possuo conta'}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 bg-neutral-950">
      <div className="sticky top-0 bg-neutral-900 border-b-4 border-black p-4 z-50 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="flex flex-col"><span className="text-[6px] text-neutral-500 uppercase font-bold">Capital Real</span><span className="text-xs text-yellow-500 font-bold">R$ {formatCurrency(money)}</span></div>
           <div className="flex flex-col ml-4"><span className="text-[6px] text-neutral-500 uppercase font-bold">Renda Passiva</span><span className="text-[10px] text-green-500 font-bold">+R$ {totalIncome.toFixed(1)}/s</span></div>
           {isSaving && <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping ml-2"></div>}
        </div>
        <button onClick={() => { setActiveScreen('PROFILE'); setIsEditingProfile(false); }} className={`w-14 h-14 rounded-full border-4 shadow-inner bg-neutral-800 flex items-center justify-center overflow-hidden transition-all ${activeScreen === 'PROFILE' ? 'border-yellow-500 scale-110' : 'border-yellow-600'}`}><PixelDino type={currentUser.avatarType} size={42} /></button>
      </div>

      <main className="mt-8 container mx-auto px-4 max-w-6xl">
        {activeScreen === 'TERRITORIO' && (
          <div className="flex flex-col items-center gap-8">
            <h2 className="text-xl text-yellow-400 mb-2 uppercase tracking-widest">Território</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full max-w-4xl">
              {[0, 1, 2, 3, 4].map(i => {
                const d = territoryDinos[i];
                return (
                  <div key={i} className={`h-48 pixel-border flex flex-col items-center justify-center transition-all ${d ? 'bg-neutral-800 cursor-pointer hover:bg-neutral-700' : 'bg-neutral-900/50 border-2 border-dashed border-neutral-800'}`} onClick={() => d ? setSelectedTerritoryDino(d) : setShowDeployList(true)}>
                    {d ? (<><PixelDino type={d.type} size={64} className="animate-bounce mb-4" /><p className="text-[7px] uppercase font-bold text-white text-center">{DINOSAURS[d.type].name}</p><p className="text-[6px] text-green-400 mt-1 font-bold">+R$ {DINOSAURS[d.type].incomePerSecond}/s</p></>) : <span className="text-2xl opacity-10">+</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeScreen === 'SHOP' && (
           <div className="flex flex-col items-center gap-6">
             <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6">
               <button onClick={() => setShopTab('GERAL')} className={`flex-1 py-3 text-[8px] font-bold ${shopTab === 'GERAL' ? 'bg-green-600 text-black' : 'text-neutral-500'}`}>COMUNS</button>
               <button onClick={() => setShopTab('LIMITADO')} className={`flex-1 py-3 text-[8px] font-bold ${shopTab === 'LIMITADO' ? 'bg-orange-600 text-black' : 'text-neutral-500'}`}>LIMITADOS</button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
               {(shopTab === 'GERAL' ? Object.values(DINOSAURS).filter(d => !d.isLimited) : Object.values(DINOSAURS).filter(d => d.isLimited)).map(dino => {
                 const isOwned = !dino.isLimited && ownedDinos[dino.id]?.length > 0;
                 return (
                   <div key={dino.id} onClick={() => !isOwned && setShopDinoDetail(dino)} className={`bg-neutral-800 p-4 border-4 border-neutral-700 flex flex-col items-center gap-4 cursor-pointer hover:bg-neutral-700 ${isOwned ? 'grayscale opacity-50' : ''}`}>
                      <PixelDino type={dino.id} size={56} />
                      <p className="text-[7px] text-white uppercase font-bold text-center">{dino.name}</p>
                      <p className="text-[8px] text-yellow-500 font-bold">R$ {dino.price.toLocaleString()}</p>
                   </div>
                 );
               })}
             </div>
           </div>
        )}

        {activeScreen === 'MARKETPLACE' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center"><h2 className="text-xl text-teal-400 uppercase font-bold tracking-widest">MERCADO</h2><button onClick={() => setShowSellModal(true)} className="bg-teal-600 text-black px-6 py-2 text-[8px] font-bold border-b-4 border-teal-800">VENDER</button></div>
            <div className="flex bg-neutral-900 border-4 border-black p-1">
              <button onClick={() => setMarketTab('COMPRAR')} className={`flex-1 py-3 text-[8px] font-bold ${marketTab === 'COMPRAR' ? 'bg-teal-600 text-black' : 'text-neutral-500'}`}>COMPRAR</button>
              <button onClick={() => setMarketTab('MINHAS_VENDAS')} className={`flex-1 py-3 text-[8px] font-bold ${marketTab === 'MINHAS_VENDAS' ? 'bg-teal-600 text-black' : 'text-neutral-500'}`}>MEUS ITENS</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketTab === 'COMPRAR' ? (
                marketListings.length > 0 ? marketListings.map(l => (
                  <div key={l.id} className="bg-neutral-800 border-2 border-neutral-700 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4"><PixelDino type={l.dinoType} size={48} /><div className="flex flex-col"><span className="text-[8px] text-white font-bold uppercase">{DINOSAURS[l.dinoType].name} #{l.serial}</span><span className="text-[6px] text-neutral-500 uppercase">VENDEDOR: {l.sellerName}</span><span className="text-[8px] text-yellow-500 font-bold mt-1">R$ {l.price.toLocaleString()}</span></div></div>
                    {l.sellerId !== currentUser.id && <button onClick={() => buyFromMarket(l)} className="bg-green-600 text-white px-4 py-2 text-[7px] font-bold border-b-4 border-green-800">COMPRAR</button>}
                  </div>
                )) : <p className="col-span-full text-center text-[7px] opacity-40 py-10 uppercase font-bold">O mercado está vazio.</p>
              ) : (
                marketListings.filter(l => l.sellerId === currentUser.id).length > 0 ? marketListings.filter(l => l.sellerId === currentUser.id).map(l => (
                  <div key={l.id} className="bg-neutral-800 border-2 border-neutral-700 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4"><PixelDino type={l.dinoType} size={48} /><div className="flex flex-col"><span className="text-[8px] text-white font-bold uppercase">{DINOSAURS[l.dinoType].name} #{l.serial}</span><span className="text-[8px] text-yellow-500 font-bold mt-1">R$ {l.price.toLocaleString()}</span></div></div>
                    <button className="bg-red-900 text-white px-4 py-2 text-[7px] font-bold border-b-4 border-red-950 opacity-50 cursor-not-allowed">LISTADO</button>
                  </div>
                )) : <p className="col-span-full text-center text-[7px] opacity-40 py-10 uppercase font-bold">Você não tem vendas.</p>
              )}
            </div>
          </div>
        )}

        {activeScreen === 'PROFILE' && (
          <div className="flex flex-col items-center gap-8 max-w-xl mx-auto">
            <div className="w-full bg-neutral-900 pixel-border p-8 text-center"><div className="flex justify-center mb-6"><PixelDino type={currentUser.avatarType} size={100} /></div><h3 className="text-lg uppercase text-white mb-2">{currentUser.username}</h3><p className="text-[7px] text-blue-400 mb-6 uppercase">{currentUser.email}</p><button onClick={handleLogout} className="text-[8px] text-red-500 underline font-bold uppercase">Sair da Conta</button></div>
          </div>
        )}

        {activeScreen === 'ALBUM' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Object.values(DINOSAURS).filter(d => (ownedDinos[d.id] || []).length > 0).map(dino => (<div key={dino.id} className="p-4 border-4 bg-neutral-800 border-white flex flex-col items-center"><PixelDino type={dino.id} size={56} /><p className="text-[7px] mt-4 uppercase font-bold text-white">{dino.name}</p><p className="text-[5px] text-yellow-500 uppercase font-bold">{ownedDinos[dino.id].length} UNID.</p></div>))}</div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t-4 border-black flex h-24 z-50">
        {[{ id: 'TERRITORIO', label: 'CAMPO' }, { id: 'SHOP', label: 'LOJA' }, { id: 'MARKETPLACE', label: 'MERCADO' }, { id: 'SOCIAL', label: 'SOCIAL' }, { id: 'ALBUM', label: 'ÁLBUM' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveScreen(tab.id as Screen)} className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 ${activeScreen === tab.id ? 'bg-neutral-800 text-yellow-500' : 'text-neutral-500'}`}>
            <span className="text-[7px] font-bold uppercase">{tab.label}</span>
            {tab.id === 'SOCIAL' && pendingRequestsCount > 0 ? (
              <span className="absolute top-4 right-6 w-3 h-3 bg-red-600 rounded-full text-[6px] flex items-center justify-center text-white">{pendingRequestsCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {showNotification && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-yellow-600 text-black px-6 py-2 text-[8px] font-bold border-2 border-black z-[100] animate-bounce">{showNotification}</div>}
      
      {showDeployList && (
        <div className="fixed inset-0 bg-black/95 z-[100] p-8 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-2xl flex justify-between mb-8"><h3 className="text-yellow-500 text-xs font-bold uppercase">ALOCAR DINO</h3><button onClick={() => setShowDeployList(false)} className="text-red-500 text-xs font-bold uppercase underline">Fechar</button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => 
              serials.filter(s => !territoryDinos.some(td => td.type === type && td.serial === s)).map((s, idx) => (
                <div key={`${type}-${s}-${idx}`} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex flex-col items-center gap-2 cursor-pointer hover:border-yellow-500" onClick={() => deployDino(type, s)}><PixelDino type={type} size={48} /><p className="text-[6px] text-white uppercase font-bold">{DINOSAURS[type].name}</p></div>)))}
          </div>
        </div>
      )}

      {selectedTerritoryDino && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center" onClick={() => setSelectedTerritoryDino(null)}>
          <div className="bg-neutral-900 p-8 pixel-border flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}><PixelDino type={selectedTerritoryDino.type} size={80} /><p className="text-[8px] text-white uppercase font-bold">{DINOSAURS[selectedTerritoryDino.type].name}</p><button onClick={() => undeployDino(selectedTerritoryDino.instanceId)} className="bg-red-900 text-white px-6 py-3 text-[8px] font-bold border-b-4 border-red-950 uppercase">Recolher</button></div>
        </div>
      )}

      {shopDinoDetail && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShopDinoDetail(null)}>
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-xs text-center flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
            <PixelDino type={shopDinoDetail.id} size={80} />
            <div className="space-y-2"><h3 className="text-[10px] text-white font-bold uppercase">{shopDinoDetail.name}</h3><p className="text-[10px] text-yellow-500 font-bold">R$ {shopDinoDetail.price.toLocaleString()}</p></div>
            <button onClick={() => buyDino(shopDinoDetail)} className="w-full bg-green-600 text-white py-4 text-[8px] font-bold border-b-4 border-green-800 uppercase">Investir</button>
          </div>
        </div>
      )}

      {offlineReport && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6"><div className="bg-neutral-900 pixel-border p-10 text-center flex flex-col items-center gap-6"><h2 className="text-lg text-green-400 uppercase font-bold">BEM-VINDO!</h2><p className="text-yellow-500 text-lg uppercase font-bold">LUCRO: R$ {formatCurrency(offlineReport.profit)}</p><button onClick={() => setOfflineReport(null)} className="w-full bg-green-600 text-white py-4 text-[10px] font-bold border-b-4 border-green-900 uppercase">COLETAR</button></div></div>
      )}

      {showSellModal && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-sm">
            <h3 className="text-[9px] mb-6 text-center text-teal-500 font-bold uppercase">LISTAR NO MERCADO</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => serials.map((serial, idx) => {
                if (!DINOSAURS[type].isLimited) return null;
                return (
                  <div key={`${type}-${idx}`} onClick={() => setSellForm({...sellForm, type, serial, dinoIdx: idx})} className={`p-3 bg-neutral-800 border-2 cursor-pointer flex justify-between items-center ${sellForm.serial === serial && sellForm.type === type ? 'border-teal-500' : 'border-neutral-700'}`}><span className="text-[6px] text-white uppercase font-bold">{DINOSAURS[type].name} #{serial}</span><PixelDino type={type} size={24} /></div>);
              }))}
            </div>
            <input type="number" placeholder="VALOR (R$)" className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] mb-6 text-white" value={sellForm.price || ''} onChange={e => setSellForm({...sellForm, price: Number(e.target.value)})} />
            <div className="flex gap-4"><button onClick={handleMarketListing} disabled={sellForm.dinoIdx === -1} className="flex-1 bg-teal-600 text-black py-4 text-[8px] font-bold border-b-4 border-teal-800 disabled:opacity-50 uppercase">POSTAR</button><button onClick={() => setShowSellModal(false)} className="flex-1 bg-neutral-700 text-white py-4 text-[8px] font-bold border-b-4 border-neutral-900 uppercase">CANCELAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
