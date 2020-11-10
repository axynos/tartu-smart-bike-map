import Head from 'next/head'
import styles from '../styles/Home.module.scss'
import dynamic from 'next/dynamic'
import { Source, Layer } from 'react-map-gl'
import stationLocations from '../data/stationLocations.json'
import { fromJS } from 'immutable'

const Map = dynamic(
  () => import('../components/Map'),
  { ssr: false }
)

const stations = (_ => {
  const features = stationLocations.map(station => {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [station.area.longitude ,station.area.latitude ]
      },
      properties: {
        name: station.name
      }
    }

    return feature
  })

  return features
})()

const geojson = fromJS({
  type: 'FeatureCollection',
  features: stations
})


const Home = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Map position={[58.370, 26.725]} zoom={12.15}>
          <Source id="stations" type="geojson" data={geojson}>
            <Layer
              id="point"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#FF0000'
              }} />
          </Source>
          <Layer
            id="building-extrusion-custom"
            type="fill-extrusion" />
        </Map>

      </main>
    </div>
  )
}

export default Home
