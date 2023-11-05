


const fullScreenWidth = window.innerWidth;
const fullScreenHeight = window.innerHeight;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // d3.schemeCategory10 est un ensemble prédéfini de 10 couleurs.

const countryToContinent = {
    'United States': 'North America', 'Croatia': 'Europe', 'Nigeria': 'Africa', 'United Kingdom': 'Europe', 'Denmark': 'Europe',
    'Germany': 'Europe', 'Kenya': 'Africa', 'Australia': 'Oceania', 'Dominican Republic': 'North America', 'Turkey': 'Europe',
    'United States/Canada': 'North America', 'Japan': 'Asia', 'Austria': 'Europe', 'Finlande': 'Europe', 'Sweden': 'Europe',
    'Finland': 'Europe', 'Netherlands': 'Europe', 'South Korea': 'Asia', 'Brazil': 'South America', 'Romania': 'Europe',
    'Ukraine': 'Europe', 'South Africa': 'Africa', 'Italy': 'Europe', 'Mexico': 'North America', 'Serbia': 'Europe',
    'Norway': 'Europe', 'Canada': 'North America', 'Poland': 'Europe', 'Spain': 'Europe', 'Portugal': 'Europe',
    'Indonesia': 'Asia', 'France': 'Europe', 'Slovakia': 'Europe', 'Slovenia': 'Europe'
};


const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "8px")
        .style("border", "1px solid #000")
        .style("border-radius", "5px")
        .style("visibility", "hidden");


function createCountryTable(data) {
    const countryCounts = d3.rollups(data, v => v.length, d => d.artist_country);

    const table = d3.select("body").append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    thead.append("tr")
        .selectAll("th")
        .data(["Pays", "Nombre d'artistes"])
        .enter()
        .append("th")
        .text(d => d);

    const rows = tbody.selectAll("tr")
        .data(countryCounts)
        .enter()
        .append("tr")
        .on("click", function(event, d) {
            d3.selectAll("table").remove();
            createGenreCircularBarPlot(data, d[0]);
        });

    rows.selectAll("td")
        .data(d => d)
        .enter()
        .append("td")
        .text(d => d);
}


function createCircularBarPlot(data) {
    if (d3.select("#viewToggle").property("checked")) {
        createCountryTable(data);  // Cette fonction doit être définie pour créer le tableau
    } else {
        const width = fullScreenWidth;
        const height = fullScreenHeight;
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const innerRadius = 100;
        const outerRadius = Math.min(width, height) / 2 - margin.left;

        const countryCounts = d3.rollups(data, v => v.length, d => d.artist_country);
        const maxCount = d3.max(countryCounts, d => d[1]);

        const x = d3.scaleBand()
            .domain(countryCounts.map(d => d[0]))
            .range([0, 2 * Math.PI])
            .align(0);

        const y = d3.scaleRadial()
            .domain([0, maxCount])
            .range([innerRadius, outerRadius]);

        const svg = d3.select("body")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        svg.append("g")
            .selectAll("path")
            .data(countryCounts)
            .enter()
            .append("path")
            .attr("fill", "#69b3a2")
            .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(innerRadius)  // Commencer avec le rayon intérieur
                .startAngle(d => x(d[0]))
                .endAngle(d => x(d[0]) + x.bandwidth())
                .padAngle(0.01)
                .padRadius(innerRadius))
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .text(d[0] + ": " + d[1] + " artistes");
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            })
            .on("click", function(event, d) {
                tooltip.style("visibility", "hidden");
                d3.selectAll("svg").remove();
                createGenreCircularBarPlot(data, d[0]);
            })
            .transition()  // Ajout de la transition
            .duration(1000)  // Durée de l'animation en millisecondes
            .attrTween("d", function(d) {
                const i = d3.interpolate(innerRadius, y(d[1]));
                return function(t) {
                    return d3.arc()
                        .innerRadius(innerRadius)
                        .outerRadius(i(t))
                        .startAngle(x(d[0]))
                        .endAngle(x(d[0]) + x.bandwidth())
                        .padAngle(0.01)
                        .padRadius(innerRadius)();
                };
            });

        svg.append("g")
            .selectAll("g")
            .data(countryCounts)
            .enter()
            .append("g")
            .attr("text-anchor", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("transform", d => `rotate(${((x(d[0]) + x.bandwidth() / 2) * 180 / Math.PI - 90)})translate(${y(d[1]) + 10},0)`)
            .append("text")
            .text(d => d[0])
            .attr("transform", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)")
            .style("font-size", "15px")
            .attr("alignment-baseline", "middle");

        d3.select("#resetButton")
            .on("click", function() {
                tooltip.style("visibility", "hidden");  // Cache le tooltip
                d3.selectAll("svg").remove();   // Supprime tous les SVG existants
                createCircularBarPlot(data);   // Recrée le graphique initial
            });
    }
}


function createGenreTable(data, country) {
    const filteredData = data.filter(d => d.artist_country === country);
    const genreCounts = d3.rollups(filteredData, v => v.length, d => d.music_genre);

    const table = d3.select("body").append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    thead.append("tr")
        .selectAll("th")
        .data(["Genre musical", "Nombre d'artistes"])
        .enter()
        .append("th")
        .text(d => d);

    const rows = tbody.selectAll("tr")
        .data(genreCounts)
        .enter()
        .append("tr")
        .on("click", function(event, d) {
            d3.selectAll("table").remove();
            createActivityPeriodTable(data, country, d[0]);
        });

    rows.selectAll("td")
        .data(d => d)
        .enter()
        .append("td")
        .text(d => d);
}

function createActivityPeriodTable(data, country, genre) {
    const filteredData = data.filter(d => d.artist_country === country && d.music_genre === genre);
    const periodCounts = d3.rollups(filteredData, v => v.length, d => d.activity_period);

    const table = d3.select("body").append("table");
    const thead = table.append("thead");
    const tbody = table.append("tbody");

    thead.append("tr")
        .selectAll("th")
        .data(["Période d'activité", "Nombre d'artistes"])
        .enter()
        .append("th")
        .text(d => d);

    const rows = tbody.selectAll("tr")
        .data(periodCounts)
        .enter()
        .append("tr");

    rows.selectAll("td")
        .data(d => d)
        .enter()
        .append("td")
        .text(d => d);
}


function createGenreCircularBarPlot(data, country) {
    if (d3.select("#viewToggle").property("checked")) {
        createGenreTable(data, country);  // Cette fonction doit être définie pour créer le tableau
    } else {
        const width = fullScreenWidth;
        const height = fullScreenHeight;
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const innerRadius = 100;
        const outerRadius = Math.min(width, height) / 2 - margin.left;

        const filteredData = data.filter(d => d.artist_country === country);
        const genreCounts = d3.rollups(filteredData, v => v.length, d => d.artist_genre);
        const maxCount = d3.max(genreCounts, d => d[1]);

        const x = d3.scaleBand()
            .domain(genreCounts.map(d => d[0]))
            .range([0, 2 * Math.PI])
            .align(0);

        const y = d3.scaleRadial()
            .domain([0, maxCount])
            .range([innerRadius, outerRadius]);

        const svg = d3.select("body")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "8px")
            .style("border", "1px solid #000")
            .style("border-radius", "5px")
            .style("visibility", "hidden");

        svg.append("g")
            .selectAll("path")
            .data(genreCounts)
            .enter()
            .append("path")
            .attr("fill", "#9370DB")
            .attr("d", d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(innerRadius)  // Commencer avec le rayon intérieur
                .startAngle(d => x(d[0]))
                .endAngle(d => x(d[0]) + x.bandwidth())
                .padAngle(0.01)
                .padRadius(innerRadius))
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .text(d[0] + ": " + d[1] + " artistes");
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            })
            .on("click", function(event, d) {
                tooltip.style("visibility", "hidden");
                d3.selectAll("svg").remove();
                createActivityPeriodCircularBarPlot(data, country, d[0]);
            })
            .transition()
            .duration(1000)
            .attrTween("d", function(d) {
                const i = d3.interpolate(innerRadius, y(d[1]));
                return function(t) {
                    return d3.arc()
                        .innerRadius(innerRadius)
                        .outerRadius(i(t))
                        .startAngle(x(d[0]))
                        .endAngle(x(d[0]) + x.bandwidth())
                        .padAngle(0.01)
                        .padRadius(innerRadius)();
                };
            });

        svg.append("g")
            .selectAll("g")
            .data(genreCounts)
            .enter()
            .append("g")
            .attr("text-anchor", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("transform", d => `rotate(${((x(d[0]) + x.bandwidth() / 2) * 180 / Math.PI - 90)})translate(${y(d[1]) + 10},0)`)
            .append("text")
            .text(d => d[0])
            .attr("transform", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)")
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");
    }
}


function categorizeActivityPeriod(period) {
    if (period < 5) return "Moins de 5 ans";
    if (period >= 5 && period <= 10) return "5-10 ans";
    if (period > 10 && period <= 20) return "10-20 ans";
    return "Plus de 20 ans";
}


function createActivityPeriodCircularBarPlot(data, country, genre) {
    if (d3.select("#viewToggle").property("checked")) {
        createActivityPeriodTable(data, country, genre);  // Cette fonction doit être définie pour créer le tableau
    } else {
    const width = fullScreenWidth;
    const height = fullScreenHeight;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const innerRadius = 100;
    const outerRadius = Math.min(width, height) / 2 - margin.left;

    const filteredData = data.filter(d => d.artist_country === country && d.artist_genre === genre);
    const activityPeriodCounts = d3.rollups(filteredData, v => v.length, d => categorizeActivityPeriod(d.activity_period));
    const maxCount = d3.max(activityPeriodCounts, d => d[1]);

    const x = d3.scaleBand()
        .domain(activityPeriodCounts.map(d => d[0]))
        .range([0, 2 * Math.PI])
        .align(0);

    const y = d3.scaleRadial()
        .domain([0, maxCount])
        .range([innerRadius, outerRadius]);

    const svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    svg.append("g")
        .selectAll("path")
        .data(activityPeriodCounts)
        .enter()
        .append("path")
        .attr("fill", "#FF6347") // couleur différente pour ce graphique
        .attr("d", d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(d => y(d[1]))
            .startAngle(d => x(d[0]))
            .endAngle(d => x(d[0]) + x.bandwidth())
            .padAngle(0.01)
            .padRadius(innerRadius))
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
                .text(d[0] + ": " + d[1] + " artistes");
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    svg.append("g")
        .selectAll("g")
        .data(activityPeriodCounts)
        .enter()
        .append("g")
        .attr("text-anchor", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
        .attr("transform", d => `rotate(${((x(d[0]) + x.bandwidth() / 2) * 180 / Math.PI - 90)})translate(${y(d[1]) + 10},0)`)
        .append("text")
        .text(d => d[0])
        .attr("transform", d => (x(d[0]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "rotate(180)" : "rotate(0)")
        .style("font-size", "15px")
        .attr("alignment-baseline", "middle");
}
}





d3.json("/data/wasabi_data_modified3.json").then(data => {
    const continents = ["Tous", "North America", "Europe", "Africa", "Asia", "Oceania", "South America"];

    const select = d3.select("body")
        .append("select")
        .attr("id", "continentSelect")
        .on("change", function() {
            const selectedContinent = d3.select("#continentSelect").node().value;
            const filteredData = selectedContinent === "Tous" ? data : data.filter(d => countryToContinent[d.artist_country] === selectedContinent);
            d3.selectAll("svg").remove();
            createCircularBarPlot(filteredData);
        });

    select.selectAll("option")
        .data(continents)
        .enter()
        .append("option")
        .text(d => d);


    d3.select("body").append("input")
    .attr("type", "checkbox")
    .attr("id", "viewToggle")
    .on("change", function() {
        d3.selectAll("svg").remove();
        d3.selectAll("table").remove();
        createCircularBarPlot(data);  // On redémarre la visualisation à chaque fois qu'on coche/décoche
    });

    d3.select("body").append("label")
        .attr("for", "viewToggle")
        .text("Afficher sous forme de tableau");


    console.log(data);
    createCircularBarPlot(data);
});
  



