(function() {
	var map = window.map = {
		formatDate: d3.time.format("%d %b %Y"),
		parseDate: d3.time.format("%m/%d/%Y").parse,
		snapshotID: 0,
		isAnimating: false,
		animationInterval: 800,
		incidentsColor: '#FF9B00',
		refugeesColor: '#4CAF50',
		displacedColors: ['#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5'],
		displacedRange: [1000,10000,100000,1000000],

		init: function(adm1,adm2,countries, incidents, displaced, accessible,countrieslabel){
			//get centroids of adm for refuguee points
			map.refugeeLocations = {};
			map.names = {};
			adm1.features.forEach(function(f){
				var minx = d3.min(f.geometry.coordinates[0],function(d){return d[0]});
				var maxx = d3.max(f.geometry.coordinates[0],function(d){return d[0]});
				var miny = d3.min(f.geometry.coordinates[0],function(d){return d[1]});
				var maxy = d3.max(f.geometry.coordinates[0],function(d){return d[1]});
				map.refugeeLocations[f.properties.Rowcacode1] = [(minx+maxx)/2,(miny+maxy)/2];
				map.names[f.properties.Rowcacode1] = f.properties.ADM1_NAME
			});

			//incident points with date filter

			map.incidents = crossfilter(incidents);
			map.incidentsDim = map.incidents.dimension(function(d) { return d['#date']; });

			//idp and refugee data with date filter and grouping by adm1
			map.displaced = crossfilter(displaced);
			map.displacedDim = map.displaced.dimension(function(d) { return d['#date']; });
			map.refugeeGroup = map.displaced.dimension(function(d) { return d['#adm1+code']; }).group().reduceSum(function(d){return d['#affected+refugees']});
			map.idpsGroup = map.displaced.dimension(function(d) { return d['#adm1+code']; }).group().reduceSum(function(d){return d['#affected+idps']});
			
			var date_sort = function (date1, date2) {
			  if (date1 > date2) return 1;
			  if (date1 < date2) return -1;
			  return 0;
			};

			map.dates = map.displacedDim.group().top(Infinity).map(function(d){return d.key}).sort(date_sort);

			//accessibility data with date filter
			map.access = crossfilter(accessible);
			map.accessDim = map.access.dimension(function(d){return d['#date']});

			//get min and max of date range
    		map.minDate = d3.min(displaced,function(d){return (d['#date']);});
    		map.maxDate = d3.max(displaced,function(d){return (d['#date']);});

			var width = $('#map').width();
			var height = 500;
			map.svg = d3.select('#map').append('svg')
	        	.attr('width', width)
	        	.attr('height', height)

		    map.projection = d3.geo.mercator()
		        .center([13, 13])
		        .scale(width*5)
		        .translate([width / 2, height / 2]);    

		    var g = map.svg.append('g');

		    g.selectAll('path')
		     	.data(countries.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','country')
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',2)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.NAME;
		      	});

		    //create country labels
		    var country = g.selectAll('text')
		        .data(countrieslabel).enter()
		        .append('text')
		        .attr('class', 'label')
		        .attr("transform", function(d) {
		          return "translate(" + map.projection([d.coordinates[0], d.coordinates[1]]) + ")";
		        })
		        .text(function(d){ return d.country; });

			var g = map.svg.append('g').attr('id','adm2layer');

		    g.selectAll('path')
		     	.data(adm2.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','adm2')
		      	.attr('fill-opacity',0)
		      	.attr('stroke-opacity',0)
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',2)
        		.attr('stroke','#cccccc')
		      	.attr('id',function(d){
		        	return d.properties.Rowcacode2;
		      	});

		    var g = map.svg.append('g').attr('id','adm1layer');

		    g.selectAll('path')
		     	.data(adm1.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(map.projection))
		      	.attr('class','adm1')
        		.attr('fill', '#ffffff')
        		.attr('stroke-width',2)
        		.attr('stroke','#aaaaaa')
		      	.attr('id',function(d){
		        	return d.properties.Rowcacode1;
		      	});

		    var g = map.svg.append('g').attr('id','incidentslayer');

		    var g = map.svg.append('g').attr('id','refugeeslayer');

		    //load data for a particular date

		    //map.update(new Date(2016,1,29));
		    //map.update(new Date(2016,2,21));
		    //map.update(new Date(2016,3,6));

		    //create timeline slider
		    map.createTimeline(map.minDate);
		    map.createLegend();

		    //animate button click handler
		    $('#animateBtn').on('click', function(){
		    	if (!map.isAnimating){
        			$(this).html('Pause animation');
        			map.isAnimating = true;
        			map.timer = setInterval(function(){ map.animate()}, map.animationInterval );
        		}
        		else {
        			map.resetAnimation(false);
        		}
		    })
		},

		animate: function(){
			if (map.snapshotID<map.dates.length-1){
				//get next snapshot date
				map.snapshotID++;
				var value = map.dates[map.snapshotID];

				//reposition slider handle
				map.handle.attr('transform', 'translate(' + map.timeScale(value) + ',0)');
				map.handle.select('text').text(map.formatDate(value));

				map.update(value);
			}
			else{
    			map.resetAnimation(true);
			}
		},

		resetAnimation: function(reset){
    		$('#animateBtn').html('Animate map');
    		$('#foodinsecureChart').data('c3-chart').tooltip.hide();
    		$('#displacedChart').data('c3-chart').tooltip.hide();
    		$('#incidentChart').data('c3-chart').tooltip.hide();
    		map.isAnimating = false;
    		if (reset) map.snapshotID = -1;
    		clearInterval(map.timer);
		},

		createTimeline: function(date){
			// parameters
			var margin = {
			    top: 0,
			    right: 40,
			    bottom: 10,
			    left: 30
			},
			width = $('#timeline').width() - margin.left - margin.right,
			height = 80 - margin.bottom - margin.top;

			// scale function
			map.timeScale = d3.time.scale()
			  	.domain([new Date(map.minDate),new Date(map.maxDate)])
			  	.range([0, width])
			  	.clamp(true);

			var startValue = map.timeScale(date);
			startingValue = date;

			map.brush = d3.svg.brush()
			  	.x(map.timeScale)
			  	.extent([startingValue, startingValue])
			  	.on('brushend', map.brushed);

			var svg = d3.select('#timeline').append('svg')
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
			  		.tickValues([map.timeScale.domain()[0], map.timeScale.domain()[1]])
			  	)
			  	.select('.domain')
			  	.select(function() {
			    	return this.parentNode.appendChild(this.cloneNode(true));
			  	})
			  	.attr('class', 'halo');

			 var ticks = d3.svg.axis()
			  		.scale(map.timeScale)
			  		.tickFormat('')
			  		.tickSize(10)
			  		.tickValues(map.dates);

			var axisTicks = svg.append('g')
				.attr('transform', 'translate(0,' + height / 2 + ')')
				.call(ticks);

			axisTicks.selectAll('path').attr('fill', 'none');

			axisTicks.selectAll('line').attr('stroke-width',1).attr('stroke','#999');

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
				value = map.nearestValue(value);
				map.brush.extent([value, value]);
			}
			map.handle.attr('transform', 'translate(' + map.timeScale(value) + ',0)');
			map.handle.select('text').text(map.formatDate(value));
			map.update(value);

			map.snapshotID = map.getSnapshotID(value);
		},

		nearestValue: function(date){
			var nearest = 0;
			map.dates.forEach(function(d,i){
				if(d<date){nearest=i}
			});
			var prev = map.dates[nearest];
			var next = map.dates[nearest+1];
			if(date-prev>next-date){
				date = next;
			} else {
				date = prev;
			}
			return date;
		},

		getSnapshotID: function(date){
			for (var i=0;i<map.dates.length;i++){
				if (date.getTime()==map.dates[i].getTime()){
					return i;
				}
			}
		},

		createLegend: function(){
			var keyWidth = $('#maplegend').width();
			var keyHeight = 25;
			var layers = [{id:'incidentslayer', name:'Incidents', color:map.incidentsColor}, 
						  {id:'refugeeslayer', name:'Refugees', color:map.refugeesColor}];
			
			//incidents
			$('#maplegend').append('<input type="checkbox" name="maplayer" id="incidentscheck" checked><label for="incidentscheck">Incidents</label><div id="incidentcircles"><svg width="'+keyWidth+'" height="'+keyHeight+'"><circle cx="30" cy="6" r="6" fill="'+map.incidentsColor+'" /></svg></div>');
        	$('#incidentscheck').change(function(e){
			 	if ($(e.target).is(':checked')) {
			 		$('#incidentslayer').attr('display', 'block')
			 	}
			 	else{
			 		$('#incidentslayer').attr('display', 'none')
			 	}
			});

        	//refugees
			$('#maplegend').append('<input type="checkbox" name="maplayer" id="refugeecheck" checked><label for="refugeecheck">Refugees</label><div id="refcircles"></div>')
		    $('#refugeecheck').change(function(e){
			 	if ($(e.target).is(':checked')) {
			 		$('#refugeeslayer').attr('display', 'block')
			 	}
			 	else{
			 		$('#refugeeslayer').attr('display', 'none')
			 	}
			});

			var refdata = [1000,10000,50000];

			var svg = d3.select('#refcircles').append('svg')
	        	.attr('width', keyWidth)
	        	.attr('height', keyHeight+10)

			svg.selectAll('circle')
				.data(refdata).enter()
				.append('circle')
				.attr('cx',function(d,i){
					return i*(50+map.rscale(d))+25
				})
				.attr('cy',function(d,i){
					return 15;
				})
			    .attr('r', function(d){
			    	return map.rscale(d);
			    })
			    .attr('fill', map.refugeesColor)

			svg.selectAll('text')
				.data(refdata).enter()
				.append('text')
				.attr('x', function(d,i) { return i*(50+map.rscale(d))+30+map.rscale(d); })
                .attr("y", function(d,i) { return 20; })
                .text( function (d) { return d; });

            //displaced
			$('#maplegend').append('<input type="checkbox" name="maplayer" id="displacedcheck" checked><label for="displacedcheck">Displaced</label><div id="displacedcircles"></div>')
		    $('#displacedcheck').change(function(e){
			 	if ($(e.target).is(':checked')) {
			 		map.updateIDPs(map.brush.extent()[0]);
			 	}
			 	else{
					d3.selectAll('.adm1').attr('fill','#f7fbff');
			 	}
			});


			var svggradient = d3.select('#maplegend').append('svg');
			var defs = svggradient.append("defs");
			var linearGradient = defs.append("linearGradient")
			    .attr("id", "linear-gradient");

			linearGradient
			    .attr("x1", "0%")
			    .attr("y1", "0%")
			    .attr("x2", "100%")
			    .attr("y2", "0%");

			var colorScale = d3.scale.linear()
			    .range(map.displacedColors);

			linearGradient.selectAll("stop") 
			    .data( colorScale.range() )                  
			    .enter().append("stop")
			    .attr("offset", function(d,i) { return i/(colorScale.range().length-1); })
			    .attr("stop-color", function(d) { return d; });

			svggradient.append("rect")
				.attr("width", $('#maplegend').width()-30)
				.attr("height", 20)
				.attr('x', 20)
				.style("fill", "url(#linear-gradient)");

			svggradient.append("text")
				.attr('x', 20)
				.attr('y', 35)
				.attr('class', 'small')
				.text( map.displacedRange[0] );

			svggradient.append("text")
				.attr('x', $('#maplegend').width()-50)
				.attr('y', 35)
				.attr('class', 'small')
				.text( map.displacedRange[map.displacedRange.length-1] );


            //accessibility
			// $('#maplegend').append('<input type="checkbox" name="maplayer" id="accessibilitycheck" checked><label for="accessibilitycheck">Accessibility</label><div id="accessibilitycircles"><svg id="accessibilityKey" width="'+keyWidth+'" height="'+(keyHeight+20)+'"><line x1="20" y1="6" x2="50" y2="6" stroke-width="2" stroke="'+map.accessibleColor+'"/><text x="60" y="10">Accessible with restriction</text><line x1="20" y1="26" x2="50" y2="26" stroke-width="2" stroke="'+map.notaccessibleColor+'"/><text x="60" y="30">Not accessible</text>');
   //      	$('#accessibilitycheck').change(function(e){
			//  	if ($(e.target).is(':checked')) {
			//  		$('#adm2layer').attr('display', 'block');
			//  	}
			//  	else{
			//  		$('#adm2layer').attr('display', 'none');
			//  	}
			// });
		},

		// all update functions
		update: function (date){
			map.updateIncidents(date);
			map.updateRefugees(date);
			map.updateIDPs(date);
			//map.updateAccessibility(date);

			//show corresponding snapshot date on charts, make sure data exists before trying to show tooltip
			var formatDate = d3.time.format("%m %Y");
			var charts = ['#displacedChart','#foodinsecureChart','#incidentChart'];
			for (var i=0;i<charts.length;i++){
				var values = $(charts[i]).data('c3-chart').internal.data.targets[0].values;
				$(charts[i]).data('c3-chart').tooltip.hide();
				for (var j=0;j<values.length;j++){
					if (charts[i]=='#incidentChart') { 
						if (formatDate(values[j].x)==formatDate(date)){
							$(charts[i]).data('c3-chart').tooltip.show({ x: values[j].x });
							break;
						}
					}
					else{
						if (values[j].x.getTime() == date.getTime()){
							$(charts[i]).data('c3-chart').tooltip.show({ x: values[j].x });
							break;
						}
					}
				}
			}
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
			    .attr('fill',map.incidentsColor)
			    .attr('class','incidents');

			circles.transition().duration(map.animationInterval/2).attr('opacity',0.85);

			//map tooltips
		    var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');
		    circles
		        .on('mousemove', function(d,i) {
		            var mouse = d3.mouse(map.svg.node()).map( function(d) { return parseInt(d); } );
		            maptip
		                .classed('hidden', false)
		                .attr('style', 'left:'+(mouse[0]+20)+'px;top:'+(mouse[1]+20)+'px')
		                .html(map.formatDate(d['#date']) + ' ' + d['#loc'] + ' ' + d['#adm2'])
		        })
		        .on('mouseout',  function(d,i) {
		            maptip.classed('hidden', true)
		        }); 
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

			map.rscale = d3.scale.linear()
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
			    	return map.rscale(d.value);
			    })
			    .attr('opacity',0)
			    .attr('fill',map.refugeesColor)
			    .attr('class','refugees');

			circles.transition().duration(map.animationInterval/2).attr('opacity',0.85);

			//map tooltips
		    var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');
		    circles
		        .on('mousemove', function(d,i) {
		            var mouse = d3.mouse(map.svg.node()).map( function(d) { return parseInt(d); } );
		            maptip
		                .classed('hidden', false)
		                .attr('style', 'left:'+(mouse[0]+20)+'px;top:'+(mouse[1]+20)+'px')
		                .html(map.names[d.key]+': '+d3.format('.2s')(d.value))
		        })
		        .on('mouseout',  function(d,i) {
		            maptip.classed('hidden', true)
		        }); 
		},

		updateIDPs: function(date){
			d3.selectAll('.adm1').attr('fill','#f7fbff');
			
			color = d3.scale.quantize();
			color.domain([0, map.displacedRange[map.displacedRange.length-1]]);
			color.range(map.displacedColors);

			map.displacedDim.filter();
			map.displacedDim.filter(date);
			var data = map.idpsGroup.top(Infinity);

    		//map tooltips
		    var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');
			data.forEach(function(d){
				if(d.value>0){
					d3.select('#'+d.key).attr('fill',function(){
						return color(d.value);
					})
					.on('mousemove', function(){
			            var mouse = d3.mouse(map.svg.node()).map( function(d) { return parseInt(d); } );
						maptip
		                .classed('hidden', false)
		                .attr('style', 'left:'+(mouse[0]+20)+'px;top:'+(mouse[1]+20)+'px')
		                .html(map.names[d.key]+': '+d3.format('.2s')(d.value))
					})
			        .on('mouseout',  function() {
			            maptip.classed('hidden', true)
			        }); 
				}
			});
		},

		updateAccessibility: function(date){
			d3.selectAll('.adm2').attr('stroke','#cccccc').attr('stroke-opacity',0);
			map.accessDim.filter();
			var data = map.accessDim.filter(date).top(Infinity);
			//comment out when pcodes introduced
			//console.log(data);
			data.forEach(function(d){
				d3.select('#'+d['#adm2+code'])
					.attr('stroke',function(){
						if(d['#status']=='Accessible with restriction'){
							return map.accessibleColor;
						} else if (d['#status']=='Not Accesible') {
							return map.notaccessibleColor;
						}
					}).attr('stroke-opacity',1);
			});
		}		
	}
})();