/*
For education purposes only of how to scrape data. I don't want you to use this.
Lot's off error catching etc. are missing so do not use this for education.

Usage:
node index.js

Or to start from location number (example number 50)
node index.js 50




Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


const axios = require('axios').default
const parser = require('node-html-parser')
const JSON5 = require('json5')
const fs = require('fs').promises

const mainPage = 'https://radios.reciva.com/stations/search'

const userAgents = [
  'Mozilla/5.0 (Linux; Android 7.0; SM-G930VC Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36', //Samsung Galaxy S7
  'Mozilla/5.0 (Linux; Android 6.0; HTC One X10 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.98 Mobile Safari/537.36', //HTC One X10
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/69.0.3497.105 Mobile/15E148 Safari/605.1', //Apple iPhone XS (Chrome)
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A5370a Safari/604.1', //Apple iPhone 8 Plus
]

/**
 * All genres and locations available
 */
let genresAndLocations = null





/**
 * Simple async wrapper for setTimeout
 * @param {number} ms 
 * @returns 
 */
const wait = async (ms) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(), ms)
})




/**
 * Main application
 */
const recivaDownloader = async () => {

  //Try to make a /stations/ folder
  try {
    await fs.mkdir('./stations/')
  } catch (err) {
    console.log(`Failed to create ./stations/ directory. Continuing...`, err)
  }

  console.log(`Getting genres and locations...`)

  //First get all available locations and genres
  genresAndLocations = await getGenresAndLocations()

  let progress = 0

  //If we have an argument it should be location number to start from
  //Like "node index.js 40" = start from location number 40
  let args = process.argv.slice(2)
  let startFrom = (args.length > 0 ? parseInt(args[0]) : -1)
  
  if (startFrom >= 0) {
    console.log(`Argument given, starting from location number ${startFrom}...`)
  }


  //Now we have to loop each location
  for (const location of genresAndLocations.locations) {
    if (startFrom > progress) {
      progress++
      continue
    }
    
    try {
      console.log(`Getting stations for ${location.name}...`)

      //Get all location stations
      const parsedLocation = await getLocationInfo(location)

      const promises = []

      //Get all URLs for stations (parallel)
      for (const station of parsedLocation.stations) {
        promises.push(getStationStreams(station))
      }
      //Waiting for all stations
      const results = await Promise.all(promises)

      //Parsing the Promise array results
      let i = 0
      for (const station of parsedLocation.stations) {
        station.streams = results[i]
        i++
      }

      //Creating JSON filename
      let filename = location.name.replace(' ', '_')
      filename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '')
      
      await fs.writeFile(`./stations/${progress}_${filename}.json`, JSON.stringify(parsedLocation))
      console.log(`Location ${location.name} (number ${progress + 1}) stations saved to ${filename}`)


    } catch (err) {
      console.log(`Failed to scrape and save location ${location.name} (number ${progress + 1}):`, err)
    }

    progress++
    console.log(`---------- Progress ${progress}/${genresAndLocations.locations.length} ----------`)
  }

  console.log('Everything done!')
}




/**
 * Gets all stream URLs for station
 * @param {*} station 
 * @returns 
 */
const getStationStreams = async (station) => {
  const data = (await get(`https://radios.reciva.com/streamer?stationid=${station.id}&streamnumber=0`)).data

  const dom = parser.parse(data)
  const info = dom.querySelector(".streamerInfo")
  let streamsDom = info.querySelectorAll(".live")

  let parsed = []

  if (streamsDom.length > 0) {
    //multiple streams
    streamsDom.forEach(stream => {
      let url = stream.getAttribute("onclick")

      url = url.substring(url.indexOf("'") + 1)
      url = url.substring(0, url.indexOf("',"))

      parsed.push(url)
    })

  } else {
    //single stream
    const url = info.querySelector("iframe").getAttribute("src")
    parsed.push(url)
  }

  console.log(`Station ${station.name} had ${parsed.length} stream URLs`)
  return parsed
}



/**
 * Gets information for given location (basically all its stations)
 * @param {*} location 
 * @param {*} isRecursive 
 * @returns 
 */
const getLocationInfo = async (location, isRecursive = false) => {

  const data = (await get(`https://radios.reciva.com/preview.php?q=&categories=${location.id}&codec=&working=true&min_bitrate=&max_bitrate=&cnt=5000`)).data

  //The data is in "relaxed json"..
  const json = JSON5.parse(data)

  let parsed = {}

  if (json.count >= 1000) {
    if (isRecursive) {
      //Shouldn't happen
      console.log('FAILURE: We had > 1000 channels in genre, location: ', location)
      process.exit(0)
    }


    //We need to go through all genres as the location has over 1000 stations
    console.log(`NOTE: LOCATION ${location.name} (${location.id}) needs to be fetched by genre`)

    parsed = {
      location: location.name,
      count: 0,
      stations: []
    }

    for (const genre of genresAndLocations.genres) {
      const genreData = await getLocationInfo({
        name: `${location.name}/${genre.name}`,
        id: `${location.id},${genre.id}`
      }, true)

      parsed.count += genreData.count
      parsed.stations = parsed.stations.concat(genreData.stations)
    }

    return parsed

  } else {
    //OK!
    parsed = {
      location: location.name,
      count: json.count,
      stations: []
    }

    for (let i = 0; i < json.suggestions.length; i++) {
      parsed.stations.push({
        name: json.suggestions[i],
        id: json.data[i]
      })
    }

    console.log(`Location ${location.name}(${location.id}) fetched: ${parsed.count} stations`)
  }

  return parsed
}






/**
 * Gets all genres and locations
 * @returns 
 */
const getGenresAndLocations = async () => {
  //Getting search frontpage
  const data = (await get(mainPage)).data

  //Parse html to DOM
  const dom = parser.parse(data)

  //Parsing all locations
  const locationsDom = dom.querySelectorAll(".locationitem")

  console.log(`Found ${locationsDom.length} locations`)

  const locations = locationsDom.map(location => {
    return {
      name: location.innerText,
      id: location.id
    }
  })

  //Parsing all genres
  const genreDom = dom.querySelectorAll(".genreitem")

  console.log(`Found ${genreDom.length} genres`)

  const genres = genreDom.map(genre => {
    return {
      name: genre.innerText,
      id: genre.id
    }
  })


  return {
    locations,
    genres
  }
}






/**
 * Simple wrapper for axios.get
 * @param {*} url 
 * @returns 
 */
const get = async (url) => {
  //We don't want to cause too much traffic so wait a random time 
  await wait(500 + Math.random() * 5000)

  const res = await axios.get(url, {
    headers: {
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)]
    }
  })

  return res
}






//Call the downloader
recivaDownloader()