const DATASET_PATH = "/data/wasabi_data_preprocessed.json";

const animationSpeed = 120; // Milliseconds between each step
const stepSize = 1; // Increment to increase minYear

var minYear, maxYear;
var width = 960,
    height = 500;
// Add tooltip div
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var margin = { top: 24, right: 0, bottom: 0, left: 0 },
    formatNumber = d3.format(",d"),
    transitioning;

var x = d3.scaleLinear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scaleLinear()
    .domain([0, height - margin.top - margin.bottom])
    .range([0, height - margin.top - margin.bottom]);

var color = d3.scaleOrdinal()
    .range(d3.schemeCategory10
        .map(function (c) { c = d3.rgb(c); c.opacity = 0.6; return c; }));
//var color = d3.scaleOrdinal(d3.schemeCategory20.map(fader));

var fader = function (color) { return d3.interpolateRgb(color, "#fff")(0.2); };
var format = d3.format(",d");
var treemap;
var svg, grandparent;


d3.json(DATASET_PATH, function (error, data) {
    initInput(data);

    document.getElementById("filterButton").addEventListener("click", () => {
        const minYearInput = document.getElementById("minYearInput");
        const maxYearInput = document.getElementById("maxYearInput");
        minYear = parseInt(minYearInput.value, 10);
        maxYear = parseInt(maxYearInput.value, 10);

        if (isNaN(minYear) || isNaN(maxYear)) {
            alert("Please enter a valid year.");
            return;
        }

        if (minYear > maxYear) {
            alert("The minimum year must be lower than the maximum year.");
            return;
        }
        console.log("click", minYear, maxYear);

        updateDrillDown(getHierarchicalData(filterData(data)));
    });

    document.getElementById("restartButton").addEventListener("click", (e) => {
        const earliestPublicationDate = findEarliestAlbumPublicationDate(data);
        const latestPublicationDate = findLatestAlbumPublicationDate(data);
        minYear = earliestPublicationDate;
        maxYear = latestPublicationDate;
        updateDrillDown(getHierarchicalData(filterData(data)));
        e.target.style.display = "none";
        document.getElementById("minYearInput").value = minYear;
        document.getElementById("maxYearInput").value = maxYear;
    })


    document.getElementById("playAnimationAscButton").addEventListener("click", () => {
        animateChart();
    });

    document.getElementById("playAnimationDescButton").addEventListener("click", () => {
        animateChartDesc()
    });

    function animateChart() {
        if (minYear < maxYear) {
            // Increase minYear for the next step
            minYear += stepSize;

            //update the input
            document.getElementById("minYearInput").value = minYear;

            // Update the chart with the current minYear
            updateDrillDown(getHierarchicalData(filterData(data)));

            // Set a timeout to continue the animation
            setTimeout(animateChart, animationSpeed);
        } else {
            const button = document.querySelector("#restartButton");
            // console.log(button);
            button.style.display = "block";
        }

    }

    function animateChartDesc() {
        if (minYear < maxYear) {
            // Update the chart with the current minYear
            updateDrillDown(getHierarchicalData(filterData(data)));
            // Increase minYear for the next step
            maxYear -= stepSize;

            //update the input
            document.getElementById("maxYearInput").value = maxYear;

            // Update the chart with the current minYear
            updateDrillDown(getHierarchicalData(filterData(data)));
            // Set a timeout to continue the animation
            setTimeout(animateChartDesc, animationSpeed);
        } else {
            const button = document.querySelector("#restartButton");
            // console.log(button);
            button.style.display = "block";
        }
    }


    updateDrillDown(getHierarchicalData(filterData(data)));

    function updateDrillDown(data) {
        if (svg) {
            svg.selectAll(".depth").remove();
        } else {
            svg = d3.select("#dataviz").append("svg")
                .attr("width", width - margin.left - margin.right)
                .attr("height", height - margin.bottom - margin.top)
                .style("margin-left", -margin.left + "px")
                .style("margin.right", -margin.right + "px")
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .style("shape-rendering", "crispEdges") // remove blur

            grandparent = svg.append("g")
                .attr("class", "grandparent");

            grandparent.append("rect")
                .attr("y", -margin.top)
                .attr("width", width)
                .attr("height", margin.top);

            grandparent.append("text")
                .attr("x", 6)
                .attr("y", 6 - margin.top)
                .attr("dy", ".75em")

            treemap = d3.treemap()
                //Golden ratio to optimize the aspect
                .tile(d3.treemapResquarify.ratio(height / width * 0.5 * (1 + Math.sqrt(5))))
                .size([width, height])
                .round(false)
                .paddingInner(1);
        }

        //Set the root node and the hierarchy 
        var root = d3.hierarchy(data)
            .eachBefore(function (d) { d.id = (d.parent ? d.parent.id + "." : "") + d.data.name; })
            .sum((d) => {
                // console.log(d);
                return d.value;
            })
            .sort(function (a, b) {
                //console.log('initial root sort a ' + a.value + ' b ' + b.value);
                return b.height - a.height || b.value - a.value;
            });

        console.log("before", root);

        initialize(root);
        accumulate(root);
        console.log("after", root);
        layout(root);
        treemap(root);
        display(root);
    };

    function initialize(root) {
        root.x = root.y = 0;
        root.x1 = width;
        root.y1 = height;
        root.depth = 0;
    }

    // Aggregate the values for internal nodes. This is normally done by the
    // treemap layout, but not here because of our custom implementation.
    // We also take a snapshot of the original children (_children) to avoid
    // the children being overwritten when when layout is computed.
    function accumulate(d) {
        //console.log('accumulate called ' + d.data.name);
        return (d._children = d.children)
            ? d.value = d.children.reduce(function (p, v) { return p + accumulate(v); }, 0) : d.value;
    }

    // Compute the treemap layout recursively such that each group of siblings
    // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
    // object is created for the parent node for each group of siblings so that
    // the parent’s dimensions are not discarded as we recurse. Since each group
    // of sibling was laid out in 1×1, we must rescale to fit using absolute
    // coordinates. This lets us use a viewport to zoom.
    function layout(d) {
        if (d._children) {
            d._children.forEach(function (c) {
                c.x0 = d.x0 + c.x0 * d.x1;
                c.y0 = d.y0 + c.y0 * d.y1;
                c.x1 *= (d.x1 - d.x0);
                c.y1 *= (d.y1 - d.y0);
                c.parent = d;
                layout(c);
            });
        }
    }

    function display(d) {
        //console.log(d);

        if (d.id !== "Data to explore") {
            const buttons = document.querySelectorAll("#animation-button button");
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].disabled = true;
                buttons[i].style.opacity = 0.5;
                buttons[i].style.cursor = "not-allowed";
            }
        } else {
            const buttons = document.querySelectorAll("#animation-button button");
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].disabled = false;
                buttons[i].style.opacity = 1;
                buttons[i].style.cursor = "pointer";
            }
        }

        grandparent
            .datum(d.parent)
            .on("click", transition)
            .on("mouseover", (_, i) => {
                console.log(i);
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 1);
            })
            .on("mousemove", (e, i) => {
                // get x and y position of the mouse not using d3
                const mouseX = d3.event.pageX;
                const mouseY = d3.event.pageY;
                // console.log(e, i);
                tooltip.html(function () {
                    return e !== undefined ? "Step back" : ""
                }).style("left", mouseX + 20 + "px")
                    .style("top", mouseY - 20 + "px")
                    .style("display", function () {
                        return tooltip.html() === "" ? "none" : "block";
                    });

            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 1e-6);
            })
            .select("text")
            .text(name(d))


        var g1 = svg.insert("g", ".grandparent")
            .datum(d)
            .attr("class", "depth");

        var g = g1.selectAll("g")
            .data(d._children)
            .enter().append("g")
            .on("mouseover", (_, i) => {
                //console.log(i);
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 1);
            })
            .on("mousemove", (e, i) => {
                const [mouseX, mouseY] = d3.mouse(svg.node());
                //console.log(svg.node());
                //console.log(e);
                tooltip.html(function () {
                    switch (e.height) {
                        case 3: return "Dive into <span class=underlined-text>" + d.children[i].data.name.toUpperCase() + " (" + d.children[i].value + " data)" + "</span>" + " music style distribution"
                        case 2: return "Dive into <span class=underlined-text>" + d.children[i].data.name.toUpperCase() + " (" + d.children[i].value + ")" + "</span>" + " artists & songs distribution"
                        case 1: return "Dive into the artist <span class=underlined-text>" + d.children[i].data.name.toUpperCase() + "</span> " + d.children[i].value + " songs"
                        default: return "Album: <span class=underlined-text>" + d.children[i].data.album.toUpperCase() + "</span>"
                    }
                }).style("left", (mouseX + 20) + "px")
                    .style("top", (mouseY + 50) + "px")
                    .style("display", function () {
                        return tooltip.html() === "" ? "none" : "block";
                    });
            })
            .on("mouseout", () => {
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 1e-6);
            })



        g.filter(function (d) { return d._children; })
            .classed("children", true)
            .on("click", transition)


        var children = g.selectAll(".child")
            .data(function (d) { return d._children || [d]; })
            .enter().append("g");

        children.append("rect")
            .attr("class", "child")
            .call(rect)
            .append("title")
            .text(function (d) { return d.data.name + " (" + formatNumber(d.value) + ")"; })


        g.append("rect")
            .attr("class", "parent")
            .call(rect);

        var t = g.append("text")
            .attr("class", "ptext")
            .attr("dy", "1em")


        t.append("tspan")
            .text(function (d) { return d.data.name; });

        t.append("tspan")
            .attr("dy", "1.15em")
            .text(function (d) {
                if (d.value === 1) {
                    return ""; // Return an empty string when d.value is 1
                } else {
                    let str = formatNumber(d.value)
                    d.height >= 2 ? str += "" : str += " songs"
                    return str;
                }
            });

        t.call(text);

        g.selectAll("rect")
            .style("fill", function (d) { return color(d.data.name); });

        function transition(d) {
            if (transitioning || !d) return;
            transitioning = true;
            var g2 = display(d),
                t1 = g1.transition().duration(750),
                t2 = g2.transition().duration(750);

            // Update the domain only after entering new elements.
            //x.domain([d.x0, d.x0 + d.x1]);
            //y.domain([d.y0, d.y0 + d.y1]);
            x.domain([d.x0, d.x0 + (d.x1 - d.x0)]);
            y.domain([d.y0, d.y0 + (d.y1 - d.y0)]);

            // Enable anti-aliasing during the transition.
            svg.style("shape-rendering", null);

            // Draw child nodes on top of parent nodes.
            svg.selectAll(".depth").sort(function (a, b) {
                //console.log('.depth sort a ' + a.depth + ' b ' + b.depth);
                return a.depth - b.depth;
            });

            // Fade-in entering text.
            g2.selectAll("text").style("fill-opacity", 0);

            // Transition to the new view.
            t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
            t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
            t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
            t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
            t1.selectAll("rect").call(rect);
            t2.selectAll("rect").call(rect);

            // Remove the old node when the transition is finished.
            t1.remove().on("end", function () {
                svg.style("shape-rendering", "crispEdges");
                transitioning = false;
            });
        }
        return g;
    }

    function text(text) {
        text.selectAll("tspan")
            .attr("x", function (d) { return x(d.x0) + 6; })
        text.attr("x", function (d) { return x(d.x0) + 6; })
            .attr("y", function (d) { return y(d.y0) + 3; })
            .style("opacity", function (d) {
                var w = x(d.x1) - x(d.x0);
                // console.log("text opacity setting textlength " + this.getComputedTextLength() + " d size " + w);
                return this.getComputedTextLength() < w - 6 ? 1 : 0;
            });
    }

    function text2(text) {
        text.attr("x", function (d) {
            return x(d.x1) - this.getComputedTextLength() - 6;
        })
            .attr("y", function (d) { return y(d.y1) - 6; })
            .style("opacity", function (d) {
                var w = x(d.x1) - x(d.x0);
                //console.log("text2 opacity setting textlength " + this.getComputedTextLength() + " d size " + w);
                return this.getComputedTextLength() < w - 6 ? 1 : 0;
            });
    }

    function rect(rect) {
        rect.attr("x", function (d) { return x(d.x0); })
            .attr("y", function (d) { return y(d.y0); })
            .attr("width", function (d) {
                var w = x(d.x1) - x(d.x0);
                // console.log('id ' + d.id + ' rect width ' + w);
                return w;
            })
            .attr("height", function (d) {
                var h = y(d.y1) - y(d.y0);
                // console.log('id ' + d.id + ' rect height ' + h);
                return h;
            })

    }

    function name(d) {
        return d.parent ? name(d.parent) + " > " + d.data.name + " (" + formatNumber(d.value) + ")"
            : d?.data?.name + " (" + formatNumber(d.value) + ")";
    }

});

function findEarliestAlbumPublicationDate(artists) {
    let earliestDate = Infinity;
    artists.forEach(artist => {
        artist.albums.forEach(album => {
            const publicationDate = parseInt(album.publicationDateAlbum, 10);
            if (!isNaN(publicationDate) && publicationDate < earliestDate && publicationDate !== 0) {
                earliestDate = publicationDate;
            }
        });
    });

    return earliestDate;
}

function findLatestAlbumPublicationDate(artists) {
    let latestDate = 0;
    artists.forEach(artist => {
        artist.albums.forEach(album => {
            const publicationDate = parseInt(album.publicationDateAlbum, 10);
            if (!isNaN(publicationDate) && publicationDate > latestDate && publicationDate !== 9999) {
                latestDate = publicationDate;
            }
        });
    });

    return latestDate;
}

function filterData(data) {
    const filteredData = data.filter(function (d) {
        // Extract the publication date from the artist's data
        const publicationDate = parseInt(findEarliestAlbumPublicationDate([d]));
        // Check if the publication date falls within the desired range
        const res = publicationDate >= minYear && publicationDate <= maxYear;
        // if(!res) {
        //     console.log("removed", d, publicationDate, minYear, maxYear);
        // }
        return res;
    });

    return filteredData;
}

function initInput(data) {
    const earliestPublicationDate = findEarliestAlbumPublicationDate(data);
    const latestPublicationDate = findLatestAlbumPublicationDate(data);

    const minYearInput = document.getElementById("minYearInput");
    minYearInput.min = earliestPublicationDate;
    minYearInput.value = earliestPublicationDate;

    const maxYearInput = document.getElementById("maxYearInput");
    maxYearInput.max = latestPublicationDate;
    maxYearInput.value = latestPublicationDate;

    minYear = earliestPublicationDate;
    maxYear = latestPublicationDate;
}


function getHierarchicalData(data) {

    var nestedData = d3.nest()
        .key(function (d) { return d.artist_country; })
        .rollup(function (values) {
            // Return an array of all artists' objects for this country
            return values;
        })
        .entries(data);

    console.log("nestedData", nestedData);


    var countryData = nestedData.map(entry => ({
        country: entry.key,
        artists_count: entry.value.length,
    }));

    console.log("countryData", countryData);

    // For each country i need to group by genre and count the number of artists
    var nestedData2 = d3.nest()
        .key(function (d) { return d.artist_country; })
        .key(function (d) { return d.artist_genre; })
        .entries(data);

    console.log("nestedData2", nestedData2);
    var genreData = nestedData2.map(countryEntry => ({
        country: countryEntry.key,
        genres: countryEntry.values.map(genreEntry => ({
            genre: genreEntry.key,
            artists_count: genreEntry.values.length,
        })),
    }));

    console.log("genreData", genreData);

    var hierarchicalData = {
        name: "Data to explore", // Root node
        children: countryData.map(function (d) {
            return {
                name: d.country, // Country name becomes the name of the child node
                value: d.artists_count, // Artist count becomes the value of the child node
                children: genreData.find(function (e) { return e.country == d.country; }).genres.map(function (f) {
                    return {
                        name: f.genre,
                        value: f.artists_count,
                        children: nestedData2.find(function (g) { return g.key == d.country; }).values.find(function (h) { return h.key == f.genre; }).values.map(function (i) {
                            return {
                                name: i.artist_name,
                                value: i.songs.length,
                                children: i.songs.map(function (j) {
                                    return {
                                        name: j.title,
                                        value: 1,
                                        album: j.Album,
                                    };
                                })
                            };
                        })
                    };
                })
            };
        })
    };

    console.log("hierarchicalData", hierarchicalData);

    return hierarchicalData;
}
