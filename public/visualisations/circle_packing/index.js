let dataset;
let datasetAfter1Select;
let datasetAfter2Select;
let datasetAfter3Select;
let Songs;
let critere1;
let critere2;
let critere3;

let critereDeSelection1 = "pays";
let critereDeSelection2 = "genre";
let critereDeSelection3 = "type";

const DATASET_PATH = "data/wasabi_data_preprocessed.json";
const width = window.innerWidth;
const height = window.innerHeight;
let whereAreWe = 0;

const returnbutton = document.getElementById("returnButton")

const div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Tableau pour spécifier l'ordre initial
let ordreInitial = [critereDeSelection1, critereDeSelection2, critereDeSelection3];

// Variable pour suivre l'emplacement actuel dans l'ordre
let ordreActuel = 0;

async function loadData() {
    try {
        return await d3.json(DATASET_PATH);
    } catch (error) {
        console.error("Error loading data:", error);
        throw error;
    }
}

async function init() {

    console.log(ordreInitial)
    console.log(critereDeSelection1)
    svg.selectAll("*").remove();
    dataset = await loadData();

    // Créez le Circle Packing en utilisant le critère initial
    createCirclePacking(dataset, ordreInitial[ordreActuel], 40, 10);
}

function createCirclePacking(data, str, padding, radius) {
    const indicateur = document.getElementById("indicateur");
    indicateur.innerText=str

    let nestedData;
    console.log(str,"test")
    switch (str) {
        case "pays":
            nestedData = d3.rollups(
                data,
                group => group.map(d => ({ artist_name: d.artist_name, other_property: d.other_property })),
                d => d.artist_country
            );
            break;
        case "genre":
            
            nestedData = d3.rollups(
                data,
                group => group.map(d => ({ artist_name: d.artist_name, other_property: d.other_property })),
                d => d.artist_genre
            );
            break;
        case "type":
            nestedData = d3.rollups(
                data,
                group => group.map(d => ({ artist_name: d.artist_name, other_property: d.other_property })),
                d => d.artist_type
            );
            break;
    }

    const critereByArtist = {};

    nestedData.forEach(element => {
        critereByArtist[element[0]] = element[1].length;
    });

    const goodData = Object.entries(critereByArtist).map(([critere, nombreArtistes]) => ({ critere, nombreArtistes }));

    const pack = d3.pack()
        .size([height, width])
        .padding(padding);

    const root = d3.hierarchy({ children: goodData })
        .sum(d => d.nombreArtistes);

    pack(root);

    const node = svg.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("stroke", "black")
        .style("stroke-width", 1)
        .on("mouseover", mouseover)
        .on("mousemove", function (event, d) {mousemove(event, d);})
        .on("mouseout", mouseout)
        .on("click", function (event, d) { handleBubbleClick(d); });

    node.append("circle")
        .attr("r", d => d.r + radius)
        .style("fill", (d, i) => d3.schemeCategory10[i % 10])
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    node.append("text")
        .text(d => d.data.pays)
        .style("display", "none");

    // Mettez à jour la variable de critère actuelle pour le prochain clic
    if(ordreActuel<2){
        ordreActuel++;
    }

    const firstCircle = svg.select("circle");
    if (firstCircle.node()) {
        firstCircle.remove();
    }
}

function handleBubbleClick(d) {

    whereAreWe++;
    svg.selectAll("*").remove();

    const filter = document.getElementById("filtre")

    if (d.data.critere) {
        const critere = d.data.critere;
        
        switch (whereAreWe) {
            case 1:
                critere1 = critere;
                datasetAfter1Select = filterData(ordreInitial[0],dataset, critere);
                createCirclePacking(datasetAfter1Select, ordreInitial[ordreActuel], 60, 13);
                returnbutton.style.display =" block";
                filter.innerText=critere1;
                break;
            case 2:
                critere2 = critere;
                datasetAfter2Select = filterData(ordreInitial[1],datasetAfter1Select, critere);
                createCirclePacking(datasetAfter2Select, ordreInitial[ordreActuel], 60, 0);
                filter.innerText=critere1+", "+critere2;
                break;
            case 3:
                critere3=critere;
                datasetAfter3Select = filterData(ordreInitial[2],datasetAfter2Select, critere);    
                loadLeftWindow(datasetAfter3Select)
                filter.innerText=critere1+", "+critere2+", "+critere3;
                break;
            }
    }
}

returnbutton.addEventListener("click",returnFunc);

function returnFunc(){
    const filter = document.getElementById("filtre")
    whereAreWe--;
    

    console.log(whereAreWe)
    console.log(ordreActuel)
    switch (whereAreWe) {
        case 0:
            ordreActuel=whereAreWe; 
            svg.selectAll("*").remove();
            createCirclePacking(dataset, ordreInitial[0], 40, 10);
            returnbutton.style.display =" none";
            filter.innerText="";
            break;
        case 1:
            ordreActuel=whereAreWe; 
            svg.selectAll("*").remove();
            createCirclePacking(datasetAfter1Select, ordreInitial[1], 60, 13);
            filter.innerText=critere1;
            break;
        case 2:
            svg.selectAll("*").remove();
            filter.innerText=critere1+", "+critere2;
            createCirclePacking(datasetAfter2Select, ordreInitial[2], 60, 0);
            const blocks = document.getElementsByClassName("blocks");
            blocks[0].style.display = "none";
            const tooltip = document.getElementsByClassName("tooltip");
            tooltip[0].style.display = "block";
            const Element = document.getElementsByClassName("infoMusique")[0];
            Element.style.display= "none";
            clearInfo();
            clearLeftWindow();
            clearRightWindow();
            
            break;
        }
}

function clearLeftWindow(){
    const ulElement = document.getElementById("leftWindow"); 
               
            while (ulElement.firstChild) {
                ulElement.removeChild(ulElement.firstChild);
            }
}

function clearRightWindow(){
    const ulElement = document.getElementById("rightWindow"); 
               
            while (ulElement.firstChild) {
                ulElement.removeChild(ulElement.firstChild);
            }
}

function loadLeftWindow(data){

    console.log(ordreActuel)
    const blocks = document.getElementsByClassName("blocks");
    blocks[0].style.display = "flex";

    const tooltip = document.getElementsByClassName("tooltip");
    tooltip[0].style.display = "none";

    const leftWindow = document.getElementById("leftWindow");

    data.forEach(artiste => {
        let newElement = document.createElement("li")
        newElement.innerText = artiste.artist_name
        newElement.classList.add("artiste")
        leftWindow.appendChild(newElement)
    })

    const artisteSelected = document.getElementsByClassName("artiste")

    console.log(artisteSelected)

    for (let i = 0; i < artisteSelected.length; i++){
        artisteSelected[i].addEventListener("click",handleClickLeftBlocks)
    }
}

function loadRightWindow(data){

    const rightWindow = document.getElementById("rightWindow");

    data.forEach(musique => {
        let newElement = document.createElement("li")
        newElement.innerText = musique.title
        newElement.classList.add("musique")
        rightWindow.appendChild(newElement)
    })

    const musicSelected = document.getElementsByClassName("musique")

    for (let i = 0; i < musicSelected.length; i++){
        musicSelected[i].addEventListener("click",handleClickRightBlocks)
    }
}



function handleClickLeftBlocks(){


    clearRightWindow()
    songs = filterData("artiste",datasetAfter3Select, this.innerText)[0].songs;
    loadRightWindow(songs)
    console.log(songs)
    
}

function handleClickRightBlocks(){

    clearInfo();

    songs.forEach(song => {
        if(song.title === this.innerText){
            console.log("test")
            const info = document.getElementsByClassName("infoMusique")[0];
            info.style.display = "flex";
            let newElement1 = document.createElement("a")
            let newElement2 = document.createElement("a")
            let newElement3 = document.createElement("a")
            newElement1.innerText= "Titre: "+song.title
            newElement2.innerText= "Album: "+song.Album
            newElement3.innerText= "Lien deezer: "+song.DeezerURL
            info.appendChild(newElement1)
            info.appendChild(newElement2)
            info.appendChild(newElement3)
            
        }
    })
}

function clearInfo(){
    const Element = document.getElementsByClassName("infoMusique")[0];
               
        while (Element.firstChild) {
            Element.removeChild(Element.firstChild);
        }
}


function mouseover() {
    d3.select(this).style("opacity", 0.7);
    d3.select(this).style("cursor", "pointer");
    div.transition()
        .duration(300)
        .style("opacity", 1);
}

function mousemove(event, d) {
    div
    .html('<u>' + d.data.critere + '</u>' + "<br>" + d.data.nombreArtistes + " artistes")
    .style("left", (event.pageX ) + "px")
    .style("top", (event.pageY) + "px");
}

function mouseout() {
    d3.select(this).style("opacity", 1);
    div.transition()
        .duration(300)
        .style("opacity", 1e-6);
}

function filterData(str,data,critere){

    switch (str){
        case "pays":
            return data.filter(d => d.artist_country === critere);
        case "genre": 
            return data.filter(d => d.artist_genre === critere);
        case "type":
            console.log("On passe la ")
            return data.filter(d => d.artist_type === critere);
        case "artiste":
            return data.filter(d => d.artist_name === critere);     
    }
    
}


const breadcrumb = document.getElementById("breadcrumb");
let steps = Array.from(breadcrumb.querySelectorAll(".step"));
const validateButton = document.getElementById("validateButton");

let originalOrder = [];

// Initialize original order
steps.forEach((step, index) => {
    originalOrder.push(step.textContent);
    step.dataset.order = index + 1;
    step.setAttribute("draggable", true);
    step.addEventListener("dragstart", handleDragStart);
    step.addEventListener("dragover", handleDragOver);
    step.addEventListener("drop", handleDrop);
});

validateButton.addEventListener("click", handleValidate);

function handleDragStart(e) {
    e.dataTransfer.setData("text/plain", e.target.dataset.order);
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    const draggedStep = breadcrumb.querySelector(`[data-order="${data}"]`);
    const droppedStep = e.target;

    const draggedIndex = steps.indexOf(draggedStep);
    const droppedIndex = steps.indexOf(droppedStep);

    if (draggedIndex >= 0 && droppedIndex >= 0) {
        breadcrumb.insertBefore(draggedStep, droppedStep);
        // Update the original order based on the new order
        updateOriginalOrder();
    }
}

function handleValidate() {
    // Reset the breadcrumb
    originalOrder.forEach((order, index) => {
        breadcrumb.querySelector(`[data-order="${index + 1}"]`).textContent = order;
    });
    // Restore original order
    steps = Array.from(breadcrumb.querySelectorAll(".step"));
    ordreInitial[0]=steps[0].firstChild.data.toLowerCase()
    ordreInitial[1]=steps[1].firstChild.data.toLowerCase()
    ordreInitial[2]=steps[2].firstChild.data.toLowerCase()
    ordreActuel=0
    whereAreWe=0
    init();
}

function updateOriginalOrder() {
    originalOrder = [];
    steps.forEach((step, index) => {
        originalOrder.push(step.textContent);
        step.dataset.order = index + 1;
    });
}

init();
