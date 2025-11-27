var width, height, svg, mapLayer, projection, path, zoom;
var groupedData = new Map();
const BD_COORDS = [90.3563, 23.6850]; // Bangladesh center
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip-map")
    .style("opacity", 0);

function initMap() {
    const container = document.getElementById("map");
    width = container.clientWidth;
    height = 600;

    svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    projection = d3.geoMercator()
        .scale(120)
        .center([20, 20]) 
        .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);

    mapLayer = svg.append("g").attr("class", "map-layer");

    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    svg.call(zoom);
}

function zoomed(event) {
    mapLayer.attr("transform", event.transform);
}

// Arc between BD → DESTINATION
function createArc(sourceLonLat, targetLonLat) {
    const [sx, sy] = projection(sourceLonLat);
    const [tx, ty] = projection(targetLonLat);

    const dx = tx - sx;
    const dy = ty - sy;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.25;

    return `M${sx},${sy} A${dr},${dr} 0 0,1 ${tx},${ty}`;
}

// Per year
function render(selectedYear) {
    mapLayer.selectAll(".migration-arc").remove();

    const rows = groupedData.get(selectedYear) || [];

    rows.forEach(row => {
        const dest = [row.longitude, row.latitude];
        const arcD = createArc(BD_COORDS, dest);

        const arc = mapLayer.append("path")
            .attr("class", "migration-arc")
            .attr("d", arcD)
            .style("fill", "none")
            .style("stroke", "crimson")
            .style("opacity", 0.8)
            .style("stroke-width", Math.sqrt(row.num_of_people) / 200)
            .attr("stroke-dasharray", function() { return this.getTotalLength(); })
            .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
            .on("mouseover", (event) => {
                tooltip.transition().duration(150).style("opacity", 0.95);
                tooltip.html(
                    `<strong>${row.country}</strong><br/>
                     Migrants: ${row.num_of_people}`
                )
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(200).style("opacity", 0);
            });

        // Animate arc drawing
        arc.transition()
            .duration(1200)
            .attr("stroke-dashoffset", 0);
    });
}

Promise.all([
    d3.json("resources/style/WorldMap.json"),
    d3.csv("resources/style/ImmigrationRoutes.csv", d => ({
        country: d.country,
        year: +d.year,
        gender: d.gender,
        num_of_people: +d.num_of_people,
        latitude: +d.latitude,
        longitude: +d.longitude
    }))
]).then(([world, data]) => {

    initMap();

    // Draw world map
    mapLayer.selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("class", "world")
        .attr("d", path)
        .style("fill", "#e8e8e8")
        .style("stroke", "#999")
        .style("stroke-width", 0.5);

    // Group by year
    groupedData = d3.group(data, d => d.year);

    // Dropdown
    const years = Array.from(groupedData.keys()).sort();
    const selector = d3.select("#yearSelector");
    selector.selectAll("option")
        .data(years)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
    render(years[0]);

    // Update map on change
    selector.on("change", function() {
        const year = +this.value;
        render(year);
    });
});
