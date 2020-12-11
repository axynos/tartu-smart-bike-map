import ReactMapGL from 'react-map-gl';
import { useState } from 'react';

const accessToken = 'pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA'

// This component is kept for reference reasons.

// Position = [lat, lng]
// Zoom = int
const MapboxMap = ({position, zoom, children}) => {

  const [viewport, setViewport] = useState({
    width: '100%',
    height: '100%',
    latitude: position[0],
    longitude: position[1],
    zoom: zoom
  });

  return (
    <ReactMapGL
      {...viewport} mapboxApiAccessToken={accessToken}
      mapStyle={'mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh'}
      onViewportChange={nextViewport => setViewport(nextViewport)}>

      {children}

    </ReactMapGL>
  )
}

export default MapboxMap
