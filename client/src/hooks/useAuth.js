import { useEffect } from 'react';
import { useSafeSpot } from '../context/SafeSpotContext';

export function useAuth() {
  const { state, dispatch, api } = useSafeSpot();

  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common.Authorization = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [state.token, api]);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    dispatch({ type: 'SET_AUTH', payload: data });
  };

  const logout = () => {
    dispatch({ type: 'SET_AUTH', payload: { user: null, role: null, token: null } });
  };

  return { ...state, login, logout };
}
