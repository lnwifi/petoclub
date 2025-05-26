import { Platform } from 'react-native';

// Importa dinámicamente la versión correcta según la plataforma
const MapComponent = Platform.select({
  web: () => require('./Map.web').default,
  default: () => require('./Map.native').default,
})();

export default MapComponent;
