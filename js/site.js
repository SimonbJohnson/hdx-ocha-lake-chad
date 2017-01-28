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

function generateMap(incidents,refugees,accessible){
    console.log(incidents);
    console.log(refugees);
    console.log(accessible);
}

function generateKeyStats(data){
    console.log(data);
}

function generateIADGraph(data){
    console.log(data);
}

function generateFundingGraph(data){
    console.log(data);
}

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

$.when(keyStatsCall).then(function(keyStatsArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(keyStatsArgs)));
    generateKeyStats(data);
});

$.when(iadCall).then(function(iadArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(iadArgs)));
    generateIADGraph(data);
});

$.when(fundingCall).then(function(fundingArgs){
    var data = parseDates(['#date'],(hxlProxyToJSON(fundingArgs)));
    generateFundingGraph(data);
});

$.when(incidentsCall,refugeesCall,accessibleCall).then(function(incidentsArgs,refugeesArgs,accessibleArgs){
    var incidents = parseDates(['#date'],(hxlProxyToJSON(incidentsArgs[0])));
    var refugees = parseDates(['#date'],(hxlProxyToJSON(refugeesArgs[0])));
    var accessible = parseDates(['#date'],(hxlProxyToJSON(accessibleArgs[0])));
    generateMap(incidents,refugees,accessible);
});