import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the app's main screen
  return <Redirect href="/(app)" />;
}
