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
    .translate([mapWidth / 3, mapHeight / 2]);

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
var jobsJson = "resources/styles/OccupationBreakdown.json";

/***** Miscellaneous Variable Definitions *****/
var tooltip = d3.select(".map")
    .append('tooltip')
    .attr('class', 'tooltip')
    .style('opacity', 0);

// Colors for the legend
var legendColor = d3.scaleLinear()
    .range(['rgb(0,0,255)','rgb(255,255,0)']);

d3.json(worldMapJson, function(error, countries) {
	d3.json(populationsJson, function(error, populations) {
		if (error) throw error;
		let year = 2016;
		let mapG = svg.append('g');
		let map = svg.append('g');
        var config = {};

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

		d3.csv("resources/style/BDLatLon.csv", function(error,bd) {
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

            var fields = years;

            var option_select = d3.select('#selectors')
                 .append("select")
                 .attr("class", "option-select");

            for (var i = 0; i < fields.length; i++) {
                if (fields[i] !== config.state) {
                  var opt = option_select.append("option")
                    .attr("value", fields[i])
                    .text(fields[i]);

                  if (fields[i] === config.defaultValue) {
                    opt.attr("selected", "true");
                  }
                }
            };

            option_select.on('change', function() {
                render(+d3.select('select').property('value'));
            });

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
						.attr("cx", projection([data[i].longitude, data[i].latitude])[0])
						.attr("cy", projection([data[i].longitude, data[i].latitude])[1])
		    			.attr("r", (Math.sqrt(data[i]['num_of_people']))/15)
						.style("fill", "red");
				}

				let causeArr = causeArr2.find(d => +d.time === year);
			}
			render(2017);
		});
		});

        //Male Chord Diagram
        d3.csv('resources/styles/male.csv', function(error, data) {
            mpr = chordMpr(data);
            mpr.addValuesToMap('root')
            .addValuesToMap('node')
            .setFilter(function(row, a, b) {
                return (row.root === a.name && row.node === b.name)
            })
            .setAccessor(function(recs, a, b) {
                if (!recs[0]) return 0;
                return +recs[0].count;
            });
            drawChords(mpr.getMatrix(), mpr.getMap());
        });

        function drawChords(matrix, mmap) {
            var w = 680,
                h = 600,
                r1 = h / 3,
                r0 = r1 - 10;

            var chord = d3.chord()
                .padAngle(0.05)
                .sortSubgroups(d3.descending)
                .sortChords(d3.descending);

            var arc = d3.arc()
                .innerRadius(r0)
                .outerRadius(r0 + 20);

            var ribbon = d3.ribbon()
                .radius(r0);

            var svg = d3.select(".chordM").append("svg:svg")
                        .attr("width", w)
                        .attr("height", h)
                        .append("svg:g")
                        .attr("id", "circle")
                        .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")")
                        .datum(chord(matrix));

            svg.append("circle")
               .attr("r", r0 + 20);

            var mapReader = chordRdr(matrix, mmap);
            var g = svg.selectAll("g.group")
                .data(function(chords) {
                    return chords.groups;
                })
                .enter().append("svg:g")
                .attr("class", "group")

            g.append("svg:path")
                .style("stroke", "grey")
                .style("fill", function(d) {
                            return mapReader(d).gdata;
                        })
                        .attr("d", arc);

            g.append("svg:text")
            .each(function(d) {
                d.angle = (d.startAngle + d.endAngle) / 2;
            })
            .attr("dy", ".35em")
            .style("font-family", "helvetica, arial, sans-serif")
            .style("font-size", "9px")
            .attr("text-anchor", function(d) {
                            return d.angle > Math.PI ? "end" : null;
            })
            .attr("transform", function(d) {
                            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                                "translate(" + (r0 + 26) + ")" +
                                (d.angle > Math.PI ? "rotate(180)" : "");
                        })
            .text(function(d) {
                            return mapReader(d).gname;
                        });

            var colors = d3.scaleOrdinal(d3.schemeCategory20c);
            var chordPaths = svg.selectAll("path.chord")
                .data(function(chords) {
                    return chords;
                })
                .enter().append("svg:path")
                .attr("class", "chord")
                .style("stroke", "grey")
                .style("fill", function(d, i) {
                    return colors(i)
                })
                .attr("d", ribbon.radius(r0))
        }

        //Female Chord Diagram
        d3.csv('resources/styles/female.csv', function(error, data) {
            fmpr = chordMpr(data);
            fmpr.addValuesToMap('root')
            .addValuesToMap('node')
            .setFilter(function(row, a, b) {
                return (row.root === a.name && row.node === b.name)
            })
            .setAccessor(function(recs, a, b) {
                if (!recs[0]) return 0;
                return +recs[0].count;
            });
            drawFemaleChords(fmpr.getMatrix(), fmpr.getMap());
        });

        function drawFemaleChords(matrix, mmap) {
            var w = 680,
                h = 600,
                r1 = h / 3,
                r0 = r1 - 10;

            var chord = d3.chord()
                .padAngle(0.05)
                .sortSubgroups(d3.descending)
                .sortChords(d3.descending);

            var arc = d3.arc()
                .innerRadius(r0)
                .outerRadius(r0 + 20);

            var ribbon = d3.ribbon()
                .radius(r0);

            var svg = d3.select(".chordF").append("svg:svg")
                        .attr("width", w)
                        .attr("height", h)
                        .append("svg:g")
                        .attr("id", "circle")
                        .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")")
                        .datum(chord(matrix));

            svg.append("circle")
               .attr("r", r0 + 20);

            var mapReader = chordRdr(matrix, mmap);
            var g = svg.selectAll("g.group")
                .data(function(chords) {
                    return chords.groups;
                })
                .enter().append("svg:g")
                .attr("class", "group")

            g.append("svg:path")
                .style("stroke", "grey")
                .style("fill", function(d) {
                            return mapReader(d).gdata;
                        })
                        .attr("d", arc);

            g.append("svg:text")
            .each(function(d) {
                d.angle = (d.startAngle + d.endAngle) / 2;
            })
            .attr("dy", ".35em")
            .style("font-family", "helvetica, arial, sans-serif")
            .style("font-size", "9px")
            .attr("text-anchor", function(d) {
                            return d.angle > Math.PI ? "end" : null;
            })
            .attr("transform", function(d) {
                            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                                "translate(" + (r0 + 26) + ")" +
                                (d.angle > Math.PI ? "rotate(180)" : "");
                        })
            .text(function(d) {
                            return mapReader(d).gname;
                        });

            var colors = d3.scaleOrdinal(d3.schemeCategory20c);
            var chordPaths = svg.selectAll("path.chord")
                .data(function(chords) {
                    return chords;
                })
                .enter().append("svg:path")
                .attr("class", "chord")
                .style("stroke", "grey")
                .style("fill", function(d, i) {
                    return colors(i)
                })
                .attr("d", ribbon.radius(r0))
        }
	});
});
