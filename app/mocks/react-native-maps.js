// Mock para react-native-maps en web
export default function MapView(props) {
  return <div style={{width:'100%',height:'100%',background:'#eee',display:'flex',justifyContent:'center',alignItems:'center'}}>
    <span style={{color:'#888'}}>Mapa no disponible en web (mock)</span>
  </div>;
}
export const Marker = () => null;
