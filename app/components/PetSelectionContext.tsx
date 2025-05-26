import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos reutilizados
export type MembershipType = {
  id: string;
  name: string;
  price: number;
};

export type UserMembership = {
  membership_name: string;
  membership_type_id: string;
};

export type Pet = {
  id: string;
  name: string;
  image_url: string;
};

interface PetSelectionContextProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  pets: Pet[];
  setPets: (pets: Pet[]) => void;
  userMembership: UserMembership | null;
  setUserMembership: (m: UserMembership | null) => void;
  hasConfirmed: boolean;
  setHasConfirmed: (v: boolean) => void;
}

const PetSelectionContext = createContext<PetSelectionContextProps | undefined>(undefined);

export const PetSelectionProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Leer hasConfirmed persistido al iniciar
  useEffect(() => {
    if (!session) return;
    const loadHasConfirmed = async () => {
      try {
        const value = await AsyncStorage.getItem(`petselect_confirmed_${session.user.id}`);
        setHasConfirmed(value === 'true');
      } catch {}
    };
    loadHasConfirmed();
  }, [session]);

  // Guardar hasConfirmed cuando cambia a true
  useEffect(() => {
    if (!session) return;
    if (hasConfirmed) {
      AsyncStorage.setItem(`petselect_confirmed_${session.user.id}`, 'true');
    }
  }, [hasConfirmed, session]);

  // Resetear hasConfirmed si el usuario vuelve a tener Premium y luego la pierde
  const prevMembershipRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!session) return;
    const current = userMembership?.membership_name || null;
    const prev = prevMembershipRef.current;
    // Si pasa de Premium a otra membresía, resetear el flag
    if (prev === 'Premium' && current !== 'Premium') {
      AsyncStorage.removeItem(`petselect_confirmed_${session.user.id}`);
      setHasConfirmed(false);
    }
    prevMembershipRef.current = current;
  }, [userMembership, session]);

  // Cargar mascotas y membresía
  useEffect(() => {
    if (!session) return;
    // Mascotas
    supabase
      .from('pets')
      .select('*')
      .eq('owner_id', session.user.id)
      .then(({ data, error }) => {
        if (!error && data) setPets(data);
      });
    // Membresía
    supabase
      .rpc('get_user_membership', { user_id: session.user.id })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setUserMembership(data[0]);
      });
  }, [session]);

  // Mostrar modal si corresponde
  useEffect(() => {
    if (
      userMembership &&
      userMembership.membership_name !== 'Premium' &&
      pets &&
      pets.length > 1 &&
      !hasConfirmed
    ) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [userMembership, pets, hasConfirmed]);

  return (
    <PetSelectionContext.Provider
      value={{ showModal, setShowModal, pets, setPets, userMembership, setUserMembership, hasConfirmed, setHasConfirmed }}
    >
      {children}
    </PetSelectionContext.Provider>
  );
};

export function usePetSelection() {
  const ctx = useContext(PetSelectionContext);
  if (!ctx) throw new Error('usePetSelection must be used within PetSelectionProvider');
  return ctx;
}
