# reciva-station-downloader
Downloads all reciva.com internet radio stations to JSON files (for education purposes)

## NOTE - Not working anymore

As reciva.com has disappeared, this won't work anymore. See https://github.com/jisotalo/reciva-radio-stations-sqlite for a SQLite database of the stations.

**Do you have a reciva radio? See:**

https://github.com/jisotalo/reciva-radio-patching

Why?

Recica.com is closing and thanks to that there is million internet radio devices going to e-waste. 



If you use this
`node index.js`

or to start from location number x (example = 50)
`node index.js 50`

Output go to ./stations/ directory like 
```
cd ./stations/
ls

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----          2.5.2021     19.34            339 0_Afghanistan.json
-a----          2.5.2021     19.36            795 10_Armenia.json
-a----          2.5.2021     19.36            329 11_Aruba.json
-a----          2.5.2021     19.36             66 12_Ashmore_andCartierIslands.json
-a----          2.5.2021     19.39          20372 13_Australia.json
-a----          2.5.2021     19.42          13386 14_Austria.json
-a----          2.5.2021     19.42             49 15_Azerbaijan.json
-a----          2.5.2021     19.42            745 16_Bahamas.json
...
```
