import Draw from './l.pm.draw';
import { fixlatoffset, gettranslation } from '../helpers';


Draw.PlotRequest = Draw.Polygon.extend({
  initialize(map) {
    this._map = map;
    this._shape = 'plotrequest';
    //this.toolbarbuttonname = 'drawrectangle';
  },

  enable(options) { },

  scaletozoomlevel: function (scale) {
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

    // we should return some suitable default.
    return 18;
  },

  // draw the final plot and markers
  _drawplot: function () {

    var latlngs = this._drawplotoutline(this._width, this._height, this._scale);

    var plot = l.polygon(latlngs).addto(this._map);

    // add plotgroup to map
    this._plotgroup = new l.layergroup();
    this._plotgroup._pmtemplayer = true;
    this._map.addlayer(this._plotgroup);
    this._plotgroup.addlayer(plot);

    // find center of each edge to place a marker
    const markercoords = this._findcoords(plot._latlngs[0]);

    // add markergroup to map, markergroup includes the middle markers
    this._markergroup = new l.layergroup();
    this._markergroup._pmtemplayer = true;
    this._map.addlayer(this._markergroup);

    // create markers on each edge of rectangle
    this._markers = [];

    markercoords.foreach(markerlatlng => this._markers.push(this._createmarker(markerlatlng, markerlatlng[1], "none", this)));

    // remove hintmarker and hintpolygon and unbind the click events
    this._hintmarker.remove();
    this._plot.remove();
    this._map.off('click', utils._drawplot, this)
    this._map.off('mousemove', this._synchintmarker, this);

    this._markers.foreach(marker => marker[0].on('click', function (e) {
      utils._addextraplot(marker[0]._latlng, marker[1], this);
    }));
  },

  // add extra plots on marker click
  _addextraplot: function (markerlatlng, clickededge, clickedmarker) {
    utils._fireevent(this._map, 'pm:addplotrequest', {
      index: this.index
    });

    var ratio = this._height / this._width;
    var pixoffsetx = this._width / 2;
    var pixoffsety = pixoffsetx * ratio;
    var mapzoom = utils.scaletozoomlevel(this._scale);
    var currentmarker = this._map.project(markerlatlng, mapzoom);
    switch (clickededge) {
      case "up":

        var overlaycenter = this._map.unproject(l.point([currentmarker.x, currentmarker.y - pixoffsety]), mapzoom);
        break;
      case "left":

        var overlaycenter = this._map.unproject(l.point([currentmarker.x - pixoffsetx, currentmarker.y]), mapzoom);
        break;
      case "right":

        var overlaycenter = this._map.unproject(l.point([currentmarker.x + pixoffsetx, currentmarker.y]), mapzoom);
        break;
      case "bottom":

        var overlaycenter = this._map.unproject(l.point([currentmarker.x, currentmarker.y + pixoffsety]), mapzoom);
        break;
    };
    var centerpoint = this._map.project(overlaycenter, mapzoom);
    var latlng1 = this._map.unproject(l.point([centerpoint.x - pixoffsetx, centerpoint.y + pixoffsety]), mapzoom);
    var latlng2 = this._map.unproject(l.point([centerpoint.x + pixoffsetx, centerpoint.y - pixoffsety]), mapzoom);
    var bbox = l.latlngbounds(latlng1, latlng2);
    var addedplot = l.polygon([bbox.getsouthwest(), bbox.getsoutheast(), bbox.getnortheast(), bbox.getnorthwest()]).addto(this._map);
    this._plotgroup.addlayer(addedplot);

    var addedmarkercoords = utils._findcoords(addedplot._latlngs[0]);
    addedmarkercoords.foreach(markerlatlng => this._markers.push(this._createmarker(markerlatlng, markerlatlng[1], clickededge, this)));

    this._markers.foreach(marker => marker[0].off('click').on('click', function (e) {
      utils._addextraplot(marker[0]._latlng, marker[1], this);
    }));

    // remove the clicked marker and all its events
    clickedmarker.off('click');
    clickedmarker.remove();
  },

  // draw the hintpolygone and final plot after click
  _drawplotoutline: function (width, height, scale) {
    var mapzoom = this.scaletozoomlevel(scale);
    var overlaycenter = this._hintmarker._latlng;
    var ratio = height / width;
    var pixoffsetx = width / 2;
    var pixoffsety = pixoffsetx * ratio;
    var centerpoint = this._map.project(overlaycenter, mapzoom);
    var latlng1 = this._map.unproject(l.point([centerpoint.x - pixoffsetx, centerpoint.y + pixoffsety]), mapzoom);
    var latlng2 = this._map.unproject(l.point([centerpoint.x + pixoffsetx, centerpoint.y - pixoffsety]), mapzoom);
    var bbox = l.latlngbounds(latlng1, latlng2);
    return [bbox.getsouthwest(), bbox.getsoutheast(), bbox.getnortheast(), bbox.getnorthwest()];
  },

  _plotrequest(map, data) {

    this._map = map;
    this._width = data.width;
    this._height = data.height;
    this._scale = data.scale;

    // this is the hintmarker on the mouse cursor
    this._hintmarker = l.marker([0, 0], {
      zindexoffset: 110,
      icon: l.divicon({ iconurl: '../assets/icons/blue_rectangle.png' }),
    });
    this._hintmarker.options.pane = (this._map.pm.globaloptions.panes && this._map.pm.globaloptions.panes.vertexpane) || 'vertexpane';
    this._hintmarker._pmtemplayer = true;

    // this is the hintpolygon on the mouse cursor
    var plotlatlngs = this._drawplotoutline(this._width, this._height, this._scale);
    this._plot = l.polygon(plotlatlngs).addto(this._map);

    // sync hint marker with mouse cursor
    this._map.on('mousemove', this._synchintmarker, this);

    // create the final polygon on click
    this._map.on('click', utils._drawplot, this);
  },

  _synchintmarker(e) {
    // move the cursor marker
    this._hintmarker.setlatlng(e.latlng);
    this._plot.setlatlngs(this._drawplotoutline(this._width, this._height, this._scale));
  },

  // find the coordinates of the new markers and the position of related edge (up,bottom,left,right)
  _findcoords(plotcoords) {
    let markercoords = [];

    for (let i = 0; i < plotcoords.length; i++) {

      if (i == plotcoords.length - 1) {
        let pointa = new l.latlng(plotcoords[i].lat, plotcoords[i].lng);
        let pointb = new l.latlng(plotcoords[0].lat, plotcoords[0].lng);
        let ptest = [l.polyline([pointa, pointb]).getbounds().getcenter(), "left"];
        markercoords.push(ptest)
      } else {
        let pointa = new l.latlng(plotcoords[i].lat, plotcoords[i].lng);
        let pointb = new l.latlng(plotcoords[i + 1].lat, plotcoords[i + 1].lng);
        let ptest;

        switch (i) {
          case 0:
            ptest = [l.polyline([pointa, pointb]).getbounds().getcenter(), "bottom"];
            markercoords.push(ptest);
            break;
          case 1:
            ptest = [l.polyline([pointa, pointb]).getbounds().getcenter(), "right"];
            markercoords.push(ptest);
            break;
          case 2:
            ptest = [l.polyline([pointa, pointb]).getbounds().getcenter(), "up"];
            markercoords.push(ptest);
            break;
        }

      }
    }
    return markercoords;
  },

  // creates initial markers. input: marker's coordinates, marker's position (from the _findcoords()), position of clicked marker
  _createmarker(latlng, position, clickededge, index) {

    const marker = new l.marker(latlng[0], {
      draggable: true,
      icon: l.divicon({ classname: 'icon-add-plot-request' }),
    });

    this._markergroup.eachlayer((layer) => {
      if (layer.getlatlng().lat.tofixed(8) === latlng[0].lat.tofixed(8) && layer.getlatlng().lng.tofixed(8) === latlng[0].lng.tofixed(8)) {
        console.log(latlng);
      }
    })

    if (!(latlng[1] == "bottom" && clickededge == "up") && !(latlng[1] == "right" && clickededge == "left") && !(latlng[1] == "left" && clickededge == "right") && !(latlng[1] == "up" && clickededge == "bottom")) {

      marker.options.pane = (this._map.pm.globaloptions.panes && this._map.pm.globaloptions.panes.vertexpane) || 'markerpane';
      marker._origlatlng = latlng[0];
      marker._index = index;
      marker._pmtemplayer = true;

      this._markergroup.addlayer(marker);

    }

    return [marker, position];
  },

  _test() {
    console.log("test");
  }
});