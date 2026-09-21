'use strict';

/*
  FieldForce Hub — Supabase Auth Bridge
  Purpose: authenticate the existing FieldForce Hub frontend against Supabase
  without changing theme/UI/business logic or clearing local app data.

  Requires the existing app.js to have already created:
      window.FFH_SUPABASE
*/
(() => {
  const SB = window.FFH_SUPABASE;
  if (!SB) {
    console.error('FieldForce Hub: FFH_SUPABASE is unavailable.');
    return;
  }

  const SESSION_KEY = 'ffh_session';
  const DOMAIN = 'fieldforce.app';

  const staffId = value => String(value || '').trim().toUpperCase();
  const emailFor = id => `${staffId(id).toLowerCase()}@${DOMAIN}`;

  async function getProfile(authUserId, fallbackStaffId = '') {
    let query = SB
      .from('ffh_profiles')
      .select('staff_id,full_name,role,active,monthly_target,photo_url,can_manage,can_sell,auth_user_id');

    query = authUserId
      ? query.eq('auth_user_id', authUserId)
      : query.eq('staff_id', staffId(fallbackStaffId));

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  function toLegacySession(profile, managerMode) {
    return {
      id: profile.staff_id,
      name: profile.full_name,
      role: profile.role,
      target: Number(profile.monthly_target || 0),
      photo: profile.photo_url || '',
      can_manage: !!profile.can_manage,
      can_sell: !!profile.can_sell,
      mode: managerMode ? 'MANAGER' : 'SR'
    };
  }

  async function signIn(loginId, password) {
    const entered = String(loginId || '').trim();
    const managerMode = entered.toLowerCase() === 'manager';
    const id = managerMode ? 'M21954' : staffId(entered);

    if (!id || !password) throw new Error('User ID and Password are required.');

    const { data, error } = await SB.auth.signInWithPassword({
      email: emailFor(id),
      password: String(password)
    });

    if (error || !data?.user) throw new Error('Invalid User ID or Password');

    let profile;
    try {
      profile = await getProfile(data.user.id, id);
    } catch (_) {
      await SB.auth.signOut();
      throw new Error('Profile access failed. Please contact Manager.');
    }

    if (profile.active === false) {
      await SB.auth.signOut();
      throw new Error('This account is inactive.');
    }
    if (managerMode && !profile.can_manage) {
      await SB.auth.signOut();
      throw new Error('Manager access is not enabled for this account.');
    }
    if (!managerMode && !profile.can_sell) {
      await SB.auth.signOut();
      throw new Error('Sales access is not enabled for this account.');
    }

    const session = toLegacySession(profile, managerMode);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { session, profile, authUser: data.user };
  }

  async function restore() {
    const { data, error } = await SB.auth.getSession();
    if (error || !data?.session?.user) return null;

    let profile;
    try {
      profile = await getProfile(data.session.user.id);
    } catch (_) {
      await signOut();
      return null;
    }

    if (!profile || profile.active === false) {
      await signOut();
      return null;
    }

    let previous = null;
    try {
      previous = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (_) {}

    const managerMode = previous?.mode === 'MANAGER' && !!profile.can_manage;
    const session = toLegacySession(profile, managerMode);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { session, profile, authUser: data.session.user };
  }

  async function signOut() {
    try {
      await SB.auth.signOut();
    } finally {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  window.FFH_AUTH = Object.freeze({
    signIn,
    signOut,
    restore,
    getProfile,
    emailFor
  });
})();
