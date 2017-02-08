(function() {
	var map = window.map = {
		SVG: '',
		ZOOM: '',

		init: function(adm1,adm2,countries, incidents, displaced, accessible){

			//get centroids of adm for refuguee points

			map.refugeeLocations = {};

			adm1.features.forEach(function(f){
				var minx = d3.min(f.geometry.coordinates[0],function(d){return d[0]});
				var maxx = d3.max(f.geometry.coordinates[0],function(d){return d[0]});
				var miny = d3.min(f.geometry.coordinates[0],function(d){return d[1]});
				var maxy = d3.max(f.geometry.coordinates[0],function(d){return d[1]});
				map.refugeeLocations[f.properties.ADM1_NAME] = [(minx+maxx)/2,(miny+maxy)/2];
			});

			//incident points with date filter

			map.incidents = crossfilter(incidents);
			map.incidentsDim = map.incidents.dimension(function(d) { return d['#date']; });

			//idp and refugee data with date filter and grouping by adm1

			map.displaced = crossfilter(displaced);
			map.displacedDim = map.displaced.dimension(function(d) { return d['#date']; });
			map.refugeeGroup = map.displaced.dimension(function(d) { return d['#adm1']; }).group().reduceSum(function(d){return d['#affected+refugees']});
			map.idpsGroup = map.displaced.dimension(function(d) { return d['#adm1']; }).group().reduceSum(function(d){return d['#affected+idps']});

			//accessibility data with date filter
			map.access = crossfilter(accessible);
			map.accessDim = map.access.dimension(function(d){return d['#date']});


			var width = $('#map').width();
			var height = 450;
    		map.ZOOM = d3.behavior.zoom().scaleExtent([1, 8]).on('zoom', map.zoom);
			map.SVG = d3.select('#map').append('svg')
	        	.attr('width', width)
	        	.attr('height', height)
        		//.call(map.ZOOM);

		    map.projection = d3.geo.mercator()
		        .center([13, 13])
		        .scale(width*5)
		        .translate([width / 2, height / 2]);    

		    var g = map.SVG.append('g');

		    g.selectAll('path')
		     	.data(countries.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','country')
        		.attr('fill', '#ffffff')
        		.attr('stroke-wdith',1)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.CNTRY_NAME;
		      	});

		    var g = map.SVG.append('g');

		    g.selectAll('path')
		     	.data(adm1.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','adms')
        		.attr('fill', '#ffffff')
        		.attr('stroke-wdith',1)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.ADM1_NAME;
		      	});

		    var g = map.SVG.append('g').attr('id','incidentslayer');

		    var g = map.SVG.append('g').attr('id','refugeeslayer');

		    //load data for a particular date

		    //map.update(new Date(2016,1,29));
		    //map.update(new Date(2016,2,21));
		    map.update(new Date(2016,3,6));
		},

		zoom: function(){
			var g = d3.select('#map').select('svg').select('g');
		    g.attr('transform', 'translate(' + map.ZOOM.translate() + ') scale(' + map.ZOOM.scale() + ')');
		    g.selectAll('path').style('stroke-width', (map.ZOOM.scaleExtent()[1]/map.ZOOM.scale()) / 10);
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
			console.log(data);
			
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
			d3.selectAll('.adms').attr('fill','#f1eef6');
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
			d3.selectAll('.adms').attr('stroke','#cccccc');
			map.accessDim.filter();
			var data = map.accessDim.filter(new Date(2016,8,5)).top(Infinity);
			//comment out when pcodes introduced
			/*data.forEach(function(d){
				d3.select('#'+d['#adm1'])
					.attr('stroke',function(){
						if(d['#status']=='Accessible with restriction'){
							return '#FF9B00';
						} else if (d['#status']=='Not Accesible') {
							return '#FF0000';
						}
					});
			});*/

		}		
	}
})();