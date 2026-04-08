import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';

async function waitForUser(timeoutMs = 8000): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getIdTokenOrThrow(): Promise<string> {
  const user = await waitForUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
}

