import * as soccerNet from "https://cdn.jsdelivr.net/npm/@danielruss/soccernet/+esm"

const outputSuffixMap = new Map([ ['CSV','csv'],['Excel','xlsx'],["JSONL","jsonl"]])

const JobTitleElement = document.getElementById("titleInputElement");
const JobTaskElement = document.getElementById("taskInputElement");
const inputFileElement = document.getElementById("inputFileElement");
const singleJobButton = document.getElementById("runSingleJobButton");
const runFileButton = document.getElementById("runFileButton");
const configPromise = soccerNet.configureSOCcerNet();


function resetView(event){
    const running =event?.detail?? false;
    const formsToHide = document.querySelectorAll("[name=SelectForm]:not(:checked)");
    const formToShow = document.querySelector("[name=SelectForm]:checked");
    formsToHide.forEach( (form) => {
        document.getElementById(form.dataset.formId).style.display = "none";
    })

    document.getElementById(formToShow.dataset.formId).style.display = "flex";
    singleJobButton.disabled = (JobTitleElement.value.length == 0) || running;
    runFileButton.disabled = (inputFileElement.files.length == 0) || running; 
}
resetView()

document.querySelectorAll("[name=SelectForm]").forEach( (radio) => {
    radio.addEventListener("change", resetView)
});
JobTitleElement.addEventListener("change",resetView);
inputFileElement.addEventListener("change",resetView);
singleJobButton.addEventListener("click",soccerNetRunSingleJob);
singleJobButton.addEventListener("status",resetView);
runFileButton.addEventListener("status",resetView);
runFileButton.addEventListener("click",soccerNetRunFile);

async function soccerNetRunSingleJob(event){
    // disable the buttons
    let statusEvent = new CustomEvent("status",{detail:true})
    event.target.dispatchEvent(statusEvent);

    let inputObject = {JobTitle: JobTitleElement.value}    
    if (JobTaskElement.value.length > 0){
        inputObject.JobTask = JobTaskElement.value
    }
    const xw= ["soc1980","isco1988","noc2011"]
    xw.forEach( (cs) => {
        let inputElement= document.getElementById(`${cs}InputElement`);
        if (inputElement.value.length > 0){
            inputObject[cs] = inputElement.value
        }
    })
    let config = await configPromise;
    let results = await soccerNet.runSOCcerPipeline(inputObject,config)

    statusEvent = new CustomEvent("status",{detail:false})
    event.target.dispatchEvent(statusEvent);
    buildResultsTable(results);
}

async function soccerNetRunFile(event) {
    // disable the buttons
    let statusEvent = new CustomEvent("status",{detail:true})
    event.target.dispatchEvent(statusEvent);
    
    // create the progress bar
    let outputElement = document.getElementById("output");
    outputElement.innerHTML = "";
    let pb = document.createElement("progress");
    pb.max=1;
    pb.value=0;
    outputElement.insertAdjacentElement("beforeend",pb);
    let lbl = document.createElement("label");
    lbl.htmlFor = "pb";
    outputElement.insertAdjacentElement("beforeend",lbl);
    
    let config = await configPromise;

    let outputType = document.getElementById("output_type").value;
    let fileElement = document.getElementById("inputFileElement")
    let file = fileElement.files[0];

    let iterator = await soccerNet.getFileIterator(file)
    let block = await iterator.next()
    let {value: {totalBlocks, totalLines}} = block;
    let utf8Encoder = new TextEncoder();

    let outputFilename = `${removeFileExtension(file.name)}_soccerNet_results.${outputSuffixMap.get(outputType)}`
    console.log(outputFilename);
    let writable = await soccerNet.createOPFSWritableStream(outputFilename)
    try {  
        block = await iterator.next()
        let initial_metadata={};
        let current_metadata={}
        while (!block.done){
            let results = await soccerNet.runSOCcerPipeline(block.value,config)
            if(block.value.meta.blockId == 0){
                initial_metadata = results.metadata
            }
            current_metadata = results.metadata;
            soccerNet.writeResultsBlockToOPFS(results,writable,utf8Encoder,outputType)

            let nlines = block.value.meta.lines + block.value.data.length;
    
            lbl.innerText = `${nlines}/${totalLines} ${100*(nlines)/totalLines}%`
            pb.value = nlines/totalLines;
            block = await iterator.next()
        }
        await soccerNet.closeOPFSStream(writable);
        // fix the metadata. we are not interested in the start_time of the last 
        // block...
        current_metadata.start_time = initial_metadata.start_time;
        await soccerNet.downloadResultsFromOPFS(outputFilename,outputType,current_metadata)        
    } catch (error) {
        console.error("ERROR WHILE RUNNING SOCcerNET:\n",error)
    }



    // enable the buttons
    statusEvent = new CustomEvent("status",{detail:false})
    event.target.dispatchEvent(statusEvent);
}

function buildResultsTable(results){
    let outputElement = document.getElementById("output");
    outputElement.innerHTML = "";

    let table = document.createElement("table");
    let headerRow = table.insertRow();
    headerRow.innerHTML = `<th>Rank</th><th>soc 2010</th><th>soc 2010 title</th><th>Score</th>`;
    let n = results[0].soc2010.length;
    for (let i=0; i<n; i++){
        let row = table.insertRow();
        row.innerHTML = `<td>${i+1}</td><td>${results[0].soc2010[i]}</td><td>${results[0].title[i]}</td><td>${results[0].score[i].toFixed(4)}</td>`;
    }
   outputElement.insertAdjacentElement("beforeend",table);
}



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