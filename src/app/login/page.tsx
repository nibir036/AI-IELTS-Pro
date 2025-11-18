'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setDocumentNonBlocking } from '@/firebase';

const provider = new GoogleAuthProvider();

async function createUserProfile(user: User, firestore: any) {
  const userRef = doc(firestore, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // This is a new user
    const newUser = {
      id: user.uid,
      email: user.email,
      nativeLanguage: 'English', // Default value
      currentBand: 5.0, // Default value
      targetBand: 7.5, // Default value
      learningPathId: '', // Default value
      totalPracticeTime: 0, // Default value
    };
    // Using non-blocking write
    setDocumentNonBlocking(userRef, newUser, { merge: false });
  }
}

export default function LoginPage() {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  const handleSignIn = async () => {
    if (!auth || !firestore) return;
    try {
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user, firestore);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };
  
  if (isUserLoading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                 <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-10 w-10 text-primary"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7l4 4-4 4z" />
                  </svg>
            </div>
          <CardTitle className="text-2xl">Welcome to AI IELTS Pro</CardTitle>
          <CardDescription>Sign in to continue to your personalized learning dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSignIn}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 76.2C307.4 102.5 279.7 90 248 90c-88.3 0-160 71.7-160 160s71.7 160 160 160c92.6 0 145-67.2 150.8-102.3H248v-96h239.2c.5 12.3.8 24.8.8 37.8z"></path></svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
