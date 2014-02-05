var map;
var busStopList;
var busStopLayers = [];
var tramStopList;
var tramStopLayers = [];

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
	
	// call once to initiate, then call whenever you move the map
	onMapMove();
	map.on('moveend', onMapMove);

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

function onMapMove(e) {
	// askForBusStops();
	askForTramStops();
}

$(function() {
  $( "#datepicker" ).datepicker({ defaultDate: 1 , firstDay: 1  });
});
