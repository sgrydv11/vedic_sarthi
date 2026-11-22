export const solarCities = {
  Ujjain:[23.1765,75.7885],Indore:[22.7196,75.8577],Varanasi:[25.3176,82.9739],
  Delhi:[28.6139,77.2090],Mumbai:[19.0760,72.8777],Bengaluru:[12.9716,77.5946]
}
export function solarTimes(city,day) {
  const [latitude,longitude]=solarCities[city]
  const instant=new Date(day+'T12:00:00Z')
  const year=instant.getUTCFullYear()
  const first=Date.UTC(year,0,1,12)
  const yearDays=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000
  const angle=2*Math.PI*(instant.getTime()-first)/86400000/yearDays
  const eq=229.18*(0.000075+0.001868*Math.cos(angle)-0.032077*Math.sin(angle)-
    0.014615*Math.cos(2*angle)-0.040849*Math.sin(2*angle))
  const declination=0.006918-0.399912*Math.cos(angle)+0.070257*Math.sin(angle)-
    0.006758*Math.cos(2*angle)+0.000907*Math.sin(2*angle)-0.002697*Math.cos(3*angle)+0.00148*Math.sin(3*angle)
  const radians=Math.PI/180
  const lat=latitude*radians
  const cosHour=(Math.cos(90.833*radians)-Math.sin(lat)*Math.sin(declination))/(Math.cos(lat)*Math.cos(declination))
  const minutes=4*Math.acos(cosHour)/radians
  const noon=720-4*longitude-eq+330
  const format=value=>{
    const round=Math.round(value)
    return String(Math.floor(round/60)).padStart(2,'0')+':'+String(round%60).padStart(2,'0')
  }
  return {city,day,timeZone:'Asia/Kolkata',sunrise:format(noon-minutes),solarNoon:format(noon),sunset:format(noon+minutes)}
}
