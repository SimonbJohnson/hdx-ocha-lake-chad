(function() {
	var map = window.map = {
		SVG: '',
		ZOOM: '',

		init: function(adm1,adm2,countries){
			var width = $('#map').width();
			var height = 450;
    		map.ZOOM = d3.behavior.zoom().scaleExtent([1, 8]).on('zoom', map.zoom);

			map.SVG = d3.select('#map').append('svg')
	        	.attr('width', width)
	        	.attr('height', height)
        		//.call(map.ZOOM);

		    var projection = d3.geo.mercator()
		        .center([0, 0])
		        .scale(width)
		        .translate([width / 2, height / 2]);    

		    var g = map.SVG.append('g');

		    g.selectAll('path')
		     	.data(adm1.features).enter()
		     	.append('path')
		      	.attr('d', d3.geo.path().projection(projection))
		      	.attr('class','country')
        		//.attr('fill', '#0077be')
		      	.attr('id',function(d){
		        	return d.properties.CNTRY_NAME;
		      	});

		},

		zoom: function(){
			var g = d3.select('#map').select('svg').select('g');
		    g.attr('transform', 'translate(' + map.ZOOM.translate() + ') scale(' + map.ZOOM.scale() + ')');
		    g.selectAll('path').style('stroke-width', (map.ZOOM.scaleExtent()[1]/map.ZOOM.scale()) / 10);
		}
	}
})();