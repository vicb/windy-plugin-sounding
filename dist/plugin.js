"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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
  "version": "0.1.0",
  "author": "Victor Berchet",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vicb/windy-plugins"
  },
  "description": "Soundings for paraglider pilots.",
  "displayName": "Better Sounding",
  "hook": "contextmenu",
  "dependencies": ["https://cdn.jsdelivr.net/npm/d3@5/dist/d3.min.js", "https://cdn.jsdelivr.net/npm/preact@8/dist/preact.min.js"],
  "className": "drop-down-window ",
  "classNameMobile": "drop-down-window down",
  "attachPoint": ".leaflet-popup-pane",
  "attachPointMobile": "#plugins"
},
/* HTML */
'<h3>Sounding forecast</h3> <div id="sounding-chart"></div>',
/* CSS */
'#windy-plugin-sounding{font-size:12px;padding:.5em .7em;line-height:2;z-index:100;width:600px;height:650px;margin-left:-10px}#windy-plugin-sounding h3{margin:0 0 .3em .6em}#windy-plugin-sounding .closing-x{display:block}#windy-plugin-sounding section{margin-left:10px;line-height:1.5}#windy-plugin-sounding section span:not(:first-child){margin-left:1em}#windy-plugin-sounding section:first-of-type{color:black}#windy-plugin-sounding section:last-of-type{font-size:.9em}#windy-plugin-sounding section [data-ref="modelAlt"].red{color:red}#windy-plugin-sounding [data-ref="zoom"]{position:absolute;right:20px;bottom:15px;font-size:25px;color:#9d0300}@media only screen and (max-device-width:736px){#windy-plugin-sounding{display:block;left:0;top:0;right:0;width:calc(100% - 20px);margin:10px}}#windy-plugin-sounding .axis path,#windy-plugin-sounding .axis line{fill:none;stroke:#000;shape-rendering:crispEdges}#windy-plugin-sounding #sounding-chart{height:600px;position:relative}#windy-plugin-sounding #sounding-chart svg{width:100%;height:100%}#windy-plugin-sounding #sounding-chart .infoLine .dewpoint{fill:steelblue}#windy-plugin-sounding #sounding-chart .infoLine .temp{fill:red}#windy-plugin-sounding #sounding-chart .zoomButton{cursor:pointer}',
/* Constructor */
function () {
  var _this = this;

  var graph = W.require('windy-plugin-sounding/soundingGraph');

  var _ = W.require('utils');

  var pluginDataLoader = W.require('pluginDataLoader');

  var map = W.require('map');

  var rs = W.require('rootScope');

  var options = {
    key: "RxcwkWO2XWsfEbdidcsskbyWqhToAwLx",
    plugin: "windy-plugin-examples"
  };
  var load = pluginDataLoader(options);
  var marker = null;

  this.onopen = function (latLonObject) {
    var lat, lon;

    if (!latLonObject) {
      var c = map.getCenter();
      lat = c.lat;
      lon = c.lng;
    } else {
      lat = latLonObject.lat;
      lon = latLonObject.lon;
    }

    var leafletCoords = {
      lng: lon,
      lat: lat
    },
        _map$latLngToLayerPoi = map.latLngToLayerPoint(leafletCoords),
        x = _map$latLngToLayerPoi.x,
        y = _map$latLngToLayerPoi.y;

    if (!rs.isMobile) {
      _this.node.style.position = "absolute";
      _this.node.style.left = "".concat(x - 15, "px");
      _this.node.style.top = "".concat(y + 15, "px");
    } else {
      var height = _this.node.clientHeight;
      map.center({
        lat: lat,
        lon: lon
      }, false).panBy([0, -0.5 * height + 50]);
    }

    if (marker) {
      marker.setLatLng(leafletCoords);
    } else {
      marker = L.marker(leafletCoords, {
        icon: map.myMarkers.pulsatingIcon,
        zIndexOffset: -300
      }).addTo(map);
    }

    initAndLoad(lat, lon);

    _this.node.oncontextmenu = _this.node.ondblclick = _this.node.onclick = function (ev) {
      return ev.stopPropagation();
    };
  };

  var initAndLoad = function initAndLoad(lat, lon) {
    var dataOptions = {
      model: "ecmwf",
      lat: lat,
      lon: lon
    };
    graph.init(_this.refs);
    Promise.all([load("forecast", dataOptions), load("airData", dataOptions)]).then(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          forecast = _ref2[0],
          airData = _ref2[1];

      graph.load(lat, lon, airData.data, forecast.data);
    });
  };

  this.onclose = function () {
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
  };
});
/*! */
// This page was transpiled automatically from src/soundingGraph.mjs

W.define('windy-plugin-sounding/soundingGraph', ['overlays', 'store', '$', 'utils', 'windy-plugin-sounding/soundingUtils'], function (overlays, store, $, _, sUtils) {
  ;
  ;
  ;
  ;
  ;
  var containerEl = $("#sounding-chart");
  var chartWindWidth = 100;
  var chartWidth = containerEl.clientWidth - 100 - 20 - 15;
  var chartHeight = containerEl.clientHeight - 20;
  /** @jsx h */

  var _preact = preact,
      h = _preact.h,
      render = _preact.render; // Scale for chart

  var xScale, yScale, xWindScale;
  var xAxisScale, xWindAxisScale, yAxisScale;
  var xAxis, xWindAxis, yAxis;
  var skew = 0.4;
  var tempLine, dewPointLine, windLine;
  var Sounding;
  var root;
  var pointData = {
    lat: 0,
    lon: 0,
    elevation: 0,
    modelElevation: 0,
    tempRange: [0, 0],
    pressureRange: [0, 0],
    data: {}
  };
  var currentData = [];
  var convertTemp = overlays.temp.convertNumber;
  var convertWind = overlays.wind.convertNumber;
  var convertPressure = overlays.pressure.convertNumber; // Custom conversion of altitude
  // Can not use convertNumber, because it rounds altitude to 100m

  var convertAlt = function convertAlt(value) {
    return Math.round(overlays.cloudtop.metric === "ft" ? value * 3.28084 : value);
  };

  var init = function init() {
    if (xScale) {
      return;
    } // Scale for chart


    xScale = d3.scaleLinear().range([0, chartWidth]);
    xWindScale = d3.scaleLinear().range([0, chartWindWidth]);
    yScale = d3.scaleLog().range([chartHeight, 0]); // Scale for axis is different, because it can display custom units

    xAxisScale = d3.scaleLinear().range([0, chartWidth]);
    yAxisScale = d3.scaleLinear().range([chartHeight, 0]);
    xWindAxisScale = d3.scaleLinear().range([0, chartWindWidth]);
    xAxis = d3.axisBottom(xAxisScale).ticks(5, "-d");
    yAxis = d3.axisRight(yAxisScale).ticks(10, "d");
    xWindAxis = d3.axisBottom(xWindAxisScale).ticks(4, "d");
    tempLine = d3.line().x(function (d) {
      return xScale(d.temp) + skew * (chartHeight - yScale(d.pressure));
    }).y(function (d) {
      return yScale(d.pressure);
    });
    dewPointLine = d3.line().x(function (d) {
      return xScale(d.dewpoint) + skew * (chartHeight - yScale(d.pressure));
    }).y(function (d) {
      return yScale(d.pressure);
    });
    windLine = d3.line().x(function (d) {
      return xWindScale(d.wind);
    }).y(function (d) {
      return yScale(d.pressure);
    });

    var IsoTemp = function IsoTemp(_ref3) {
      var temp = _ref3.temp;

      if (skew == 0) {
        return null;
      }

      var x1 = xScale(temp + 273);
      var y2 = chartHeight - (chartWidth - x1) / skew;
      return h("line", {
        x1: x1,
        y1: chartHeight,
        x2: chartWidth,
        y2: y2,
        stroke: "darkred",
        "stroke-width": "0.2"
      });
    };

    var IsoHume = function IsoHume(_ref4) {
      var q = _ref4.q;
      var points = [];
      var step = chartHeight / 6;

      for (var y = chartHeight; y > -step; y -= step) {
        var p = yScale.invert(y);
        var es = p * q / (q + 622.0);
        var logthing = Math.pow(Math.log(es / 6.11), -1.0);
        var t = 273 + Math.pow(17.269 / 237.3 * (logthing - 1.0 / 17.269), -1.0);
        points.push({
          t: t,
          p: p
        });
      }

      var ad = d3.line().x(function (d) {
        return xScale(d.t) + skew * (chartHeight - yScale(d.p));
      }).y(function (d) {
        return yScale(d.p);
      });
      return h("path", {
        fill: "none",
        stroke: "blue",
        "stroke-width": "0.3",
        "stroke-dasharray": "2",
        d: ad(points)
      });
    };

    var DryAdiabatic = function DryAdiabatic(_ref5) {
      var temp = _ref5.temp;
      var points = [];
      var t0 = temp + 273;
      var p0 = yScale.domain()[0];
      var CP = 1.03e3;
      var RD = 287.0;
      var step = chartHeight / 15;

      for (var y = chartHeight; y > -step; y -= step) {
        var p = yScale.invert(y);
        var t = t0 * Math.pow(p0 / p, -RD / CP);
        points.push({
          t: t,
          p: p
        });
      }

      var ad = d3.line().x(function (d) {
        return xScale(d.t) + skew * (chartHeight - yScale(d.p));
      }).y(function (d) {
        return yScale(d.p);
      });
      return h("path", {
        fill: "none",
        stroke: "green",
        "stroke-width": "0.3",
        d: ad(points)
      });
    };

    var MoistAdiabatic = function MoistAdiabatic(_ref6) {
      var temp = _ref6.temp;
      var points = [];
      var t0 = temp + 273;
      var p0 = yScale.domain()[0];
      var CP = 1.03e3;
      var L = 2.5e6;
      var RD = 287.0;
      var RV = 461.0;
      var KELVIN = 273;
      var gradi = 0;
      var t = t0;
      var previousP = p0;
      var step = chartHeight / 15;

      for (var y = chartHeight; y > -step; y -= step) {
        var pressure = yScale.invert(y);
        var lsbc = L / RV * (1.0 / KELVIN - 1.0 / t);
        var rw = 6.11 * Math.exp(lsbc) * (0.622 / pressure);
        var lrwbt = L * rw / (RD * t);
        var nume = RD * t / (CP * pressure) * (1.0 + lrwbt);
        var deno = 1.0 + lrwbt * (0.622 * L / (CP * t));
        var gradi = nume / deno;
        t = t - gradi * (previousP - pressure);
        previousP = pressure;
        points.push({
          t: t,
          p: pressure
        });
      }

      var ad = d3.line().x(function (d) {
        return xScale(d.t) + skew * (chartHeight - yScale(d.p));
      }).y(function (d) {
        return yScale(d.p);
      });
      return h("path", {
        fill: "none",
        stroke: "green",
        "stroke-width": "0.3",
        "stroke-dasharray": "3 5",
        d: ad(points)
      });
    };

    var WindArrow = function WindArrow(_ref7) {
      var speed = _ref7.speed,
          dir = _ref7.dir,
          y = _ref7.y;
      return h("g", null, speed > 1 ? h("g", {
        transform: "translate(0,".concat(y, ") rotate(").concat(dir, ")"),
        stroke: "black",
        fill: "none"
      }, h("line", {
        y2: "-30"
      }), h("polyline", {
        points: "-5,-10 0,0 5,-10",
        "stroke-linejoin": "round"
      })) : h("g", {
        transform: "translate(0,".concat(y, ")"),
        stroke: "black",
        fill: "none"
      }, h("circle", {
        r: "8"
      }), h("circle", {
        r: "2",
        fill: "black"
      })));
    };

    Sounding = function Sounding() {
      var _ref8 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          data = _ref8.data;

      return h("svg", {
        id: "sounding"
      }, h("defs", null, h("clipPath", {
        id: "clip-chart"
      }, h("rect", {
        x: "0",
        y: "0",
        width: chartWidth,
        height: chartHeight + 20
      }))), data ? h("g", null, h("g", {
        class: "wind"
      }, h("g", {
        class: "chart",
        transform: "translate(".concat(chartWidth + 30, ",0)")
      }, h("g", {
        class: "x axis",
        transform: "translate(0,".concat(chartHeight, ")"),
        ref: function ref(g) {
          return d3.select(g).call(xWindAxis);
        }
      }), h("line", {
        y1: chartHeight,
        y2: "0",
        stroke: "black",
        "stroke-width": "0.2",
        "stroke-dasharray": "3"
      }), h("line", {
        y1: chartHeight,
        x1: xWindScale(15 / 3.6),
        y2: "0",
        x2: xWindScale(15 / 3.6),
        stroke: "black",
        "stroke-width": "0.2",
        "stroke-dasharray": "3"
      }), h("rect", {
        x: chartWindWidth / 2,
        width: chartWindWidth / 2,
        height: chartHeight,
        fill: "red",
        opacity: "0.1"
      }), h("g", {
        class: "chartArea",
        "clip-path": "url(#clip-chart)"
      }, h("path", {
        class: "temperature chart",
        fill: "none",
        stroke: "purple",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-width": "1.5",
        d: windLine(data)
      }), h("g", {
        transform: "translate(".concat(chartWindWidth / 2, ",0)")
      }, data.map(function (d) {
        return h(WindArrow, {
          speed: d.wind,
          dir: d.wind_dir,
          y: yScale(d.pressure)
        });
      }))))), h("g", {
        class: "chart",
        transform: "translate(10,0)"
      }, h("g", {
        class: "axis"
      }, h("g", {
        class: "x axis",
        transform: "translate(0,".concat(chartHeight, ")"),
        ref: function ref(g) {
          return d3.select(g).call(xAxis);
        }
      }), h("g", {
        class: "y axis",
        y: chartHeight + 16,
        ref: function ref(g) {
          return d3.select(g).call(yAxis);
        }
      })), h("g", {
        class: "chartArea",
        "clip-path": "url(#clip-chart)",
        "stroke-linejoin": "round",
        "stroke-linecap": "round"
      }, h("text", {
        class: "y label",
        opacity: "0.75",
        x: "0",
        y: "-4"
      }), h("rect", {
        class: "overlay",
        width: chartWidth,
        height: chartHeight,
        opacity: "0"
      }), h("path", {
        class: "temperature chart",
        fill: "none",
        stroke: "red",
        "stroke-width": "1.5",
        d: tempLine(data)
      }), h("path", {
        class: "dewpoint chart",
        fill: "none",
        stroke: "steelblue",
        "stroke-width": "1.5",
        d: dewPointLine(data)
      }), [-70, -60, -50, -40, -30, -20, -10, 0, 10, 20].map(function (t) {
        return h(IsoTemp, {
          temp: t
        });
      }), [-20, -10, 0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(function (t) {
        return h(DryAdiabatic, {
          temp: t
        });
      }), [-20, -10, 0, 5, 10, 15, 20, 25, 30, 35].map(function (t) {
        return h(MoistAdiabatic, {
          temp: t
        });
      }), [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 8.0, 12.0, 16.0, 20.0].map(function (q) {
        return h(IsoHume, {
          q: q
        });
      })))) : h("text", {
        x: "50%",
        y: "50%",
        "text-anchor": "middle"
      }, "No Data"));
    };

    root = render(h(Sounding, {
      display: "block"
    }), containerEl, root);
  }; // Compute the min and max temp and pressure over the forecast range


  function updateScales() {
    var minTemp = Number.MAX_VALUE;
    var maxTemp = Number.MIN_VALUE;
    var minGh = Number.MAX_VALUE;
    var maxGh = Number.MIN_VALUE;
    var minPressure = Number.MAX_VALUE;
    var maxPressure = Number.MIN_VALUE;
    var maxWind = Number.MIN_VALUE;

    var _loop = function _loop(ts) {
      var tsData = pointData.data[ts];
      tsData.forEach(function (d, index) {
        if (index == 0) {
          minGh = Math.min(minGh, d.gh);
          maxPressure = Math.max(maxPressure, d.pressure);
        }

        if (index == tsData.length - 1) {
          maxGh = Math.max(maxGh, d.gh);
          minPressure = Math.min(minPressure, d.pressure);
        } // pt.dewpoint <= pt.temp


        minTemp = Math.min(minTemp, d.dewpoint);
        maxTemp = Math.max(maxTemp, d.temp);
        maxWind = Math.max(maxWind, d.wind);
      });
    };

    for (var ts in pointData.data) {
      _loop(ts);
    } // TODO


    minTemp = -30 + 273;
    maxTemp = 30 + 273;
    xScale.domain([minTemp, maxTemp]);
    xAxisScale.domain([convertTemp(minTemp), convertTemp(maxTemp)]);
    xWindScale.domain([0, 30 / 3.6, maxWind]);
    xWindScale.range([0, chartWindWidth / 2, chartWindWidth]);
    xWindAxisScale.domain([0, 30, convertWind(maxWind)]);
    xWindAxisScale.range([0, chartWindWidth / 2, chartWindWidth]);
    yScale.domain([maxPressure, minPressure]);
    yAxisScale.domain([convertAlt(minGh), convertAlt(maxGh)]);
  } // Return the value of the parameter `name` at `level` for the given `tsIndex`


  function GetParam(airData, name, level, tsIndex) {
    if (name === "gh" && level == "surface") {
      return airData.header.modelElevation;
    }

    return airData.data["".concat(name, "-").concat(level)][tsIndex];
  } // Handler for data request


  var load = function load(lat, lon, airData, forecastData) {
    pointData.lat = lat;
    pointData.lon = lon; // Create a lookup for forecast

    var forecastsByTs = {};

    for (var d in forecastData.data) {
      forecastData.data[d].forEach(function (f) {
        return forecastsByTs[f.origTs] = f;
      });
    } // Re-arrange the airData
    // from
    // {
    //    temp-150h: [...]
    //    temp-surface: [...]
    //    hours: [...]
    //    ...
    // }
    // to
    // {
    //    [timestamp0]: {
    //      temp: ,
    //      wind: ,
    //      wind_dir: ,
    //      level: ,
    //    }, ...
    // }


    var timestamps = airData.data.hours;
    var elevation = airData.header.elevation;
    var modelElevation = airData.header.modelElevation;
    var paramNames = new Set();
    var paramLevels = new Set(); // Extracts parameter names and levels.

    for (var name in airData.data) {
      var m = name.match(/([^-]+)-(.+)h$/);

      if (m !== null) {
        paramNames.add(m[1]);
        paramLevels.add(Number(m[2]));
      }
    } // Filters the list of levels and add surface (-1).


    var levels = [-1].concat(_toConsumableArray(Array.from(paramLevels).filter(function (l) {
      return l > 300;
    }).sort(function (a, b) {
      return Number(a) < Number(b) ? 1 : -1;
    })));
    console.log(levels);
    var levelDataByTs = {};
    timestamps.forEach(function (ts, index) {
      levelDataByTs[ts] = [];
      levels.forEach(function (level) {
        var LevelName = level < 0 ? "surface" : "".concat(level, "h");
        var gh = GetParam(airData, "gh", LevelName, index);

        if (gh >= modelElevation) {
          // Precompute the wind object
          var windU = GetParam(airData, "wind_u", LevelName, index);
          var windV = GetParam(airData, "wind_v", LevelName, index);

          var wind = _.wind2obj([windU, windV]); // Forecasts have the pressure in Pa - we want hPa.


          var pressure = level < 0 ? Math.round(forecastsByTs[ts].pressure / 100) : level;
          levelDataByTs[ts].push({
            temp: GetParam(airData, "temp", LevelName, index),
            dewpoint: GetParam(airData, "dewpoint", LevelName, index),
            gh: GetParam(airData, "gh", LevelName, index),
            wind: wind.wind,
            wind_dir: wind.dir,
            pressure: pressure,
            forecast: forecastsByTs[ts]
          });
        }
      });
    });
    pointData.data = levelDataByTs;
    pointData.elevation = elevation;
    pointData.modelElevation = modelElevation;
    updateScales(pointData);
    store.on("timestamp", redraw);
    redraw();
  }; // Update the sounding


  var redraw = function redraw() {
    currentData = null;

    if (pointData.data) {
      var ts = store.get("timestamp"); // Find nearest hour

      var hours = Object.getOwnPropertyNames(pointData.data).sort(function (a, b) {
        return Number(a) < Number(b) ? -1 : 1;
      });
      var ts1, ts2;
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


        currentData = sUtils.interpolateArray(pointData.data[ts1], pointData.data[ts2], ts2 != ts1 ? (ts - ts1) / (ts2 - ts1) : 0);
      }
    }

    root = render(h(Sounding, {
      data: currentData,
      display: "block"
    }), containerEl, root);
  };

  return {
    load: load,
    init: init
  };
});
/*! */
// This page was transpiled automatically from src/soundingUtils.mjs

W.define('windy-plugin-sounding/soundingUtils', ['utils'], function (_) {
  ; // Remove data points with some null values

  function validateData(data) {
    var _loop2 = function _loop2(_i2) {
      var keys = Object.keys(data[_i2]);

      if (keys.find(function (key) {
        return data[_i2][key] == null;
      })) {
        data.splice(_i2, 1);
      } else {
        ++_i2;
      }

      i = _i2;
    };

    for (var i = 0; i < data.length;) {
      _loop2(i);
    }
  } // Bilinear interpolation between two data arrays


  function interpolateArray(data1, data2, w) {
    var data = [];
    data1.forEach(function (d1, i) {
      var pressure1 = d1.pressure;
      var d2 = i == 0 ? data2[0] : data2.find(function (d2) {
        return d2.pressure == pressure1;
      });

      if (d2) {
        data.push(interpolatePoint(d1, d2, w));
      }
    });
    return data;
  } // Bilinear interpolation between two data points


  function interpolatePoint(point1, point2, w) {
    var interp = {};
    var keys = Object.getOwnPropertyNames(point1);
    keys.forEach(function (key) {
      interp[key] = (1 - w) * point1[key] + w * point2[key];
    });
    return interp;
  } // Returns intersection of two line segments


  function intersection(line1, line2) {
    var _line = _slicedToArray(line1, 2),
        _line$ = _slicedToArray(_line[0], 2),
        x1 = _line$[0],
        y1 = _line$[1],
        _line$2 = _slicedToArray(_line[1], 2),
        x2 = _line$2[0],
        y2 = _line$2[1];

    var _line2 = _slicedToArray(line2, 2),
        _line2$ = _slicedToArray(_line2[0], 2),
        x3 = _line2$[0],
        y3 = _line2$[1],
        _line2$2 = _slicedToArray(_line2[1], 2),
        x4 = _line2$2[0],
        y4 = _line2$2[1];

    if (x2 - x1 == 0 && y2 - y1 == 0 || x4 - x3 == 0 && y4 - y3 == 0) {
      return null; // One of the lines has zero length
    }

    var d = (y2 - y1) * (x4 - x3) - (x2 - x1) * (y4 - y3);

    if (!d) {
      return null;
    } // Lines are parallel


    var t = ((x2 - x1) * (y3 - y1) + (y2 - y1) * (x1 - x3)) / d;

    if (t < 0 || t > 1) {
      return null;
    } // Intersection is out of line1


    var px = x3 + t * (x4 - x3);
    var py = y3 + t * (y4 - y3);
    var s = x2 - x1 ? (px - x1) / (x2 - x1) : (py - y1) / (y2 - y1);

    if (s < 0 || s > 1) {
      return null;
    } // Intersetion is out of line2


    return [px, py];
  } // Returns first intersection of polyline straight line


  function dataIntersection(line, polyline, getPoint) {
    for (var _i3 = 0; _i3 < polyline.length - 1; ++_i3) {
      var pt = intersection(line, [getPoint(polyline[_i3]), getPoint(polyline[_i3 + 1])]);

      if (pt) {
        return pt;
      }
    }

    return null;
  } // Inspired by airgram.mjs:windMark()


  function drawWindArrow(g, x, y, dir, speed) {
    var scale = 20;
    var windBarb = g.append("g").attr("class", "windbarb").attr("transform", "translate(".concat(x, ", ").concat(y, ")rotate(").concat(dir, ")")); // TODO(berchet): unit

    if (speed > 2) {
      windBarb.append("line").attr("stroke", "black").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", -scale);
      var arrow = Math.round(scale / 4);
      windBarb.append("polyline").attr("stroke", "black").attr("fill", "none").attr("points", "-".concat(arrow / 2, ",-").concat(arrow, " 0,0 ").concat(arrow / 2, ",-").concat(arrow)).attr("stroke-linejoin", "round");
    } else {
      // No wind
      // Outline circle
      windBarb.append("circle").style("stroke", "black").style("fill", "none").attr("cx", 0).attr("cy", 0).attr("r", 0.25 * scale); // Central dot

      windBarb.append("circle").style("stroke", "black").attr("cx", 0).attr("cy", 0).attr("r", 0.05 * scale);
    }
  }

  return {
    validateData: validateData,
    interpolateArray: interpolateArray,
    interpolatePoint: interpolatePoint,
    intersection: intersection,
    dataIntersection: dataIntersection,
    drawWindArrow: drawWindArrow
  };
});