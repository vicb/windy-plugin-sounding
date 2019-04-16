"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-sounding",
  "version": "0.7.6",
  "author": "Victor Berchet",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vicb/windy-plugin-sounding"
  },
  "description": "Soundings for paraglider pilots.",
  "displayName": "Better Sounding",
  "hook": "contextmenu",
  "dependencies": ["https://cdn.jsdelivr.net/npm/preact@8/dist/preact.min.js"],
  "className": "plugin-lhpane plugin-mobile-fullscreen",
  "exclusive": "lhpane"
},
/* HTML */
'<div class="plugin-content"> <div class="title">Sounding forecast <span id="sounding-model"></span></div> <div id="sounding-chart"></div> </div>',
/* CSS */
'.onwindy-plugin-sounding .left-border{left:600px}.onwindy-plugin-sounding #search{display:none}#windy-plugin-sounding{font-size:12px;padding:1em 1em;line-height:2;z-index:100;width:600px}#windy-plugin-sounding .title{margin:0 0 .3em .6em;font-size:16px}#windy-plugin-sounding .closing-x{display:block}@media only screen and (max-device-width:736px){#windy-plugin-sounding{display:block;left:0;top:0;right:0;width:calc(100% - 20px);margin:10px}}#windy-plugin-sounding .axis path,#windy-plugin-sounding .axis line{fill:none;stroke:#000;shape-rendering:crispEdges}#windy-plugin-sounding #sounding-chart svg{width:100%;height:600px}#windy-plugin-sounding #sounding-chart .cumulus{stroke:#030104;stroke-width:2px;fill:ivory}#windy-plugin-sounding #sounding-chart .infoline{stroke-width:3;fill:none;stroke-linejoin:round}#windy-plugin-sounding #sounding-chart .infoline.dewpoint{stroke:steelblue}#windy-plugin-sounding #sounding-chart .infoline.temperature{stroke:red}#windy-plugin-sounding #sounding-chart .infoline.wind{stroke:purple}#windy-plugin-sounding #sounding-chart .infoline.parcel{stroke:darkorange;stroke-width:2}#windy-plugin-sounding #sounding-chart line.boundary{stroke-width:1;stroke-dasharray:8;stroke:gray}#windy-plugin-sounding #sounding-chart .moist{fill:none;stroke:green;stroke-width:.3;stroke-dasharray:4 6}#windy-plugin-sounding #sounding-chart .dry{fill:none;stroke:green;stroke-width:.3}#windy-plugin-sounding #sounding-chart .isohume{fill:none;stroke:blue;stroke-width:.3;stroke-dasharray:4 6}#windy-plugin-sounding #sounding-chart .isotherm{stroke:darkred;stroke-width:.3}#windy-plugin-sounding #sounding-chart .parcel{stroke-width:3;stroke-dasharray:None}#windy-plugin-sounding #sounding-chart .parcel.moist,#windy-plugin-sounding #sounding-chart .parcel.dry{stroke:#599c00}#windy-plugin-sounding #sounding-chart .parcel.isohume{stroke-width:1;stroke:gray;stroke-dasharray:4}#windy-plugin-sounding #sounding-chart text.tick{font-size:12px;font-family:sans-serif;fill:black}#windy-plugin-sounding #sounding-chart .surface{fill:#8f6d4d}#windy-plugin-sounding #fly-to{padding:0 15px 0 8px}#windy-plugin-sounding #fly-to .location{border:1px solid #bbb;border-radius:1em;line-height:1em;padding:.3em .6em;user-select:none;display:inline-block;margin-right:.3em;cursor:pointer}#windy-plugin-sounding #fly-to .selected{background-color:#d49500;border-color:#d49500;color:white}',
/* Constructor */
function () {
  var _this2 = this;

  var graph = W.require('windy-plugin-sounding/soundingGraph');

  var store = W.require('store');

  var plugins = W.require('plugins');

  var pluginDataLoader = W.require('pluginDataLoader');

  var picker = W.require('picker');

  var map = W.require('map');

  var options = {
    key: "QKlmnpLWr2rZSyFaT7LpxZc0d5bo34D4",
    plugin: "windy-plugin-sounding"
  };
  var load = pluginDataLoader(options);
  var marker = null;
  var prodSub;
  var pickerOpenSub;
  var pickerMoveSub;
  var meteogram = plugins["detail-render"].load().then(function () {
    W.define("sMeteogram", ["meteogram", "Class"], function (m, c) {
      var _this = this;

      return c.extend(m, {
        legend: function legend() {
          return _this;
        }
      });
    });
    return W.require("sMeteogram");
  });
  map.setZoom(10, {
    animate: false
  });
  store.set("overlay", "clouds");

  this.onopen = function (location) {
    var lat;
    var lon;

    if (!location) {
      var c = map.getCenter();
      lat = c.lat;
      lon = c.lng;
    } else {
      lat = location.lat;
      lon = location.lon;
    }

    var bounds = map.getBounds();
    var deltaLng = bounds.getEast() - bounds.getWest();
    var centerLon = lon - deltaLng / map.getSize().x * 300;
    map.panTo({
      lng: centerLon,
      lat: lat
    });
    graph.init(lat, lon);
    loadData(lat, lon);
    cancelSubscriptions();
    prodSub = store.on("product", function () {
      return loadData(lat, lon);
    });
    pickerOpenSub = picker.on("pickerOpened", function (_ref13) {
      var lat = _ref13.lat,
          lon = _ref13.lon;
      return loadData(lat, lon);
    });
    pickerMoveSub = picker.on("pickerMoved", function (_ref14) {
      var lat = _ref14.lat,
          lon = _ref14.lon;
      return loadData(lat, lon);
    });

    _this2.node.oncontextmenu = _this2.node.ondblclick = _this2.node.onclick = function (ev) {
      return ev.stopPropagation();
    };
  };

  var loadData = function loadData(lat, lon) {
    moveMarkerTo(lat, lon);
    var supportedModels = /gfs|ecmwf|nam\w+|iconEu/;
    var model = store.get("product");

    if (!supportedModels.test(model)) {
      model = "ecmwf";
    }

    document.getElementById("sounding-model").innerText = model.toUpperCase();
    var dataOptions = {
      model: model,
      lat: lat,
      lon: lon
    };
    Promise.all([load("airData", dataOptions), load("forecast", dataOptions), meteogram]).then(function (_ref15) {
      var _ref16 = _slicedToArray(_ref15, 3),
          airData = _ref16[0],
          forecast = _ref16[1],
          meteogram = _ref16[2];

      graph.load(airData.data, forecast.data, meteogram);
    });
  };

  this.onclose = function () {
    cancelSubscriptions();

    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
  };

  function cancelSubscriptions() {
    if (prodSub) {
      store.off(prodSub);
      prodSub = null;
    }

    if (pickerOpenSub) {
      picker.off(pickerOpenSub);
      pickerOpenSub = null;
    }

    if (pickerMoveSub) {
      picker.off(pickerMoveSub);
      pickerMoveSub = null;
    }
  }

  function moveMarkerTo(lat, lon) {
    var leafletCoords = {
      lng: lon,
      lat: lat
    };

    if (marker) {
      marker.setLatLng(leafletCoords);
    } else {
      marker = L.marker(leafletCoords, {
        icon: map.myMarkers.pulsatingIcon,
        zIndexOffset: -300
      }).addTo(map);
    }
  }
});
/*! */
// This page was transpiled automatically from src/soundingGraph.mjs

W.define('windy-plugin-sounding/soundingGraph', ['overlays', 'broadcast', 'favs', 'store', '$', 'utils', 'windy-plugin-sounding/atmosphere', 'windy-plugin-sounding/math'], function (overlays, broadcast, favs, store, $, utils, atm, math) {
  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }
  }

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  var containerEl = $("#sounding-chart");
  var chartWindWidth = 100;
  var chartWidth = containerEl.clientWidth - 100 - 20 - 15;
  var chartHeight =
  /*containerEl.clientHeight*/
  600 - 20;
  /** @jsx h */

  var _preact = preact,
      h = _preact.h,
      render = _preact.render; // Scale for chart

  var xScale, yScale, xWindScale, canvasScale;
  var xAxisScale, yAxisScale;
  var skew;
  var tempLine, windLine;
  var Sounding;
  var root; // Keep levels >= upper level

  var upperLevel = 400;
  var pointData = {
    lat: 0,
    lon: 0,
    elevation: 0,
    params: {}
  };
  var currentParams = [];
  var convertTemp = overlays.temp.convertNumber;
  var convertWind = overlays.wind.convertNumber; // Custom conversion of altitude
  // Can not use convertNumber, because it rounds altitude to 100m

  var convertAlt = function convertAlt(value) {
    return Math.round(store.get("metric_altitude") === "ft" ? value * 3.28084 : value);
  };

  var init = function init(lat, lon) {
    pointData.lat = lat;
    pointData.lon = lon;
    pointData.params = null;

    if (xScale) {
      redraw();
      return;
    } // Scale for chart


    xScale = math.scaleLinear().range([0, chartWidth]);
    xWindScale = math.scaleLinear().range([0, chartWindWidth / 2, chartWindWidth]);
    yScale = math.scaleLog().range([chartHeight, 0]); // Scale for axis is different, because it can display custom units

    xAxisScale = math.scaleLinear().range([0, chartWidth]);
    yAxisScale = math.scaleLinear().range([chartHeight, 0]);
    tempLine = math.line().x(function (d) {
      return xScale(d[0]) + skew * (chartHeight - yScale(d[1]));
    }).y(function (d) {
      return yScale(d[1]);
    });
    windLine = math.line().x(function (d) {
      return xWindScale(d[0]);
    }).y(function (d) {
      return yScale(d[1]);
    });

    var IsoTherm = function IsoTherm(_ref) {
      var temp = _ref.temp;
      var x1 = xScale(temp + atm.celsiusToK);
      var y2 = chartHeight - (chartWidth - x1) / skew;
      return h("line", {
        "class": "isotherm",
        x1: x1.toFixed(1),
        y1: chartHeight,
        x2: chartWidth,
        y2: y2.toFixed(1)
      });
    };

    var IsoHume = function IsoHume(_ref2) {
      var temp = _ref2.temp;
      var points = [];
      var mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(temp + atm.celsiusToK), 1000);
      var stepPx = chartHeight / 4;

      for (var y = chartHeight; y > -stepPx; y -= stepPx) {
        var p = yScale.invert(y);
        var t = atm.dewpoint(atm.vaporPressure(p, mixingRatio));
        points.push([t, p]);
      }

      return h("path", {
        "class": "isohume",
        d: tempLine(points)
      });
    };

    var DryAdiabat = function DryAdiabat(_ref3) {
      var temp = _ref3.temp;
      var points = [];
      var tK0 = temp + atm.celsiusToK;
      var p0 = 1000;
      var stepPx = chartHeight / 15;

      for (var y = chartHeight; y > -stepPx; y -= stepPx) {
        var p = yScale.invert(y);
        var t = atm.dryLapse(p, tK0, p0);
        points.push([t, p]);
      }

      return h("path", {
        "class": "dry",
        d: tempLine(points)
      });
    };

    var MoistAdiabat = function MoistAdiabat(_ref4) {
      var temp = _ref4.temp;
      var points = [];
      var tK0 = temp + atm.celsiusToK;
      var p0 = 1000;
      var t = tK0;
      var previousP = p0;
      var stepPx = chartHeight / 15;

      for (var y = chartHeight; y > -stepPx; y -= stepPx) {
        var p = yScale.invert(y);
        t = t + (p - previousP) * atm.moistGradientT(p, t);
        previousP = p;
        points.push([t, p]);
      }

      return h("path", {
        "class": "moist",
        d: tempLine(points)
      });
    };

    var WindArrows = function WindArrows(_ref5) {
      var params = _ref5.params;
      var ySfcPx = yAxisScale(pointData.elevation);
      var arrows = math.zip(params.wind_u, params.wind_v).reduce(function (arrows, uv, i) {
        var yPx = yScale(params.pressure[i]);

        if (yPx < ySfcPx) {
          arrows.push(h(WindArrow, {
            wind_u: uv[0],
            wind_v: uv[1],
            y: yPx
          }));
        }

        return arrows;
      }, []);
      return h("g", {
        children: arrows
      });
    };

    var WindArrow = function WindArrow(_ref6) {
      var wind_u = _ref6.wind_u,
          wind_v = _ref6.wind_v,
          y = _ref6.y;
      var w = utils.wind2obj([wind_u, wind_v]);
      return h("g", null, w.wind > 1 ? h("g", {
        transform: "translate(0,".concat(y, ") rotate(").concat(w.dir, ")"),
        stroke: "black",
        fill: "none"
      }, h("line", {
        y2: "-30"
      }), h("path", {
        d: "M-4,-8L0,0L4,-8",
        "stroke-linejoin": "round"
      })) : h("g", {
        transform: "translate(0,".concat(y, ")"),
        stroke: "black",
        fill: "none"
      }, h("circle", {
        r: "6"
      }), h("circle", {
        r: "1"
      })));
    }; // elevation in meters


    var Surface = function Surface(_ref7) {
      var elevation = _ref7.elevation,
          width = _ref7.width;

      if (elevation == null) {
        return null;
      }

      var yPx = Math.round(yAxisScale(convertAlt(elevation)));

      if (yPx >= chartHeight) {
        return null;
      }

      return h("rect", {
        "class": "surface",
        y: yPx,
        width: width,
        height: chartHeight - yPx + 1
      });
    };

    var Cloud = function Cloud(_ref8) {
      var y = _ref8.y,
          height = _ref8.height,
          width = _ref8.width,
          cover = _ref8.cover;
      return h("rect", _extends({
        y: y,
        height: height,
        width: width
      }, {
        fill: "rgba(".concat(cover, ", ").concat(cover, ", ").concat(cover, ", 0.7)")
      }));
    }; // https://www.flaticon.com/authors/yannick


    var Cumulus = function Cumulus(_ref9) {
      var x = _ref9.x,
          y = _ref9.y;
      return h("path", {
        "class": "cumulus",
        transform: "translate(".concat(x - 36, ", ").concat(y - 28, ")"),
        d: "M26.003 24H5.997C3.794 24 2 22.209 2 20c0-1.893 1.318-3.482 3.086-3.896A7.162 7.162 0 0 1 5 15c0-3.866 3.134-7 7-7 3.162 0 5.834 2.097 6.702 4.975A4.477 4.477 0 0 1 21.5 12c2.316 0 4.225 1.75 4.473 4h.03C28.206 16 30 17.791 30 20c0 2.205-1.789 4-3.997 4z"
      });
    };

    var Clouds = function Clouds() {
      var ts = store.get("timestamp");
      var canvas = pointData.mgCanvas;
      var w = canvas.width;
      var height = canvas.height;
      var times = pointData.hours;
      var next = times.findIndex(function (t) {
        return t >= ts;
      });

      if (next == -1) {
        return null;
      }

      var prev = Math.max(0, next - 1);
      var stepX = w / times.length;
      var nextX = stepX / 2 + next * stepX;
      var prevX = stepX / 2 + prev * stepX;
      var x = Math.round(math.linearInterpolate(times[prev], prevX, times[next], nextX, ts));
      var data = canvas.getContext("2d").getImageData(x, 0, 1, height).data;
      var maxY = Math.min(chartHeight, Math.round(yAxisScale(convertAlt(pointData.elevation))));

      var cloudCoverAtChartY = function cloudCoverAtChartY(y) {
        var p = yScale.invert(y);
        var canvasY = Math.round(canvasScale(p));
        return data[4 * canvasY];
      };

      var rects = []; // Compress upper clouds to top pixels

      var y = 30;
      var upperBottomCanvas = Math.round(canvasScale(yScale.invert(y)));
      var maxCover = 255;
      var hasUpperCover = false;

      for (var cy = 0; cy < upperBottomCanvas; cy++) {
        var cover = data[4 * cy];

        if (cover > 0) {
          hasUpperCover = true;
          maxCover = Math.min(cover, maxCover);
        }
      }

      if (hasUpperCover) {
        rects.push(h(Cloud, {
          y: "0",
          width: chartWidth,
          height: "30",
          cover: maxCover
        }));
        rects.push(h("text", {
          "class": "tick",
          y: 30 - 5,
          x: chartWidth - 5,
          "text-anchor": "end"
        }, "upper clouds"));
        rects.push(h("line", {
          y1: "30",
          y2: "30",
          x2: chartWidth,
          "class": "boundary"
        }));
      } // Then respect the y scale


      while (y < maxY) {
        var startY = y;

        var _cover = cloudCoverAtChartY(y);

        var _height = 1;

        while (y++ < maxY && cloudCoverAtChartY(y) == _cover) {
          _height++;
        }

        if (_cover == 0) {
          continue;
        }

        rects.push(h(Cloud, {
          y: startY,
          width: "100",
          height: _height,
          cover: _cover
        }));
      }

      return h("g", {
        children: rects
      });
    };

    var flyTo = function flyTo(location) {
      init(location.lat, location.lon);
      broadcast.emit("rqstOpen", "windy-plugin-sounding", location);
    };

    var Favorites = function Favorites(_ref10) {
      var favs = _ref10.favs;
      var places = Object.values(favs);
      var currentLoc = utils.latLon2str(pointData);
      return h("div", {
        id: "fly-to",
        "class": "size-s"
      }, places.length == 0 ? h("span", {
        "data-icon": "m"
      }, "Add favorites to enable fly to.") : places.map(function (f) {
        return h("span", {
          "class": "location + ".concat(utils.latLon2str(f) == currentLoc ? " selected" : ""),
          onClick: function onClick(_) {
            return flyTo(f);
          }
        }, f.title || f.name);
      }));
    };

    var Parcel = function Parcel(_ref11) {
      var params = _ref11.params; // Thermal 2h after sunrise to 2h before sunset

      var thermalStart = pointData.celestial.sunriseTs + 2 * 3600000;
      var thermalStop = pointData.celestial.sunsetTs - 2 * 3600000;
      var thermalDuration = thermalStop - thermalStart;
      var currentTs = store.get("timestamp");

      if (currentTs < thermalStart || (currentTs - thermalStart) % (24 * 3600000) > thermalDuration) {
        return null;
      }

      var sfcPx = yAxisScale(convertAlt(pointData.elevation));
      var sfcPressure = yScale.invert(sfcPx);
      var sfcThermalTemp = 3 + math.sampleAt(params.pressure, params.temp, [sfcPressure])[0];
      var sfcDewpoint = math.sampleAt(params.pressure, params.dewpoint, [sfcPressure])[0];
      var pdTemps = [];
      var pdDewpoints = [];
      var pdPressures = [];
      var stepPx = chartHeight / 20;
      var mixingRatio = atm.mixingRatio(atm.saturationVaporPressure(sfcDewpoint), sfcPressure);

      for (var y = sfcPx; y > -stepPx; y -= stepPx) {
        var p = yScale.invert(y);
        pdPressures.push(p);
        pdTemps.push(atm.dryLapse(p, sfcThermalTemp, sfcPressure));
        pdDewpoints.push(atm.dewpoint(atm.vaporPressure(p, mixingRatio)));
      }

      var moistIntersection = math.firstIntersection(pdPressures, pdTemps, pdPressures, pdDewpoints);
      var dryIntersection = math.firstIntersection(pdPressures, pdTemps, params.pressure, params.temp);
      var children = [];
      var thermalTop = dryIntersection;

      if (moistIntersection && moistIntersection[0] > dryIntersection[0]) {
        // Cumulus clouds
        thermalTop = moistIntersection;
        var pmPressures = [];
        var pmTemps = [];
        var t = moistIntersection[1];
        var previousP = moistIntersection[0];

        for (var _y = yScale(previousP); _y > -stepPx; _y -= stepPx) {
          var _p = yScale.invert(_y);

          t = t + (_p - previousP) * atm.moistGradientT(_p, t);
          previousP = _p;
          pmPressures.push(_p);
          pmTemps.push(t);
        }

        var isohumePoints = math.zip(pdDewpoints, pdPressures).filter(function (pt) {
          return pt[1] > thermalTop[0];
        });
        isohumePoints.push([moistIntersection[1], moistIntersection[0]]);
        children.push(h("path", {
          "class": "parcel isohume",
          d: tempLine(isohumePoints)
        }));
        var cloudPoints = math.zip(pmTemps, pmPressures);
        var equilibrium = math.firstIntersection(pmPressures, pmTemps, params.pressure, params.temp);
        var cloudTopPx = 0;

        if (equilibrium) {
          var cloudTop = equilibrium[0];
          cloudTopPx = yScale(cloudTop);
          children.push(h("line", {
            "class": "boundary",
            y1: cloudTopPx,
            y2: cloudTopPx,
            x2: chartWidth
          }));
          cloudPoints = cloudPoints.filter(function (pt) {
            return pt[1] >= cloudTop;
          });
          cloudPoints.push([equilibrium[1], equilibrium[0]]);
        }

        children.push(h("rect", {
          y: cloudTopPx,
          height: yScale(thermalTop[0]) - cloudTopPx,
          width: chartWidth,
          fill: "url(#diag-hatch)"
        }));
        children.push(h(Cumulus, {
          x: chartWidth,
          y: yScale(thermalTop[0])
        }));
        children.push(h("path", {
          "class": "parcel moist",
          d: tempLine(cloudPoints)
        }));
      }

      var thermalTopPx = yScale(thermalTop[0]);
      var thermalTopUsr = Math.round(yAxisScale.invert(thermalTopPx) / 100) * 100;
      var dryPoints = math.zip(pdTemps, pdPressures).filter(function (pt) {
        return pt[1] >= thermalTop[0];
      });
      dryPoints.push([thermalTop[1], thermalTop[0]]);
      children.push(h("line", {
        "class": "boundary",
        y1: thermalTopPx,
        y2: thermalTopPx,
        x2: chartWidth
      }));
      children.push(h("text", {
        "class": "tick",
        style: "fill: black",
        "text-anchor": "end",
        "dominant-baseline": "hanging",
        y: thermalTopPx + 4,
        x: chartWidth - 7
      }, thermalTopUsr));
      children.push(h("path", {
        "class": "parcel dry",
        d: tempLine(dryPoints)
      }));
      return h("g", {
        children: children
      });
    };

    var lastWheelMove = Date.now();

    var wheelHandler = function wheelHandler(e) {
      var ts = store.get("timestamp");
      var debounceMs = 100;
      var direction = Math.sign(event.deltaY);

      if (e.shiftKey || e.ctrlKey) {
        debounceMs = 800;
        var d = new Date(ts);

        var _h = d.getUTCHours();

        d.setUTCMinutes(0);
        ts = d.getTime();
        var refTime = (13 - pointData.celestial.TZoffset + 24) % 24;
        var dh = (refTime - _h) * direction;

        if (dh <= 0) {
          ts += direction * (24 + dh) * 3600 * 1000;
        } else {
          ts += direction * dh * 3600 * 1000;
        }
      } else {
        ts += direction * 3600 * 1000;
      }

      if (Date.now() - lastWheelMove > debounceMs) {
        store.set("timestamp", ts);
        lastWheelMove = Date.now();
      }

      e.stopPropagation();
      e.preventDefault();
    };

    var AltitudeAxis = function AltitudeAxis() {
      var children = [];
      var altiMetric = store.get("metric_altitude");
      var altiStep = altiMetric == "m" ? 1000 : 3000;

      for (var alti = altiStep, isLast; !isLast; alti += altiStep) {
        var yPx = yAxisScale(alti);
        isLast = yAxisScale(alti + altiStep) < 20;
        children.push(h("line", {
          y1: yPx,
          x2: chartWidth,
          y2: yPx,
          stroke: "black",
          "stroke-width": "0.1"
        }));
        children.push(h("text", {
          "class": "tick",
          y: yPx - 5,
          x: 5
        }, alti + " " + (isLast ? " " + altiMetric : "")));
      }

      return h("g", {
        children: children
      });
    };

    var TemperatureAxis = function TemperatureAxis() {
      var children = [];
      var tempMetric = store.get("metric_temp");
      var tempStep = tempMetric == "°C" ? 10 : 20;
      var tempStart = Math.trunc(xAxisScale.invert(0) / tempStep) * tempStep;

      for (var temp = tempStart, isLast; !isLast; temp += tempStep) {
        var xPx = xAxisScale(temp);
        isLast = xAxisScale(temp + tempStep) > chartWidth;
        children.push(h("text", {
          "class": "tick",
          "text-anchor": "middle",
          "dominant-baseline": "hanging",
          y: chartHeight + 5,
          x: xPx
        }, temp + (isLast ? " " + tempMetric : "")));
      }

      return h("g", {
        children: children
      });
    };

    Sounding = function Sounding() {
      var _ref12 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          params = _ref12.params,
          elevation = _ref12.elevation;

      var windSpeeds;

      if (params) {
        windSpeeds = math.zip(params.wind_u, params.wind_v).map(function (w) {
          return utils.wind2obj(w).wind;
        });
        var maxWindSpeed = Math.max.apply(Math, _toConsumableArray(windSpeeds));
        xWindScale.domain([0, 30 / 3.6, Math.max(60 / 3.6, maxWindSpeed)]);
        yAxisScale.domain([convertAlt(params.gh[0]), convertAlt(params.gh[params.gh.length - 1])]);
      }

      return h("div", null, h("svg", {
        id: "sounding",
        onWheel: wheelHandler
      }, h("defs", null, h("clipPath", {
        id: "clip-chart"
      }, h("rect", {
        width: chartWidth,
        height: chartHeight + 20
      })), h("pattern", {
        id: "diag-hatch",
        patternUnits: "userSpaceOnUse",
        width: "8",
        height: "8",
        patternTransform: "rotate(45 2 2)"
      }, h("rect", {
        width: "8",
        height: "8",
        fill: "#f8f8f8",
        opacity: "0.7"
      }), h("path", {
        d: "M 0,-1 L 0,11",
        stroke: "gray",
        "stroke-width": "1"
      }))), params ? h("g", null, h("g", {
        "class": "wind"
      }, h("g", {
        "class": "chart",
        transform: "translate(".concat(chartWidth + 30, ",0)")
      }, h("rect", {
        fill: "none",
        y: "1",
        height: chartHeight - 1,
        width: chartWindWidth,
        stroke: "gray",
        "stroke-width": "1"
      }), h("text", {
        "class": "tick",
        transform: "translate(".concat(xWindScale(15 / 3.6) - 5, " 80) rotate(-90)")
      }, convertWind(15 / 3.6)), h("text", {
        "class": "tick",
        transform: "translate(".concat(xWindScale(30 / 3.6) - 5, " 80) rotate(-90)")
      }, convertWind(30 / 3.6)), h("text", {
        "class": "tick",
        transform: "translate(".concat(chartWindWidth - 5, " 80) rotate(-90)")
      }, convertWind(xWindScale.invert(chartWindWidth)) + " " + store.get("metric_wind")), h("line", {
        y1: chartHeight,
        x1: xWindScale(15 / 3.6),
        x2: xWindScale(15 / 3.6),
        stroke: "black",
        "stroke-width": "0.1"
      }), h("rect", {
        x: chartWindWidth / 2,
        width: chartWindWidth / 2,
        height: chartHeight,
        fill: "red",
        opacity: "0.1"
      }), h("g", {
        "class": "chartArea"
      }, h("path", {
        "class": "infoline wind",
        d: windLine(math.zip(windSpeeds, params.pressure))
      }), h("g", {
        transform: "translate(".concat(chartWindWidth / 2, ",0)")
      }, h(WindArrows, {
        params: params
      }))), h(Surface, {
        elevation: elevation,
        width: chartWindWidth
      }))), h("g", {
        "class": "chart",
        transform: "translate(10,0)"
      }, h("rect", {
        fill: "none",
        y: "1",
        height: chartHeight - 1,
        width: chartWidth,
        stroke: "gray",
        "stroke-width": "1"
      }), h("g", {
        "class": "chartArea",
        "clip-path": "url(#clip-chart)"
      }, h("rect", {
        "class": "overlay",
        width: chartWidth,
        height: chartHeight,
        opacity: "0"
      }), [-70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(function (t) {
        return h(IsoTherm, {
          temp: t
        });
      }), [-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(function (t) {
        return h(DryAdiabat, {
          temp: t
        });
      }), [-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(function (t) {
        return h(MoistAdiabat, {
          temp: t
        });
      }), [-20, -15, -10, -5, 0, 5, 10, 15, 20].map(function (t) {
        return h(IsoHume, {
          temp: t
        });
      }), h(Parcel, {
        params: params
      }), h(Clouds, null), h("path", {
        "class": "infoline temperature",
        d: tempLine(math.zip(params.temp, params.pressure))
      }), h("path", {
        "class": "infoline dewpoint",
        d: tempLine(math.zip(params.dewpoint, params.pressure))
      }), h(Surface, {
        elevation: elevation,
        width: chartWidth
      })), h(TemperatureAxis, null), h(AltitudeAxis, null))) : h("text", {
        x: "50%",
        y: "50%",
        "text-anchor": "middle"
      }, "No Data")), h(Favorites, {
        favs: favs.getAll()
      }));
    };

    root = render(h(Sounding, {
      display: "block",
      elevation: "0"
    }), containerEl, root);
    store.on("timestamp", redraw);
  }; // Compute the min and max temp and pressure over the forecast range


  function updateScales(hrAlt) {
    var maxTemp = Number.MIN_VALUE;
    var minPressure = Number.MAX_VALUE;
    var maxPressure = Number.MIN_VALUE;

    for (var ts in pointData.params) {
      var params = pointData.params[ts];
      var lastIndex = params.pressure.length - 1; // Look for min/max pressure at either ends only

      maxPressure = Math.max(maxPressure, params.pressure[0]);
      minPressure = Math.min(minPressure, params.pressure[lastIndex]);
      maxTemp = Math.max.apply(Math, [maxTemp].concat(_toConsumableArray(params.temp)));
    }

    maxTemp += 8;
    var minTemp = maxTemp - 60;
    skew = 76.53 * (3 - Math.log10(upperLevel)) / (maxTemp - minTemp) * (chartWidth / chartHeight);
    xScale.domain([minTemp, maxTemp]);
    xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);
    yScale.domain([maxPressure, minPressure]);
    var levels = [1000, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100];
    var levelsH = hrAlt.map(function (p) {
      return (pointData.mgCanvas.height - 1) * (1 - p / 100);
    });
    canvasScale = math.scaleLinear().range(levelsH).domain(levels);
  } // Return the value of the parameter `name` at `level` for the given `tsIndex`


  function getParamAtLevel(airData, param, level, tsIndex) {
    var valueByTs = airData.data["".concat(param, "-").concat(level, "h")];
    var value = Array.isArray(valueByTs) ? valueByTs[tsIndex] : null;

    if (param === "gh" && value == null) {
      // Approximate gh when not provided by the model
      return Math.round(atm.getElevation(level));
    }

    return value;
  }

  function getParam(airData, param, levels, tsIndex) {
    return levels.map(function (level) {
      return getParamAtLevel(airData, param, level, tsIndex);
    });
  } // Handler for data request


  var load = function load(airData, forecast, meteogram) {
    // Re-arrange the airData
    // from
    // {
    //    temp-150h: [...]
    //    temp-surface: [...]
    //    hours: [timestamp0, ...]
    //    ...
    // }
    // to
    // {
    //    [timestamp0]: {
    //      temp: [...],
    //      wind_u: [...],
    //      wind_v: [...],
    //      pressure: [...],
    //    }, ...
    // }
    var timestamps = airData.data.hours; // Some models do not provide modelElevation (ie GFS)

    var paramLevels = new Set(); // Extracts parameter names and levels.

    for (var name in airData.data) {
      var m = name.match(/([^-]+)-(.+)h$/);

      if (m !== null) {
        paramLevels.add(Number(m[2]));
      }
    } // Filters the list of levels


    var levels = Array.from(paramLevels).filter(function (l) {
      return l >= upperLevel;
    }).sort(function (a, b) {
      return Number(a) < Number(b) ? 1 : -1;
    });
    var paramsByTs = {};
    var sfcTempByTs = [];
    timestamps.forEach(function (ts, tsIndex) {
      sfcTempByTs.push(getParamAtLevel(airData, "temp", "surface", tsIndex));
      paramsByTs[ts] = {
        temp: getParam(airData, "temp", levels, tsIndex),
        dewpoint: getParam(airData, "dewpoint", levels, tsIndex),
        gh: getParam(airData, "gh", levels, tsIndex),
        wind_u: getParam(airData, "wind_u", levels, tsIndex),
        wind_v: getParam(airData, "wind_v", levels, tsIndex),
        pressure: levels
      };
    }); // Draw the clouds

    var canvas = document.createElement("canvas");
    var numData = airData.data.hours.length; // 300px whatever the pixel density

    var height = 300 / meteogram.canvasRatio;
    meteogram.init(canvas, numData, 6, height).setHeight(height).setOffset(0).render(airData).resetCanvas();
    pointData.params = paramsByTs;
    pointData.mgCanvas = canvas;
    pointData.hours = airData.data.hours;
    pointData.sfcTempByTs = sfcTempByTs;
    var elevation = forecast.header.elevation == null ? 0 : forecast.header.elevation;

    if (airData.header.elevation != null) {
      elevation = airData.header.elevation;
    }

    if (airData.header.modelElevation != null) {
      elevation = airData.header.modelElevation;
    }

    pointData.elevation = elevation;
    pointData.celestial = forecast.celestial; // Update the scales

    updateScales(meteogram.hrAlt);
    redraw();
  }; // Update the sounding


  var redraw = function redraw() {
    currentParams = null;
    pointData.sfcTemp = null;

    if (pointData.params) {
      var ts = store.get("timestamp");
      var ts1, ts2;
      var hours = pointData.hours;
      var idx = hours.findIndex(function (x) {
        return x >= ts;
      });

      if (idx > -1) {
        if (idx == 0) {
          ts1 = ts2 = hours[0];
        } else {
          ts1 = hours[idx - 1];
          ts2 = hours[idx];
        } // Interpolate between two nearest hours


        var paramsTs1 = pointData.params[ts1];
        var paramsTs2 = pointData.params[ts2];
        currentParams = {};
        Object.getOwnPropertyNames(paramsTs1).forEach(function (param) {
          currentParams[param] = math.linearInterpolate(ts1, paramsTs1[param], ts2, paramsTs2[param], ts);
        }); // Surface temperature

        var temp1 = pointData.sfcTempByTs[idx - 1];

        if (temp1 != null) {
          var temp2 = pointData.sfcTempByTs[idx];
          pointData.sfcTemp = math.linearInterpolate(ts1, temp1, ts2, temp2, ts);
        }
      }
    }

    root = render(h(Sounding, {
      params: currentParams,
      elevation: pointData.elevation,
      display: "block"
    }), containerEl, root);
  };

  return {
    load: load,
    init: init
  };
});
/*! */
// This page was transpiled automatically from src/atmosphere.mjs

W.define('windy-plugin-sounding/atmosphere', [], function () {
  // Gas constant for dry air at the surface of the Earth
  var Rd = 287; // Specific heat at constant pressure for dry air

  var Cpd = 1005; // Molecular weight ratio

  var epsilon = 18.01528 / 28.9644; // Heat of vaporization of water

  var Lv = 2501000; // Ratio of the specific gas constant of dry air to the specific gas constant for water vapour

  var satPressure0c = 6.112; // C + celsiusToK -> K

  var celsiusToK = 273.15;
  var L = -6.5e-3;
  var g = 9.80665;
  /**
   * Computes the temperature at the given pressure assuming dry processes.
   *
   * t0 is the starting temperature at p0 (degree Celsius).
   */

  function dryLapse(p, tK0, p0) {
    return tK0 * Math.pow(p / p0, Rd / Cpd);
  } // Computes the mixing ration of a gas.


  function mixingRatio(partialPressure, totalPressure) {
    var molecularWeightRatio = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : epsilon;
    return molecularWeightRatio * partialPressure / (totalPressure - partialPressure);
  } // Computes the saturation mixing ratio of water vapor.


  function saturationMixingRatio(p, tK) {
    return mixingRatio(saturationVaporPressure(tK), p);
  } // Computes the saturation water vapor (partial) pressure


  function saturationVaporPressure(tK) {
    var tC = tK - celsiusToK;
    return satPressure0c * Math.exp(17.67 * tC / (tC + 243.5));
  } // Computes the temperature gradient assuming liquid saturation process.


  function moistGradientT(p, tK) {
    var rs = saturationMixingRatio(p, tK);
    var n = Rd * tK + Lv * rs;
    var d = Cpd + Math.pow(Lv, 2) * rs * epsilon / (Rd * Math.pow(tK, 2));
    return 1 / p * (n / d);
  } // Computes water vapor (partial) pressure.


  function vaporPressure(p, mixing) {
    return p * mixing / (epsilon + mixing);
  } // Computes the ambient dewpoint given the vapor (partial) pressure.


  function dewpoint(p) {
    var val = Math.log(p / satPressure0c);
    return celsiusToK + 243.5 * val / (17.67 - val);
  }

  function getElevation(p) {
    var t0 = 288.15;
    var p0 = 1013.25;
    return t0 / L * (Math.pow(p / p0, -L * Rd / g) - 1);
  }

  return {
    dryLapse: dryLapse,
    moistGradientT: moistGradientT,
    dewpoint: dewpoint,
    vaporPressure: vaporPressure,
    getElevation: getElevation,
    saturationVaporPressure: saturationVaporPressure,
    mixingRatio: mixingRatio,
    celsiusToK: celsiusToK
  };
});
/*! */
// This page was transpiled automatically from src/math.mjs

W.define('windy-plugin-sounding/math', [], function () {
  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }
  } // Linear interpolation
  // The values (y1 and y2) can be arrays


  function linearInterpolate(x1, y1, x2, y2, x) {
    if (x1 == x2) {
      return y1;
    }

    var w = (x - x1) / (x2 - x1);

    if (Array.isArray(y1)) {
      return y1.map(function (y1, i) {
        return y1 * (1 - w) + y2[i] * w;
      });
    }

    return y1 * (1 - w) + y2 * w;
  } // Sampling at at targetXs with linear interpolation
  // xs and ys must have the same length.


  function sampleAt(xs, ys, targetXs) {
    var descOrder = xs[0] > xs[1];
    return targetXs.map(function (tx) {
      var index = xs.findIndex(function (x) {
        return descOrder ? x <= tx : x >= tx;
      });

      if (index == -1) {
        index = xs.length - 1;
      } else if (index == 0) {
        index = 1;
      }

      return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx);
    });
  } // x?s must be sorted in descending order.
  // x?s and y?s must have the same length.
  // return [x, y] or null when no intersection found.


  function firstIntersection(x1s, y1s, x2s, y2s) {
    // Find all the points in the intersection of the 2 x ranges
    var max = Math.min(x1s[0], x2s[0]);
    var min = Math.max(x1s[x1s.length - 1], x2s[x2s.length - 1]);
    var xs = Array.from(new Set([].concat(_toConsumableArray(x1s), _toConsumableArray(x2s)))).filter(function (x) {
      return x >= min && x <= max;
    }).sort(function (a, b) {
      return Number(a) > Number(b) ? -1 : 1;
    }); // Interpolate the lines for all the points of that intersection

    var iy1s = sampleAt(x1s, y1s, xs);
    var iy2s = sampleAt(x2s, y2s, xs); // Check if each segment intersect

    for (var index = 0; index < xs.length - 1; index++) {
      var y11 = iy1s[index];
      var y21 = iy2s[index];
      var x1 = xs[index];

      if (y11 == y21) {
        return [x1, y11];
      }

      var y12 = iy1s[index + 1];
      var y22 = iy2s[index + 1];

      if (Math.sign(y21 - y11) != Math.sign(y22 - y12)) {
        var x2 = xs[index + 1];
        var width = x2 - x1;
        var slope1 = (y12 - y11) / width;
        var slope2 = (y22 - y21) / width;
        var dx = (y21 - y11) / (slope1 - slope2);
        var dy = dx * slope1;
        return [x1 + dx, y11 + dy];
      }
    }

    return null;
  }

  function zip(a, b) {
    return a.map(function (v, i) {
      return [v, b[i]];
    });
  }

  function scaleLinear() {
    var range = [0, 1];
    var domain = [0, 1];

    var scale = function scale(v) {
      return sampleAt(domain, range, [v])[0];
    };

    scale.invert = function (v) {
      return sampleAt(range, domain, [v])[0];
    };

    scale.range = function (r) {
      range = r;
      return scale;
    };

    scale.domain = function (d) {
      domain = d;
      return scale;
    };

    return scale;
  }

  function scaleLog() {
    var range = [0, 1];
    var domain = [0, 1];

    var scale = function scale(v) {
      return sampleAt(domain, range, [Math.log(v)])[0];
    };

    scale.invert = function (v) {
      return Math.exp(sampleAt(range, domain, [v])[0]);
    };

    scale.range = function (r) {
      range = r;
      return scale;
    };

    scale.domain = function (d) {
      domain = d.map(Math.log);
      return scale;
    };

    return scale;
  }

  function line() {
    var xDigits = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    var yDigits = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    var x = function x(v) {
      return v[0];
    };

    var y = function y(v) {
      return v[1];
    };

    var coordinates = function coordinates(x, y) {
      return x.toFixed(xDigits) + "," + y.toFixed(yDigits);
    };

    var line = function line(d) {
      var points = d.map(function (v) {
        return coordinates(x(v), y(v));
      });
      return "M" + points.join("L");
    };

    line.x = function (f) {
      x = f;
      return line;
    };

    line.y = function (f) {
      y = f;
      return line;
    };

    return line;
  }

  return {
    firstIntersection: firstIntersection,
    sampleAt: sampleAt,
    linearInterpolate: linearInterpolate,
    zip: zip,
    scaleLinear: scaleLinear,
    scaleLog: scaleLog,
    line: line
  };
});