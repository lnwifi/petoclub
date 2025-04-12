import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface Membership {
  membership_type_id: string;
  membership_name: string;
  membership_description: string;
  max_pets: number;
  max_photos_per_pet: number;
  max_interests_per_pet: number;
  has_ads: boolean;
  has_coupons: boolean;
  has_store_discount: boolean;
  price: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export const useMembership = () => {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Obtener la sesión actual
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      
      setSession(data.session);
      
      if (data.session) {
        fetchMembership(data.session.user.id);
      } else {
        setLoading(false);
      }
    };

    getSession();

    // Suscribirse a cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        if (newSession) {
          fetchMembership(newSession.user.id);
        } else {
          setMembership(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchMembership = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_membership', {
        user_id: userId,
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setMembership(data[0]);
      } else {
        // Si no hay datos, asumimos membresía gratuita
        setMembership({
          membership_type_id: '',
          membership_name: 'Gratuita',
          membership_description: 'Membresía básica gratuita',
          max_pets: 1,
          max_photos_per_pet: 1,
          max_interests_per_pet: 3,
          has_ads: true,
          has_coupons: false,
          has_store_discount: false,
          price: 0,
          start_date: null,
          end_date: null,
          is_active: true,
        });
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error al obtener membresía:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = (): boolean => {
    return membership?.has_store_discount || false;
  };

  const hasStoreDiscount = (): boolean => {
    return membership?.has_store_discount || false;
  };

  const hasCoupons = (): boolean => {
    return membership?.has_coupons || false;
  };

  return {
    membership,
    loading,
    error,
    session,
    isPremium,
    hasStoreDiscount,
    hasCoupons,
    refreshMembership: session ? () => fetchMembership(session.user.id) : null,
  };
};
