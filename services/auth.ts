import { supabase } from '../lib/supabase'

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  const user = data.user
  if (!user) throw new Error('User not created')

  await supabase.from('users').insert({
    id: user.id,
    email,
    username,
    avatar_type: 'default',
    money: 100
  })

  return user
}


export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data.user
}

export async function updateMoney(userId: string, money: number) {
  return supabase
    .from('users')
    .update({ money })
    .eq('id', userId)
}

export async function loadUser(userId: string) {
  return supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
}
