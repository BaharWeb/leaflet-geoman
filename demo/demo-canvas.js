const tiles1 = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

const tiles2 = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

const tiles3 = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);

const map2 = L.map('example2', { preferCanvas: true })
  .setView([51.505, -0.09], 13)
  .addLayer(tiles1);
const map3 = L.map('example3', { preferCanvas: true })
  .setView([51.505, -0.09], 13);
const map4 = L.map('example4', { preferCanvas: true })
  .setView([51.505, -0.09], 13)
  .addLayer(tiles3);
// map2.dragging.disable();

// map2.on('pm:create', function(e) {
//     // alert('pm:create event fired. See console for details');
//     console.log(e);

//     const layer = e.layer;
//     layer.on('pm:cut', function(ev) {
//         console.log('cut event on layer');
//         console.log(ev);
//     });
// });
// map2.on('pm:cut', function(e) {
//     console.log('cut event on map');
//     console.log(e);
// });
// map2.on('pm:remove', function(e) {
//     console.log('pm:remove event fired. See console for details');
//     // alert('pm:remove event fired. See console for details');
//     console.log(e);
// });
// map2.on('pm:drawstart', function(e) {
//     console.log(e);
//     console.log(e.workingLayer);
// });

const m1 = L.circleMarker([51.50313, -0.091223], { radius: 10 });
const m2 = L.marker([51.50614, -0.0989]);
const m3 = L.marker([51.50915, -0.096112], { pmIgnore: true });

const mGroup = L.layerGroup([m1, m2, m3]).addTo(map2);
mGroup.pm.enable();

map2.pm.addControls({
  drawMarker: false,
  drawPolygon: true,
  editMode: false,
  drawPolyline: false,
  removalMode: true,
});
// map2.pm.addControls({
//     drawMarker: false,
//     drawPolygon: true,
//     editMode: false,
//     drawPolyline: false,
//     removalMode: false,
// });
// map2.pm.addControls({
//     drawMarker: true,
//     drawPolygon: false,
//     editMode: false,
//     drawPolyline: false,
//     removalMode: true,
// });
map2.pm.addControls({
  drawMarker: true,
  drawPolygon: true,
  editMode: true,
  drawPolyline: true,
  removalMode: true,
});

map2.pm.disableDraw('Polygon');
// map2.pm.enableDraw('Circle', {
//     snappable: true,
//     cursorMarker: true
// });

map2.pm.enableDraw('Line', { allowSelfIntersection: false });
map2.pm.enableDraw('Polygon', { allowSelfIntersection: false });

map2.on('pm:globaleditmodetoggled', function (e) {
  // console.log(e);
});

// GEOSJON EXAMPLE

const geoJsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.15483856201171872, 51.527329038465936],
            [-0.16977310180664062, 51.51643437722083],
            [-0.15964508056640625, 51.50094238217541],
            [-0.13149261474609375, 51.5042549065934],
            [-0.11758804321289061, 51.518463972439385],
            [-0.13303756713867188, 51.53106680201548],
            [-0.15483856201171872, 51.527329038465936],
          ],
        ],
      },
    },
  ],
};

// const geoJsonButton = document.getElementById('test-geojson');
const geoJsonLayer = L.geoJson(null, { pmIgnore: false });
geoJsonLayer.addTo(map2);
geoJsonLayer.addData(geoJsonData);
// geoJsonLayer.pm.toggleEdit({
//     draggable: true,
//     snappable: true,
// });

map3.pm.addControls({
  drawMarker: true,
  drawPolygon: true,
  editMode: true,
  removalMode: true,
  drawPolyline: true,
});

const markerStyle = {
  opacity: 0.5,
  draggable: false,
};

map3.pm.enableDraw('Polygon', {
  snappable: true,
  templineStyle: {
    color: 'blue',
  },
  hintlineStyle: {
    color: 'blue',
    dashArray: '5,5',
  },
  pathOptions: {
    color: 'red',
    fillColor: 'orange',
    fillOpacity: 0.7,
  },
  markerStyle: markerStyle,
  cursorMarker: false,
  // finishOn: 'contextmenu',
  finishOnDoubleClick: true,
});

var scotland = L.polygon([
  [
    [60, -13],
    [60, 0],
    [50, 4],
    [50, -13],
  ],
  [
    [55.7, -4.5],
    [56, -4.5],
    [56, -4],
    [55.7, -4],
  ],
]);
scotland.addTo(map3);

const bounds = scotland.getBounds();

map3.fitBounds(bounds);

geoJsonLayer.addEventListener('click', function (e) {
  geoJsonLayer.pm.toggleEdit();
});

geoJsonLayer.on('pm:edit', function (e) {
  console.log(e);
});

geoJsonLayer.on('pm:dragstart', function (e) {
  console.log(e);
});
// geoJsonLayer.on('pm:drag', function(e) {
//     console.log(e);
// });
geoJsonLayer.on('pm:dragend', function (e) {
  console.log(e);
});

map2.on('pm:drawstart', function (e) {
  var layer = e.workingLayer;
  // console.log(layer);
  layer.on('pm:centerplaced', function (e) {
    // console.log(e);
  });
});
map2.on('pm:create', function (e) {
  var layer = e.layer;
  // console.log(layer);
  layer.on('pm:centerplaced', function (e) {
    // console.log(e);
  });
});

// Polygon Example

const polygonLayer = L.polygon([
  [51.509, -0.08],
  [51.503, -0.06],
  [51.51, -0.047],
])
  .addTo(map3)
  .addTo(map2);
polygonLayer.pm.toggleEdit({
  allowSelfIntersection: false,
});

polygonLayer.on('pm:update', function (e) {
  console.log(e);
});

polygonLayer.on('pm:intersect', function (e) {
  console.log(e);
});

map2.pm.toggleGlobalEditMode({
  allowSelfIntersection: false,
});
map2.pm.disableGlobalEditMode();

map2.on('pm:create', function (e) {
  e.layer.pm.enable({ allowSelfIntersection: false });
  // e.layer.pm.disable();
  // console.log(e.layer.pm.hasSelfIntersection());

  e.layer.on('pm:markerdragend', function (e) {
    // console.log(e);
  });

  e.layer.on('pm:update', function (e) {
    console.log(e);
  });

  e.layer.on('pm:cut', function (e) {
    console.log(e);
  });
});

map2.on('pm:drawstart', function (e) {
  var layer = e.workingLayer;
  layer.on('pm:vertexadded', function (e) {
    // console.log(e);
    // console.log(e.workingLayer.pm.hasSelfIntersection());
  });
});

polygonLayer.on('pm:vertexadded', function (e) {
  // console.log(e);
});
polygonLayer.on('pm:vertexremoved', function (e) {
  // console.log(e);
});

polygonLayer.on('pm:markerdragstart', function (e) {
  // console.log(e);
});

// Layer Group Example

const layerGroupItem1 = L.polyline([
  [51.51, -0.09],
  [51.513, -0.08],
  [51.514, -0.11],
]);
//const layerGroupItem2 = L.polygon([
//  [51.52, -0.06],
//  [51.51, -0.07],
//  [51.52, -0.05],
//]);

const layerGroupItem3 = L.polygon([
  [51.51549835365031, -0.06450164634969281],
  [51.51944818307178, -0.08425079345703125],
  [51.51868369995795, -0.06131630004205801],
  [51.51549835365031, -0.06450164634969281],
]);

const feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [72.839012, 19.058873],
        [72.92038, 19.066985],
        [72.856178, 19.019928],
        [72.839012, 19.058873],
      ],
    ],
  },
};

const layerGroup = L.featureGroup([layerGroupItem1]).addTo(map4);
layerGroup.pm.toggleEdit({
  draggable: true,
  snappable: true,
  snapDistance: 30,
});
const someLayer = L.geoJSON(feature);

layerGroup.addLayer(someLayer);

someLayer.addData(feature);
console.log(layerGroup);

layerGroup.on('pm:snap', function (e) {
  console.log('snap');
  console.log(e);
});
layerGroup.on('pm:unsnap', function (e) {
  console.log('unsnap');
  console.log(e);
});

map4.pm.addControls({
  position: 'topright',
});

map4.pm.enableDraw('Polygon', {
  finishOn: 'mouseout',
});
map4.pm.disableDraw('Polygon');

map4.pm.enableDraw('Marker', {
  snappable: false,
});
map4.pm.disableDraw('Marker');

// map4.pm.setPathOptions({
//     color: 'orange',
//     fillColor: 'green',
//     fillOpacity: 0.4,
// });

//layerGroup.addLayer(layerGroupItem2);
//layerGroup.addLayer(layerGroupItem3);
// layerGroup.addLayer(layerGroupItem4);
// layerGroup.addLayer(layerGroupItem5);

layerGroup.on('pm:dragstart', function (e) {
  console.log(e);
});
layerGroup.on('pm:drag', function (e) {
  console.log(e);
});
layerGroup.on('pm:dragend', function (e) {
  console.log(e);
});
layerGroup.on('pm:markerdragstart', function (e) {
  console.log(e);
});
layerGroup.on('pm:markerdragend', function (e) {
  console.log(e);
});

function logEvent(e) {
  console.log(e);
}

var p = L.polygon([[51.51364748733509,-0.14456651401905998], [51.51364748733509,-0.14091870975880608], [51.515149755456754, -0.14091870975880608], [51.515149755456754, -0.14456651401905998]]).addTo(map4);
var q = L.polygon([[51.5121451758625, -0.14091870975880608], [51.5121451758625, -0.13727090549855214], [51.51364749352824, -0.13727090549855214], [51.51364749352824, -0.14091870975880608]]).addTo(map4);
var r = L.polygon([[51.51364749352822, -0.14091870975880608], [51.51364749352822, -0.13727090549855214], [51.515149761649646, -0.13727090549855214], [51.515149761649646, -0.14091870975880608]]).addTo(map4);
var s = L.polygon([[51.51364748733509,-0.13727090549855214], [51.51364748733509, -0.13362310123829824], [51.515149755456754, -0.13362310123829824], [51.515149755456754, -0.13727090549855214]]).addTo(map4);

p.feature = {};
p.feature.type = 'Feature';
p.feature.properties = {};
p.feature.properties.width = "680";
p.feature.properties.height = "450";
p.feature.properties.scale = "2000";
p.feature.properties.dpi = "test";
p.feature.properties.plotRequestId = 1;
p.feature.id = 19;

q.feature = {};
q.feature.type = 'Feature';
q.feature.properties = {};
q.feature.properties.width = "680";
q.feature.properties.height = "450";
q.feature.properties.scale = "2000";
q.feature.properties.dpi = "test";
q.feature.properties.plotRequestId = 2;
q.feature.id = 20;

r.feature = {};
r.feature.type = 'Feature';
r.feature.properties = {};
r.feature.properties.width = "680";
r.feature.properties.height = "450";
r.feature.properties.scale = "2000";
r.feature.properties.dpi = "test";
r.feature.properties.plotRequestId = 3;
r.feature.id = 21;

s.feature = {};
s.feature.type = 'Feature';
s.feature.properties = {};
s.feature.properties.width = "680";
s.feature.properties.height = "450";
s.feature.properties.scale = "2000";
s.feature.properties.dpi = "test";
s.feature.properties.plotRequestId = 3;
s.feature.id = 22;



$("#plotRequest").click(function () {

  // this will only raise an event to check the user`s credit to place the plot on the map
  map4.pm._fireBeforePlotRequestPlaced(true, 880, 650, 2000, "Some Comment");

})


$("#plotRequestMarkers").click(function () {

  // Add markers to existing plots on the map
  L.PM.Utils._addMarkers(map4, p);
 
  L.PM.Utils._addMarkers(map4, r);
  L.PM.Utils._addMarkers(map4, q);
  L.PM.Utils._addMarkers(map4, s);
  //L.PM.Utils._test();
})

$("#plotRequestDelete").click(function () {
  map4.pm.toggleGlobalRemovalMode();

})


$("#plotRequestCancel").click(function () {

  // To cancel the plot request
  L.PM.Utils._plotDisable();

})

// Catch the event and check the credit. If confirmed then call _plotRequest() else call _disable()
map4.on('pm:beforeplotrequestplaces', (e) => {

  // If this the first plot on the map
  if (e.initial == true) {
    L.PM.Utils._plotRequest(map4, e, { "plotRequestId": 40 });
  } else {
    
    // If this plot is added to to an existing plot (by clicking on the map)
    L.PM.Utils._addExtraPlot(e.onMarkerClick)
   
  }

});

map4.on('pm:create', (e) => {
  //console.log(e);
  if (e.shape == "Plot") {
    L.PM.Utils._test();

  }
});

//$(document).keyup(function (e) { L.PM.Utils._plotDisable});

//$(document).ready(function () {
//  map4.pm._fireBeforePlotRequestPlaced(true, 880, 650, 2000, "Some Comment");
//});

