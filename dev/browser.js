import * as clips from "http://localhost:5500/dist/browser/clips.js"

const outputSuffixMap = new Map([ ['CSV','csv'],['Excel','xlsx'],["JSONL","jsonl"]])
document.getElementById("file_upload").addEventListener("change",run)
document.getElementById("run").addEventListener("click",run)
async function run(event){
    // no file, no run...
    let fileElement = document.getElementById("file_upload")
    if (fileElement.files.length==0) return
      
    // disable the button...
    let elementsToDisable= document.querySelectorAll("[data-disable-while-running]")
    elementsToDisable.forEach( element => element.disabled=true)
        
    let file = fileElement.files[0];
    let output_type = document.getElementById("output_type").value

    await runClipsInBlocks(file,output_type);

    // re-enable the buttons..
    elementsToDisable.forEach( element => element.disabled=false)
}


function removeFileExtension(filename){
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
        return filename;
    }
    return filename.substring(0, lastDotIndex);
}

async function runClipsInBlocks(file,outputType) {
    let pb = document.getElementById("pb")
    let lbl = document.getElementById("pbLabel")
    pb.value=0;
    pb.max=1;
    lbl.innerText=""

    let configuration = await clips.configureClips();
    let iterator = await clips.getFileIterator(file)
    let block = await iterator.next()
    let {value: {totalBlocks, totalLines}} = block;
    let utf8Encoder = new TextEncoder();

    // create a writable stream
    let outputFilename = `${removeFileExtension(file.name)}_clips_results.${outputSuffixMap.get(outputType)}`
    console.log(outputFilename);
    let writable = await clips.createOPFSWritableStream(outputFilename)
    try {  
        block = await iterator.next()
        let initial_metadata={};
        let current_metadata={}
        while (!block.done){
            let results = await clips.runClipsPipeline(block.value,configuration)
            if(block.value.meta.blockId == 0){
                initial_metadata = results.metadata
            }
            current_metadata = results.metadata;
            clips.writeResultsBlockToOPFS(results,writable,utf8Encoder,outputType)

            let nlines = block.value.meta.lines + block.value.data.length;
    
            lbl.innerText = `${nlines}/${totalLines} ${100*(nlines)/totalLines}%`
            pb.value = nlines/totalLines;
            console.log(results)
            block = await iterator.next()
        }
        await clips.closeOPFSStream(writable);
        // fix the metadata. we are not interested in the start_time of the last 
        // block...
        current_metadata.start_time = initial_metadata.start_time;
        await clips.downloadResultsFromOPFS(outputFilename,outputType,current_metadata)

        
    } catch (error) {
        console.error("ERROR WHILE RUNNING CLIPS:\n",error)
    }
}