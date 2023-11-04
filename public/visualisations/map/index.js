//selecting map container element
const svgContainer = d3.select("#map-container");
const width = 1200;
const height = 900; 

// svg element
const svg = svgContainer.append("svg")
    .attr("width", width)
    .attr("height", height);


//projecting data from 3d (earth) to a 2d (map)
const projection = d3.geoMercator()
    .scale(150)
    .translate([width / 2, height / 2]);

//convert geographic data into SVG path data
const path = d3.geoPath().projection(projection);

//allow zooming on the map
function zoomed(event) {
    svg.selectAll("path")  
        .attr("transform", event.transform);  
}
const zoom = d3.zoom()
    .scaleExtent([1, 10]) 
    .translateExtent([[0, 0], [width, height]]) 
    .on("zoom", zoomed);

// load GeoJSON data (map)
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(world) {
    // load country data
    d3.json("\\data\\country.json").then(function(countryData) {
        // initialize color scale
        const initialLanguage = "english";
        const maxSongCount = d3.max(countryData, d => d[initialLanguage]);
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, maxSongCount]);

        // adding an initial legend
        addLegend(colorScale);

        // select language
        updateMap(initialLanguage);

        //add an event listner to the language selection dropdown tooltip
        d3.select("#language-select").on("change", function() {
            const selectedLanguage = this.value;
            updateMap(selectedLanguage);
        });

        

        //updating the map regarding the selected language
        function updateMap(language) {
            const colors = ["#C850C0","#FFCC70","#FFFF00","#4158D0" ];

            // update the color scale wrt selected language distribution
            const maxSongCount = d3.max(countryData, d => d[language]);
            const colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain([0, maxSongCount])
                .range(colors);

            //updating tooltip songs list
            const tooltip = document.getElementById("song-tooltip");                                        
            const tooltipHeader = document.getElementById("tooltip-header");
            const tooltipSongList = document.getElementById("tooltip-song-list");
            const closeButton = document.getElementById("close-list-button");
            closeButton.addEventListener("click", function() {
                tooltip.classList.remove("active")
            });
            //mapping data in country.json and the geo map
            svg.selectAll("path")
                .data(world.features)
                .join("path")
                .attr("d", path)
                .style("fill", function(d) {
                    const country = countryData.find(c => c.Country === d.properties.name); //get the country
                    //console.log(country)
                    if (country) { //if country exists, mapping possible and found
                        const languageCount = country[language]; 
                        return languageCount !== undefined ? colorScale(languageCount) : "gray"; 
                    }
                    return "gray";
                })
                .on("click", function(event, d) { //when clicking on a country
  
                        if (d && d.properties && d.properties.name) {
                            const countryName = d.properties.name; //selected country
                            const country = countryData.find(c => c.Country === countryName);
                            if (country && country.songs) {
                                //get distribution for the selected language
                                const selectedLanguage = d3.select("#language-select").node().value;
                                //filter songs according to the language
                                const songsInLanguage = country.songs.filter(song => song[1] === selectedLanguage);
                                //get song names and artists names
                                const songNames = songsInLanguage.map(song => [song[0],song[2]]);
                                //console.log(songNames)

                                // update song list tooltip according to the language and country
                                tooltipHeader.textContent = ` ${selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} songs available in ${countryName}:`;

                                // adding the songs to tooltip
                                const songListHTML = songNames.map(songName => `
                                        <li>
                                            <span class="song-name">${songName[0].charAt(0).toUpperCase()}${songName[0].slice(1)}</span>
                                            <span class="by"> by </span>${songName[1]}
                                        </li>`
                                    ).join('');

                                tooltipSongList.innerHTML = songListHTML;



                            // position of the tooltip
                            tooltip.style.left = event.pageX + "px";
                            tooltip.style.top = event.pageY + "px";
                            // activating/diplaying tooltip
                            tooltip.classList.add("active");
                            }

                        }

                           
                    }) 

 
                // update the legend when selecting another language
                addLegend(colorScale);
                }
                svg.call(zoom);

    });
});

// Create a legend
function addLegend(colorScale) {
    const legend = d3.select("#legend");

    //create legend using ticks from the color scale
    const legendData = colorScale.ticks(15).reverse(); // Reverse the order of legendData
    const legendWidth = 200;
    const legendHeight = 15;

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
