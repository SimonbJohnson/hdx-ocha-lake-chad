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
    var dateFormat = d3.time.format("%Y-%m-%d").parse;
    data.forEach(function(d){
        tags.forEach(function(t){
            d[t] = dateFormat(d[t]);
        });
    });
    return data;
}

function generateMap(incidents,refugees,accessible,adm1,adm2,countries){
    map.init(adm1,adm2,countries,incidents);
    console.log(incidents);
    // console.log(refugees);
    // console.log(accessible);
    // console.log(adm1);
    // console.log(adm2);
    // console.log(countries);
}

function generateKeyStats(data){
    var cf = crossfilter(data);
    var datesDimension = cf.dimension(function(d){ return d['#date']; });
    var totalAffectedGroup = cf.groupAll().reduceSum(function(d) { return d['#affected']; }).value();
    var affectedGroup = datesDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected']); }).top(Infinity);

    var totalInneedGroup = cf.groupAll().reduceSum(function(d) { return d['#inneed']; }).value();
    var inneedGroup = datesDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#inneed']); }).top(Infinity);

    var totalFoodinsecureGroup = cf.groupAll().reduceSum(function(d) { return d['#affected+foodinsecure']; }).value();
    var foodinsecureGroup = datesDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected+foodinsecure']); }).top(Infinity);

    var totalDisplacedGroup = cf.groupAll().reduceSum(function(d) { return d['#affected+displaced']; }).value();
    var displacedGroup = datesDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected+displaced']); }).top(Infinity);

    var totalSamGroup = cf.groupAll().reduceSum(function(d) { return d['#affected+sam']; }).value();
    var samGroup = datesDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected+sam']); }).top(Infinity);

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

    var sparklineW = 70;
    var sparklineH = 40;
    var keyFiguresArr = [
            { dimension: 'affected', dimensionArr: affectedArr, total: totalAffectedGroup },
            { dimension: 'inneed', dimensionArr: inneedArr, total: totalInneedGroup },
            { dimension: 'foodinsecure', dimensionArr: foodinsecureArr, total: totalFoodinsecureGroup },
            { dimension: 'displaced', dimensionArr: displacedArr, total: totalDisplacedGroup },
            { dimension: 'sam', dimensionArr: samArr, total: totalSamGroup }
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
}

function generateFundingGraph(data){
    var cf = crossfilter(data);
    var fundsDimension = cf.dimension(function(d){return d['#country+name'];});
    var fundsGroup = fundsDimension.group().reduceSum(function(d){ return d['#meta+funding']; }).top(4);
    var unmetGroup = fundsDimension.group().reduceSum(function(d){ return (d['#meta+requirement'] - d['#meta+funding']); }).top(4);

    var dateFormat = d3.time.format('%b %Y'); 
    var minDate = dateFormat( d3.min(data,function(d){return d['#date'];}) );
    var maxDate = dateFormat( d3.max(data,function(d){return d['#date'];}) );

    var locationArr = ['x'];
    var fundedArr = ['Funded'];
    var unmetArr = ['Unmet'];
    for (var i=0;i<fundsGroup.length;i++){
        locationArr.push(fundsGroup[i].key);
        fundedArr.push(fundsGroup[i].value);
        unmetArr.push(unmetGroup[i].value);
    }

    $('#fundingChartHeader').html('Revised Requirement ' + minDate + ' – ' + maxDate);
    var chart = c3.generate({
        bindto: '#fundingChart',
        size: { height: 150 },
        color: {
          pattern: ['#FF9B00', '#0066b9']
        },
        data: {
            x: 'x',
            columns: [ locationArr, fundedArr, unmetArr ],
            type: 'bar',
            labels: {
                format: {
                    Funded: numFormat,
                    Unmet: numFormat
                }
            },
            groups: [ 
                ['Funded', 'Unmet'] 
            ]
        },
        bar: { width: 20 },
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
}

function generateFoodInsecureGraph(data){
    var cf = crossfilter(data);
    var foodinsecureDimension = cf.dimension(function(d){return d['#date'];});
    var foodinsecureGroup = foodinsecureDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected+foodinsecure']); }).top(Infinity);
    
    var foodinsecureArr = ['Food Insecure'];
    var datesArr = ['x'];
    for (var i=0;i<foodinsecureGroup.length;i++){
        datesArr.push(foodinsecureGroup[i].key);
        foodinsecureArr.push(foodinsecureGroup[i].value);
    }
    var chart = c3.generate({
        bindto: '#foodinsecureChart',
        size: { height: 175 },
        padding: { right: 20 },
        color: {
          pattern: ['#0066b9']
        },
        data: {
            x: 'x',
            columns: [ datesArr, foodinsecureArr ],
            type: 'bar' 
        },
        bar: { width: 15 },
        axis: {
            x: {
                type: 'timeseries',
                localtime: false,
                tick: {
                    centered: true,
                    culling: { max: 5 },
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
        legend: { hide: true }
    });
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
        size: { height: 175 },
        color: {
          pattern: ['#FF9B00', '#999']
        },
        data: {
            x: 'x',
            columns: [ datesArr, incidentsArr, deathsArr ],
            axes: { Deaths: 'y2' },
            types: { Incidents: 'bar' }
        },
        bar: { width: 7 },
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
}

function generateDisplacedGraph(data){
    var cf = crossfilter(data);
    var displacedDimension = cf.dimension(function(d){return d['#date'];});
    var displacedGroup = displacedDimension.group(function(d) {return d3.time.month(d);}).reduceSum(function(d){ return (d['#affected+idps'] - d['#affected+refugees']); }).top(Infinity);
    
    var displacedArr = ['Displaced'];
    var datesArr = ['x'];
    for (var i=0;i<displacedGroup.length;i++){
        datesArr.push(displacedGroup[i].key);
        displacedArr.push(displacedGroup[i].value);
    }
    var chart = c3.generate({
        bindto: '#displacedChart',
        size: { height: 175 },
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
                    format: d3.format('.2s')
                },
                min: 0,
                padding: { bottom: 0 }
            }
        },
        legend: { hide: true }
    });
}


var numFormat = d3.format('.2s');

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
    url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A//docs.google.com/spreadsheets/d/1hFEDRWiVW47WLYOmK93YjO4fhjp0KR_kkckKNbNisbw/edit%23gid%3D631467873&sheet=0',
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

$.when(incidentsCall,refugeesCall,accessibleCall,adm1Call,adm2Call,countriesCall).then(function(incidentsArgs,refugeesArgs,accessibleArgs,adm1Args,adm2Args,countriesArgs){
    var incidents = parseDates(['#date'],(hxlProxyToJSON(incidentsArgs[0])));
    var refugees = parseDates(['#date'],(hxlProxyToJSON(refugeesArgs[0])));
    var accessible = parseDates(['#date'],(hxlProxyToJSON(accessibleArgs[0])));
    var adm1 = topojson.feature(adm1Args[0],adm1Args[0].objects.lake_chad_adm1);
    var adm2 = topojson.feature(adm2Args[0],adm2Args[0].objects.lake_chad_adm2);
    var countries = topojson.feature(countriesArgs[0],countriesArgs[0].objects.lake_chad_countries);
    generateMap(incidents,refugees,accessible,adm1,adm2,countries);
});