/* General Variable Definitions */
var margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
};

/***** World Map Variable Definitions *****/
var mapWidth = 1350,
    mapHeight = 800;

// Map sizing, numbers based on stylistic placement.
var projection = d3.geoMercator()
    .scale(150)
    .translate([mapWidth / 5, mapHeight / 3]);

var path = d3.geoPath()
    .pointRadius(2)
    .projection(projection);

// Draws the map
var svg = d3.select(".map")
    .append('svg')
    .attr('mapWidth', mapWidth + margin.left + margin.right)
    .attr('mapHeight', mapHeight + margin.top + margin.bottom)
    .attr('transform', 'translate(' + margin.left + "," + margin.top + ')');

var worldMapJson = "resources/styles/WorldMap.json";

var populationsJson = "resources/styles/Populations.json";

var timeAxisHeight = 20;

/***** Sunburst Variable Definitions *****/
var sunburstWidth = 760,
    sunburstHeight = 500,
    sunburstRadius = (Math.min(sunburstWidth, sunburstHeight) / 2) - 10;

var formatNumber = d3.format(",d");

var x = d3.scaleLinear()
    .range([0, 2 * Math.PI]);

var y = d3.scaleSqrt()
    .range([0, sunburstRadius]);

var color = d3.scaleOrdinal(d3.schemeCategory20);

var partition = d3.partition();

var arc = d3.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y1)); });

var svgSunburst = d3.select(".sunburst")
    .append("svg")
    .attr("sunburstWidth", sunburstWidth)
    .attr("sunburstHeight", sunburstHeight)
    .append("g")
    .attr("transform", "translate(" + sunburstWidth / 2 + "," + (sunburstHeight / 2) + ")");

var jobsJson = "resources/styles/OccupationBreakdown.json";

/***** Miscellaneous Variable Definitions *****/
var tooltip = d3.select(".map")
    .append('tooltip')
    .attr('class', 'tooltip')
    .style('opacity', 0);

// Colors for the legend
var legendColor = d3.scaleLinear()
    .range(['rgb(0,0,255)','rgb(255,255,0)']);

var legendText = ["Client Location", "Pop Location"];

d3.json(worldMapJson, function(error, countries) {
	d3.json(populationsJson, function(error, populations) {
		if (error) throw error;
		let year = 2016;
		let mapG = svg.append('g');
		let map = svg.append('g');

        //Map Styles
		mapG.selectAll("path")
			.data(countries.features)
			.enter().append("path")
			.attr("d", path)
			.style('fill','black')
			.style('stroke','white')
			.style('stroke-width','0.1');
		let trans = {};
		let zoom = d3.zoom()
			.scaleExtent([1, 8])
			.on("zoom", () => {
				trans["stroke-width"] = 1.5 / d3.event.transform.k + "px";
				trans["transform"] = d3.event.transform;
				mapG.style("stroke-width", trans["stroke-width"]);
				mapG.attr("transform", trans["transform"]);
				map.style("stroke-width", trans["stroke-width"]);
				map.attr("transform", trans["transform"]);
			});
		svg.call(zoom);

		d3.csv("resources/styles/ImmigrationRoutes.csv",row => {
				row.Year = +row.Year;
				row['num_of_people'] = +row['num_of_people']; return row;
		}, function(data) {
			let nestD = d3.nest().key(d => d.Year).entries(data);
			let nest_Cause = d3.nest()
				.key(d => d.Year).key(d => d['location']).entries(data);
			let causeArr2 = nest_Cause.map( c => {
				let obj = {};
				obj.time = c.key;
				let _n = c.values;
				obj.values = _n.map( d => {
					let _dd = {};
					_dd.cause = d.key;
					_dd.value = d3.sum(d.values,dd => dd['num_of_people']);
					return _dd;
				});
				return obj;
			});
			let color = d3.interpolateRainbow;
			let years = nestD.map(d => +d.key).sort();
			let scale = d3.scaleLinear().domain(d3.extent(years)).range([margin.left, mapWidth - margin.right]);
			let timeSvg = d3.select("#timeSvg");

            // Timeline line
			timeSvg.append('g').append('line')
				.attr('x1', 0)
				.attr('y1', timeAxisHeight)
				.attr('x2', mapWidth)
				.attr('y2', timeAxisHeight)
				.attr('stroke', "5,5")
				.attr('stroke', '#000');

			// Timeline Circles
			timeSvg.append('g')
				.selectAll('.year')
				.data(years).enter()
				.append('circle')
				.attr('class', 'year')
				.attr('cx', d => scale(d))
				.attr('cy', timeAxisHeight)
				.attr('year', d => d)
				.attr('r', 8)
				.style('fill', 'url(#grad1)')
				.style('fill-opacity', 1)
				.on('mouseover', function () {
					d3.select(this).style('fill', 'url(#grad2)');
				})
				.on('mouseout', function () {
					let target = d3.select(this);
					if(target.attr('flag') !== 'click') {
						target.style('fill', 'url(#grad1)');
					}
				})
				.on('click',function () {
					let target = d3.select(this);
					d3.selectAll('.year').style('fill', 'url(#grad1)').attr('flag', '');
					target.attr('flag', 'click');
					target.style('fill', 'url(#grad2)');
					year = +target.attr('year');
					render(year);
				});

            // Timeline Year
			timeSvg.append('g')
				.selectAll('text')
				.data(years).enter()
				.append('text')
				.attr('x', d => scale(d))
				.attr('y', timeAxisHeight + 20)
				.text(d => d)
				.style('text-anchor', 'middle');

			function render(year,cause) {
				map.remove();
				map = svg.append('g');
                map.style("stroke-width", trans["stroke-width"]);
				map.attr("transform", trans["transform"]);
				let data = nestD.find(n => +n.key === year);
				if(!data) return;
				data = data.values;

				if(cause) {
					data = data.filter(d=>d['location'] === cause);
				}
				for(let i = 0; i < data.length; i ++) {
					map.append("circle")
						.attr("cx", projection([data[i].longitude,data[i].latitude])[0])
						.attr("cy", projection([data[i].longitude,data[i].latitude])[1])
		    			.attr("r", (Math.sqrt(data[i]['num_of_people']))/15)
						.style("fill", "red");
				}

				let causeArr = causeArr2.find(d => +d.time === year);
			}
			render(2016);
		});

        // Sunburst Diagram
        d3.json(jobsJson, function(error, root) {
            if (error) throw error;

            root = d3.hierarchy(root);
            root.sum(function(d) { return d.size; });
            svgSunburst.selectAll("path")
                .data(partition(root).descendants())
                .enter().append("path")
                .attr("d", arc)
                .style("fill", function(d) { return color((d.children ? d : d.parent).data.name); })
                .on("click", click)
                .append("title")
                .text(function(d) { return d.data.name + "\n" + formatNumber(d.value); });
        });

        function click(d) {
            svgSunburst.transition()
                .duration(750)
                .tween("scale", function() {
                    var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
                        yd = d3.interpolate(y.domain(), [d.y0, 1]),
                        yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, sunburstRadius]);
                    return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
                })
            .selectAll("path")
            .attrTween("d", function(d) { return function() { return arc(d); }; });
        }

        d3.select(self.frameElement).style("sunburstHeight", sunburstHeight + "px");
	});
});
