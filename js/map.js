var map;

var busStopList;
var busStopLayers = [];
var tramStopList;
var tramStopLayers = [];
var tubeStationList;
var tubeStationLayers = [];

var tubePerformance = [];

function initmap() {
	// set up the map
   map = new L.Map('map');

	// create the tile layer with correct attribution
	var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttrib='Map data © OpenStreetMap contributors';
	var osm = new L.TileLayer(osmUrl, {minZoom: 8, maxZoom: 18, attribution: osmAttrib});		

	// start the map in Brockley
	map.setView(new L.LatLng(51.4647560817196, -0.03664970397949219),15);
	map.addLayer(osm);
	
   // Look for TransportAPI credentials in the browser's cookie
   if($.cookie('api_key') !== undefined) {
      $("#apikey")[0].value = $.cookie('api_key');
   }
   if($.cookie('app_id') !== undefined) {
      $("#appid")[0].value = $.cookie('app_id');
   }
   
	// call once to initiate, then call whenever you move the map
	onMapMove();
	map.on('moveend', onMapMove);

   addTubeRadar();

}

function storeApiKeyInCookies() {
   $.cookie('api_key',$("#apikey")[0].value);
   $.cookie('app_id',$("#appid")[0].value);
}

function getApiKey() {
   return 'api_key='+$("#apikey")[0].value+'&app_id='+$("#appid")[0].value;
}

function removeBusMarkers() {
	for (i=0;i<busStopLayers.length;i++) {
		map.removeLayer(busStopLayers[i]);
	}
	busStopLayers=[];
}

function removeTubeMarkers() {
	for (i=0;i<tubeStationLayers.length;i++) {
		map.removeLayer(tubeStationLayers[i]);
	}
	tubeStationLayers=[];
}

function removeTramMarkers() {
	for (i=0;i<tramStopLayers.length;i++) {
		if(! map.getBounds().contains([tramStopLayers[i].data.latitude, tramStopLayers[i].data.longitude])) {
         map.removeLayer(tramStopLayers[i]);
         tramStopLayers.splice(i,1);
      }
	}
   // used to empty the array, now we just splice out the stops we don't want
   // tramStopLayers=[];
}


function askForBusStops() {
	// request the marker info with AJAX for the current bounds
	var center=map.getCenter();
	var url='http://transportapi.com/v3/uk/bus/stops/near.json?' +
		 getApiKey()+ 
		 center.lng+'&lat='+center.lat;
	// ajaxRequest.onreadystatechange = stateChanged;
	// ajaxRequest.open('GET', msg, true);
	// ajaxRequest.send(null);

   $.ajax({
       url: url,
       data: {},
       dataType: 'jsonp'
   }).done(function (data) {
		busStopList=data.stops;
		removeBusMarkers();
		for (i=0;i<busStopList.length;i++) {
         if(busStopList[i].atcocode)
			var busStopll = new L.LatLng(busStopList[i].latitude,busStopList[i].longitude, true);
			var BusStopMarker = new L.Marker(busStopll);
			BusStopMarker.data=busStopList[i];
			map.addLayer(BusStopMarker);
			BusStopMarker.bindPopup("<h3>"+busStopList[i].name+"</h3>"+busStopList[i].atcocode);
			busStopLayers.push(BusStopMarker);
		}
	});
}

function askForTramStops() {
   // askForTramStopsPopup();
   askForTramStopsComparative();
}

function askForTramStopsPopup() {
	// request the marker info with AJAX for the current bounds
	var bounds=map.getBounds();
	var url='http://transportapi.com/v3/uk/tram/stops/bbox.json?' +
		 getApiKey() + 
		 '&minlon='+bounds.getSouthWest().lng+'&minlat='+bounds.getSouthWest().lat+
		 '&maxlon='+bounds.getNorthEast().lng+'&maxlat='+bounds.getNorthEast().lat;
	// ajaxRequest.onreadystatechange = stateChanged;
	// ajaxRequest.open('GET', msg, true);
	// ajaxRequest.send(null);

   $.ajax({
       url: url,
       data: {},
       dataType: 'jsonp'
   }).done(function (data) {
		tramStopList=data.stops;
		removeTramMarkers();
      var duplicateStop = false;
		for (i=0;i<tramStopList.length;i++) {
         duplicateStop = false;
         // we should be able to do better than iterating through all markers, but this will work for now... 
         // (given small numbers of markers!)
         // may be better to have an index by atcocode so we can just look this up (more memory, less cpu)
         for (var j = 0; j < tramStopLayers.length; j++) {
            if (tramStopLayers[j].data.atcocode == tramStopList[i].atcocode){
               duplicateStop = true;
            }
         }
         if(!duplicateStop) {
            var tramStopll = new L.LatLng(tramStopList[i].latitude,tramStopList[i].longitude, true);
   			var tramStopMarker = new L.Marker(tramStopll);
   			tramStopMarker.data=tramStopList[i];
   			map.addLayer(tramStopMarker);
   			// tramStopMarker.bindPopup("<h3>"+tramStopList[i].name+"</h3>"+tramStopList[i].atcocode);
   			tramStopMarker.on('click',function(e) {
               var myDate = $( "#datepicker" ).datepicker("getDate");
   				$.ajax({
   					url: 'http://transportapi.com/v3/uk/tram/stop/'+e.target.data.atcocode+'/'+
                     // myDate.getMonth() not working for some reason...
                     myDate.getFullYear()+'-'+'01'+'-'+myDate.getDate()+
                     '/12:00/timetable.json?' +
   						getApiKey() + '&group=no&limit=3', 
   					data: {},
   					dataType: 'jsonp'
   					}).done(function(data) {
   						var departures = '';
   						for (var i = 0; i < data.departures.all.length; i++) {
   							departures += data.departures.all[i].direction + ' - ';
   							departures += data.departures.all[i].aimed_departure_time + '<br />';
   						}
                     e.target.bindPopup('<h3>'+e.target.data.name+'</h3>' + '<br />' + departures);
   						e.target.openPopup();
   					});
   				});
   			tramStopLayers.push(tramStopMarker);
         }
		}
	});

}

function askForTramStopsComparative() {
	// request the marker info with AJAX for the current bounds
	var bounds=map.getBounds();
	var url='http://transportapi.com/v3/uk/tram/stops/bbox.json?' +
		 getApiKey() + 
		 '&minlon='+bounds.getSouthWest().lng+'&minlat='+bounds.getSouthWest().lat+
		 '&maxlon='+bounds.getNorthEast().lng+'&maxlat='+bounds.getNorthEast().lat;
	// ajaxRequest.onreadystatechange = stateChanged;
	// ajaxRequest.open('GET', msg, true);
	// ajaxRequest.send(null);

   $.ajax({
       url: url,
       data: {},
       dataType: 'jsonp'
   }).done(function (data) {
		tramStopList=data.stops;
		removeTramMarkers();
      var duplicateStop = false;
		for (i=0;i<tramStopList.length;i++) {
         duplicateStop = false;
         // we should be able to do better than iterating through all markers, but this will work for now... 
         // (given small numbers of markers!)
         // may be better to have an index by atcocode so we can just look this up (more memory, less cpu)
         for (var j = 0; j < tramStopLayers.length; j++) {
            if (tramStopLayers[j].data.atcocode == tramStopList[i].atcocode){
               duplicateStop = true;
            }
         }
         if(!duplicateStop) {
            var tramStopll = new L.LatLng(tramStopList[i].latitude,tramStopList[i].longitude, true);
   			var tramStopMarker = new L.Marker(tramStopll);
   			tramStopMarker.data=tramStopList[i];
   			map.addLayer(tramStopMarker);
   			// tramStopMarker.bindPopup("<h3>"+tramStopList[i].name+"</h3>"+tramStopList[i].atcocode);
   			tramStopMarker.on('click',function(e) {
               var myDate = $( "#datepicker" ).datepicker("getDate");
   				$.ajax({
   					url: 'http://2.placr.co.uk/v3/uk/tram/stop/'+e.target.data.atcocode+'/'+
                     // myDate.getMonth() not working for some reason...
                     myDate.getFullYear()+'-'+'01'+'-'+myDate.getDate()+
                     '/12:00/timetable.json?' +
   						getApiKey() + '&group=no&limit=3', 
   					data: {},
   					dataType: 'jsonp'
   					}).done(function(data) {
   						var departures = '';
   						for (var i = 0; i < data.departures.all.length; i++) {
   							departures += data.departures.all[i].direction + ' - ';
   							departures += data.departures.all[i].aimed_departure_time + '<br />';
   						}
                     $( "div#placr2").replaceWith('<div class="server" id="placr2"><h2>Placr2</h2><h3>'
                         +e.target.data.name+' at '+data.request_time+'</h3>' + '<br />' + departures+'</div>');
   					});

   				$.ajax({
   					url: 'http://4.placr.co.uk/v3/uk/tram/stop/'+e.target.data.atcocode+'/'+
                     // myDate.getMonth() not working for some reason...
                     myDate.getFullYear()+'-'+'01'+'-'+myDate.getDate()+
                     '/12:00/timetable.json?' +
   						getApiKey() + '&group=no&limit=3', 
   					data: {},
   					dataType: 'jsonp'
   					}).done(function(data) {
   						var departures = '';
   						for (var i = 0; i < data.departures.all.length; i++) {
   							departures += data.departures.all[i].direction + ' - ';
   							departures += data.departures.all[i].aimed_departure_time + '<br />';
   						}
                     $( "div#placr4").replaceWith('<div class="server" id="placr4"><h2>Placr4</h2><h3>'
                        +e.target.data.name+' at '+data.request_time+'</h3>' + '<br />' + departures+'</div>');
   					});
            
                  
   				});
   			tramStopLayers.push(tramStopMarker);
         }
		}
	});

}

function askForTubeStops() {
	// request the marker info with AJAX for the current bounds
	var bounds=map.getBounds();
	var url='http://transportapi.com/v3/uk/tube/stations/bbox.json?' +
		 getApiKey()+
		 '&minlon='+bounds.getSouthWest().lng+'&minlat='+bounds.getSouthWest().lat+
		 '&maxlon='+bounds.getNorthEast().lng+'&maxlat='+bounds.getNorthEast().lat;
	// ajaxRequest.onreadystatechange = stateChanged;
	// ajaxRequest.open('GET', msg, true);
	// ajaxRequest.send(null);

   $.ajax({
       url: url,
       data: {},
       dataType: 'jsonp'
   }).done(function (data) {
		tubeStationList=data.stations;
		removeTubeMarkers();
		for (i=0;i<tubeStationList.length;i++) {
         if(tubeStationList[i].atcocode)
			var tubeStationll = new L.LatLng(tubeStationList[i].latitude,tubeStationList[i].longitude, true);
         // alert(tubeStationList[i].station_code);
         var tubeStationStatus = tubePerformance.filter(function (element) { return (element[0]=="TFL:"+tubeStationList[i].station_code);  } );
         // slight issue with DLR stations breaking the next lines (ie. "DLR:ban") 
         if (tubeStationStatus.length == 1) {
            var TubeStopMarker = new L.CircleMarker(tubeStationll, 
                                                   {opacity: 1, color: tubeStationStatus[0][1], 
                                                      fill: true, fillColor: tubeStationStatus[0][1], fillOpacity: 0.7});
   			TubeStopMarker.data=tubeStationList[i];
   			map.addLayer(TubeStopMarker);
            TubeStopMarker.bindPopup("<h3>Tube: "+tubeStationList[i].name+"</h3>"+tubeStationList[i].lines.join(", "));
            tubeStationLayers.push(TubeStopMarker);
         }
		}
	});
}

function onMapMove(e) {
	// askForBusStops();
   // askForTramStops();
	askForTubeStops();
   
}

function addTubeRadar() {
   // jsonp not currently supported on this endpoint
   
   // $.ajax({
   //     url: 'http://transportapi.com/v3/uk/tube/dashboard.json?'+getApiKey(),
   //     data: {},
   //     dataType: 'jsonp'
   // }).done(function (data) {
   //    tubePerformance = data;
   //    alert(tubePerformance[0]);
   // });
   
   tubePerformance = [["TFL:GPS","#6F6"],
   ["TFL:PIN","#4F4"],
   ["DLR:lca","#FF4"],
   ["TFL:FRD","#FF4"],
   ["TFL:PADs","#FF4"],
   ["TFL:NAC","#4F4"],
   ["TFL:STA","#2F2"],
   ["TFL:WHD","#4F4"],
   ["TFL:AGR","#FF4"],
   ["TFL:ALD","#FF4"],
   ["TFL:ALE","#6F6"],
   ["TFL:ALP","#2F2"],
   ["TFL:AME","#FF4"],
   ["TFL:ANG","#6F6"],
   ["TFL:ARC","#2F2"],
   ["TFL:ARL","#2F2"],
   ["TFL:BAL","#6F6"],
   ["TFL:BAR","#4F4"],
   ["TFL:BAY","#8F8"],
   ["TFL:ACT","#6F6"],
   ["TFL:BNG","#6F6"],
   ["TFL:CWD","#4F4"],
   ["TFL:FBY","#FF4"],
   ["TFL:CFS","#2F2"],
   ["TFL:CHF","#6F6"],
   ["TFL:CHG","#6F6"],
   ["TFL:CHP","#4F4"],
   ["TFL:CHX","#6F6"],
   ["TFL:CLF","#0F0"],
   ["TFL:CLW","#4F4"],
   ["TFL:COL","#4F4"],
   ["TFL:COV","#6F6"],
   ["TFL:CPC","#8F8"],
   ["TFL:CPK","#2F2"],
   ["TFL:CPN","#4F4"],
   ["TFL:CPS","#FF8"],
   ["TFL:CRD","#4F4"],
   ["TFL:CRX","#0F0"],
   ["TFL:CST","#6F6"],
   ["TFL:CTN","#4F4"],
   ["TFL:CWF","#6F6"],
   ["TFL:CWR","#FF4"],
   ["TFL:CYL","#8F8"],
   ["TFL:DEB","#2F2"],
   ["TFL:DGE","#6F6"],
   ["TFL:DGH","#8F8"],
   ["TFL:DHL","#4F4"],
   ["TFL:EAC","#6F6"],
   ["TFL:EBY","#FF4"],
   ["TFL:ECM","#2F2"],
   ["TFL:ECT","#FF8"],
   ["TFL:EDG","#2F2"],
   ["TFL:EHM","#4F4"],
   ["TFL:ELE","#4F4"],
   ["TFL:EMB","#6F6"],
   ["TFL:EPK","#2F2"],
   ["TFL:EPP","#6F6"],
   ["TFL:EPY","#FF4"],
   ["TFL:ERB","#6F6"],
   ["TFL:ERD","#FF0"],
   ["TFL:ESQ","#6F6"],
   ["TFL:ETE","#4F4"],
   ["TFL:EUS","#4F4"],
   ["TFL:FAR","#4F4"],
   ["TFL:FLP","#2F2"],
   ["TFL:FPK","#6F6"],
   ["TFL:GFD","#2F2"],
   ["TFL:GGR","#FF4"],
   ["TFL:GHL","#6F6"],
   ["TFL:GRD","#FF0"],
   ["TFL:GRH","#FF8"],
   ["TFL:GST","#4F4"],
   ["TFL:GUN","#FF8"],
   ["TFL:HAI","#6F6"],
   ["TFL:HAW","#0E0"],
   ["TFL:HBT","#2F2"],
   ["TFL:HBY","#FF8"],
   ["TFL:HCH","#0F0"],
   ["TFL:HIG","#2F2"],
   ["TFL:HLN","#4F4"],
   ["TFL:HMD","#6F6"],
   ["TFL:HMP","#FF8"],
   ["TFL:HMS","#FE0"],
   ["TFL:HNC","#FF8"],
   ["TFL:HND","#FF8"],
   ["TFL:HNE","#FF8"],
   ["TFL:HOH","#2F2"],
   ["TFL:HOL","#6F6"],
   ["TFL:HPC","#FF4"],
   ["TFL:HPK","#4F4"],
   ["TFL:HRC","#FF8"],
   ["TFL:HRD","#6F6"],
   ["TFL:HRF","#4F4"],
   ["TFL:HRV","#FE0"],
   ["TFL:HSD","#0F0"],
   ["TFL:HTX","#FF4"],
   ["TFL:ICK","#2F2"],
   ["TFL:KBY","#6F6"],
   ["TFL:KEN","#FF8"],
   ["TFL:KEW","#2F2"],
   ["TFL:KGN","#2F2"],
   ["TFL:KIL","#6F6"],
   ["TFL:KNB","#FF8"],
   ["TFL:KNT","#FF8"],
   ["TFL:KPK","#6F6"],
   ["TFL:KTN","#4F4"],
   ["TFL:KXX","#6F6"],
   ["TFL:LAM","#FF4"],
   ["TFL:LAN","#6F6"],
   ["TFL:LEY","#8F8"],
   ["TFL:LON","#4F4"],
   ["TFL:LST","#6F6"],
   ["TFL:LTN","#8F8"],
   ["TFL:LYS","#FF4"],
   ["TFL:MAN","#4F4"],
   ["TFL:MAR","#6F6"],
   ["TFL:MDV","#6F6"],
   ["TFL:MGT","#6F6"],
   ["TFL:MHE","#F80"],
   ["TFL:MLE","#8F8"],
   ["TFL:MNR","#8F8"],
   ["TFL:MON","#2F2"],
   ["TFL:MOR","#6F6"],
   ["TFL:MPK","#4F4"],
   ["TFL:MYB","#6F6"],
   ["TFL:NEA","#FF8"],
   ["TFL:NEL","#0F0"],
   ["TFL:NEP","#6F6"],
   ["TFL:NFD","#FF0"],
   ["TFL:NGW","#FF8"],
   ["TFL:NHG","#2F2"],
   ["TFL:NHR","#FF8"],
   ["TFL:NHT","#2F2"],
   ["TFL:NWD","#2F2"],
   ["TFL:NWH","#2F2"],
   ["TFL:NWM","#0F0"],
   ["TFL:OAK","#4F4"],
   ["TFL:OST","#8F8"],
   ["TFL:OVL","#6F6"],
   ["TFL:OXC","#6F6"],
   ["TFL:PAD","#6F6"],
   ["TFL:PGR","#FF8"],
   ["TFL:PIC","#6F6"],
   ["TFL:PIM","#2F2"],
   ["TFL:PLW","#2F2"],
   ["TFL:PRY","#0F0"],
   ["TFL:PUT","#FF8"],
   ["TFL:QBY","#4F4"],
   ["TFL:QPK","#4F4"],
   ["TFL:QWY","#4F4"],
   ["TFL:RCP","#4F4"],
   ["TFL:RED","#6F6"],
   ["TFL:RKY","#FF8"],
   ["TFL:RLN","#FF8"],
   ["TFL:RMD","#FF0"],
   ["TFL:ROD","#FF8"],
   ["TFL:RPK","#6F6"],
   ["TFL:RSQ","#6F6"],
   ["TFL:RUI","#4F4"],
   ["TFL:RUM","#2F2"],
   ["TFL:SEL","#FF8"],
   ["TFL:SFD","#6F6"],
   ["TFL:SFS","#FF0"],
   ["TFL:SGT","#4F4"],
   ["TFL:SHL","#FF8"],
   ["TFL:SHR","#6F6"],
   ["TFL:SJP","#FF4"],
   ["TFL:SJW","#8F8"],
   ["TFL:SKN","#FF0"],
   ["TFL:SKT","#0F0"],
   ["TFL:SNB","#FF4"],
   ["TFL:SPK","#0F0"],
   ["TFL:SRP","#2F2"],
   ["TFL:SSQ","#FF0"],
   ["TFL:STB","#2F2"],
   ["TFL:STG","#FE0"],
   ["TFL:STK","#6F6"],
   ["TFL:STN","#6F6"],
   ["TFL:STP","#6F6"],
   ["TFL:SVS","#6F6"],
   ["TFL:SWC","#FF8"],
   ["TFL:SWK","#4F4"],
   ["TFL:SWM","#FF4"],
   ["TFL:TBE","#6F6"],
   ["TFL:TBY","#8F8"],
   ["TFL:TCR","#8F8"],
   ["TFL:TEM","#FF4"],
   ["TFL:TGR","#2F2"],
   ["TFL:THB","#2F2"],
   ["TFL:THL","#2F2"],
   ["TFL:TPK","#4F4"],
   ["TFL:TPL","#6F6"],
   ["TFL:TTH","#6F6"],
   ["TFL:UPB","#2F2"],
   ["TFL:UPK","#8F8"],
   ["TFL:UPM","#4F4"],
   ["TFL:UPY","#FF0"],
   ["TFL:UXB","#FF0"],
   ["TFL:VIC","#FF8"],
   ["TFL:VUX","#4F4"],
   ["TFL:WAL","#FF4"],
   ["TFL:WAN","#FF8"],
   ["TFL:WAR","#6F6"],
   ["TFL:WAT","#8F8"],
   ["TFL:WBT","#FF4"],
   ["TFL:WCL","#FF8"],
   ["TFL:WCT","#FF8"],
   ["TFL:WDN","#0F0"],
   ["DLR:ban","#FF0"],
   ["DLR:str","#FF0"],
   ["TFL:WFD","#4F4"],
   ["TFL:WFY","#2F2"],
   ["TFL:WGN","#FF4"],
   ["TFL:WHM","#4F4"],
   ["TFL:WJN","#0F0"],
   ["TFL:WKN","#FF4"],
   ["TFL:WLG","#4F4"],
   ["TFL:WLO","#4F4"],
   ["TFL:WMP","#FF8"],
   ["TFL:WMS","#FF8"],
   ["TFL:WPK","#FF8"],
   ["TFL:WSP","#4F4"],
   ["TFL:WST","#6F6"],
   ["DLR:als","#4F4"],
   ["DLR:bec","#FF4"],
   ["DLR:bep","#FF8"],
   ["DLR:bla","#FF4"],
   ["DLR:boc","#4F4"],
   ["DLR:caw","#8F8"],
   ["DLR:cro","#FF8"],
   ["DLR:cuh","#FF4"],
   ["DLR:cus","#FF8"],
   ["DLR:cyp","#6F6"],
   ["DLR:deb","#FF8"],
   ["DLR:der","#4F4"],
   ["DLR:eai","#FF4"],
   ["DLR:elr","#FF8"],
   ["DLR:gar","#8F8"],
   ["DLR:gre","#FF8"],
   ["DLR:heq","#FF4"],
   ["DLR:isg","#FF8"],
   ["DLR:kgv","#FF4"],
   ["DLR:lap","#4F4"],
   ["DLR:lew","#FF4"],
   ["DLR:lim","#4F4"],
   ["DLR:mud","#FF4"],
   ["DLR:pdk","#FF4"],
   ["DLR:pml","#6F6"],
   ["DLR:pop","#6F6"],
   ["DLR:roa","#FF8"],
   ["DLR:rov","#FF4"],
   ["DLR:sha","#6F6"],
   ["DLR:soq","#FF4"],
   ["DLR:tog","#FF4"],
   ["DLR:wes","#6F6"],
   ["DLR:wiq","#6F6"],
   ["DLR:woa","#FF0"],
   ["DLR:wst","#FF4"],
   ["TFL:BGR","#FF8"],
   ["TFL:CNT","#FF4"],
   ["TFL:EFY","#2F2"],
   ["TFL:HDN","#2F2"],
   ["TFL:MCR","#FF8"],
   ["TFL:NWP","#6F6"],
   ["TFL:OLD","#6F6"],
   ["TFL:PADc","#8F8"],
   ["TFL:RUG","#4F4"],
   ["TFL:SWF","#FF4"],
   ["TFL:WAC","#8F8"],
   ["TFL:WEM","#0E0"],
   ["DLR:prr","#FF8"],
   ["TFL:BBB","#6F6"],
   ["TFL:BOR","#2F2"],
   ["TFL:BDE","#FF8"],
   ["TFL:BDS","#8F8"],
   ["TFL:BER","#6F6"],
   ["TFL:BHL","#4F4"],
   ["TFL:BHR","#FF8"],
   ["TFL:BKG","#FF8"],
   ["TFL:BLF","#FF8"],
   ["TFL:BNK","#6F6"],
   ["TFL:BOS","#FF0"],
   ["TFL:BCT","#6F6"],
   ["TFL:BPK","#6F6"],
   ["TFL:BRX","#FF4"],
   ["TFL:BEC","#8F8"],
   ["TFL:BTX","#FF8"],
   ["TFL:BWR","#8F8"],
   ["TFL:BUR","#0F0"],
   ["TFL:BST","#FF8"],
   ["TFL:GPK","#4F4"],
   ["TFL:HNW","#FF8"],
   ["TFL:LSQ","#6F6"],
   ["TFL:OLY","#8F8"],
   ["TFL:PER","#2F2"],
   ["TFL:SBC","#6F6"],
   ["TFL:WHR","#6F6"],
   ["TFL:WRP","#FF0"],
   ["TFL:TOT","#2F2"],
   ["DLR:cat","#FF4"],
   ["TFL:HST","#FF8"],
   ["TFL:FYC","#FB0"]];

};

$(function() {
  $( "#datepicker" ).datepicker({ defaultDate: 1 , firstDay: 1  });
});
