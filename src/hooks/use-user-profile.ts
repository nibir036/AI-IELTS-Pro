'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, useUser, useDoc } from '@/firebase';
import type { User } from '@/lib/types';

export function useUserProfile() {
  const { firestore } = useFirebase();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading, error } = useDoc<User>(userDocRef);

  return {
    user: userProfile,
    isLoading: isAuthLoading || isProfileLoading,
    error,
  };
}
