const auditPublic = (action, extras = {}) => {
  fetch('/api/audit/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extras }),
  }).catch(() => {});
};

const auditLog = (action, extras = {}) => {
  fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extras }),
  }).catch(() => {});
};

function buildUser(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    display_name: profile?.display_name || authUser.email,
    role: profile?.role || 'user',
    active_collective_id: profile?.active_collective_id || null,
    must_change_password: profile?.must_change_password ?? false,
    is_subscription_premium: profile?.is_subscription_premium ?? false,
    subscription_tier: profile?.subscription_tier ?? 'basic',
    trial_started_at: profile?.trial_started_at ?? null,
    trial_ends_at: profile?.trial_ends_at ?? null,
    default_tax_percent: profile?.default_tax_percent ?? 27,
  };
}

export function makeAuthActions({
  supabase, router, fetchProfile, refreshSupabaseData,
  setCurrentUser, setLoading, setImpersonating, currentUser, clearGodCookie,
}) {
  const login = async (email, password, { noRedirect = false } = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        auditPublic('Login failed', { userName: email, details: { reason: error.message } });
        throw error;
      }

      const profile = await fetchProfile();
      const user = buildUser(data.user, profile);

      setCurrentUser(user);
      await refreshSupabaseData(user);

      auditPublic('Login success', { userName: user.display_name || user.email, entityId: user.active_collective_id || user.id });

      if (!noRedirect) {
        if (user.must_change_password) {
          router.push('/change-password');
        } else if (user.role === 'superadmin') {
          router.push('/superadmin');
        } else if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
      return user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const registerWithEmail = async (name, email, password, gdprConsentedAt, { noRedirect = false } = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, must_change_password: false, gdpr_consented_at: gdprConsentedAt },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    if (data.session) {
      const profile = await fetchProfile();
      const user = buildUser(data.user, profile);
      user.display_name = profile?.display_name || name;
      user.must_change_password = false;
      setCurrentUser(user);
      await refreshSupabaseData(user);
      if (!noRedirect) router.push('/dashboard');
    }
    return data;
  };

  const resetPasswordEmail = async (email) => {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Hiba történt.');
    }
  };

  const logout = async () => {
    auditPublic('Logout', { userName: currentUser?.display_name || currentUser?.email || '', entityId: currentUser?.active_collective_id || currentUser?.id });
    try { sessionStorage.removeItem('god_mode'); } catch {}
    clearGodCookie('god_mode_user');
    clearGodCookie('god_mode_entity');
    await supabase.auth.signOut();
    setCurrentUser(null);
    setImpersonating(null);
    router.push('/');
  };

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (error) throw error;

    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ must_change_password: false }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Hiba a profil frissítésekor');
    }

    setCurrentUser(prev => ({ ...prev, must_change_password: false }));
    auditLog('Jelszó megváltoztatva', { entityId: currentUser?.active_collective_id || currentUser?.id });

    if (currentUser?.role === 'superadmin') router.push('/superadmin');
    else if (currentUser?.role === 'admin') router.push('/admin');
    else router.push('/dashboard');
  };

  return { login, loginWithOAuth, registerWithEmail, resetPasswordEmail, logout, changePassword };
}
