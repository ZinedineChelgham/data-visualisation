
const DATASET_PATH = "data/wasabi_data_preprocessed.json";

async function loadData() {
    try {
        return await d3.json(DATASET_PATH);
    } catch (error) {
        console.error("Error loading data:", error);
        throw error; // Re-throw the error for error handling further up the call stack
    }
}



loadData().then(data => {
    //console.log(data)
    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 10, bottom: 10, left: 10 },
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    var minWidth = 40

    // append the svg object to the body of the page
    var svg = d3.select("#dataviz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add tooltip div
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

    // Group the data by artist_country and count the number of artists for each country
    var nestedData = d3.group(data, (d) => d.artist_country);
    console.log("nestedData", nestedData);
    var countryData = Array.from(nestedData, ([country, artists]) => ({
        country,
        artists_count: artists.length,
    }));
    console.log("countryData", countryData);

    // Create a hierarchical structure
    var hierarchicalData = {
        name: "Countries",  // Root node
        children: countryData.map(function (d) {
            return {
                name: d.country,  // Country name becomes the name of the child node
                value: d.artists_count  // Artist count becomes the value of the child node
            };
        })
    };

    //var color = d3.scale.ordinal().range(["#8CBAD1","#70D64E","#EF7087","#DDA335","#D981D5","#82CE8C","#839BE6","#C6D445","#C3B66B","D1A7CC","#70D3C5","#DD9692"])

    console.log("hierarchicalData", hierarchicalData);
    // Create a root hierarchy using the countryData
    var root = d3.hierarchy(hierarchicalData).sum((d) => d.value);

    console.log("root", root);

    // Then d3.treemap computes the position of each element of the hierarchy
    d3.treemap()
        .size([width, height])
        .padding(2)
        .round(true)
        (root)

    // use this information to add rectangles:
    svg
        .selectAll("rect")
        .data(root.leaves())
        .enter()
        .append("rect")
        .attr('x', function (d) { return d.x0; })
        .attr('y', function (d) { return d.y0; })
        .attr('width', function (d) { return d.x1 - d.x0; })
        .attr('height', function (d) { return d.y1 - d.y0; })
        .style("stroke", "black")
        //.style("fill", function (d) { return getRandomColor(); })
        .style("fill", (d, i) => {
            // Générez une couleur unique pour chaque pays
            return d3.schemeCategory10[i % 10];
        })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout)

    // and to add the text labels
    svg
        .selectAll("text")
        .data(root.leaves())
        .enter()
        .append("text")
        .attr("x", function (d) { return d.x0 + 5 })    // +10 to adjust position (more right)
        .attr("y", function (d) { return d.y0 + 20 })    // +20 to adjust position (lower)
        .text(function (d) {
            // Conditionally add text only if the rectangle is large enough
            if (d.x1 - d.x0 > minWidth && d.y1 - d.y0 > minWidth) {
                return d.data.name;
            } else {
                return ""; // Empty text when the rectangle is too small
            }
        })
        .attr("font-size", "15px")
        .attr("fill", "black")

    function getRandomColor() {
        const colors = ["#8CBAD1", "#70D64E", "#EF7087", "#DDA335", "#D981D5", "#82CE8C", "#839BE6", "#C6D445", "#C3B66B", "D1A7CC", "#70D3C5", "#DD9692"];
        const randomIndex = Math.floor(Math.random() * colors.length); // Generate a random index within the array length
        return colors[randomIndex]; // Return the color at the random index
    }

    function mouseover() {
        d3.select(this).style("opacity", 0.7);
        d3.select(this).style("cursor", "pointer")
        tooltip.transition()
            .duration(300)
            .style("opacity", 1);
    }

    function mousemove(event, d) {
        console.log(d);
        tooltip
            .text("Info about " + d.data.name)
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY) + "px");
    }

    function mouseout() {
        d3.select(this).style("opacity", 1);
        tooltip.transition()
            .duration(300)
            .style("opacity", 1e-6);
    }

});

