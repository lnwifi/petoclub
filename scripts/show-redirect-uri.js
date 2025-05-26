import * as AuthSession from 'expo-auth-session';

console.log('Redirect URI:', AuthSession.makeRedirectUri({ useProxy: true }));
