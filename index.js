import fs from 'node:fs';

import { read_csv,configureClips,runClipsPipeline } from "@danielruss/clips";


async function letsgo(){
    let conf = await configureClips()
    console.log(`======================================================`)
    let fileStream = fs.createReadStream("../clips/dev/dev_data.csv");
    let dta = await read_csv(fileStream)
    //console.log(`The data are ${JSON.stringify(dta.data,null,3)}\nmeta: ${JSON.stringify(dta.meta,null,3)}`)

    let res = await runClipsPipeline(dta.data,conf)
    res.forEach( (res,indx)=>console.log("\n",
        dta.data[indx].id,dta.data[indx].products_services,dta.data[indx].sic1987,"\n",
        res.naics2022[0],res.title[0],res.score[0],"\n",
        res.naics2022[1],res.title[1],res.score[1],"\n",
        res.naics2022[2],res.title[2],res.score[2],"\n",
    ))
    
    console.log(`======================================================`)
/*    
    fileStream = fs.createReadStream("../clips/dev/dev_data2.csv");
    dta = await read_csv(fileStream)
    //console.log(`The data are ${JSON.stringify(dta.data,null,3)}\nmeta: ${JSON.stringify(dta.meta,null,3)}`)
    res = await runClipsPipeline(dta.data)
    console.log(`The results are ${JSON.stringify(res,null,3)}`)
*/
}
letsgo().then( ()=>console.log("finally!!!") )

