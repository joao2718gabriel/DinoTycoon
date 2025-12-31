import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type UserData = {
  id: string
  username: string
  email: string
  avatar_type: string
  money: number
  owned_dinos: any[]
  territory_dinos: any[]
}

const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<any>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  const [money, setMoney] = useState(0)
  const [ownedDinos, setOwnedDinos] = useState<any[]>([])
  const [territoryDinos, setTerritoryDinos] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  // 🔹 1. Verifica sessão ao abrir o site
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // 🔹 2. Carrega dados do banco
  useEffect(() => {
    if (!authUser) {
      setUserData(null)
      setLoading(false)
      return
    }

    const loadUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error(error)
        return
      }

      setUserData(data)
      setMoney(data.money)
      setOwnedDinos(data.owned_dinos ?? [])
      setTerritoryDinos(data.territory_dinos ?? [])
      setLoading(false)
    }

    loadUser()
  }, [authUser])

  // 🔹 3. SALVAMENTO AUTOMÁTICO (ESSENCIAL)
  useEffect(() => {
    if (!authUser || !userData) return

    supabase
      .from('users')
      .update({
        money,
        owned_dinos: ownedDinos,
        territory_dinos: territoryDinos,
        last_active_at: new Date().toISOString()
      })
      .eq('id', authUser.id)

  }, [money, ownedDinos, territoryDinos])

  // 🔹 4. Login simples (teste)
  const login = async () => {
    await supabase.auth.signInWithPassword({
      email: 'teste@email.com',
      password: '123456'
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div>Carregando...</div>

  if (!authUser) {
    return (
      <div>
        <h1>DinoTycoon 🦖</h1>
        <button onClick={login}>Entrar</button>
      </div>
    )
  }

  return (
    <div>
      <h1>DinoTycoon 🦖</h1>
      <p>Dinheiro: ${money}</p>

      <button onClick={() => setMoney(money + 10)}>
        Ganhar $10
      </button>

      <button onClick={logout}>
        Sair
      </button>
    </div>
  )
}

export default App

