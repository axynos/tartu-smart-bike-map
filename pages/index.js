import Head from 'next/head'
import styles from '../styles/Home.module.scss'
import dynamic from 'next/dynamic'
import { Source, Layer } from 'react-map-gl'
import { fromJS } from 'immutable'
import useSWR from 'swr'

const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

const Map = dynamic(
  () => import('../components/Map'),
  { ssr: false }
)

const getStations = async url => {
  const data = await fetch(url).then(r => r.json())

  const cleanStations = data.map(station => {
    const { name, serialNumber, area, totalLockedCycleCount } = station

    const cleanStation = {
      name: name,
      id: serialNumber,
      area: area,
      cycleCount: totalLockedCycleCount
    }

    return cleanStation
  })

  const features = cleanStations.map(station => {
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [station.area.longitude ,station.area.latitude ]
      },
      properties: {
        name: station.name,
        radius: station.area.radius*15000,
        cycleCount: Math.sqrt(station.cycleCount)*2
      }
    }

    return feature
  })

  const geojson = fromJS({
    type: 'FeatureCollection',
    features: features
  })

  return geojson
}


const Home = () => {
  const { data, error } = useSWR(endpoint, getStations)

  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Map position={[58.370, 26.725]} zoom={12.15}>
          {data ?
            <Source id="stations" type="geojson" data={data}>
              <Layer
                id="point"
                type="circle"
                paint={{
                  'circle-radius': ['get', 'cycleCount'],
                  'circle-color': '#FF0000'
                }} />
            </Source>
            : ''}
          <Layer
            id="building-extrusion-custom"
            type="fill-extrusion" />
        </Map>

      </main>
    </div>
  )
}

export default Home
