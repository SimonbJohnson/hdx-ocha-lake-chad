function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function parseDates(tags,data){
    var parseDateFormat = d3.time.format("%Y-%m-%d").parse;
    data.forEach(function(d){
        tags.forEach(function(t){
            d[t] = parseDateFormat(d[t]);
        });
    });
    return data;
}

var date_sort = function (d1, d2) {
    if (d1.key > d2.key) return 1;
    if (d1.key < d2.key) return -1;
    return 0;
};

function generateMap(incidents,refugees,accessible,adm1,adm2,countries,countrieslabel){
    map.init(adm1,adm2,countries,incidents,refugees, accessible, countrieslabel);
}

function generateKeyStats(data){
    var cf = crossfilter(data);
    var datesDimension = cf.dimension(function(d){ return d['#date']; });

    var affectedGroup = datesDimension.group().reduceSum(function(d){ return (d['#affected']); }).top(Infinity).sort(date_sort);

    var maxDate = d3.max(data,function(d){return d['#date'];});

    var countryDimension = datesDimension.filter(maxDate);
    var countryArr = [];
    countryDimension.top(Infinity).forEach(function(key,i){
        countryArr.push({id:key['#country+code'],
                         affected:key['#affected'],
                         inneed:key['#inneed'],
                         foodinsecure:key['#affected+foodinsecure'],
                         displaced:key['#affected+displaced'],
                         sam:key['#affected+sam']});
    });
    var countryNameMap = {
        CHD: 'Chad',
        CMR: 'Cameroon',
        NGR: 'Nigeria',
        NER: 'Niger'
    };

    var inneedGroup = datesDimension.group().reduceSum(function(d){ return (d['#inneed']); }).top(Infinity).sort(date_sort);

    var foodinsecureGroup = datesDimension.group().reduceSum(function(d){ return (d['#affected+foodinsecure']); }).top(Infinity).sort(date_sort);

    var displacedGroup = datesDimension.group().reduceSum(function(d){ return (d['#affected+displaced']); }).top(Infinity).sort(date_sort);

    var samGroup = datesDimension.group().reduceSum(function(d){ return (d['#affected+sam']); }).top(Infinity).sort(date_sort);
    
    var datesArr = ['x'];
    var affectedArr = ['Affected'];
    var inneedArr = ['In Need'];
    var foodinsecureArr = ['Food Insecure'];
    var displacedArr = ['Displaced'];
    var samArr = ['Sam'];

    for (var i=0;i<affectedGroup.length;i++){
        datesArr.push(affectedGroup[i].key);
        affectedArr.push(affectedGroup[i].value);
        inneedArr.push(inneedGroup[i].value);
        foodinsecureArr.push(foodinsecureGroup[i].value);
        displacedArr.push(displacedGroup[i].value);
        samArr.push(samGroup[i].value);
    }

    var sparklineW = 65;
    var sparklineH = 40;
    var keyFiguresArr = [
            { dimension: 'affected', dimensionArr: affectedArr, total: affectedGroup[affectedGroup.length-1].value },
            { dimension: 'inneed', dimensionArr: inneedArr, total: inneedGroup[inneedGroup.length-1].value },
            { dimension: 'foodinsecure', dimensionArr: foodinsecureArr, total: foodinsecureGroup[foodinsecureGroup.length-1].value },
            { dimension: 'displaced', dimensionArr: displacedArr, total: displacedGroup[displacedGroup.length-1].value },
            { dimension: 'sam', dimensionArr: samArr, total: samGroup[samGroup.length-1].value }
        ];
    for (var i=0;i<keyFiguresArr.length;i++) {
        $('#'+keyFiguresArr[i].dimension+'Total').html(numFormat(keyFiguresArr[i].total));
        var chart = c3.generate({
            bindto: '#'+keyFiguresArr[i].dimension+'Line',
            size: { 
                height: sparklineH,
                width: sparklineW
            },
            color: {
              pattern: ['#0066b9']
            },
            data: {
                x: 'x',
                columns: [ datesArr, keyFiguresArr[i].dimensionArr ]
            },
            axis: {
                x: { show: false },
                y: { show: false }
            },
            point: { show: false },
            tooltip: { show: false },
            legend: { hide: true }
        });
    }

    //map tooltips
    var keytip = d3.select('.keyfigures').append('div').attr('class', 'd3-tip hidden');
    $('.keyfigure').each(function(i,e){
        var figure = $(this).attr('data-figure');
        var str = '<h4>Country Breakdown</h4>';
        for (var j=0;j<countryArr.length;j++){
            str += countryNameMap[countryArr[j].id] + ': ' + numFormat(countryArr[j][figure]) + '<br>';
        }

        var leftPos = $(e)[0].offsetLeft;
        var topPos = $(e)[0].offsetTop;
        $(e).find('span, div').on('mouseover', function(e) {  
            keytip
                .classed('hidden', false)
                .attr('style', 'left:'+leftPos+'px;top:'+(topPos+70)+'px')
                .html(str)
        })
        $(e).find('span, div').on('mouseout',  function() {
            keytip.classed('hidden', true)
        }); 
    });
}

function generateFundingGraph(data){
    var cf = crossfilter(data);
    var fundsDimension = cf.dimension(function(d){return d['#date'];});
    
    var maxDate = d3.max(data,function(d){return d['#date'];});

    var fundingData = fundsDimension.filter(maxDate).top(Infinity).sort(function(a, b) {
        return b['#meta+requirement'] - a['#meta+requirement'];
    });

    var locationArr = ['x'];
    var fundedArr = ['Funded'];
    var unmetArr = ['Unmet'];
    for (var i=0;i<fundingData.length;i++){
        locationArr.push(fundingData[i]['#country+name']);
        fundedArr.push(fundingData[i]['#meta+funding']);
        unmetArr.push(fundingData[i]['#meta+requirement']-fundingData[i]['#meta+funding']);
    }
    var h = $('#fundingChart').parent().parent().height() - 50;
    //$('#fundingChart').height()
    $('#fundingChartHeader').html('Requirement for ' + maxDate.getFullYear() + ' (in US $)');
    var chart = c3.generate({
        bindto: '#fundingChart',
        padding: {
            top: 0,
            right:  0,
            bottom: 0,
            left: 60
        },
        size: { height: h },
        color: {
          pattern: ['#0066b9','#FF9B00']
        },
        data: {
            x: 'x',
            columns: [ locationArr, fundedArr, unmetArr ],
            type: 'bar',
            labels: {
                format: {
                    // Funded: numFormat,
                    Unmet: numFormat
                }
            },
            groups: [ 
                ['Funded', 'Unmet'] 
            ]
        },
        axis: {
            rotated: true,
            x: {
                type: 'category',
                tick: {
                    centered: true,
                    outer: false
                }
            },
            y: { show: false }
        },
        tooltip: {
            format: { value: numFormat }
        },
        legend: { hide: 'x' }
    });

    if ($(window).width() < 768){
        chart.resize({height:150})
    }
}

function generateFoodInsecureGraph(data){
    var cf = crossfilter(data);
    var foodinsecureDimension = cf.dimension(function(d){return d['#date'];});
    var foodinsecureGroup = foodinsecureDimension.group().reduceSum(function(d){ return (d['#affected+foodinsecure']); }).top(Infinity);
    
    var foodinsecureArr = ['Food Insecure'];
    var datesArr = ['x'];
    for (var i=0;i<foodinsecureGroup.length;i++){
        datesArr.push(foodinsecureGroup[i].key);
        foodinsecureArr.push(foodinsecureGroup[i].value);
    }
    var chart = c3.generate({
        bindto: '#foodinsecureChart',
        size: { height: 155 },
        padding: { right: 20 },
        color: {
          pattern: ['#0066b9']
        },
        data: {
            x: 'x',
            columns: [ datesArr, foodinsecureArr ],
            type: 'area' 
        },
        bar: { width: 15 },
        axis: {
            x: {
                type: 'timeseries',
                localtime: false,
                tick: {
                    centered: true,
                    culling: { max: 4 },
                    format: '%b %Y',
                    outer: false
                }
            },
            y: {
                tick: {
                    count: 5,
                    format: d3.format('.2s')
                }
            }
        },
        tooltip: {
            format: {
                title: function (d) { return dateFormat(d); }
            }
        },
        legend: { hide: true }
    });
    $('#foodinsecureChart').data('c3-chart', chart);
}

function generateIADGraph(data){
    var incidentsArr = ['Incidents'];
    var deathsArr = ['Deaths'];
    var datesArr = ['x'];
    for (var i=0;i<data.length;i++){
        datesArr.push(data[i]['#date']);
        incidentsArr.push(data[i]['#indicator+incidents']);
        deathsArr.push(data[i]['#affected+deaths']);
    }

    var chart = c3.generate({
        bindto: '#incidentChart',
        size: { height: 155 },
        color: {
          pattern: ['#FF9B00', '#999']
        },
        data: {
            x: 'x',
            columns: [ datesArr, incidentsArr, deathsArr ],
            axes: { Deaths: 'y2' },
            types: { Incidents: 'bar' }
        },
        //bar: { width: 7},
        axis: {
            x: {
                type: 'timeseries',
                localtime: false,
                tick: {
                    centered: true,
                    culling: { max: 4 },
                    format: '%b %Y',
                    outer: false
                }
            },
            y: {
                label: {
                    text: 'Incidents',
                    position: 'outer-middle'
                },
                min: 0,
                padding: { bottom: 0 }
            },
            y2: {
                label: {
                    text: 'Deaths',
                    position: 'outer-middle'
                },
                min: 0,
                padding: { bottom: 0 },
                show: true
            }
        }
    });
    $('#incidentChart').data('c3-chart', chart);
}

function generateDisplacedGraph(data){
    var cf = crossfilter(data);
    var displacedDimension = cf.dimension(function(d){return d['#date'];});
    var displacedGroup = displacedDimension.group().reduceSum(function(d){return parseInt(d['#affected+refugees'])+parseInt(d['#affected+idps']); }).top(Infinity).sort(date_sort);

    var displacedArr = ['Displaced'];
    var datesArr = ['x'];
    for (var i=0;i<displacedGroup.length;i++){
        datesArr.push(displacedGroup[i].key);
        displacedArr.push(displacedGroup[i].value);
    }
    var chart = c3.generate({
        bindto: '#displacedChart',
        size: { height: 155 },
        padding: { right: 20 },
        color: {
          pattern: ['#0066b9']
        },
        data: {
            x: 'x',
            columns: [ datesArr, displacedArr ]
        },
        axis: {
            x: {
                type: 'timeseries',
                localtime: false,
                tick: {
                    culling: { max: 4 },
                    format: '%b %Y',
                    outer: false
                }
            },
            y: {
                tick: {
                    count: 5,
                    format: numFormat
                },
                min: 0,
                padding: { bottom: 0 }
            }
        },
        tooltip: {
            format: {
                title: function (d) { return dateFormat(d); }
            }
        },
        legend: { hide: true }
    });
    $('#displacedChart').data('c3-chart', chart);
}


var numFormat = function(d){return d3.format('.3s')(d).replace('G','B')};
var dateFormat = d3.time.format("%d %b %Y");

var keyStatsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D1812895669&sheet=0',
    dataType: 'json',
});

var iadCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D631467873&sheet=0',
    dataType: 'json',
});

var incidentsCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D811086350&sheet=0',
    dataType: 'json',
});

var refugeesCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D389521896&sheet=0',
    dataType: 'json',
});

var accessibleCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D1969909003&sheet=0',
    dataType: 'json',
});

var fundingCall = $.ajax({ 
    type: 'GET', 
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D1889655062&sheet=0',
    dataType: 'json',
});

var adm1Call = $.ajax({ 
    type: 'GET', 
    url: 'data/lake_chad_adm1.json',
    dataType: 'json',
});

var adm2Call = $.ajax({ 
    type: 'GET', 
    url: 'data/lake_chad_adm2.json',
    dataType: 'json',
});

var countriesCall = $.ajax({ 
    type: 'GET', 
    url: 'data/lake_chad_countries.json',
    dataType: 'json',
});

var countrieslabelCall = $.ajax({ 
    type: 'GET', 
    url: 'data/countries.json',
    dataType: 'json',
});

$.when(keyStatsCall).then(function(keyStatsArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(keyStatsArgs)));
    generateKeyStats(data);
    generateFoodInsecureGraph(data);
});

$.when(iadCall).then(function(iadArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(iadArgs)));
    generateIADGraph(data);
});

$.when(fundingCall).then(function(fundingArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(fundingArgs)));
    generateFundingGraph(data);
});

$.when(refugeesCall).then(function(refugeesArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(refugeesArgs)));
    generateDisplacedGraph(data);
});

$.when(incidentsCall,refugeesCall,accessibleCall,adm1Call,adm2Call,countriesCall,countrieslabelCall).then(function(incidentsArgs,refugeesArgs,accessibleArgs,adm1Args,adm2Args,countriesArgs,countrieslabelArgs){
    var incidents = parseDates(['#date'],(hxlProxyToJSON(incidentsArgs[0])));
    var refugees = parseDates(['#date'],(hxlProxyToJSON(refugeesArgs[0])));
    var accessible = parseDates(['#date'],(hxlProxyToJSON(accessibleArgs[0])));
    var adm1 = topojson.feature(adm1Args[0],adm1Args[0].objects.lake_chad_adm1);
    var adm2 = topojson.feature(adm2Args[0],adm2Args[0].objects.lake_chad_adm2);
    var countries = topojson.feature(countriesArgs[0],countriesArgs[0].objects.lake_chad_countries);
    var countrieslabel = countrieslabelArgs[0].countries;
    generateMap(incidents,refugees,accessible,adm1,adm2,countries,countrieslabel);
});