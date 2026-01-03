
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DINOSAURS, INITIAL_STATE } from './constants';
import { DinosaurType, Rarity, User, Dinosaur, FriendRequest, DeployedDino, MarketListing } from './types';
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
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Game State ---
  const [money, setMoney] = useState(0);
  const [ownedDinos, setOwnedDinos] = useState<Record<DinosaurType, number[]>>(INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>);
  const [territoryDinos, setTerritoryDinos] = useState<DeployedDino[]>([]);
  const [activeScreen, setActiveScreen] = useState<Screen>('TERRITORIO');
  const [shopTab, setShopTab] = useState<ShopTab>('GERAL');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [selectedTerritoryDino, setSelectedTerritoryDino] = useState<DeployedDino | null>(null);
  const [shopDinoDetail, setShopDinoDetail] = useState<Dinosaur | null>(null);
  const [albumDinoDetail, setAlbumDinoDetail] = useState<Dinosaur | null>(null);
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

  // --- Supabase Syncing ---
  const syncUserToDB = useCallback(async (user: User) => {
    await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      email: user.email,
      password_hash: user.passwordHash,
      money: user.money,
      owned_dinos: user.ownedDinos,
      territory_dinos: user.territoryDinos,
      avatar_type: user.avatarType,
      friends: user.friends,
      friend_requests: user.friendRequests,
      last_active_at: new Date().toISOString()
    });
  }, []);

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

  // --- Initial Load ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const savedUserId = localStorage.getItem('dino_user_id');
      
      if (savedUserId) {
        const { data: userRaw } = await supabase.from('users').select('*').eq('id', savedUserId).maybeSingle();
        const user = userRaw as any;
        if (user) {
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
          calculateOfflineEarnings(loadedUser);
        }
      }
      await fetchMarketData();
      setIsLoading(false);
    };
    init();
  }, [fetchMarketData]);

  // --- Real-time Local and Periodic DB Sync ---
  useEffect(() => {
    if (currentUser && !isLoading) {
      const updatedUser = { 
        ...currentUser, 
        money, 
        ownedDinos, 
        territoryDinos,
        lastActiveAt: new Date().toISOString() 
      };
      syncUserToDB(updatedUser);
    }
  }, [money, ownedDinos, territoryDinos, currentUser, isLoading, syncUserToDB]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      setMoney(prev => prev + totalIncome);
    }, 1000);
    return () => clearInterval(timer);
  }, [totalIncome, currentUser]);

  const calculateOfflineEarnings = (user: User) => {
    if (!user.lastActiveAt) return;
    const lastActive = new Date(user.lastActiveAt).getTime();
    const now = Date.now();
    const diffSeconds = Math.floor((now - lastActive) / 1000);
    
    if (diffSeconds >= 30) {
      const income = (user.territoryDinos || []).reduce((acc, deployed) => {
        const dino = DINOSAURS[deployed.type];
        return acc + (dino?.incomePerSecond || 0);
      }, 0);
      
      const profit = diffSeconds * income;
      if (profit > 0) {
        setOfflineReport({ seconds: diffSeconds, profit: profit, incomePerSec: income });
        setMoney(prev => prev + profit);
      }
    }
  };

  // --- Social Logic ---
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('id, username, avatarType:avatar_type, territoryDinos:territory_dinos')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);
      
      if (data) {
        setSearchResults(data.filter((u: any) => u.id !== currentUser?.id) as any);
      }
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
      const { data } = await supabase
        .from('users')
        .select('id, username, avatarType:avatar_type, territoryDinos:territory_dinos')
        .in('id', currentUser.friends);
      
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
      if (requests.some((r: any) => r.fromId === currentUser.id)) {
        return triggerNotification("PEDIDO JÁ ENVIADO!");
      }
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

  const rejectFriendRequest = async (requestId: string) => {
    if (!currentUser) return;
    const myRequests = currentUser.friendRequests.filter(r => r.fromId !== requestId);
    await supabase.from('users').update({ friend_requests: myRequests }).eq('id', currentUser.id);
    setCurrentUser({ ...currentUser, friendRequests: myRequests });
    triggerNotification("PEDIDO NEGADO.");
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

  const viewUserProfile = (user: User) => {
    setViewingUser(user);
    setActiveScreen('VIEW_PROFILE');
  };

  // --- Auth Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'REGISTER') {
      const { data: existing } = await supabase.from('users').select('id').or(`username.eq.${authForm.username},email.eq.${authForm.email}`).maybeSingle();
      if (existing) return triggerNotification("USUÁRIO OU EMAIL JÁ EXISTE!");

      const userId = Math.random().toString(36).substr(2, 6).toUpperCase();
      const newUser: User = {
        id: userId,
        username: authForm.username,
        displayName: authForm.username,
        email: authForm.email,
        passwordHash: authForm.password,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        avatarType: 'VELOCIRAPTOR',
        money: INITIAL_STATE.money,
        ownedDinos: INITIAL_STATE.ownedDinos as Record<DinosaurType, number[]>,
        territoryDinos: [],
        friends: [],
        friendRequests: []
      };

      const { error } = await supabase.from('users').insert({
        id: newUser.id,
        username: newUser.username,
        display_name: newUser.displayName,
        email: newUser.email,
        password_hash: newUser.passwordHash,
        money: newUser.money,
        owned_dinos: newUser.ownedDinos,
        // FIX: Corrected property access to territoryDinos (camelCase) on newUser object
        territory_dinos: newUser.territoryDinos,
        avatar_type: newUser.avatarType,
        friends: newUser.friends,
        friend_requests: newUser.friendRequests
      });

      if (!error) {
        triggerNotification("CONTA CRIADA!");
        setAuthMode('LOGIN');
      }
    } else {
      const { data: userRaw } = await supabase.from('users')
        .select('*')
        .or(`email.eq.${authForm.email},username.eq.${authForm.email}`)
        .eq('password_hash', authForm.password)
        .maybeSingle();
      const user = userRaw as any;

      if (user) {
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
        localStorage.setItem('dino_user_id', loadedUser.id);
        setCurrentUser(loadedUser);
        setMoney(loadedUser.money);
        setOwnedDinos(loadedUser.ownedDinos);
        setTerritoryDinos(loadedUser.territoryDinos);
        setEditForm({ avatarType: loadedUser.avatarType, password: '' });
        calculateOfflineEarnings(loadedUser);
        triggerNotification(`BEM-VINDO!`);
      } else {
        triggerNotification("DADOS INVÁLIDOS!");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dino_user_id');
    setCurrentUser(null);
    setActiveScreen('TERRITORIO');
    setOfflineReport(null);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const updatedPassword = editForm.password.trim() !== '' ? editForm.password : currentUser.passwordHash;
    const updatedUser = { 
      ...currentUser, 
      avatarType: editForm.avatarType,
      passwordHash: updatedPassword
    };
    
    const { error } = await supabase.from('users').update({
        avatar_type: editForm.avatarType,
        password_hash: updatedPassword
    }).eq('id', currentUser.id);

    if (!error) {
        setCurrentUser(updatedUser);
        setIsEditingProfile(false);
        triggerNotification("PERFIL ATUALIZADO!");
    } else {
        triggerNotification("ERRO AO SALVAR!");
    }
  };

  // --- Shop Logic ---
  const buyDino = async (dino: Dinosaur) => {
    if (money < dino.price) return triggerNotification("SEM DINHEIRO!");
    if (!dino.isLimited && ownedDinos[dino.id] && ownedDinos[dino.id].length > 0) {
      return triggerNotification("VOCÊ JÁ POSSUI ESTE DINOSSAURO!");
    }

    let serial = 0;
    if (dino.isLimited) {
      const { data: stockData } = await supabase.from('market_global_stock').select('stock').eq('dino_id', dino.id).maybeSingle();
      const currentStock = (stockData as any)?.stock ?? 0;
      if (currentStock <= 0) return triggerNotification("ESGOTADO!");
      
      serial = (dino.initialStock || 0) - currentStock + 1;
      await supabase.from('market_global_stock').update({ stock: currentStock - 1 }).eq('dino_id', dino.id);
      await fetchMarketData();
    }

    setMoney(prev => prev - dino.price);
    setOwnedDinos(prev => ({
      ...prev,
      [dino.id]: [...(prev[dino.id] || []), serial]
    }));
    setShopDinoDetail(null);
    triggerNotification(`${dino.name} ADQUIRIDO!`);
  };

  // --- Territory Logic ---
  const deployDino = (type: DinosaurType, serial: number) => {
    if (territoryDinos.length >= 5) return triggerNotification("TERRITÓRIO LOTADO!");
    const isAlreadyDeployed = territoryDinos.some(d => d.type === type && d.serial === serial);
    if (isAlreadyDeployed) return triggerNotification("JÁ ESTÁ NO TERRITÓRIO!");

    setTerritoryDinos(prev => [...prev, { instanceId: Math.random().toString(36).substr(2, 9), type, serial }]);
    setShowDeployList(false);
  };

  const undeployDino = (instanceId: string) => {
    setTerritoryDinos(prev => prev.filter(d => d.instanceId !== instanceId));
    setSelectedTerritoryDino(null);
  };

  // --- Marketplace Logic ---
  const handleMarketListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || sellForm.price <= 0) return triggerNotification("VALOR INVÁLIDO!");

    const newOwned = { ...ownedDinos };
    const typeSerials = [...newOwned[sellForm.type]];
    const removedSerial = typeSerials.splice(sellForm.dinoIdx, 1)[0];
    newOwned[sellForm.type] = typeSerials;

    const { error } = await supabase.from('market_listings').insert({
      seller_id: currentUser.id,
      seller_name: currentUser.username,
      dino_type: sellForm.type,
      serial: removedSerial,
      price: sellForm.price
    });

    if (!error) {
      setOwnedDinos(newOwned);
      setTerritoryDinos(prev => prev.filter(d => !(d.type === sellForm.type && d.serial === removedSerial)));
      await fetchMarketData();
      setShowSellModal(false);
      triggerNotification("ITEM NO MERCADO!");
    }
  };

  const buyFromMarket = async (listing: MarketListing) => {
    if (!currentUser || money < listing.price) return triggerNotification("SEM DINHEIRO!");
    
    const dino = DINOSAURS[listing.dinoType];
    if (!dino.isLimited && ownedDinos[listing.dinoType] && ownedDinos[listing.dinoType].length > 0) {
      return triggerNotification("VOCÊ JÁ POSSUI ESTE DINOSSAURO GERAL!");
    }

    const { error } = await supabase.from('market_listings').delete().eq('id', listing.id);
    if (error) return;

    const { data: seller } = await supabase.from('users').select('money').eq('id', listing.sellerId).maybeSingle();
    if (seller) {
      await supabase.from('users').update({ money: Number((seller as any).money) + listing.price }).eq('id', listing.sellerId);
    }

    setMoney(prev => prev - listing.price);
    setOwnedDinos(prev => ({
      ...prev,
      [listing.dinoType]: [...(prev[listing.dinoType] || []), listing.serial]
    }));
    await fetchMarketData();
    triggerNotification("COMPRA REALIZADA!");
  };

  const cancelMarketListing = async (listing: MarketListing) => {
    const { error } = await supabase.from('market_listings').delete().eq('id', listing.id);
    if (!error) {
      setOwnedDinos(prev => ({
        ...prev,
        [listing.dinoType]: [...(prev[listing.dinoType] || []), listing.serial]
      }));
      await fetchMarketData();
    }
  };

  // --- Rendering Screens ---
  const renderSocialScreen = () => (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <h2 className="text-xl text-pink-500 uppercase font-bold text-center tracking-widest">Social</h2>
      
      <div className="flex bg-neutral-900 border-4 border-black p-1">
        <button onClick={() => setSocialTab('AMIGOS')} className={`flex-1 py-3 text-[7px] font-bold ${socialTab === 'AMIGOS' ? 'bg-pink-600 text-black' : 'text-neutral-500'}`}>AMIGOS</button>
        <button onClick={() => setSocialTab('PEDIDOS')} className={`flex-1 py-3 text-[7px] font-bold relative ${socialTab === 'PEDIDOS' ? 'bg-pink-600 text-black' : 'text-neutral-500'}`}>
          PEDIDOS
          {pendingRequestsCount > 0 && <span className="absolute top-1 right-2 w-3 h-3 bg-red-600 rounded-full text-[6px] flex items-center justify-center text-white">{pendingRequestsCount}</span>}
        </button>
        <button onClick={() => setSocialTab('BUSCAR')} className={`flex-1 py-3 text-[7px] font-bold ${socialTab === 'BUSCAR' ? 'bg-pink-600 text-black' : 'text-neutral-500'}`}>BUSCAR</button>
      </div>

      {socialTab === 'AMIGOS' && (
        <div className="grid grid-cols-1 gap-3">
          {friendsList.map(friend => (
            <div key={friend.id} onClick={() => viewUserProfile(friend)} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex items-center justify-between cursor-pointer hover:bg-neutral-700">
              <div className="flex items-center gap-4">
                <PixelDino type={friend.avatarType} size={32} />
                <span className="text-[8px] text-white font-bold uppercase">{friend.username}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeFriend(friend.id); }} className="text-[6px] text-red-500 underline font-bold">REMOVER</button>
            </div>
          ))}
          {friendsList.length === 0 && <p className="text-center text-[7px] opacity-40 py-10 uppercase">Nenhum amigo ainda.</p>}
        </div>
      )}

      {socialTab === 'PEDIDOS' && (
        <div className="flex flex-col gap-3">
          {currentUser?.friendRequests.map(req => (
            <div key={req.fromId} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex items-center justify-between">
              <span className="text-[7px] text-white font-bold uppercase">{req.fromUsername} quer ser seu amigo!</span>
              <div className="flex gap-2">
                <button onClick={() => acceptFriendRequest(req.fromId)} className="bg-green-600 text-black px-3 py-2 text-[6px] font-bold uppercase">ACEITAR</button>
                <button onClick={() => rejectFriendRequest(req.fromId)} className="bg-red-900 text-white px-3 py-2 text-[6px] font-bold uppercase">RECUSAR</button>
              </div>
            </div>
          ))}
          {pendingRequestsCount === 0 && <p className="text-center text-[7px] opacity-40 py-10 uppercase">Sem novos pedidos.</p>}
        </div>
      )}

      {socialTab === 'BUSCAR' && (
        <div className="flex flex-col gap-6">
          <input 
            type="text" 
            placeholder="PESQUISAR USUÁRIO..." 
            className="w-full bg-neutral-900 border-4 border-black p-4 text-[9px] text-white focus:outline-none focus:border-pink-500 uppercase"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3">
            {searchResults.map(user => (
              <div key={user.id} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => viewUserProfile(user)}>
                  <PixelDino type={user.avatarType} size={32} />
                  <span className="text-[8px] text-white font-bold uppercase">{user.username}</span>
                </div>
                {currentUser?.friends.includes(user.id) ? (
                  <span className="text-[6px] text-green-500 font-bold uppercase">JÁ É AMIGO</span>
                ) : (
                  <button onClick={() => sendFriendRequest(user.id)} className="bg-pink-600 text-black px-4 py-2 text-[7px] font-bold uppercase border-b-4 border-pink-800">ADICIONAR</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderViewProfile = () => {
    if (!viewingUser) return null;
    
    const viewingUserIncome = viewingUser.territoryDinos.reduce((acc, deployed) => {
      const dino = DINOSAURS[deployed.type];
      return acc + (dino?.incomePerSecond || 0);
    }, 0);

    return (
      <div className="flex flex-col items-center gap-8 max-w-xl mx-auto">
        <div className="w-full flex justify-between items-center mb-4">
          <button onClick={() => setActiveScreen('SOCIAL')} className="text-[8px] text-neutral-500 font-bold uppercase hover:text-white">← VOLTAR</button>
          <h2 className="text-[8px] text-pink-500 font-bold uppercase tracking-widest">PERFIL DE {viewingUser.username}</h2>
        </div>

        <div className="w-full bg-neutral-900 pixel-border p-8 text-center">
          <div className="flex justify-center mb-6">
            <PixelDino type={viewingUser.avatarType} size={100} />
          </div>
          <h3 className="text-lg uppercase text-white mb-2">{viewingUser.username}</h3>
          <p className="text-[7px] text-blue-400 mb-2 uppercase font-bold">USUÁRIO ID: {viewingUser.id}</p>
          <div className="mt-4 p-4 border-t-2 border-neutral-800">
            <p className="text-[7px] text-neutral-500 uppercase mb-1 font-bold">Rendimento Gerado</p>
            <p className="text-md text-green-500 font-bold">R$ {viewingUserIncome.toFixed(1)}/s</p>
          </div>
        </div>

        <div className="w-full">
           <h4 className="text-[8px] text-yellow-500 uppercase mb-4 text-center font-bold">TERRITÓRIO ATUAL</h4>
           <div className="grid grid-cols-5 gap-2">
              {viewingUser.territoryDinos.map((d, i) => (
                <div key={i} className="aspect-square bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
                  <PixelDino type={d.type} size={32} />
                </div>
              ))}
              {Array.from({ length: 5 - viewingUser.territoryDinos.length }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-neutral-900/50 border-2 border-dashed border-neutral-800" />
              ))}
           </div>
        </div>
      </div>
    );
  };

  const renderProfileScreen = () => {
    if (!currentUser) return null;
    return (
      <div className="flex flex-col items-center gap-8 max-w-xl mx-auto">
        <div className="w-full bg-neutral-900 pixel-border p-8 text-center relative">
          <div className="flex justify-center mb-6">
            <PixelDino type={currentUser.avatarType} size={100} />
          </div>
          <h3 className="text-lg uppercase text-white mb-2">{currentUser.username}</h3>
          <p className="text-[7px] text-blue-400 mb-6 uppercase font-bold">{currentUser.email}</p>
          
          <div className="flex flex-col gap-4">
            <button onClick={() => setIsEditingProfile(true)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 text-[8px] font-bold uppercase border-b-4 border-blue-800">EDITAR PERFIL</button>
            <button onClick={() => setActiveScreen('SOCIAL')} className="w-full bg-pink-600 hover:bg-pink-500 text-white py-3 text-[8px] font-bold uppercase border-b-4 border-pink-800">AMIZADES</button>
            <button onClick={handleLogout} className="text-[8px] text-red-500 underline font-bold uppercase">Sair da Conta</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-neutral-900 pixel-border p-6 text-center">
            <p className="text-[7px] text-neutral-500 uppercase mb-2 font-bold">Coleção</p>
            <p className="text-md text-white font-bold">{Object.values(ownedDinos).flat().length}</p>
          </div>
          <div className="bg-neutral-900 pixel-border p-6 text-center">
            <p className="text-[7px] text-neutral-500 uppercase mb-2 font-bold">Minha Renda</p>
            <p className="text-md text-green-500 font-bold">R$ {totalIncome.toFixed(1)}/s</p>
          </div>
        </div>

        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4">
            <div className="bg-neutral-900 pixel-border p-8 w-full max-w-md">
              <h2 className="text-sm text-yellow-500 mb-6 uppercase text-center">Configurações de Perfil</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[7px] text-neutral-500 uppercase block mb-3 font-bold">Selecione seu Avatar</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(DINOSAURS) as DinosaurType[]).map(type => (
                      <div 
                        key={type} 
                        onClick={() => setEditForm({...editForm, avatarType: type})}
                        className={`p-2 bg-neutral-800 border-2 cursor-pointer flex items-center justify-center transition-all ${editForm.avatarType === type ? 'border-yellow-500 bg-yellow-900/20' : 'border-neutral-700'}`}
                      >
                        <PixelDino type={type} size={40} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[7px] text-neutral-500 uppercase block mb-1 font-bold">Nova Senha</label>
                  <input type="password" placeholder="Deixe em branco para manter" className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] text-white focus:outline-none focus:border-yellow-500" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={handleSaveProfile} className="flex-1 bg-green-600 text-white py-4 text-[8px] font-bold border-b-4 border-green-800 uppercase">Salvar</button>
                  <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-neutral-700 text-white py-4 text-[8px] font-bold border-b-4 border-neutral-900 uppercase">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMarketplaceScreen = () => (
    <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
      <h2 className="text-xl text-cyan-400 mb-2 uppercase tracking-widest font-bold">Marketplace</h2>
      <div className="bg-yellow-900/30 border-2 border-yellow-700 p-3 w-full mb-4">
        <p className="text-[7px] text-yellow-500 text-center uppercase font-bold leading-relaxed">
          ⚠️ Aviso: Apenas dinossauros limitados (Lendários com serial) podem ser negociados entre jogadores.
        </p>
      </div>

      <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6">
        <button onClick={() => setMarketTab('COMPRAR')} className={`flex-1 py-3 text-[8px] font-bold ${marketTab === 'COMPRAR' ? 'bg-cyan-600 text-black' : 'text-neutral-500'}`}>COMPRAR</button>
        <button onClick={() => setMarketTab('MINHAS_VENDAS')} className={`flex-1 py-3 text-[8px] font-bold ${marketTab === 'MINHAS_VENDAS' ? 'bg-teal-600 text-black' : 'text-neutral-500'}`}>MINHAS VENDAS</button>
      </div>

      {marketTab === 'COMPRAR' ? (
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {marketListings.filter(l => l.sellerId !== currentUser?.id).map(listing => {
            const dino = DINOSAURS[listing.dinoType];
            const isOwnedGeneral = !dino.isLimited && ownedDinos[listing.dinoType]?.length > 0;
            return (
              <div key={listing.id} className={`bg-neutral-900 pixel-border p-6 flex flex-col items-center gap-4 hover:scale-105 transition-transform ${isOwnedGeneral ? 'opacity-50' : ''}`}>
                <PixelDino type={listing.dinoType} size={64} />
                <div className="text-center">
                  <h3 className="text-[8px] text-white uppercase font-bold">{dino.name} #{listing.serial}</h3>
                  <p className="text-[6px] text-neutral-500 uppercase mt-1 font-bold">Por: {listing.sellerName}</p>
                  <p className="text-[9px] text-yellow-500 mt-2 font-bold">R$ {listing.price.toLocaleString()}</p>
                </div>
                <button onClick={() => buyFromMarket(listing)} disabled={money < listing.price || isOwnedGeneral} className={`w-full py-2 text-[7px] font-bold ${money >= listing.price && !isOwnedGeneral ? 'bg-cyan-600 text-black' : 'bg-neutral-800 text-neutral-600'}`}>
                  {isOwnedGeneral ? 'JÁ POSSUI' : 'COMPRAR'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full space-y-6">
          <button onClick={() => setShowSellModal(true)} className="w-full bg-teal-600 hover:bg-teal-500 text-black py-4 text-[9px] font-bold uppercase border-b-4 border-teal-800">LISTAR NOVO ITEM</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketListings.filter(l => l.sellerId === currentUser?.id).map(listing => (
              <div key={listing.id} className="bg-neutral-800 border-2 border-neutral-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <PixelDino type={listing.dinoType} size={42} />
                  <div>
                    <p className="text-[8px] text-white font-bold">{DINOSAURS[listing.dinoType].name} #{listing.serial}</p>
                    <p className="text-[7px] text-yellow-500 font-bold">R$ {listing.price.toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => cancelMarketListing(listing)} className="text-[6px] bg-red-900 text-white px-3 py-2 uppercase font-bold">REMOVER</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading && !currentUser) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-xs">CARREGANDO DADOS...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
        <div className="w-full max-sm bg-neutral-900 pixel-border p-8 text-center">
          <div className="flex justify-center mb-6"><PixelDino type="TREX" size={100} className="animate-bounce" /></div>
          <h1 className="text-lg text-yellow-500 mb-8 uppercase tracking-tighter">DINO PIXEL TYCOON</h1>
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'REGISTER' && (
              <div className="text-left">
                <label className="text-[7px] text-neutral-500 block mb-1 uppercase tracking-tighter">Usuário</label>
                <input className="w-full bg-neutral-800 border-2 border-neutral-700 p-3 text-[9px] focus:outline-none focus:border-yellow-500 uppercase text-white" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required />
              </div>
            )}
            <div className="text-left">
              <label className="text-[7px] text-neutral-500 block mb-1 uppercase tracking-tighter">Email ou Usuário</label>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-neutral-950">
      <div className="sticky top-0 bg-neutral-900 border-b-4 border-black p-4 z-50 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
           <div className="flex flex-col"><span className="text-[6px] text-neutral-500 uppercase font-bold">Capital</span><span className="text-xs text-yellow-500 font-bold">R$ {formatCurrency(money)}</span></div>
           <div className="h-8 w-[2px] bg-neutral-800" />
           <div className="flex flex-col"><span className="text-[6px] text-neutral-500 uppercase font-bold">Renda</span><span className="text-[10px] text-green-500 font-bold">+R$ {totalIncome.toFixed(1)}/s</span></div>
        </div>
        <button onClick={() => { setActiveScreen('PROFILE'); setIsEditingProfile(false); }} className={`w-14 h-14 rounded-full border-4 shadow-inner bg-neutral-800 flex items-center justify-center overflow-hidden transition-all ${activeScreen === 'PROFILE' ? 'border-yellow-500 scale-110' : 'border-yellow-600 hover:border-yellow-400'}`}>
           <PixelDino type={currentUser.avatarType} size={42} />
        </button>
      </div>

      <main className="mt-8 container mx-auto px-4 max-w-6xl">
        {activeScreen === 'TERRITORIO' && (
          <div className="flex flex-col items-center gap-8">
            <h2 className="text-xl text-yellow-400 mb-2 uppercase tracking-widest">Território</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full max-w-4xl">
              {[0, 1, 2, 3, 4].map(i => {
                const deployed = territoryDinos[i];
                return (
                  <div key={i} className={`h-48 pixel-border flex flex-col items-center justify-center relative transition-all ${deployed ? 'bg-neutral-800 cursor-pointer hover:bg-neutral-700' : 'bg-neutral-900/50 border-2 border-dashed border-neutral-800'}`} onClick={() => deployed ? setSelectedTerritoryDino(deployed) : setShowDeployList(true)}>
                    {deployed ? (
                      <>
                        <div className="animate-bounce mb-4"><PixelDino type={deployed.type} size={64} /></div>
                        <p className="text-[7px] uppercase font-bold text-white text-center px-1 font-pixel tracking-tighter">{DINOSAURS[deployed.type].name}</p>
                        <p className="text-[6px] text-green-400 mt-1 font-bold">+R$ {DINOSAURS[deployed.type].incomePerSecond}/s</p>
                        {deployed.serial > 0 && <span className="absolute top-2 right-2 text-[5px] text-orange-400 font-bold">#{deployed.serial}</span>}
                      </>
                    ) : <span className="text-2xl opacity-20 text-neutral-500">+</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeScreen === 'MARKETPLACE' && renderMarketplaceScreen()}
        {activeScreen === 'PROFILE' && renderProfileScreen()}
        {activeScreen === 'SOCIAL' && renderSocialScreen()}
        {activeScreen === 'VIEW_PROFILE' && renderViewProfile()}

        {activeScreen === 'SHOP' && (
           <div className="flex flex-col items-center gap-6">
             <div className="flex w-full bg-neutral-900 border-4 border-black p-1 mb-6">
               <button onClick={() => setShopTab('GERAL')} className={`flex-1 py-3 text-[8px] font-bold ${shopTab === 'GERAL' ? 'bg-green-600 text-black' : 'text-neutral-500'}`}>GERAIS</button>
               <button onClick={() => setShopTab('LIMITADO')} className={`flex-1 py-3 text-[8px] font-bold ${shopTab === 'LIMITADO' ? 'bg-orange-600 text-black' : 'text-neutral-500'}`}>LIMITADOS</button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
               {(shopTab === 'GERAL' ? Object.values(DINOSAURS).filter(d => !d.isLimited) : Object.values(DINOSAURS).filter(d => d.isLimited)).map(dino => {
                 const isOwnedGeneral = !dino.isLimited && ownedDinos[dino.id]?.length > 0;
                 return (
                   <div key={dino.id} onClick={() => !isOwnedGeneral && setShopDinoDetail(dino)} className={`bg-neutral-800 p-4 border-4 border-neutral-700 flex flex-col items-center gap-4 cursor-pointer hover:bg-neutral-700 relative ${isOwnedGeneral ? 'grayscale opacity-50 cursor-default' : ''}`}>
                      <PixelDino type={dino.id} size={56} />
                      <p className="text-[7px] text-white uppercase font-bold text-center">{dino.name}</p>
                      <p className="text-[8px] text-yellow-500 font-bold">R$ {dino.price.toLocaleString()}</p>
                      {dino.isLimited && <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[5px] p-1 border border-black font-bold">DROP: {marketStock[dino.id]}</span>}
                      {isOwnedGeneral && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-green-500 text-[6px] py-1 px-2 border border-green-500 font-bold rotate-12">ADQUIRIDO</span>}
                   </div>
                 );
               })}
             </div>
           </div>
        )}

        {activeScreen === 'ALBUM' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.values(DINOSAURS)
              .filter(dino => (ownedDinos[dino.id] || []).length > 0)
              .map(dino => {
               const serials = ownedDinos[dino.id] || [];
               return (
                 <div key={dino.id} onClick={() => setAlbumDinoDetail(dino)} className="p-4 border-4 flex flex-col items-center shadow-lg bg-neutral-800 border-white cursor-pointer hover:bg-neutral-700 transition-colors">
                    <PixelDino type={dino.id} size={56} />
                    <p className="text-[7px] mt-4 text-center uppercase font-bold text-white">{dino.name}</p>
                    <p className="text-[5px] text-yellow-500 mt-1 font-bold">{serials.length} UNIDADES</p>
                 </div>
               );
            })}
            {Object.values(DINOSAURS).filter(dino => (ownedDinos[dino.id] || []).length > 0).length === 0 && (
               <div className="col-span-full py-20 text-center">
                 <p className="text-[8px] text-neutral-500 uppercase font-bold">Seu álbum está vazio. Adquira dinos na loja!</p>
               </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t-4 border-black flex h-24 z-50">
        {[
          { id: 'TERRITORIO', label: 'CAMPO' },
          { id: 'SHOP', label: 'LOJA' },
          { id: 'MARKETPLACE', label: 'MERCADO' },
          { id: 'SOCIAL', label: 'SOCIAL', badge: pendingRequestsCount },
          { id: 'ALBUM', label: 'ÁLBUM' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveScreen(tab.id as Screen)} className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all relative ${activeScreen === tab.id ? 'bg-neutral-800 text-yellow-500' : 'text-neutral-500'}`}>
            <span className="text-[7px] font-bold uppercase">{tab.label}</span>
            {tab.badge ? <span className="absolute top-4 right-6 w-3 h-3 bg-red-600 rounded-full text-[6px] flex items-center justify-center text-white">{tab.badge}</span> : null}
          </button>
        ))}
      </nav>

      {showNotification && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-yellow-600 text-black px-6 py-2 text-[8px] font-bold border-2 border-black z-[100] animate-bounce">{showNotification}</div>}

      {showDeployList && (
        <div className="fixed inset-0 bg-black/95 z-[100] p-8 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-2xl flex justify-between mb-8"><h3 className="text-yellow-500 text-xs font-bold uppercase">ALOCAR DINOSSAURO</h3><button onClick={() => setShowDeployList(false)} className="text-red-500 text-xs font-bold">FECHAR [X]</button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => 
              serials
                .filter(serial => !territoryDinos.some(td => td.type === type && td.serial === serial))
                .map((serial, idx) => (
                  <div key={`${type}-${serial}-${idx}`} className="bg-neutral-800 p-4 border-2 border-neutral-700 flex flex-col items-center gap-2 cursor-pointer hover:border-yellow-500" onClick={() => deployDino(type, serial)}>
                    <PixelDino type={type} size={48} />
                    <p className="text-[6px] text-white uppercase font-bold">{DINOSAURS[type].name} #{serial}</p>
                  </div>
                ))
            )}
            { (Object.entries(ownedDinos) as [DinosaurType, number[]][]).every(([t, s]) => s.filter(serial => !territoryDinos.some(td => td.type === t && td.serial === serial)).length === 0) && (
              <p className="col-span-full text-center text-[7px] opacity-40 py-20 uppercase font-bold">Nenhum dinossauro disponível para alocar.</p>
            )}
          </div>
        </div>
      )}

      {selectedTerritoryDino && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center" onClick={() => setSelectedTerritoryDino(null)}>
           <div className="bg-neutral-900 p-8 pixel-border flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
             <PixelDino type={selectedTerritoryDino.type} size={80} />
             <div className="text-center">
               <p className="text-[8px] text-white uppercase font-bold">{DINOSAURS[selectedTerritoryDino.type].name}</p>
               <p className="text-[7px] text-green-500 font-bold">R$ {DINOSAURS[selectedTerritoryDino.type].incomePerSecond}/s</p>
             </div>
             <button onClick={() => undeployDino(selectedTerritoryDino.instanceId)} className="bg-red-900 text-white px-6 py-3 text-[8px] uppercase font-bold border-b-4 border-red-950">REMOVER DO CAMPO</button>
           </div>
        </div>
      )}

      {shopDinoDetail && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setShopDinoDetail(null)}>
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-xs text-center flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
            <PixelDino type={shopDinoDetail.id} size={80} />
            <div className="space-y-2">
               <h3 className="text-[10px] text-white font-bold uppercase">{shopDinoDetail.name}</h3>
               <p className="text-[7px] text-neutral-500 uppercase leading-relaxed font-bold">{shopDinoDetail.description}</p>
               <p className="text-[10px] text-yellow-500 font-bold">R$ {shopDinoDetail.price.toLocaleString()}</p>
            </div>
            <button onClick={() => buyDino(shopDinoDetail)} className="w-full bg-green-600 text-white py-4 text-[8px] font-bold border-b-4 border-green-800">CONFIRMAR COMPRA</button>
          </div>
        </div>
      )}

      {albumDinoDetail && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setAlbumDinoDetail(null)}>
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-xs text-center flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
            <PixelDino type={albumDinoDetail.id} size={80} />
            <div className="space-y-2">
               <h3 className="text-[10px] text-white font-bold uppercase">{albumDinoDetail.name}</h3>
               <p className="text-[7px] text-neutral-500 uppercase leading-relaxed font-bold">{albumDinoDetail.description}</p>
               <p className="text-[7px] text-green-500 font-bold uppercase">Rendimento: R$ {albumDinoDetail.incomePerSecond}/s</p>
               <p className="text-[6px] text-blue-400 font-bold uppercase">Raridade: {albumDinoDetail.rarity}</p>
            </div>
            <button onClick={() => setAlbumDinoDetail(null)} className="w-full bg-neutral-700 text-white py-3 text-[8px] font-bold border-b-4 border-neutral-900 uppercase">Fechar</button>
          </div>
        </div>
      )}

      {showSellModal && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 pixel-border p-8 w-full max-w-sm">
            <h3 className="text-[9px] mb-6 text-center text-teal-500 font-bold uppercase">LISTAR PARA VENDA</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
              {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).flatMap(([type, serials]) => 
                serials.map((serial, idx) => {
                  if (!DINOSAURS[type].isLimited) return null;
                  return (
                    <div key={`${type}-${idx}`} onClick={() => setSellForm({...sellForm, type, serial, dinoIdx: idx})} className={`p-3 bg-neutral-800 border-2 cursor-pointer flex justify-between items-center transition-all ${sellForm.serial === serial && sellForm.type === type ? 'border-teal-500 bg-teal-900/20' : 'border-neutral-700'}`}>
                      <span className="text-[6px] text-white uppercase font-bold">{DINOSAURS[type].name} #{serial}</span>
                      <PixelDino type={type} size={24} />
                    </div>
                  );
                })
              )}
            </div>
            {(Object.entries(ownedDinos) as [DinosaurType, number[]][]).every(([t, s]) => !DINOSAURS[t as DinosaurType].isLimited || s.length === 0) && (
                <p className="text-[6px] text-neutral-500 text-center py-4 uppercase font-bold">Você não possui dinos limitados para vender.</p>
            )}
            <input type="number" placeholder="VALOR (R$)" className="w-full bg-neutral-800 border-2 border-neutral-700 p-4 text-[10px] mb-6 text-white focus:outline-none focus:border-teal-500" value={sellForm.price || ''} onChange={e => setSellForm({...sellForm, price: Number(e.target.value)})} />
            <div className="flex gap-4">
              <button onClick={handleMarketListing} disabled={sellForm.dinoIdx === -1} className="flex-1 bg-teal-600 text-black py-4 text-[8px] font-bold border-b-4 border-teal-800 disabled:opacity-50 uppercase">POSTAR</button>
              <button onClick={() => setShowSellModal(false)} className="flex-1 bg-neutral-700 text-white py-4 text-[8px] font-bold border-b-4 border-neutral-900 uppercase">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {offlineReport && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6">
           <div className="bg-neutral-900 pixel-border p-10 text-center flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <h2 className="text-lg text-green-400 uppercase font-bold">BEM-VINDO DE VOLTA!</h2>
              <div className="space-y-2 text-[8px] uppercase font-bold">
                 <p className="text-neutral-500">Tempo de Ausência: {formatTime(offlineReport.seconds)}</p>
                 <p className="text-yellow-500 text-lg mt-4">LUCRO: R$ {formatCurrency(offlineReport.profit)}</p>
              </div>
              <button onClick={() => setOfflineReport(null)} className="w-full bg-green-600 text-white py-4 text-[10px] font-bold border-b-4 border-green-900 uppercase">COLETAR</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
