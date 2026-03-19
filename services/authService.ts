
import { UserAccount } from '../types';
import { supabase } from './supabase';

export const getUsers = async (): Promise<UserAccount[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data.map(u => ({
    uid: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.created_at,
    subscriptionEnd: u.subscription_end,
    currentSessionId: u.current_session_id,
    isActive: u.is_active,
    adminMessage: u.admin_message,
    allowedFeatures: u.allowed_features
  }));
};

export const saveUser = async (user: UserAccount & { uid: string }): Promise<{success: boolean, message: string}> => {
  const { error } = await supabase.from('users').update({
    role: user.role,
    subscription_end: user.subscriptionEnd,
    allowed_features: user.allowedFeatures,
    is_active: user.isActive,
    admin_message: user.adminMessage
  }).eq('id', user.uid);

  if (error) {
    console.error('Error saving user:', error);
    return { success: false, message: 'Gagal menyimpan user.' };
  }
  return { success: true, message: 'User berhasil disimpan.' };
};

export const deleteUser = async (uid: string): Promise<{success: boolean, message: string}> => {
  // In Supabase, deleting from auth.users requires admin API. 
  // We can delete from public.users if we want, but it's better to use an edge function or just disable the user.
  // For now, we'll try to delete from public.users (which might fail if RLS prevents it unless admin).
  const { error } = await supabase.from('users').delete().eq('id', uid);
  if (error) {
    console.error('Error deleting user:', error);
    return { success: false, message: 'Gagal menghapus user.' };
  }
  return { success: true, message: 'User berhasil dihapus.' };
};

export const login = async (email: string, password?: string): Promise<UserAccount | null> => {
  if (!password) return null;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    console.error('Login error:', error);
    return null;
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
  
  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError);
    return null;
  }

  return {
    uid: profile.id,
    email: profile.email,
    role: profile.role,
    createdAt: profile.created_at,
    subscriptionEnd: profile.subscription_end,
    currentSessionId: profile.current_session_id,
    isActive: profile.is_active,
    adminMessage: profile.admin_message,
    allowedFeatures: profile.allowed_features
  };
};

export const register = async (email: string, password?: string): Promise<{success: boolean, message: string, user?: UserAccount}> => {
  if (!password) return { success: false, message: 'Password dibutuhkan.' };
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error('Register error:', error);
    return { success: false, message: error.message };
  }

  if (data.user) {
    // The trigger in Supabase will create the profile automatically.
    // We wait a bit and fetch it.
    await new Promise(resolve => setTimeout(resolve, 1000));
    const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    
    if (profile) {
      return { 
        success: true, 
        message: 'Registrasi berhasil.', 
        user: {
          uid: profile.id,
          email: profile.email,
          role: profile.role,
          createdAt: profile.created_at,
          subscriptionEnd: profile.subscription_end,
          currentSessionId: profile.current_session_id,
          isActive: profile.is_active,
          adminMessage: profile.admin_message,
          allowedFeatures: profile.allowed_features
        } 
      };
    }
  }

  return { success: false, message: 'Gagal membuat profil user.' };
};

export const logout = async () => {
  await supabase.auth.signOut();
};

export const getActiveUser = async (): Promise<UserAccount | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
  
  if (profile) {
    return {
      uid: profile.id,
      email: profile.email,
      role: profile.role,
      createdAt: profile.created_at,
      subscriptionEnd: profile.subscription_end,
      currentSessionId: profile.current_session_id,
      isActive: profile.is_active,
      adminMessage: profile.admin_message,
      allowedFeatures: profile.allowed_features
    };
  }
  return null;
};

export const updateSessionId = async (uid: string, sessionId: string) => {
  const { error } = await supabase.rpc('update_session_id', { new_session_id: sessionId });
  if (error) {
    // Fallback if RPC is not created yet
    await supabase.from('users').update({ current_session_id: sessionId }).eq('id', uid);
  }
};

export const clearAdminMessage = async (uid: string) => {
  await supabase.from('users').update({ admin_message: null }).eq('id', uid);
};

export const forceLogout = async (uid: string) => {
  await supabase.from('users').update({ current_session_id: null }).eq('id', uid);
};
