import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export class FirebaseAuthAdapter {
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  async signOut() {
    await signOut(auth);
  }

  onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  getCurrentUser() {
    return auth.currentUser;
  }
}
