// The tour's stand-in for signing out: there is nobody signed in.
export async function signOutAndGoTo(_path: string) {}

export function signOut() {
  return Promise.resolve();
}
