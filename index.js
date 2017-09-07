#!/usr/bin/env node
var request = require('request');
var fs = require('fs');
var args = process.argv;
var includeIP6 = false;
var IP6;
var updated = false;
try{
    var configFileId = process.argv.indexOf('--config');
    var config = JSON.parse(fs.readFileSync(process.argv[configFileId+1], 'utf8'));
} catch(error){
     if(configFileId === -1){
        console.log(new Date()+' Missing --config parameter.'); 
     } else {
     console.log(new Date()+' Error reading cofig file. File either missing or malformed.'); 
    }
    process.exit();
};

if(process.argv.indexOf('--list') !== -1 || process.argv.indexOf('-l') !== -1){
   var domainInfo = JSON.parse(getDomainInfo());
   console.dir(domainInfo, {depth: null, colors: true});
   process.exit();
};

function getIPv4() {
    var source;
    request({
    url: 'http://ip4.iurl.no' ,   
    method: 'GET',
    headers: {
        'Content-Type': 'application/text'
    }
}, function(error, response, body){
    if(error){
        console.log(new Date()+' Error getting IP '+error.code+' ('+error.host+')'); 
        process.exit();
    }
    source = body;
    });
    while(source === undefined) {
      require('deasync').runLoopOnce();
    }
    return source;

};

function getIPv6() {
    var source;
    request({
    url: 'http://ip6.iurl.no' ,   
    method: 'GET',
    headers: {
        'Content-Type': 'application/text'
    }
}, function(error, response, body){
    if(error){
        console.log(new Date()+' Error getting IP '+error.code+' ('+error.host+')'); 
        process.exit();
    }
    source = body;
    });
    while(source === undefined) {
      require('deasync').runLoopOnce();
    }
    return source;

};

function updateIP(newIP,domain,API_KEY,domainid) {
    request({
    url: 'https://api.digitalocean.com/v2/domains/'+domain+'/records/' + domainid ,
    qs: {"data": newIP},
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+API_KEY
    }
}, function(error, response, body){
    if(error){
        console.log(new Date()+' Error uppdating IP '+error.code); 
        process.exit();
    }
});
}

function getServerIP(i){
    var remoteIP;
    request({
    url: 'https://api.digitalocean.com/v2/domains/'+config.domains[i].name+'/records/' + config.domains[i].id ,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+config.api_key
    }
}, function(error, response, body){
    try{
    var data = (JSON.parse(body));
    remoteIP = [data.domain_record.type, data.domain_record.data];
} catch(error){
        console.log(new Date()+' Error getting remote IP '+error.code); 
        process.exit();
}
});
    while(remoteIP === undefined) {
      require('deasync').runLoopOnce();
    }
    return remoteIP;
}
function getDomainInfo(){
    var domainInfo;
    request({
    url: 'https://api.digitalocean.com/v2/domains/'+config.domains[0].name+'/records/',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+config.api_key
    }
}, function(error, response, body){
    try{
    domainInfo = body;
} catch(error){
    console.log(new Date()+' Error getting domaininfo '+error.code); 
    process.exit();
}
});
    while(domainInfo === undefined) {
      require('deasync').runLoopOnce();
    }
    return domainInfo;
}
if(process.argv.indexOf('--list') !== -1 || process.argv.indexOf('-l') !== -1){
   var domainInfo = JSON.parse(getDomainInfo());
   console.dir(domainInfo, {depth: null, colors: true});
   process.exit();
};

if(process.argv.indexOf('-ip6') !== -1){
    IP6 = getIPv6();
    includeIP6 = true
};

var IP4 = getIPv4();


   for (var i = 0; i < config.domains.length; i++) {
        var dnsIP = getServerIP(i);
        if(dnsIP[0] === 'A' && IP4.localeCompare(dnsIP[1]) != 0){
            updateIP(IP4,config.domains[i].name,config.api_key,config.domains[i].id);
	    updated = true;
	    console.log(new Date()+' Updated IP to '+IP4);           
        
        if(includeIP6 && dnsIP[0] === 'AAAA' && IP6.localeCompare(dnsIP[1]) != 0){
            updateIP(IP6,config.domains[i].name,config.api_key,config.domains[i].id);
	    console.log(new Date()+' Updated IP to '+IP6);
        };
};
    };
if(!updated) console.log('['+new Date()+'] IP not updated.');
    process.exit();
