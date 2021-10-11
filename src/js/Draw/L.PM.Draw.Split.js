import splitLineWithPoint from "@turf/line-split";
import distance from "@turf/distance";
import Draw from './L.PM.Draw';
import { getTranslation } from '../helpers';
import Utils from "../L.PM.Utils";
import i18n from 'es2015-i18n-tag'


Draw.Split = Draw.Line.extend({
  initialize(map) {
    this._map = map;
    this._shape = 'Split';
    this.toolbarButtonName = 'splitLine';
    this.interactedLayer='';
    this.splitMarker;
    this.distance;
    this.hintLineDirection='';
  },
  
  _split() {
    const geometries = [];
    
    // empty interactedLayer means no line is snapped so the marker should be removed
    if (this.interactedLayer == '') {
      this.splitMarker.remove();
      this.splitMarker.removeFrom(this._map.pm._getContainingLayer());
      this.disable();
    }

   // split the linestring which is within spatial index of splitter
    const splitter = this.splitMarker.toGeoJSON(17);
    
    const lineLayer = this.interactedLayer.toGeoJSON(17);
    
    const splittedFeatures = splitLineWithPoint(lineLayer, splitter);
    //console.log(splittedFeatures);
    let layerToadd;
      // if the line is splitted into two lines
    if (splittedFeatures.features.length > 1) {

      // change the color, for testing
      //const colorTest = ["black", "red"];
      //let i = 0
      // for each splitted line a new lineString layer is added to the map
      splittedFeatures.features.forEach(feature => {
        const splittedLine = L.geoJSON(feature, this.interactedLayer.options);
        splittedLine.setStyle({
          color: "black",
        });
        //i += 1;
       
        if ((splittedLine.pm._layers[0].feature.geometry.coordinates[0][0]).toFixed(6) == (splitter.geometry.coordinates[0]).toFixed(6)) {
          // send back only the geometry
          geometries.push(splittedLine.pm._layers[0].feature.geometry);
          // this.interactedLayer.setLatLngs([
          //  testnew.getLatLng(),
          //  this.interactedLayer._latlngs[1],
          // ]);


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


        // // remove old layer and marker
        // this.interactedLayer.remove();
        // this.interactedLayer.removeFrom(this._map.pm._getContainingLayer());
        this.splitMarker.remove();
        this.splitMarker.removeFrom(this._map.pm._getContainingLayer());

        // remove the hintline
        this._layerGroup.removeFrom(this._map.pm._getContainingLayer());
        this._map.removeLayer(this._layerGroup);
      });
    }
    //console.log(layerToadd);
    // fire the pm:tkiSplit event and pass shape layer's geometry
    Utils._fireEvent(this._map, 'pm:tkiSplit', {
      shape: this._shape,
      layerToadd:layerToadd,
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
          offset: L.point(10, 10),
          direction: 'auto',
          opacity: 0.9,
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
        const newcolor = this._invertColor2(e.layerInteractedWith.options.color);
        this._hintline.setStyle({ color: newcolor });
       
        const startPoint = this.interactedLayer.getLatLngs()[0];
        let endPoint;

        // check if it is straight line or not 
        if (this.interactedLayer.getLatLngs().length < 2) {
           endPoint = this.interactedLayer.getLatLngs()[1];
        } else {
         
          endPoint = this.interactedLayer.getLatLngs()[this.interactedLayer._latlngs.length - 1];
        
        }
        //console.log(this.interactedLayer);
        //console.log(endPoint);
        

        const markerCoord = this._hintMarker.getLatLng();

        if (this.hintLineDirection == '') {

            if (markerCoord.distanceTo(startPoint) > markerCoord.distanceTo(endPoint)) {
              this.hintLineDirection = 'end';
            } else {
              this.hintLineDirection = 'start';
            }
        }

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
        this._hintMarker.setTooltipContent(getTranslation('tooltips.placeSplitLine'));

        this.hintLineDirection = '';
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

    // empty interactedLayer means no line is snapped so the marker should be removed
    if (this.interactedLayer == '') {
      return;
    }

    // assign the coordinate of the click to the hintMarker, that's necessary for
    // mobile where the marker can't follow a cursor
    if (!this._hintMarker._snapped) {
      this._hintMarker.setLatLng(e.latlng);
    }
    
    // get coordinate for new vertex by hintMarker (cursor marker)
    const latlng = this._hintMarker.getLatLng();

    // check if the minimum distance for splitting is satisfied 
    if ((this.distance).toFixed(2) >= this.options.splitDistance) {
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
        layer: this.interactedLayer
      });
      this.splitMarker = marker;
      //this._split()
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

    }
    else {
      // splitting is not allowed
      Utils._fireEvent(this._map, 'pm:splitReject', {
        distance: this.distance,  
        minDistance: this.options.splitDistance,
        unit: this.options.splitLineUnit,
      });
    }
   
  },


  _syncHintLine(layer, points, lines) {
    const hintCoords = [];
    // const markerCoord = this._hintMarker.getLatLng();
    // const startPoint= layer.getLatLngs()[0];

    // const dis = markerCoord.distanceTo(startPoint);
   
    // is line straight kilometers
    if (layer.getLatLngs().length > 2) {

      const currenttLine = this._currentLine(this._hintMarker, lines);
      let lineLength;

      lineLength = this._lineLength(currenttLine, layer, this._hintMarker);

      if (this.options.splitLineUnit == 'meters') {
        this.distance = lineLength * 1000;
      } else {
        this.distance = lineLength;
      }


      if (this.hintLineDirection == "start") {

        hintCoords.push(this._hintMarker.getLatLng());
        for (let j = currenttLine; j >= 0; j--) {
          hintCoords.push(points[j]);
        }

        this._hintline.setLatLngs(hintCoords);

      } else {
        
        for (let j = layer._latlngs.length - 1; j > currenttLine ; j--) {
          hintCoords.push(layer.getLatLngs()[j]);
        }

        hintCoords.push(this._hintMarker.getLatLng());
        this._hintline.setLatLngs(hintCoords);
        
      }


      // the tooltip shows different icon based on the line length
      if ((this.distance).toFixed(2) >= this.options.splitDistance) {
        this._hintMarker.setTooltipContent(getTranslation('tooltips.lineLength') + i18n`: ${String((this.distance).toFixed(2))}m <i class="fa fa-check font-green-jungle"></i>`);

      } else {
        this._hintMarker.setTooltipContent(getTranslation('tooltips.lineLength') + i18n`: ${String((this.distance).toFixed(2))}m <i class="fa fa-times font-red"></i>`);
      }
      // straight lines
    } else {
      let units = this.options.splitLineUnit;
      let Linelength;

      
      if (this.hintLineDirection == "start") {

        if (units == 'meters') {
          units = 'kilometers';
          Linelength = distance(layer.toGeoJSON(15).geometry.coordinates[0], this._hintMarker.toGeoJSON(15), units);
          this.distance = Linelength * 1000;
        } else {
          Linelength = distance(layer.toGeoJSON(15).geometry.coordinates[0], this._hintMarker.toGeoJSON(15), units);
        }

        // set coords for hintline from start of polyline to the marker 
        this._hintline.setLatLngs([
          this._hintMarker.getLatLng(),
          layer.getLatLngs()[0],
        ]);
      } else {

        if (units == 'meters') {
          units = 'kilometers';
          Linelength = distance(layer.toGeoJSON(15).geometry.coordinates[1], this._hintMarker.toGeoJSON(15), units);
          this.distance = Linelength * 1000;
        } else {
          Linelength = distance(layer.toGeoJSON(15).geometry.coordinates[1], this._hintMarker.toGeoJSON(15), units);
        }

        // set coords for hintline from the marker to the end of the polyline
        this._hintline.setLatLngs([
          this._hintMarker.getLatLng(),
          layer.getLatLngs()[1],
        ]);
      }


      // the tooltip shows different icon based on the line length
      if ((this.distance).toFixed(2) >= this.options.splitDistance) {
        this._hintMarker.setTooltipContent(getTranslation('tooltips.lineLength') + i18n`: ${String((this.distance).toFixed(2))}m <i class="fa fa-check font-green-jungle"></i>`);

      } else {
        this._hintMarker.setTooltipContent(getTranslation('tooltips.lineLength') + i18n`: ${String((this.distance).toFixed(2))}m <i class="fa fa-times font-red"></i>`);
      }
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

  _lineLength(currenttLine, layer, marker) {

    const line = layer.toGeoJSON(15);
    let length = 0;
    let units = this.options.splitLineUnit;

    if (units == 'meters') {
      units = 'kilometers';
    }

    if (this.hintLineDirection == "start") {

      if (currenttLine == 0) {
        length = distance(line.geometry.coordinates[0], marker.toGeoJSON(15), units);
        return length
      }

      for (let j = 0; j <= currenttLine; j++) {
        if (j == currenttLine) {
          length = length + distance(line.geometry.coordinates[j], marker.toGeoJSON(15), units);
        } else {
          length = length + distance(line.geometry.coordinates[j], line.geometry.coordinates[j + 1], units);
        }
      }
    } else {
      if (currenttLine == layer._latlngs.length - 2) {
        length = distance(line.geometry.coordinates[layer._latlngs.length-1], marker.toGeoJSON(15), units);
        return length
      }

      for (let j = layer._latlngs.length-1 ; j > currenttLine; j-- ) {
        if (j-1 == currenttLine) {
          length = length + distance(line.geometry.coordinates[j], marker.toGeoJSON(15), units);
        } else {
          length = length + distance(line.geometry.coordinates[j], line.geometry.coordinates[j - 1], units);
        }
      }


    }

    return length;

  },
 
  _padZero(str, len) {
    len = len || 2;
    const zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
  },

  _invertColor2(hex) {

    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
    } else {
      hex = this.getHexColor(hex);
      hex = hex.slice(1);
    }
      // convert 3-digit hex to 6-digits.
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
      }
      let r = parseInt(hex.slice(0, 2), 16);
        let g = parseInt(hex.slice(2, 4), 16);
        let b = parseInt(hex.slice(4, 6), 16);
    
      // invert color components
      r = (255 - r).toString(16);
      g = (255 - g).toString(16);
      b = (255 - b).toString(16);
      // pad each with zeros and return
      return `#${  this._padZero(r)  }${this._padZero(g)  }${this._padZero(b)}`;
  },

  getHexColor(colorStr) {
  const a = document.createElement('div');
  a.style.color = colorStr;
  const colors = window.getComputedStyle(document.body.appendChild(a)).color.match(/\d+/g).map((a) => parseInt(a, 10));
  document.body.removeChild(a);
  return(colors.length >= 3) ? `#${  ((1 << 24) + (colors[0] << 16) + (colors[1] << 8) + colors[2]).toString(16).substr(1)}` : false;
}

});
