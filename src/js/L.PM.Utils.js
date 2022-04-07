import { createGeodesicPolygon, getTranslation } from './helpers';
import { _toLatLng, _toPoint } from './helpers/ModeHelper';

const Utils = {
  calcMiddleLatLng(map, latlng1, latlng2) {
    // calculate the middle coordinates between two markers

    const p1 = map.project(latlng1);
    const p2 = map.project(latlng2);

    return map.unproject(p1._add(p2)._divideBy(2));
  },
  findLayers(map) {
    let layers = [];
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Polyline ||
        layer instanceof L.Marker ||
        layer instanceof L.Circle ||
        layer instanceof L.CircleMarker ||
        layer instanceof L.SldMarker||
        layer instanceof L.ImageOverlay
      ) {
        layers.push(layer);
      }
    });

    // filter out layers that don't have the leaflet-geoman instance
    layers = layers.filter((layer) => !!layer.pm);

    // filter out everything that's leaflet-geoman specific temporary stuff
    layers = layers.filter((layer) => !layer._pmTempLayer);

    // filter out everything that ignore leaflet-geoman
    layers = layers.filter(
      (layer) =>
        (!L.PM.optIn && !layer.options.pmIgnore) || // if optIn is not set / true and pmIgnore is not set / true (default)
        (L.PM.optIn && layer.options.pmIgnore === false) // if optIn is true and pmIgnore is false);
    );

    return layers;
  },
  circleToPolygon(circle, sides = 60, withBearing = true) {
    const origin = circle.getLatLng();
    const radius = circle.getRadius();
    const polys = createGeodesicPolygon(origin, radius, sides, 0, withBearing); // these are the points that make up the circle
    const polygon = [];
    for (let i = 0; i < polys.length; i += 1) {
      const geometry = [polys[i].lat, polys[i].lng];
      polygon.push(geometry);
    }
    return L.polygon(polygon, circle.options);
  },
  disablePopup(layer) {
    if (layer.getPopup()) {
      layer._tempPopupCopy = layer.getPopup();
      layer.unbindPopup();
    }
  },
  enablePopup(layer) {
    if (layer._tempPopupCopy) {
      layer.bindPopup(layer._tempPopupCopy);
      delete layer._tempPopupCopy;
    }
  },
  _fireEvent(layer, type, data, propagate = false) {
    layer.fire(type, data, propagate);
    // fire event to all parent layers
    const { groups } = this.getAllParentGroups(layer);
    groups.forEach((group) => {
      group.fire(type, data, propagate);
    });
  },
  getAllParentGroups(layer) {
    const groupIds = [];
    const groups = [];

    // get every group layer once
    const loopThroughParents = (_layer) => {
      for (const _id in _layer._eventParents) {
        if (groupIds.indexOf(_id) === -1) {
          groupIds.push(_id);
          const group = _layer._eventParents[_id];
          groups.push(group);
          loopThroughParents(group);
        }
      }
    };

    // check if the last group fetch is under 1 sec, then we use the groups from before
    if (
      !layer._pmLastGroupFetch ||
      !layer._pmLastGroupFetch.time ||
      new Date().getTime() - layer._pmLastGroupFetch.time > 1000
    ) {
      loopThroughParents(layer);
      layer._pmLastGroupFetch = {
        time: new Date().getTime(),
        groups,
        groupIds,
      };
      return {
        groupIds,
        groups,
      };
    }
    return {
      groups: layer._pmLastGroupFetch.groups,
      groupIds: layer._pmLastGroupFetch.groupIds,
    };
  },
  createGeodesicPolygon,
  getTranslation,
  findDeepCoordIndex(arr, latlng) {
    // find latlng in arr and return its location as path
    // thanks for the function, Felix Heck
    let result;

    const run = (path) => (v, i) => {
      const iRes = path.concat(i);

      if (v.lat && v.lat === latlng.lat && v.lng === latlng.lng) {
        result = iRes;
        return true;
      }

      return Array.isArray(v) && v.some(run(iRes));
    };
    arr.some(run([]));

    let returnVal = {};

    if (result) {
      returnVal = {
        indexPath: result,
        index: result[result.length - 1],
        parentPath: result.slice(0, result.length - 1),
      };
    }

    return returnVal;
  },
  _getIndexFromSegment(coords, segment) {
    if (segment && segment.length === 2) {
      const indexA = this.findDeepCoordIndex(coords, segment[0]);
      const indexB = this.findDeepCoordIndex(coords, segment[1]);
      let newIndex = Math.max(indexA.index, indexB.index);
      if ((indexA.index === 0 || indexB.index === 0) && newIndex !== 1) {
        newIndex += 1;
      }
      return {
        indexA,
        indexB,
        newIndex,
        indexPath: indexA.indexPath,
        parentPath: indexA.parentPath,
      };
    }
    return null;
  },
  // Returns the corners of the rectangle with a given rotation
  // degrees: Between marker A and the marker counterclockwise before. Same for marker B
  _getRotatedRectangle(A, B, rotation, map) {
    const startPoint = _toPoint(map, A);
    const endPoint = _toPoint(map, B);
    const theta = (rotation * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const width =
      (endPoint.x - startPoint.x) * cos + (endPoint.y - startPoint.y) * sin;
    const height =
      (endPoint.y - startPoint.y) * cos - (endPoint.x - startPoint.x) * sin;
    const x0 = width * cos + startPoint.x;
    const y0 = width * sin + startPoint.y;
    const x1 = -height * sin + startPoint.x;
    const y1 = height * cos + startPoint.y;

    const p0 = _toLatLng(map, startPoint);
    const p1 = _toLatLng(map, { x: x0, y: y0 });
    const p2 = _toLatLng(map, endPoint);
    const p3 = _toLatLng(map, { x: x1, y: y1 });
    return [p0, p1, p2, p3];
  },
  pxRadiusToMeterRadius(radiusInPx, map, center) {
    const pointA = map.project(center);
    const pointB = L.point(pointA.x + radiusInPx, pointA.y);
    return map.distance(map.unproject(pointB), center);
  },

  // This is the first function to call for plot request
  _plotRequest(map, args) {
    //this._itt = 0
    this._map = map;
    this._width = args.width;
    this._height = args.height;
    this._scale = args.scale;
    
    //this._map.on('keydown', this._plotDisable, this);

    // this is the hintmarker on the mouse cursor
    this._hintMarker = L.marker([0, 0], {
      zIndexOffset: 110,
      icon: L.divIcon({ iconUrl: '../assets/icons/Blue_rectangle.png' }),
    });

    this._hintMarker.options.pane = (this._map.pm.globalOptions.panes && this._map.pm.globalOptions.panes.vertexPane) || 'vertexPane';
    this._hintMarker._pmTempLayer = true;

    this._layer = this._hintMarker;

    // this is the hintpolygon on the mouse cursor
    var plotLatlngs = this._drawPlotOutline(this._width, this._height, this._scale);
    this._hintPlot = L.polygon(plotLatlngs).addTo(this._map);

    //this._hintMarkerGroup = new L.LayerGroup();
    //this._hintMarkerGroup._pmTempLayer = true;
    //this._map.addLayer(this._hintMarkerGroup);

    //this._map.options.snapIgnore = false;
    //this._map.options.pmIgnore = true;

    //var hintMarkers = Utils._findCoords(this._hintPlot._latlngs[0]);

    //hintMarkers.forEach(markerLatLng => Utils._addhintMarkerGroup(markerLatLng[0]));
    
    // fire drawstart event
    Utils._fireEvent(this._map, 'pm:drawstart', { source: "Draw", shape: "Plot" });

    // Sync hint marker with mouse cursor
    this._map.on('mousemove', this._syncHintMarker, this);

    // Create the final Polygon on click
    this._map.on('click', function () { Utils._drawPlot(args)}, this);

  },

  //_addhintMarkerGroup: function (latlng) {

  //  var marker = new L.Marker(latlng, {
  //    draggable: true,
  //    icon: L.divIcon({ className: 'icon-add-plot-reques' }),
  //  });

  //  marker.pm.enable({
  //    snappable: true,
  //  });

  //  this._hintMarkerGroup.addLayer(marker);
  //},


  scaleToZoomLevel : function (scale) {
    switch (scale) {
      case 1000000:
        return 9;
      case 500000:
        return 10;
      case 250000:
        return 11;
      case 150000:
        return 12;
      case 70000:
        return 13;
      case 35000:
        return 14;
      case 15000:
        return 15;
      case 8000:
        return 16;
      case 4000:
        return 17;
      case 2000:
        return 18;
      case 1000:
        return 19;
      case 500:
        return 20;
    }

    // We should return some suitable default.
    return 18;
  },

  // Draw the final plot and markers
  _drawPlot: function (args) {

    var latlngs = this._drawPlotOutline(this._width, this._height, this._scale);
    var plot = L.polygon(latlngs).addTo(this._map);
    this._plot = plot;
    

    // If the plot is removed then remove the attached markers
    plot.on('pm:remove', Utils._removeMarkers, this);
    //this._itt = this._itt + 1;
    plot.feature = {};
    plot.feature.type = 'Feature';
    plot.feature.shape = "Plot";
    plot.feature.properties = {};
    plot.feature.properties.width = args.width;
    plot.feature.properties.height = args.height;
    plot.feature.properties.scale = args.scale;
    plot.feature.properties.dpi = args.dpi;
    plot.feature.properties.plotRequestId = args.plotRequestId;
    //plot.feature.properties.plotRequestId = this._itt;
    plot.feature.properties.template = args.template;
    

    // Add plotGroup to map
    this._plotGroup = new L.LayerGroup();
    this._plotGroup._pmTempLayer = true;
    this._map.addLayer(this._plotGroup);

    this._plotGroup.addLayer(plot);

    // comment them out to avoid creating markers if a plot placement is failed

    //// Find center of each edge to place a marker
    //const markerCoords = this._findCoords(plot._latlngs[0]);

    //// if this._markerGroups exists then remove it 
    //if (this._map.hasLayer(this._markerGroup)) { this._map.removeLayer(this._markerGroup) };

    //// Add markerGroup to map, markerGroup includes the middle markers
    //this._markerGroup = new L.LayerGroup();
    //this._markerGroup._pmTempLayer = true;
    //this._map.addLayer(this._markerGroup);

    //// create markers on each edge of rectangle
    //this._markers = [];

    //markerCoords.forEach(markerLatLng => this._createMarker(markerLatLng, markerLatLng[1], "none", this, plot._leaflet_id, args.width, args.height, args.scale, args.dpi, args.plotRequestId, args.template));

    // Remove hintmarker and hintpolygon and unbind the click events
    this._hintMarker.remove();
    this._hintPlot.remove();
    this._map.off('click');
    this._map.off('mousemove', this._syncHintMarker, this);

    // comment them out to avoid creating markers if a plot placement is failed

    //this._markers.forEach(marker => marker[0].on('click', function (e) {
    //  Utils._fireEvent(this._map, 'pm:beforeplotrequestplaces', {
    //    index: this.index,
    //    initial: false,
    //    onMarkerClick: { markerLatlng: marker[0]._latlng, position: marker[1], clickedMarker: this, width: marker[2], height: marker[3], scale: marker[4], dpi: marker[5], plotItemId: marker[6], plotRequestId :marker[7], template: marker[8]}
    //  });
    //}));

    // fire drawend event
    Utils._fireEvent(this._map, 'pm:drawend', { shape: "Plot", source: "Draw" });
    // fire the pm:create event and pass shape and layer
    Utils._fireEvent(this._map, 'pm:create', { shape: "Plot", source: "Draw", layer: plot, args: args });
  },

  // for testing the add marker function
  _test: function () {
    Utils._addMarkers(this._map, this._plot);
    Utils._addMarkers(this._map, this._addedPlot);
  },
  
  // Add extra plots on marker click
  _addExtraPlot: function (e) {
    //this._itt = this._itt + 1;
    var ratio = e.height / e.width;
    var pixOffsetX = e.width / 2;
    var pixOffsetY = pixOffsetX * ratio;
    var mapZoom = Utils.scaleToZoomLevel(this._scale);
    var currentMarker = this._map.project(e.markerLatlng, mapZoom);
    switch (e.position) {
      case "up":
      
        var overlayCenter = this._map.unproject(L.point([currentMarker.x, currentMarker.y - pixOffsetY]), mapZoom);
        break;
      case "left":
       
        var overlayCenter = this._map.unproject(L.point([currentMarker.x - pixOffsetX, currentMarker.y]), mapZoom);
        break;
      case "right":
        
        var overlayCenter = this._map.unproject(L.point([currentMarker.x + pixOffsetX, currentMarker.y]), mapZoom);
        break;
      case "bottom":
       
        var overlayCenter = this._map.unproject(L.point([currentMarker.x, currentMarker.y + pixOffsetY]), mapZoom);
        break;
    };
    var centerPoint = this._map.project(overlayCenter, mapZoom);
    var latLng1 = this._map.unproject(L.point([centerPoint.x - pixOffsetX, centerPoint.y + pixOffsetY]), mapZoom);
    var latLng2 = this._map.unproject(L.point([centerPoint.x + pixOffsetX, centerPoint.y - pixOffsetY]), mapZoom);
    var bbox = L.latLngBounds(latLng1, latLng2);
    var addedPlot = L.polygon([bbox.getSouthWest(), bbox.getSouthEast(), bbox.getNorthEast(), bbox.getNorthWest()]).addTo(this._map);

    if (!this._map.hasLayer(this._plotGroup)) {
      // Add plotGroup to map
      this._plotGroup = new L.LayerGroup();
      this._plotGroup._pmTempLayer = true;
      this._map.addLayer(this._plotGroup);
    }

    this._plotGroup.addLayer(addedPlot);
    this._addedPlot = addedPlot;
    // If the plot is removed then remove the attached markers
    addedPlot.on('pm:remove', this._removeMarkers, this);
    
    addedPlot.feature = {};
    addedPlot.feature.type = 'Feature';
    addedPlot.feature.shape = "Plot";
    addedPlot.feature.properties = {};
    addedPlot.feature.properties.width = e.width;
    addedPlot.feature.properties.height = e.height;
    addedPlot.feature.properties.scale = e.scale;
    addedPlot.feature.properties.dpi = e.dpi;
    //addedPlot.feature.properties.plotRequestId = this._itt;
    addedPlot.feature.properties.plotRequestId = e.plotRequestId;
    addedPlot.feature.properties.template = e.template;


    //// check to remove any extra marker

    //this._map.eachLayer((plot) => {
    //  if (plot instanceof L.Polygon && plot._latlngs[0].length == 4) {
    //    if (plot.feature.properties.plotRequestId != addedPlot.feature.properties.plotRequestId) {
    //      var addedPlotCoords = Utils._findCoords(addedPlot._latlngs[0]);

    //      addedPlotCoords.forEach(coord => {
    //        for (var i = 0; i < this._markerGroup.length; i++) {
    //          if (this._markerGroup[i][0].distanceTo(coord[0]) < 0.05) {
              
    //            this._markerGroup.getLayers()[i].off('click');
    //            this._markerGroup.removeLayer(this._markerGroup.getLayers()[i]);
    //            this._markers.splice(i, 1);

    //          }
    //        }
    //      });
    //    }
    //  }
    //});


    // comment them out to avoid creating markers if a plot placement is failed
    //var addedmarkerCoords = Utils._findCoords(addedPlot._latlngs[0]);
    //addedmarkerCoords.forEach(markerLatLng => this._createMarker(markerLatLng, markerLatLng[1], e.onMarkerClick.position, this, addedPlot._leaflet_id, e.onMarkerClick.width, e.onMarkerClick.height, e.onMarkerClick.scale, e.onMarkerClick.dpi, e.onMarkerClick.plotRequestId, e.onMarkerClick.template ));
    
    //this._markers.forEach(marker => marker[0].off('click').on('click', function (e) {
    //  Utils._fireEvent(this._map, 'pm:beforeplotrequestplaces', {
    //    index: this.index,
    //    initial: false,
    //    onMarkerClick: { markerLatlng: marker[0]._latlng, position: marker[1], clickedMarker: this, width: marker[2], height: marker[3], scale: marker[4], dpi: marker[5], plotItemId: marker[6], plotRequestId :marker[7], template: marker[8]}
    //  });

    //}));

    // Remove the clicked marker and all its events
    e.clickedMarker.off('click');
    e.clickedMarker.remove();

    // fire drawend event
    Utils._fireEvent(this._map, 'pm:drawend', { shape: "Plot", source: "Draw" });
    // fire the pm:create event and pass shape and layer
    Utils._fireEvent(this._map, 'pm:create', { shape: "Plot", source: "Draw", layer: addedPlot, args: e});
  },

  _removeMarkers: function (e) {
    this._plotGroup.removeLayer(e.layer);
    this._map.removeLayer(e.layer);
    this._markerGroup.clearLayers();

    // create markers on each edge of rectangle
    this._markers = [];
    var width;
    var height;
    this._map.eachLayer((layer) => {
      if (layer instanceof L.Polygon && layer._latlngs[0].length == 4) {

        var dpi = layer.feature.properties.dpi;
        var scale = layer.feature.properties.scale;
        var plotRequestId = layer.feature.properties.plotRequestId;
        var plotItemId = layer.feature.id;
        var template = layer.feature.properties.template;

        var markerCoords = Utils._findCoords(layer._latlngs[0]);

        // check if there is a overlap plot
        this._map.eachLayer((plot) => {
          if (plot instanceof L.Polygon && plot._latlngs[0].length == 4) {

            if (plot.feature.id != plotItemId) {
              var plotCoords = Utils._findCoords(plot._latlngs[0]);
              plotCoords.forEach(coord => {
                for (var i = 0; i < markerCoords.length; i++) {
                  if (markerCoords[i][0].distanceTo(coord[0]) < 0.05) { markerCoords.splice(i, 1); }
                }
              });
            }
          }
        });

        
        var edges = []
        var mapZoom = Utils.scaleToZoomLevel(this._scale);
        layer._latlngs[0].forEach(latlng => edges.push(this._map.project(latlng, mapZoom)));

        width = Math.sqrt(Math.pow(edges[1].x - edges[0].x, 2) + Math.pow(edges[1].y - edges[0].y, 2));
        height = Math.sqrt(Math.pow(edges[2].x - edges[1].x, 2) + Math.pow(edges[2].y - edges[1].y, 2));

        markerCoords.forEach(markerLatLng => Utils._createMarker(markerLatLng, markerLatLng[1], "none", this, width, height, scale, dpi, plotItemId,plotRequestId, template));
        this._plotGroup.addLayer(layer);

        layer.on('pm:remove', Utils._removeMarkers, this);
      }
    });
    
    this._markers.forEach(marker => marker[0].off('click').on('click', function (e) {
      Utils._fireEvent(this._map, 'pm:beforeplotrequestplaces', {
        index: this.index,
        initial: false,
        onMarkerClick: { markerLatlng: marker[0]._latlng, position: marker[1], clickedMarker: this, width: marker[2], height: marker[3], scale: marker[4], dpi: marker[5], plotItemId: marker[6], plotRequestId: marker[7], template: marker[8], sourceLayer: marker[9]},

      });
    }))
  },

  // Draw the hintpolygone and final plot after click
  _drawPlotOutline: function (width, height, scale) {
    var mapZoom = this.scaleToZoomLevel(scale);
    var overlayCenter = this._hintMarker._latlng;
    var ratio = height / width;
    var pixOffsetX = width / 2;
    var pixOffsetY = pixOffsetX * ratio;
    var centerPoint = this._map.project(overlayCenter, mapZoom);
    var latLng1 = this._map.unproject(L.point([centerPoint.x - pixOffsetX, centerPoint.y + pixOffsetY]), mapZoom);
    var latLng2 = this._map.unproject(L.point([centerPoint.x + pixOffsetX, centerPoint.y - pixOffsetY]), mapZoom);
    var bbox = L.latLngBounds(latLng1, latLng2);
    return [bbox.getSouthWest(), bbox.getSouthEast(), bbox.getNorthEast(), bbox.getNorthWest()];
  },

  _syncHintMarker(e) {
    // move the cursor marker
    this._hintMarker.setLatLng(e.latlng);
    this._hintPlot.setLatLngs(this._drawPlotOutline(this._width, this._height, this._scale));

    //var vertix = this._drawPlotOutline(this._width, this._height, this._scale);

    //this._hintMarkerGroup.clearLayers();
    //vertix.forEach(markerLatLng => Utils._addhintMarkerGroup(markerLatLng));
  },

  // Find the coordinates of the new markers and the position of related edge (up,bottom,left,right)
  _findCoords(plotCoords) {
    let markerCoords = [];
    
    for (let i = 0; i < plotCoords.length; i++){

      if (i == plotCoords.length-1) {
        let pointA = new L.LatLng(plotCoords[i].lat, plotCoords[i].lng);
        let pointB = new L.LatLng(plotCoords[0].lat, plotCoords[0].lng);
        let center = [L.polyline([pointA, pointB]).getBounds().getCenter(), "left"];
        markerCoords.push(center)
      } else {
        let pointA = new L.LatLng(plotCoords[i].lat, plotCoords[i].lng);
        let pointB = new L.LatLng(plotCoords[i + 1].lat, plotCoords[i + 1].lng);
        let center;

        switch (i) {
          case 0:
            center = [L.polyline([pointA, pointB]).getBounds().getCenter(), "bottom"];
            markerCoords.push(center);
            break;
          case 1:
            center = [L.polyline([pointA, pointB]).getBounds().getCenter(), "right"];
            markerCoords.push(center);
            break;
          case 2:
            center = [L.polyline([pointA, pointB]).getBounds().getCenter(), "up"];
            markerCoords.push(center);
            break;
        }
        
      }
    }
    return markerCoords;
  },

  // creates initial markers. Input: marker's coordinates, marker's position (from the _findCoords()), position of clicked marker
  // We also need the plot Id for removing the associated markers with each delete plot later
  _createMarker(latlng, position, clickedEdge, index, width, height, scale, dpi, plotItemId, plotRequestId, template, layer) {
    var clickedMarkerPosition;
    var clickedCondition = !(latlng[1] == "bottom" && clickedEdge == "up") && !(latlng[1] == "right" && clickedEdge == "left") && !(latlng[1] == "left" && clickedEdge == "right") && !(latlng[1] == "up" && clickedEdge == "bottom");

    const marker = new L.Marker(latlng[0], {
      draggable: false,
      icon: L.divIcon({ className: 'icon-add-plot-request' }),
    });

    //for (let i = 0; i < this._markers.length; i++) {
    //  if (this._markers[i][6] == plotItemId && this._markers[i][1] == position) {
    //    return;
    //  }
    //}
    
    
    // comment out that part would solve the toggle issue
    for (let i = 0; i < this._markerGroup.getLayers().length ; i++) {
      if (clickedCondition && this._markerGroup.getLayers()[i].getLatLng().distanceTo(latlng[0]) < 0.05 ) {
        clickedMarkerPosition = latlng[1];
      }
    };

    if (clickedMarkerPosition != latlng[1] && clickedCondition) {
      marker.options.pane = (this._map.pm.globalOptions.panes && this._map.pm.globalOptions.panes.vertexPane) || 'markerPane';
      marker._origLatLng = latlng[0];
      marker._index = index;
      marker._pmTempLayer = true;
      this._markerGroup.addLayer(marker);
      this._markers.push([marker, position, width, height, scale, dpi, plotItemId, plotRequestId, template,layer]);
    }

    
    
    return;
  },

  _plotDisable() {
    //// Remove the marker and plot layer group
    //this._map.removeLayer(this._markerGroup);
    //this._map.removeLayer(this._plotGroup);
   
    // Unbind the click and mousemove events 
    this._map.off('click')
    this._map.off('mousemove', this._syncHintMarker, this);

    this._hintMarker.remove();
    this._hintPlot.remove();
  },

  // Add markers to the existing plots on the map
  _addMarkers(map, layer) {

    this._map = map;
    var width = layer.feature.properties.width;
    var height = layer.feature.properties.height;
    var scale = layer.feature.properties.scale;
    var dpi = layer.feature.properties.dpi;
    var plotRequestId = layer.feature.properties.plotRequestId;
    var plotItemId = layer.feature.id
    var template = layer.feature.properties.template;
    
    if (!this._map.hasLayer(this._markerGroup)) {
      // Add plotGroup to map
      this._markerGroup = new L.LayerGroup();
      this._markerGroup._pmTempLayer = true;
      this._map.addLayer(this._markerGroup);
    }

    if (typeof(this._markers) == 'undefined') { this._markers = [];};
    // create markers on each edge of rectangle
    
    var markerCoords = Utils._findCoords(layer._latlngs[0]);
   
    //// check if there is a overlap plot
    //map.eachLayer((plot) => {
    //  if (plot instanceof L.Polygon && plot._latlngs[0].length == 4) {
    //    if (plot.feature.id != plotItemId) {
    //      var plotCoords = Utils._findCoords(plot._latlngs[0]);
    //      plotCoords.forEach(coord => {
    //        for (var i = 0; i < markerCoords.length; i++) {
    //          if (markerCoords[i][0].distanceTo(coord[0]) < 0.05) { markerCoords.splice(i, 1); }
    //        }
    //      });
    //    }
    //  }
    //});

    markerCoords.forEach(markerLatLng => Utils._createMarker(markerLatLng, markerLatLng[1], "none", this, width, height, scale, dpi, plotItemId, plotRequestId,template, layer));

    if (!this._map.hasLayer(this._plotGroup)) {
      // Add plotGroup to map
      this._plotGroup = new L.LayerGroup();
      this._plotGroup._pmTempLayer = true;
      this._map.addLayer(this._plotGroup);
    }
    this._plotGroup.addLayer(layer);

    layer.on('pm:remove', this._removeMarkers, this);
     
    this._markers.forEach(marker => marker[0].off('click').on('click', function (e) {
      Utils._fireEvent(this._map, 'pm:beforeplotrequestplaces', {
        index: this.index,
        initial: false,
        onMarkerClick: { markerLatlng: marker[0]._latlng, position: marker[1], clickedMarker: this, width: marker[2], height: marker[3], scale: marker[4], dpi: marker[5], plotItemId: marker[6], plotRequestId: marker[7], template: marker[8], sourceLayer: marker[9]},

      });
    }))

  }
};

export default Utils;
