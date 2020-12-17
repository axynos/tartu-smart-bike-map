import styles from '../styles/Home.module.scss'
import Map from '../components/Map'
import Head from 'next/head'
import { getStations, getStationsGeoJSON, generateStationsGeoJSON, endpoint } from '../components/data/stations'
import useSWR from 'swr'
import Link from 'next/link'
import { GeoJsonLayer } from '@deck.gl/layers';

const Home = props => {

  // Generate initial data from prefetched stations data.
  const initialMapData = generateStationsGeoJSON(props.initialStations)
  const options = {
    initialData: initialMapData
  }

  const { data, error } = useSWR(endpoint, getStationsGeoJSON, options)

  const deckLayers = [
    // This is the base layer that sets all the stations on the map.
    new GeoJsonLayer({
      id: 'stations',
      data: data,
      // Styles
      filled: true,
      stroked: false,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 4,
      getRadius: f => f.properties.cycleCount,
      getFillColor: [58, 160, 255, 180],
      // Interactive props
      pickable: true,
      autoHighlight: true,
      onClick: info =>
        // eslint-disable-next-line
        info.object && alert(`${info.object.properties.name}`)
    })
  ]

  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Map initialStations={props.initialStations}
             style={{ position: 'relative' }}
             layers={deckLayers}/>
      </main>
    </div>
  )
}

export default Home

export const getServerSideProps = async (context) => {
  // TODO: Offload the geojson generation to the client after load.
  const initialStations = await getStations()

  return { props: { initialStations } }
}
