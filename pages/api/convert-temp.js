import data from './temp.json'

const convertTemp = (req, res) => {

  const cleanData = data.map(station => {
    const { name, serialNumber, area } = station

    const cleanStation = {
      name: name,
      id: serialNumber,
      area: area
    }

    return cleanStation
  })

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(cleanData))
}

export default convertTemp
