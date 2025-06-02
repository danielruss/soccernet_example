# Example using Clips in Nodejs/browser

This repository provides an example of how to use ClIPS/SOCcerNET within your application.  Although we do everything
client-side, you can use nodejs to run ClIPS and SOCcerNET as a server-side application or as a command line application

## first in node
index.js is a simple example of running Clips with nodejs.

In this example, I load the fs module and @danielruss/clips.  The "letsgo" function does all the work.

The important functions to import are configClips and runClipsPipeline.  ClIPS also exports helper
function read_csv and read_excel

I read a file called dev_data. Which looks like:

|Id|products_services|sic1987|bazinga|
|--|--|--|--|
|t01|Hosptial care|806|My boy elroy|
|t02|women's clothes|5621|Spain Rain|
|t03|Hosptial care| |water|
|t04|women's clothes| |Spain Rain|

After reading the data, I configure clips. If you know the versions of clips, you can add it as parameter
```
let conf = await configureClips("0.0.2") 
```
Version 0.0.2 is the default version, you dont need to add it.  Unless you are trying to keep a stable version, I suggest you leave it blank.  In the future, I plan on
making Version 0.0.2 version 1.0.0.  

Finally, I call runClipsPipeline(dta.data, conf).  read_csv and read_excel produce an object like PapaParse.  I use PapaParse which is why I chose this structure. The data is stored in an Object entry with key "data".
Most of the code is formatting the results.

## in browser.

I load Clips from cdn.jsdelivr.net. 
```
import * as soccerNet from "https://cdn.jsdelivr.net/npm/@danielruss/soccernet@latest/+esm"
```

