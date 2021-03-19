import splitLineWithPoint from "@turf/line-split";
import Draw from './L.PM.Draw';
import { getTranslation } from '../helpers';
import Utils from "../L.PM.Utils";


Draw.Split = Draw.Line.extend({
  initialize(map) {
    this._map = map;
    this._shape = 'Split';
    this.toolbarButtonName = 'splitLine';
    this.interactedLayer;
    this.splitMarker;
  },
  
  _split() {

    let geometries = [];
    
    // empty interactedLayer means no line is snapped so the marker should be removed
    if (this.interactedLayer == '') {
      this.splitMarker.remove();
      this.splitMarker.removeFrom(this._map.pm._getContainingLayer());
      this.disable();
    }

   // split the linestring which is within spatial index of splitter
    const splitter = this.splitMarker.toGeoJSON();
    const lineLayer = this.interactedLayer.toGeoJSON();
    const splittedFeatures = splitLineWithPoint(lineLayer, splitter);
    let layerToadd;
      // if the line is splitted into two lines
    if (splittedFeatures.features.length > 1) {

      // chenage the color, for testing
      const colorTest = ["black", "red"];
      let i = 0
      // for each splitted line a new lineString layer is added to the map
      splittedFeatures.features.forEach(feature => {
        const splittedLine = L.geoJSON(feature, this.interactedLayer.options);
        splittedLine.setStyle({
          color: colorTest[i],
        });
        i += 1;
       

        if (splittedLine.pm._layers[0].feature.geometry.coordinates[0][0] == splitter.geometry.coordinates[0]) {
          
          geometries.push(splittedLine.pm._layers[0].feature.geometry);
          //this.interactedLayer.setLatLngs([
          //  testnew.getLatLng(),
          //  this.interactedLayer._latlngs[1],
          //]);

        } else {
          
          layerToadd = splittedLine;
          // adding the layer to the map with the old line's options
          this._setPane(splittedLine, 'layerPane');
          this._addDrawnLayerProp(splittedLine);
          splittedLine.addTo(this._map.pm._getContainingLayer());

          // reset the hintline color
          this.options.hintlineStyle.color = '#3388ff';

          // give the new layer the original options
          splittedLine.pm.enable(this.interactedLayer.options);
          splittedLine.pm.disable();

          // add templayer prop so pm:remove isn't fired
          this.interactedLayer._pmTempLayer = true;
        }


        //// remove old layer and marker
        //this.interactedLayer.remove();
        //this.interactedLayer.removeFrom(this._map.pm._getContainingLayer());
        this.splitMarker.remove();
        this.splitMarker.removeFrom(this._map.pm._getContainingLayer());

        // remove the hintline
        this._layerGroup.removeFrom(this._map.pm._getContainingLayer());
        this._map.removeLayer(this._layerGroup);
      });
    }

    // fire the pm:tkiSplit event and pass shape layer's geometry
    Utils._fireEvent(this._map, 'pm:tkiSplit', {
      shape: this._shape,
      layerToadd: layerToadd,
      originalLayer: this.interactedLayer,
      geometry: geometries,
    });
    

    // disable drawing with different event 
    this.disable();
    if (this.options.continueDrawing) {
      this.enable();
    }
  },

  enable(options) {
    // TODO: Think about if these options could be passed globally for all
    // instances of L.PM.Draw. So a dev could set drawing style one time as some kind of config
    L.Util.setOptions(this, options);

    // change enabled state
    this._enabled = true;
   
    // toggle the draw button of the Toolbar in case drawing mode got enabled without the button
    this._map.pm.Toolbar.toggleButton(this.toolbarButtonName, true);
    
    this.options.markerStyle.icon = L.divIcon({ className: 'marker-icon' });
    this.options.hintlineStyle.color = 'red';

    // create a new layergroup
    this._layerGroup = new L.LayerGroup();
    this._layerGroup._pmTempLayer = true;
    this._layerGroup.addTo(this._map);


    // this is the hintmarker on the mouse cursor
    this._hintMarker = L.marker([0, 0], this.options.markerStyle);
    this._setPane(this._hintMarker, 'markerPane');
    this._hintMarker._pmTempLayer = true;
    this._hintMarker.addTo(this._map);


    // this is the hintline from the mouse cursor to the last marker
    this._hintline = L.polyline([], this.options.hintlineStyle);
    this._setPane(this._hintline, 'layerPane');
    this._hintline._pmTempLayer = true;
    

    // add tooltip to hintmarker
    if (this.options.tooltips) {
      this._hintMarker
        .bindTooltip(getTranslation('tooltips.placeSplitLine'), {
          permanent: true,
          offset: L.point(0, 10),
          direction: 'bottom',

          opacity: 0.8,
        })
        .openTooltip();
    }

     // this is just to keep the snappable mixin happy
     this._layer = this._hintMarker;

    
    // sync hint marker with mouse cursor
    this._map.on('mousemove', this._syncHintMarker, this);


   
    // the snap should be disabled after click
    this._hintMarker.on('pm:snap', (e) => {
      if (e.shape = "Split" && e.layerInteractedWith.pm._shape == "Line") {
        this.interactedLayer = e.layerInteractedWith;
        const points = [];
        const lines = [];

        for (let i = 0; i < this.interactedLayer.getLatLngs().length - 1; i++) {

          points.push(this.interactedLayer.getLatLngs()[i]);
          lines.push(L.polyline([this.interactedLayer.getLatLngs()[i], this.interactedLayer.getLatLngs()[i + 1]]));

        }
        this._layerGroup.addLayer(this._hintline);
        this._syncHintLine(e.layerInteractedWith, points, lines);
      }
    });

    this._hintMarker.on('pm:unsnap', (e) => {
      // remove the interacted layer when unsnapped. only the snapped layers should be splited
      this.interactedLayer = '';
      if (e.shape = "Split" &&  e.layerInteractedWith.pm._shape == "Line") {
        // e.layerInteractedWith.setStyle({
        //  opacity: 1.0
        // });
        this._hintline.remove();
      }
    });

    // create a marker on click on the map
    this._map.on('click', this._createMarker,this);

    // listens for the create event for split and disable the snapping and unsnapping
    this._map.on('pm:create', (e) => {
      if (e.shape == "Split") {
        this._hintMarker.off('pm:snap');
        this._hintMarker.off('pm:unsnap');
      }
    });

    // fire drawstart event
    this._fireDrawStart();
    this._setGlobalDrawMode();
  },
  disable() {
    // cancel, if drawing mode isn't even enabled
    if (!this._enabled) {
      return;
    }

    // change enabled state
    this._enabled = false;

    // reset cursor
    this._map._container.style.cursor = '';

    // undbind click event, don't create a marker on click anymore
    this._map.off('click', this._createMarker, this);
    this._map.off('mousemove', this._syncHintMarker, this);
    
    // remove hint marker
    this._hintMarker.remove();
    
    // remove layer
    this._map.removeLayer(this._layerGroup);
    
    // disable dragging and removing for all markers
    this._map.eachLayer(layer => {
      if (this.isRelevantMarker(layer)) {
        layer.pm.disable();
      }
    });

    // remove split marker
    this._map.eachLayer((layer) => {
      if (layer.pm) {
        if (layer.pm._shape == "Split") {
          layer.remove();
          layer.removeFrom(this._map.pm._getContainingLayer());
        }
      }
    })
    


    // toggle the draw button of the Toolbar in case drawing mode got disabled without the button
    this._map.pm.Toolbar.toggleButton(this.toolbarButtonName, false);

    // cleanup snapping
    if (this.options.snappable) {
      this._cleanupSnapping();
    }

    // reset the hintline color
    this.options.hintlineStyle.color = '#3388ff';

    // fire drawend event
    Utils._fireEvent(this._map, 'pm:drawend', { shape: this._shape });
    this._setGlobalDrawMode();
  },
  enabled() {
    return this._enabled;
  },
  toggle(options) {
    if (this.enabled()) {
      this.disable();
    } else {
      this.enable(options);
    }
  },
  isRelevantMarker(layer) {
    return layer instanceof L.Marker && layer.pm && !layer._pmTempLayer;
  },
  _syncHintMarker(e) {
    // move the cursor marker
    this._hintMarker.setLatLng(e.latlng);
    
    // if snapping is enabled, do it
    if (this.options.snappable) {
      const fakeDragEvent = e;
      fakeDragEvent.target = this._hintMarker;
      this._handleSnapping(fakeDragEvent);
    }
  },
  _createMarker(e) {
    if (!e.latlng) {
      return;
    }

    // assign the coordinate of the click to the hintMarker, that's necessary for
    // mobile where the marker can't follow a cursor
    if (!this._hintMarker._snapped) {
      this._hintMarker.setLatLng(e.latlng);
    }
    
    // get coordinate for new vertex by hintMarker (cursor marker)
    const latlng = this._hintMarker.getLatLng();

    // create marker
    const marker = new L.Marker(latlng, this.options.markerStyle);
    this._setPane(marker, 'markerPane');
    this._finishLayer(marker);

    if (!marker.pm) {
      marker.options.draggable = false;
    }

    // add marker to the map
    marker.addTo(this._map.pm._getContainingLayer());
    
    if (marker.pm && this.options.markerEditable) {
      // enable editing for the marker
      marker.pm.enable();
     } else if (marker.dragging) {
        marker.dragging.disable();
    }
   
    // fire the pm:create event and pass shape and marker
    this._fireCreate(marker);

    Utils._fireEvent(this._map, 'pm:splitConfirm', {
      shape: this._shape,
    });

    this.splitMarker = marker;

    this._cleanupSnapping();

    // remove the hintmarker and disable the drawing 
    this._hintMarker.remove();
    this._map.off('click', this._createMarker, this);

    // disable marker dragging 
    if (!this.options.continueDrawing) {
      this._map.eachLayer((layer) => {
        if (this.isRelevantMarker(layer)) {
          layer.pm.disable();
        }
      });
    }
  },


  _syncHintLine(layer, points, lines) {
    const hintCoords = [];
    if (layer.getLatLngs().length > 2) {
      const currenttLine = this._currentLine(this._hintMarker, lines);
     
      hintCoords.push(this._hintMarker.getLatLng());
      for (let j = currenttLine; j >= 0 ; j--) {
        hintCoords.push(points[j]);
      }
      this._hintline.setLatLngs(hintCoords);
     
    } else {

      const startPoint = layer.getLatLngs()[0];

      // set coords for hintline from marker to last vertex of drawin polyline
      this._hintline.setLatLngs([
        this._hintMarker.getLatLng(),
        startPoint,
      ]);
    }
  },

  _currentLine(marker, lines) {

    let cLine ;
    for (let i = 0; i < lines.length; i++) {

      const lineCoords = lines[i].getLatLngs();
      const pointCoords = marker.getLatLng();
      const d1 = lineCoords[0].distanceTo(pointCoords);
      const d2 = pointCoords.distanceTo(lineCoords[1]);
      const d3 = lineCoords[0].distanceTo(lineCoords[1]);
      const d4 = d1 + d2;
   
      if (d4.toFixed(3) == d3.toFixed(3)) {
        cLine = i;
      }
      
    }
    return cLine;

  },
});
