(function() {
	var map = window.map = {
		formatDate: d3.time.format("%b %Y"),
		parseDate: d3.time.format("%m/%d/%Y").parse,

		init: function(adm1,adm2,countries, incidents, displaced, accessible){
			//get centroids of adm for refuguee points

			map.refugeeLocations = {};

			adm1.features.forEach(function(f){
				var minx = d3.min(f.geometry.coordinates[0],function(d){return d[0]});
				var maxx = d3.max(f.geometry.coordinates[0],function(d){return d[0]});
				var miny = d3.min(f.geometry.coordinates[0],function(d){return d[1]});
				var maxy = d3.max(f.geometry.coordinates[0],function(d){return d[1]});
				map.refugeeLocations[f.properties.Rowcacode1] = [(minx+maxx)/2,(miny+maxy)/2];
			});

			//incident points with date filter

			map.incidents = crossfilter(incidents);
			map.incidentsDim = map.incidents.dimension(function(d) { return d['#date']; });

			//idp and refugee data with date filter and grouping by adm1
			map.displaced = crossfilter(displaced);
			map.displacedDim = map.displaced.dimension(function(d) { return d['#date']; });
			map.refugeeGroup = map.displaced.dimension(function(d) { return d['#adm1+code']; }).group().reduceSum(function(d){return d['#affected+refugees']});
			map.idpsGroup = map.displaced.dimension(function(d) { return d['#adm1+code']; }).group().reduceSum(function(d){return d['#affected+idps']});

			//accessibility data with date filter
			map.access = crossfilter(accessible);
			map.accessDim = map.access.dimension(function(d){return d['#date']});

			//get min and max of date range
    		map.minDate = d3.min(displaced,function(d){return (d['#date']);});
    		map.maxDate = d3.max(displaced,function(d){return (d['#date']);});

		    //create timeline slider
		    map.createTimeline(map.minDate);

			var width = $('#map').width();
			var height = 450;
			var svg = d3.select('#map').append('svg')
	        	.attr('width', width)
	        	.attr('height', height)

		    map.projection = d3.geo.mercator()
		        .center([13, 13])
		        .scale(width*5)
		        .translate([width / 2, height / 2]);    

		    var g = svg.append('g');

		    g.selectAll('path')
		     	.data(countries.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','country')
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',1)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.CNTRY_NAME;
		      	});

		    var g = svg.append('g');

		    g.selectAll('path')
		     	.data(adm1.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','adm1')
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',1)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.Rowcacode1;
		      	});

			var g = svg.append('g');

		    g.selectAll('path')
		     	.data(adm2.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','adm2')
		      	.attr('fill-opacity',0)
		      	.attr('stroke-opacity',0)
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',1)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.Rowcacode2;
		      	});

		    var g = svg.append('g').attr('id','incidentslayer');

		    var g = svg.append('g').attr('id','refugeeslayer');

		    //load data for a particular date

		    //map.update(new Date(2016,1,29));
		    //map.update(new Date(2016,2,21));
		    map.update(new Date(2016,3,6));
		},

		createTimeline: function(date){
			// parameters
			var margin = {
			    top: 20,
			    right: 25,
			    bottom: 20,
			    left: 25
			},
			width = $('#map').width() - margin.left - margin.right,
			height = 80 - margin.bottom - margin.top;

			// scale function
			map.timeScale = d3.time.scale()
			  	.domain([new Date(map.minDate), new Date(map.maxDate)])
			  	.range([0, width])
			  	.clamp(true);

			var startValue = map.timeScale(date);
			startingValue = date;

			map.brush = d3.svg.brush()
			  	.x(map.timeScale)
			  	.extent([startingValue, startingValue])
			  	.on('brush', map.brushed);

			var svg = d3.select('#map').append('svg')
			  	.attr('width', width + margin.left + margin.right)
			  	.attr('height', height + margin.top + margin.bottom)
			  	.append('g')
			  	.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

			svg.append('g')
				.attr('class', 'x axis')
				.attr('transform', 'translate(0,' + height / 2 + ')')
				.call(d3.svg.axis()
			  	.scale(map.timeScale)
			  	.orient('bottom')
			  	.tickFormat(function(d) { return map.formatDate(d); })
			  	.tickSize(0)
			  	.tickPadding(12)
			  	.tickValues([map.timeScale.domain()[0], map.timeScale.domain()[1]]))
			  	.select('.domain')
			  	.select(function() {
			    	return this.parentNode.appendChild(this.cloneNode(true));
			  	})
			  	.attr('class', 'halo');

			var slider = svg.append('g')
			  	.attr('class', 'slider')
			  	.call(map.brush);

			slider.selectAll('.extent,.resize')
			  	.remove();

			slider.select('.background')
			  	.attr('height', height);

			map.handle = slider.append('g')
			  	.attr('class', 'handle')

			map.handle.append("path")
			  	.attr('transform', 'translate(0,' + height / 2 + ')')
			  	.attr('d', 'M 0 -10 V 10')

			map.handle.append('text')
			  	.text(startingValue)
			  	.attr('transform', 'translate(' + (-18) + ' ,' + (height / 2 - 15) + ')');

			slider
			  	.call(map.brush.event)
		},

		brushed: function(){
			var value = map.brush.extent()[0];
			if (d3.event.sourceEvent) {
				value = map.timeScale.invert(d3.mouse(this)[0]);
				map.brush.extent([value, value]);
			}
			map.handle.attr('transform', 'translate(' + map.timeScale(value) + ',0)');
			map.handle.select('text').text(map.formatDate(value));
			console.log(value);
			map.update(value);
		},

		// all update functions
		update: function (date){
			map.updateIncidents(date);
			map.updateRefugees(date);
			map.updateIDPs(date);
			map.updateAccessiblity(date);
		},

		updateIncidents: function(date){
			map.incidentsDim.filter();

			var datefilter = new Date(date.getFullYear(),date.getMonth(),1);

			var data = map.incidentsDim.filter(datefilter).top(Infinity);
		
			d3.select('#incidentslayer').selectAll('.incidents').remove();
			
			var circles = d3.select('#incidentslayer').selectAll('circle')
				.data(data).enter()
				.append('circle')
				.attr('cx',function(d){
					return map.projection([d['#geo+lng'],d['#geo+lat']])[0];
				})
				.attr('cy',function(d){
					return map.projection([d['#geo+lng'],d['#geo+lat']])[1];
				})
			    .attr('r', 4)
			    .attr('opacity',0)
			    .attr('fill','#FF9B00')
			    .attr('class','incidents');

			circles.transition().attr('opacity',0.5);
		},

		updateRefugees: function(date){
			map.displacedDim.filter();
			map.displacedDim.filter(date);

			var data = map.refugeeGroup.top(Infinity);

			var fulldata = [];

			data.forEach(function(d){
				if(d.value>0){
					d['coords'] = map.refugeeLocations[d.key];
					if(d['coords']==undefined){
						console.log(d.key + ' not found in geo file');
					} else {
						fulldata.push(d);
					}
					
				}
			});
			//some locations not matching the geo file

			d3.select('#refugeeslayer').selectAll('.refugees').remove();

			rscale = d3.scale.linear()
		        .domain([1, 100000])
		        .range([2, 20]);
			
			var circles = d3.select('#refugeeslayer').selectAll('circle')
				.data(fulldata).enter()
				.append('circle')
				.attr('cx',function(d){
					return map.projection(d.coords)[0];
				})
				.attr('cy',function(d){
					return map.projection(d.coords)[1];
				})
			    .attr('r', function(d){
			    	return rscale(d.value);
			    })
			    .attr('opacity',0)
			    .attr('fill','#4CAF50')
			    .attr('class','refugees');

			circles.transition().attr('opacity',0.7);
		},

		updateIDPs: function(date){
			d3.selectAll('.adm1').attr('fill','#f1eef6');
			var colors = ['#f1eef6','#d0d1e6','#a6bddb','#74a9cf','#3690c0'];
			var labels = [1000,10000,100000,1000000]
			map.displacedDim.filter();
			map.displacedDim.filter(date);
			var data = map.idpsGroup.top(Infinity);

			data.forEach(function(d){
				if(d.value>0){
					d3.select('#'+d.key).attr('fill',function(){
						var count = 0;
						labels.forEach(function(l){
							if(l<d.value){
								count++;
							}
						});
						return colors[count];
					});
				}
			});
		},

		updateAccessiblity: function(date){
			d3.selectAll('.adm2').attr('stroke','#cccccc').attr('stroke-opacity',0);
			map.accessDim.filter();
			var data = map.accessDim.filter(date).top(Infinity);
			//comment out when pcodes introduced
			console.log(data);
			data.forEach(function(d){
				d3.select('#'+d['#adm2+code'])
					.attr('stroke',function(){
						if(d['#status']=='Accessible with restriction'){
							return '#FF9B00';
						} else if (d['#status']=='Not Accesible') {
							return '#FF0000';
						}
					}).attr('stroke-opacity',1);
			});

		}		
	}
})();