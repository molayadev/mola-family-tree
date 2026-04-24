export class FirebaseAuthService {
  constructor(authAdapter) {
    this.auth = authAdapter;
  }

  async signInWithGoogle() {
    return this.auth.signInWithGoogle();
  }

  async signOut() {
    return this.auth.signOut();
  }

  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  getCurrentUser() {
    return this.auth.getCurrentUser();
  }
}
