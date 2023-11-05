//in addition to course, the followed tutorials are:
//https://d3-graph-gallery.com/choropleth.html
//https://www.javascripttutorial.net/javascript-dom/document-object-model-in-javascript/
//https://d3-graph-gallery.com/graph/interactivity_tooltip.html
//https://www.javascripttutorial.net/javascript-dom/javascript-mouse-events/
//https://www.javascripttutorial.net/web-apis/javascript-drag-and-drop/

//selecting map container element
var svgContainer = d3.select("#map-container");
var width = 1200;
var height = 900; 
// svg element
var svg = svgContainer.append("svg")
    .attr("width", width)
    .attr("height", height);
//projecting data from 3d (earth) to a 2d (map)
var projection = d3.geoMercator()
    .scale(120)
  //.center([0,20])
    .translate([width / 2, height / 2]);
//convert geographic data into SVG path data
var path = d3.geoPath().projection(projection);
//allow zooming on the map
function zoomed(event) {
    svg.selectAll("path")  
        .attr("transform", event.transform);  
}
var zoom = d3.zoom()
    .scaleExtent([1, 10]) 
    .translateExtent([[0, 0], [width, height]]) 
    .on("zoom", zoomed);


// load GeoJSON data (map)
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(world) {
    // load country data
    d3.json("\\data\\country.json").then(function(countryData) {
        // initialize color scale
        var initLang = "english";
        var maxsongs = d3.max(countryData, d => d[initLang]);
        var colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, maxsongs]);

        // adding an initial legend
        addLegend(colorScale);
        // select language
        updateMap(initLang);
        //add an event listner to the language selection dropdown tooltip
        d3.select("#language-select").on("change", function() {
            var selectedLang = this.value;
            updateMap(selectedLang);
        });
                //updating the map regarding the selected language
        function updateMap(language) {
            var colors = ["#C850C0","#FFCC70","#FFFF00","#4158D0" ]; //just to be coherent with the rest of visualization of the project!

            // update the color scale wrt selected language distribution
            var maxsongs = d3.max(countryData, d => d[language]);
            var colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain([0, maxsongs])
                .range(colors);

            //updating tooltip songs list
            var tooltip = document.getElementById("song-tooltip");                                        
            var tooltipHeader = document.getElementById("tooltip-header");
            var tooltipSongList = document.getElementById("tooltip-song-list");
            //adding a close button to allow closing the tooltip if no more needed
            var closeButton = document.getElementById("close-button");
            closeButton.addEventListener("click", function() {
                tooltip.classList.remove("active")
            });
            //mapping data in country.json and the geo map and varructing map and tooltips
            svg.selectAll("path")
                .data(world.features)
                .join("path")
                .attr("d", path)
                .style("fill", function(d) {
                    var country = countryData.find(c => c.Country === d.properties.name); //get the country
                    //console.log(country)
                    if (country) { //if country exists, mapping possible and found
                        var langCount = country[language]; 
                        return langCount !== undefined ? colorScale(langCount) : "gray"; 
                    }
                    return "gray";
                })
                .on("click", function(event, d) { //when clicking on a country
  
                        if (d && d.properties && d.properties.name) {
                            var countryName = d.properties.name; //selected country
                            var country = countryData.find(c => c.Country === countryName);
                            //after selecting a country, updating the different information in the toolips
                            if (country && country.songs) {
                                var selectedLang = d3.select("#language-select").node().value; //get the selected language
                                var songsInLang = country.songs.filter(song => song[1] === selectedLang); //filter the songs to get only he songs in the selected language
                                var artistsOfCountry = Array.from(new Set(songsInLang.map(song => song[2]))); //get all the artists in this country with songs in the selected language
                                var artists = artistsOfCountry.filter((artistName, index, artists) => artists.indexOf(artistName) === index); //keep only unique artists, by keeping only first appearances names
                
                                tooltipHeader.textContent = `Artists with songs in ${countryName}:`; //set toolip title
                                // define first level of tooltip to artists list
                                var artistsHTML = artists.map(artistName => `
                                    <li class="artist" name-artist="${artistName}">${artistName}</li>`
                                ).join('');
                                // add first level to tooltip
                                tooltipSongList.innerHTML = artistsHTML;
                                tooltip.classList.add("active");

                                //define back button to allow getting back from level 2 to level 1
                                var backButton = document.querySelector('.back-button');
                                
                                backButton.addEventListener('click', (e) => {
                                    e.stopPropagation(); // this allow to have the back button only for level 2 (not propagated to level 1 )
                                    tooltipHeader.textContent = `Artists in ${countryName}`;
                                    tooltipSongList.innerHTML = artistsHTML;
                                    
                                });
                                
                                // selecting artist and setting the levell 2 of the tooltip (songs of the selected artist)
                                tooltipSongList.addEventListener('click', e => {
                                    if (e.target.classList.contains('artist')) {
                                        var selectedArtist = e.target.getAttribute('name-artist'); //get selected artist
                                        var songsOfArtist = songsInLang.filter(song => song[2] === selectedArtist); //filtering the songs to get selected artist ones
                                        tooltipHeader.textContent = `Songs by "${selectedArtist} "`; //setting title of level 2
                                        var songListHTML = songsOfArtist.map(song => ` <li> <span class="song-name">${song[0].charAt(0).toUpperCase() + song[0].slice(1)}</span> </li>`).join('');
                                        tooltipSongList.innerHTML = songListHTML;
                                        backButton.style.display = 'block'; //display the back buttom for this level (2)

                                    }
                                });

                                
                            }

                        }
            });                     
                
            addLegend(colorScale); // adding and updating the legend when selecting another language
        }
        svg.call(zoom); //allow zooming
        
        var dragTooltip = document.querySelector('.draggable-tooltip');
        
        var dragg = false; // is the object being dragged
        //initial positioon of the obejct (tooltip song)
        var x = 0;
        var y = 0;
        //offset between cursor and object top left corner
        var dx = 0;
        var dy = 0;

        // event listner on the mouse to get the dragging 

        //listen/track the mouse everywhere in the page
        dragTooltip.addEventListener('mousemove',(e)=>{
            if(!dragg){return;}
            dx = e.clientX - x; //horizontal coord of the mouse
            dy = e.clientY - y; //vertical
            dragTooltip.style.transform = `translate(${dx}px, ${dy}px)` ;

        });

        // the case where the mouse is no longer on the web page
        dragTooltip.addEventListener('mouseleave', () => {
            if(dragg){
                dragg = false;
                dragTooltip.classList.remove('draggable');
            }
        });

        //mouse is on the object/tooltip
        dragTooltip.addEventListener('mousedown', (e) => {
            dragg = true;
            x = e.clientX - dx;
            y = e.clientY - dy;
            dragTooltip.classList.add('draggable');
        });
        
        //mouse is released, no longer on the tooltip
        dragTooltip.addEventListener('mouseup', () => {
            dragg = false;
           dragTooltip.classList.remove('draggable');
        });
    


    });


});

// creating legend for map
function addLegend(colorScale) {
    var legend = d3.select("#legend");
    //create legend using ticks from the color scale
    var legendData = colorScale.ticks(15).reverse(); // reverse the order of legendData
    var legendWidth = 200;
    var legendHeight = 15;

    // delete existing legend items
    legend.selectAll("*").remove();
    legend.append("div").text("High");

    // adding legend color blocks and labels
    legend.selectAll("div")
        .data(legendData)
        .enter()
        .append("div")
        .style("width", `${legendWidth / legendData.length}px`)
        .style("height", `${legendHeight}px`)
        .style("background-color", d => colorScale(d));

        legend.append("div").text("Low");

}
